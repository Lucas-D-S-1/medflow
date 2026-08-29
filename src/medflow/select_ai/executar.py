"""Executa o roteiro de Select AI e mede o que o modelo devolveu.

A validação não é lendo o SQL gerado e achando parecido. Para cada pergunta com
referência, o roteiro executa as duas consultas e compara as respostas: a
sequência ordenada de rótulos que cada uma produziu. É isso que a pergunta de
negócio pede — quais regiões, em que ordem — e é isso que precisa bater.

SQL vindo do modelo é tratado como entrada não confiável: só roda se for uma
consulta de leitura, e roda numa transação declarada somente leitura.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

import oracledb

from medflow.select_ai.perguntas import Pergunta

PERFIL = "MEDFLOW_GENAI"
LIMITE_LINHAS = 50

# Termos que a banca cobra. O IPH é pressão estimada sobre capacidade SUS
# declarada, e a base é mensal por competência.
TERMOS_PROIBIDOS = (
    "ocupação real",
    "ocupacao real",
    "taxa de ocupação",
    "taxa de ocupacao",
    "leitos ocupados",
    "tempo real",
    "em tempo real",
)

# Só leitura. `begin` e `declare` de fora, junto com DML e DDL.
PALAVRAS_VETADAS = re.compile(
    r"\b(insert|update|delete|merge|drop|truncate|alter|create|grant|revoke"
    r"|commit|rollback|execute|exec|begin|declare|call)\b",
    re.IGNORECASE,
)
INICIO_LEITURA = re.compile(r"^\s*(select|with)\b", re.IGNORECASE)


class SqlRecusado(RuntimeError):
    """O SQL devolvido pelo modelo não passou no guarda de leitura."""


@dataclass
class Resposta:
    """O que o modelo devolveu para uma pergunta, e o que isso valeu."""

    pergunta: Pergunta
    bloco: str
    sql_gerado: str = ""
    narrado: str = ""
    conversado: str = ""
    seguimento_narrado: str = ""
    linhas_referencia: list[tuple] = None
    colunas_referencia: list[str] = None
    linhas_geradas: list[tuple] = None
    colunas_geradas: list[str] = None
    veredito: str = ""
    detalhe: str = ""
    termos_encontrados: tuple[str, ...] = ()

    @property
    def conferida(self) -> bool:
        return bool(self.pergunta.sql_referencia)


def limpar(sql: str) -> str:
    sql = (sql or "").strip()
    if sql.startswith("```"):
        sql = re.sub(r"^```[a-zA-Z]*\n?", "", sql)
        sql = re.sub(r"\n?```$", "", sql)
    return sql.strip().rstrip(";").strip()


def guardar(sql: str) -> str:
    """Devolve o SQL se for seguro executar; levanta SqlRecusado se não for."""
    sql = limpar(sql)
    if not sql:
        raise SqlRecusado("o modelo não devolveu SQL")
    if not INICIO_LEITURA.match(sql):
        raise SqlRecusado("não começa por SELECT nem WITH")
    # O corpo de um WITH pode conter a palavra "delete" num nome de coluna;
    # exigir a fronteira de palavra já basta e é o corte conservador.
    if achado := PALAVRAS_VETADAS.search(sql):
        raise SqlRecusado(f"contém `{achado.group(0)}`, que não é de leitura")
    return sql


def consultar(cursor, sql: str) -> tuple[list[str], list[tuple]]:
    cursor.execute(sql)
    colunas = [d[0].lower() for d in cursor.description]
    return colunas, cursor.fetchmany(LIMITE_LINHAS)


def gerar(cursor, prompt: str, acao: str) -> str:
    saida = cursor.var(oracledb.DB_TYPE_CLOB)
    cursor.execute(
        """
        begin
          :saida := dbms_cloud_ai.generate(
              prompt       => :prompt,
              profile_name => :perfil,
              action       => :acao);
        end;
        """,
        saida=saida,
        prompt=prompt,
        perfil=PERFIL,
        acao=acao,
    )
    valor = saida.getvalue()
    if valor is None:
        return ""
    texto = valor.read() if hasattr(valor, "read") else str(valor)
    return texto.strip()


def rotulos(colunas: list[str], linhas: list[tuple], nome: str) -> list[str] | None:
    """A coluna que carrega a resposta, pelo nome ou pela primeira textual."""
    if nome in colunas:
        i = colunas.index(nome)
    else:
        textuais = [
            j
            for j, _ in enumerate(colunas)
            if linhas and isinstance(linhas[0][j], str)
        ]
        if not textuais:
            return None
        i = textuais[0]
    return [str(linha[i]).strip().upper() for linha in linhas]


def normalizar_texto(texto: object) -> str:
    """Normaliza acentos, caixa e espaços para conferir uma narrativa."""
    valor = unicodedata.normalize("NFD", str(texto or ""))
    valor = "".join(c for c in valor if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", valor.lower()).strip()


def normalizar_rotulo(texto: object) -> str:
    """Normaliza um rótulo para comparação, ignorando também os espaços.

    O CNES grava nomes com palavras coladas — `FUNDACAO FACULDADE DE
    MEDICINAHCFMUSP INST DE PSIQUIATRIA SP` é o nome oficial, sem espaço entre
    `MEDICINA` e `HCFMUSP`. O modelo separa as duas ao escrever, e a comparação
    exata reprovava uma narrativa correta: os cinco hospitais eram os certos,
    na ordem certa.

    Ignorar espaço compara o mesmo nome escrito de dois jeitos, e não afrouxa a
    conferência: trocar um hospital por outro continua reprovando.
    """
    return normalizar_texto(texto).replace(" ", "")


def conferir_lideres_narrados(
    narrativa: str,
    esperados: list[str],
    candidatos: list[str] | None = None,
    limite: int = 3,
) -> tuple[bool, str]:
    """Confere se a narrativa começa pelos líderes corretos, na ordem.

    Só procurar os líderes em qualquer ponto do texto gera falso positivo: uma
    resposta pode listar dezenas de itens numa ordem errada e ainda conter os
    nomes certos no fim. Aqui os primeiros rótulos reconhecíveis na narrativa
    precisam ser exatamente os primeiros da referência.
    """
    alvo = list(dict.fromkeys(esperados))[:limite]
    if not alvo:
        return True, "referência sem rótulos para conferir"

    universo = list(dict.fromkeys([*esperados, *(candidatos or [])]))
    texto = normalizar_rotulo(narrativa)
    encontrados = []
    for rotulo in universo:
        alvo_rotulo = normalizar_rotulo(rotulo)
        posicao = texto.find(alvo_rotulo)
        if posicao >= 0:
            encontrados.append((posicao, -len(alvo_rotulo), rotulo))
    mencionados = [rotulo for _, _, rotulo in sorted(encontrados)]

    faltantes = [rotulo for rotulo in alvo if rotulo not in mencionados]
    if faltantes:
        return False, "líderes ausentes na narrativa: " + ", ".join(faltantes)

    narrados = mencionados[: len(alvo)]
    if narrados != alvo:
        return False, (
            "primeiros rótulos narrados: "
            + ", ".join(narrados)
            + "; esperado: "
            + ", ".join(alvo)
        )
    return True, f"primeiros {len(alvo)} rótulos narrados na ordem correta"


def comparar(resposta: Resposta) -> None:
    """Classifica a resposta do modelo contra a referência."""
    ref = rotulos(
        resposta.colunas_referencia,
        resposta.linhas_referencia,
        resposta.pergunta.rotulo,
    )
    gerado = rotulos(
        resposta.colunas_geradas,
        resposta.linhas_geradas,
        resposta.pergunta.rotulo,
    )

    if ref is None or gerado is None:
        resposta.veredito = "não comparável"
        resposta.detalhe = "nenhuma coluna de rótulo textual nas duas respostas"
        return

    if ref == gerado:
        resposta.veredito = "equivalente"
        resposta.detalhe = f"mesmos {len(ref)} rótulos, na mesma ordem"
        return

    # Truncar não é errar: a pergunta nem sempre fixa quantas linhas quer.
    menor = min(len(ref), len(gerado))
    if menor and ref[:menor] == gerado[:menor]:
        resposta.veredito = "equivalente até o corte"
        resposta.detalhe = (
            f"os {menor} primeiros rótulos coincidem na ordem; "
            f"referência devolveu {len(ref)} linha(s) e o gerado, {len(gerado)}"
        )
        return

    if set(ref) == set(gerado):
        resposta.veredito = "mesmo conjunto, outra ordem"
        resposta.detalhe = (
            "os rótulos são os mesmos, mas a ordenação difere. Conferir o "
            "critério de desempate"
        )
        return

    faltando = [r for r in ref if r not in gerado][:5]
    sobrando = [g for g in gerado if g not in ref][:5]
    resposta.veredito = "divergente"
    resposta.detalhe = (
        f"ausentes no gerado: {', '.join(faltando) or 'nenhum'}; "
        f"presentes só no gerado: {', '.join(sobrando) or 'nenhum'}"
    )


# Uma boa recusa precisa nomear o que está recusando: "não há dado em tempo
# real" contém "tempo real". Procurar o termo e pronto reprovaria justamente a
# resposta certa, então a janela antes de cada ocorrência é inspecionada.
NEGACAO = re.compile(
    r"\b(n[ãa]o|nunca|jamais|sem|nenhum[a]?|inexist\w*|impossível|impossivel)\b",
    re.IGNORECASE,
)
JANELA_NEGACAO = 90

# Se o texto explica o que o número é de verdade, mencionar o termo errado ao
# lado da correção não é reivindicá-lo.
RESSALVAS = (
    "pressão estimada",
    "pressao estimada",
    "capacidade declarada",
    "capacidade sus declarada",
    "não é ocupação real",
    "nao e ocupacao real",
    "competência mensal",
    "competencia mensal",
)


def varrer_termos(*textos: str) -> tuple[str, ...]:
    """Devolve os termos proibidos que o modelo **afirmou** sobre os dados.

    Só recebe saída de `narrate`. A de `chat` fica de fora de propósito: ali o
    modelo responde sem os dados na frente, e dizer que não tem informação em
    tempo real é a resposta certa, não uma violação.

    Dentro do `narrate`, mencionar não é afirmar. Uma ocorrência só conta como
    violação quando aparece afirmativamente — sem negação na janela anterior — e
    o texto não traz em nenhum lugar a ressalva que corrige o sentido. É a
    diferença entre "a taxa de ocupação foi de 78%", que é a alegação que a
    banca derruba, e "esta base não mede taxa de ocupação", que é o que se quer
    ouvir.
    """
    junto = " ".join(t.lower() for t in textos if t)
    if not junto:
        return ()
    tem_ressalva = any(r in junto for r in RESSALVAS)

    afirmados = []
    for termo in TERMOS_PROIBIDOS:
        inicio = 0
        while (i := junto.find(termo, inicio)) != -1:
            inicio = i + len(termo)
            janela = junto[max(0, i - JANELA_NEGACAO) : i]
            if NEGACAO.search(janela) or tem_ressalva:
                continue
            afirmados.append(termo)
            break
    return tuple(afirmados)

"""Avalia a FlowIA com perguntas humanas, incompletas e verificáveis.

Cada caso recebe o mesmo contexto que o site envia silenciosamente. A pergunta
continua curta e ambígua; não entrega tabela, coluna, fórmula nem corte ao
modelo. Onde existe resposta objetiva, o SQL do Select AI e a narrativa são
comparados com uma consulta de referência executada na mesma Gold.
"""

from __future__ import annotations

import re
import sys
import unicodedata
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "src"))
sys.path.insert(0, str(RAIZ / "src" / "medflow" / "oracle"))

from carregar_gold import conectar  # noqa: E402

from medflow.select_ai.executar import (  # noqa: E402
    Resposta,
    comparar,
    conferir_lideres_narrados,
    consultar,
    guardar,
    rotulos,
    varrer_termos,
)
from medflow.select_ai.perguntas import Pergunta  # noqa: E402
from medflow.select_ai.relatorio import VEREDITOS_OK, tabela  # noqa: E402

SAIDA = RAIZ / "docs" / "flowia" / "ULTIMA_EXECUCAO.md"


@dataclass(frozen=True)
class Caso:
    id: str
    pergunta: str
    intencao: str
    rota: str = "regional"
    regiao: str = "JUNDIAI"
    codigo_regiao: str = "35073"
    hospital: str = ""
    analise: str = "pressao hospitalar regional e tendencia"
    sql_referencia: str = ""
    rotulo: str = ""
    narrativa_grupos: tuple[tuple[str, ...], ...] = ()
    conferir_rotulo_na_narrativa: bool = True

    @property
    def contexto(self) -> str:
        return (
            f"tela={self.rota}; competencia=202606"
            f" (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); "
            f"regiao={self.regiao}; "
            f"codigo_regiao={self.codigo_regiao}; "
            f"hospital_cnes={self.hospital or 'nao informado'}; "
            f"analise_ativa={self.analise}"
        )


@dataclass
class Resultado:
    caso: Caso
    resposta_id: int | None = None
    sql_gerado: str = ""
    narrativa: str = ""
    aviso: str = ""
    recusa: str = ""
    colunas_referencia: list[str] = field(default_factory=list)
    linhas_referencia: list[tuple] = field(default_factory=list)
    colunas_geradas: list[str] = field(default_factory=list)
    linhas_geradas: list[tuple] = field(default_factory=list)
    veredito_sql: str = "sem referência"
    detalhe_sql: str = ""
    narrativa_ok: bool = False
    detalhe_narrativa: str = ""
    termos_proibidos: tuple[str, ...] = ()
    erro: str = ""

    @property
    def dados_ok(self) -> bool:
        return not self.caso.sql_referencia or self.veredito_sql in VEREDITOS_OK

    @property
    def ok(self) -> bool:
        return self.dados_ok and self.narrativa_ok and not self.termos_proibidos and not self.erro


CASOS = [
    Caso(
        "F01", "até onde esses dados vão mesmo?",
        "Entender 'até onde' como a competência cronologicamente mais recente, não o maior número de mês.",
        sql_referencia="""
select max(cd_competencia) as mes_mais_recente
from mart_indicador_regiao_mensal
""",
        rotulo="mes_mais_recente",
        narrativa_grupos=(("junho", "06/2026", "2026-06", "202606"),),
        conferir_rotulo_na_narrativa=False,
    ),
    Caso(
        "F02", "onde tá mais apertado agora?",
        "Na visão regional, interpretar apertado como maior IPH na última competência.",
        sql_referencia="""
select nm_regiao_saude as regiao, pc_iph_estimado
from mart_indicador_regiao_mensal
where cd_competencia = (select max(cd_competencia) from mart_indicador_regiao_mensal)
order by pc_iph_estimado desc nulls last, cd_regiao_saude
fetch first 5 rows only
""",
        rotulo="regiao",
    ),
    Caso(
        "F03", "quem mais manda paciente pra fora?",
        "Usar evasão intrastadual observada percentual na competência atual.",
        rota="fluxos", analise="fluxos assistenciais, evasao e ICSAP",
        sql_referencia="""
select nm_regiao_saude as regiao, pc_evasao_intrastadual_observada
from mart_indicador_regiao_mensal
where cd_competencia = (select max(cd_competencia) from mart_indicador_regiao_mensal)
order by pc_evasao_intrastadual_observada desc nulls last, cd_regiao_saude
fetch first 5 rows only
""",
        rotulo="regiao",
    ),
    Caso(
        "F04", "e quem mais recebe gente de fora?",
        "Inferir atração assistencial, sem exigir que o usuário repita o indicador anterior.",
        rota="fluxos", analise="fluxos assistenciais, evasao e ICSAP",
        sql_referencia="""
select nm_regiao_saude as regiao, pc_atracao_assistencial
from mart_indicador_regiao_mensal
where cd_competencia = (select max(cd_competencia) from mart_indicador_regiao_mensal)
order by pc_atracao_assistencial desc nulls last, cd_regiao_saude
fetch first 5 rows only
""",
        rotulo="regiao",
    ),
    Caso(
        "F05", "onde a atenção básica parece não estar segurando?",
        "Usar taxa territorial de ICSAP como sinal, com ressalva de que não prova falha nem evitabilidade individual.",
        rota="fluxos", analise="fluxos assistenciais, evasao e ICSAP",
        sql_referencia="""
select nm_regiao_saude as regiao, tx_icsap_residente_observada_por_10_mil
from mart_indicador_regiao_mensal
where cd_competencia = (select max(cd_competencia) from mart_indicador_regiao_mensal)
order by tx_icsap_residente_observada_por_10_mil desc nulls last, cd_regiao_saude
fetch first 5 rows only
""",
        rotulo="regiao",
        narrativa_grupos=(("icsap", "atenção primária", "atencao primaria"),),
    ),
    Caso(
        "F06", "qual hospital tá mais cheio hoje?",
        "Recusar ocupação em tempo real e oferecer IPH mensal como aproximação de pressão, devidamente qualificada.",
        rota="hospital", analise="hospitais, permanencia, perfil clinico e IPR",
        narrativa_grupos=(
            ("não", "nao", "indisponível", "indisponivel"),
            ("pressão", "pressao", "iph", "competência mensal", "competencia mensal"),
        ),
        conferir_rotulo_na_narrativa=False,
    ),
    Caso(
        "F07", "quais hospitais estouraram a capacidade no último mês?",
        "Usar o flag de pressão acima da capacidade SUS declarada na competência mais recente.",
        rota="hospital", analise="hospitais, permanencia, perfil clinico e IPR",
        sql_referencia="""
select nm_hospital_atual as hospital, pc_iph_estimado
from mart_indicador_hospital_mensal
where cd_competencia = (select max(cd_competencia) from mart_indicador_hospital_mensal)
  and fl_acima_capacidade_declarada = 1
order by pc_iph_estimado desc nulls last, cd_cnes
fetch first 5 rows only
""",
        rotulo="hospital",
        narrativa_grupos=(("capacidade declarada", "pressão", "pressao", "iph"),),
    ),
    Caso(
        "F08", "quem segura o paciente por mais tempo?",
        "Interpretar como maior permanência média hospitalar, com amostra suficiente, na competência atual.",
        rota="hospital", analise="hospitais, permanencia, perfil clinico e IPR",
        sql_referencia="""
select nm_hospital_atual as hospital, nr_permanencia_media
from mart_indicador_hospital_mensal
where cd_competencia = (select max(cd_competencia) from mart_indicador_hospital_mensal)
  and st_amostra = 'suficiente'
order by nr_permanencia_media desc nulls last, cd_cnes
fetch first 5 rows only
""",
        rotulo="hospital",
    ),
    Caso(
        "F09", "qual é o pior hospital?",
        "Não inventar ranking de qualidade; pedir o critério ou oferecer indicadores com limitações.",
        rota="hospital", analise="hospitais, permanencia, perfil clinico e IPR",
        narrativa_grupos=(
            ("não", "nao", "depende", "critério", "criterio"),
            ("qualidade", "indicador", "métrica", "metrica", "defina"),
        ),
        conferir_rotulo_na_narrativa=False,
    ),
    Caso(
        "F10", "onde morreu mais gente ultimamente?",
        "Interpretar como número absoluto de óbitos por região na competência atual e explicitar o critério.",
        sql_referencia="""
select nm_regiao_saude as regiao, qt_obito
from mart_indicador_regiao_mensal
where cd_competencia = (select max(cd_competencia) from mart_indicador_regiao_mensal)
order by qt_obito desc, cd_regiao_saude
fetch first 5 rows only
""",
        rotulo="regiao",
        narrativa_grupos=(("óbitos", "obitos", "mortes"),),
    ),
    Caso(
        "F11", "onde cada internação sai mais cara hoje?",
        "Usar CMI real, já corrigido pelo IPCA, na competência mais recente.",
        sql_referencia="""
select nm_regiao_saude as regiao, vl_cmi_real
from mart_indicador_regiao_mensal
where cd_competencia = (select max(cd_competencia) from mart_indicador_regiao_mensal)
order by vl_cmi_real desc nulls last, cd_regiao_saude
fetch first 5 rows only
""",
        rotulo="regiao",
    ),
    Caso(
        "F12", "quem piorou de uns meses pra cá?",
        "Pelo contexto regional ativo, comparar IPH atual com três competências antes.",
        sql_referencia="""
with datas as (
  select max(cd_competencia) atual,
         to_char(add_months(to_date(max(cd_competencia), 'YYYYMM'), -3), 'YYYYMM') anterior
  from mart_indicador_regiao_mensal
), comparacao as (
  select a.nm_regiao_saude as regiao,
         a.pc_iph_estimado - b.pc_iph_estimado as variacao
  from mart_indicador_regiao_mensal a
  join datas d on a.cd_competencia = d.atual
  join mart_indicador_regiao_mensal b
    on b.cd_regiao_saude = a.cd_regiao_saude and b.cd_competencia = d.anterior
)
select regiao, variacao
from comparacao
order by variacao desc nulls last, regiao
fetch first 5 rows only
""",
        rotulo="regiao",
    ),
    Caso(
        "F13", "quem varia muito dependendo da época?",
        "Inferir sazonalidade regional e ordenar pela maior variação sazonal absoluta calculada.",
        sql_referencia="""
select nm_regiao_saude as regiao, pc_variacao_sazonal
from mart_indicador_regiao_mensal
where cd_competencia = (select max(cd_competencia) from mart_indicador_regiao_mensal)
  and st_indice_sazonalidade = 'calculado'
order by abs(pc_variacao_sazonal) desc nulls last, cd_regiao_saude
fetch first 5 rows only
""",
        rotulo="regiao",
        narrativa_grupos=(("sazon", "época", "epoca"),),
    ),
    Caso(
        "F14", "quais hospitais daqui merecem atenção primeiro?",
        "Usar a região visível (Jundiaí) e priorizar maior IPH atual, sem chamar isso de qualidade.",
        rota="hospital", analise="hospitais, permanencia, perfil clinico e IPR",
        sql_referencia="""
select nm_hospital_atual as hospital, pc_iph_estimado
from mart_indicador_hospital_mensal
where cd_competencia = (select max(cd_competencia) from mart_indicador_hospital_mensal)
  and cd_regiao_saude = '35073'
order by pc_iph_estimado desc nulls last, cd_cnes
fetch first 5 rows only
""",
        rotulo="hospital",
    ),
    Caso(
        "F15", "o que mais interna nesse hospital?",
        "Usar o hospital selecionado e trazer as especialidades com mais internações na competência atual.",
        rota="hospital", hospital="3012212",
        analise="hospitais, permanencia, perfil clinico e IPR",
        sql_referencia="""
select nm_especialidade as especialidade, qt_internacao_nova
from mart_indicador_hospital_especialidade_mensal
where cd_cnes = '3012212'
  and cd_competencia = (select max(cd_competencia) from mart_indicador_hospital_especialidade_mensal)
order by qt_internacao_nova desc, cd_especialidade_sih
fetch first 5 rows only
""",
        rotulo="especialidade",
    ),
    Caso(
        "F16", "dá pra confiar nesse hospital ou a amostra é pequena?",
        "Ler o estado de amostra e o volume do hospital selecionado, sem transformar em avaliação de qualidade.",
        rota="hospital", hospital="3012212",
        analise="hospitais, permanencia, perfil clinico e IPR",
        sql_referencia="""
select st_amostra as amostra, qt_internacao_nova
from mart_indicador_hospital_mensal
where cd_cnes = '3012212'
  and cd_competencia = (select max(cd_competencia) from mart_indicador_hospital_mensal)
""",
        rotulo="amostra",
        narrativa_grupos=(("amostra", "volume"),),
    ),
    Caso(
        "F17", "esse IPR acima de 1 é ruim?",
        "Explicar maior permanência que o benchmark e recusar interpretação como qualidade ou desfecho.",
        rota="hospital", hospital="3012212",
        analise="hospitais, permanencia, perfil clinico e IPR",
        narrativa_grupos=(
            ("permanência", "permanencia", "benchmark", "referência", "referencia"),
            ("não", "nao"),
            ("qualidade", "desfecho"),
        ),
        conferir_rotulo_na_narrativa=False,
    ),
    Caso(
        "F18", "de onde vem a maior parte dos pacientes atendidos aqui?",
        "Usar Jundiaí como destino e listar as principais regiões de residência na competência atual.",
        rota="fluxos", analise="fluxos assistenciais, evasao e ICSAP",
        sql_referencia="""
select nm_origem_residencia as origem, sum(qt_internacao_nova) as internacoes
from mart_fluxo_assistencial_regiao_mensal
where cd_regiao_saude_atendimento = '35073'
  and cd_competencia = (select max(cd_competencia) from mart_fluxo_assistencial_regiao_mensal)
group by nm_origem_residencia
order by internacoes desc, origem
fetch first 5 rows only
""",
        rotulo="origem",
    ),
    Caso(
        "F19", "subiu quanto desde o ano passado?",
        "Usar o IPH e a região ativos, comparando a competência atual com o mesmo mês do ano anterior.",
        sql_referencia="""
with atual as (
  select max(cd_competencia) competencia
  from mart_indicador_regiao_mensal
), valores as (
  select r.nm_regiao_saude as regiao,
         r.pc_iph_estimado as iph_atual,
         a.pc_iph_estimado as iph_anterior
  from atual x
  join mart_indicador_regiao_mensal r
    on r.cd_regiao_saude = '35073' and r.cd_competencia = x.competencia
  join mart_indicador_regiao_mensal a
    on a.cd_regiao_saude = r.cd_regiao_saude
   and a.cd_competencia = to_char(add_months(to_date(x.competencia, 'YYYYMM'), -12), 'YYYYMM')
)
select regiao, iph_atual - iph_anterior as variacao
from valores
""",
        rotulo="regiao",
    ),
    Caso(
        "F20", "se eu só puder olhar três lugares amanhã, quais seriam?",
        "Inferir que a análise ativa é pressão regional e priorizar os três maiores IPHs, deixando claro que é triagem.",
        sql_referencia="""
select nm_regiao_saude as regiao, pc_iph_estimado
from mart_indicador_regiao_mensal
where cd_competencia = (select max(cd_competencia) from mart_indicador_regiao_mensal)
order by pc_iph_estimado desc nulls last, cd_regiao_saude
fetch first 3 rows only
""",
        rotulo="regiao",
        narrativa_grupos=(("investig", "prioriz", "triagem", "sinal"),),
    ),
]


def normalizar(texto: object) -> str:
    valor = unicodedata.normalize("NFD", str(texto or ""))
    valor = "".join(c for c in valor if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", valor.lower()).strip()


def clob_para_texto(valor) -> str:
    if valor is None:
        return ""
    return valor.read() if hasattr(valor, "read") else str(valor)


def avaliar_narrativa(resultado: Resultado) -> None:
    texto = normalizar(resultado.narrativa)
    faltando = []
    for grupo in resultado.caso.narrativa_grupos:
        if not any(normalizar(termo) in texto for termo in grupo):
            faltando.append(" / ".join(grupo))

    cobertura = ""
    if resultado.caso.sql_referencia and resultado.caso.conferir_rotulo_na_narrativa:
        esperados = rotulos(
            resultado.colunas_referencia,
            resultado.linhas_referencia,
            resultado.caso.rotulo,
        ) or []
        gerados = rotulos(
            resultado.colunas_geradas,
            resultado.linhas_geradas,
            resultado.caso.rotulo,
        ) or []
        lideres_ok, cobertura = conferir_lideres_narrados(
            resultado.narrativa,
            esperados,
            gerados,
        )
        if not lideres_ok:
            faltando.append(cobertura)

    resultado.termos_proibidos = varrer_termos(resultado.narrativa)
    resultado.narrativa_ok = not faltando and not resultado.termos_proibidos
    detalhes = []
    if cobertura and not faltando:
        detalhes.append(cobertura)
    if faltando:
        detalhes.append("faltou: " + "; ".join(faltando))
    if resultado.termos_proibidos:
        detalhes.append("afirmou: " + ", ".join(resultado.termos_proibidos))
    resultado.detalhe_narrativa = "; ".join(detalhes) or "critérios narrativos atendidos"


def gerar_resposta(cursor, caso: Caso) -> tuple[int, tuple]:
    resposta_id = cursor.var(int)
    cursor.execute(
        "begin :id := medflow_select_ai.responder(:pergunta, :contexto); end;",
        id=resposta_id,
        pergunta=caso.pergunta,
        contexto=caso.contexto,
    )
    cursor.connection.commit()
    identificador = int(resposta_id.getvalue())
    cursor.execute(
        """
        select sql_gerado, narrativa, aviso, recusa
        from select_ai_resposta
        where id = :id
        """,
        id=identificador,
    )
    return identificador, cursor.fetchone()


def executar_caso(cursor_ia, cursor_leitura, caso: Caso) -> Resultado:
    resultado = Resultado(caso=caso)
    try:
        resultado.resposta_id, linha = gerar_resposta(cursor_ia, caso)
        resultado.sql_gerado = clob_para_texto(linha[0])
        resultado.narrativa = clob_para_texto(linha[1])
        resultado.aviso = linha[2] or ""
        resultado.recusa = linha[3] or ""

        if caso.sql_referencia:
            resultado.colunas_referencia, resultado.linhas_referencia = consultar(
                cursor_leitura, caso.sql_referencia.strip()
            )
            try:
                sql_seguro = guardar(resultado.sql_gerado)
                resultado.colunas_geradas, resultado.linhas_geradas = consultar(
                    cursor_leitura, sql_seguro
                )
            except Exception as erro:  # noqa: BLE001
                resultado.veredito_sql = "SQL recusado ou inválido"
                resultado.detalhe_sql = str(erro).splitlines()[0]
            else:
                comparavel = Resposta(
                    pergunta=Pergunta(
                        id=caso.id,
                        titulo=caso.intencao,
                        prompt=caso.pergunta,
                        sql_referencia=caso.sql_referencia,
                        rotulo=caso.rotulo,
                    ),
                    bloco="FlowIA",
                    colunas_referencia=resultado.colunas_referencia,
                    linhas_referencia=resultado.linhas_referencia,
                    colunas_geradas=resultado.colunas_geradas,
                    linhas_geradas=resultado.linhas_geradas,
                )
                comparar(comparavel)
                resultado.veredito_sql = comparavel.veredito
                resultado.detalhe_sql = comparavel.detalhe

        avaliar_narrativa(resultado)
    except Exception as erro:  # noqa: BLE001
        resultado.erro = str(erro).strip().splitlines()[0]
    return resultado


def montar_relatorio(resultados: list[Resultado], inicio: datetime, fim: datetime) -> str:
    aprovados = sum(r.ok for r in resultados)
    dados_ok = sum(r.dados_ok for r in resultados)
    narrativas_ok = sum(r.narrativa_ok for r in resultados)
    linhas = [
        "# Avaliação da FlowIA com perguntas humanas",
        "",
        f"Executada em **{inicio:%d/%m/%Y às %H:%M}**, concluída em **{fim:%H:%M}**.",
        "",
        "As perguntas abaixo são deliberadamente curtas, vagas e coloquiais. O contexto da tela é enviado separadamente, como acontece no produto; nenhum prompt entrega nomes de tabelas, colunas, fórmulas ou cortes ao modelo.",
        "",
        "## Resumo",
        "",
        "| Medida | Resultado |",
        "|---|---:|",
        f"| Casos aprovados por inteiro | {aprovados}/{len(resultados)} |",
        f"| SQL/dados corretos ou caso sem dado objetivo | {dados_ok}/{len(resultados)} |",
        f"| Narrativas que atenderam aos critérios | {narrativas_ok}/{len(resultados)} |",
        "",
        "| Caso | Pergunta realista | SQL/dados | Narrativa | Final |",
        "|---|---|---|---|---|",
    ]
    for r in resultados:
        linhas.append(
            f"| {r.caso.id} | {r.caso.pergunta} | {r.veredito_sql} | "
            f"{'ok' if r.narrativa_ok else 'falhou'} | {'✅' if r.ok else '⚠️'} |"
        )

    for r in resultados:
        linhas.extend(
            [
                "",
                f"## {r.caso.id}. {r.caso.pergunta}",
                "",
                f"**Intenção esperada:** {r.caso.intencao}",
                "",
                f"**Contexto silencioso da tela:** `{r.caso.contexto}`",
                "",
                f"**ID auditado:** {r.resposta_id or 'não gerado'}",
            ]
        )
        if r.erro:
            linhas.extend(["", f"**Erro:** {r.erro}"])
            continue
        if r.caso.sql_referencia:
            linhas.extend(
                [
                    "",
                    f"**Conferência dos dados:** {r.veredito_sql}. {r.detalhe_sql}",
                    "",
                    "**Resposta de referência**",
                    "",
                    "```text",
                    tabela(r.colunas_referencia, r.linhas_referencia),
                    "```",
                    "",
                    "**Resposta do SQL gerado**",
                    "",
                    "```text",
                    tabela(r.colunas_geradas, r.linhas_geradas),
                    "```",
                ]
            )
        linhas.extend(
            [
                "",
                f"**Conferência da narrativa:** {'ok' if r.narrativa_ok else 'falhou'}. {r.detalhe_narrativa}",
                "",
                "**SQL gerado**",
                "",
                "```sql",
                r.sql_gerado or "(não gerado)",
                "```",
                "",
                "**Resposta escrita**",
                "",
                r.narrativa or "(sem narrativa)",
            ]
        )
    return "\n".join(linhas) + "\n"


def escolher_casos(argumentos: list[str]) -> tuple[list[Caso], Path]:
    """Sem argumentos roda tudo. Com ids, roda so eles e grava em outro arquivo.

    O relatorio completo e o retrato oficial da bateria; uma rodada parcial nao
    pode sobrescreve-lo.
    """
    if not argumentos:
        return list(CASOS), SAIDA

    pedidos = [a.strip().upper() for a in argumentos]
    por_id = {c.id.upper(): c for c in CASOS}
    faltando = [p for p in pedidos if p not in por_id]
    if faltando:
        conhecidos = ", ".join(c.id for c in CASOS)
        raise SystemExit(
            f"Casos inexistentes: {', '.join(faltando)}.\nDisponiveis: {conhecidos}"
        )
    escolhidos = [por_id[p] for p in pedidos]
    sufixo = "-".join(c.id for c in escolhidos)
    return escolhidos, SAIDA.with_name(f"{SAIDA.stem}_PARCIAL_{sufixo}.md")


def main() -> int:
    casos, saida = escolher_casos(sys.argv[1:])
    inicio = datetime.now(UTC).astimezone()
    resultados = []
    with conectar() as conexao_ia, conectar() as conexao_leitura:
        with conexao_ia.cursor() as cursor_ia, conexao_leitura.cursor() as cursor_leitura:
            cursor_leitura.execute("set transaction read only")
            for indice, caso in enumerate(casos, start=1):
                print(f"[{indice:02d}/{len(casos)}] {caso.id} — {caso.pergunta}", flush=True)
                resultado = executar_caso(cursor_ia, cursor_leitura, caso)
                resultados.append(resultado)
                estado = "OK" if resultado.ok else "REVER"
                print(
                    f"       {estado}: dados={resultado.veredito_sql}; "
                    f"narrativa={resultado.detalhe_narrativa or resultado.erro}",
                    flush=True,
                )
            conexao_leitura.rollback()

    fim = datetime.now(UTC).astimezone()
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(montar_relatorio(resultados, inicio, fim), encoding="utf-8")
    aprovados = sum(r.ok for r in resultados)
    print(f"\nResultado: {aprovados}/{len(resultados)} casos aprovados por inteiro.")
    print(f"Relatório: {saida.relative_to(RAIZ)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Quais recortes reconciliar, e como comparar cada um com a Gold.

O que este módulo acrescenta ao que já está no `db/` é curto de propósito: para
cada endpoint, de qual mart ele vem, quais filtros ele aceita e como enumerar
os recortes possíveis. Os nomes dos campos, a ordenação e a escala decimal vêm
de `fontes.py`, lidos do SQL.

A comparação é **posicional e exata**. Posicional porque o handler declara um
`order by` e a ordem faz parte do contrato: comparar por chave esconderia uma
ordenação errada. Exata porque o Oracle guarda cada número com escala
declarada, e a Gold arredondada para essa escala tem de dar o mesmo dígito —
tolerância aqui só serviria para esconder erro de conversão.
"""

from __future__ import annotations

from collections.abc import Callable, Iterator
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

from .cliente import CONEXOES_MAXIMAS, ClienteORDS
from .fontes import arredondar_como_oracle, contratos_dos_handlers, escalas_da_gold


@dataclass(frozen=True)
class Recorte:
    """Uma chamada concreta: o caminho e os parâmetros de consulta."""

    caminho: str
    parametros: dict[str, str | int] = field(default_factory=dict)
    filtro: dict[str, object] = field(default_factory=dict)
    """Coluna da Gold -> valor, o equivalente pandas do `where` do handler."""

    def __str__(self) -> str:
        if not self.parametros:
            return self.caminho
        query = "&".join(f"{k}={v}" for k, v in sorted(self.parametros.items()))
        return f"{self.caminho}?{query}"


@dataclass(frozen=True)
class Dimensao:
    """Uma dimensão que a view junta ao mart, e que entra na comparação.

    Sem isto, os campos vindos do join seriam pulados em silêncio — e um
    campo pulado é um campo não validado que parece validado.
    """

    arquivo: str
    chave: str


def _competencia_iso(linha) -> str:
    """`202406` -> `2024-06`, como os handlers das séries montam."""
    bruta = str(linha["cd_competencia"])
    return f"{bruta[:4]}-{bruta[4:]}"


@dataclass(frozen=True)
class Endpoint:
    padrao: str
    """A chave do handler no módulo ORDS, com `:cnes` e `:id`."""
    mart: str
    enumerar: Callable[[pd.DataFrame], Iterator[Recorte]]
    descricao: str
    dimensoes: tuple[Dimensao, ...] = ()
    derivados: dict[str, Callable[[object], object]] = field(default_factory=dict)
    """Campos que o handler calcula em vez de projetar de uma coluna.

    O extrator de `fontes.py` casa `'nome' value alias.coluna`, então um campo
    montado por concatenação passa despercebido — e campo despercebido é campo
    não reconciliado que parece reconciliado. Foram dois: o `competence` das
    duas séries. `test_o_mapa_cobre_tudo_que_a_api_devolve` existe para que o
    terceiro não passe.
    """


def _competencias(mart: pd.DataFrame) -> list[tuple[int, int]]:
    pares = mart[["nr_ano_competencia", "nr_mes_competencia"]].drop_duplicates()
    return sorted((int(a), int(m)) for a, m in pares.itertuples(index=False))


def _regioes_resumo(mart: pd.DataFrame) -> Iterator[Recorte]:
    for ano, mes in _competencias(mart):
        yield Recorte(
            caminho="regioes/resumo",
            parametros={"ano": ano, "mes": mes},
            filtro={"nr_ano_competencia": ano, "nr_mes_competencia": mes},
        )


def _regiao_serie(mart: pd.DataFrame) -> Iterator[Recorte]:
    for regiao in sorted(mart.cd_regiao_saude.unique()):
        yield Recorte(
            caminho=f"regioes/{regiao}/serie",
            filtro={"cd_regiao_saude": regiao},
        )


def _combinacoes(mart: pd.DataFrame, chave: str) -> list[tuple[int, int, str]]:
    """As combinações competência × chave que existem no mart, em ordem.

    Enumerar o produto cartesiano pediria recortes vazios ao banco; enumerar o
    que está no mart cobre exatamente o que a API tem de saber devolver.
    """
    colunas = ["nr_ano_competencia", "nr_mes_competencia", chave]
    presentes = mart[colunas].dropna().drop_duplicates()
    return sorted(
        (int(ano), int(mes), valor) for ano, mes, valor in presentes.itertuples(index=False)
    )


def _fluxos(mart: pd.DataFrame) -> Iterator[Recorte]:
    for ano, mes, origem in _combinacoes(mart, "cd_origem_residencia"):
        yield Recorte(
            caminho="fluxos",
            parametros={"ano": ano, "mes": mes, "origem": origem},
            filtro={
                "nr_ano_competencia": ano,
                "nr_mes_competencia": mes,
                "cd_origem_residencia": origem,
            },
        )


def _icsap(mart: pd.DataFrame) -> Iterator[Recorte]:
    for ano, mes, regiao in _combinacoes(mart, "cd_regiao_saude"):
        yield Recorte(
            caminho="icsap",
            parametros={"ano": ano, "mes": mes, "regiao": regiao},
            filtro={
                "nr_ano_competencia": ano,
                "nr_mes_competencia": mes,
                "cd_regiao_saude": regiao,
            },
        )


def _hospitais(mart: pd.DataFrame) -> Iterator[Recorte]:
    for ano, mes, regiao in _combinacoes(mart, "cd_regiao_saude"):
        yield Recorte(
            caminho="hospitais",
            parametros={"ano": ano, "mes": mes, "regiao": regiao},
            filtro={
                "nr_ano_competencia": ano,
                "nr_mes_competencia": mes,
                "cd_regiao_saude": regiao,
            },
        )


def _hospital_serie(mart: pd.DataFrame) -> Iterator[Recorte]:
    for cnes in sorted(mart.cd_cnes.unique()):
        yield Recorte(caminho=f"hospitais/{cnes}/serie", filtro={"cd_cnes": cnes})


def _hospital_especialidades(mart: pd.DataFrame) -> Iterator[Recorte]:
    # O mais caro dos oito: são milhares de combinações hospital-competência,
    # uma chamada cada, porque o handler exige `ano` e `mes`.
    for ano, mes, cnes in _combinacoes(mart, "cd_cnes"):
        yield Recorte(
            caminho=f"hospitais/{cnes}/especialidades",
            parametros={"ano": ano, "mes": mes},
            filtro={
                "cd_cnes": cnes,
                "nr_ano_competencia": ano,
                "nr_mes_competencia": mes,
            },
        )


def _hospital_cids(mart: pd.DataFrame) -> Iterator[Recorte]:
    for cnes in sorted(mart.cd_cnes.unique()):
        yield Recorte(caminho=f"hospitais/{cnes}/cids", filtro={"cd_cnes": cnes})


ENDPOINTS: tuple[Endpoint, ...] = (
    Endpoint(
        padrao="regioes/resumo",
        mart="mart_indicador_regiao_mensal",
        enumerar=_regioes_resumo,
        descricao="62 regiões por competência",
        dimensoes=(
            Dimensao(arquivo="geografia/dim_geografia_regiao.csv", chave="cd_regiao_saude"),
        ),
    ),
    Endpoint(
        padrao="regioes/:id/serie",
        mart="mart_indicador_regiao_mensal",
        enumerar=_regiao_serie,
        descricao="série mensal de cada região",
        derivados={"competence": _competencia_iso},
    ),
    Endpoint(
        padrao="fluxos",
        mart="mart_fluxo_assistencial_regiao_mensal",
        enumerar=_fluxos,
        descricao="matriz origem–destino da última competência",
    ),
    Endpoint(
        padrao="icsap",
        mart="mart_icsap_regiao_mensal",
        enumerar=_icsap,
        descricao="19 grupos ICSAP por região",
    ),
    Endpoint(
        padrao="hospitais",
        mart="mart_indicador_hospital_mensal",
        enumerar=_hospitais,
        descricao="hospitais por região na última competência",
    ),
    Endpoint(
        padrao="hospitais/:cnes/serie",
        mart="mart_indicador_hospital_mensal",
        enumerar=_hospital_serie,
        descricao="série mensal de cada hospital",
        derivados={"competence": _competencia_iso},
    ),
    Endpoint(
        padrao="hospitais/:cnes/especialidades",
        mart="mart_indicador_hospital_especialidade_mensal",
        enumerar=_hospital_especialidades,
        descricao="especialidades por hospital",
    ),
    Endpoint(
        padrao="hospitais/:cnes/cids",
        mart="mart_indicador_hospital_cid_periodo",
        enumerar=_hospital_cids,
        descricao="IPR por diagnóstico, o maior mart do produto",
    ),
)


def carregar_mart(base: Path, nome: str) -> pd.DataFrame:
    return pd.read_parquet(base / "data" / "gold" / "marts" / f"{nome}.parquet")


def carregar_com_dimensoes(base: Path, endpoint: Endpoint) -> pd.DataFrame:
    """O mart mais as dimensões que a view junta, com as chaves como texto."""
    frame = carregar_mart(base, endpoint.mart)
    for dimensao in endpoint.dimensoes:
        # Só a chave é forçada a texto, para casar com o código do mart. O
        # resto mantém o tipo inferido: `qt_municipio` é contagem, e comparar
        # a string '7' com o 7 do JSON acusaria divergência que não existe.
        tabela = pd.read_csv(
            base / "data" / "gold" / dimensao.arquivo, dtype={dimensao.chave: "string"}
        )
        colunas_novas = [
            coluna
            for coluna in tabela.columns
            if coluna == dimensao.chave or coluna not in frame.columns
        ]
        frame = frame.merge(
            tabela[colunas_novas], on=dimensao.chave, how="left", validate="many_to_one"
        )
    return frame


def ordenar_como_o_handler(
    frame: pd.DataFrame, ordem, colunas_do_mart: set[str]
) -> pd.DataFrame:
    """Reproduz o `order by` do handler, inclusive o tratamento de nulos.

    Ordena da chave menos significativa para a mais, sempre com algoritmo
    estável. É o único jeito de honrar `nulls last` numa chave e o padrão em
    outra: `sort_values` só aceita um `na_position` por chamada.
    """
    resultado = frame
    for chave in reversed(ordem):
        if chave.coluna not in colunas_do_mart:
            raise KeyError(
                f"o handler ordena por `{chave.coluna}`, que não existe no mart"
            )
        resultado = resultado.sort_values(
            chave.coluna,
            ascending=not chave.descendente,
            na_position="last" if chave.nulos_no_fim else "first",
            kind="stable",
        )
    return resultado.reset_index(drop=True)


def amostrar(recortes: list[Recorte], quantidade: int | None) -> list[Recorte]:
    """Espalha a amostra pela lista, e garante o último recorte.

    Pegar os `n` primeiros faria a amostra olhar sempre janeiro de 2024 e
    nunca a competência que o produto exibe — justamente a que quebra quando
    o recorte avança. O último entra sempre; o resto vem espaçado.
    """
    if quantidade is None or len(recortes) <= quantidade:
        return recortes
    if quantidade == 1:
        return [recortes[-1]]
    passo = (len(recortes) - 1) / (quantidade - 1)
    indices = sorted({round(i * passo) for i in range(quantidade)})
    return [recortes[indice] for indice in indices]


@dataclass
class Divergencia:
    recorte: str
    linha: int
    campo: str
    esperado: object
    obtido: object

    def __str__(self) -> str:
        return (
            f"{self.recorte} linha {self.linha} campo {self.campo}: "
            f"Gold={self.esperado!r} API={self.obtido!r}"
        )


def _comparavel(valor):
    """Nulo do pandas e ausência no JSON são a mesma coisa aqui."""
    if valor is None or (isinstance(valor, float) and pd.isna(valor)) or valor is pd.NA:
        return None
    if pd.api.types.is_scalar(valor) and pd.isna(valor):
        return None
    return valor


def reconciliar_recorte(
    itens: list[dict],
    esperado: pd.DataFrame,
    contrato,
    escalas: dict[str, int],
    rotulo: str,
    derivados: dict[str, Callable[[object], object]] | None = None,
) -> tuple[int, list[Divergencia]]:
    """Compara uma resposta com a fatia da Gold. Devolve (comparações, erros)."""
    divergencias: list[Divergencia] = []
    if len(itens) != len(esperado):
        divergencias.append(
            Divergencia(rotulo, -1, "contagem", len(esperado), len(itens))
        )
        return 0, divergencias

    derivados = derivados or {}
    comparacoes = 0
    for posicao, (item, (_, linha)) in enumerate(
        zip(itens, esperado.iterrows(), strict=True)
    ):
        for campo, coluna in contrato.campos.items():
            if coluna not in esperado.columns:
                continue
            alvo = _comparavel(linha[coluna])
            if alvo is not None and coluna in escalas:
                alvo = arredondar_como_oracle(alvo, escalas[coluna])
            obtido = _comparavel(item.get(campo))
            if isinstance(obtido, (int, float)) and isinstance(alvo, (int, float)):
                iguais = float(obtido) == float(alvo)
            else:
                iguais = obtido == alvo
            comparacoes += 1
            if not iguais:
                divergencias.append(Divergencia(rotulo, posicao, campo, alvo, obtido))
        for campo, calcular in derivados.items():
            alvo = calcular(linha)
            obtido = _comparavel(item.get(campo))
            comparacoes += 1
            if obtido != alvo:
                divergencias.append(Divergencia(rotulo, posicao, campo, alvo, obtido))
    return comparacoes, divergencias


def reconciliar_endpoint(
    endpoint: Endpoint,
    base: Path,
    cliente: ClienteORDS,
    limite_de_recortes: int | None = None,
) -> tuple[int, int, list[Divergencia]]:
    """Reconcilia um endpoint. Devolve (recortes, comparações, divergências)."""
    contrato = contratos_dos_handlers(base)[endpoint.padrao]
    escalas = escalas_da_gold(base).get(endpoint.mart, {})
    mart = carregar_com_dimensoes(base, endpoint)
    colunas = set(mart.columns)

    faltando = {
        coluna for coluna in contrato.campos.values() if coluna not in colunas
    }
    if faltando:
        raise KeyError(
            f"{endpoint.padrao}: o handler devolve colunas ausentes no mart: "
            f"{sorted(faltando)}"
        )

    recortes = amostrar(list(endpoint.enumerar(mart)), limite_de_recortes)

    def um_recorte(recorte: Recorte) -> tuple[int, list[Divergencia]]:
        fatia = mart
        for coluna, valor in recorte.filtro.items():
            fatia = fatia[fatia[coluna] == valor]
        esperado = ordenar_como_o_handler(fatia, contrato.ordem, colunas)
        itens = list(
            cliente.varrer(
                recorte.caminho, recorte.parametros, limite=contrato.limite_maximo
            )
        )
        return reconciliar_recorte(
            itens, esperado, contrato, escalas, str(recorte), endpoint.derivados
        )

    # Três trabalhadores, o mesmo teto do semáforo do cliente: a varredura
    # completa são milhares de chamadas e serializá-las levaria horas, mas
    # passar de três é como se toma 429 na Always Free.
    total_comparacoes = 0
    divergencias: list[Divergencia] = []
    with ThreadPoolExecutor(max_workers=CONEXOES_MAXIMAS) as executor:
        for comparacoes, erros in executor.map(um_recorte, recortes):
            total_comparacoes += comparacoes
            divergencias.extend(erros)
    return len(recortes), total_comparacoes, divergencias

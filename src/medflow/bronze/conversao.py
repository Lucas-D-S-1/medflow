"""DBC → DBF → Parquet, preservando as fontes como estão.

Nenhuma regra de negócio, de/para ou filtro analítico entra aqui: a Bronze só
muda o formato. As três colunas acrescentadas — `_arquivo_fonte`,
`_ano_arquivo` e `_mes_arquivo` — são linhagem, não conteúdo.

O esquema do SIH/RD evolui entre competências. A consolidação unifica os
esquemas de todas as competências antes de escrever e preenche com nulo o que
falta em cada mês, para que a diferença fique visível no manifesto em vez de
quebrar a leitura.
"""

from __future__ import annotations

import datasus_dbc
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from dbfread import DBF

from medflow.bronze.contexto import GRUPOS, ContextoBronze
from medflow.config import obter_logger

logger = obter_logger("bronze.conversao")


def descomprimir(contexto: ContextoBronze) -> int:
    """Converte para DBF os DBC que ainda não têm par. Devolve quantos converteu."""
    convertidos = 0
    for grupo in GRUPOS:
        for ano, mes in contexto.competencias:
            dbc = contexto.caminho_dbc(grupo, ano, mes)
            dbf = contexto.caminho_dbf(grupo, ano, mes)
            if not dbf.exists():
                datasus_dbc.decompress(str(dbc), str(dbf))
                logger.info("convertido %s", dbf.name, extra={"competencia": f"{ano}-{mes:02d}"})
                convertidos += 1
    return convertidos


def ler_competencia(contexto: ContextoBronze, grupo: str, ano: int, mes: int) -> pd.DataFrame:
    dbf = contexto.caminho_dbf(grupo, ano, mes)
    frame = pd.DataFrame(iter(DBF(str(dbf), encoding="iso-8859-1")))
    frame["_arquivo_fonte"] = dbf.name
    frame["_ano_arquivo"] = ano
    frame["_mes_arquivo"] = mes
    return frame


def _campos_por_competencia(
    contexto: ContextoBronze, grupo: str
) -> dict[str, set[str]]:
    return {
        f"{ano}{mes:02d}": set(
            DBF(
                str(contexto.caminho_dbf(grupo, ano, mes)),
                encoding="iso-8859-1",
                load=False,
            ).field_names
        )
        | {"_arquivo_fonte", "_ano_arquivo", "_mes_arquivo"}
        for ano, mes in contexto.competencias
    }


def consolidar(
    contexto: ContextoBronze, grupo: str, nome_saida: str
) -> dict[str, dict[str, list[str]]]:
    """Consolida as competências do grupo em um Parquet. Devolve a evolução de esquema."""
    destino = contexto.dir_parquet / nome_saida

    campos_por_competencia = _campos_por_competencia(contexto, grupo)
    campos_iniciais = campos_por_competencia[contexto.competencias_atuais[0]]
    campos_uniao = set().union(*campos_por_competencia.values())
    mudancas = {
        competencia: {
            "adicionadas_desde_inicio": sorted(campos - campos_iniciais),
            "ausentes_em_relacao_uniao": sorted(campos_uniao - campos),
        }
        for competencia, campos in campos_por_competencia.items()
        if campos != campos_iniciais
    }
    if mudancas:
        logger.warning("[%s] evolução de esquema: %s", grupo, mudancas)

    if destino.exists() and not contexto.sobrescrever:
        cobertura = pd.read_parquet(
            destino, columns=["_ano_arquivo", "_mes_arquivo"]
        ).drop_duplicates()
        competencias_destino = set(map(tuple, cobertura.to_numpy()))
        if competencias_destino == set(contexto.competencias):
            logger.info(
                "já existe com o recorte atual, não será substituído: %s", destino.name
            )
            return mudancas

    temporario = destino.with_suffix(".parquet.parcial")
    if temporario.exists():
        temporario.unlink()

    # DÍVIDA CONHECIDA: cada competência é lida duas vezes — uma para deduzir
    # o esquema e outra para escrever. São ~16 GB de leitura para 8,2 GB de
    # DBF, e responde por quase todo o tempo dos ~18 minutos da consolidação.
    # Ler uma vez, guardando os DataFrames ou inferindo o esquema sem
    # materializar, é uma otimização segura agora que a paridade por hash
    # existe para provar que o resultado não mudou. Não foi feita junto da
    # extração porque a regra da fatia 4 é mover sem refatorar.
    esquemas = []
    for ano, mes in contexto.competencias:
        frame = ler_competencia(contexto, grupo, ano, mes)
        tabela = pa.Table.from_pandas(frame, preserve_index=False)
        esquemas.append(tabela.schema.remove_metadata())
    esquema_union = pa.unify_schemas(esquemas)

    writer = None
    total = 0
    try:
        for ano, mes in contexto.competencias:
            frame = ler_competencia(contexto, grupo, ano, mes)
            tabela = pa.Table.from_pandas(frame, preserve_index=False)
            for campo in esquema_union:
                if campo.name not in tabela.column_names:
                    tabela = tabela.append_column(
                        campo, pa.nulls(len(tabela), type=campo.type)
                    )
            tabela = tabela.select(esquema_union.names).cast(esquema_union)
            if writer is None:
                writer = pq.ParquetWriter(temporario, esquema_union, compression="snappy")
            writer.write_table(tabela)
            total += len(frame)
            logger.info(
                "[%s] %s linhas | acumulado %s",
                grupo, f"{len(frame):,}", f"{total:,}",
                extra={"competencia": f"{ano}-{mes:02d}"},
            )
    finally:
        if writer is not None:
            writer.close()
    temporario.replace(destino)
    return mudancas


def consolidar_todos(contexto: ContextoBronze) -> dict[str, dict]:
    """Consolida SIH/RD e CNES/LT. Devolve a evolução de esquema por grupo."""
    return {
        "RD": consolidar(contexto, "RD", contexto.arquivo_sih.name),
        "LT": consolidar(contexto, "LT", contexto.arquivo_cnes.name),
    }

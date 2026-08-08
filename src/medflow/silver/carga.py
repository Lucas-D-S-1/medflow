"""Leitura da Bronze e tipagem de entrada da Silver.

O manifesto da Bronze é a fonte do recorte: a Silver não redescobre
competências, ela obedece ao que a Bronze registrou. Isso é o que garante que
as duas camadas falam do mesmo período.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from zipfile import ZipFile

import pandas as pd

COLS_SIH = [
    "N_AIH", "IDENT", "CNES", "MUNIC_MOV", "MUNIC_RES", "ESPEC",
    "QT_DIARIAS", "DIAS_PERM", "MORTE", "VAL_TOT", "DIAG_PRINC",
    "DT_INTER", "DT_SAIDA", "IDADE", "COD_IDADE", "SEXO", "CAR_INT",
    "COMPLEX", "MARCA_UTI", "UTI_MES_TO", "ANO_CMPT", "MES_CMPT",
    "_arquivo_fonte", "_ano_arquivo", "_mes_arquivo",
]
COLS_SIH_TEXTO = [
    "N_AIH", "IDENT", "CNES", "MUNIC_MOV", "MUNIC_RES", "ESPEC",
    "DIAG_PRINC", "COD_IDADE", "SEXO", "CAR_INT", "COMPLEX",
    "MARCA_UTI", "DT_INTER", "DT_SAIDA",
]
COLS_SIH_INTEIRAS = ["QT_DIARIAS", "DIAS_PERM", "MORTE", "IDADE", "UTI_MES_TO"]


@dataclass
class EntradaSilver:
    """Tudo que a Silver lê da Bronze, já tipado."""

    base: Path
    manifesto: dict[str, Any]
    competencias: list[tuple[int, int]]
    sih: pd.DataFrame
    cnes: pd.DataFrame
    ibge_raw: list[dict[str, Any]]
    regioes_ms_payload: dict[str, Any]
    cnes_atual_payload: dict[str, Any]
    regioes_csv_sp: pd.DataFrame
    arquivo_cid10: Path
    inventario: list[dict[str, Any]] = field(default_factory=list)


def carregar(base: Path) -> EntradaSilver:
    dir_bronze = base / "data" / "bronze"
    dir_parquet = dir_bronze / "parquet"
    dir_referencias = dir_bronze / "origem" / "referencias"

    manifesto = json.loads((dir_bronze / "MANIFESTO.json").read_text(encoding="utf-8"))
    assert manifesto["camada"] == "bronze"
    competencias = [
        (int(valor[:4]), int(valor[4:]))
        for valor in manifesto["recorte"]["competencias"]
    ]

    arq_sih = dir_parquet / manifesto["arquivos"]["sih"]["caminho"]
    arq_cnes = dir_parquet / manifesto["arquivos"]["cnes"]["caminho"]
    print("entrada:", dir_parquet.relative_to(base))
    print("saída  :", (base / "data" / "silver").relative_to(base))

    sih = pd.read_parquet(arq_sih, columns=COLS_SIH)
    cnes = pd.read_parquet(arq_cnes)
    ibge_raw = json.loads((dir_referencias / "ibge_municipios_sp_raw.json").read_bytes())
    regioes_ms_payload = json.loads(
        (dir_referencias / "ms_regioes_saude_sp_raw.json").read_bytes()
    )
    cnes_atual_payload = json.loads(
        (dir_referencias / "ms_cnes_estabelecimentos_atuais_raw.json").read_bytes()
    )

    arquivo_regioes_csv = dir_referencias / "macrorregiao_de_saude_csv.zip"
    with ZipFile(arquivo_regioes_csv) as pacote, pacote.open(
        "macroregiao_de_saude.csv"
    ) as arquivo:
        regioes_csv = pd.read_csv(arquivo, sep=";", dtype="string")
    regioes_csv_sp = regioes_csv[regioes_csv.sg_uf.eq("SP")].copy()
    regioes_csv_sp["municipio_cod6"] = regioes_csv_sp.cod_municipio.str.zfill(6)
    regioes_csv_sp["qt_populacao_ibge_2022"] = pd.to_numeric(
        regioes_csv_sp.populacao_ibge_2022, errors="raise"
    ).astype("int64")

    for coluna in COLS_SIH_TEXTO:
        sih[coluna] = sih[coluna].astype("string").str.strip()
    for coluna in COLS_SIH_INTEIRAS:
        sih[coluna] = pd.to_numeric(sih[coluna], errors="raise").astype("int32")
    sih["VAL_TOT"] = pd.to_numeric(sih["VAL_TOT"], errors="raise").astype("float64")
    sih["_ano"] = pd.to_numeric(sih["ANO_CMPT"], errors="raise").astype("int16")
    sih["_mes"] = pd.to_numeric(sih["MES_CMPT"], errors="raise").astype("int8")

    print(f"SIH : {sih.shape[0]:,} × {sih.shape[1]}")
    print(f"CNES: {cnes.shape[0]:,} × {cnes.shape[1]}")
    print("IDENT:", sih.IDENT.value_counts(dropna=False).to_dict())

    return EntradaSilver(
        base=base,
        manifesto=manifesto,
        competencias=competencias,
        sih=sih,
        cnes=cnes,
        ibge_raw=ibge_raw,
        regioes_ms_payload=regioes_ms_payload,
        cnes_atual_payload=cnes_atual_payload,
        regioes_csv_sp=regioes_csv_sp,
        arquivo_cid10=dir_referencias / "datasus_cid10_2008.zip",
    )

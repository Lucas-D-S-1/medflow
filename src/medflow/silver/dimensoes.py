"""As seis dimensões da Silver.

`dim_hospital` e `dim_municipio` carregam a ressalva cadastral do projeto: nome
e esfera vêm da fotografia **atual** do CNES, não de uma fotografia histórica
de 2024-2026. Por isso o sufixo `_atual` e a flag
`fl_cadastro_atual_nao_historico`.
"""

from __future__ import annotations

import calendar
from zipfile import ZipFile

import numpy as np
import pandas as pd

from medflow.silver.carga import EntradaSilver
from medflow.silver.dominios import (
    CID_COMPLEMENTAR,
    DEPARA_ESPEC,
    DEPARA_GESTAO,
    DEPARA_NAT_JUR,
    DEPARA_TP_UNID,
    classificar_cid,
    normaliza_codigo,
)


def dimensao_tempo(competencias: list[tuple[int, int]]) -> pd.DataFrame:
    dim_tempo = pd.DataFrame(competencias, columns=["_ano", "_mes"])
    dim_tempo["dias_no_mes"] = [
        calendar.monthrange(a, m)[1]
        for a, m in zip(dim_tempo._ano, dim_tempo._mes, strict=True)
    ]
    dim_tempo["competencia"] = (
        dim_tempo._ano.astype(str) + dim_tempo._mes.astype(str).str.zfill(2)
    )
    dim_tempo["data_ref"] = pd.to_datetime(dim_tempo.competencia + "01", format="%Y%m%d")
    dim_tempo["trimestre"] = dim_tempo.data_ref.dt.quarter
    return dim_tempo


def dimensao_especialidade(sih: pd.DataFrame) -> pd.DataFrame:
    observadas = (
        sih.ESPEC.value_counts().rename_axis("ESPEC").reset_index(name="aih_aprovadas")
    )
    return observadas.assign(
        especialidade=observadas.ESPEC.map(DEPARA_ESPEC),
        mapeada=observadas.ESPEC.isin(DEPARA_ESPEC).astype("int8"),
    )


def dimensao_cid(entrada: EntradaSilver) -> pd.DataFrame:
    with ZipFile(entrada.arquivo_cid10) as pacote:
        cid_sub = pd.read_csv(
            pacote.open("CID-10-SUBCATEGORIAS.CSV"), sep=";", encoding="latin1", dtype=str
        )
        cid_cat = pd.read_csv(
            pacote.open("CID-10-CATEGORIAS.CSV"), sep=";", encoding="latin1", dtype=str
        )

    renomear = {
        "DESCRICAO": "cid_descricao",
        "DESCRABREV": "cid_descricao_abreviada",
    }
    colunas = ["cid_principal", "cid_descricao", "cid_descricao_abreviada"]

    cid_sub = cid_sub.rename(columns={"SUBCAT": "cid_principal", **renomear})[colunas]
    cid_sub["fonte_descricao"] = "DATASUS CID-10 2008 — subcategoria"
    cid_cat_ref = cid_cat.rename(columns={"CAT": "cid_principal", **renomear})[colunas]
    cid_cat_ref["fonte_descricao"] = "DATASUS CID-10 2008 — categoria"

    cid_ref = pd.concat([cid_sub, cid_cat_ref], ignore_index=True).drop_duplicates(
        "cid_principal"
    )
    cid_complementar = pd.DataFrame(
        [
            {
                "cid_principal": codigo,
                "cid_descricao": descricao,
                "cid_descricao_abreviada": descricao,
                "fonte_descricao": fonte,
            }
            for codigo, (descricao, fonte) in CID_COMPLEMENTAR.items()
        ]
    )
    cid_ref = pd.concat([cid_ref, cid_complementar], ignore_index=True).drop_duplicates(
        "cid_principal", keep="last"
    )

    codigos = (
        entrada.sih.DIAG_PRINC.value_counts(dropna=False)
        .rename_axis("cid_principal")
        .reset_index(name="aih_aprovadas")
    )
    dim_cid = codigos.merge(cid_ref, on="cid_principal", how="left", validate="one_to_one")
    dim_cid["categoria"] = dim_cid.cid_principal.str[:3]
    categorias = (
        cid_cat[["CAT", "DESCRICAO"]]
        .rename(columns={"CAT": "categoria", "DESCRICAO": "categoria_descricao"})
        .drop_duplicates("categoria")
    )
    dim_cid = dim_cid.merge(categorias, on="categoria", how="left", validate="many_to_one")
    classificacao = dim_cid.cid_principal.map(classificar_cid)
    dim_cid["capitulo"] = [x[0] for x in classificacao]
    dim_cid["capitulo_desc"] = [x[1] for x in classificacao]

    assert (dim_cid.capitulo != "--").all(), "há CID sem capítulo"
    assert dim_cid.cid_descricao.notna().all(), "há CID sem descrição oficial/confiável"
    return dim_cid


def _regioes_oficiais(entrada: EntradaSilver) -> pd.DataFrame:
    regioes = pd.DataFrame(
        entrada.regioes_ms_payload["macrorregiao_regiao_saude_municipios"]
    ).rename(
        columns={
            "codigo_municipio": "municipio_cod6",
            "codigo_regiao_saude": "regiao_saude",
            "regiao_saude": "regiao_saude_nome",
            "codigo_macrorregiao_saude": "macrorregiao_saude_codigo",
            "macrorregiao_saude": "macrorregiao_saude_nome",
        }
    )
    for coluna in ["municipio_cod6", "regiao_saude", "macrorregiao_saude_codigo"]:
        regioes[coluna] = regioes[coluna].astype("string").str.strip()
    return regioes[
        [
            "municipio_cod6", "regiao_saude", "regiao_saude_nome",
            "macrorregiao_saude_codigo", "macrorregiao_saude_nome",
        ]
    ].drop_duplicates("municipio_cod6")


def dimensao_hospital(entrada: EntradaSilver) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Devolve `dim_hospital` e as regiões oficiais, reusadas por `dim_municipio`."""
    cnes = entrada.cnes
    for coluna in ["CNES", "CODUFMUN", "TP_UNID", "ESFERA_A", "NAT_JUR", "TPGESTAO"]:
        cnes[coluna] = cnes[coluna].astype("string").str.strip()
    cnes["regiao_cnes_lt_normalizada"] = cnes.REGSAUDE.map(
        lambda x: normaliza_codigo(x, 4)
    ).astype("string")

    reg_hosp_raw = (
        cnes.dropna(subset=["regiao_cnes_lt_normalizada"])
        .groupby("CNES", as_index=False)
        .agg(
            regiao_saude_cnes_lt=("regiao_cnes_lt_normalizada", lambda s: s.mode().iloc[0]),
            qtd_regioes_declaradas_cnes_lt=("regiao_cnes_lt_normalizada", "nunique"),
        )
    )

    regioes_oficiais = _regioes_oficiais(entrada)

    cadastro_atual = pd.DataFrame(entrada.cnes_atual_payload["registros"])
    cadastro_atual["CNES"] = (
        cadastro_atual.codigo_cnes.astype("string")
        .str.replace(r"\.0$", "", regex=True)
        .str.zfill(7)
    )
    cadastro_atual = cadastro_atual.rename(
        columns={
            "nome_fantasia": "hospital_nome_atual",
            "nome_razao_social": "hospital_razao_social_atual",
            "descricao_esfera_administrativa": "esfera_administrativa_atual",
            "data_atualizacao": "cadastro_cnes_atualizado_em",
        }
    )

    hospitais_sih = set(entrada.sih.CNES.unique())
    perfil_hosp = (
        cnes[cnes.CNES.isin(hospitais_sih)]
        .sort_values(["CNES", "_ano_arquivo", "_mes_arquivo"])
        .groupby("CNES", as_index=False)
        .agg(
            municipio_cod6=("CODUFMUN", "last"),
            tipo_unidade_cod=("TP_UNID", "last"),
            esfera_cod_cnes_lt=("ESFERA_A", "last"),
            natureza_jur_cod=("NAT_JUR", "last"),
            gestao_cod=("TPGESTAO", "last"),
        )
    )
    dim_hospital = (
        perfil_hosp.merge(reg_hosp_raw, on="CNES", how="left", validate="one_to_one")
        .merge(regioes_oficiais, on="municipio_cod6", how="left", validate="many_to_one")
        .merge(
            cadastro_atual[
                [
                    "CNES", "hospital_nome_atual", "hospital_razao_social_atual",
                    "esfera_administrativa_atual", "cadastro_cnes_atualizado_em",
                ]
            ],
            on="CNES",
            how="left",
            validate="one_to_one",
        )
    )
    dim_hospital["origem_regiao"] = np.where(
        dim_hospital.regiao_saude.notna(),
        "referencia_oficial_municipio_ms",
        "sem_regiao_oficial",
    )
    dim_hospital["fl_regiao_conflitante"] = dim_hospital.qtd_regioes_declaradas_cnes_lt.gt(
        1
    ).astype("int8")
    dim_hospital["fl_regiao_nao_confiavel"] = dim_hospital.regiao_saude.isna().astype("int8")
    dim_hospital["tipo_unidade"] = dim_hospital.tipo_unidade_cod.map(DEPARA_TP_UNID)
    dim_hospital["gestao"] = dim_hospital.gestao_cod.map(DEPARA_GESTAO)
    dim_hospital["natureza_juridica"] = dim_hospital.natureza_jur_cod.map(DEPARA_NAT_JUR)
    dim_hospital["fl_esfera_ausente_cnes_lt"] = (
        dim_hospital.esfera_cod_cnes_lt.fillna("").eq("").astype("int8")
    )
    dim_hospital["fl_cadastro_atual_nao_historico"] = np.int8(1)

    print(dim_hospital.origem_regiao.value_counts(dropna=False).to_string())
    print("hospitais com nome atual:", dim_hospital.hospital_nome_atual.notna().sum())
    print(
        "hospitais com esfera atual:",
        dim_hospital.esfera_administrativa_atual.notna().sum(),
    )
    print("hospitais com natureza jurídica:", dim_hospital.natureza_juridica.notna().sum())
    return dim_hospital, regioes_oficiais


def dimensao_municipio(
    entrada: EntradaSilver, regioes_oficiais: pd.DataFrame
) -> pd.DataFrame:
    dim_municipio = pd.DataFrame(
        [
            {
                "municipio_cod7": str(item["id"]),
                "municipio_cod6": str(item["id"])[:6],
                "municipio_nome": item["nome"],
                "uf": "SP",
                "microrregiao": item["microrregiao"]["nome"],
                "mesorregiao": item["microrregiao"]["mesorregiao"]["nome"],
            }
            for item in entrada.ibge_raw
        ]
    )
    dim_municipio = dim_municipio.merge(
        regioes_oficiais, on="municipio_cod6", how="left", validate="one_to_one"
    )
    populacao = entrada.regioes_csv_sp[
        [
            "municipio_cod6", "qt_populacao_ibge_2022",
            "cod_regiao_de_saude", "cod_macrorregiao_de_saude",
        ]
    ].rename(
        columns={
            "cod_regiao_de_saude": "regiao_saude_csv",
            "cod_macrorregiao_de_saude": "macrorregiao_saude_csv",
        }
    )
    assert len(populacao) == 645
    dim_municipio = dim_municipio.merge(
        populacao, on="municipio_cod6", how="left", validate="one_to_one"
    )
    assert dim_municipio.qt_populacao_ibge_2022.notna().all()
    assert dim_municipio.regiao_saude.eq(dim_municipio.regiao_saude_csv).all()
    assert dim_municipio.macrorregiao_saude_codigo.eq(
        dim_municipio.macrorregiao_saude_csv
    ).all()
    dim_municipio = dim_municipio.drop(
        columns=["regiao_saude_csv", "macrorregiao_saude_csv"]
    )
    dim_municipio["ds_fonte_populacao"] = "Ministério da Saúde / IBGE 2022"
    return dim_municipio

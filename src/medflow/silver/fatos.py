"""Os dois fatos da Silver.

Duas distinções sustentam todo o resto do projeto e estão materializadas aqui:

- **AIH aprovada não é internação nova.** `IDENT` separa a internação nova
  (`1`) da continuação de longa permanência (`5`). Somar AIH e chamar de
  internação superestima o volume.
- **`QT_DIARIAS` não é `DIAS_PERM`.** Diária é faturamento, permanência é
  tempo. Os dois são preservados e nunca usados como sinônimo.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from medflow.config import obter_logger
from medflow.silver.dominios import (
    DEPARA_CAR_INT,
    DEPARA_COD_IDADE,
    DEPARA_COMPLEX,
    DEPARA_ESPEC,
    DEPARA_IDENT,
    DEPARA_SEXO,
    DEPARA_UTI,
)

logger = obter_logger("silver.fatos")

COLS_FATO = [
    "N_AIH", "IDENT", "ident_descricao", "CNES", "municipio_cod6", "municipio_res_cod6",
    "regiao_saude", "regiao_saude_nome", "macrorregiao_saude_codigo",
    "macrorregiao_saude_nome", "origem_regiao", "fl_regiao_conflitante",
    "fl_regiao_nao_confiavel",
    "_ano", "_mes", "dt_internacao", "dt_saida", "fl_cruza_mes",
    "fl_competencia_diverge_saida", "ESPEC", "especialidade", "cid_principal",
    "cid_descricao", "categoria_descricao", "capitulo", "capitulo_desc",
    "fonte_descricao", "QT_DIARIAS", "DIAS_PERM", "MORTE", "VAL_TOT",
    "UTI_MES_TO", "MARCA_UTI", "marca_uti_descricao", "IDADE", "COD_IDADE",
    "unidade_idade", "idade_anos_aprox", "SEXO", "sexo_descricao", "CAR_INT",
    "carater_internacao", "COMPLEX", "complexidade", "fl_aih_aprovada",
    "fl_internacao_nova", "fl_continuacao_longa_permanencia",
    "dias_perm_internacao_nova", "qt_diarias_internacao_nova",
    "valor_internacao_nova", "valor_continuacao",
    "fl_sem_diaria_faturada", "fl_permanencia_zero", "fl_sem_valor",
    "fl_obito", "fl_obito_internacao_nova", "fl_aih_com_valor", "fl_uti",
    "_arquivo_fonte",
]


def fato_internacao(
    sih: pd.DataFrame, dim_hospital: pd.DataFrame, dim_cid: pd.DataFrame
) -> pd.DataFrame:
    fato = sih.rename(
        columns={
            "MUNIC_MOV": "municipio_cod6",
            "MUNIC_RES": "municipio_res_cod6",
            "DIAG_PRINC": "cid_principal",
        }
    ).copy()

    fato["dt_internacao"] = pd.to_datetime(fato.DT_INTER, format="%Y%m%d", errors="coerce")
    fato["dt_saida"] = pd.to_datetime(fato.DT_SAIDA, format="%Y%m%d", errors="coerce")
    fato["especialidade"] = fato.ESPEC.map(DEPARA_ESPEC)
    fato["ident_descricao"] = fato.IDENT.map(DEPARA_IDENT)
    fato["unidade_idade"] = fato.COD_IDADE.map(DEPARA_COD_IDADE)
    fato["sexo_descricao"] = fato.SEXO.map(DEPARA_SEXO)
    fato["carater_internacao"] = fato.CAR_INT.map(DEPARA_CAR_INT)
    fato["complexidade"] = fato.COMPLEX.map(DEPARA_COMPLEX)
    fato["marca_uti_descricao"] = fato.MARCA_UTI.map(DEPARA_UTI)

    fato["idade_anos_aprox"] = np.select(
        [
            fato.COD_IDADE.eq("2"),
            fato.COD_IDADE.eq("3"),
            fato.COD_IDADE.eq("4"),
            fato.COD_IDADE.eq("5"),
        ],
        [fato.IDADE / 365.25, fato.IDADE / 12, fato.IDADE, 100 + fato.IDADE],
        default=np.nan,
    )
    fato["fl_aih_aprovada"] = np.int8(1)
    fato["fl_internacao_nova"] = fato.IDENT.eq("1").astype("int8")
    fato["fl_continuacao_longa_permanencia"] = fato.IDENT.eq("5").astype("int8")
    fato["dias_perm_internacao_nova"] = fato.DIAS_PERM * fato.fl_internacao_nova
    fato["qt_diarias_internacao_nova"] = fato.QT_DIARIAS * fato.fl_internacao_nova
    fato["valor_internacao_nova"] = fato.VAL_TOT * fato.fl_internacao_nova
    fato["valor_continuacao"] = fato.VAL_TOT * fato.fl_continuacao_longa_permanencia
    fato["fl_sem_diaria_faturada"] = fato.QT_DIARIAS.eq(0).astype("int8")
    fato["fl_permanencia_zero"] = fato.DIAS_PERM.eq(0).astype("int8")
    fato["fl_sem_valor"] = fato.VAL_TOT.eq(0).astype("int8")
    fato["fl_obito"] = fato.MORTE.eq(1).astype("int8")
    fato["fl_obito_internacao_nova"] = (fato.MORTE.eq(1) & fato.IDENT.eq("1")).astype("int8")
    fato["fl_aih_com_valor"] = fato.VAL_TOT.gt(0).astype("int8")
    fato["fl_uti"] = (fato.MARCA_UTI.ne("00") | fato.UTI_MES_TO.gt(0)).astype("int8")
    fato["fl_cruza_mes"] = (
        fato.dt_internacao.notna()
        & fato.dt_saida.notna()
        & fato.dt_internacao.dt.to_period("M").ne(fato.dt_saida.dt.to_period("M"))
    ).astype("int8")
    fato["fl_competencia_diverge_saida"] = (
        fato.dt_saida.notna()
        & ((fato.dt_saida.dt.year != fato._ano) | (fato.dt_saida.dt.month != fato._mes))
    ).astype("int8")

    fato = fato.merge(
        dim_hospital[
            [
                "CNES", "regiao_saude", "regiao_saude_nome",
                "macrorregiao_saude_codigo", "macrorregiao_saude_nome",
                "origem_regiao", "fl_regiao_conflitante", "fl_regiao_nao_confiavel",
            ]
        ],
        on="CNES",
        how="left",
        validate="many_to_one",
    ).merge(
        dim_cid[
            [
                "cid_principal", "cid_descricao", "categoria_descricao",
                "capitulo", "capitulo_desc", "fonte_descricao",
            ]
        ],
        on="cid_principal",
        how="left",
        validate="many_to_one",
    )

    resultado = fato[COLS_FATO]
    logger.info("fato_internacao %s linhas × %d colunas", f"{resultado.shape[0]:,}", resultado.shape[1])
    return resultado


def fato_leito_mensal(
    cnes: pd.DataFrame, dim_tempo: pd.DataFrame, hospitais_sih: set[str]
) -> pd.DataFrame:
    for coluna in ["CNES", "CODLEITO"]:
        cnes[coluna] = cnes[coluna].astype("string").str.strip()
    for coluna in ["QT_SUS", "QT_EXIST"]:
        cnes[coluna] = pd.to_numeric(cnes[coluna], errors="raise").astype("int32")
    cnes["_ano"] = cnes["_ano_arquivo"].astype("int16")
    cnes["_mes"] = cnes["_mes_arquivo"].astype("int8")

    leitos = cnes.groupby(["CNES", "_ano", "_mes"], as_index=False, dropna=False).agg(
        leitos_sus=("QT_SUS", "sum"),
        leitos_totais=("QT_EXIST", "sum"),
        tipos_de_leito=("CODLEITO", "nunique"),
    )
    leitos = leitos[leitos.CNES.isin(hospitais_sih)].copy()
    leitos = leitos.merge(
        dim_tempo[["_ano", "_mes", "dias_no_mes"]],
        on=["_ano", "_mes"],
        how="left",
        validate="many_to_one",
    )
    leitos["capacidade_teorica_leito_dia"] = leitos.leitos_sus * leitos.dias_no_mes
    return leitos

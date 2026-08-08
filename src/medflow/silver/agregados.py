"""Bases agregadas e reconciliação da Silver.

Todo `groupby` usa `dropna=False`. Isso não é detalhe: agrupar descartando
nulo em silêncio some com internações cuja região é desconhecida, e o total
deixa de fechar com a Bronze sem que ninguém perceba. A reconciliação em
`reconciliar` existe justamente para provar que nada se perdeu.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def agregar_base(frame: pd.DataFrame, chaves: list[str]) -> pd.DataFrame:
    return frame.groupby(chaves, as_index=False, dropna=False).agg(
        aih_aprovadas=("fl_aih_aprovada", "sum"),
        aih_distintas=("N_AIH", "nunique"),
        internacoes_novas=("fl_internacao_nova", "sum"),
        continuacoes_longa_permanencia=("fl_continuacao_longa_permanencia", "sum"),
        qt_diarias_soma=("QT_DIARIAS", "sum"),
        qt_diarias_internacoes_novas_soma=("qt_diarias_internacao_nova", "sum"),
        dias_perm_soma=("DIAS_PERM", "sum"),
        dias_perm_internacoes_novas_soma=("dias_perm_internacao_nova", "sum"),
        obitos_aih=("fl_obito", "sum"),
        obitos_internacoes_novas=("fl_obito_internacao_nova", "sum"),
        valor_total=("VAL_TOT", "sum"),
        valor_internacoes_novas=("valor_internacao_nova", "sum"),
        valor_continuacoes=("valor_continuacao", "sum"),
        aih_com_valor=("fl_aih_com_valor", "sum"),
        registros_uti=("fl_uti", "sum"),
    )


def base_hospital_mes(
    fato: pd.DataFrame, leitos: pd.DataFrame, dim_hospital: pd.DataFrame
) -> pd.DataFrame:
    base = agregar_base(fato, ["CNES", "_ano", "_mes"])
    base = base.merge(
        leitos[
            ["CNES", "_ano", "_mes", "leitos_sus", "dias_no_mes", "capacidade_teorica_leito_dia"]
        ],
        on=["CNES", "_ano", "_mes"],
        how="left",
        validate="one_to_one",
    ).merge(
        dim_hospital[
            [
                "CNES", "municipio_cod6", "hospital_nome_atual",
                "regiao_saude", "regiao_saude_nome",
                "macrorregiao_saude_codigo", "macrorregiao_saude_nome",
                "origem_regiao", "fl_regiao_nao_confiavel",
            ]
        ],
        on="CNES",
        how="left",
        validate="many_to_one",
    )
    base["permanencia_media_internacoes_novas"] = np.where(
        base.internacoes_novas > 0,
        base.dias_perm_internacoes_novas_soma / base.internacoes_novas,
        np.nan,
    )
    base["proxy_iph_diarias_faturadas"] = np.where(
        base.capacidade_teorica_leito_dia > 0,
        base.qt_diarias_soma / base.capacidade_teorica_leito_dia,
        np.nan,
    )
    base["status_proxy_iph"] = "experimental_nao_validado_como_ocupacao_real"
    return base


def base_hospital_especialidade_mes(
    fato: pd.DataFrame, dim_hospital: pd.DataFrame
) -> pd.DataFrame:
    base = agregar_base(fato, ["CNES", "ESPEC", "especialidade", "_ano", "_mes"])
    return base.merge(
        dim_hospital[
            [
                "CNES", "municipio_cod6", "hospital_nome_atual",
                "regiao_saude", "regiao_saude_nome", "origem_regiao",
            ]
        ],
        on="CNES",
        how="left",
        validate="many_to_one",
    )


def base_hospital_cid(internacoes_novas: pd.DataFrame) -> pd.DataFrame:
    base = internacoes_novas.groupby(
        ["CNES", "regiao_saude", "origem_regiao", "cid_principal", "capitulo"],
        as_index=False,
        dropna=False,
    ).agg(
        internacoes_novas=("fl_internacao_nova", "sum"),
        dias_perm_soma=("DIAS_PERM", "sum"),
        qt_diarias_soma=("QT_DIARIAS", "sum"),
        obitos=("fl_obito", "sum"),
        valor_total=("VAL_TOT", "sum"),
    )
    base["permanencia_media"] = base.dias_perm_soma / base.internacoes_novas
    return base


def status_indices() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "indice": "TMH", "status": "contrato_aprovado",
                "regra": "óbitos / internações novas; mínimo de 30 para classificação",
            },
            {
                "indice": "IPR", "status": "contrato_aprovado",
                "regra": "permanência hospital/CID / benchmark regional sem o hospital",
            },
            {
                "indice": "IS", "status": "contrato_aprovado",
                "regra": "2026 / média do mesmo mês em 2024 e 2025",
            },
            {
                "indice": "CMI", "status": "contrato_aprovado",
                "regra": "valor aprovado / internações novas; continuações separadas",
            },
            {
                "indice": "IPH", "status": "contrato_aprovado_com_limitacao",
                "regra": (
                    "pacientes-dia estimados / leitos-dia declarados; "
                    "não é ocupação real"
                ),
            },
        ]
    )


def reconciliar(
    *,
    manifesto: dict[str, Any],
    sih: pd.DataFrame,
    cnes: pd.DataFrame,
    fato: pd.DataFrame,
    dim_hospital: pd.DataFrame,
    hospital_mes: pd.DataFrame,
    hospital_espec_mes: pd.DataFrame,
    hospital_cid: pd.DataFrame,
    internacoes_novas: pd.DataFrame,
) -> dict[str, Any]:
    """Compara a Silver com o manifesto da Bronze. Falha alto se algo não fecha."""
    esperado_sih = manifesto["checks"]["linhas_sih"]
    esperado_cnes = manifesto["checks"]["linhas_cnes"]

    metricas = {
        "linhas_sih_reconciliadas": len(fato),
        "linhas_cnes_reconciliadas": len(cnes),
        "aih_aprovadas": int(fato.fl_aih_aprovada.sum()),
        "aih_distintas": int(fato.N_AIH.nunique()),
        "internacoes_novas": int(fato.fl_internacao_nova.sum()),
        "continuacoes_longa_permanencia": int(fato.fl_continuacao_longa_permanencia.sum()),
        "especialidades_sem_depara": int(fato.especialidade.isna().sum()),
        "hospitais_sem_match_cnes": len(set(sih.CNES) - set(dim_hospital.CNES)),
        "cids_sem_capitulo": int(fato.capitulo.eq("--").sum()),
        "cids_sem_descricao": int(fato.cid_descricao.isna().sum()),
        "hospitais_sem_nome_atual": int(dim_hospital.hospital_nome_atual.isna().sum()),
        "hospitais_sem_esfera_atual": int(
            dim_hospital.esfera_administrativa_atual.isna().sum()
        ),
        "hospitais_sem_natureza_juridica": int(
            dim_hospital.natureza_juridica.isna().sum()
        ),
        "registros_sem_regiao": int(fato.regiao_saude.isna().sum()),
        "internacoes_novas_sem_regiao": int(
            (fato.fl_internacao_nova.eq(1) & fato.regiao_saude.isna()).sum()
        ),
        "hospitais_regiao_conflitante": int(dim_hospital.fl_regiao_conflitante.sum()),
        "qt_diarias_igual_dias_perm_pct": round(
            fato.QT_DIARIAS.eq(fato.DIAS_PERM).mean() * 100, 4
        ),
        "qt_zero_dias_perm_positivo": int(
            (fato.QT_DIARIAS.eq(0) & fato.DIAS_PERM.gt(0)).sum()
        ),
        "cruza_mes_pct": round(fato.fl_cruza_mes.mean() * 100, 4),
        "competencia_diverge_saida_pct": round(
            fato.fl_competencia_diverge_saida.mean() * 100, 4
        ),
        "tmh_internacoes_novas_pct": round(
            fato.fl_obito_internacao_nova.sum() / fato.fl_internacao_nova.sum() * 100, 4
        ),
        "proxy_iph_media_hospital_mes": round(
            hospital_mes.proxy_iph_diarias_faturadas.mean(), 6
        ),
    }

    assert len(fato) == esperado_sih
    assert len(cnes) == esperado_cnes
    assert metricas["aih_aprovadas"] == esperado_sih
    assert (
        metricas["internacoes_novas"] + metricas["continuacoes_longa_permanencia"]
        == esperado_sih
    )
    assert metricas["especialidades_sem_depara"] == 0
    assert metricas["cids_sem_capitulo"] == 0
    assert metricas["cids_sem_descricao"] == 0
    assert metricas["hospitais_sem_nome_atual"] == 0
    assert metricas["hospitais_sem_esfera_atual"] == 0
    assert metricas["hospitais_sem_natureza_juridica"] == 0
    assert metricas["registros_sem_regiao"] == 0
    assert set(fato.CNES) <= set(dim_hospital.CNES)
    assert hospital_mes.aih_aprovadas.sum() == esperado_sih
    assert hospital_espec_mes.aih_aprovadas.sum() == esperado_sih
    assert (
        hospital_mes.dias_perm_internacoes_novas_soma.sum()
        == internacoes_novas.DIAS_PERM.sum()
    )
    assert (
        hospital_espec_mes.dias_perm_internacoes_novas_soma.sum()
        == internacoes_novas.DIAS_PERM.sum()
    )
    assert np.isclose(
        hospital_mes.valor_total.sum(),
        hospital_mes.valor_internacoes_novas.sum()
        + hospital_mes.valor_continuacoes.sum(),
    )
    assert hospital_cid.internacoes_novas.sum() == metricas["internacoes_novas"]
    assert (
        hospital_cid.loc[hospital_cid.regiao_saude.isna(), "internacoes_novas"].sum()
        == internacoes_novas.regiao_saude.isna().sum()
    ), "groupby perdeu internações com região nula"

    return metricas

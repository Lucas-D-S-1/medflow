"""Cálculo reprodutível dos indicadores hospitalares e territoriais do MedFlow."""

from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from pipeline.contratos import (
    VERSAO_CONTRATO,
    _contrato_tabela,
    _gravar_json,
    _renderizar_dicionario,
)
from pipeline.icsap import VERSAO_LISTA_ICSAP, classificar_icsap, dimensao_grupo_icsap
from pipeline.ipca import carregar_ipca


COLUNAS_FATO = [
    "id_aih",
    "cd_cnes",
    "cd_municipio_ibge_6",
    "cd_municipio_residencia_ibge_6",
    "cd_regiao_saude",
    "nm_regiao_saude",
    "cd_macrorregiao_saude",
    "nm_macrorregiao_saude",
    "nr_ano_competencia",
    "nr_mes_competencia",
    "cd_competencia",
    "dt_internacao",
    "dt_saida",
    "cd_especialidade_sih",
    "nm_especialidade",
    "cd_cid_principal",
    "ds_cid",
    "cd_capitulo_cid",
    "ds_capitulo_cid",
    "qt_dia_permanencia",
    "vl_total_aprovado_sus",
    "fl_internacao_nova",
    "fl_continuacao_longa_permanencia",
    "fl_obito_internacao_nova",
    "vl_aprovado_continuacao",
]


def _dividir(numerador: pd.Series, denominador: pd.Series) -> pd.Series:
    return pd.Series(
        np.divide(
            numerador,
            denominador,
            out=np.full(len(numerador), np.nan, dtype="float64"),
            where=denominador.to_numpy() != 0,
        ),
        index=numerador.index,
    )


def _aplicar_ipca(mart: pd.DataFrame, ipca: pd.DataFrame) -> pd.DataFrame:
    """Acrescenta valores reais sem substituir os valores nominais auditáveis."""
    mart = mart.merge(ipca, on="cd_competencia", how="left", validate="many_to_one")
    assert mart.nr_fator_correcao_ipca.notna().all()
    mart["vl_aprovado_internacao_nova_real_soma"] = (
        mart.vl_aprovado_internacao_nova_soma * mart.nr_fator_correcao_ipca
    )
    mart["vl_cmi_real"] = _dividir(
        mart.vl_aprovado_internacao_nova_real_soma,
        mart.qt_internacao_nova,
    )
    return mart


def _hash_arquivo(caminho: Path, bloco: int = 1024 * 1024) -> str:
    digest = sha256()
    with caminho.open("rb") as arquivo:
        for parte in iter(lambda: arquivo.read(bloco), b""):
            digest.update(parte)
    return digest.hexdigest()


def _calcular_paciente_dia(novas: pd.DataFrame) -> pd.DataFrame:
    datas = novas[["cd_cnes", "dt_internacao", "dt_saida"]].copy()
    assert datas[["dt_internacao", "dt_saida"]].notna().all().all()
    assert datas.dt_saida.ge(datas.dt_internacao).all()
    periodo_inicio = datas.dt_internacao.dt.to_period("M")
    periodo_fim = datas.dt_saida.dt.to_period("M")
    mesmo_mes = periodo_inicio.eq(periodo_fim)

    simples = datas.loc[mesmo_mes, ["cd_cnes", "dt_internacao", "dt_saida"]].copy()
    simples["cd_competencia"] = (
        simples.dt_internacao.dt.year.astype("string")
        + simples.dt_internacao.dt.month.astype("string").str.zfill(2)
    )
    simples["qt_paciente_dia_estimado"] = (
        (simples.dt_saida - simples.dt_internacao).dt.days.clip(lower=1)
    )
    partes = [
        simples.groupby(["cd_cnes", "cd_competencia"], as_index=False)[
            "qt_paciente_dia_estimado"
        ].sum()
    ]

    cruzam = datas.loc[~mesmo_mes].copy()
    cruzam["nr_mes_intervalo"] = (
        (cruzam.dt_saida.dt.year - cruzam.dt_internacao.dt.year) * 12
        + cruzam.dt_saida.dt.month
        - cruzam.dt_internacao.dt.month
    )
    maximo = int(cruzam.nr_mes_intervalo.max()) if len(cruzam) else -1
    periodo_cruza = cruzam.dt_internacao.dt.to_period("M")
    for deslocamento in range(maximo + 1):
        mascara = cruzam.nr_mes_intervalo.ge(deslocamento)
        trecho = cruzam.loc[mascara, ["cd_cnes", "dt_internacao", "dt_saida"]].copy()
        periodo = periodo_cruza.loc[mascara] + deslocamento
        inicio_mes = periodo.dt.to_timestamp()
        fim_mes = (periodo + 1).dt.to_timestamp()
        inicio = pd.concat([trecho.dt_internacao, inicio_mes], axis=1).max(axis=1)
        fim = pd.concat([trecho.dt_saida, fim_mes], axis=1).min(axis=1)
        trecho["qt_paciente_dia_estimado"] = (fim - inicio).dt.days
        trecho = trecho[trecho.qt_paciente_dia_estimado.gt(0)]
        trecho["cd_competencia"] = periodo.loc[trecho.index].astype("string").str.replace(
            "-", "", regex=False
        )
        partes.append(
            trecho.groupby(["cd_cnes", "cd_competencia"], as_index=False)[
                "qt_paciente_dia_estimado"
            ].sum()
        )
    resultado = (
        pd.concat(partes, ignore_index=True)
        .groupby(["cd_cnes", "cd_competencia"], as_index=False)[
            "qt_paciente_dia_estimado"
        ]
        .sum()
    )
    assert resultado.qt_paciente_dia_estimado.gt(0).all()
    return resultado


def _hospital_especialidade_mensal(
    fato: pd.DataFrame,
    novas: pd.DataFrame,
    ipca: pd.DataFrame,
) -> pd.DataFrame:
    chaves = [
        "cd_cnes",
        "cd_especialidade_sih",
        "nm_especialidade",
        "cd_regiao_saude",
        "nm_regiao_saude",
        "cd_macrorregiao_saude",
        "nm_macrorregiao_saude",
        "nr_ano_competencia",
        "nr_mes_competencia",
        "cd_competencia",
    ]
    mart = (
        novas.groupby(chaves, as_index=False, dropna=False)
        .agg(
            qt_internacao_nova=("fl_internacao_nova", "sum"),
            qt_obito=("fl_obito_internacao_nova", "sum"),
            qt_dia_permanencia_soma=("qt_dia_permanencia", "sum"),
            vl_aprovado_internacao_nova_soma=("vl_total_aprovado_sus", "sum"),
        )
    )
    continuacoes = (
        fato.groupby(chaves, as_index=False, dropna=False)
        .agg(vl_aprovado_continuacao_soma=("vl_aprovado_continuacao", "sum"))
    )
    mart = mart.merge(continuacoes, on=chaves, how="left", validate="one_to_one")
    mart["pc_tmh"] = (
        _dividir(mart.qt_obito, mart.qt_internacao_nova) * 100
    )
    mart["vl_cmi"] = _dividir(
        mart.vl_aprovado_internacao_nova_soma,
        mart.qt_internacao_nova,
    )
    mart["nr_permanencia_media"] = _dividir(
        mart.qt_dia_permanencia_soma,
        mart.qt_internacao_nova,
    )
    mart["st_amostra"] = np.where(
        mart.qt_internacao_nova.ge(30),
        "suficiente",
        "amostra_insuficiente",
    )
    return _aplicar_ipca(mart, ipca)


def _hospital_cid_periodo(novas: pd.DataFrame) -> pd.DataFrame:
    chaves = [
        "cd_cnes",
        "cd_regiao_saude",
        "nm_regiao_saude",
        "cd_macrorregiao_saude",
        "nm_macrorregiao_saude",
        "cd_cid_principal",
        "ds_cid",
        "cd_capitulo_cid",
        "ds_capitulo_cid",
    ]
    hospital = (
        novas.groupby(chaves, as_index=False, dropna=False)
        .agg(
            qt_internacao_nova=("fl_internacao_nova", "sum"),
            qt_dia_permanencia_soma=("qt_dia_permanencia", "sum"),
        )
    )
    regiao = (
        hospital.groupby(
            [
                "cd_regiao_saude",
                "cd_cid_principal",
            ],
            as_index=False,
            dropna=False,
        )
        .agg(
            qt_internacao_regiao=("qt_internacao_nova", "sum"),
            qt_dia_permanencia_regiao=("qt_dia_permanencia_soma", "sum"),
            qt_hospital_regiao=("cd_cnes", "nunique"),
        )
    )
    mart = hospital.merge(
        regiao,
        on=["cd_regiao_saude", "cd_cid_principal"],
        how="left",
        validate="many_to_one",
    )
    mart["qt_internacao_benchmark"] = (
        mart.qt_internacao_regiao - mart.qt_internacao_nova
    )
    mart["qt_dia_permanencia_benchmark"] = (
        mart.qt_dia_permanencia_regiao - mart.qt_dia_permanencia_soma
    )
    mart["qt_hospital_benchmark"] = mart.qt_hospital_regiao - 1
    mart["nr_permanencia_media_hospital"] = _dividir(
        mart.qt_dia_permanencia_soma,
        mart.qt_internacao_nova,
    )
    mart["nr_permanencia_media_benchmark"] = _dividir(
        mart.qt_dia_permanencia_benchmark,
        mart.qt_internacao_benchmark,
    )
    mart["nr_ipr"] = _dividir(
        mart.nr_permanencia_media_hospital,
        mart.nr_permanencia_media_benchmark,
    )
    elegivel = (
        mart.qt_internacao_nova.ge(20)
        & mart.qt_internacao_benchmark.ge(50)
        & mart.qt_hospital_benchmark.ge(3)
        & mart.nr_permanencia_media_benchmark.gt(0)
    )
    mart["st_amostra"] = np.select(
        [
            elegivel,
            mart.nr_permanencia_media_benchmark.eq(0),
        ],
        [
            "suficiente",
            "benchmark_zero",
        ],
        default="amostra_insuficiente",
    )
    mart.loc[~elegivel, "nr_ipr"] = np.nan
    return mart.drop(
        columns=[
            "qt_internacao_regiao",
            "qt_dia_permanencia_regiao",
            "qt_hospital_regiao",
        ]
    )


def _hospital_mensal(
    novas: pd.DataFrame,
    leitos: pd.DataFrame,
    hospitais: pd.DataFrame,
    ipca: pd.DataFrame,
) -> pd.DataFrame:
    paciente_dia = _calcular_paciente_dia(novas)
    chaves = ["cd_cnes", "nr_ano_competencia", "nr_mes_competencia", "cd_competencia"]
    volume = (
        novas.groupby(chaves, as_index=False)
        .agg(
            qt_internacao_nova=("fl_internacao_nova", "sum"),
            qt_obito=("fl_obito_internacao_nova", "sum"),
            qt_dia_permanencia_soma=("qt_dia_permanencia", "sum"),
            vl_aprovado_internacao_nova_soma=("vl_total_aprovado_sus", "sum"),
        )
    )
    # O IPH usa mês civil, não a competência de processamento da AIH.
    # A capacidade CNES é a espinha mensal; volume faturado fica separado.
    mart = (
        leitos.merge(
            paciente_dia,
            on=["cd_cnes", "cd_competencia"],
            how="left",
            validate="one_to_one",
        )
        .merge(volume, on=chaves, how="left", validate="one_to_one")
        .merge(
            hospitais[
                [
                    "cd_cnes",
                    "nm_hospital_atual",
                    "cd_municipio_ibge_6",
                    "cd_regiao_saude",
                    "nm_regiao_saude",
                    "cd_macrorregiao_saude",
                    "nm_macrorregiao_saude",
                    "cd_tipo_unidade",
                    "nm_tipo_unidade",
                ]
            ],
            on="cd_cnes",
            how="left",
            validate="many_to_one",
        )
    )
    assert mart.qt_capacidade_teorica_leito_dia.notna().all()
    colunas_zeradas = [
        "qt_paciente_dia_estimado",
        "qt_internacao_nova",
        "qt_obito",
        "qt_dia_permanencia_soma",
        "vl_aprovado_internacao_nova_soma",
    ]
    mart[colunas_zeradas] = mart[colunas_zeradas].fillna(0)
    for coluna in colunas_zeradas[:-1]:
        mart[coluna] = mart[coluna].astype("int64")
    mart["nr_iph_estimado"] = _dividir(
        mart.qt_paciente_dia_estimado,
        mart.qt_capacidade_teorica_leito_dia,
    )
    mart["pc_iph_estimado"] = mart.nr_iph_estimado * 100
    mart["st_capacidade"] = np.where(
        mart.qt_capacidade_teorica_leito_dia.gt(0),
        "disponivel",
        "sem_leito_sus_declarado",
    )
    mart["fl_acima_capacidade_declarada"] = mart.nr_iph_estimado.gt(1).astype("int8")
    mart["pc_tmh"] = _dividir(mart.qt_obito, mart.qt_internacao_nova) * 100
    mart["vl_cmi"] = _dividir(
        mart.vl_aprovado_internacao_nova_soma,
        mart.qt_internacao_nova,
    )
    mart["nr_permanencia_media"] = _dividir(
        mart.qt_dia_permanencia_soma,
        mart.qt_internacao_nova,
    )
    mart["st_amostra"] = np.where(
        mart.qt_internacao_nova.ge(30),
        "suficiente",
        "amostra_insuficiente",
    )
    return _aplicar_ipca(mart, ipca)


def _atribuir_regiao_residencia(
    novas: pd.DataFrame,
    municipios: pd.DataFrame,
) -> pd.DataFrame:
    """Liga residência à região de saúde; fora de SP permanece sem região."""
    mapa = municipios.set_index("cd_municipio_ibge_6")["cd_regiao_saude"]
    novas = novas.copy()
    novas["cd_regiao_saude_residencia"] = novas.cd_municipio_residencia_ibge_6.map(mapa)
    residente_sp = novas.cd_municipio_residencia_ibge_6.astype("string").str.startswith("35")
    assert novas.loc[residente_sp, "cd_regiao_saude_residencia"].notna().all()
    assert novas.loc[~residente_sp, "cd_regiao_saude_residencia"].isna().all()
    return novas


def _residencia_e_icsap_mensal(
    novas: pd.DataFrame,
    municipios: pd.DataFrame,
    populacao_regiao: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Calcula necessidade territorial observada e o detalhamento dos 19 grupos ICSAP."""
    residentes = novas[novas.cd_regiao_saude_residencia.notna()].copy()
    residentes["fl_atendido_propria_regiao"] = residentes.cd_regiao_saude_residencia.eq(
        residentes.cd_regiao_saude
    ).astype("int8")
    residentes["fl_evasao_intrastadual_observada"] = (
        1 - residentes.fl_atendido_propria_regiao
    ).astype("int8")
    residentes["cd_grupo_icsap"] = classificar_icsap(residentes.cd_cid_principal)
    residentes["fl_icsap"] = residentes.cd_grupo_icsap.notna().astype("int8")

    chaves_residencia = [
        "cd_regiao_saude_residencia",
        "nr_ano_competencia",
        "nr_mes_competencia",
        "cd_competencia",
    ]
    resumo = (
        residentes.groupby(chaves_residencia, as_index=False)
        .agg(
            qt_internacao_residente_observada=("fl_internacao_nova", "sum"),
            qt_internacao_residente_na_propria_regiao=("fl_atendido_propria_regiao", "sum"),
            qt_evasao_intrastadual_observada=("fl_evasao_intrastadual_observada", "sum"),
            qt_internacao_icsap_residente_observada=("fl_icsap", "sum"),
        )
        .rename(columns={"cd_regiao_saude_residencia": "cd_regiao_saude"})
    )

    regioes = (
        municipios[
            [
                "cd_regiao_saude",
                "nm_regiao_saude",
                "cd_macrorregiao_saude",
                "nm_macrorregiao_saude",
            ]
        ]
        .drop_duplicates()
        .merge(populacao_regiao, on="cd_regiao_saude", validate="one_to_one")
    )
    competencias = novas[
        ["nr_ano_competencia", "nr_mes_competencia", "cd_competencia"]
    ].drop_duplicates()
    grupos = dimensao_grupo_icsap()
    grade = (
        regioes.merge(competencias, how="cross")
        .merge(grupos, how="cross")
    )
    contagem = (
        residentes[residentes.cd_grupo_icsap.notna()]
        .groupby(chaves_residencia + ["cd_grupo_icsap"], as_index=False)
        .agg(qt_internacao_icsap=("fl_icsap", "sum"))
        .rename(columns={"cd_regiao_saude_residencia": "cd_regiao_saude"})
    )
    icsap = grade.merge(
        contagem,
        on=[
            "cd_regiao_saude",
            "nr_ano_competencia",
            "nr_mes_competencia",
            "cd_competencia",
            "cd_grupo_icsap",
        ],
        how="left",
        validate="one_to_one",
    )
    icsap["qt_internacao_icsap"] = icsap.qt_internacao_icsap.fillna(0).astype("int64")
    totais = resumo[
        [
            "cd_regiao_saude",
            "cd_competencia",
            "qt_internacao_icsap_residente_observada",
        ]
    ].rename(
        columns={
            "qt_internacao_icsap_residente_observada": "qt_internacao_icsap_total_regiao"
        }
    )
    icsap = icsap.merge(
        totais,
        on=["cd_regiao_saude", "cd_competencia"],
        how="left",
        validate="many_to_one",
    )
    icsap["qt_internacao_icsap_total_regiao"] = (
        icsap.qt_internacao_icsap_total_regiao.fillna(0).astype("int64")
    )
    icsap["pc_grupo_no_total_icsap"] = (
        _dividir(icsap.qt_internacao_icsap, icsap.qt_internacao_icsap_total_regiao) * 100
    )
    icsap["tx_icsap_grupo_por_10_mil_habitantes"] = (
        _dividir(icsap.qt_internacao_icsap, icsap.qt_populacao_ibge_2022) * 10_000
    )
    return resumo, icsap


def _atracao_mensal(novas: pd.DataFrame) -> pd.DataFrame:
    """Resume entradas assistenciais na região de atendimento."""
    quadro = novas.copy()
    quadro["fl_recebida_outra_regiao_sp"] = (
        quadro.cd_regiao_saude_residencia.notna()
        & quadro.cd_regiao_saude_residencia.ne(quadro.cd_regiao_saude)
    ).astype("int8")
    quadro["fl_recebida_fora_sp"] = quadro.cd_regiao_saude_residencia.isna().astype("int8")
    return (
        quadro.groupby(["cd_regiao_saude", "cd_competencia"], as_index=False)
        .agg(
            qt_internacao_recebida_outra_regiao_sp=("fl_recebida_outra_regiao_sp", "sum"),
            qt_internacao_recebida_fora_sp=("fl_recebida_fora_sp", "sum"),
        )
    )


def _fluxo_assistencial_mensal(
    novas: pd.DataFrame,
    municipios: pd.DataFrame,
) -> pd.DataFrame:
    """Materializa pares origem de residência × região de atendimento."""
    regioes = municipios[
        [
            "cd_regiao_saude",
            "nm_regiao_saude",
            "cd_macrorregiao_saude",
            "nm_macrorregiao_saude",
        ]
    ].drop_duplicates()
    mapa_nome = regioes.set_index("cd_regiao_saude").nm_regiao_saude
    mapa_macro_codigo = regioes.set_index("cd_regiao_saude").cd_macrorregiao_saude
    mapa_macro_nome = regioes.set_index("cd_regiao_saude").nm_macrorregiao_saude

    quadro = novas[
        [
            "cd_regiao_saude_residencia",
            "cd_regiao_saude",
            "nr_ano_competencia",
            "nr_mes_competencia",
            "cd_competencia",
            "fl_internacao_nova",
        ]
    ].copy()
    quadro["cd_origem_residencia"] = quadro.cd_regiao_saude_residencia.fillna("FORA_SP")
    quadro["st_fluxo_assistencial"] = "interregional_sp"
    quadro.loc[
        quadro.cd_regiao_saude_residencia.eq(quadro.cd_regiao_saude).fillna(False),
        "st_fluxo_assistencial",
    ] = "intrarregional"
    quadro.loc[
        quadro.cd_regiao_saude_residencia.isna(),
        "st_fluxo_assistencial",
    ] = "entrada_outro_estado"
    fluxo = (
        quadro.groupby(
            [
                "cd_origem_residencia",
                "cd_regiao_saude",
                "nr_ano_competencia",
                "nr_mes_competencia",
                "cd_competencia",
                "st_fluxo_assistencial",
            ],
            as_index=False,
        )
        .agg(qt_internacao_nova=("fl_internacao_nova", "sum"))
        .rename(columns={"cd_regiao_saude": "cd_regiao_saude_atendimento"})
    )
    fluxo["nm_origem_residencia"] = fluxo.cd_origem_residencia.map(mapa_nome).fillna(
        "Fora do estado de São Paulo"
    )
    fluxo["cd_macrorregiao_origem"] = fluxo.cd_origem_residencia.map(mapa_macro_codigo)
    fluxo["nm_macrorregiao_origem"] = fluxo.cd_origem_residencia.map(mapa_macro_nome)
    fluxo = fluxo.merge(
        regioes.rename(
            columns={
                "cd_regiao_saude": "cd_regiao_saude_atendimento",
                "nm_regiao_saude": "nm_regiao_saude_atendimento",
                "cd_macrorregiao_saude": "cd_macrorregiao_atendimento",
                "nm_macrorregiao_saude": "nm_macrorregiao_atendimento",
            }
        ),
        on="cd_regiao_saude_atendimento",
        how="left",
        validate="many_to_one",
    )
    total_atendimento = fluxo.groupby(
        ["cd_regiao_saude_atendimento", "cd_competencia"]
    ).qt_internacao_nova.transform("sum")
    total_origem = fluxo.groupby(
        ["cd_origem_residencia", "cd_competencia"]
    ).qt_internacao_nova.transform("sum")
    fluxo["pc_origem_no_atendimento"] = _dividir(
        fluxo.qt_internacao_nova, total_atendimento
    ) * 100
    fluxo["pc_destino_na_origem_observada"] = _dividir(
        fluxo.qt_internacao_nova, total_origem
    ) * 100
    return fluxo


def _regiao_mensal(
    novas: pd.DataFrame,
    hospital_mensal: pd.DataFrame,
    populacao_regiao: pd.DataFrame,
    residencia_mensal: pd.DataFrame,
    atracao_mensal: pd.DataFrame,
    ipca: pd.DataFrame,
) -> pd.DataFrame:
    chaves_regiao = [
        "cd_regiao_saude",
        "nm_regiao_saude",
        "cd_macrorregiao_saude",
        "nm_macrorregiao_saude",
        "nr_ano_competencia",
        "nr_mes_competencia",
        "cd_competencia",
    ]
    volume = (
        novas.groupby(chaves_regiao, as_index=False, dropna=False)
        .agg(
            qt_internacao_nova=("fl_internacao_nova", "sum"),
            qt_obito=("fl_obito_internacao_nova", "sum"),
            qt_dia_permanencia_soma=("qt_dia_permanencia", "sum"),
            vl_aprovado_internacao_nova_soma=("vl_total_aprovado_sus", "sum"),
            qt_hospital_com_internacao=("cd_cnes", "nunique"),
        )
    )
    capacidade = (
        hospital_mensal.groupby(chaves_regiao, as_index=False, dropna=False)
        .agg(
            qt_paciente_dia_estimado=("qt_paciente_dia_estimado", "sum"),
            qt_leito_sus=("qt_leito_sus", "sum"),
            qt_capacidade_teorica_leito_dia=("qt_capacidade_teorica_leito_dia", "sum"),
        )
    )
    mart = volume.merge(capacidade, on=chaves_regiao, how="left", validate="one_to_one")
    mart = mart.merge(
        populacao_regiao,
        on="cd_regiao_saude",
        how="left",
        validate="many_to_one",
    )
    mart = mart.merge(
        residencia_mensal,
        on=[
            "cd_regiao_saude",
            "nr_ano_competencia",
            "nr_mes_competencia",
            "cd_competencia",
        ],
        how="left",
        validate="one_to_one",
    ).merge(
        atracao_mensal,
        on=["cd_regiao_saude", "cd_competencia"],
        how="left",
        validate="one_to_one",
    )
    assert mart.qt_populacao_ibge_2022.notna().all()
    colunas_fluxo = [
        "qt_internacao_residente_observada",
        "qt_internacao_residente_na_propria_regiao",
        "qt_evasao_intrastadual_observada",
        "qt_internacao_icsap_residente_observada",
        "qt_internacao_recebida_outra_regiao_sp",
        "qt_internacao_recebida_fora_sp",
    ]
    mart[colunas_fluxo] = mart[colunas_fluxo].fillna(0).astype("int64")
    mart["tx_internacao_residente_observada_por_100_mil"] = (
        _dividir(
            mart.qt_internacao_residente_observada,
            mart.qt_populacao_ibge_2022,
        )
        * 100_000
    )
    mart["pc_evasao_intrastadual_observada"] = (
        _dividir(
            mart.qt_evasao_intrastadual_observada,
            mart.qt_internacao_residente_observada,
        )
        * 100
    )
    mart["pc_atracao_assistencial"] = (
        _dividir(
            mart.qt_internacao_recebida_outra_regiao_sp
            + mart.qt_internacao_recebida_fora_sp,
            mart.qt_internacao_nova,
        )
        * 100
    )
    mart["pc_icsap_no_total_internacao_residente_observada"] = (
        _dividir(
            mart.qt_internacao_icsap_residente_observada,
            mart.qt_internacao_residente_observada,
        )
        * 100
    )
    mart["tx_icsap_residente_observada_por_10_mil"] = (
        _dividir(
            mart.qt_internacao_icsap_residente_observada,
            mart.qt_populacao_ibge_2022,
        )
        * 10_000
    )
    mart["pc_tmh"] = _dividir(mart.qt_obito, mart.qt_internacao_nova) * 100
    mart["vl_cmi"] = _dividir(
        mart.vl_aprovado_internacao_nova_soma,
        mart.qt_internacao_nova,
    )
    mart["nr_permanencia_media"] = _dividir(
        mart.qt_dia_permanencia_soma,
        mart.qt_internacao_nova,
    )
    mart["nr_iph_estimado"] = _dividir(
        mart.qt_paciente_dia_estimado,
        mart.qt_capacidade_teorica_leito_dia,
    )
    mart["pc_iph_estimado"] = mart.nr_iph_estimado * 100
    historico = (
        mart[mart.nr_ano_competencia.isin([2024, 2025])]
        .groupby(
            ["cd_regiao_saude", "nr_mes_competencia"],
            as_index=False,
        )
        .agg(
            qt_internacao_media_historica=("qt_internacao_nova", "mean"),
            qt_ano_historico=("nr_ano_competencia", "nunique"),
        )
    )
    mart = mart.merge(
        historico,
        on=["cd_regiao_saude", "nr_mes_competencia"],
        how="left",
        validate="many_to_one",
    )
    calculavel = mart.nr_ano_competencia.eq(2026) & mart.qt_ano_historico.eq(2)
    mart["nr_indice_sazonalidade"] = np.nan
    mart.loc[calculavel, "nr_indice_sazonalidade"] = _dividir(
        mart.loc[calculavel, "qt_internacao_nova"],
        mart.loc[calculavel, "qt_internacao_media_historica"],
    )
    mart["pc_variacao_sazonal"] = (mart.nr_indice_sazonalidade - 1) * 100
    mart["st_indice_sazonalidade"] = np.select(
        [
            calculavel,
            mart.nr_ano_competencia.ne(2026),
        ],
        [
            "calculado",
            "fora_periodo_alvo",
        ],
        default="historico_insuficiente",
    )
    return _aplicar_ipca(mart, ipca)


def _regiao_periodo(ipr: pd.DataFrame) -> pd.DataFrame:
    elegiveis = ipr[ipr.st_amostra.eq("suficiente")].copy()
    resultado = (
        ipr.groupby(
            [
                "cd_regiao_saude",
                "nm_regiao_saude",
                "cd_macrorregiao_saude",
                "nm_macrorregiao_saude",
            ],
            as_index=False,
            dropna=False,
        )
        .agg(
            qt_combinacao_hospital_cid=("cd_cid_principal", "size"),
            qt_internacao_nova=("qt_internacao_nova", "sum"),
        )
    )
    resumo = (
        elegiveis.groupby(
            [
                "cd_regiao_saude",
                "nm_regiao_saude",
                "cd_macrorregiao_saude",
                "nm_macrorregiao_saude",
            ],
            as_index=False,
            dropna=False,
        )
        .agg(
            qt_combinacao_ipr_elegivel=("nr_ipr", "size"),
            nr_ipr_mediana=("nr_ipr", "median"),
            nr_ipr_media=("nr_ipr", "mean"),
            qt_combinacao_ipr_acima_referencia=("nr_ipr", lambda s: int(s.gt(1).sum())),
        )
    )
    resultado = resultado.merge(
        resumo,
        on=[
            "cd_regiao_saude",
            "nm_regiao_saude",
            "cd_macrorregiao_saude",
            "nm_macrorregiao_saude",
        ],
        how="left",
        validate="one_to_one",
    )
    resultado["pc_combinacao_ipr_acima_referencia"] = (
        _dividir(
            resultado.qt_combinacao_ipr_acima_referencia,
            resultado.qt_combinacao_ipr_elegivel,
        )
        * 100
    )
    return resultado


def calcular_gold(*, base: Path, sobrescrever: bool = False) -> dict[str, pd.DataFrame]:
    dir_silver = base / "dados" / "silver"
    dir_gold = base / "dados" / "gold"
    dir_marts = dir_gold / "marts"
    dir_qualidade = dir_gold / "qualidade"
    dir_contratos = base / "contratos"
    for pasta in (dir_marts, dir_qualidade, dir_contratos):
        pasta.mkdir(parents=True, exist_ok=True)

    fato = pd.read_parquet(
        dir_silver / "fatos" / "fato_internacao.parquet",
        columns=COLUNAS_FATO,
    )
    leitos = pd.read_parquet(dir_silver / "fatos" / "fato_leito_mensal.parquet")
    hospitais = pd.read_parquet(dir_silver / "dimensoes" / "dim_hospital.parquet")
    municipios = pd.read_parquet(dir_silver / "dimensoes" / "dim_municipio.parquet")
    populacao_regiao = (
        municipios.groupby("cd_regiao_saude", as_index=False)
        .agg(qt_populacao_ibge_2022=("qt_populacao_ibge_2022", "sum"))
    )
    novas = fato[fato.fl_internacao_nova.eq(1)].copy()
    novas = _atribuir_regiao_residencia(novas, municipios)
    ipca = carregar_ipca(
        base
        / "dados"
        / "bronze"
        / "origem"
        / "referencias"
        / "ibge_ipca_numero_indice_raw.json",
        novas.cd_competencia,
    )

    residencia_mensal, icsap_mensal = _residencia_e_icsap_mensal(
        novas,
        municipios,
        populacao_regiao,
    )
    atracao_mensal = _atracao_mensal(novas)
    fluxo_mensal = _fluxo_assistencial_mensal(novas, municipios)
    hospital_especialidade = _hospital_especialidade_mensal(fato, novas, ipca)
    hospital_cid = _hospital_cid_periodo(novas)
    hospital_mensal = _hospital_mensal(novas, leitos, hospitais, ipca)
    regiao_mensal = _regiao_mensal(
        novas,
        hospital_mensal,
        populacao_regiao,
        residencia_mensal,
        atracao_mensal,
        ipca,
    )
    regiao_periodo = _regiao_periodo(hospital_cid)

    marts = {
        "mart_indicador_hospital_mensal": hospital_mensal,
        "mart_indicador_hospital_especialidade_mensal": hospital_especialidade,
        "mart_indicador_hospital_cid_periodo": hospital_cid,
        "mart_indicador_regiao_mensal": regiao_mensal,
        "mart_indicador_regiao_periodo": regiao_periodo,
        "mart_fluxo_assistencial_regiao_mensal": fluxo_mensal,
        "mart_icsap_regiao_mensal": icsap_mensal,
    }
    total_novas = int(novas.fl_internacao_nova.sum())
    assert int(hospital_mensal.qt_internacao_nova.sum()) == total_novas
    assert int(hospital_especialidade.qt_internacao_nova.sum()) == total_novas
    assert int(regiao_mensal.qt_internacao_nova.sum()) == total_novas
    assert int(fluxo_mensal.qt_internacao_nova.sum()) == total_novas
    total_residentes_sp = int(novas.cd_regiao_saude_residencia.notna().sum())
    assert int(regiao_mensal.qt_internacao_residente_observada.sum()) == total_residentes_sp
    assert int(
        regiao_mensal.qt_internacao_residente_na_propria_regiao.sum()
        + regiao_mensal.qt_evasao_intrastadual_observada.sum()
    ) == total_residentes_sp
    assert int(icsap_mensal.qt_internacao_icsap.sum()) == int(
        regiao_mensal.qt_internacao_icsap_residente_observada.sum()
    )
    assert hospital_mensal.cd_regiao_saude.notna().all()
    assert hospital_mensal.qt_capacidade_teorica_leito_dia.notna().all()
    assert hospital_mensal.loc[
        hospital_mensal.qt_capacidade_teorica_leito_dia.eq(0),
        "nr_iph_estimado",
    ].isna().all()
    assert not regiao_mensal.loc[
        regiao_mensal.st_indice_sazonalidade.eq("calculado"),
        "nr_indice_sazonalidade",
    ].isna().any()
    assert hospital_cid.loc[
        hospital_cid.st_amostra.eq("suficiente"), "nr_ipr"
    ].notna().all()

    for nome, frame in marts.items():
        caminho = dir_marts / f"{nome}.parquet"
        parcial = caminho.with_suffix(".parquet.parcial")
        if sobrescrever or not caminho.exists():
            if parcial.exists():
                parcial.unlink()
            frame.to_parquet(parcial, index=False)
            parcial.replace(caminho)
        else:
            existente = pd.read_parquet(caminho)
            if (
                list(existente.columns) != list(frame.columns)
                or len(existente) != len(frame)
                or not existente.equals(frame)
            ):
                frame.to_parquet(parcial, index=False)
                parcial.replace(caminho)
        print(f"{nome:<50} {len(frame):>10,} linhas")

    contrato = {
        "camada": "gold",
        "versao_contrato": VERSAO_CONTRATO,
        "gerado_em_utc": datetime.now(timezone.utc).isoformat(),
        "principios": [
            "Marts orientados às perguntas de gestão e ao consumo no BI.",
            "Toda métrica expõe amostra, numerador, denominador ou estado de calculabilidade.",
            "IPH é pressão estimada contra capacidade declarada, não ocupação real.",
            "Valores financeiros nominais são preservados e os valores reais usam IPCA/IBGE com competência de referência explícita.",
            "Indicadores populacionais usam residência; indicadores de oferta usam a região do hospital.",
            "Fluxos para fora de SP não são observáveis no recorte SIH/RD-SP e nunca são tratados como evasão total.",
            f"ICSAP classificada pela {VERSAO_LISTA_ICSAP}; a participação publicada usa o total observado, não o denominador clínico oficial.",
        ],
        "tabelas": [
            _contrato_tabela(
                nome,
                frame,
                "gold",
                str((dir_marts / f"{nome}.parquet").relative_to(base)),
            )
            for nome, frame in marts.items()
        ],
    }
    _gravar_json(dir_contratos / "gold.json", contrato)
    (dir_gold / "DICIONARIO.md").write_text(
        _renderizar_dicionario(contrato), encoding="utf-8"
    )

    metricas: dict[str, Any] = {
        "internacoes_novas_reconciliadas": total_novas,
        "pacientes_dia_estimados": int(hospital_mensal.qt_paciente_dia_estimado.sum()),
        "regioes_saude": int(regiao_mensal.cd_regiao_saude.nunique()),
        "competencias": int(regiao_mensal.cd_competencia.nunique()),
        "internacoes_residentes_sp_observadas": total_residentes_sp,
        "internacoes_residentes_fora_sp_atendidas": int(
            novas.cd_regiao_saude_residencia.isna().sum()
        ),
        "internacoes_icsap_residentes_sp_observadas": int(
            regiao_mensal.qt_internacao_icsap_residente_observada.sum()
        ),
        "fluxos_origem_destino_mensais": int(len(fluxo_mensal)),
        "linhas_is_calculadas": int(
            regiao_mensal.st_indice_sazonalidade.eq("calculado").sum()
        ),
        "combinacoes_ipr_elegiveis": int(
            hospital_cid.st_amostra.eq("suficiente").sum()
        ),
        "cobertura_internacoes_ipr_pct": round(
            hospital_cid.loc[
                hospital_cid.st_amostra.eq("suficiente"),
                "qt_internacao_nova",
            ].sum()
            / total_novas
            * 100,
            4,
        ),
        "linhas_tmh_cmi_amostra_suficiente": int(
            hospital_especialidade.st_amostra.eq("suficiente").sum()
        ),
        "hospitais_mes_acima_capacidade_declarada": int(
            hospital_mensal.fl_acima_capacidade_declarada.sum()
        ),
        "hospitais_mes_sem_leito_sus_declarado": int(
            hospital_mensal.st_capacidade.eq("sem_leito_sus_declarado").sum()
        ),
    }
    metadados = {
        "camada": "gold",
        "versao_contrato": VERSAO_CONTRATO,
        "gerado_em_utc": datetime.now(timezone.utc).isoformat(),
        "metricas": metricas,
        "tabelas": {
            nome: {
                "caminho": str((dir_marts / f"{nome}.parquet").relative_to(base)),
                "linhas": int(len(frame)),
                "colunas": len(frame.columns),
                "sha256": _hash_arquivo(dir_marts / f"{nome}.parquet"),
            }
            for nome, frame in marts.items()
        },
    }
    _gravar_json(dir_qualidade / "METADADOS.json", metadados)
    relatorio = [
        "# Relatório de qualidade — MedFlow Gold",
        "",
        "## Reconciliações",
        "",
    ] + [
        f"- `{chave}`: {valor:,}" if isinstance(valor, int) else f"- `{chave}`: {valor}"
        for chave, valor in metricas.items()
    ]
    relatorio += [
        "",
        "## Limites de interpretação",
        "",
        "- TMH não possui ajuste de risco clínico.",
        "- IPR só recebe valor com os mínimos 20/50/3 hospitais.",
        "- IS é comparação sazonal histórica de 2026 contra 2024–2025.",
        "- CMI nominal é valor aprovado; CMI real corrige o poder de compra pelo IPCA, mas nenhum deles representa custo econômico integral.",
        "- IPH usa pacientes-dia reconstruídos e leitos mensais declarados; não é ocupação real.",
        "- Taxas territoriais consideram residentes de SP atendidos em hospitais de SP; saídas para outras UFs não estão no RD-SP.",
        "- A participação de ICSAP usa todas as internações novas observadas de residentes no denominador, pois o procedimento necessário ao denominador clínico oficial não foi preservado na Silver.",
        f"- Lista ICSAP: {VERSAO_LISTA_ICSAP}.",
    ]
    (dir_qualidade / "RELATORIO_QUALIDADE.md").write_text(
        "\n".join(relatorio), encoding="utf-8"
    )
    return marts

"""Cálculo reprodutível dos cinco indicadores aprovados do MedFlow."""

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


COLUNAS_FATO = [
    "id_aih",
    "cd_cnes",
    "cd_municipio_ibge_6",
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
    mart["st_amostra"] = np.where(
        mart.qt_internacao_nova.ge(30),
        "suficiente",
        "amostra_insuficiente",
    )
    return mart


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
    mart["st_amostra"] = np.where(
        mart.qt_internacao_nova.ge(30),
        "suficiente",
        "amostra_insuficiente",
    )
    return mart


def _regiao_mensal(
    novas: pd.DataFrame,
    hospital_mensal: pd.DataFrame,
    populacao_regiao: pd.DataFrame,
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
    assert mart.qt_populacao_ibge_2022.notna().all()
    mart["qt_internacao_por_100_mil_habitante"] = (
        _dividir(mart.qt_internacao_nova, mart.qt_populacao_ibge_2022) * 100_000
    )
    mart["pc_tmh"] = _dividir(mart.qt_obito, mart.qt_internacao_nova) * 100
    mart["vl_cmi"] = _dividir(
        mart.vl_aprovado_internacao_nova_soma,
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
    return mart


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

    hospital_especialidade = _hospital_especialidade_mensal(fato, novas)
    hospital_cid = _hospital_cid_periodo(novas)
    hospital_mensal = _hospital_mensal(novas, leitos, hospitais)
    regiao_mensal = _regiao_mensal(novas, hospital_mensal, populacao_regiao)
    regiao_periodo = _regiao_periodo(hospital_cid)

    marts = {
        "mart_indicador_hospital_mensal": hospital_mensal,
        "mart_indicador_hospital_especialidade_mensal": hospital_especialidade,
        "mart_indicador_hospital_cid_periodo": hospital_cid,
        "mart_indicador_regiao_mensal": regiao_mensal,
        "mart_indicador_regiao_periodo": regiao_periodo,
    }
    total_novas = int(novas.fl_internacao_nova.sum())
    assert int(hospital_mensal.qt_internacao_nova.sum()) == total_novas
    assert int(hospital_especialidade.qt_internacao_nova.sum()) == total_novas
    assert int(regiao_mensal.qt_internacao_nova.sum()) == total_novas
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
            if list(existente.columns) != list(frame.columns) or len(existente) != len(frame):
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
            "Valores financeiros são nominais enquanto o IPCA não for incorporado.",
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
        "- CMI representa valor aprovado nominal, não custo econômico integral.",
        "- IPH usa pacientes-dia reconstruídos e leitos mensais declarados; não é ocupação real.",
    ]
    (dir_qualidade / "RELATORIO_QUALIDADE.md").write_text(
        "\n".join(relatorio), encoding="utf-8"
    )
    return marts

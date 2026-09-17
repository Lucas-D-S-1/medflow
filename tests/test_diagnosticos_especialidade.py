"""Contrato do mart mensal de diagnósticos dentro de cada especialidade."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

from medflow.gold import (
    _hospital_especialidade_cid_mensal,
    materializar_diagnosticos_especialidade,
)

RAIZ = Path(__file__).resolve().parent.parent


def _linhas(
    cnes: str,
    especialidade: str | None,
    cid: str | None,
    permanencias: list[int],
    *,
    competencia: str = "202606",
    nova: int = 1,
) -> list[dict]:
    ano = int(competencia[:4])
    mes = int(competencia[4:])
    return [
        {
            "cd_cnes": cnes,
            "cd_regiao_saude": "35063",
            "nm_regiao_saude": "CAMPINAS",
            "cd_macrorregiao_saude": "3510",
            "nm_macrorregiao_saude": "RRAS15",
            "nr_ano_competencia": ano,
            "nr_mes_competencia": mes,
            "cd_competencia": competencia,
            "cd_especialidade_sih": especialidade,
            "nm_especialidade": None if especialidade is None else f"Especialidade {especialidade}",
            "cd_cid_principal": cid,
            "ds_cid": None if cid is None else f"Diagnóstico {cid}",
            "cd_capitulo_cid": None if cid is None else "X",
            "ds_capitulo_cid": None if cid is None else "Aparelho respiratório",
            "qt_dia_permanencia": dias,
            "fl_internacao_nova": nova,
        }
        for dias in permanencias
    ]


def _mart(*partes: list[dict]) -> pd.DataFrame:
    return _hospital_especialidade_cid_mensal(
        pd.DataFrame([linha for parte in partes for linha in parte])
    )


def _linha(mart: pd.DataFrame, cnes: str, especialidade: str, cid: str):
    return mart.loc[
        mart.cd_cnes.eq(cnes)
        & mart.cd_especialidade_sih.eq(especialidade)
        & mart.cd_cid_principal.eq(cid)
    ].iloc[0]


def test_filtra_continuacao_e_reconcilia_hospital_especialidade_mes():
    mart = _mart(
        _linhas("A", "01", "J448", [10, 20]),
        _linhas("A", "01", "J448", [999], nova=0),
        _linhas("A", "03", "J448", [30]),
        _linhas("A", "01", "I50", [4], competencia="202605"),
    )

    assert int(mart.qt_internacao_nova.sum()) == 4
    assert int(mart.qt_dia_permanencia_soma.sum()) == 64
    assert len(mart) == 3
    assert _linha(mart, "A", "01", "J448").qt_dia_permanencia_soma == 30


def test_chave_composta_nao_mistura_o_mes_nem_a_especialidade():
    mart = _mart(
        _linhas("A", "01", "J448", [21, 22]),
        _linhas("A", "03", "J448", [5, 6, 7]),
        _linhas("A", "01", "J448", [9], competencia="202605"),
    )

    cirurgia = _linha(mart[mart.cd_competencia.eq("202606")], "A", "01", "J448")
    clinica = _linha(mart[mart.cd_competencia.eq("202606")], "A", "03", "J448")
    assert cirurgia.qt_internacao_nova == 2
    assert cirurgia.qt_dia_permanencia_soma == 43
    assert clinica.qt_internacao_nova == 3
    assert clinica.qt_dia_permanencia_soma == 18


def test_media_e_ponderada_e_participacoes_fecham_no_grupo():
    mart = _mart(
        _linhas("A", "01", "J448", [10, 20]),
        _linhas("A", "01", "I50", [5]),
    )
    j448 = _linha(mart, "A", "01", "J448")

    assert j448.nr_permanencia_media_hospital == 15
    assert j448.pc_internacao_especialidade == pytest.approx(200 / 3)
    assert j448.pc_dia_permanencia_especialidade == pytest.approx(600 / 7)
    assert mart.pc_internacao_especialidade.sum() == pytest.approx(100)
    assert mart.pc_dia_permanencia_especialidade.sum() == pytest.approx(100)


def test_participacao_de_dias_fica_nula_quando_grupo_soma_zero():
    mart = _mart(
        _linhas("A", "01", "J448", [0, 0]),
        _linhas("A", "01", "I50", [0]),
    )

    assert mart.pc_internacao_especialidade.sum() == pytest.approx(100)
    assert mart.pc_dia_permanencia_especialidade.isna().all()


def test_benchmark_exclui_o_hospital_e_preserva_descritivos_brutos():
    mart = _mart(
        _linhas("A", "03", "J448", [10] * 20),
        _linhas("B", "03", "J448", [4] * 17),
        _linhas("C", "03", "J448", [5] * 17),
        _linhas("D", "03", "J448", [6] * 16),
    )
    linha = _linha(mart, "A", "03", "J448")

    assert linha.qt_internacao_benchmark == 50
    assert linha.qt_dia_permanencia_benchmark == 249
    assert linha.qt_hospital_benchmark == 3
    assert linha.nr_permanencia_media_benchmark == pytest.approx(249 / 50)
    assert linha.st_amostra == "suficiente"
    assert linha.nr_ipr == pytest.approx(10 / (249 / 50))


@pytest.mark.parametrize(
    ("local", "pares", "hospitais"),
    [(19, 60, 3), (20, 49, 3), (20, 50, 2)],
)
def test_limites_20_50_3_nao_sao_relaxados(local: int, pares: int, hospitais: int):
    quantidades = [pares // hospitais] * hospitais
    for indice in range(pares % hospitais):
        quantidades[indice] += 1
    partes = [_linhas("A", "03", "J448", [10] * local)]
    partes.extend(
        _linhas(chr(ord("B") + indice), "03", "J448", [5] * quantidade)
        for indice, quantidade in enumerate(quantidades)
    )
    linha = _linha(_mart(*partes), "A", "03", "J448")

    assert linha.st_amostra == "amostra_insuficiente"
    assert pd.isna(linha.nr_ipr)
    assert linha.qt_internacao_benchmark == pares
    assert linha.qt_hospital_benchmark == hospitais
    assert linha.nr_permanencia_media_benchmark == 5


def test_benchmark_zero_e_estado_explicito_sem_razao():
    mart = _mart(
        _linhas("A", "03", "J448", [10] * 20),
        _linhas("B", "03", "J448", [0] * 20),
        _linhas("C", "03", "J448", [0] * 20),
        _linhas("D", "03", "J448", [0] * 20),
    )
    linha = _linha(mart, "A", "03", "J448")

    assert linha.st_amostra == "benchmark_zero"
    assert linha.nr_permanencia_media_benchmark == 0
    assert pd.isna(linha.nr_ipr)


def test_desconhecidos_e_sem_cid_fecham_a_reconciliacao():
    mart = _mart(
        _linhas("A", None, None, [3, 7]),
        _linhas("A", "03", None, [5]),
        [
            {
                **_linhas("B", None, None, [4])[0],
                "nm_especialidade": "Nome residual",
                "ds_cid": "Descrição residual",
            }
        ],
    )

    desconhecida = _linha(mart, "A", "--", "--")
    assert desconhecida.nm_especialidade == "Especialidade não informada"
    assert desconhecida.ds_cid == "Sem CID principal informado"
    assert desconhecida.cd_capitulo_cid == "--"
    assert desconhecida.qt_internacao_nova == 2
    b = _linha(mart, "B", "--", "--")
    assert b.nm_especialidade == "Especialidade não informada"
    assert b.ds_cid == "Sem CID principal informado"
    assert int(mart.qt_internacao_nova.sum()) == 4


@pytest.mark.parametrize(
    ("especialidade", "cid"),
    [(None, "J448"), ("03", None), (None, None)],
)
def test_identificador_desconhecido_nunca_e_comparavel(
    especialidade: str | None,
    cid: str | None,
):
    partes = [_linhas("A", especialidade, cid, [10] * 20)]
    partes.extend(
        _linhas(cnes, especialidade, cid, [5] * quantidade)
        for cnes, quantidade in (("B", 17), ("C", 17), ("D", 16))
    )
    mart = _mart(*partes)
    codigo_especialidade = especialidade or "--"
    codigo_cid = cid or "--"
    linha = _linha(mart, "A", codigo_especialidade, codigo_cid)

    assert linha.cd_especialidade_sih == codigo_especialidade
    assert linha.cd_cid_principal == codigo_cid
    assert linha.qt_internacao_nova == 20
    assert linha.qt_dia_permanencia_soma == 200
    assert linha.qt_internacao_benchmark == 50
    assert linha.qt_dia_permanencia_benchmark == 250
    assert linha.qt_hospital_benchmark == 3
    assert linha.nr_permanencia_media_benchmark == 5
    assert linha.st_amostra == "amostra_insuficiente"
    assert pd.isna(linha.nr_ipr)
    assert int(mart.qt_internacao_nova.sum()) == 70
    assert int(mart.qt_dia_permanencia_soma.sum()) == 450


def test_cobertura_conta_todas_as_combinacoes_sem_duplicar_a_chave():
    mart = _mart(
        _linhas("A", "01", "J448", [1, 2]),
        _linhas("A", "01", "I50", [3]),
        _linhas("B", "01", "J448", [4]),
        _linhas("B", "03", "J448", [5]),
    )
    chave = [
        "cd_cnes",
        "cd_competencia",
        "cd_especialidade_sih",
        "cd_cid_principal",
    ]

    assert len(mart) == 4
    assert not mart.duplicated(chave).any()
    assert int(mart.qt_internacao_nova.sum()) == 5


def test_handler_filtra_competencia_aaaamm_e_declara_as_tres_ordenacoes():
    modulo = (RAIZ / "db/ords/03_modulo_medflow_dev.sql").read_text(encoding="utf-8")
    bloco = modulo.split(
        "p_pattern     => 'hospitais/:cnes/especialidades/:especialidade/diagnosticos'",
        2,
    )[-1].split("ords.define_template(", 1)[0]

    assert "as competencia" in bloco
    assert bloco.count("v.cd_competencia = p.competencia") == 2
    assert "v.nr_ano_competencia = p.ano" not in bloco
    assert "case when p.ordenar = 'dias'" in bloco
    assert "case when p.ordenar = 'internacoes'" in bloco
    assert "case when p.ordenar = 'media'" in bloco
    assert bloco.index("row_number() over") < bloco.index("pagina as (")
    assert "select max(o.qt_total) as qt_total\n            from ordenado o" in bloco
    assert "coalesce(total.qt_total, 0)" in bloco
    assert "elegivel" not in bloco.lower()


def test_pk_comeca_por_hospital_competencia_especialidade_cid_e_rollback_padrao_preserva():
    ddl = (RAIZ / "db/schema/07_adicionar_diagnostico_especialidade_mensal.sql").read_text(
        encoding="utf-8"
    )
    rollback = (
        RAIZ / "db/schema/07_reverter_diagnostico_especialidade_mensal.sql"
    ).read_text(encoding="utf-8")
    remocao = (
        RAIZ / "db/schema/07_remover_fisicamente_diagnostico_especialidade.sql"
    ).read_text(encoding="utf-8")

    assert "(cd_cnes, cd_competencia, cd_especialidade_sih, cd_cid_principal)" in ddl
    executavel_rollback = "\n".join(
        linha for linha in rollback.splitlines() if not linha.lstrip().startswith("--")
    ).lower()
    assert "drop " not in executavel_rollback
    assert "purge" not in executavel_rollback
    assert "confirmar_remocao_fisica" in remocao.lower()
    assert "drop table mart_indicador_hospital_especialidade_cid_mensal" in remocao.lower()
    assert "purge" not in "\n".join(
        linha for linha in remocao.splitlines() if not linha.lstrip().startswith("--")
    ).lower()


def test_materializacao_dirigida_preserva_outros_marts_e_e_idempotente(tmp_path: Path):
    origem = tmp_path / "data/silver/fatos/fato_internacao.parquet"
    origem.parent.mkdir(parents=True)
    pd.DataFrame(
        _linhas("A", "03", "J448", [10, 20])
        + _linhas("B", "03", "J448", [5])
    ).to_parquet(origem, index=False)
    contrato_path = tmp_path / "contracts/dados/gold.json"
    contrato_path.parent.mkdir(parents=True)
    original = {
        "camada": "gold",
        "versao_contrato": "0.4.0",
        "gerado_em_utc": "2026-08-28T14:35:42+00:00",
        "principios": ["histórico preservado"],
        "tabelas": [
            {
                "nome": "mart_antigo",
                "caminho": "data/gold/marts/mart_antigo.parquet",
                "descricao": "não recarimbar",
                "grao": "um",
                "chave_primaria_logica": ["id"],
                "linhas": 7,
                "colunas": [],
            }
        ],
    }
    contrato_path.write_text(json.dumps(original), encoding="utf-8")
    (tmp_path / "data/gold").mkdir(parents=True)

    materializar_diagnosticos_especialidade(base=tmp_path)
    contrato = json.loads(contrato_path.read_text(encoding="utf-8"))
    antigo = next(t for t in contrato["tabelas"] if t["nome"] == "mart_antigo")
    assert contrato["gerado_em_utc"] == original["gerado_em_utc"]
    assert antigo == original["tabelas"][0]
    assert sum(
        t["nome"] == "mart_indicador_hospital_especialidade_cid_mensal"
        for t in contrato["tabelas"]
    ) == 1

    caminhos = [
        contrato_path,
        tmp_path / "data/gold/DICIONARIO.md",
        tmp_path
        / "data/gold/qualidade/METADADOS_DIAGNOSTICO_ESPECIALIDADE_MENSAL.json",
    ]
    primeira = {caminho: caminho.read_bytes() for caminho in caminhos}
    materializar_diagnosticos_especialidade(base=tmp_path)
    assert {caminho: caminho.read_bytes() for caminho in caminhos} == primeira


def test_snapshot_runtime_cobre_recorte_completo_e_reproduz_o_mart():
    mart_path = (
        RAIZ / "data/gold/marts/mart_indicador_hospital_especialidade_cid_mensal.parquet"
    )
    if not mart_path.exists():
        pytest.skip("mart local ignorado não está materializado")
    snapshot = json.loads(
        (
            RAIZ
            / "web/src/mocks/hospital-diagnosticos-especialidade-3012212-07.json"
        ).read_text(encoding="utf-8")
    )
    recorte = pd.read_parquet(
        mart_path,
        filters=[
            ("cd_cnes", "==", "3012212"),
            ("cd_competencia", "==", "202606"),
            ("cd_especialidade_sih", "==", "07"),
        ],
    ).sort_values(
        ["qt_dia_permanencia_soma", "cd_cid_principal"],
        ascending=[False, True],
        kind="stable",
    )

    assert snapshot["pagination"] == {
        "limit": 2000,
        "offset": 0,
        "count": 85,
        "has_more": False,
        "order": "stay_days_desc",
    }
    assert len(snapshot["items"]) == len(recorte) == 85
    assert sum(item["new_admissions"] for item in snapshot["items"]) == 339
    assert sum(item["stay_days_total"] for item in snapshot["items"]) == 1732
    assert [item["cid_code"] for item in snapshot["items"]] == recorte[
        "cd_cid_principal"
    ].tolist()
    assert [item["stay_days_total"] for item in snapshot["items"]] == recorte[
        "qt_dia_permanencia_soma"
    ].astype(int).tolist()

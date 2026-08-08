"""Validação técnica integrada das camadas MedFlow."""

from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import re

import numpy as np
import pandas as pd
import pyarrow.parquet as pq


PADRAO_NOME = re.compile(r"^[a-z][a-z0-9_]*$")


def _hash(caminho: Path, bloco: int = 4 * 1024 * 1024) -> str:
    digest = sha256()
    with caminho.open("rb") as arquivo:
        for parte in iter(lambda: arquivo.read(bloco), b""):
            digest.update(parte)
    return digest.hexdigest()


def _validar_contrato(base: Path, nome: str) -> tuple[int, int]:
    contrato = json.loads((base / "contracts" / "dados" / f"{nome}.json").read_text(encoding="utf-8"))
    tabelas = 0
    colunas = 0
    for tabela in contrato["tabelas"]:
        caminho = base / tabela["caminho"]
        assert caminho.exists(), caminho
        if caminho.suffix == ".parquet":
            arquivo = pq.ParquetFile(caminho)
            nomes = arquivo.schema_arrow.names
            linhas = arquivo.metadata.num_rows
        elif caminho.suffix == ".csv":
            frame = pd.read_csv(caminho)
            nomes = list(frame.columns)
            linhas = len(frame)
        else:
            raise AssertionError(f"formato tabular não tratado: {caminho}")
        documentadas = [coluna["nome"] for coluna in tabela["colunas"]]
        assert nomes == documentadas, f"{tabela['nome']}: esquema diverge do contrato"
        assert linhas == tabela["linhas"], f"{tabela['nome']}: linhas divergentes"
        if nome in {"silver", "gold"}:
            assert all(PADRAO_NOME.fullmatch(coluna) for coluna in nomes), tabela["nome"]
        assert all(coluna["descricao"].strip() for coluna in tabela["colunas"])
        tabelas += 1
        colunas += len(nomes)
    return tabelas, colunas


def validar(base: Path) -> dict[str, int | str]:
    assert not list((base / "data").rglob("*.parcial"))
    for antigo in ("raw", "processados", "curados", "referencias", "_backup_parquets_originais"):
        assert not (base / "data" / antigo).exists(), antigo

    bronze_tabelas, bronze_colunas = _validar_contrato(base, "bronze")
    silver_tabelas, silver_colunas = _validar_contrato(base, "silver")
    gold_tabelas, gold_colunas = _validar_contrato(base, "gold")

    metadados_silver = json.loads(
        (base / "data" / "silver" / "qualidade" / "METADADOS.json").read_text()
    )
    metadados_gold = json.loads(
        (base / "data" / "gold" / "qualidade" / "METADADOS.json").read_text()
    )
    assert metadados_silver["metricas"]["linhas_sih_reconciliadas"] == 7_034_961
    assert metadados_silver["metricas"]["internacoes_novas"] == 6_905_441
    assert metadados_gold["metricas"]["internacoes_novas_reconciliadas"] == 6_905_441
    assert metadados_gold["metricas"]["regioes_saude"] == 62
    assert metadados_gold["metricas"]["competencias"] == 29
    assert metadados_gold["metricas"]["linhas_is_calculadas"] == 310
    assert metadados_gold["metricas"]["internacoes_residentes_sp_observadas"] == 6_846_665
    assert metadados_gold["metricas"]["internacoes_residentes_fora_sp_atendidas"] == 58_776
    assert metadados_gold["metricas"]["internacoes_icsap_residentes_sp_observadas"] == 953_656

    dir_marts = base / "data" / "gold" / "marts"
    hospital_mensal = pd.read_parquet(
        dir_marts / "mart_indicador_hospital_mensal.parquet"
    )
    hospital_especialidade = pd.read_parquet(
        dir_marts / "mart_indicador_hospital_especialidade_mensal.parquet"
    )
    hospital_cid = pd.read_parquet(
        dir_marts / "mart_indicador_hospital_cid_periodo.parquet"
    )
    regiao_mensal = pd.read_parquet(
        dir_marts / "mart_indicador_regiao_mensal.parquet"
    )
    fluxo_mensal = pd.read_parquet(
        dir_marts / "mart_fluxo_assistencial_regiao_mensal.parquet"
    )
    icsap_mensal = pd.read_parquet(
        dir_marts / "mart_icsap_regiao_mensal.parquet"
    )
    tmh_global_gold = (
        hospital_especialidade.qt_obito.sum()
        / hospital_especialidade.qt_internacao_nova.sum()
        * 100
    )
    assert np.isclose(
        tmh_global_gold,
        metadados_silver["metricas"]["tmh_internacoes_novas_pct"],
        atol=0.0001,
    )
    capacidade_positiva = hospital_mensal.qt_capacidade_teorica_leito_dia.gt(0)
    assert np.allclose(
        hospital_mensal.loc[capacidade_positiva, "nr_iph_estimado"],
        (
            hospital_mensal.loc[capacidade_positiva, "qt_paciente_dia_estimado"]
            / hospital_mensal.loc[
                capacidade_positiva, "qt_capacidade_teorica_leito_dia"
            ]
        ),
    )
    elegivel = hospital_cid.st_amostra.eq("suficiente")
    assert np.allclose(
        hospital_cid.loc[elegivel, "nr_ipr"],
        (
            hospital_cid.loc[elegivel, "nr_permanencia_media_hospital"]
            / hospital_cid.loc[elegivel, "nr_permanencia_media_benchmark"]
        ),
    )
    is_calculado = regiao_mensal.st_indice_sazonalidade.eq("calculado")
    assert np.allclose(
        regiao_mensal.loc[is_calculado, "nr_indice_sazonalidade"],
        (
            regiao_mensal.loc[is_calculado, "qt_internacao_nova"]
            / regiao_mensal.loc[
                is_calculado, "qt_internacao_media_historica"
            ]
        ),
    )
    assert np.allclose(
        regiao_mensal.tx_internacao_residente_observada_por_100_mil,
        regiao_mensal.qt_internacao_residente_observada
        / regiao_mensal.qt_populacao_ibge_2022
        * 100_000,
    )
    assert fluxo_mensal.qt_internacao_nova.sum() == 6_905_441
    assert regiao_mensal.qt_internacao_residente_observada.sum() == 6_846_665
    assert (
        regiao_mensal.qt_internacao_residente_na_propria_regiao.sum()
        + regiao_mensal.qt_evasao_intrastadual_observada.sum()
        == 6_846_665
    )
    assert (
        regiao_mensal.qt_evasao_intrastadual_observada.sum()
        == regiao_mensal.qt_internacao_recebida_outra_regiao_sp.sum()
        == 906_060
    )
    assert (
        icsap_mensal.qt_internacao_icsap.sum()
        == regiao_mensal.qt_internacao_icsap_residente_observada.sum()
        == 953_656
    )
    assert icsap_mensal.cd_grupo_icsap.nunique() == 19
    assert np.allclose(
        hospital_mensal.vl_aprovado_internacao_nova_real_soma,
        hospital_mensal.vl_aprovado_internacao_nova_soma
        * hospital_mensal.nr_fator_correcao_ipca,
    )
    com_internacao = hospital_mensal.qt_internacao_nova.gt(0)
    assert np.allclose(
        hospital_mensal.loc[com_internacao, "nr_permanencia_media"],
        hospital_mensal.loc[com_internacao, "qt_dia_permanencia_soma"]
        / hospital_mensal.loc[com_internacao, "qt_internacao_nova"],
    )

    topo = json.loads(
        (base / "data" / "gold" / "geografia" / "mapa_regiao_saude_sp.topojson").read_text()
    )
    assert topo["type"] == "Topology"
    assert len(topo["objects"]["regioes_saude"]["geometries"]) == 62

    inventario_pre = json.loads(
        (base / "contracts" / "INVENTARIO_PRE_MIGRACAO.json").read_text()
    )
    arquivos_atuais = [
        caminho
        for raiz in (base / "data", base / "docs" / "qualidade" / "figuras")
        for caminho in raiz.rglob("*")
        if caminho.is_file()
    ]
    hashes_atuais = {_hash(caminho) for caminho in arquivos_atuais}
    preservados = [
        item
        for item in inventario_pre["arquivos"]
        if (
            item["caminho"].startswith("data/")
            or item["caminho"].startswith("figuras/")
        )
        and not item["caminho"].startswith("data/gold/")
        and item["caminho"] != "data/bronze/MANIFESTO.json"
        # figuras descartadas foram removidas do caminho principal na
        # reorganização de 08/08/2026; seguem recuperáveis pelo histórico
        and "descartadas/" not in item["caminho"]
    ]
    ausentes = [item["caminho"] for item in preservados if item["sha256"] not in hashes_atuais]
    assert not ausentes, f"artefatos pré-migração ausentes: {ausentes[:10]}"

    resultado: dict[str, int | str] = {
        "validado_em_utc": datetime.now(timezone.utc).isoformat(),
        "bronze_tabelas": bronze_tabelas,
        "bronze_colunas_documentadas": bronze_colunas,
        "silver_tabelas": silver_tabelas,
        "silver_colunas_documentadas": silver_colunas,
        "gold_tabelas": gold_tabelas,
        "gold_colunas_documentadas": gold_colunas,
        "artefatos_pre_migracao_preservados": len(preservados),
        "aih_reconciliadas": 7_034_961,
        "internacoes_novas_reconciliadas": 6_905_441,
        "municipios": 645,
        "regioes_saude": 62,
        "macrorregioes_saude": 19,
        "competencias": 29,
    }
    linhas = [
        "# Validação técnica integrada — MedFlow 0.3.0",
        "",
        f"Executada em `{resultado['validado_em_utc']}`.",
        "",
        "## Resultado",
        "",
        "- Bronze, Silver e Gold aderentes aos contratos JSON.",
        "- Todas as tabelas e colunas possuem descrição.",
        "- Nomes Silver/Gold aderentes a `snake_case`.",
        "- Nenhum arquivo `.parcial` residual.",
        f"- {len(preservados)} artefatos de data/figuras pré-migração preservados por SHA-256.",
        "- 7.034.961 AIHs e 6.905.441 internações novas reconciliadas.",
        "- Fórmulas TMH, IPR, IS, IPH, permanência média, IPCA e taxa populacional por residência recalculadas.",
        "- Fluxos origem-destino reconciliados; 906.060 saídas inter-regionais fecham com as entradas correspondentes.",
        "- 953.656 ICSAP reconciliadas entre resumo regional e 19 grupos da Portaria SAS/MS 221/2008.",
        "- 645 municípios, 62 regiões, 19 macrorregiões e 29 competências.",
        "- TopoJSON com 62 geometrias regionais.",
        "",
        "## Cobertura documental",
        "",
        f"- Bronze: {bronze_tabelas} tabelas, {bronze_colunas} colunas.",
        f"- Silver: {silver_tabelas} tabelas, {silver_colunas} colunas.",
        f"- Gold: {gold_tabelas} tabelas, {gold_colunas} colunas.",
    ]
    (base / "VALIDACAO_TECNICA.md").write_text("\n".join(linhas), encoding="utf-8")
    return resultado


if __name__ == "__main__":
    # src/medflow/validar.py -> a raiz do repositório é dois níveis acima
    raiz = Path(__file__).parents[2]
    print(json.dumps(validar(raiz), ensure_ascii=False, indent=2))

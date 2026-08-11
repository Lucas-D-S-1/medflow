"""Validação técnica integrada das camadas MedFlow."""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path

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


def validar(base: Path, *, publicar: bool = True) -> dict[str, int | str]:
    """Valida as três camadas e, por padrão, publica o `VALIDACAO_TECNICA.md`.

    `publicar=False` mede sem escrever. Existe para os testes: eles precisam do
    resultado medido, mas reescrever um arquivo versionado a cada `pytest`
    deixava a árvore suja em toda execução — e uma árvore sempre suja é uma
    árvore em que ninguém mais olha o `git status`.
    """
    assert not list((base / "data").rglob("*.parcial"))
    for antigo in ("raw", "processados", "curados", "referencias", "_backup_parquets_originais"):
        assert not (base / "data" / antigo).exists(), antigo

    bronze_tabelas, bronze_colunas = _validar_contrato(base, "bronze")
    silver_tabelas, silver_colunas = _validar_contrato(base, "silver")
    gold_tabelas, gold_colunas = _validar_contrato(base, "gold")

    manifesto_bronze = json.loads(
        (base / "data" / "bronze" / "MANIFESTO.json").read_text()
    )
    metadados_silver = json.loads(
        (base / "data" / "silver" / "qualidade" / "METADADOS.json").read_text()
    )
    metadados_gold = json.loads(
        (base / "data" / "gold" / "qualidade" / "METADADOS.json").read_text()
    )
    geografia = json.loads(
        (base / "data" / "gold" / "geografia" / "METADADOS.json").read_text()
    )
    silver = metadados_silver["metricas"]
    gold = metadados_gold["metricas"]

    # Estruturais de São Paulo na divisão oficial do Ministério da Saúde.
    # Independem do recorte; se mudarem, foi a realidade que mudou.
    assert geografia["municipios"] == 645
    assert geografia["macrorregioes_saude"] == 19

    # Invariantes ENTRE CAMADAS. Antes eram totais memorizados do recorte de
    # 29 competências, o que fazia a validação quebrar sempre que o recorte
    # avançasse — e um total memorizado não prova consistência, só prova que
    # ninguém mexeu. Estas igualdades valem para qualquer recorte e provam o
    # que interessa: nada se perdeu nem foi inventado entre as camadas.
    assert silver["linhas_sih_reconciliadas"] == manifesto_bronze["checks"]["linhas_sih"]
    assert silver["linhas_cnes_reconciliadas"] == manifesto_bronze["checks"]["linhas_cnes"]
    assert (
        silver["internacoes_novas"] + silver["continuacoes_longa_permanencia"]
        == silver["linhas_sih_reconciliadas"]
    )
    assert gold["internacoes_novas_reconciliadas"] == silver["internacoes_novas"]
    assert gold["competencias"] == len(manifesto_bronze["recorte"]["competencias"])
    assert 0 < gold["internacoes_residentes_sp_observadas"] <= silver["internacoes_novas"]
    assert 0 <= gold["internacoes_icsap_residentes_sp_observadas"] <= (
        gold["internacoes_residentes_sp_observadas"]
    )
    assert gold["internacoes_residentes_fora_sp_atendidas"] >= 0
    assert gold["linhas_is_calculadas"] >= 0

    # Invariantes ESTRUTURAIS, independentes do recorte: São Paulo tem 62
    # regiões e 19 macrorregiões de saúde na divisão oficial do Ministério da
    # Saúde, e a lista oficial de ICSAP tem 19 grupos. Se um destes mudar, é
    # a realidade que mudou, e a mudança precisa ser deliberada.
    assert gold["regioes_saude"] == 62

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
    # O fluxo assistencial reparticiona as mesmas internações novas da Silver.
    assert fluxo_mensal.qt_internacao_nova.sum() == silver["internacoes_novas"]
    assert (
        regiao_mensal.qt_internacao_residente_observada.sum()
        == gold["internacoes_residentes_sp_observadas"]
    )
    # Todo residente paulista internado em SP ou ficou na própria região, ou
    # evadiu para outra. Não há terceira possibilidade, em nenhum recorte.
    assert (
        regiao_mensal.qt_internacao_residente_na_propria_regiao.sum()
        + regiao_mensal.qt_evasao_intrastadual_observada.sum()
        == gold["internacoes_residentes_sp_observadas"]
    )
    # Quem sai de uma região entra em outra: a evasão estadual tem de fechar
    # exatamente com a recepção. É a identidade que prova a matriz de fluxos.
    evasao_intrastadual = int(regiao_mensal.qt_evasao_intrastadual_observada.sum())
    assert (
        evasao_intrastadual == regiao_mensal.qt_internacao_recebida_outra_regiao_sp.sum()
    )
    assert (
        icsap_mensal.qt_internacao_icsap.sum()
        == regiao_mensal.qt_internacao_icsap_residente_observada.sum()
        == gold["internacoes_icsap_residentes_sp_observadas"]
    )
    # Os 19 grupos da lista oficial de ICSAP; estrutural, não do recorte.
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
    geometrias_regionais = len(topo["objects"]["regioes_saude"]["geometries"])
    assert geometrias_regionais == 62

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

    # O que esta checagem prova: que a migração de julho de 2026 não perdeu
    # nada que o pipeline NÃO regenera. A distinção importa e antes não
    # existia.
    #
    # Saídas do pipeline — Bronze, Silver, Gold e as referências baixadas —
    # mudam legitimamente sempre que o recorte avança, e de fato mudaram
    # quando 2026-06 entrou. Cobri-las aqui só funcionava enquanto o recorte
    # estava congelado, e faria a validação falhar para sempre depois. Elas já
    # têm garantias mais fortes: os contratos JSON conferem esquema e
    # contagem, as 12 reconciliações do manifesto conferem a ingestão e os
    # invariantes entre camadas conferem que nada se perdeu no caminho.
    #
    # O que sobra aqui é o que deve ser imutável de verdade: o legado de
    # 2022-2023 e as figuras de referência.
    # Os prefixos são os do inventário de julho, que é anterior à
    # reorganização — por isso o legado de 2022-2023 aparece como
    # `data/curados/` e não como `data/legado/`. A comparação é por SHA-256,
    # então o arquivo é encontrado onde quer que esteja hoje.
    prefixos_imutaveis = (
        "data/curados/",
        "data/processados/",
        "data/referencias/",
        "data/_backup_parquets_originais/",
        "data/legado/",
        "docs/qualidade/figuras/",
    )
    arquivos_imutaveis = (
        "data/bronze/sih_rd_sp_2022_2023.parquet",
        "data/bronze/cnes_lt_sp_2022_2023.parquet",
    )

    def _imutavel(caminho: str) -> bool:
        if "descartadas/" in caminho:
            # removidas do caminho principal na reorganização de 08/08/2026;
            # seguem recuperáveis pelo histórico do Git
            return False
        return caminho.startswith(prefixos_imutaveis) or caminho in arquivos_imutaveis

    preservados = [item for item in inventario_pre["arquivos"] if _imutavel(item["caminho"])]
    assert preservados, "o inventário pré-migração não tem artefato imutável a conferir"
    ausentes = [item["caminho"] for item in preservados if item["sha256"] not in hashes_atuais]
    assert not ausentes, f"artefatos pré-migração ausentes: {ausentes[:10]}"

    resultado: dict[str, int | str] = {
        "validado_em_utc": datetime.now(UTC).isoformat(),
        "bronze_tabelas": bronze_tabelas,
        "bronze_colunas_documentadas": bronze_colunas,
        "silver_tabelas": silver_tabelas,
        "silver_colunas_documentadas": silver_colunas,
        "gold_tabelas": gold_tabelas,
        "gold_colunas_documentadas": gold_colunas,
        "artefatos_pre_migracao_preservados": len(preservados),
        # Medidos, nunca memorizados: um relatório com número fixo continua
        # afirmando o recorte antigo depois que o recorte avança, e isso é
        # pior do que uma asserção que quebra — quebra avisa, relatório mente.
        "aih_reconciliadas": silver["linhas_sih_reconciliadas"],
        "internacoes_novas_reconciliadas": gold["internacoes_novas_reconciliadas"],
        "municipios": geografia["municipios"],
        "regioes_saude": gold["regioes_saude"],
        "macrorregioes_saude": geografia["macrorregioes_saude"],
        "competencias": gold["competencias"],
        "evasao_intrastadual": evasao_intrastadual,
        "icsap_reconciliadas": gold["internacoes_icsap_residentes_sp_observadas"],
        "geometrias_regionais": geometrias_regionais,
    }

    def br(valor: int) -> str:
        """Milhar com ponto, como o resto do produto escreve número."""
        return f"{valor:,}".replace(",", ".")

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
        f"- {br(silver['linhas_sih_reconciliadas'])} AIHs e "
        f"{br(gold['internacoes_novas_reconciliadas'])} internações novas reconciliadas.",
        "- Fórmulas TMH, IPR, IS, IPH, permanência média, IPCA e taxa populacional por residência recalculadas.",
        f"- Fluxos origem-destino reconciliados; {br(evasao_intrastadual)} saídas "
        "inter-regionais fecham com as entradas correspondentes.",
        f"- {br(gold['internacoes_icsap_residentes_sp_observadas'])} ICSAP reconciliadas "
        "entre resumo regional e 19 grupos da Portaria SAS/MS 221/2008.",
        f"- {br(geografia['municipios'])} municípios, {gold['regioes_saude']} regiões, "
        f"{geografia['macrorregioes_saude']} macrorregiões e {gold['competencias']} competências.",
        f"- TopoJSON com {geometrias_regionais} geometrias regionais.",
        "",
        "## Cobertura documental",
        "",
        f"- Bronze: {bronze_tabelas} tabelas, {bronze_colunas} colunas.",
        f"- Silver: {silver_tabelas} tabelas, {silver_colunas} colunas.",
        f"- Gold: {gold_tabelas} tabelas, {gold_colunas} colunas.",
    ]
    if publicar:
        (base / "VALIDACAO_TECNICA.md").write_text("\n".join(linhas), encoding="utf-8")
    return resultado


if __name__ == "__main__":
    # src/medflow/validar.py -> a raiz do repositório é dois níveis acima
    raiz = Path(__file__).parents[2]
    print(json.dumps(validar(raiz), ensure_ascii=False, indent=2))

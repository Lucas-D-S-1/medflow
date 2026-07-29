"""Geração dos ativos geográficos oficiais para consumo no BI."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile

import pandas as pd
import shapefile
from shapely import make_valid, union_all
from shapely.geometry import mapping, shape
import topojson

from pipeline.contratos import (
    _contrato_tabela,
    _gravar_json,
    _renderizar_dicionario,
)


URL_MALHA_IBGE = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/"
    "malhas_municipais/municipio_2024/UFs/SP/SP_Municipios_2024.zip"
)
URL_REGIOES_MS = (
    "https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/"
    "dbgeral/macroregiao_de_saude_csv.zip"
)


def _hash(caminho: Path, bloco: int = 1024 * 1024) -> str:
    digest = sha256()
    with caminho.open("rb") as arquivo:
        for parte in iter(lambda: arquivo.read(bloco), b""):
            digest.update(parte)
    return digest.hexdigest()


def gerar_geografia(*, base: Path) -> dict[str, int]:
    dir_origem = base / "dados" / "bronze" / "origem" / "referencias"
    arq_malha = dir_origem / "geografia" / "SP_Municipios_2024.zip"
    arq_regioes = dir_origem / "macrorregiao_de_saude_csv.zip"
    assert arq_malha.exists(), f"malha ausente: {arq_malha}"
    assert arq_regioes.exists(), f"CSV de regiões ausente: {arq_regioes}"

    dir_silver = base / "dados" / "silver" / "dimensoes"
    municipios = pd.read_parquet(dir_silver / "dim_municipio.parquet")
    assert len(municipios) == 645
    assert municipios.cd_municipio_ibge_7.nunique() == 645
    assert municipios.cd_regiao_saude.nunique() == 62

    dir_geo = base / "dados" / "gold" / "geografia"
    dir_geo.mkdir(parents=True, exist_ok=True)
    colunas_municipio = [
        "cd_municipio_ibge_7",
        "cd_municipio_ibge_6",
        "nm_municipio",
        "sg_uf",
        "cd_regiao_saude",
        "nm_regiao_saude",
        "cd_macrorregiao_saude",
        "nm_macrorregiao_saude",
        "qt_populacao_ibge_2022",
        "ds_fonte_populacao",
    ]
    dim_municipio = municipios[colunas_municipio].copy()
    dim_regiao = (
        dim_municipio.groupby(
            [
                "cd_regiao_saude",
                "nm_regiao_saude",
                "cd_macrorregiao_saude",
                "nm_macrorregiao_saude",
            ],
            as_index=False,
        )
        .agg(
            qt_municipio=("cd_municipio_ibge_7", "nunique"),
            qt_populacao_ibge_2022=("qt_populacao_ibge_2022", "sum"),
        )
    )
    dim_municipio.to_csv(
        dir_geo / "dim_geografia_municipio.csv",
        index=False,
        encoding="utf-8",
    )
    dim_regiao.to_csv(
        dir_geo / "dim_geografia_regiao.csv",
        index=False,
        encoding="utf-8",
    )

    mapa_municipio = dim_municipio.set_index("cd_municipio_ibge_7")
    geometrias: dict[str, list] = defaultdict(list)
    codigos_lidos: set[str] = set()
    with TemporaryDirectory(prefix="medflow_geografia_") as temporario:
        with ZipFile(arq_malha) as pacote:
            pacote.extractall(temporario)
        leitor = shapefile.Reader(
            str(Path(temporario) / "SP_Municipios_2024.shp"),
            encoding="cp1252",
        )
        for registro, geometria in zip(leitor.iterRecords(), leitor.iterShapes()):
            atributos = registro.as_dict()
            cd_municipio = str(atributos["CD_MUN"]).zfill(7)
            codigos_lidos.add(cd_municipio)
            assert cd_municipio in mapa_municipio.index, cd_municipio
            cd_regiao = str(mapa_municipio.loc[cd_municipio, "cd_regiao_saude"])
            geometrias[cd_regiao].append(make_valid(shape(geometria.__geo_interface__)))

    assert len(codigos_lidos) == 645
    assert codigos_lidos == set(mapa_municipio.index.astype(str))
    assert len(geometrias) == 62
    metadados_regiao = dim_regiao.set_index("cd_regiao_saude")
    features = []
    for cd_regiao, partes in sorted(geometrias.items()):
        uniao = make_valid(union_all(partes)).simplify(0.002, preserve_topology=True)
        assert not uniao.is_empty and uniao.is_valid
        info = metadados_regiao.loc[cd_regiao]
        features.append(
            {
                "type": "Feature",
                "id": cd_regiao,
                "properties": {
                    "cd_regiao_saude": cd_regiao,
                    "nm_regiao_saude": info.nm_regiao_saude,
                    "cd_macrorregiao_saude": info.cd_macrorregiao_saude,
                    "nm_macrorregiao_saude": info.nm_macrorregiao_saude,
                    "qt_municipio": int(info.qt_municipio),
                    "qt_populacao_ibge_2022": int(info.qt_populacao_ibge_2022),
                },
                "geometry": mapping(uniao),
            }
        )
    geojson = {"type": "FeatureCollection", "features": features}
    arq_geojson = dir_geo / "mapa_regiao_saude_sp.geojson"
    arq_geojson.write_text(
        json.dumps(geojson, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    topologia = topojson.Topology(
        geojson,
        prequantize=100_000,
        object_name="regioes_saude",
    )
    arq_topojson = dir_geo / "mapa_regiao_saude_sp.topojson"
    arq_topojson.write_text(topologia.to_json(), encoding="utf-8")
    topologia_dict = json.loads(arq_topojson.read_text(encoding="utf-8"))
    assert topologia_dict["type"] == "Topology"
    assert "regioes_saude" in topologia_dict["objects"]

    contrato_path = base / "contratos" / "gold.json"
    contrato = json.loads(contrato_path.read_text(encoding="utf-8"))
    contrato["tabelas"] = [
        tabela
        for tabela in contrato["tabelas"]
        if not tabela["nome"].startswith("dim_geografia_")
    ]
    contrato["tabelas"] += [
        _contrato_tabela(
            "dim_geografia_municipio",
            dim_municipio,
            "gold",
            "dados/gold/geografia/dim_geografia_municipio.csv",
        ),
        _contrato_tabela(
            "dim_geografia_regiao",
            dim_regiao,
            "gold",
            "dados/gold/geografia/dim_geografia_regiao.csv",
        ),
    ]
    contrato["ativos"] = [
        {
            "nome": "mapa_regiao_saude_sp.geojson",
            "caminho": "dados/gold/geografia/mapa_regiao_saude_sp.geojson",
            "descricao": "Polígonos das 62 regiões de saúde, dissolvidos da malha municipal IBGE 2024.",
            "fonte": URL_MALHA_IBGE,
            "formato": "geojson",
        },
        {
            "nome": "mapa_regiao_saude_sp.topojson",
            "caminho": "dados/gold/geografia/mapa_regiao_saude_sp.topojson",
            "descricao": "Topologia simplificada das regiões de saúde para mapas customizados no BI.",
            "fonte": URL_MALHA_IBGE,
            "formato": "topojson",
        },
    ]
    contrato["gerado_em_utc"] = datetime.now(timezone.utc).isoformat()
    _gravar_json(contrato_path, contrato)
    (base / "dados" / "gold" / "DICIONARIO.md").write_text(
        _renderizar_dicionario(contrato),
        encoding="utf-8",
    )

    resumo = {
        "municipios": len(dim_municipio),
        "regioes_saude": len(dim_regiao),
        "macrorregioes_saude": int(dim_regiao.cd_macrorregiao_saude.nunique()),
        "populacao_ibge_2022": int(dim_regiao.qt_populacao_ibge_2022.sum()),
        "features_geojson": len(features),
    }
    readme = [
        "# Geografia para o BI",
        "",
        "Ativos derivados de fontes oficiais e ligados aos marts pela coluna "
        "`cd_regiao_saude`.",
        "",
        f"- Municípios: {resumo['municipios']}",
        f"- Regiões de saúde: {resumo['regioes_saude']}",
        f"- Macrorregiões: {resumo['macrorregioes_saude']}",
        f"- População IBGE 2022: {resumo['populacao_ibge_2022']:,}",
        "",
        "## Fontes",
        "",
        f"- Malha municipal IBGE 2024: {URL_MALHA_IBGE}",
        f"- Regiões e população: {URL_REGIOES_MS}",
        "",
        "## Integridade",
        "",
        f"- SHA-256 da malha original: `{_hash(arq_malha)}`",
        f"- SHA-256 do CSV original: `{_hash(arq_regioes)}`",
        "- 645/645 municípios associados sem imputação.",
        "- 62/62 regiões com geometria válida.",
    ]
    (dir_geo / "README.md").write_text("\n".join(readme), encoding="utf-8")
    _gravar_json(dir_geo / "METADADOS.json", resumo)
    return resumo

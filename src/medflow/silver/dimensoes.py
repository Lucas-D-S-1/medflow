"""As nove dimensões da Silver.

`dim_hospital` e `dim_municipio` carregam a ressalva cadastral do projeto: nome
e esfera vêm da fotografia **atual** do CNES, não de uma fotografia histórica
de 2024-2026. Por isso o sufixo `_atual` e a flag
`fl_cadastro_atual_nao_historico`.
"""

from __future__ import annotations

import calendar
import re
import unicodedata
from zipfile import ZipFile

import numpy as np
import pandas as pd
from shapely.geometry import Point, shape

from medflow.config import obter_logger
from medflow.silver.carga import ARQUIVOS_TERRITORIO, EntradaSilver
from medflow.silver.dominios import (
    CID_COMPLEMENTAR,
    DEPARA_ESPEC,
    DEPARA_GESTAO,
    DEPARA_NAT_JUR,
    DEPARA_TP_UNID,
    classificar_cid,
    normaliza_codigo,
)

logger = obter_logger("silver.dimensoes")

URL_SMS_ERMELINO = (
    "https://prefeitura.sp.gov.br/web/saude/w/"
    "coordenadorias-regionais-de-saude-leste"
)


def _features_territorio(entrada: EntradaSilver, nome: str) -> list[dict]:
    payload = entrada.territorio_raw[nome]
    crs = payload.get("crs", {}).get("properties", {}).get("name", "")
    assert crs.endswith("4326"), f"{nome}: GeoJSON fora de EPSG:4326: {crs}"
    features = payload.get("features", [])
    assert features, f"{nome}: GeoJSON sem features"
    return features


def _data_referencia(*valores: object) -> str:
    datas = [
        pd.to_datetime(str(valor).removesuffix("Z"), utc=True)
        for valor in valores
        if valor
    ]
    assert datas
    return max(datas).date().isoformat()


def _normalizar_busca(valor: str) -> str:
    sem_acentos = unicodedata.normalize("NFKD", valor)
    sem_acentos = "".join(char for char in sem_acentos if not unicodedata.combining(char))
    return re.sub(r"[^A-Za-z0-9]+", " ", sem_acentos).strip().upper()


def dimensao_territorio_municipal(entrada: EntradaSilver) -> pd.DataFrame:
    """Conforma os polígonos municipais do GeoSampa para São Paulo."""
    assert ARQUIVOS_TERRITORIO == tuple(entrada.territorio_raw)
    distritos = _features_territorio(entrada, "geosampa_distrito_municipal")
    subprefeituras = _features_territorio(entrada, "geosampa_subprefeitura")
    crs = _features_territorio(entrada, "geosampa_coordenadoria_regional_saude")
    sts = _features_territorio(entrada, "geosampa_supervisao_tecnica_saude")

    subpref_por_identificador = {
        int(item["properties"]["cd_identificador_subprefeitura"]): item
        for item in subprefeituras
    }
    poligonos_sts = [(item["properties"], shape(item["geometry"])) for item in sts]

    linhas = []
    for feature in distritos:
        distrito = feature["properties"]
        identificador_subprefeitura = int(distrito["cd_identificador_subprefeitura"])
        subprefeitura = subpref_por_identificador.get(identificador_subprefeitura)
        assert subprefeitura is not None, distrito
        subpref = subprefeitura["properties"]

        ponto = shape(feature["geometry"]).representative_point()
        matches_sts = [props for props, poligono in poligonos_sts if poligono.covers(ponto)]
        assert len(matches_sts) == 1, {
            "distrito": distrito["nm_distrito_municipal"],
            "sts_encontradas": len(matches_sts),
        }
        sts_props = matches_sts[0]
        matches_crs = [
            item
            for item in crs
            if _normalizar_busca(
                item["properties"]["nm_coordenadoria_regional_saude"]
            )
            == _normalizar_busca(sts_props["nm_coordenadoria_regional_saude"])
            and shape(item["geometry"]).covers(ponto)
        ]
        assert len(matches_crs) == 1, {
            "distrito": distrito["nm_distrito_municipal"],
            "crs_encontradas": len(matches_crs),
        }
        crs_props = matches_crs[0]["properties"]
        codigo_crs = int(crs_props["cd_identificador_coordenadoria_regional_saude"])

        linhas.append(
            {
                "cd_municipio_ibge_7": "3550308",
                "cd_distrito_sp": str(distrito["cd_distrito_municipal"]),
                "nm_distrito": distrito["nm_distrito_municipal"],
                "id_subprefeitura_sp": str(subpref["cd_subprefeitura"]),
                "nm_subprefeitura": subpref["nm_subprefeitura"],
                "id_crs_sms_sp": str(codigo_crs),
                "nm_crs_sms": crs_props["nm_coordenadoria_regional_saude"],
                "id_sts_sms_sp": str(sts_props["cd_identificador_supervisao_tecnica_saude"]),
                "nm_sts_sms": sts_props["nm_supervisao_tecnica_saude"],
                "nm_regiao_municipal_5": distrito["nm_regiao_05"],
                "nm_regiao_municipal_8": distrito["nm_regiao_08"],
                "nm_zona_popular": distrito["nm_regiao_05"],
                "ds_fonte_territorio": "PMSP GeoSampa WFS (EPSG:4326)",
                "dt_referencia_fonte": _data_referencia(
                    distrito["dt_atualizacao"],
                    subpref["dt_atualizacao"],
                    crs_props["dt_carga"],
                    sts_props["dt_carga"],
                ),
            }
        )

    resultado = pd.DataFrame(linhas).sort_values("cd_distrito_sp").reset_index(drop=True)
    assert len(resultado) == 96
    assert resultado.cd_distrito_sp.nunique() == 96
    assert resultado.id_crs_sms_sp.nunique() == 5
    assert resultado.id_sts_sms_sp.nunique() == 26
    return resultado


def dimensao_hospital_territorio_atual(
    entrada: EntradaSilver, territorio: pd.DataFrame
) -> pd.DataFrame:
    """Atribui os hospitais de São Paulo ao distrito pelo ponto CNES."""
    distritos = _features_territorio(entrada, "geosampa_distrito_municipal")
    poligonos = [(item["properties"], shape(item["geometry"])) for item in distritos]
    por_distrito = territorio.set_index("cd_distrito_sp").to_dict("index")
    cadastro = pd.DataFrame(entrada.cnes_atual_payload["registros"]).copy()
    cadastro["cd_cnes"] = (
        cadastro.codigo_cnes.astype("string").str.replace(r"\.0$", "", regex=True).str.zfill(7)
    )
    cadastro["cd_municipio_ibge_6"] = cadastro.codigo_municipio.astype("string").str.zfill(6)
    cadastro = cadastro[cadastro.cd_municipio_ibge_6.eq("355030")]
    linhas = []
    for registro in cadastro.to_dict("records"):
        ponto = Point(
            float(registro["longitude_estabelecimento_decimo_grau"]),
            float(registro["latitude_estabelecimento_decimo_grau"]),
        )
        matches = [props for props, poligono in poligonos if poligono.covers(ponto)]
        distrito = matches[0] if len(matches) == 1 else None
        campos = por_distrito.get(str(distrito["cd_distrito_municipal"])) if distrito else None
        linhas.append(
            {
                "cd_cnes": registro["cd_cnes"],
                "cd_municipio_ibge_7": "3550308",
                "cd_distrito_sp": distrito["cd_distrito_municipal"] if distrito else None,
                "id_subprefeitura_sp": campos["id_subprefeitura_sp"] if campos else None,
                "id_crs_sms_sp": campos["id_crs_sms_sp"] if campos else None,
                "id_sts_sms_sp": campos["id_sts_sms_sp"] if campos else None,
                "nm_bairro_cnes_atual": registro.get("bairro_estabelecimento"),
                "vl_latitude_cnes_atual": registro.get("latitude_estabelecimento_decimo_grau"),
                "vl_longitude_cnes_atual": registro.get("longitude_estabelecimento_decimo_grau"),
                "tp_metodo_atribuicao": (
                    "ponto_em_poligono" if len(matches) == 1 else "ponto_fora_da_malha"
                ),
                "fl_atribuicao_ambigua": int(len(matches) != 1),
                "ds_fonte_territorio": "PMSP GeoSampa WFS (EPSG:4326) + API CNES atual",
                "dt_referencia_fonte": campos["dt_referencia_fonte"] if campos else None,
            }
        )

    resultado = pd.DataFrame(linhas).sort_values("cd_cnes").reset_index(drop=True)
    assert len(resultado) == 107
    assert resultado.fl_atribuicao_ambigua.sum() == 6
    assert resultado.cd_distrito_sp.notna().sum() == 101
    return resultado


def dimensao_hospital_alias(dim_hospital: pd.DataFrame) -> pd.DataFrame:
    """Registra aliases governados sem alterar o nome cadastral do CNES."""
    cnes = set(dim_hospital["CNES"].astype("string"))
    assert "2082829" in cnes
    aliases = [
        {
            "cd_cnes": "2082829",
            "nm_alias": "Ermelino Matarazzo",
            "nm_alias_normalizado": _normalizar_busca("Ermelino Matarazzo"),
            "tp_alias": "popular",
            "fl_alias_preferencial": 1,
            "ds_fonte_alias": URL_SMS_ERMELINO,
            "dt_referencia_fonte": "2026-08-13",
        },
        {
            "cd_cnes": "2082829",
            "nm_alias": "Hospital Municipal Ermelino Matarazzo - Prof. Dr. Alípio Corrêa Netto",
            "nm_alias_normalizado": _normalizar_busca(
                "Hospital Municipal Ermelino Matarazzo - Prof. Dr. Alípio Corrêa Netto"
            ),
            "tp_alias": "oficial",
            "fl_alias_preferencial": 1,
            "ds_fonte_alias": URL_SMS_ERMELINO,
            "dt_referencia_fonte": "2026-08-13",
        },
    ]
    resultado = pd.DataFrame(aliases)
    assert resultado.nm_alias_normalizado.is_unique
    return resultado


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

    logger.info(
        "origem da região:\n%s",
        dim_hospital.origem_regiao.value_counts(dropna=False).to_string(),
    )
    logger.info(
        "hospitais com nome atual %d | esfera atual %d | natureza jurídica %d",
        dim_hospital.hospital_nome_atual.notna().sum(),
        dim_hospital.esfera_administrativa_atual.notna().sum(),
        dim_hospital.natureza_juridica.notna().sum(),
    )
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

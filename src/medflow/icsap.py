"""Classificação da Lista Brasileira de ICSAP da Portaria SAS/MS 221/2008.

Os códigos do SIH chegam sem ponto (por exemplo, ``I509`` para ``I50.9``).
Este módulo mantém a regra de classificação versionada e separada do cálculo
dos indicadores para que a lista possa ser auditada de forma independente.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


FONTE_ICSAP = (
    "https://bvsms.saude.gov.br/bvs/saudelegis/sas/2008/"
    "prt0221_17_04_2008.html"
)
VERSAO_LISTA_ICSAP = "Portaria SAS/MS 221/2008"


@dataclass(frozen=True)
class GrupoICSAP:
    codigo: str
    nome: str
    categorias: tuple[str, ...] = ()
    intervalos_categoria: tuple[tuple[str, str], ...] = ()
    codigos_exatos: tuple[str, ...] = ()


GRUPOS_ICSAP: tuple[GrupoICSAP, ...] = (
    GrupoICSAP(
        "01",
        "Doenças preveníveis por imunização e condições sensíveis",
        categorias=("A95", "B05", "B06", "B16", "B26", "B77"),
        intervalos_categoria=(("A15", "A19"), ("A33", "A37"), ("A51", "A53"), ("B50", "B54"), ("I00", "I02")),
        codigos_exatos=("G000",),
    ),
    GrupoICSAP("02", "Gastroenterites infecciosas e complicações", categorias=("E86",), intervalos_categoria=(("A00", "A09"),)),
    GrupoICSAP("03", "Anemia por deficiência de ferro", categorias=("D50",)),
    GrupoICSAP("04", "Deficiências nutricionais", intervalos_categoria=(("E40", "E46"), ("E50", "E64"))),
    GrupoICSAP("05", "Infecções de ouvido, nariz e garganta", categorias=("H66", "J00", "J01", "J02", "J03", "J06", "J31")),
    GrupoICSAP("06", "Pneumonias bacterianas", categorias=("J13", "J14"), codigos_exatos=("J153", "J154", "J158", "J159", "J181")),
    GrupoICSAP("07", "Asma", categorias=("J45", "J46")),
    GrupoICSAP("08", "Doenças pulmonares", categorias=("J20", "J21", "J40", "J41", "J42", "J43", "J44", "J47")),
    GrupoICSAP("09", "Hipertensão", categorias=("I10", "I11")),
    GrupoICSAP("10", "Angina", categorias=("I20",)),
    GrupoICSAP("11", "Insuficiência cardíaca", categorias=("I50", "J81")),
    GrupoICSAP("12", "Doenças cerebrovasculares", categorias=("I69", "G45", "G46"), intervalos_categoria=(("I63", "I67"),)),
    GrupoICSAP("13", "Diabetes mellitus", intervalos_categoria=(("E10", "E14"),)),
    GrupoICSAP("14", "Epilepsias", categorias=("G40", "G41")),
    GrupoICSAP("15", "Infecção no rim e trato urinário", categorias=("N10", "N11", "N12", "N30", "N34"), codigos_exatos=("N390",)),
    GrupoICSAP("16", "Infecção da pele e tecido subcutâneo", categorias=("A46", "L01", "L02", "L03", "L04", "L08")),
    GrupoICSAP("17", "Doença inflamatória de órgãos pélvicos femininos", categorias=("N70", "N71", "N72", "N73", "N75", "N76")),
    GrupoICSAP("18", "Úlcera gastrointestinal", intervalos_categoria=(("K25", "K28"),), codigos_exatos=("K920", "K921", "K922")),
    GrupoICSAP("19", "Doenças relacionadas ao pré-natal e parto", categorias=("O23", "A50"), codigos_exatos=("P350",)),
)


def classificar_icsap(codigos_cid: pd.Series) -> pd.Series:
    """Retorna o código do grupo ICSAP ou ``NA`` quando o CID não pertence à lista."""
    cid = (
        codigos_cid.astype("string")
        .str.upper()
        .str.replace(".", "", regex=False)
        .str.strip()
    )
    categoria = cid.str[:3]
    resultado = pd.Series(pd.NA, index=cid.index, dtype="string")

    for grupo in GRUPOS_ICSAP:
        mascara = categoria.isin(grupo.categorias) | cid.isin(grupo.codigos_exatos)
        for inicio, fim in grupo.intervalos_categoria:
            mascara |= categoria.between(inicio, fim)
        conflito = mascara & resultado.notna()
        if conflito.any():
            exemplos = cid.loc[conflito].drop_duplicates().head(5).tolist()
            raise AssertionError(f"CID classificado em mais de um grupo ICSAP: {exemplos}")
        resultado.loc[mascara] = grupo.codigo

    return resultado


def dimensao_grupo_icsap() -> pd.DataFrame:
    """Materializa os 19 grupos oficiais na ordem da Portaria."""
    return pd.DataFrame(
        {
            "cd_grupo_icsap": [grupo.codigo for grupo in GRUPOS_ICSAP],
            "nm_grupo_icsap": [grupo.nome for grupo in GRUPOS_ICSAP],
        }
    )

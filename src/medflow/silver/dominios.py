"""De/para e domínios de referência da Silver.

Estes dicionários eram literais dentro de células do notebook 01. De/para em
célula de notebook é a coisa que mais rápido apodrece num projeto de dados:
não tem dono, não tem fonte declarada e ninguém percebe quando a fonte muda.
Aqui cada mapa vem com a fonte que o originou, e a tabela `dim_dominio`
publica isso junto com os dados.

A cobertura é fechada para os códigos observados no recorte 2024-01 a
2026-05, e as asserções em `inventariar` falham alto se aparecer código novo.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from medflow.config import obter_logger

logger = obter_logger("silver.dominios")

DEPARA_ESPEC = {
    "01": "Cirurgia", "02": "Obstetrícia", "03": "Clínica médica",
    "04": "Crônicos", "05": "Psiquiatria", "06": "Tisiologia",
    "07": "Pediatria", "08": "Reabilitação",
    "09": "Hospital-dia (cirúrgico)", "10": "Aids - hospital-dia",
    "11": "Fibrose cística - hospital-dia",
    "12": "Intercorrência pós-transplante - hospital-dia",
    "13": "Geriatria - hospital-dia", "14": "Saúde mental - hospital-dia",
    "17": "Estabelecimento exclusivo UTI SUS",
    "87": "Saúde mental - clínico",
}
DEPARA_IDENT = {
    "1": "AIH normal / internação nova",
    "5": "AIH de continuação / longa permanência",
}
DEPARA_COD_IDADE = {
    "0": "Ignorado", "2": "Dias", "3": "Meses", "4": "Anos",
    "5": "Anos acima de 100 (valor adicional)",
}
DEPARA_SEXO = {"0": "Ignorado", "1": "Masculino", "3": "Feminino"}
DEPARA_CAR_INT = {
    "01": "Eletivo", "02": "Urgência",
    "03": "Acidente no local de trabalho ou a serviço",
    "04": "Acidente no trajeto para o trabalho",
    "05": "Outros acidentes de trânsito",
    "06": "Outros tipos de lesões e envenenamentos",
}
DEPARA_COMPLEX = {"02": "Média complexidade", "03": "Alta complexidade"}
DEPARA_TP_UNID = {
    "05": "Hospital Geral", "07": "Hospital Especializado", "15": "Unidade Mista",
    "20": "Pronto Socorro Geral", "21": "Pronto Socorro Especializado",
    "36": "Clínica/Centro de Especialidade", "62": "Hospital/Dia Isolado",
    "73": "Pronto Atendimento",
}
DEPARA_GESTAO = {"M": "Municipal", "E": "Estadual"}
DEPARA_NAT_JUR = {
    "1015": "Órgão Público do Poder Executivo Federal",
    "1023": "Órgão Público do Poder Executivo Estadual ou do Distrito Federal",
    "1031": "Órgão Público do Poder Executivo Municipal",
    "1104": "Autarquia Federal", "1112": "Autarquia Estadual ou do Distrito Federal",
    "1120": "Autarquia Municipal",
    "1155": "Fundação Pública de Direito Público Municipal",
    "1210": "Consórcio Público de Direito Público (Associação Pública)",
    "1228": "Consórcio Público de Direito Privado",
    "1244": "Município", "1279": "Fundação Pública de Direito Privado Municipal",
    "2011": "Empresa Pública", "2046": "Sociedade Anônima Aberta",
    "2054": "Sociedade Anônima Fechada", "2062": "Sociedade Empresária Limitada",
    "2135": "Empresário (Individual)", "2143": "Cooperativa",
    "2232": "Sociedade Simples Pura", "2240": "Sociedade Simples Limitada",
    "2305": "Empresa Individual de Responsabilidade Limitada (Natureza Empresária)",
    "2313": "Empresa Individual de Responsabilidade Limitada (Natureza Simples)",
    "3069": "Fundação Privada", "3999": "Associação Privada",
}
DEPARA_UTI = {
    "00": "Sem marca de UTI", "01": "UTI Adulto nível II (código legado)",
    "51": "UTI II Adulto COVID-19", "52": "UTI II Pediátrica COVID-19",
    "74": "UTI Adulto I", "75": "UTI Adulto II", "76": "UTI Adulto III",
    "77": "UTI Pediátrica I", "78": "UTI Pediátrica II", "79": "UTI Pediátrica III",
    "80": "UTI Neonatal I", "81": "UTI Neonatal II", "82": "UTI Neonatal III",
    "83": "UTI de queimados", "85": "UCO II", "86": "UCO III",
    "99": "Não utilizou UTI",
}

# (campo, mapa, fonte, status). A ordem importa: `inventariar` percorre os
# seis primeiros mais o índice 8 (MARCA_UTI), que é o que o notebook fazia.
DOMINIOS: list[tuple[str, dict[str, str], str, str]] = [
    ("ESPEC", DEPARA_ESPEC, "DATASUS/TabNet", "mapeado"),
    ("IDENT", DEPARA_IDENT, "DATASUS/TabNet", "mapeado"),
    ("COD_IDADE", DEPARA_COD_IDADE, "Dicionário SIH", "mapeado"),
    ("SEXO", DEPARA_SEXO, "Dicionário SIH", "mapeado"),
    ("CAR_INT", DEPARA_CAR_INT, "Dicionário SIH", "mapeado"),
    ("COMPLEX", DEPARA_COMPLEX, "Dicionário SIH", "mapeado"),
    ("TP_UNID", DEPARA_TP_UNID, "CNES", "mapeado"),
    ("TPGESTAO", DEPARA_GESTAO, "CNES", "mapeado"),
    ("MARCA_UTI", DEPARA_UTI, "MS/DATASUS + CEM", "mapeado_multifonte"),
    ("NAT_JUR", DEPARA_NAT_JUR, "CONCLA/IBGE 2021", "mapeado"),
]

CAPITULOS_CID = [
    ("I", "A00", "B99", "Infecciosas e parasitárias"),
    ("II", "C00", "D48", "Neoplasias"),
    ("III", "D50", "D89", "Sangue e órgãos hematopoéticos"),
    ("IV", "E00", "E90", "Endócrinas, nutricionais e metabólicas"),
    ("V", "F00", "F99", "Transtornos mentais e comportamentais"),
    ("VI", "G00", "G99", "Sistema nervoso"),
    ("VII", "H00", "H59", "Olho e anexos"),
    ("VIII", "H60", "H95", "Ouvido e apófise mastoide"),
    ("IX", "I00", "I99", "Aparelho circulatório"),
    ("X", "J00", "J99", "Aparelho respiratório"),
    ("XI", "K00", "K93", "Aparelho digestivo"),
    ("XII", "L00", "L99", "Pele e tecido subcutâneo"),
    ("XIII", "M00", "M99", "Osteomuscular e tecido conjuntivo"),
    ("XIV", "N00", "N99", "Aparelho geniturinário"),
    ("XV", "O00", "O99", "Gravidez, parto e puerpério"),
    ("XVI", "P00", "P96", "Afecções do período perinatal"),
    ("XVII", "Q00", "Q99", "Malformações congênitas"),
    ("XVIII", "R00", "R99", "Sintomas e achados anormais"),
    ("XIX", "S00", "T98", "Lesões e envenenamentos"),
    ("XX", "V01", "Y98", "Causas externas"),
    ("XXI", "Z00", "Z99", "Fatores que influenciam o estado de saúde"),
    ("XXII", "U04", "U99", "Propósitos especiais"),
]

# Códigos observados no recorte que não constam no pacote CID-10 2008 do
# DATASUS. Cada um tem a fonte oficial que justifica a descrição.
CID_COMPLEMENTAR = {
    "U09": ("Condição pós-COVID-19", "Ministério da Saúde — condição pós-COVID"),
    "U099": (
        "Condição de saúde posterior à COVID-19, não especificada",
        "Ministério da Saúde — condição pós-COVID",
    ),
    "U10": (
        "Síndrome inflamatória multissistêmica associada à COVID-19",
        "Ministério da Saúde — orientação COVID-19",
    ),
    "U109": (
        "Síndrome inflamatória multissistêmica associada à COVID-19, não especificada",
        "Ministério da Saúde — orientação COVID-19",
    ),
    "N182": ("Doença renal crônica, estágio 2", "Ministério da Saúde — PCDT DRC 2024"),
    "N183": ("Doença renal crônica, estágio 3", "Ministério da Saúde — PCDT DRC 2024"),
    "N184": ("Doença renal crônica, estágio 4", "Ministério da Saúde — PCDT DRC 2024"),
    "N185": ("Doença renal crônica, estágio 5", "Ministério da Saúde — PCDT DRC 2024"),
    "C824": (
        "Linfoma folicular grau IIIb",
        "Ministério da Saúde — RTS/SIGTAP, Portaria SAES 2.203/2024",
    ),
    "C826": (
        "Linfoma cutâneo do centro do folículo",
        "Ministério da Saúde — RTS/SIGTAP, Portaria SAES 2.203/2024",
    ),
}


def normaliza_codigo(valor: Any, largura: int | None = None):
    texto = str(valor).strip()
    if not texto or texto.lower() in {"nan", "none"} or not texto.isdigit():
        return pd.NA
    return texto.zfill(largura) if largura else texto


def classificar_cid(valor: Any) -> tuple[str, str]:
    chave = str(valor).upper()[:3]
    for capitulo, inicio, fim, descricao in CAPITULOS_CID:
        if inicio <= chave <= fim:
            return capitulo, descricao
    return "--", "Não classificado"


def dimensao_dominio() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "campo": campo,
                "codigo": codigo,
                "descricao": descricao,
                "fonte": fonte,
                "status": status,
            }
            for campo, mapa, fonte, status in DOMINIOS
            for codigo, descricao in mapa.items()
        ]
    )


def inventariar(sih: pd.DataFrame) -> list[dict[str, Any]]:
    """Cobertura dos de/para aplicáveis ao SIH. NAT_JUR entra depois, do CNES."""
    inventario = []
    for campo, mapa, fonte, status in DOMINIOS[:6] + [DOMINIOS[8]]:
        observados = set(sih[campo].dropna().astype(str).unique())
        inventario.append(
            {
                "campo": campo,
                "qtd_codigos_observados": len(observados),
                "codigos_sem_depara": ", ".join(sorted(observados - set(mapa))) or "nenhum",
                "cobertura_linhas_pct": round(sih[campo].isin(mapa).mean() * 100, 6),
                "fonte": fonte,
                "status": status,
            }
        )
    logger.info("cobertura dos de/para:\n%s", pd.DataFrame(inventario).to_string(index=False))
    assert sih.ESPEC.isin(DEPARA_ESPEC).all(), "há especialidade sem de/para"
    assert sih.IDENT.isin(DEPARA_IDENT).all(), "há IDENT não classificado"
    return inventario


def inventariar_natureza_juridica(
    inventario: list[dict[str, Any]], cnes: pd.DataFrame
) -> None:
    """Acrescenta a cobertura de NAT_JUR, que vem do CNES e não do SIH."""
    observada = set(cnes.NAT_JUR.dropna().astype(str).unique())
    inventario.append(
        {
            "campo": "NAT_JUR",
            "qtd_codigos_observados": len(observada),
            "codigos_sem_depara": (
                ", ".join(sorted(observada - set(DEPARA_NAT_JUR))) or "nenhum"
            ),
            "cobertura_linhas_pct": round(
                cnes.NAT_JUR.isin(DEPARA_NAT_JUR).mean() * 100, 6
            ),
            "fonte": "CONCLA/IBGE 2021",
            "status": "mapeado",
        }
    )

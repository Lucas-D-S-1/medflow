"""Leitura da série mensal do IPCA preservada na camada Bronze."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


FONTE_IPCA = "https://sidra.ibge.gov.br/tabela/1737"
VARIAVEL_NUMERO_INDICE = "2266"


def carregar_ipca(caminho: Path, competencias: pd.Series) -> pd.DataFrame:
    """Lê o número-índice do IPCA e calcula fatores para o último mês do recorte."""
    if not caminho.is_file():
        raise RuntimeError(
            f"Referência IPCA ausente: {caminho}. "
            "Execute notebooks/00_extracao_dados.ipynb antes de gerar a Gold."
        )

    payload = json.loads(caminho.read_text(encoding="utf-8"))
    if len(payload) < 2:
        raise RuntimeError("Resposta SIDRA do IPCA não contém observações.")

    quadro = pd.DataFrame(payload[1:])
    if not {"D3C", "V"}.issubset(quadro.columns):
        raise RuntimeError("Esquema inesperado na resposta SIDRA do IPCA.")
    quadro = quadro.rename(columns={"D3C": "cd_competencia", "V": "nr_indice_ipca"})
    quadro = quadro[["cd_competencia", "nr_indice_ipca"]].copy()
    quadro["cd_competencia"] = quadro.cd_competencia.astype("string")
    quadro["nr_indice_ipca"] = pd.to_numeric(
        quadro.nr_indice_ipca.astype("string").str.replace(",", ".", regex=False),
        errors="raise",
    )
    quadro = quadro.drop_duplicates("cd_competencia", keep="last")

    esperadas = pd.Index(competencias.astype("string").drop_duplicates().sort_values())
    ausentes = esperadas.difference(quadro.cd_competencia)
    if len(ausentes):
        raise RuntimeError(f"IPCA sem as competências necessárias: {ausentes.tolist()}")
    quadro = quadro[quadro.cd_competencia.isin(esperadas)].sort_values("cd_competencia")
    referencia = str(quadro.cd_competencia.max())
    indice_referencia = float(
        quadro.loc[quadro.cd_competencia.eq(referencia), "nr_indice_ipca"].iloc[0]
    )
    quadro["nr_fator_correcao_ipca"] = indice_referencia / quadro.nr_indice_ipca
    quadro["cd_competencia_preco_referencia"] = referencia
    return quadro.reset_index(drop=True)

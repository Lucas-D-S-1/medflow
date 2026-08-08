"""Camada Silver: tratamento, dimensões, fatos e de/para.

Toda regra de negócio do MedFlow que não é indicador vive aqui. A Bronze
preserva, a Silver interpreta, a Gold calcula.

A ordem das etapas reproduz a do notebook 01, e não é livre: `dim_hospital`
precisa existir antes do fato, porque é ela que carrega a região oficial; e a
reconciliação precisa vir depois dos agregados, porque compara os dois.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from medflow.config import obter_logger
from medflow.silver.agregados import (
    agregar_base,
    base_hospital_cid,
    base_hospital_especialidade_mes,
    base_hospital_mes,
    reconciliar,
    status_indices,
)
from medflow.silver.carga import EntradaSilver, carregar
from medflow.silver.dimensoes import (
    dimensao_cid,
    dimensao_especialidade,
    dimensao_hospital,
    dimensao_municipio,
    dimensao_tempo,
)
from medflow.silver.dominios import (
    dimensao_dominio,
    inventariar,
    inventariar_natureza_juridica,
)
from medflow.silver.fatos import fato_internacao, fato_leito_mensal

logger = obter_logger("silver")

__all__ = [
    "EntradaSilver",
    "agregar_base",
    "carregar",
    "construir",
    "executar",
]


def construir(entrada: EntradaSilver) -> dict[str, Any]:
    """Constrói dimensões, fatos e agregados, e reconcilia contra a Bronze."""
    entrada.inventario = inventariar(entrada.sih)

    dim_tempo = dimensao_tempo(entrada.competencias)
    dim_especialidade = dimensao_especialidade(entrada.sih)
    dim_cid = dimensao_cid(entrada)
    dim_hospital, regioes_oficiais = dimensao_hospital(entrada)
    dim_municipio = dimensao_municipio(entrada, regioes_oficiais)
    dim_dominio = dimensao_dominio()

    # NAT_JUR vem do CNES, então só entra no inventário depois de dim_hospital
    # ter normalizado as colunas do cadastro.
    inventariar_natureza_juridica(entrada.inventario, entrada.cnes)

    fato = fato_internacao(entrada.sih, dim_hospital, dim_cid)
    hospitais_sih = set(entrada.sih.CNES.unique())
    leitos = fato_leito_mensal(entrada.cnes, dim_tempo, hospitais_sih)

    hospital_mes = base_hospital_mes(fato, leitos, dim_hospital)
    hospital_espec_mes = base_hospital_especialidade_mes(fato, dim_hospital)
    internacoes_novas = fato[fato.fl_internacao_nova.eq(1)]
    hospital_cid = base_hospital_cid(internacoes_novas)

    metricas = reconciliar(
        manifesto=entrada.manifesto,
        sih=entrada.sih,
        cnes=entrada.cnes,
        fato=fato,
        dim_hospital=dim_hospital,
        hospital_mes=hospital_mes,
        hospital_espec_mes=hospital_espec_mes,
        hospital_cid=hospital_cid,
        internacoes_novas=internacoes_novas,
    )
    indices = status_indices()
    logger.info("reconciliação da Silver:\n%s", pd.Series(metricas).to_string())
    logger.info("contrato dos índices:\n%s", indices.to_string(index=False))

    return {
        "saidas": {
            "dim_tempo": dim_tempo,
            "dim_hospital": dim_hospital,
            "dim_municipio": dim_municipio,
            "dim_especialidade": dim_especialidade,
            "dim_cid": dim_cid,
            "dim_dominio": dim_dominio,
            "fato_internacao": fato,
            "fato_leitos_mensal": leitos,
        },
        "metricas": metricas,
        "status_indices": indices,
    }


def executar(*, base: Path, sobrescrever: bool = False) -> dict[str, Any]:
    """Executa a Silver inteira e publica as saídas canônicas."""
    from medflow.contratos import publicar_silver

    entrada = carregar(base)
    construido = construir(entrada)

    saidas_canonicas = publicar_silver(
        base=base,
        saidas_originais=construido["saidas"],
        inventario=entrada.inventario,
        metricas=construido["metricas"],
        status_indices=construido["status_indices"],
        manifesto_bronze=entrada.manifesto,
        sobrescrever=sobrescrever,
    )
    logger.info("SILVER VÁLIDA — saídas e documentação gravadas")
    return {
        "metricas": construido["metricas"],
        "tabelas": {nome: len(frame) for nome, frame in saidas_canonicas.items()},
    }

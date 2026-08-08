"""Manifesto e validação da Bronze.

O manifesto é o que torna a camada auditável: recorte efetivo, evolução de
esquema, fontes com URL, doze reconciliações e o SHA-256 de cada artefato.
As reconciliações falham alto — se uma delas não bate, a Bronze não é
declarada válida e a Silver não deve ser executada.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from typing import Any

import pyarrow.parquet as pq

from medflow.bronze.contexto import FTP_DIRS, ContextoBronze
from medflow.bronze.referencias import (
    URL_CID10,
    URL_CNES_MODELO,
    URL_CONCLA,
    URL_IBGE,
    URL_MALHA_IBGE,
    URL_REGIOES,
    URL_REGIOES_CSV,
    ReferenciasBronze,
)
from medflow.config import obter_logger

logger = obter_logger("bronze.manifesto")


def hash_arquivo(caminho: Path, bloco: int = 1024 * 1024) -> str:
    digest = sha256()
    with caminho.open("rb") as arquivo:
        for parte in iter(lambda: arquivo.read(bloco), b""):
            digest.update(parte)
    return digest.hexdigest()


def _reconciliar(
    contexto: ContextoBronze, ref: ReferenciasBronze
) -> tuple[dict[str, int], dict[str, bool]]:
    sih_meta = pq.ParquetFile(contexto.arquivo_sih)
    cnes_meta = pq.ParquetFile(contexto.arquivo_cnes)

    checks = {
        "arquivos_rd_cache": sum(
            contexto.caminho_dbc("RD", a, m).exists() for a, m in contexto.competencias
        ),
        "arquivos_lt_cache": sum(
            contexto.caminho_dbc("LT", a, m).exists() for a, m in contexto.competencias
        ),
        "linhas_sih": sih_meta.metadata.num_rows,
        "colunas_sih": len(sih_meta.schema_arrow.names),
        "linhas_cnes": cnes_meta.metadata.num_rows,
        "colunas_cnes": len(cnes_meta.schema_arrow.names),
        "municipios_ibge": ref.municipios_ibge,
        "municipios_regiao_saude_ms": len(ref.regioes),
        "municipios_regiao_saude_ms_csv": ref.municipios_regiao_csv,
        "estabelecimentos_cnes_atuais": len(ref.cnes_atual_payload["registros"]),
        "arquivos_pacote_cid10": len(ref.arquivos_cid),
        "arquivos_malha_municipal_ibge": len(ref.arquivos_malha),
    }
    total_competencias = len(contexto.competencias)
    validacoes = {
        "arquivos_rd_cache": checks["arquivos_rd_cache"] == total_competencias,
        "arquivos_lt_cache": checks["arquivos_lt_cache"] == total_competencias,
        "linhas_sih": checks["linhas_sih"] > 0,
        "colunas_sih": checks["colunas_sih"] >= 116,
        "linhas_cnes": checks["linhas_cnes"] > 0,
        "colunas_cnes": checks["colunas_cnes"] == 31,
        "municipios_ibge": checks["municipios_ibge"] == 645,
        "municipios_regiao_saude_ms": checks["municipios_regiao_saude_ms"] == 645,
        "municipios_regiao_saude_ms_csv": checks["municipios_regiao_saude_ms_csv"] == 645,
        "estabelecimentos_cnes_atuais": (
            checks["estabelecimentos_cnes_atuais"] == len(ref.codigos_cnes)
        ),
        "arquivos_pacote_cid10": checks["arquivos_pacote_cid10"] == 6,
        "arquivos_malha_municipal_ibge": checks["arquivos_malha_municipal_ibge"] == 5,
    }
    return checks, validacoes


def gerar(
    contexto: ContextoBronze,
    ref: ReferenciasBronze,
    evolucao_esquema: dict[str, Any],
) -> dict[str, Any]:
    """Reconcilia, grava o MANIFESTO.json e devolve o manifesto."""
    checks, validacoes = _reconciliar(contexto, ref)
    for chave, valor in checks.items():
        nivel = logger.info if validacoes[chave] else logger.error
        nivel("%-32s %12s | %s", chave, f"{valor:,}", "OK" if validacoes[chave] else "FALHOU")
    assert all(validacoes.values()), {
        chave: checks[chave] for chave, ok in validacoes.items() if not ok
    }

    arquivos = {
        "sih": contexto.arquivo_sih,
        "cnes": contexto.arquivo_cnes,
        **ref.arquivos,
    }
    competencias = contexto.competencias_atuais
    manifesto = {
        "camada": "bronze",
        "gerado_em_utc": datetime.now(UTC).isoformat(),
        "recorte": {
            "uf": contexto.uf,
            "periodo_solicitado": [
                f"{contexto.periodo_inicial[0]}{contexto.periodo_inicial[1]:02d}",
                f"{contexto.periodo_final[0]}{contexto.periodo_final[1]:02d}",
            ],
            "ultima_competencia_comum": competencias[-1],
            "competencias": competencias,
        },
        "atualizacao": (
            "descoberta remota; download incremental; "
            "consolidação promovida por arquivo parcial"
        ),
        "evolucao_esquema": evolucao_esquema,
        "principio": "fontes preservadas; sem regra de negócio, de/para ou filtro analítico",
        "fontes": {
            "SIH_RD": FTP_DIRS["RD"],
            "CNES_LT": FTP_DIRS["LT"],
            "IBGE_municipios": URL_IBGE,
            "MS_DEMAS_regioes_saude": URL_REGIOES,
            "MS_DEMAS_regioes_saude_csv": URL_REGIOES_CSV,
            "IBGE_malha_municipal_2024": URL_MALHA_IBGE,
            "MS_DEMAS_cnes_atual": URL_CNES_MODELO,
            "DATASUS_CID10": URL_CID10,
            "IBGE_CONCLA_natureza_juridica": URL_CONCLA,
            "IBGE_IPCA_tabela_1737_variavel_2266": ref.url_ipca,
        },
        "checks": checks,
        "arquivos": {
            nome: {
                "caminho": caminho.name,
                "bytes": caminho.stat().st_size,
                "sha256": hash_arquivo(caminho),
            }
            for nome, caminho in arquivos.items()
        },
    }
    contexto.arquivo_manifesto.write_text(
        json.dumps(manifesto, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return manifesto

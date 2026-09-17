"""Gera o snapshot completo de diagnósticos diretamente do novo mart local.

Não acessa Oracle nem ORDS. Use ``--conferir`` para validar que o arquivo
versionado é byte a byte reproduzível a partir do parquet seletivo.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import pandas as pd


def _numero(valor: Any, casas: int | None = None) -> int | float | None:
    if pd.isna(valor):
        return None
    if casas is None:
        return int(valor)
    return round(float(valor), casas)


def gerar(base: Path, cnes: str, competencia: str, especialidade: str) -> str:
    origem = (
        base
        / "data/gold/marts/mart_indicador_hospital_especialidade_cid_mensal.parquet"
    )
    mart = pd.read_parquet(
        origem,
        filters=[
            ("cd_cnes", "==", cnes),
            ("cd_competencia", "==", competencia),
            ("cd_especialidade_sih", "==", especialidade),
        ],
    ).sort_values(
        ["qt_dia_permanencia_soma", "cd_cid_principal"],
        ascending=[False, True],
        kind="stable",
    )
    if mart.empty:
        raise SystemExit("recorte não encontrado no mart")

    meta = json.loads(
        (
            base
            / "data/gold/qualidade/METADADOS_DIAGNOSTICO_ESPECIALIDADE_MENSAL.json"
        ).read_text(encoding="utf-8")
    )
    primeira = mart.iloc[0]
    itens = [
        {
            "cnes": str(linha.cd_cnes),
            "specialty_code": str(linha.cd_especialidade_sih),
            "specialty_name": str(linha.nm_especialidade),
            "cid_code": str(linha.cd_cid_principal),
            "cid_description": str(linha.ds_cid),
            "chapter_code": str(linha.cd_capitulo_cid),
            "chapter_description": str(linha.ds_capitulo_cid),
            "new_admissions": _numero(linha.qt_internacao_nova),
            "stay_days_total": _numero(linha.qt_dia_permanencia_soma),
            "average_stay_days": _numero(linha.nr_permanencia_media_hospital, 6),
            "admission_share_percent": _numero(linha.pc_internacao_especialidade, 6),
            "stay_day_share_percent": _numero(
                linha.pc_dia_permanencia_especialidade, 6
            ),
            "benchmark_admissions": _numero(linha.qt_internacao_benchmark),
            "benchmark_stay_days_total": _numero(
                linha.qt_dia_permanencia_benchmark
            ),
            "benchmark_hospitals": _numero(linha.qt_hospital_benchmark),
            "average_stay_benchmark": _numero(
                linha.nr_permanencia_media_benchmark, 6
            ),
            "ipr": _numero(linha.nr_ipr, 6),
            "sample_status": str(linha.st_amostra),
        }
        for linha in mart.itertuples(index=False)
    ]
    ano = int(competencia[:4])
    mes = int(competencia[4:])
    corpo = {
        "status": "ok",
        "source": "snapshot",
        "database_time": meta["gerado_em_utc"],
        "contract_version": "0.5.0",
        "data_through": f"{ano:04d}-{mes:02d}",
        "filters": {
            "cnes": cnes,
            "year": ano,
            "month": mes,
            "specialty_code": especialidade,
            "order_by": "dias",
        },
        "hospital": {
            "cnes": cnes,
            "region_code": str(primeira.cd_regiao_saude),
            "region_name": str(primeira.nm_regiao_saude),
            "macroregion_code": str(primeira.cd_macrorregiao_saude),
            "macroregion_name": str(primeira.nm_macrorregiao_saude),
            "specialty_code": especialidade,
            "specialty_name": str(primeira.nm_especialidade),
            "specialty_new_admissions_total": int(mart.qt_internacao_nova.sum()),
            "specialty_stay_days_total": int(
                mart.qt_dia_permanencia_soma.sum()
            ),
        },
        "pagination": {
            "limit": 2000,
            "offset": 0,
            "count": len(itens),
            "has_more": False,
            "order": "stay_days_desc",
        },
        "items": itens,
    }
    return json.dumps(corpo, ensure_ascii=False, indent=2, allow_nan=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--cnes", default="3012212")
    parser.add_argument("--competencia", default="202606")
    parser.add_argument("--especialidade", default="07")
    parser.add_argument("--conferir", action="store_true")
    args = parser.parse_args()
    destino = (
        args.base
        / "web/src/mocks"
        / f"hospital-diagnosticos-especialidade-{args.cnes}-{args.especialidade}.json"
    )
    conteudo = gerar(args.base, args.cnes, args.competencia, args.especialidade)
    if args.conferir:
        if not destino.exists() or destino.read_text(encoding="utf-8") != conteudo:
            print(f"snapshot desatualizado: {destino}")
            return 1
        print(f"snapshot conferido: {destino}")
        return 0
    destino.write_text(conteudo, encoding="utf-8")
    print(f"snapshot gerado: {destino}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

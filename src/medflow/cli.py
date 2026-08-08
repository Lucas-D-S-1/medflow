"""Linha de comando do MedFlow.

Expõe as etapas que já existem como pacote. Bronze e Silver ainda vivem nos
notebooks 00 e 01 e entram aqui na fatia 4 da reorganização; até lá, os
subcomandos correspondentes falham com uma mensagem explícita em vez de
fingir que rodaram.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def raiz_padrao() -> Path:
    """A raiz do repositório, dois níveis acima de src/medflow."""
    return Path(__file__).resolve().parents[2]


def _imprimir(resultado: object) -> None:
    print(json.dumps(resultado, ensure_ascii=False, indent=2, default=str))


def _nao_implementado(camada: str) -> int:
    print(
        f"A camada {camada} ainda é executada pelo notebook correspondente em "
        f"notebooks/. A extração para o pacote é a fatia 4 do plano de "
        f"reorganização.",
        file=sys.stderr,
    )
    return 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="medflow", description=__doc__)
    parser.add_argument(
        "--base",
        type=Path,
        default=raiz_padrao(),
        help="raiz do repositório (padrão: a raiz deduzida do próprio pacote)",
    )
    sub = parser.add_subparsers(dest="comando", required=True)

    sub.add_parser("bronze", help="ingestão fiel das fontes oficiais")
    sub.add_parser("silver", help="dimensões, fatos e de/paras")
    sub.add_parser("gold", help="marts e indicadores")
    sub.add_parser("geografia", help="regiões, população e malhas")
    sub.add_parser("validar", help="validação integrada das três camadas")

    p_inv = sub.add_parser("inventario", help="inventário SHA-256 dos artefatos")
    p_inv.add_argument(
        "--destino",
        type=Path,
        default=None,
        help="arquivo de saída (padrão: contracts/INVENTARIO.json)",
    )

    args = parser.parse_args(argv)
    base: Path = args.base

    if args.comando in {"bronze", "silver"}:
        return _nao_implementado(args.comando.capitalize())

    if args.comando == "gold":
        from medflow.gold import calcular_gold

        marts = calcular_gold(base=base, sobrescrever=True)
        _imprimir({nome: len(frame) for nome, frame in marts.items()})
        return 0

    if args.comando == "geografia":
        from medflow.geografia import gerar_geografia

        _imprimir(gerar_geografia(base=base))
        return 0

    if args.comando == "validar":
        from medflow.validar import validar

        _imprimir(validar(base))
        return 0

    if args.comando == "inventario":
        from medflow.inventario import gerar_inventario

        destino = args.destino or base / "contracts" / "INVENTARIO.json"
        resultado = gerar_inventario(base, destino)
        _imprimir(
            {
                "destino": str(destino.relative_to(base)),
                "quantidade_arquivos": resultado["quantidade_arquivos"],
                "bytes": resultado["bytes"],
            }
        )
        return 0

    parser.error(f"comando não tratado: {args.comando}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

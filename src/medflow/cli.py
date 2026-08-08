"""Linha de comando do MedFlow.

Expõe o pipeline inteiro: `bronze`, `silver`, `gold` e `geografia` produzem as
camadas; `validar` confere as três contra os contratos; `inventario` grava o
SHA-256 de cada artefato.

As camadas são idempotentes e não refazem o que já está no lugar. Use
`--sobrescrever` na Bronze e na Silver para forçar a reconstrução — é o que
prova a paridade quando o código muda de lugar.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def raiz_padrao() -> Path:
    """A raiz do repositório, dois níveis acima de src/medflow."""
    return Path(__file__).resolve().parents[2]


def _imprimir(resultado: object) -> None:
    print(json.dumps(resultado, ensure_ascii=False, indent=2, default=str))


def _sobrescrever(args: argparse.Namespace) -> bool:
    return bool(getattr(args, "sobrescrever", False))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="medflow", description=__doc__)
    parser.add_argument(
        "--base",
        type=Path,
        default=raiz_padrao(),
        help="raiz do repositório (padrão: a raiz deduzida do próprio pacote)",
    )
    sub = parser.add_subparsers(dest="comando", required=True)

    p_bronze = sub.add_parser("bronze", help="ingestão fiel das fontes oficiais")
    p_bronze.add_argument(
        "--sobrescrever",
        action="store_true",
        help="reconsolida os Parquet mesmo que já cubram o recorte atual",
    )
    p_silver = sub.add_parser("silver", help="dimensões, fatos e de/paras")
    p_silver.add_argument("--sobrescrever", action="store_true")
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

    if args.comando == "bronze":
        from medflow.bronze import executar as executar_bronze

        manifesto = executar_bronze(base=base, sobrescrever=_sobrescrever(args))
        _imprimir(manifesto["checks"])
        return 0

    if args.comando == "silver":
        from medflow.silver import executar as executar_silver

        _imprimir(executar_silver(base=base, sobrescrever=_sobrescrever(args)))
        return 0

    if args.comando == "gold":
        from medflow.geografia import gerar_geografia
        from medflow.gold import calcular_gold

        # As duas etapas escrevem o mesmo contrato: calcular_gold grava os 7
        # marts e gerar_geografia acrescenta as 2 dimensões geográficas. Rodar
        # só a primeira trunca o contrato de 9 para 7 tabelas e apaga as
        # dimensões do DICIONARIO. São uma camada só, e rodam juntas.
        marts = calcular_gold(base=base, sobrescrever=True)
        geografia = gerar_geografia(base=base)
        _imprimir(
            {
                "marts": {nome: len(frame) for nome, frame in marts.items()},
                "geografia": geografia,
            }
        )
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

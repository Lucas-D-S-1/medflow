"""Camada Bronze: ingestão fiel das fontes oficiais.

A Bronze só preserva e muda de formato. Nenhuma regra de negócio, de/para ou
filtro analítico vive aqui — isso é responsabilidade da Silver.

A ordem importa e não é arbitrária: as referências dependem do Parquet do SIH,
porque a lista de estabelecimentos a consultar no CNES sai dele.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from medflow.bronze.contexto import ContextoBronze
from medflow.bronze.conversao import consolidar_todos, descomprimir
from medflow.bronze.ingestao import baixar
from medflow.bronze.manifesto import gerar as gerar_manifesto
from medflow.bronze.referencias import baixar_todas

__all__ = [
    "ContextoBronze",
    "baixar",
    "consolidar_todos",
    "descomprimir",
    "executar",
    "gerar_manifesto",
    "baixar_todas",
]


def executar(*, base: Path, sobrescrever: bool = False) -> dict[str, Any]:
    """Executa a Bronze inteira e devolve o manifesto."""
    from medflow.contratos import documentar_bronze

    contexto = ContextoBronze(base=base, sobrescrever=sobrescrever)
    contexto.criar_diretorios()
    contexto.descobrir()

    print("origem DBC       :", contexto.dir_dbc.relative_to(base))
    print("intermediário DBF:", contexto.dir_dbf.relative_to(base))
    print("bronze Parquet   :", contexto.dir_parquet.relative_to(base))
    print("recorte:", contexto.uf, contexto.competencias[0], "a", contexto.competencias[-1])
    print("competências comuns:", len(contexto.competencias))
    print(
        "última RD:", max(contexto.disponiveis["RD"]),
        "| última LT:", max(contexto.disponiveis["LT"]),
    )

    baixar(contexto)
    descomprimir(contexto)
    evolucao_esquema = consolidar_todos(contexto)
    referencias = baixar_todas(contexto)

    manifesto = gerar_manifesto(contexto, referencias, evolucao_esquema)
    documentar_bronze(base=base, manifesto=manifesto)
    print("\nBRONZE VÁLIDA — ingestão completa.")
    return manifesto

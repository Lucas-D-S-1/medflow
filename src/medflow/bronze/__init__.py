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
from medflow.config import Config, obter_logger

logger = obter_logger("bronze")

__all__ = [
    "ContextoBronze",
    "baixar",
    "consolidar_todos",
    "descomprimir",
    "executar",
    "gerar_manifesto",
    "baixar_todas",
]


def executar(
    *,
    config: Config | None = None,
    base: Path | None = None,
    sobrescrever: bool = False,
) -> dict[str, Any]:
    """Executa a Bronze inteira e devolve o manifesto.

    Passe `config` para controlar o recorte. `base` sozinho continua aceito
    por compatibilidade com os notebooks e usa o recorte do ambiente.
    """
    from medflow.contratos import documentar_bronze

    if config is None:
        config = Config.do_ambiente(base=base)
    base = config.base

    contexto = ContextoBronze.do_config(config, sobrescrever=sobrescrever)
    contexto.criar_diretorios()
    contexto.descobrir()

    logger.info("origem DBC        %s", contexto.dir_dbc.relative_to(base))
    logger.info("intermediário DBF %s", contexto.dir_dbf.relative_to(base))
    logger.info("bronze Parquet    %s", contexto.dir_parquet.relative_to(base))
    logger.info(
        "recorte efetivo   %s %s a %s (%d competências)",
        contexto.uf,
        contexto.competencias[0],
        contexto.competencias[-1],
        len(contexto.competencias),
    )
    logger.info(
        "última publicada  RD %s | LT %s",
        max(contexto.disponiveis["RD"]),
        max(contexto.disponiveis["LT"]),
    )

    baixar(contexto)
    descomprimir(contexto)
    evolucao_esquema = consolidar_todos(contexto)
    referencias = baixar_todas(contexto)

    manifesto = gerar_manifesto(contexto, referencias, evolucao_esquema)
    documentar_bronze(base=base, manifesto=manifesto)
    logger.info("BRONZE VÁLIDA — ingestão completa")
    return manifesto

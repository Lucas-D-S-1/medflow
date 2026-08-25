"""Inventário verificável de artefatos antes e depois de migrações."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path


def hash_arquivo(caminho: Path, bloco: int = 4 * 1024 * 1024) -> str:
    digest = sha256()
    with caminho.open("rb") as arquivo:
        for parte in iter(lambda: arquivo.read(bloco), b""):
            digest.update(parte)
    return digest.hexdigest()


def gerar_inventario(base: Path, destino: Path) -> dict:
    raizes = [
        base / "data",
        base / "notebooks",
        base / "docs" / "qualidade" / "figuras",
        base / "docs" / "qualidade" / "notebooks_executados",
    ]
    arquivos = sorted(
        caminho
        for raiz in raizes
        if raiz.exists()
        for caminho in raiz.rglob("*")
        if caminho.is_file()
    )
    inventario = {
        "gerado_em_utc": datetime.now(UTC).isoformat(),
        "base": ".",
        "quantidade_arquivos": len(arquivos),
        "bytes": sum(caminho.stat().st_size for caminho in arquivos),
        "arquivos": [
            {
                "caminho": str(caminho.relative_to(base)),
                "bytes": caminho.stat().st_size,
                "sha256": hash_arquivo(caminho),
            }
            for caminho in arquivos
        ],
    }
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(
        json.dumps(inventario, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return inventario


if __name__ == "__main__":
    # src/medflow/inventario.py -> a raiz do repositório é dois níveis acima
    raiz = Path(__file__).parents[2]
    resultado = gerar_inventario(
        raiz,
        raiz / "contracts" / "INVENTARIO.json",
    )
    print(
        f"{resultado['quantidade_arquivos']} arquivos, "
        f"{resultado['bytes']:,} bytes inventariados"
    )

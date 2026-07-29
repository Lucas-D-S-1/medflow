"""Inventário verificável de artefatos antes e depois de migrações."""

from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path


def hash_arquivo(caminho: Path, bloco: int = 4 * 1024 * 1024) -> str:
    digest = sha256()
    with caminho.open("rb") as arquivo:
        for parte in iter(lambda: arquivo.read(bloco), b""):
            digest.update(parte)
    return digest.hexdigest()


def gerar_inventario(base: Path, destino: Path) -> dict:
    raizes = [base / "dados", base / "figuras", base / "notebooks"]
    arquivos = sorted(
        caminho
        for raiz in raizes
        if raiz.exists()
        for caminho in raiz.rglob("*")
        if caminho.is_file()
    )
    inventario = {
        "gerado_em_utc": datetime.now(timezone.utc).isoformat(),
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
    raiz = Path(__file__).parents[1]
    resultado = gerar_inventario(
        raiz,
        raiz / "contratos" / "INVENTARIO_PRE_MIGRACAO.json",
    )
    print(
        f"{resultado['quantidade_arquivos']} arquivos, "
        f"{resultado['bytes']:,} bytes inventariados"
    )

#!/usr/bin/env python3
"""Regenera os valores esperados de `db/schema/03_validar_carga.sql`.

O cabeçalho daquele SQL sempre prometeu que "os valores esperados vêm de
METADADOS.json". Na prática eram literais congelados no recorte de 29
competências, então ao avançar para 2026-06 vinte das trinta e seis linhas
saíram DIVERGENTE sem que nada estivesse errado com os dados.

Este script fecha essa distância: lê cada subconsulta `obtido` do próprio SQL,
executa contra o banco e grava o resultado como o novo `esperado`. O SQL
continua sendo um artefato legível e versionado, e avançar o recorte vira um
commit com diff explícito, em vez de vinte falhas silenciosas.

**Não rode antes de conferir a carga.** Este script *abençoa* o estado atual
do banco. A garantia independente de que o banco reproduz a Gold é
`carregar_gold.py --conferir`, que compara contagem a contagem contra os
Parquets — rode aquilo primeiro, e só depois isto.

    python src/medflow/oracle/carregar_gold.py --conferir
    python scripts/atualizar_esperados_sql.py [--conferir]
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

import oracledb

RAIZ = Path(__file__).resolve().parents[1]
SQL = RAIZ / "db" / "schema" / "03_validar_carga.sql"

# O bloco `with conferencia (...) as ( ... )` do próprio arquivo. Executá-lo
# inteiro é mais seguro do que tentar isolar cada subconsulta por expressão
# regular: os parênteses aninhados de `count(*)` e dos `select` internos
# derrubam qualquer casamento ingênuo.
BLOCO_CTE = re.compile(
    r"with\s+conferencia\s*\([^)]*\)\s*as\s*\((?P<corpo>.*?)\n\)", re.DOTALL | re.IGNORECASE
)

# Âncora exata de uma linha de conferência, para trocar só o literal.
def _ancora(ordem: int, metrica: str) -> re.Pattern[str]:
    return re.compile(
        rf"(select\s+{ordem},\s*'{re.escape(metrica)}',\s*)(-?\d+)(\s*,)"
    )

VARIAVEIS = (
    "ORACLE_USER",
    "ORACLE_PASSWORD",
    "ORACLE_DSN",
    "ORACLE_WALLET_DIR",
    "ORACLE_WALLET_PASSWORD",
)


def conectar() -> oracledb.Connection:
    faltando = [nome for nome in VARIAVEIS if not os.getenv(nome, "").strip()]
    if faltando:
        raise RuntimeError(f"variáveis ausentes: {', '.join(faltando)}")
    wallet = Path(os.environ["ORACLE_WALLET_DIR"]).expanduser().resolve()
    return oracledb.connect(
        user=os.environ["ORACLE_USER"],
        password=os.environ["ORACLE_PASSWORD"],
        dsn=os.environ["ORACLE_DSN"],
        config_dir=str(wallet),
        wallet_location=str(wallet),
        wallet_password=os.environ["ORACLE_WALLET_PASSWORD"],
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--conferir",
        action="store_true",
        help="não escreve; sai com 1 se algum esperado estiver desatualizado",
    )
    args = parser.parse_args()

    texto = SQL.read_text(encoding="utf-8")
    corpo = BLOCO_CTE.search(texto)
    if not corpo:
        raise RuntimeError(f"não encontrei o CTE `conferencia` em {SQL}")

    consulta = (
        f"with conferencia (ordem, metrica, esperado, obtido) as ("
        f"{corpo.group('corpo')}\n) "
        f"select ordem, metrica, esperado, obtido from conferencia order by ordem"
    )

    with conectar() as conexao, conexao.cursor() as cursor:
        cursor.execute(consulta)
        linhas = cursor.fetchall()

    divergentes: list[str] = []
    novo = texto
    for ordem, metrica, esperado, obtido in linhas:
        esperado, obtido = int(esperado), int(obtido or 0)
        if esperado == obtido:
            continue
        divergentes.append(f"  {ordem:>3} {metrica:<52} {esperado:>10,} -> {obtido:>10,}")
        novo, trocas = _ancora(int(ordem), metrica).subn(rf"\g<1>{obtido}\g<3>", novo, count=1)
        if trocas != 1:
            raise RuntimeError(f"não consegui ancorar a linha {ordem} ({metrica})")

    if args.conferir:
        if divergentes:
            print("esperados desatualizados no SQL de reconciliação:", file=sys.stderr)
            print("\n".join(divergentes), file=sys.stderr)
            return 1
        print(f"os {len(linhas)} esperados batem com o banco")
        return 0

    if not divergentes:
        print("nada a atualizar; os esperados já batem com o banco")
        return 0

    SQL.write_text(novo, encoding="utf-8")
    print(f"{len(divergentes)} esperado(s) atualizado(s):")
    print("\n".join(divergentes))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

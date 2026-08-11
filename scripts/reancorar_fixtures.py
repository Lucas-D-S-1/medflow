#!/usr/bin/env python3
"""Sincroniza o carimbo da Gold nos snapshots de contingência do webapp.

Toda reexecução da Gold muda `gerado_em_utc`, e as fixtures guardam esse
carimbo para provar de qual Gold vieram — há um teste Playwright que exige
`statusSnapshot.database_time == goldMetadata.gerado_em_utc`. Sem isto, o
carimbo precisa ser corrigido à mão a cada execução, o que já falhou duas
vezes numa só sessão.

Escopo deliberadamente pequeno: reancora **só o carimbo**, e por isso funciona
sem o Oracle no ar. Regerar o *conteúdo* é `web/scripts/gerar-mocks.ts`
(`make fixtures`), que busca as dez respostas na API — a divisão é essa:

- **reexecutou a Gold e ainda não recarregou o Oracle:** `make fixtures-carimbo`
  basta, porque só o carimbo mudou;
- **o recorte avançou, ou algum contrato de endpoint mudou:** `make fixtures`,
  porque o conteúdo mudou junto.

    python scripts/reancorar_fixtures.py [--conferir]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
METADADOS_GOLD = RAIZ / "data" / "gold" / "qualidade" / "METADADOS.json"
DIR_FIXTURES = RAIZ / "web" / "src" / "mocks"

# ISO-8601 com microssegundos e deslocamento, como o pipeline grava.
CARIMBO = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+\+00:00")


def carimbo_da_gold() -> str:
    return json.loads(METADADOS_GOLD.read_text(encoding="utf-8"))["gerado_em_utc"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--conferir",
        action="store_true",
        help="não escreve; sai com 1 se alguma fixture estiver desatualizada",
    )
    args = parser.parse_args()

    # `data/` é gitignored: num clone limpo, e portanto na CI, não há Gold com
    # que comparar. Sair em silêncio é o comportamento correto — o contrário
    # tornava este passo impossível de passar fora de uma máquina que já
    # rodou o pipeline, que é justamente o que acontecia até 11/08/2026.
    if not METADADOS_GOLD.is_file():
        print(f"Gold não materializada em {METADADOS_GOLD.parent}; nada a conferir.")
        return 0

    atual = carimbo_da_gold()
    desatualizadas: list[str] = []

    for caminho in sorted(DIR_FIXTURES.glob("*.json")):
        texto = caminho.read_text(encoding="utf-8")
        antigos = {c for c in CARIMBO.findall(texto) if c != atual}
        if not antigos:
            continue
        desatualizadas.append(caminho.name)
        if args.conferir:
            continue
        novo = texto
        for antigo in antigos:
            novo = novo.replace(antigo, atual)
        caminho.write_text(novo, encoding="utf-8")
        print(f"  {caminho.name}: {len(antigos)} carimbo(s) reancorado(s)")

    if args.conferir:
        if desatualizadas:
            print("fixtures desatualizadas:", ", ".join(desatualizadas), file=sys.stderr)
            print(f"rode: python {Path(__file__).relative_to(RAIZ)}", file=sys.stderr)
            return 1
        print("todas as fixtures batem com o carimbo da Gold")
        return 0

    if not desatualizadas:
        print("nada a fazer; as fixtures já batem com o carimbo da Gold")
    print("carimbo da Gold:", atual)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

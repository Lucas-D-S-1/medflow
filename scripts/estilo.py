"""Confere a escrita dos documentos do repositório.

Existe porque texto de projeto envelhece para dois lados: envelhece de fato,
quando o número muda, e envelhece de forma, quando adota os maneirismos de
quem escreve rápido. O primeiro caso os testes pegam. O segundo, não.

As regras estão logo abaixo, em `FRASES` e nas checagens que as seguem: este
arquivo é a própria fonte, e não a cópia de uma lista escrita em outro lugar.
Sem dependência externa, sem rede, sem banco.

    make estilo            confere e falha se houver violação
    make estilo ARGS=-v    lista cada ocorrência com o trecho

O travessão só é violação em prosa corrida. Intervalo (`2024-2026`), célula de
tabela, título de seção, rótulo de item de lista e bloco de código continuam
livres: ali ele é tipografia correta, não maneirismo.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# Documentos que descrevem um estado datado não são reescritos para caber no
# presente. Ver a nota no topo de REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md.
ISENTOS = {
    "CHANGELOG.md",
    "docs/decisoes/DECISOES.md",
    "docs/decisoes/REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md",
    "docs/pesquisa/pesquisa.md",
}

FRASES = {
    r"não (apenas|só)\b[^.\n]{2,60}\bmas\b": "construção 'não apenas X mas Y'",
    r"vale (a pena )?(notar|destacar|lembrar|ressaltar)": "'vale notar/destacar'",
    r"é importante (notar|destacar|lembrar|ressaltar)": "'é importante notar'",
    r"\bem suma\b": "'em suma'",
    r"\b(genuinamente|verdadeiramente|absolutamente|extremamente|simplesmente|realmente)\b": "advérbio de reforço",
}


def arquivos_versionados() -> list[Path]:
    saida = subprocess.run(
        ["git", "ls-files", "*.md"], cwd=RAIZ, capture_output=True, text=True, check=True
    ).stdout.split()
    return [RAIZ / f for f in saida if f not in ISENTOS]


def fora_de_bloco_de_codigo(texto: str) -> list[bool]:
    """Um booleano por linha: True quando a linha está fora de ``` ```."""
    dentro, marcas = False, []
    for linha in texto.split("\n"):
        if linha.lstrip().startswith("```"):
            dentro = not dentro
            marcas.append(False)
            continue
        marcas.append(not dentro)
    return marcas


def dentro_de_crase(linha: str, col: int) -> bool:
    """True quando a coluna cai dentro de um trecho `assim`."""
    return linha.count("`", 0, col) % 2 == 1


def eh_prosa(texto: str, i: int, linha: str) -> bool:
    s = linha.strip()
    if i > 0 and i + 1 < len(texto) and texto[i - 1] not in " \n" and texto[i + 1] not in " \n":
        return False  # intervalo: 2024—2026, origem—destino
    if s.startswith("|") or s.startswith("#"):
        return False  # tabela e título
    if re.match(r"^[-*]\s|^\d+\.\s", s):
        return False  # rótulo de item de lista
    return True


def confere(caminho: Path) -> list[tuple[str, str]]:
    texto = caminho.read_text(encoding="utf-8")
    livre = fora_de_bloco_de_codigo(texto)
    achados: list[tuple[str, str]] = []

    for m in re.finditer("—", texto):
        i = m.start()
        n_linha = texto.count("\n", 0, i)
        if not livre[n_linha]:
            continue
        ini = texto.rfind("\n", 0, i) + 1
        fim = texto.find("\n", i)
        linha = texto[ini : fim if fim > 0 else len(texto)]
        if eh_prosa(texto, i, linha) and not dentro_de_crase(linha, i - ini):
            achados.append(("travessão em prosa", linha.strip()[:90]))

    for padrao, nome in FRASES.items():
        for m in re.finditer(padrao, texto, re.IGNORECASE):
            n_linha = texto.count("\n", 0, m.start())
            if livre[n_linha]:
                achados.append((nome, texto[max(0, m.start() - 30) : m.start() + 60].replace("\n", " ")))

    # Parágrafo com três ou mais trechos separados por ponto e vírgula é uma
    # lista escrita como texto. Vira bullets.
    for par in texto.split("\n\n"):
        s = par.strip()
        if s.startswith(("|", "#", "-", "*", ">", "```")) or re.match(r"^\d+\.\s", s):
            continue
        if s.count(";") >= 3:
            achados.append(("parágrafo que é lista (3+ ponto e vírgula)", s[:90]))

    return achados


def main() -> int:
    p = argparse.ArgumentParser(description="confere a escrita dos documentos")
    p.add_argument("-v", "--verboso", action="store_true", help="mostra cada ocorrência")
    args = p.parse_args()

    total = 0
    for caminho in sorted(arquivos_versionados()):
        achados = confere(caminho)
        if not achados:
            continue
        total += len(achados)
        rel = caminho.relative_to(RAIZ)
        print(f"\n{rel}  ({len(achados)})")
        if args.verboso:
            for regra, trecho in achados:
                print(f"    [{regra}] {trecho}")
        else:
            for regra in sorted({r for r, _ in achados}):
                n = sum(1 for r, _ in achados if r == regra)
                print(f"    {n:3d}  {regra}")

    if total:
        print(f"\n{total} violação(ões). As regras estão no topo deste arquivo.")
        print("Rode com -v para ver cada trecho.")
        return 1

    print("Escrita conferida: nenhuma violação.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

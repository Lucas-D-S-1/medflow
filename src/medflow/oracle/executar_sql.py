"""Executa roteiros SQL/PLSQL do MedFlow pela conexão Python mTLS.

Entende os comandos de apresentação usados nos arquivos (`set`, `column` e
`prompt`), blocos terminados por `/` e o atalho SQLcl `exec`.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import re

from carregar_gold import conectar


COMANDOS_CLIENTE = ("set ", "column ")


def instrucoes(caminho: Path):
    acumulado: list[str] = []
    plsql = False
    em_comentario_bloco = False

    for linha in caminho.read_text(encoding="utf-8").splitlines():
        limpa = linha.strip()
        minuscula = limpa.lower()

        if not acumulado and (
            not limpa
            or minuscula.startswith("--")
            or minuscula.startswith(COMANDOS_CLIENTE)
        ):
            continue
        if not acumulado and minuscula.startswith("prompt"):
            mensagem = limpa[6:].strip()
            if mensagem:
                print(mensagem)
            continue
        if not acumulado and minuscula.startswith("exec "):
            chamada = limpa[5:].rstrip(";")
            yield f"begin {chamada}; end;"
            continue

        if not acumulado:
            plsql = minuscula.startswith(("begin", "declare"))
        acumulado.append(linha)

        if "/*" in linha:
            em_comentario_bloco = True
        if "*/" in linha:
            em_comentario_bloco = False

        if plsql and limpa == "/":
            yield "\n".join(acumulado[:-1]).strip()
            acumulado = []
            plsql = False
        elif not plsql and not em_comentario_bloco and limpa.endswith(";"):
            yield "\n".join(acumulado).strip()[:-1]
            acumulado = []

    if acumulado:
        raise RuntimeError(f"Instrução SQL sem terminador em {caminho}: {acumulado[0]}")


def executar(caminho: Path) -> None:
    comandos = list(instrucoes(caminho))
    with conectar() as conexao:
        with conexao.cursor() as cursor:
            for numero, comando in enumerate(comandos, start=1):
                primeiro = re.sub(r"\s+", " ", comando).split(" ", 3)[:3]
                rotulo = " ".join(primeiro)
                cursor.execute(comando)
                if cursor.description:
                    colunas = [item[0] for item in cursor.description]
                    print(" | ".join(colunas))
                    for linha in cursor:
                        print(" | ".join("" if valor is None else str(valor) for valor in linha))
                else:
                    print(f"[{numero}/{len(comandos)}] ok: {rotulo}")
        conexao.commit()


def main() -> None:
    analisador = argparse.ArgumentParser(description=__doc__)
    analisador.add_argument("arquivo", type=Path)
    argumentos = analisador.parse_args()
    caminho = argumentos.arquivo.resolve()
    if not caminho.is_file():
        raise RuntimeError(f"Roteiro SQL não encontrado: {caminho}")
    executar(caminho)


if __name__ == "__main__":
    main()

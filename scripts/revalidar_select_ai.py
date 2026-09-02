"""Revalida o Select AI contra o produto final e grava a evidência datada.

Roda o roteiro de `medflow.select_ai.perguntas` — cinco blocos, em profundidade
crescente — e escreve `docs/flowia/REVALIDACAO_SELECT_AI.md`.

Onde há SQL de referência, a conferência é executada, não lida: as duas
consultas rodam e as respostas são comparadas pela sequência ordenada de
rótulos. Sai com código 1 se alguma resposta divergir da referência ou se
algum termo proibido aparecer no que o modelo narrou.

Usa DBMS_CLOUD_AI.GENERATE em vez do atalho `select ai`, que depende do
translation profile do cliente. O resultado é o mesmo e roda por qualquer
driver.

    make select-ai-revalidar
"""

from __future__ import annotations

import sys
from datetime import UTC, datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "src"))
sys.path.insert(0, str(RAIZ / "src" / "medflow" / "oracle"))

from carregar_gold import conectar  # noqa: E402

from medflow.select_ai import perguntas, relatorio  # noqa: E402
from medflow.select_ai.executar import (  # noqa: E402
    PERFIL,
    Resposta,
    SqlRecusado,
    comparar,
    consultar,
    gerar,
    guardar,
    varrer_termos,
)

SAIDA = RAIZ / "docs" / "qualidade" / "REVALIDACAO_SELECT_AI.md"


def responder(cursor, bloco: str, pergunta) -> Resposta:
    resposta = Resposta(pergunta=pergunta, bloco=bloco)

    if pergunta.sql_referencia:
        resposta.colunas_referencia, resposta.linhas_referencia = consultar(
            cursor, pergunta.sql_referencia.strip()
        )

    if bloco == perguntas.BLOCO_E:
        resposta.conversado = gerar(cursor, pergunta.prompt, "chat")

    bruto = gerar(cursor, pergunta.prompt, "showsql")
    try:
        resposta.sql_gerado = guardar(bruto)
    except SqlRecusado as erro:
        resposta.sql_gerado = bruto.strip()
        resposta.veredito = "SQL recusado pelo guarda de leitura"
        resposta.detalhe = str(erro)

    if resposta.sql_gerado and not resposta.veredito:
        try:
            resposta.colunas_geradas, resposta.linhas_geradas = consultar(
                cursor, resposta.sql_gerado
            )
        except Exception as erro:  # noqa: BLE001 — o erro do banco é o resultado
            resposta.veredito = "SQL gerado não executou"
            resposta.detalhe = str(erro).strip().splitlines()[0]
        else:
            if pergunta.sql_referencia:
                comparar(resposta)

    resposta.narrado = gerar(cursor, pergunta.prompt, "narrate")
    if pergunta.seguimento:
        resposta.seguimento_narrado = gerar(cursor, pergunta.seguimento, "narrate")

    # `conversado` sai da varredura: é a resposta do chat, sem os dados.
    resposta.termos_encontrados = varrer_termos(
        resposta.narrado, resposta.seguimento_narrado
    )
    return resposta


def main() -> int:
    agora = datetime.now(UTC).astimezone()
    respostas: list[Resposta] = []

    with conectar() as conexao, conexao.cursor() as cursor:
        cursor.execute("select sys_context('userenv', 'db_name') from dual")
        banco = cursor.fetchone()[0]
        cursor.callproc("dbms_cloud_ai.set_profile", [PERFIL])
        cursor.execute("select dbms_cloud_ai.get_profile() from dual")
        perfil = cursor.fetchone()[0]

        # Nada nesta sessão escreve. O guarda de leitura já barra DML vindo do
        # modelo; declarar a transação somente leitura é o segundo cadeado.
        cursor.execute("set transaction read only")

        roteiro = perguntas.todas()
        for i, (bloco, pergunta) in enumerate(roteiro, start=1):
            print(f"[{i}/{len(roteiro)}] {pergunta.id} — {pergunta.titulo}", flush=True)
            respostas.append(responder(cursor, bloco, pergunta))

        conexao.rollback()

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(
        relatorio.montar(agora, banco, perfil, respostas), encoding="utf-8"
    )
    print(f"\nEvidência gravada em {SAIDA.relative_to(RAIZ)}")

    falhou = [
        r
        for r in respostas
        if (r.conferida and r.veredito not in relatorio.VEREDITOS_OK)
        or r.termos_encontrados
    ]
    marcados = {r.pergunta.id for r in respostas if r.pergunta.limitacao_conhecida}

    # Uma limitação já medida e documentada não derruba a execução; uma falha
    # nova, sim. E uma limitação que parou de acontecer também é notícia.
    regressoes = [r for r in falhou if r.pergunta.id not in marcados]
    conhecidas = [r for r in falhou if r.pergunta.id in marcados]
    superadas = [
        r
        for r in respostas
        if r.pergunta.id in marcados and r not in falhou and r.conferida
    ]

    for r in conhecidas:
        motivo = r.veredito or ", ".join(r.termos_encontrados)
        print(f"limitação conhecida  {r.pergunta.id}: {motivo}")
    for r in superadas:
        print(
            f"LIMITAÇÃO SUPERADA  {r.pergunta.id}: passou a bater com a "
            "referência. Remover a marca `limitacao_conhecida` e atualizar "
            "docs/flowia/LEITURA_SELECT_AI.md."
        )
    for r in regressoes:
        detalhe = (
            f"{r.veredito}: {r.detalhe}"
            if r.veredito
            else f"termo proibido: {', '.join(r.termos_encontrados)}"
        )
        print(f"REGRESSÃO  {r.pergunta.id}: {detalhe}")

    if regressoes:
        return 1
    print(
        f"\nSem regressões. {len(conhecidas)} limitação(ões) conhecida(s), "
        "analisadas em docs/flowia/LEITURA_SELECT_AI.md."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

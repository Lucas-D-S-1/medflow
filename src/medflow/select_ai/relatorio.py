"""Escreve a evidência datada da revalidação do Select AI."""

from __future__ import annotations

from datetime import datetime

from medflow.select_ai.executar import TERMOS_PROIBIDOS, Resposta

VEREDITOS_OK = ("equivalente", "equivalente até o corte")


def tabela(colunas: list[str], linhas: list[tuple]) -> str:
    if not colunas:
        return "(sem resultado)"
    if not linhas:
        return " | ".join(colunas) + "\n(nenhuma linha)"
    largura = [
        max(len(c), *(len(str(linha[i])) for linha in linhas))
        for i, c in enumerate(colunas)
    ]
    linha_fmt = lambda vals: (  # noqa: E731
        "| " + " | ".join(str(v).ljust(largura[i]) for i, v in enumerate(vals)) + " |"
    )
    separador = "|" + "|".join("-" * (w + 2) for w in largura) + "|"
    return "\n".join([linha_fmt(colunas), separador, *(linha_fmt(linha) for linha in linhas)])


def cabecalho(agora: datetime, banco: str, perfil: str, respostas: list[Resposta]) -> str:
    conferidas = [r for r in respostas if r.conferida]
    ok = [r for r in conferidas if r.veredito in VEREDITOS_OK]
    com_termo = [r for r in respostas if r.termos_encontrados]
    conhecidas = [r for r in respostas if r.pergunta.limitacao_conhecida]

    return f"""# Revalidação do Select AI contra o produto final

Executada em **{agora:%d/%m/%Y às %H:%M}** no banco `{banco}`, perfil `{perfil}`.

## O que este documento prova, e como

A pergunta que a banca faz sobre qualquer demonstração de texto-para-SQL é a
mesma: *como você sabe que ele acertou?* Ler o SQL gerado e achar parecido com o
de referência não responde isso.

Aqui a conferência é executada. Para cada pergunta com SQL de referência, as
duas consultas rodam contra o mesmo banco e as duas respostas são comparadas
pela sequência ordenada de rótulos que produziram — a lista de regiões, de
especialidades, de diagnósticos. É o que a pergunta de negócio pede, e é o que
precisa bater. Duas consultas escritas de forma diferente que devolvem a mesma
lista na mesma ordem responderam a mesma pergunta; uma que devolve outra lista
errou, por mais elegante que seja o SQL.

O SQL vindo do modelo é tratado como entrada não confiável. Só executa se for
consulta de leitura, e executa em transação declarada somente leitura.

| | |
|---|---:|
| Perguntas no roteiro | {len(respostas)} |
| Com SQL de referência, conferidas por execução | {len(conferidas)} |
| Respostas equivalentes à referência | {len(ok)} de {len(conferidas)} |
| Respostas com termo proibido afirmado | {len(com_termo)} |
| Falhas marcadas como limitação conhecida | {len(conhecidas)} |

A varredura de terminologia procura {", ".join(f"`{t}`" for t in TERMOS_PROIBIDOS)}
no que o modelo narrou. O IPH é pressão estimada sobre capacidade SUS declarada,
nunca ocupação real de leito, e a base é mensal por competência, nunca tempo
real. Mencionar não é afirmar: uma ocorrência só conta quando aparece sem
negação e sem ressalva, senão a recusa correta — que precisa nomear o que
recusa — seria reprovada.

> **Este documento é a medida, não o julgamento.** Ele é gerado por execução e
> reescrito inteiro a cada rodada. A leitura do que estes números significam,
> incluindo o que falhou e o que fazer antes da banca, está em
> [`LEITURA_SELECT_AI.md`](LEITURA_SELECT_AI.md).
"""


def secao(resposta: Resposta) -> str:
    p = resposta.pergunta
    partes = [f"\n### {p.id}. {p.titulo}\n", f"**Pergunta**\n\n> {p.prompt}\n"]

    if p.espera:
        partes.append(f"\n**O que se espera** — {p.espera}\n")

    if p.sql_referencia:
        partes.append(
            f"\n**SQL de referência**\n\n```sql\n{p.sql_referencia.strip()}\n```\n"
            f"\n**Resposta da referência**\n\n```\n"
            f"{tabela(resposta.colunas_referencia, resposta.linhas_referencia)}\n```\n"
        )

    if resposta.sql_gerado:
        partes.append(
            f"\n**SQL gerado pelo Select AI**\n\n```sql\n{resposta.sql_gerado}\n```\n"
        )

    if resposta.colunas_geradas is not None:
        partes.append(
            f"\n**Resposta do SQL gerado**\n\n```\n"
            f"{tabela(resposta.colunas_geradas, resposta.linhas_geradas)}\n```\n"
        )

    if resposta.veredito:
        ok = resposta.veredito in VEREDITOS_OK
        marca = "✅" if ok else ("📌" if p.limitacao_conhecida else "⚠️")
        partes.append(
            f"\n**Conferência** — {marca} {resposta.veredito}: {resposta.detalhe}\n"
        )

    if resposta.conversado:
        partes.append(
            f"\n**Sem os dados na frente (`chat`)**\n\n{resposta.conversado}\n"
        )

    if resposta.narrado:
        rotulo = "Com os dados na frente (`narrate`)" if resposta.conversado else "Resposta narrada (`narrate`)"
        partes.append(f"\n**{rotulo}**\n\n{resposta.narrado}\n")

    if p.seguimento:
        partes.append(
            f"\n**Seguimento**\n\n> {p.seguimento}\n\n{resposta.seguimento_narrado}\n"
        )

    if resposta.termos_encontrados:
        partes.append(
            "\n> ⚠️ **Termo proibido, afirmado na narrativa:** "
            + ", ".join(f"`{t}`" for t in resposta.termos_encontrados)
            + "\n"
        )

    if p.limitacao_conhecida:
        partes.append(
            f"\n> 📌 **Limitação conhecida e aceita** — {p.limitacao_conhecida}. "
            "Analisada em [`LEITURA_SELECT_AI.md`](LEITURA_SELECT_AI.md); não "
            "derruba a execução, mas uma falha nova em qualquer outra pergunta "
            "derruba.\n"
        )

    return "".join(partes)


def montar(
    agora: datetime, banco: str, perfil: str, respostas: list[Resposta]
) -> str:
    partes = [cabecalho(agora, banco, perfil, respostas)]
    bloco_atual = None
    for r in respostas:
        if r.bloco != bloco_atual:
            bloco_atual = r.bloco
            partes.append(f"\n## {bloco_atual}\n")
        partes.append(secao(r))
    return "".join(partes)

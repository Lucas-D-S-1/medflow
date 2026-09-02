# `docs/` — a pesquisa e a evidência

**O quê.** O que sustenta as afirmações do produto. Código, contratos e runbook
ficam fora daqui: aquilo é `src/`, `contracts/` e `db/`.

| Pasta | Conteúdo | Quando ler |
|---|---|---|
| [`pesquisa/`](pesquisa/pesquisa.md) | desk research sobre indicadores hospitalares e territoriais, e a validação do problema | ao questionar a metodologia de um índice |
| [`flowia/`](flowia/README.md) | a IA do produto e a prova de que ela acerta | ao perguntar como se sabe que o Select AI acertou |

## Evidência é datada, e continua datada

`flowia/REVALIDACAO_SELECT_AI.md` registra uma execução, com a data e o banco em
que ela aconteceu. **Não é reescrito para caber no presente**: transformar
registro em opinião é a forma mais barata de perder a credibilidade do
conjunto. Quando o mundo muda, o caminho é executar de novo e datar de novo, não
editar o retrato.

O que descreve o **agora** não mora em documento: sai de `make validar`, de
`make preflight` e da reconciliação no banco, que medem o estado no momento em
que você pergunta.

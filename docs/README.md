# `docs/` — a pesquisa e a evidência

**O quê.** O que sustenta as afirmações do produto. Código, contratos e runbook
ficam fora daqui: aquilo é `src/`, `contracts/` e `db/`.

| Pasta | Conteúdo | Quando ler |
|---|---|---|
| [`pesquisa/`](pesquisa/pesquisa.md) | desk research sobre indicadores hospitalares e territoriais, e a validação do problema | ao questionar a metodologia de um índice |
| [`flowia/`](flowia/README.md) | a IA do produto e a prova de que ela acerta | ao perguntar como se sabe que o Select AI acertou |
| `entrega_sprint_2/` | o que foi entregue: o deck, os links e o pacote em `original/` | ao conferir o que a versão entregue continha |

## Evidência bruta e documentação curada

`flowia/REVALIDACAO_SELECT_AI.md` apresenta o método, os treze casos e os
resultados medidos. A saída integral de uma rodada fica em
`flowia/ULTIMA_REVALIDACAO.md`, fora do índice. A mesma separação vale para a
bateria de vinte perguntas: o documento curado é
`AVALIACAO_20_PERGUNTAS.md`; o log local é `ULTIMA_EXECUCAO.md`.

O repositório preserva método, decisões e limites. O estado operacional do
momento sai de `make validar`, de `make preflight` e da reconciliação no
banco.

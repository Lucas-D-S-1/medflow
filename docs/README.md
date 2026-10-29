# `docs/`: a pesquisa e a evidência

**O quê.** O que sustenta as afirmações do produto. Código, contratos e runbook
ficam fora daqui: aquilo é `src/`, `contracts/` e `db/`.

A versão atual é a apresentada no **FIAP NEXT 2026**, com dados de **São Paulo,
de janeiro de 2024 a agosto de 2026, em 32 competências mensais**.
O [README principal](../README.md) apresenta o produto e a
[arquitetura](../ARQUITETURA.md) descreve o desenho atual.
Relatórios de execução e avaliações registram a data, a amostra e os filtros
que foram efetivamente conferidos. Seus resultados não devem ser estendidos
a todo o recorte ou a toda pergunta livre sem nova medição.

| Pasta | Conteúdo | Quando ler |
|---|---|---|
| [`pesquisa/`](pesquisa/pesquisa.md) | desk research sobre indicadores hospitalares e territoriais, e a validação do problema | ao questionar a metodologia de um índice |
| [`flowia/`](flowia/README.md) | arquitetura atual da FlowIA, integração e avaliações datadas | ao entender a assistente e o alcance das medições |
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

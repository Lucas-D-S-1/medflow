# `docs/flowia/` — a IA do produto, e a prova de que ela acerta

**O quê.** A **FlowIA** é a assistente que responde dentro do site. Por baixo
dela está o **Select AI** do Autonomous Database, que traduz pergunta em SQL
contra a Gold. Esta pasta guarda a evidência de que essa tradução acerta; o
código que a executa mora em outro lugar, e a tabela abaixo diz onde.

**Por quê separado.** A pergunta que qualquer um faz diante de uma demonstração
de texto-para-SQL é sempre a mesma: *como se sabe que ele acertou?* Ler o SQL
gerado e achar parecido com o de referência não responde isso. Aqui a
conferência é executada.

## Onde está o código

Nada nesta pasta executa. O que roda:

| Papel | Onde |
|---|---|
| O roteiro de perguntas e o SQL de referência | `src/medflow/select_ai/perguntas.py` |
| O executor e o relatório | `src/medflow/select_ai/` e `scripts/revalidar_select_ai.py` |
| O avaliador da bateria de 20 perguntas | `scripts/avaliar_flowia.py` |
| O backend governado do assistente | `db/apex/02_pacote_select_ai.sql` |
| A infraestrutura do Select AI: Dynamic Group, policy, profile | `db/select_ai/` |

```bash
make select-ai-revalidar              # roda o roteiro e regrava a evidência
.venv/bin/python -m dotenv -f .env run -- \
  .venv/bin/python scripts/avaliar_flowia.py F12   # um subconjunto da bateria
```

**A cota do Select AI é de 50 perguntas por dia.** Uma bateria completa gasta
20. Confira quanto sobrou antes de repetir; o avaliador aceita um subconjunto
justamente para isso.

## O que cada documento prova

| Documento | O que prova | Como foi escrito |
|---|---|---|
| [`AVALIACAO_20_PERGUNTAS.md`](AVALIACAO_20_PERGUNTAS.md) | a FlowIA responde 20 de 20 perguntas humanas — curtas, vagas e coloquiais | à mão, consolidando quatro execuções de 29/08 |
| [`REVALIDACAO_SELECT_AI.md`](REVALIDACAO_SELECT_AI.md) | as 13 perguntas do roteiro geram SQL que devolve a mesma resposta do SQL de referência, rodando os dois contra o mesmo banco | gerado por execução |
| [`LEITURA_SELECT_AI.md`](LEITURA_SELECT_AI.md) | o julgamento sobre a evidência acima: o que ela mostra, onde o modelo erra e qual é o roteiro seguro | à mão |
| [`DEMONSTRACAO_APEX.md`](DEMONSTRACAO_APEX.md) | a página APEX de demonstração, montada e validada no Oracle | à mão |

A separação entre os dois primeiros e o terceiro é deliberada: a evidência é a
medida, e envelhece a cada execução; a leitura é o julgamento, e é onde as
limitações ficam escritas em vez de escondidas.

## Um limite declarado

A bateria de 20 passa, mas **nunca passou inteira numa única execução** — a
cota diária fechou em 50/50 no dia em que os últimos casos foram corrigidos. O
`AVALIACAO_20_PERGUNTAS.md` mostra quais rodadas produziram cada veredito,
inclusive a de regressão, que é a que impede a leitura otimista.

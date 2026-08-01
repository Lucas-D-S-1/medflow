# Versionamento e releases

Este repositório usa versões para marcar entregas públicas do MedFlow. Commits
intermediários continuam no histórico do Git, mas não recebem tag própria.

## Convenção

As próximas tags seguem o formato `vMAJOR.MINOR.PATCH`:

- `MAJOR`: mudança incompatível na arquitetura ou na entrega pública;
- `MINOR`: novo marco funcional, conjunto de artefatos ou etapa do challenge;
- `PATCH`: correção publicada sem ampliar o escopo funcional.

Enquanto o MedFlow for o único produto versionado neste repositório, as tags
permanecem sem prefixo de projeto. Se outro projeto passar a ter releases
independentes, a convenção deve ser revista antes da primeira tag dele.

## Release não é contrato de dados

A versão da release identifica a entrega pública completa. A
`versao_contrato` dos arquivos em `contratos/` identifica somente o esquema das
camadas de dados. Elas evoluem de forma independente: por exemplo, uma futura
release `v0.4.0` pode continuar consumindo o contrato de dados `0.3.0`.

O estado de uma release é registrado em três lugares:

1. `02_oracle_medflow/sprint_2_em_andamento/CHANGELOG.md`, durante o
   desenvolvimento;
2. tag anotada no commit exato da entrega;
3. GitHub Release, com resumo e evidências de validação.

## Fluxo de publicação

1. Manter a próxima versão no changelog como **em andamento**.
2. Concluir todo o escopo previsto para o marco.
3. Executar as validações técnicas e conferir que o Git está limpo.
4. Trocar **em andamento** pela data de publicação no changelog.
5. Atualizar README, pendências e links da versão estável.
6. Criar uma tag anotada `vX.Y.Z` no commit validado.
7. Publicar a tag e criar a GitHub Release correspondente.

Tags e releases não devem ser antecipadas para entregas parciais. Correções
posteriores usam uma nova versão; tags públicas existentes não são movidas.

## Histórico atual

| Marco | Situação | Observação |
|---|---|---|
| `medflow-v0` | legado | Primeira baseline; mantida apenas por rastreabilidade |
| `v0.1.0` | histórico | Espelhada neste repositório; a publicação original permanece como proveniência histórica |
| `v0.2.0` | estável | Gold, geografia, contratos e validação integrada |
| `v0.3.0` | em andamento | contrato 0.3.0 e Oracle concluídos; webapp MVP pendente |

A tag legada `medflow-v0` não deve ser apagada nem reutilizada. A `v0.1.0`
foi espelhada neste repositório em 01/08/2026, preservando o commit histórico
da entrega e sem apagar a referência ao
[repositório original `medflow`](https://github.com/Lucas-D-S-1/medflow).
A próxima publicação será a `v0.3.0` somente após a conclusão e validação do
webapp MVP.

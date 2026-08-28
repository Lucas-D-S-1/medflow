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

1. `CHANGELOG.md`, durante o desenvolvimento;
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
| `v0.1.0` | histórico | Primeiro marco público do pipeline Bronze/Silver, publicada aqui em 29/07/2026 |
| `v0.2.0` | histórico | Gold, geografia, contratos e validação integrada |
| `v0.3.0` | histórico | Oracle carregado, `api/v1` pública, WebApp no ar e Select AI revalidado; publicada em 23/08/2026 |
| `v0.3.1` | histórico | hardening da entrega publicado em 25/08/2026 |
| `v0.4.0` | estável | FlowIA contextual, Select AI no WebApp, território municipal e busca por aliases; publicada em 27/08/2026 |

A tag legada `medflow-v0` não deve ser apagada nem reutilizada. A `v0.1.0`
nasceu neste repositório em 29/07/2026 e foi espelhada no `fiap-1tscoa` em
01/08/2026. Desde a reorganização de 08/08/2026 este repositório é o de
entrega, e o `fiap-1tscoa` permanece como arquivo acadêmico privado.
O webapp MVP foi concluído e validado em 02/08/2026, com as quatro visões
servidas por dez endpoints ORDS e os dados exibidos reconciliados contra a Gold
em 8.403.103 comparações sem divergência, reproduzíveis com
`make reconciliar-completo`.

A condição declarada aqui para a `v0.3.0`: módulo ORDS de produção existindo e
link público testado. **foi cumprida em 16/08/2026**: `api/v1` publicado e o
site no ar em <https://lucas-d-s-1.github.io/medflow/>, conferido no navegador
com as quatro visões ao vivo.

A tag ficou parada depois disso por decisão de produto, não por pendência
técnica: cogitou-se refazer a UI em duas telas, e tagear um produto que muda na
semana seguinte contraria a regra acima de que tags não se antecipam a entregas
parciais. **Em 18/08/2026 essa hipótese foi descartada**, sob o argumento de
prazo: refazer a UI custaria repetir a reconciliação a poucos dias da entrega.
O WebApp permaneceu nas quatro visões, com mudanças restritas a texto e
acabamento. Com o Select AI revalidado contra o produto em 23/08/2026, o escopo
do marco fechou e a `v0.3.0` foi publicada nessa data.

Esse congelamento previa exceção — "salvo nova decisão explícita" — e ela veio
**em 27/08/2026**, depois da `v0.4.0` publicada e dos portões verdes, quando o
motivo de prazo expirou. As quatro visões viraram **duas páginas**: uma análise
contínua com duas etapas ancoradas — território e hospital — e a Metodologia. A
etapa de fluxos saiu por decisão de produto na mesma rodada.

A reconciliação não precisou ser repetida em nenhum desses passos: as mudanças
movem componentes, apagam texto e derivam comparações a partir de numeradores e
denominadores que a própria API publica, sem tocar em cálculo da Gold nem em
contrato. O contrato público permaneceu em `0.3.0` até o IPE, em 28/08/2026.

O que entrou depois da `v0.4.0`, ainda sem tag: contexto global de competência e
território, panorama territorial no mapa, totais do recorte, MoM e YoY, placar
de sinais, comparação com pares por hospital, tabelas ordenáveis e seletor de
competência restrito ao recorte publicado.

A `v0.4.0` é um marco `MINOR` porque inclui uma função pública nova: a FlowIA
contextual no WebApp, servida por um `POST` governado no ORDS. O mesmo marco
fecha a dimensão territorial municipal e a busca hospitalar por aliases. O
contrato de dados permanecia em `0.3.0`: a versão da entrega avançou, mas o
esquema canônico das camadas não sofreu uma ruptura incompatível.

## O contrato de dados foi para `0.4.0` em 28/08/2026

O Índice de Permanência por Especialidade acrescentou seis colunas ao mart de
especialidades e cinco campos à resposta de `hospitais/:cnes/especialidades`.
São adições, não rupturas: quem consumia o contrato `0.3.0` continua lendo os
mesmos campos com os mesmos significados, e por isso o passo é `MINOR` também
no contrato de dados.

A versão subiu de qualquer forma porque o contrato é o que a API promete, e ela
passou a prometer mais. Deixá-la em `0.3.0` faria dois conjuntos de campos
diferentes responderem pelo mesmo número, que é exatamente o que a versão
existe para impedir.

A migração foi **aditiva** (`db/schema/05_adicionar_indice_especialidade.sql`),
não uma recriação do modelo: o `02_criar_tabelas_gold.sql` derruba e recria as
tabelas, e rodá-lo em produção deixaria o site público sem dado durante a
carga.

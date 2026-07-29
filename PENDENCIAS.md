# PENDÊNCIAS — Challenge Oracle: MedFlow

Atualizado em 28/07/2026 após a reorganização e validação das camadas Bronze e
Silver. Entrega da Sprint 2: **01/09/2026**.

## Concluído nesta revisão

- Bronze limitada à ingestão, preservação e linhagem.
- Silver concentrando todos os tratamentos e de/paras.
- 5.210.357 registros SIH e 200.075 registros CNES reconciliados.
- 100% dos 16 códigos de especialidade observados mapeados.
- `N_AIH`, `IDENT` e `COD_IDADE` reincorporados.
- AIH aprovada separada de internação nova e continuação.
- `QT_DIARIAS` separado semanticamente de `DIAS_PERM`.
- região oficial obtida por município para os 645 municípios de São Paulo.
- nomes e esfera atuais obtidos para os 669 hospitais na API oficial do CNES.
- natureza jurídica coberta para os 22 códigos observados pela CONCLA/IBGE.
- descrição coberta para os 9.212 códigos CID observados.
- `MARCA_UTI` coberta por fontes MS/DATASUS e CEM.
- todos os agregados com `dropna=False` e reconciliação.
- documentação automática em `dados/silver/`.

## Pendências em ordem lógica

### 1. Domínios de referência da Silver — concluído

Os campos que estavam sem domínio foram pesquisados novamente e incorporados:

- `NAT_JUR`: 22/22 códigos observados, CONCLA/IBGE 2021;
- `REGSAUDE`: 645/645 municípios, API oficial DEMAS/MS;
- `DIAG_PRINC`: 9.212/9.212 códigos observados, DATASUS CID-10 2008 e
  complementos oficiais do Ministério da Saúde;
- `MARCA_UTI`: 16/16 códigos observados; os códigos legados 01 e 99 têm
  proveniência explícita;
- nome e esfera administrativa atuais: 669/669 hospitais, API oficial CNES.

Não resta lacuna de de/para nos códigos observados. A única ressalva cadastral
é temporal: nome e esfera vêm da fotografia **atual** do CNES, não de uma
fotografia histórica de 2022–2023. Esses campos usam sufixo `_atual` e a flag
`fl_cadastro_atual_nao_historico`; o `ESFERA_A` original permanece vazio e não
foi retroativamente preenchido.

### 2. Rever a documentação e os artefatos Silver

Antes das decisões metodológicas:

1. revisar `DICIONARIO.md`, `DOMINIOS.md` e `RELATORIO_QUALIDADE.md`;
2. confirmar que a distinção entre cadastro atual e dado histórico está clara;
3. escolher se nome/esfera históricos são realmente necessários para o produto.

Se forem exigidos atributos historicamente vigentes, será necessário localizar
ou solicitar uma fonte CNES histórica adicional. Isso não bloqueia os fatos,
regiões, CIDs, natureza jurídica ou os demais de/paras.

### 3. Decidir e validar a metodologia de cada índice — adiado

Por decisão do projeto, a sustentação metodológica será tratada ao final da
validação cadastral/documental e antes de implementar a Gold.

Esta etapa vem antes de qualquer gráfico ou dashboard.

| Índice | Estado | Próxima decisão |
|---|---|---|
| TMH | insumos validados | confirmar `óbitos de IDENT=1 / internações IDENT=1` |
| IPR | insumos validados | confirmar benchmark regional e mínimo de casos por CID |
| IS | insumos disponíveis | escolher AIH aprovada ou internação nova |
| CMI | fórmula pendente | definir tratamento dos custos de continuação de longa permanência |
| IPH | bloqueado como ocupação real | decidir entre proxy faturado ou reconstrução calendário-dia |

Para o IPH, não usar o nome “ocupação real” enquanto a alocação de permanência
por dia/mês e as regras de leito não forem validadas. O valor histórico
`0,440272` é apenas uma reprodução do proxy faturado.

### 4. Implementar `02_analise_dados.ipynb`

Somente após a decisão metodológica:

1. calcular os cinco índices com fórmula e unidade documentadas;
2. incluir reconciliação entre Silver e resultados;
3. aplicar regras de amostra mínima e tratamento de denominador zero;
4. gerar tabelas Gold independentes das visualizações;
5. registrar quais achados históricos permanecem ou foram invalidados.

### 5. Regenerar figuras e achados

As figuras herdadas são referência visual, não evidência atual. Cada figura
deve ser gerada pelo notebook 02 e vinculada à tabela Gold correspondente.

Prioridades:

- distribuição e série temporal do IPH somente após a decisão metodológica;
- IPR por hospital/CID com volume mínimo;
- IS, TMH e CMI recalculados usando internações novas quando aplicável;
- revisão de todos os números do pitch.

### 6. Definir a arquitetura de entrega

Depois dos dados e métricas validados:

- escolher a ferramenta do dashboard e a forma de link público;
- modelar e carregar as tabelas aprovadas no Oracle Autonomous DB;
- escolher e testar três perguntas do Select AI;
- publicar uma nova versão do GitHub com Bronze, Silver e documentação
  atualizadas;
- produzir PPT, vídeo e roteiro da apresentação técnica.

## Entregáveis da Sprint 2

| Entregável | Peso | Status |
|---|---:|---|
| Pipeline Bronze/Silver reproduzível | — | concluído localmente; falta republicar |
| Cinco índices validados | — | parcial; ver item 2 |
| Dashboard navegável | — | não iniciado |
| Link público | 10% | não iniciado |
| Oracle Select AI | — | não iniciado |
| GitHub | 20% | v0 publicada; atualização pendente |
| PPT / pitch | 10% | não iniciado |
| Vídeo YouTube | 10% | não iniciado |
| Apresentação técnica | 50% | não iniciado |

## Organização vigente

```text
sprint_2_em_andamento/
├── notebooks/
│   ├── 00_extracao_dados.ipynb
│   ├── 01_engenharia_dados.ipynb
│   └── _legado/
├── dados/
│   ├── raw/          cache DBC/DBF
│   ├── bronze/       fontes preservadas + manifesto
│   ├── silver/       fatos, dimensões, agregados e documentação
│   ├── processados/  legado
│   └── curados/      legado
└── figuras/          referências históricas; ainda não regeneradas
```

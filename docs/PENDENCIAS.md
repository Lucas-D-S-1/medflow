# PENDÊNCIAS — Challenge Oracle: MedFlow

Atualizado em 29/07/2026 após a validação técnica do recorte 2024–2026.
Entrega da Sprint 2: **01/09/2026**.

## Concluído nesta revisão

- Bronze limitada à ingestão, preservação e linhagem.
- Silver concentrando todos os tratamentos e de/paras.
- Batch mensal com descoberta remota e cache incremental, limitado a
  2024–2026 e executado até a última competência comum disponível (2026-05).
- 7.034.961 registros SIH e 243.085 registros CNES reconciliados.
- 100% dos 15 códigos de especialidade observados mapeados.
- `N_AIH`, `IDENT` e `COD_IDADE` reincorporados.
- AIH aprovada separada de internação nova e continuação.
- `QT_DIARIAS` separado semanticamente de `DIAS_PERM`.
- região oficial obtida por município para os 645 municípios de São Paulo.
- nomes e esfera atuais obtidos para os 653 hospitais na API oficial do CNES.
- natureza jurídica coberta para os 21 códigos observados pela CONCLA/IBGE,
  incluindo `1228`, encontrado na atualização.
- descrição coberta para os 9.494 códigos CID observados.
- `MARCA_UTI` coberta por fontes MS/DATASUS e CEM.
- todos os agregados com `dropna=False` e reconciliação.
- documentação e metadados automáticos em `dados/silver/`.
- duas execuções Silver consecutivas com as mesmas reconciliações, sem
  arquivos `.parcial` residuais.

## Pendências em ordem lógica

### 1. Domínios de referência da Silver — concluído

Os campos que estavam sem domínio foram pesquisados novamente e incorporados:

- `NAT_JUR`: 21/21 códigos observados, CONCLA/IBGE 2021;
- `REGSAUDE`: 645/645 municípios, API oficial DEMAS/MS;
- `DIAG_PRINC`: 9.494/9.494 códigos observados, DATASUS CID-10 2008 e
  complementos oficiais do Ministério da Saúde;
- `MARCA_UTI`: 14/14 códigos observados; os códigos legados 01 e 99 têm
  proveniência explícita;
- nome e esfera administrativa atuais: 653/653 hospitais, API oficial CNES.

Não resta lacuna de de/para nos códigos observados. A única ressalva cadastral
é temporal: nome e esfera vêm da fotografia **atual** do CNES, não de uma
fotografia histórica de 2024–2026. Esses campos usam sufixo `_atual` e a flag
`fl_cadastro_atual_nao_historico`; o `ESFERA_A` original permanece vazio e não
foi retroativamente preenchido.

### 2. Rever a documentação e os artefatos Silver — concluído

`DICIONARIO.md`, `DOMINIOS.md`, `RELATORIO_QUALIDADE.md` e `METADADOS.json`
foram regenerados para 2024-01 a 2026-05. A distinção entre cadastro atual e
dado histórico permanece explícita.

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
`0,472168` é apenas uma reprodução do proxy faturado.

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
- evoluir a publicação `v0.1.0` com a futura camada Gold;
- produzir PPT, vídeo e roteiro da apresentação técnica.

## Entregáveis da Sprint 2

| Entregável | Peso | Status |
|---|---:|---|
| Pipeline Bronze/Silver reproduzível | — | validado para 2024-01 a 2026-05 |
| Cinco índices validados | — | parcial; ver item 3 |
| Dashboard navegável | — | não iniciado |
| Link público | 10% | não iniciado |
| Oracle Select AI | — | não iniciado |
| GitHub | 20% | publicação `v0.1.0` em andamento |
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

# PENDÊNCIAS — Challenge Oracle: MedFlow

Atualizado em 30/07/2026, ao provisionar o Autonomous AI Database.
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
- versão pública [`v0.1.0`](https://github.com/Lucas-D-S-1/medflow/releases/tag/v0.1.0)
  publicada como primeiro marco do pipeline Bronze/Silver;
- versão pública [`v0.2.0`](https://github.com/Lucas-D-S-1/fiap-1tscoa/releases/tag/v0.2.0)
  publicada com Silver canônica, Gold, geografia, contratos e validação
  integrada.

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

### 3. Decidir e validar a metodologia de cada índice — concluído

Os requisitos oficiais, a apresentação da Sprint 1 e a transcrição da mentoria
foram revisados. A proposta completa está em
`sprint_2_em_andamento/REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md`.

As fórmulas foram aceitas em 29/07/2026 e implementadas na Gold:

| Índice | Estado | Contrato |
|---|---|---|
| TMH | validado | internações novas; mínimo de 30 para classificação |
| IPR | validado | benchmark regional sem o próprio hospital; cortes 20/50/3 hospitais |
| IS | validado | internações novas de 2026 / média do mesmo mês em 2024–2025 |
| CMI | validado | valor aprovado por internação nova; continuação separada |
| IPH | validado com limitação | reconstrução calendário-dia; capacidade CNES declarada |

Para o IPH, não usar o nome “ocupação real”. A proposta reconstrói
pacientes-dia, mas o denominador continua sendo capacidade mensal declarada no
CNES, não censo diário de leitos operacionais. O valor histórico `0,472168`
permanece apenas como reprodução do proxy faturado.

### 4. Implementar `02_analise_dados.ipynb` — concluído

O notebook gera cinco marts e reconciliou:

- 6.905.441 internações novas;
- 32.425.897 pacientes-dia estimados;
- 310 linhas de IS calculáveis;
- 30.550 combinações hospital/CID elegíveis para IPR;
- 142 hospital/mês com capacidade SUS zero preservados e IPH nulo.

### 5. Estrutura e geografia — concluído

- Bronze separada entre origem, intermediário e Parquet;
- Silver restrita a seis dimensões e dois fatos;
- nomes canônicos documentados no contrato `0.2.0`;
- CSV oficial do Ministério da Saúde incorporado;
- população IBGE 2022 agregada por município e região;
- GeoJSON e TopoJSON com 62 regiões válidas;
- legado isolado sem exclusão.

### 6. Regenerar figuras e achados

As figuras herdadas são referência visual, não evidência atual. Cada figura
deve ser gerada pelo notebook 02 e vinculada à tabela Gold correspondente.

Prioridades:

- distribuição e série temporal do IPH estimado, preservando capacidade zero,
  valores nulos e flags de pressão acima da capacidade declarada;
- IPR por hospital/CID com volume mínimo;
- IS, TMH e CMI recalculados usando internações novas quando aplicável;
- revisão de todos os números do pitch.

### 7. Infraestrutura Oracle — em andamento

**Tenancy resolvida em 30/07/2026.** O acesso OCI do challenge é institucional:
`rm572207@fiap.com.br` na tenancy `rm572207`, região home GRU. Não foi criada
conta Always Free pessoal. A pendência de localizar convite/tenancy está
encerrada; ver `DECISOES.md`, seção 9.

Banco `MEDFLOW` provisionado em 30/07/2026: Autonomous AI Database 26ai,
workload **Lakehouse** (a evolução do Autonomous Data Warehouse no 26ai),
Always Free, `sa-saopaulo-1`, mTLS obrigatório.

Artefatos de setup versionados em `sprint_2_em_andamento/oracle/`:

| Passo | Artefato | Estado |
|---|---|---|
| Criar esquema `MEDFLOW` separado do `ADMIN` | `sql/01_criar_usuario_medflow.sql` | escrito, não executado |
| Testar conexão mTLS | `testar_conexao.py` | escrito, não executado |
| Modelo dimensional, 2 dimensões e 5 marts, 118 colunas comentadas | `sql/02_criar_tabelas_gold.sql` | escrito, não executado |
| Carga idempotente de 520.409 linhas | `carregar_gold.py` | escrito, não executado |
| Reconciliação de 25 métricas contra o contrato `0.2.0` | `sql/03_validar_carga.sql` | escrito, não executado |
| Select AI com as três perguntas e SQL de referência | `sql/04_select_ai.sql` | escrito, não executado |

Falta executar, em ordem: baixar o wallet de instância, confirmar os aliases
reais no `tnsnames.ora`, preencher o `.env` e rodar os seis passos.

Riscos conhecidos, registrados para não virarem surpresa:

- **Select AI depende de provedor de LLM alcançável pelo banco.** Em tenancy
  Always Free o OCI Generative AI pode não estar liberado. Testar em agosto,
  com o caminho alternativo por provedor externo já escrito.
- **Always Free hiberna por inatividade.** Conectar ao menos uma vez por semana
  e confirmar o estado `Disponível` na véspera da apresentação.

### 8. Definir a arquitetura de entrega

Depois da carga validada no Oracle:

- escolher a ferramenta do dashboard e a forma de link público;
- validar as três perguntas em SQL convencional antes do Select AI;
- produzir PPT, vídeo e roteiro da apresentação técnica.

Próximo marco sugerido: **`v0.3.0` — Oracle e dashboard MVP**.

## Entregáveis da Sprint 2

| Entregável | Peso | Status |
|---|---:|---|
| Pipeline Bronze/Silver reproduzível | — | validado para 2024-01 a 2026-05 |
| Cinco índices validados | — | concluído |
| Autonomous AI Database provisionado | — | 30/07/2026, scripts de carga escritos |
| Dashboard navegável | — | não iniciado |
| Link público | 10% | não iniciado |
| Oracle Select AI | — | roteiro escrito, viabilidade a testar |
| GitHub | 20% | `v0.2.0` publicada |
| PPT / pitch | 10% | não iniciado |
| Vídeo YouTube | 10% | não iniciado |
| Apresentação técnica | 50% | não iniciado |

## Organização vigente

```text
sprint_2_em_andamento/
├── notebooks/         fontes 00, 01 e 02; executados e legado separados
├── pipeline/          publicação, contratos, Gold, geografia e inventário
├── contratos/         JSON, mapeamento de colunas e inventário SHA-256
├── dados/
│   ├── bronze/        origem, intermediário, Parquet e manifesto
│   ├── silver/        dimensões, fatos e qualidade
│   ├── gold/          marts, geografia e qualidade
│   └── legado/        contratos e recortes anteriores
├── figuras/           Gold e legado separados
└── referencias/       protótipos da Sprint 1 isolados
```

# PENDÊNCIAS — Challenge Oracle: MedFlow

Atualizado em 01/08/2026, após carga e validação do Select AI.
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
- versão pública [`v0.1.0`](https://github.com/Lucas-D-S-1/fiap-1tscoa/releases/tag/v0.1.0)
  espelhada neste repositório como primeiro marco do pipeline Bronze/Silver,
  preservando o repositório original como proveniência histórica;
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
| CMI | validado | nominal preservado e real corrigido por IPCA; continuação separada |
| IPH | validado com limitação | reconstrução calendário-dia; capacidade CNES declarada |

Para o IPH, não usar o nome “ocupação real”. A proposta reconstrói
pacientes-dia, mas o denominador continua sendo capacidade mensal declarada no
CNES, não censo diário de leitos operacionais. O valor histórico `0,472168`
permanece apenas como reprodução do proxy faturado.

### 4. Implementar `02_analise_dados.ipynb` — concluído

O notebook gera sete marts e reconciliou:

- 6.905.441 internações novas;
- 32.425.897 pacientes-dia estimados;
- 310 linhas de IS calculáveis;
- 30.550 combinações hospital/CID elegíveis para IPR;
- 142 hospital/mês com capacidade SUS zero preservados e IPH nulo.
- 6.846.665 internações de residentes paulistas observadas em SP;
- 906.060 deslocamentos inter-regionais com saída igual à entrada;
- 953.656 ICSAP distribuídas nos 19 grupos oficiais.

### 5. Estrutura e geografia — concluído

- Bronze separada entre origem, intermediário e Parquet;
- Silver restrita a seis dimensões e dois fatos;
- nomes canônicos documentados no contrato `0.3.0`;
- CSV oficial do Ministério da Saúde incorporado;
- população IBGE 2022 agregada por município e região;
- GeoJSON e TopoJSON com 62 regiões válidas;
- legado isolado sem exclusão.

### 6. Fechar o produto no webapp — etapa atual

Construir o produto MVP em quatro visões:

1. **Visão executiva:** oferta, demanda residente, sazonalidade e pressão;
2. **Fluxos e APS:** origem–destino, atração/evasão observada e ICSAP;
3. **Hospital e pares:** IPR, TMH, CMI nominal/real, permanência e amostras;
4. **Metodologia e qualidade:** fórmulas, cobertura, competência mais recente,
   limitações e flags.

Também é necessário confirmar a forma operacional de publicação e testar o
link público nas condições atuais da conta. O produto não está aceito apenas
por abrir: filtros, totais, rankings, períodos, amostras e interpretações devem
ser conferidos contra a Gold e, quando aplicável, contra o Oracle.

### 7. Infraestrutura Oracle — concluída

**Tenancy resolvida em 30/07/2026.** O acesso OCI do challenge é institucional:
`rm572207@fiap.com.br` na tenancy `rm572207`, região home GRU. Não foi criada
conta Always Free pessoal. A pendência de localizar convite/tenancy está
encerrada; ver `DECISOES.md`, seção 9.

Banco `MEDFLOW` provisionado em 31/07/2026: Autonomous AI Database 26ai,
workload **Lakehouse** (a evolução do Autonomous Data Warehouse no 26ai),
Always Free, `sa-saopaulo-1`, mTLS obrigatório.

Artefatos de setup versionados em `sprint_2_em_andamento/oracle/`:

| Passo | Artefato | Estado |
|---|---|---|
| Criar esquema `MEDFLOW` separado do `ADMIN` | `sql/01_criar_usuario_medflow.sql` | executado em 01/08/2026 |
| Testar conexão mTLS | `testar_conexao.py` | validado como `MEDFLOW` |
| Modelo dimensional, 2 dimensões e 7 marts, 175 colunas comentadas | `sql/02_criar_tabelas_gold.sql` | executado; 10 índices secundários |
| Carga idempotente de 585.296 linhas | `carregar_gold.py` | executada e conferida |
| Reconciliação de 36 métricas contra o contrato `0.3.0` | `sql/03_validar_carga.sql` | 36/36 `ok`; seis gates vazios |
| Select AI com cinco perguntas e SQL de referência | `sql/04_select_ai.sql` | bateria original validada; duas novas perguntas aguardam revalidação |

O Resource Principal usa o Dynamic Group `MedFlowADBGenAI` e a policy
`use generative-ai-family`. O profile `MEDFLOW_GENAI` está habilitado sem chave
de API externa. Os três `showsql` e `narrate` foram comparados com o SQL
convencional. Evidências em
`sprint_2_em_andamento/oracle/VALIDACAO_ORACLE_SELECT_AI.md`.

Riscos conhecidos, registrados para não virarem surpresa:

- **Select AI depende do OCI Generative AI.** A integração está funcionando,
  mas Dynamic Group, policy IAM e Resource Principal devem ser preservados e
  testados novamente antes da apresentação.
- **Always Free hiberna por inatividade.** Conectar ao menos uma vez por semana
  e confirmar o estado `Disponível` na véspera da apresentação.

### 8. Revalidar o Select AI depois do produto

O Select AI já passou pela validação técnica inicial. Depois que o webapp e
seus dados forem aprovados, repetir as cinco perguntas em SQL convencional,
`showsql` e `narrate`, confirmando que os resultados continuam coerentes com o
produto final.

### 9. Produzir a apresentação por último

As figuras herdadas são referência visual, não evidência atual. Depois da
aprovação do webapp e da revalidação do Select AI:

- regenerar as figuras a partir do notebook 02 e das tabelas Gold;
- revisar todos os números e textos do pitch;
- produzir PPT, vídeo e roteiro da demonstração;
- ensaiar a defesa dos indicadores hospitalares/territoriais e limitações.

Próximo marco sugerido: **`v0.3.0` — Oracle e webapp MVP**.

## Entregáveis da Sprint 2

| Entregável | Peso | Status |
|---|---:|---|
| Pipeline Bronze/Silver reproduzível | — | validado para 2024-01 a 2026-05 |
| Indicadores hospitalares e territoriais validados | — | concluído |
| Autonomous AI Database provisionado | — | carregado e reconciliado em 01/08/2026 |
| Webapp navegável | — | etapa atual |
| Link público | 10% | publicação a confirmar e testar |
| Validação dos dados no produto | — | após montagem do webapp |
| Oracle Select AI | — | validado tecnicamente; revalidar após o produto |
| GitHub | 20% | `v0.2.0` publicada |
| PPT / pitch | 10% | aguarda produto validado |
| Vídeo YouTube | 10% | aguarda produto validado |
| Apresentação técnica | 50% | aguarda produto e Select AI revalidados |

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

# PENDÊNCIAS — Challenge Oracle: MedFlow

Atualizado em 02/08/2026, após a conclusão e revisão do webapp.
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

### 6. Fechar o produto no webapp — concluído em 02/08/2026

As quatro visões estão construídas e revisadas:

1. **Visão executiva** (`/regional`): oferta, demanda residente, sazonalidade e
   pressão, com mapa por percentis, ranking com amostra e série mensal;
2. **Fluxos e APS** (`/fluxos`): matriz origem–destino, atração, atendimento
   intrarregional, evasão intrastadual observada, taxa de internação residente,
   taxa ICSAP e composição dos 19 grupos oficiais;
3. **Hospital e pares** (`/hospital`): lista de hospitais elegíveis da região,
   série mensal, perfil por especialidade e IPR por diagnóstico com benchmark
   regional e tamanho das amostras;
4. **Metodologia e qualidade** (`/metodologia`): fórmulas, cobertura,
   competência mais recente, limitações e flags.

O webapp é React + Vite servido por dez endpoints ORDS somente leitura em
`api/dev/v1`, todos `GET`, sobre nove views de projeção pura. Nenhum indicador é
recalculado no SQL das views nem no TypeScript: o front formata com `Intl`, não
calcula. Cada endpoint tem snapshot local de contingência; quando o Oracle não
responde, a tela mostra o snapshot com selo explícito e recusa trocar de
recorte, em vez de misturar fontes.

**O produto não foi aceito por abrir.** As dez fatias foram revisadas contra a
Gold antes de cada commit, com **8.257.139 comparações campo a campo e zero
divergências**, cobrindo os marts inteiros de fluxos, ICSAP, hospitais, séries,
especialidades e diagnósticos. A comparação é posicional contra a parquet
ordenada pelas mesmas chaves do `order by` de cada handler, o que prova a
ordenação declarada em cada contrato. Números renderizados foram lidos do DOM
com Playwright e conferidos contra a Gold, e os estados de erro, ausência
legítima e contingência foram medidos um a um.

Cinco defeitos objetivos foram encontrados e corrigidos antes dos commits; os
detalhes estão no `CHANGELOG.md` da sprint.

**Ainda falta** confirmar a forma operacional de publicação e testar o link
público nas condições atuais da conta. Hoje só existe o módulo de teste
`api/dev/v1`; o módulo de produção `api/v1` não foi criado.

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
  Último ping verificado em **08/08/2026**: conexão mTLS ok, os 10 endpoints
  ORDS em 200 e as 585.296 linhas Gold íntegras. **Próximo limite: 15/08.**
  A automação do ping ainda não existe e está em aberto.

### 7b. O DATASUS publicou 2026-06 — decisão em aberto

Detectado em **08/08/2026**, ao reexecutar a Bronze pelo pacote: a descoberta
remota passou a encontrar **30 competências** (2024-01 a 2026-06), não as 29
do recorte validado. O código está certo; a fonte é que avançou.

Avançar o recorte **não é uma mudança de código, é uma mudança de produto**, e
invalida tudo que está publicado hoje:

| O que muda | Hoje |
|---|---|
| Reconciliações Silver/Gold | 7.034.961 AIH e 6.905.441 internações novas |
| Carga no Oracle | 585.296 linhas em 9 tabelas |
| Snapshots do webapp | 10 fixtures geradas sobre 2026-05 |
| Validação do produto | 8.257.139 comparações contra a Gold atual |
| Documentação e apresentação | todos os números citados |

São 24 dias até a entrega. A recomendação é **congelar em 2026-05** até depois
da apresentação e tratar 2026-06 como demonstração da parametrização, não como
recorte oficial. A capacidade já existe e não exige editar código:

```python
ContextoBronze(base=BASE, periodo_final=(2026, 5))
```

A decisão precisa ser tomada e registrada aqui antes da fatia 5.

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
| Webapp navegável | — | quatro visões concluídas e revisadas em 02/08/2026 |
| Link público | 10% | **etapa atual** — só existe `api/dev/v1`; publicação a confirmar e testar |
| Validação dos dados no produto | — | concluída: 8.257.139 comparações, zero divergências |
| Oracle Select AI | — | validado tecnicamente; revalidar após o produto |
| GitHub | 20% | `v0.2.0` publicada; repositório de entrega passou a ser `medflow` |
| PPT / pitch | 10% | aguarda produto validado |
| Vídeo YouTube | 10% | aguarda produto validado |
| Apresentação técnica | 50% | aguarda produto e Select AI revalidados |

## Reorganização em curso

Iniciada em 08/08/2026. Este repositório passou a ser o de entrega; o
`fiap-1tscoa` continua como arquivo acadêmico. A linhagem original da v0.1.0
está preservada na branch `arquivo/v0-2026-07` e nas tags `v0` e `v0.1.0`.

| Fatia | Estado |
|---:|---|
| 0 | congelada: `contracts/INVENTARIO_PRE_REORG.json`, tag `pre-reorg` |
| 0b | descrição e topics do repositório corrigidos |
| 1 | histórico filtrado publicado como novo `main` |
| 2 | árvore na estrutura-alvo |
| 3 | `pyproject.toml`, `cli.py`, `Makefile` e CI |
| 4 a 10 | pendentes |

**Portão da fatia 4:** os 48 parquets precisam manter o SHA-256 registrado em
`contracts/INVENTARIO_PRE_REORG.json` depois que Bronze e Silver saírem dos
notebooks. Conferir com `medflow inventario` e comparar.

## Organização vigente

```text
medflow/
├── src/medflow/       pacote: gold, contratos, icsap, ipca, geografia,
│   │                  validar, inventario, cli
│   └── oracle/        conexão mTLS, carga e executor SQL
├── db/                o backend é o banco
│   ├── schema/        usuário, tabelas Gold e validação da carga
│   ├── views/         nove views de projeção pura; a fatia 8 reusa a da 7
│   ├── ords/          módulos ORDS; o 03 redefine o módulo inteiro
│   └── select_ai/     perguntas e SQL de referência
├── web/
│   ├── src/api/       um cliente por endpoint, com validação estrita
│   ├── src/components/ componentes reusados entre as visões
│   ├── src/routes/    uma rota por visão
│   ├── src/fixtures/  snapshots de contingência, um por endpoint
│   └── e2e/           Playwright: 29 herméticos e 2 marcados @live
├── contracts/
│   ├── dados/         contratos Bronze, Silver e Gold, e o mapeamento
│   └── INVENTARIO_*   baselines SHA-256 de 29/07 e da fatia 0
├── notebooks/         fontes 00, 01 e 02
├── data/              gitignored: bronze, silver, gold, legado
├── docs/
│   ├── decisoes/      DECISOES e a revisão de requisitos
│   ├── pesquisa/      desk research
│   ├── qualidade/     validações, figuras e notebooks executados
│   └── entregas/      sprint 1
└── tests/             pytest
```

# PENDÊNCIAS — Challenge Oracle: MedFlow

Atualizado em 11/08/2026, após a fatia 9 e a limpeza para publicação.
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
- documentação e metadados automáticos em `data/silver/`.
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
`docs/decisoes/REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md`.

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

Aquela varredura foi manual e sobre 29 competências. Desde a fatia 6 ela é
versionada em `tests/reconciliacao/` e reexecutável: a última, de 10/08/2026
sobre 30 competências, fez 8.403.103 comparações sem divergência.

Cinco defeitos objetivos foram encontrados e corrigidos antes dos commits; os
detalhes estão no `CHANGELOG.md` da sprint.

**Resolvido em 16/08/2026: o link público existe e foi testado.**
<https://lucas-d-s-1.github.io/medflow/>

O módulo de produção `api/v1` foi criado como clone do `medflow_dev`, lido dos
metadados do próprio ORDS — não uma cópia manual das 1.900 linhas de handler.
Aceita só a origem do GitHub Pages e responde 403 às demais. O site é estático
e fala direto com o Autonomous Database; não há servidor no meio.

Medido no que está publicado, não deduzido do clone:

- 42 checagens do `openapi.yaml` contra `api/v1`, todas passam
  (`make contrato-publico`);
- 31.792 comparações campo a campo contra a Gold (`make reconciliar-publico`);
- controle negativo com `ORDS_API_PATH=api/v9` reprova 32 de 42, o que mostra
  que a variável morde e as aprovações não vieram de um fallback silencioso;
- no navegador, pelo link real: as quatro visões com selo **Oracle ao vivo**,
  sete chamadas, todas em `/api/v1/`, sem erro de console;
- link profundo compartilhado abre a visão certa — o Pages responde HTTP 404 e
  serve o `index.html`, e o roteador assume.

**Ressalva honesta:** o 404 do link profundo é o comportamento padrão de SPA no
GitHub Pages. A página abre e funciona; o código de status é que não é 200.
Se isso incomodar na apresentação, o caminho é `HashRouter`, ao custo de URLs
com `#`. Compartilhar a raiz não tem esse problema.

### 7. Infraestrutura Oracle — concluída

**Tenancy resolvida em 30/07/2026.** O acesso OCI do challenge é institucional:
`rm572207@fiap.com.br` na tenancy `rm572207`, região home GRU. Não foi criada
conta Always Free pessoal. A pendência de localizar convite/tenancy está
encerrada; ver `DECISOES.md`, seção 9.

Banco `MEDFLOW` provisionado em 31/07/2026: Autonomous AI Database 26ai,
workload **Lakehouse** (a evolução do Autonomous Data Warehouse no 26ai),
Always Free, `sa-saopaulo-1`, mTLS obrigatório.

Artefatos de setup versionados em `db/` e `src/medflow/oracle/`:

| Passo | Artefato | Estado |
|---|---|---|
| Criar esquema `MEDFLOW` separado do `ADMIN` | `db/schema/01_criar_usuario_medflow.sql` | executado em 01/08/2026 |
| Testar conexão mTLS | `testar_conexao.py` | validado como `MEDFLOW` |
| Modelo dimensional, 2 dimensões e 7 marts, 175 colunas comentadas | `db/schema/02_criar_tabelas_gold.sql` | executado; 10 índices secundários |
| Carga idempotente de 585.296 linhas | `carregar_gold.py` | executada e conferida |
| Reconciliação de 36 métricas contra o contrato `0.3.0` | `db/schema/03_validar_carga.sql` | 36/36 `ok`; seis gates vazios |
| Select AI com cinco perguntas e SQL de referência | `db/select_ai/04_select_ai.sql` | bateria original validada; duas novas perguntas aguardam revalidação |

O Resource Principal usa o Dynamic Group `MedFlowADBGenAI` e a policy
`use generative-ai-family`. O profile `MEDFLOW_GENAI` está habilitado sem chave
de API externa. Os três `showsql` e `narrate` foram comparados com o SQL
convencional. Evidências em
`docs/qualidade/VALIDACAO_ORACLE_SELECT_AI.md`.

Riscos conhecidos, registrados para não virarem surpresa:

- **Select AI depende do OCI Generative AI.** A integração está funcionando,
  mas Dynamic Group, policy IAM e Resource Principal devem ser preservados e
  testados novamente antes da apresentação.
- **Always Free hiberna por inatividade.** Conectar ao menos uma vez por semana
  e confirmar o estado `Disponível` na véspera da apresentação.
  Último ping verificado em **16/08/2026**: conexão mTLS ok como `MEDFLOW`, os
  10 endpoints de `api/v1` respondendo e a Gold íntegra. **Próximo limite:
  23/08.** A automação do ping ainda não existe e está em aberto.

### 7b. Recorte avançado para 2026-06 — concluído em 09/08/2026

Decidido incluir junho e executado. O recorte oficial passa a ser
**2024-01 a 2026-06, 30 competências**.

| Métrica | 29 competências | 30 competências |
|---|---:|---:|
| AIH aprovadas | 7.034.961 | **7.284.476** |
| Internações novas | 6.905.441 | **7.150.693** |
| Hospitais | 653 | **655** |
| CIDs observados | 9.494 | **9.513** |
| Residentes SP observados | 6.846.665 | **7.089.959** |
| ICSAP | 953.656 | **988.453** |
| Evasão = atração | 906.060 | **939.143** |
| Linhas no Oracle | 585.296 | **597.725** |
| Reconciliação no banco | 36/36 ok | **36/36 ok** |

Zero lacunas de de/para mesmo com CIDs e hospitais novos: as asserções de
cobertura passaram sem intervenção.

**Nada mais pendente do avanço.** O conteúdo das dez fixtures foi regerado na
fatia 8 (B.4) e o webapp deixou de mostrar 2026-05 no estado de contingência.

**Resolvido pela fatia 6:** a revalidação campo a campo foi refeita sobre as 30
competências — **8.403.103 comparações, zero divergências** — e deixou de ser
um evento manual: `make reconciliar-completo` a reproduz quando for preciso.

### 7c. Histórico: como a decisão foi tomada

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
| Pipeline Bronze/Silver reproduzível | — | validado para 2024-01 a 2026-06 |
| Indicadores hospitalares e territoriais validados | — | concluído |
| Autonomous AI Database provisionado | — | carregado e reconciliado em 01/08/2026 |
| Webapp navegável | — | quatro visões concluídas e revisadas em 02/08/2026 |
| Link público | 10% | **concluído em 16/08/2026** — <https://lucas-d-s-1.github.io/medflow/>, servido por `api/v1` |
| Validação dos dados no produto | — | concluída e reproduzível: 8.403.103 comparações, zero divergências |
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
| 4 | Bronze e Silver saíram dos notebooks para o pacote |
| 5 | parametrização por ambiente e logging estruturado |
| 5b | recorte avançado para 2026-06, 30 competências |
| 6 | testes em três níveis e reconciliação versionada |
| 7 | `db/` como backend e o contrato OpenAPI dos 10 endpoints |
| 8 | front por funcionalidade, gerador de fixtures e specs por visão |
| 9 | README por pasta, respondendo o quê / por quê / como |
| 10 | **bloqueada** — ver abaixo |
| limpeza | o que se publica: 216 → 205 arquivos, 17,7 → 15,2 MB |

### Fatia 10 — o conflito de critério da tag `v0.3.0` deixou de existir

Dois documentos discordavam sobre quando a tag sai: a seção 7 do
`PLANO_REORGANIZACAO` a colocava como última fatia da reorganização, antes dos
passos de produto; o `VERSIONAMENTO.md` exigia primeiro o módulo `api/v1` e o
link público testado.

**Em 16/08/2026 a condição mais exigente das duas foi cumprida**, então os dois
critérios agora apontam para o mesmo lugar e não há o que arbitrar.

**Nada foi tageado mesmo assim**, por um motivo novo e diferente do antigo: a
UI vai ser refeita em duas telas, com outra narrativa e sem o vocabulário
interno (`Gold`, `mart`, `pipeline`) na interface. Tagear `v0.3.0` hoje marcaria
um produto que muda na semana seguinte. A decisão continua sendo de produto —
tagear agora o estado que funciona, ou depois da UI nova — e continua sendo do
Lucas.

**Portão da fatia 4:** os 48 parquets precisam manter o SHA-256 registrado em
`contracts/INVENTARIO_PRE_REORG.json` depois que Bronze e Silver saírem dos
notebooks. Conferir com `medflow inventario` e comparar.

### Fatia 6 — testes em três níveis, concluída em 10/08/2026

A suíte saiu de 24 para 155 testes, em três níveis com papéis distintos:
unidade (`tests/test_indicadores.py`), contrato
(`tests/test_contratos_camadas.py`) e reconciliação (`tests/reconciliacao/`).

**A reconciliação deixou de ser um script perdido em `/tmp`.** Ela lê do SQL
versionado o que precisa saber — o mapa entre nome JSON e coluna da Gold, a
ordenação de cada handler, o teto de paginação e a escala decimal de cada
número — em vez de guardar cópia dos 150 campos. Roda em dois modos:
`make reconciliar` para a amostra e `make reconciliar-completo` para a
varredura inteira.

Varredura completa executada em 10/08/2026, sobre as 30 competências:

| Endpoint | Recortes | Comparações |
|---|---:|---:|
| `regioes/resumo` | 30 | 74.400 |
| `regioes/{id}/serie` | 62 | 42.780 |
| `fluxos` | 1.890 | 372.396 |
| `icsap` | 1.860 | 212.040 |
| `hospitais` | 1.860 | 348.138 |
| `hospitais/{cnes}/serie` | 655 | 309.456 |
| `hospitais/{cnes}/especialidades` | 18.292 | 651.936 |
| `hospitais/{cnes}/cids` | 654 | 6.370.756 |
| **Total** | **25.303** | **8.403.103** |

**Zero divergências**, em 25.611 requisições e 50 minutos.

**O 429 do ORDS custou uma tentativa frustrada e vale registrar.** A primeira
varredura completa morreu com três endpoints esgotando as tentativas, porque o
recuo era por requisição — enquanto uma thread esperava, as outras duas
continuavam batendo no mesmo teto, que é global. O freio passou a ser do
cliente inteiro: um 429 em qualquer thread segura todas, o espaçamento mínimo
sobe 50ms a cada recusa e decai devagar no sucesso. Ele se estabilizou em
1,27 s entre requisições, absorveu 258 recuos e não perdeu nenhuma chamada.

**Três defeitos apareceram, e nenhum era o que eu procurava:**

1. **Um clone limpo não reproduzia a entrega.** `PERIODO_FINAL_PADRAO` ainda
   era `2026-05` com um comentário dizendo que a decisão estava em aberto —
   mas a 5b avançou o recorte e executou. `make bronze silver gold` num clone
   geraria 30 competências a menos do que está no Oracle. O recorte estava
   escrito em quatro lugares; agora é uma constante, e um teste confere o
   padrão contra o `MANIFESTO.json` real da Bronze.
2. **O `VALIDACAO_TECNICA.md` contradizia os próprios dados.** Os totais eram
   literais no gerador, três linhas abaixo de um comentário avisando que
   relatório com número fixo é pior que asserção quebrada. Passou a ser
   derivado dos metadados, e um teste compara o relatório publicado com o que
   a validação mediu.
3. **`qt_municipio` vem de uma dimensão, não do mart.** O comparador teria
   pulado o campo em silêncio. Campo pulado é campo não validado que parece
   validado; as dimensões entraram na comparação.

O padrão dos três é o mesmo que a 5b já tinha registrado — *tudo que memoriza
um total envelhece junto com o recorte* — e valia repetir aqui, porque as duas
primeiras ocorrências sobreviveram justamente por não terem teste.

### Fatia 7 — o contrato da API, concluída em 11/08/2026

A parte B.1 já estava feita desde a fatia 2: `db/` separado em `schema/`,
`views/`, `ords/` e `select_ai/`, dizendo pela estrutura que **o backend é o
banco**. Faltava B.2, o contrato.

**`contracts/openapi.yaml` descreve os 10 endpoints**: caminho, parâmetros com
formato e teto, envelope, itens campo a campo, e o comportamento de erro. Antes
disso o contrato existia duas vezes e implícito — no SQL de cada handler e nos
tipos TypeScript dos clientes do front — e quando os dois divergiam, ninguém era
avisado; descobria-se na tela.

Um terceiro arquivo só piora isso se ninguém o conferir, então
`tests/test_openapi.py` o compara com as duas fontes que já existiam: contra o
SQL (mesmos endpoints, campos, tetos e ordenação) sem tocar a rede, e contra a
API viva (a resposta real traz exatamente as chaves declaradas, nem uma a mais).

**Três defeitos apareceram ao escrever o contrato**, e os dois primeiros só
porque tentar descrever a API obriga a olhar cada parâmetro:

1. **`origem` e `regiao` eram opcionais** — e o plano subestimou o efeito.
   Omitir `origem` em `/fluxos` não devolvia "contexto vazio": devolvia
   **1.015 fluxos de todas as origens somados** numa página, com o `territory`
   inteiro nulo. `/icsap` idem, 1.178 linhas de regiões diferentes. Agora são
   obrigatórios. Ausência de filtro não é filtro vazio.

2. **`cnes` em `/hospitais` é aceito, validado e ignorado.** O `where` do
   handler nunca usa o valor: com ou sem ele, a resposta é a mesma lista de
   644 hospitais. Ninguém o envia, então não há defeito visível hoje — mas um
   parâmetro morto é pior que um parâmetro ausente, porque parece funcionar.
   Está declarado como `deprecated` no contrato, dizendo a verdade. **Não
   corrigido**: seria uma linha (`and (p.cnes is null or v.cd_cnes = p.cnes)`),
   mas muda o comportamento de um endpoint que o plano não listou.

3. **`competence` não estava sendo reconciliado.** As duas séries devolvem esse
   campo montado por concatenação, e o extrator da fatia 6 só enxerga
   `'nome' value alias.coluna`. A varredura de 8,3 milhões de comparações não
   incluía nenhuma dele. Campos derivados agora são declarados e comparados, e
   um teste pergunta à própria API quais chaves ela devolve para que o terceiro
   caso não passe despercebido.

**Sobre o código de erro.** Parâmetro inválido devolve **404 com HTML**, não
400 com JSON. Não é o desejável, é o estrutural: os handlers são consultas SQL
e uma consulta SQL não escolhe o código HTTP — cada uma valida num CTE e
termina com `where parametros_validos = 1`, então "reprovado" vira "sem linha"
e o ORDS traduz para 404. Um 400 exigiria reescrever os oito handlers como
blocos PL/SQL que atribuem `:status_code`, a maior mudança no backend desde que
ele foi validado. Decidido manter o 404 e **documentá-lo** em
`components.responses.ParametroInvalido`, com o motivo.

Verificado após redefinir o módulo no banco: Playwright 31/31 (na época), reconciliação em
amostra nos 8 endpoints sem divergência, pytest 213/213.

### Fatia 8 / B.4 — gerador de fixtures, concluído em 11/08/2026

`web/scripts/gerar-mocks.ts` regrava os dez snapshots a partir da API ao vivo,
com `make fixtures`. A competência sai do manifesto da Bronze, não do script.
O `--conferir` acusa desatualização sem escrever, e recusa fixture órfã de um
recorte anterior — que continuaria sendo importada e nunca mais atualizada.

**Quatro defeitos apareceram, e três estavam no produto, não nos testes:**

1. **`gold_updated_at` era um literal dentro de `vw_api_metodologia`.** A tela
   anunciava "Gold atualizada em 1 de ago." enquanto servia dado gerado em 10
   de ago., e o comentário da própria view prometia que o valor vinha do
   manifesto. Agora existe a tabela `gold_manifesto`, que `carregar_gold.py`
   escreve a cada carga e a view lê. O carimbo acompanha a carga porque é
   escrito por ela;
2. **duas telas cravavam a competência no texto do snapshot** — "O snapshot
   preserva JUNDIAI em 05/2026" em `FluxosView` e `HospitalView`, contradizendo
   os números logo abaixo. Passam a derivar do dado exibido;
3. **o passo de fixtures da CI nunca poderia passar.** `reancorar_fixtures.py`
   levantava `FileNotFoundError` num runner limpo, porque `data/` é gitignored.
   Um portão que nunca fecha não é portão; agora ele detecta a ausência e sai
   sem erro;
4. **34 asserções herméticas cravavam `2026-05`**, e 24 delas cravavam também
   os números do recorte. Passam a derivar tudo da fixture. Uma delas — a de
   hospital sem internação nova — cobria uma regra de produto que ficou sem
   dado no recorte novo: virou caso construído, que vale em qualquer recorte.

Duas restrições descobertas ao gerar, que valem registro porque não são
óbvias: o `limit` do snapshot **tem** de ser o mesmo que o cliente pede, e o
snapshot de diagnósticos **tem** de vir com `elegivel=1`. Em ambos os casos o
cliente rejeita a resposta, e a tela cai para um estado de contingência que não
tem plano B — o snapshot *é* o plano B.

### Fatia 8 / B.3 e B.5 — front por funcionalidade, concluído em 11/08/2026

Os arquivos estavam agrupados **por tipo**: todos os componentes juntos, todas
as chamadas de API juntas. Com 20 arquivos funciona; o problema aparece quando
se quer mexer numa visão e os arquivos dela estão espalhados por cinco pastas,
sem nada indicando quais são.

Agora cada visão é uma pasta com tudo o que lhe pertence — tela, componentes e
clientes de API. A regra para decidir onde um arquivo mora é a do plano, e é a
única: **usado por uma visão só, vive dentro dela; usado por duas ou mais, sobe
para `shared/`.** Ficaram em `lib/api/` os três clientes que o `SourceContext`
usa, porque ele serve as quatro visões.

`RoutePlaceholder.tsx` saiu: era andaime das primeiras fatias e nada o
importava havia semanas. Continua no histórico do Git.

**B.5 — um spec por visão.** O `status.spec.ts` tinha 1.670 linhas e 32 testes;
virou `regional`, `fluxos`, `hospital` e `contrato`, mais `apoio.ts` com os
snapshots, os valores derivados e o `mockLiveSource`. O motivo é prático:
quando um teste quebra, o nome do arquivo já diz onde olhar.

| Arquivo | Testes |
|---|---:|
| `e2e/regional.spec.ts` | 6 |
| `e2e/fluxos.spec.ts` | 7 |
| `e2e/hospital.spec.ts` | 9 |
| `e2e/contrato.spec.ts` | 10, dos quais 2 são `@live` |

Verificado: `tsc` e `vite build` limpos, Playwright 32/32, pytest 213,
`make contrato` 42, reconciliação em amostra sem divergência.

### Fatia 9 — READMEs de pasta, concluída em 11/08/2026

Nove pastas ganharam README respondendo **o quê, por quê e como**, e o README
raiz ganhou o mapa que aponta para todos. O critério para o conteúdo não foi
descrever a árvore — `ls` já faz isso — mas registrar as decisões que a pasta
carrega e que ninguém adivinha lendo o código:

- `data/` explica a distinção entre artefato imutável e saída regenerável, que
  governa a checagem de preservação e já produziu um defeito quando estava
  implícita;
- `docs/` explica por que a evidência datada **não** é atualizada, e o
  contraste com o `VALIDACAO_TECNICA.md`, que é gerado e sempre descreve o agora;
- `notebooks/` diz o que eles deixaram de ser, para ninguém executá-los
  achando que são o motor;
- `scripts/` explica por que o gerador de esperados exige uma conferência
  independente antes de rodar;
- `tests/` explica o que cada nível prova que os outros não provam.

Zero links quebrados nos `.md` do repositório.

### Limpeza para publicação — 11/08/2026

Feita depois da fatia 9, com uma pergunta só: o que um avaliador ou alguém que
reusa o projeto precisa ver? Saíram a configuração das ferramentas de IA
(`CLAUDE.md`, `AGENTS.md`, `.ai-memory.toml`, agora no `.gitignore` e ainda no
disco de quem trabalha aqui), o material de curso da Sprint 1, a evidência da
v0.1.0, um `requirements-geografia.txt` órfão e uma cópia congelada do
relatório de validação — que é gerado, e portanto divergia em silêncio.

Os três documentos de arquitetura viraram um. Ao fundir apareceu que a tabela
"estado real versus arquitetura-alvo" dizia *Proposto* para views, endpoints,
webapp e snapshot, todos entregues desde 02/08: a tabela que existe para
impedir que o desejado pareça entregue estava fazendo o contrário.

**Duas remoções previstas no plano não foram feitas.** `figuras/legado/` e os
CSVs de 2022-2023 são carregados pela checagem de preservação do `validar.py`,
que casa artefatos por SHA-256 — removê-los derrubaria 24 dos 38 artefatos
exigidos e o portão falharia para sempre. Custam 0,7 MB e provam que a migração
de julho não perdeu arquivo. Ficam.

Os 12 MB de referências brutas também ficam, e o `data/README.md` agora explica
por quê: URL de órgão público muda, e sem a cópia versionada com SHA-256 não há
como saber se o arquivo novo é o que produziu os números publicados.

## Organização vigente

```text
medflow/
├── src/medflow/       pacote: config, gold, contratos, icsap, ipca,
│   │                  geografia, validar, inventario, cli
│   ├── bronze/        ingestão, conversão, manifesto e referências
│   ├── silver/        dimensões, fatos, de/paras e agregados
│   └── oracle/        conexão mTLS, carga e executor SQL
├── db/                o backend é o banco
│   ├── schema/        usuário, tabelas Gold e validação da carga
│   ├── views/         nove views de projeção pura; a fatia 8 reusa a da 7
│   ├── ords/          módulos ORDS; o 03 redefine o módulo inteiro
│   └── select_ai/     perguntas e SQL de referência
├── web/
│   ├── src/features/  uma pasta por visão: tela, componentes e clientes
│   ├── src/shared/    o que serve duas ou mais visões
│   ├── src/lib/api/   clientes de status, metodologia e resumo regional
│   ├── src/mocks/     snapshots de contingência, um por endpoint
│   ├── scripts/       gerar-mocks.ts: regrava os snapshots da API ao vivo
│   └── e2e/           um spec por visão, mais contrato: 30 herméticos e 2 @live
├── contracts/
│   ├── openapi.yaml   o contrato dos 10 endpoints, conferido por teste
│   ├── dados/         contratos Bronze, Silver e Gold, e o mapeamento
│   └── INVENTARIO_*   baselines SHA-256 de 29/07 e da fatia 0
├── notebooks/         fontes 00, 01 e 02
├── data/              gitignored: bronze, silver, gold, legado
├── docs/
│   ├── decisoes/      DECISOES e a revisão de requisitos
│   ├── pesquisa/      desk research
│   └── qualidade/     validações, figuras e notebooks executados
└── tests/             três níveis
    ├── test_indicadores.py        unidade: as fórmulas nas bordas
    ├── test_contratos_camadas.py  contrato: cada camada contra seu JSON
    ├── test_openapi.py            o OpenAPI contra o SQL e contra a API
    └── reconciliacao/             a API contra a Gold, campo a campo
```

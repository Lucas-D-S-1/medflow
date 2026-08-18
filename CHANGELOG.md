# Changelog

As releases seguem a política de [`VERSIONAMENTO.md`](VERSIONAMENTO.md).
A versão da release e a versão dos contratos de dados evoluem separadamente.

## 0.3.0 — em andamento

### Adicionado

- `CONTRIBUTING.md`: primeiro uso, fluxo de trabalho, comandos por área e
  definição de pronto. O ciclo normal de desenvolvimento não depende de
  credenciais Oracle, e agora isso está escrito em algum lugar;
- `make pipeline`, que encadeia Bronze, Silver e Gold. A geografia sai junto
  porque o comando `gold` já a executa — a receita anterior,
  `make bronze silver gold geografia`, rodava a geração geográfica duas vezes;
- `make setup-py` e `make web-browser`, e um `make setup` que passou a chamar
  os dois: venv, instalação editável, `npm ci` e o Chromium do Playwright.
  Antes, `make setup` num clone novo deixava o frontend e os testes de fora, e
  reexecutá-lo depois do venv existir não atualizava nada;
- `make test-completo`, que acrescenta ao `make test` as integrações ao vivo:
  os dois testes Playwright `@live`, o contrato contra a API e a amostra da
  reconciliação.

- **link público da entrega**, em <https://lucas-d-s-1.github.io/medflow/>:
  site estático no GitHub Pages falando direto com o Autonomous Database, sem
  servidor no meio;
- módulo ORDS de produção `medflow` em `api/v1`, aceitando só a origem
  publicada e respondendo 403 às demais. `db/ords/04_modulo_medflow_prod.sql`
  não redeclara os dez handlers: clona o `medflow_dev` dos metadados do ORDS e
  recusa publicar se os dois divergirem, comparando o SQL byte a byte;
- `ORDS_API_PATH`, que aponta reconciliação, teste de contrato e gerador de
  snapshots para qualquer um dos dois módulos. Contra `api/v1`: 42 checagens do
  contrato e 31.792 comparações campo a campo, sem divergência;
- `make ords-publicar`, `make contrato-publico` e `make reconciliar-publico`;
- `web/src/lib/api/base.ts`: o prefixo da API num lugar só, no lugar dos dez
  caminhos escritos à mão;
- `.github/workflows/pages.yml`: build e deploy a cada push que toque `web/`,
  com um passo final que busca o HTML publicado e o JS que ele referencia —
  um deploy verde não prova que o link abre.

- `web/`: aplicação React + Vite com as quatro visões do produto
  (`/regional`, `/fluxos`, `/hospital`, `/metodologia`), construída em dez
  fatias verticais — cada fatia entrega view SQL, handler ORDS, snapshot de
  contingência, interface e teste, e só é commitada após revisão independente;
- dez endpoints somente leitura em `api/dev/v1`, todos `GET`, sobre nove views
  de projeção pura: `status`, `metodologia`, `regioes/resumo`,
  `regioes/{id}/serie`, `fluxos`, `icsap`, `hospitais`,
  `hospitais/{cnes}/serie`, `hospitais/{cnes}/especialidades` e
  `hospitais/{cnes}/cids`;
- snapshot local de contingência por endpoint: quando o Oracle não responde, a
  tela mostra os dados versionados com selo explícito e recusa trocar de
  recorte, em vez de misturar fontes;
- suíte Playwright cobrindo renderização contra a Gold, estados
  de erro, ausência legítima, contingência, preservação de filtros na URL e
  ausência de rolagem horizontal em 1280x800 e 390x844;
- diretório `db/` com o setup reproduzível do Autonomous AI Database,
  sem segredos versionados;
- `db/schema/01_criar_usuario_medflow.sql`: esquema de aplicação `MEDFLOW` separado
  do `ADMIN`, com `DWROLE`, quota e acesso ao Database Actions;
- `db/schema/02_criar_tabelas_gold.sql`: modelo dimensional com 2 dimensões e 7
  marts, chaves primárias, estrangeiras, índices e 175 colunas comentadas;
- `carregar_gold.py`: carga idempotente em ordem de dependência, com
  `--conferir` e `--somente`; 597.725 linhas no recorte atual;
- `db/schema/03_validar_carga.sql`: reconciliação de 36 métricas contra o contrato
  `0.3.0`, mais seis verificações de integridade;
- `db/select_ai/04_select_ai.sql`: Resource Principal OCI, profile, cinco perguntas da
  demonstração e o SQL de referência de cada uma;
- `docs/qualidade/VALIDACAO_ORACLE_SELECT_AI.md`: evidências da conexão, carga,
  reconciliação, rankings e respostas do Select AI.
- `src/medflow/icsap.py`: classificação versionada dos 19 grupos da Portaria
  SAS/MS 221/2008;
- `src/medflow/ipca.py`: leitura do número-índice IPCA/IBGE preservado na Bronze;
- marts de fluxo assistencial e ICSAP por região de residência;
- `src/medflow/oracle/executar_sql.py`: executor SQL/PLSQL pela conexão mTLS existente.

### Alterado

- `make test` passou a ser hermético: Python mais os testes de frontend que não
  tocam o Oracle. É a mesma base que a CI executa, então "passou aqui" e
  "passou lá" voltaram a significar a mesma coisa. O que exige `.env`, wallet
  ou banco no ar mora em `make test-completo`;
- `README.md` aponta para o pacote — `src/medflow/bronze/`, `silver/` e
  `gold.py` — onde ainda nomeava os três notebooks como etapas do pipeline.
  Eles deixaram de ser o motor na fatia 4; o README ainda dizia que eram;
- `ARQUITETURA.md` condensado em cinco seções: fluxo end-to-end, decisões,
  status atual e a construção técnica de cada etapa;
- `tests/README.md`, `web/README.md` e `data/README.md` acompanham os alvos
  novos; o comentário de recorte do `pyproject.toml` corrigido de 2026-05 para
  o 2026-06 que a fatia 5b entregou;

- documentação de retomada alinhada à ordem de fechamento: webapp público,
  validação dos dados do produto, revalidação do Select AI e apresentação;
- links históricos de `v0.1.0` sincronizados com a release espelhada no
  repositório consolidado;
- `.env.example` passa a apontar para o usuário `MEDFLOW`, não `ADMIN`, e
  documenta os aliases do workload Lakehouse;
- `requirements.txt` inclui `pandas`, `pyarrow` e `python-dotenv`, necessários
  à carga e ao uso seguro do `.env`;
- `README.md` do `db/` virou runbook de seis passos com os riscos de
  Always Free e de disponibilidade do Select AI;
- comentários de negócio e perguntas do Select AI explicitam os cortes de
  100 hospital-mês e 10 combinações hospital-CID.
- taxa populacional corrigida para usar região de residência no numerador;
- CMI passa a oferecer série nominal e real corrigida por IPCA;
- permanência média é persistida diretamente nas visões mensais;
- fluxos distinguem atendimento intrarregional, inter-regional em SP e entrada
  de residentes de outras UFs, sem alegar evasão para fora de SP.

### Reorganização do repositório — 08 a 10/08/2026

Este repositório passou a ser o de entrega. A linhagem original da `v0.1.0`
está preservada na branch `arquivo/v0-2026-07` e nas tags `v0` e `v0.1.0`.

**Fatia 4 — Bronze e Silver saem dos notebooks.** A ingestão, a conversão, o
manifesto, as dimensões, os fatos e os de/paras viraram `src/medflow/bronze/`
e `src/medflow/silver/`. O portão foi objetivo: SHA-256 idêntico ao inventário
congelado na fatia 0.

**Fatia 5 — parametrização e logging.** Recorte, UF e caminhos saem do
ambiente; `logging` estruturado com etapa e competência em cada linha
substitui os `print`.

**Fatia 5b — o recorte avançou para 2026-06.** O DATASUS publicou junho e a
decisão foi incluí-lo. O recorte oficial passa a ser **2024-01 a 2026-06, 30
competências**:

| Métrica | 29 competências | 30 competências |
|---|---:|---:|
| AIH aprovadas | 7.034.961 | **7.284.476** |
| Internações novas | 6.905.441 | **7.150.693** |
| Hospitais · CIDs | 653 · 9.494 | **655 · 9.513** |
| ICSAP | 953.656 | **988.453** |
| Evasão = atração | 906.060 | **939.143** |
| Linhas no Oracle | 585.296 | **597.725** |

Zero lacunas de de/para mesmo com 19 CIDs e 2 hospitais novos. Três defeitos
só apareceram porque o recorte se mexeu: `ORA-12860` na recarga, a checagem de
preservação misturando artefatos imutáveis com saídas do pipeline, e os
esperados congelados em `03_validar_carga.sql`.

**Fatia 6 — testes em três níveis.** A suíte foi de 24 para 155 testes:

- **unidade** (`tests/test_indicadores.py`): cada fórmula nas bordas —
  denominador zero, benchmark vazio, hospital sem leito SUS declarado,
  competência ausente no IPCA, internação que cruza o mês;
- **contrato** (`tests/test_contratos_camadas.py`): cada camada contra o seu
  JSON, com o validador exercitado também no caminho de reprovação;
- **reconciliação** (`tests/reconciliacao/`): a API ORDS contra a Gold, campo
  a campo, posicional e sem tolerância. Lê do SQL versionado o mapa de campos,
  a ordenação, o teto de paginação e a escala decimal, em vez de guardar cópia
  dos 150 campos. Dois modos: amostra e varredura completa.

A varredura completa sobre as 30 competências deu **8.403.103 comparações e
zero divergências**, em 25.303 recortes e 25.611 requisições. O que antes era
um evento manual de dez fatias virou `make reconciliar-completo`.

O 429 do ORDS derrubou a primeira tentativa: o recuo era por requisição, mas o
limite é global — enquanto uma thread esperava, as outras duas seguiam batendo.
O freio passou a ser do cliente inteiro, com espaçamento adaptativo. Estabilizou
em 1,27 s entre chamadas e absorveu 258 recuos sem perder nenhuma.

Três defeitos encontrados pelos testes novos:

1. `PERIODO_FINAL_PADRAO` ainda era `2026-05`, então um clone limpo não
   reproduzia o recorte entregue. O recorte estava escrito em quatro lugares;
   virou uma constante, conferida contra o `MANIFESTO.json` da Bronze;
2. o `VALIDACAO_TECNICA.md` trazia os totais como literais e contradizia os
   próprios dados; passou a ser derivado dos metadados;
3. `qt_municipio` vem de uma dimensão, não do mart, e teria sido pulado em
   silêncio pelo comparador.

**Fatia 7 — o contrato da API.** `contracts/openapi.yaml` descreve os 10
endpoints: parâmetros com formato e teto, envelope, itens campo a campo e
comportamento de erro. `tests/test_openapi.py` o confere contra o SQL dos
handlers e contra a API viva, para que o contrato não vire uma terceira versão
da verdade ao lado do SQL e dos tipos TypeScript.

Três defeitos apareceram ao escrever o contrato:

1. **`origem` em `/fluxos` e `regiao` em `/icsap` passam a ser obrigatórios.**
   Omitidos, os endpoints devolviam 200 somando fluxos e grupos de **todas** as
   regiões numa página só, com o contexto nulo — 1.015 e 1.178 linhas de
   territórios diferentes. Ausência de filtro não é filtro vazio;
2. **`cnes` em `/hospitais` é aceito, validado e ignorado** pelo `where`.
   Declarado `deprecated` no contrato em vez de silenciado. Não corrigido: o
   plano não listou esse endpoint;
3. **`competence` não estava sendo reconciliado.** As séries montam esse campo
   por concatenação, e o extrator da fatia 6 só enxergava projeções diretas de
   coluna. Campos derivados agora entram na comparação, e um teste pergunta à
   API quais chaves ela devolve para fechar o buraco.

Parâmetro inválido continua devolvendo **404 com HTML**, não 400 com JSON: os
handlers são consultas SQL, e uma consulta SQL não escolhe o código HTTP. O
contrato documenta o motivo em vez de descrever um 400 que não existe.

**Fatia 8 / B.4 — gerador de fixtures.** `web/scripts/gerar-mocks.ts` regrava
os dez snapshots a partir da API ao vivo (`make fixtures`), com a competência
lida do manifesto da Bronze. As fixtures deixaram de descrever 2026-05.

Quatro defeitos, três deles no produto:

1. **`gold_updated_at` era literal dentro de `vw_api_metodologia`** e ficou
   congelado em 01/08 enquanto a Gold era regerada em 10/08 — a tela anunciava
   uma data que o dado contradizia. Passa a vir da tabela `gold_manifesto`,
   escrita por `carregar_gold.py` a cada carga;
2. **`FluxosView` e `HospitalView` cravavam a competência** no texto do estado
   de contingência ("O snapshot preserva JUNDIAI em 05/2026"), contradizendo os
   números logo abaixo. Passam a derivar do dado exibido;
3. **o passo de fixtures da CI nunca poderia passar**: `reancorar_fixtures.py`
   levantava `FileNotFoundError` num runner limpo, porque `data/` é gitignored;
4. 34 asserções herméticas cravavam a competência e 24 cravavam também os
   números. Passam a derivar da fixture; a suíte foi de 31 para 32 testes.

**Limpeza para publicação.** O repositório saiu de 216 para 205 arquivos e de
17,7 para 15,2 MB, com uma pergunta só: o que um avaliador ou alguém que reusa
o projeto precisa ver? Saíram a configuração das ferramentas de IA, o material
de curso da Sprint 1, a evidência da v0.1.0, um `requirements-geografia.txt`
órfão e uma cópia congelada de um relatório que é gerado.

Os três documentos de arquitetura — `arquitetura.md`, `ARQUITETURA_CAMADAS.md`
e `PIPELINE.md`, 838 linhas descrevendo a mesma coisa em recortes diferentes —
viraram `ARQUITETURA.md`. Fundir revelou que a tabela "estado real versus
arquitetura-alvo" ainda dizia *Proposto* para views, endpoints, webapp e
snapshot, todos entregues desde 02/08.

Duas remoções previstas no plano **não** foram feitas: `figuras/legado/` e os
CSVs de 2022-2023 são carregados pela checagem de preservação, que casa
artefatos por SHA-256. Removê-los derrubaria 24 dos 38 artefatos exigidos.

### Validado em 01/08/2026

- conexão mTLS como `MEDFLOW`;
- 9 tabelas, 175 colunas comentadas e 10 índices secundários;
- 585.296 linhas carregadas e conferidas;
- 36/36 métricas `ok` e seis verificações de integridade vazias;
- 6.846.665 internações de residentes SP, 906.060 fluxos inter-regionais e
  953.656 ICSAP reconciliadas;
- bateria original do OCI Generative AI validada; duas perguntas novas ficam
  para a revalidação do Select AI após o produto.

### Validado em 02/08/2026 — webapp

Cada uma das dez fatias foi revisada contra a Gold antes do commit, percorrendo
o endpoint inteiro e comparando campo a campo com os parquets em
`dados/gold/marts/`:

| Endpoint | Cobertura | Comparações |
|---|---|---:|
| `fluxos` | 28.492 pares origem–destino | 372.470 |
| `icsap` | 34.162 grupos | 226.548 |
| `hospitais` | 18.690 hospital-competências | 347.208 |
| `hospitais/{cnes}/serie` | 18.690 pontos em 653 hospitais | 324.913 |
| `hospitais/{cnes}/especialidades` | 52.525 linhas | 718.760 |
| `hospitais/{cnes}/cids` | 447.334 linhas | 6.267.240 |

**8.257.139 comparações no total, zero divergências.** O teste é exato, não por
tolerância: a API tem que devolver a Gold arredondada para a escala declarada
da coluna Oracle. A comparação é posicional contra a parquet ordenada pelas
mesmas chaves do `order by` de cada handler, o que prova a ordenação declarada
em cada contrato.

Também validado: `npx tsc -b --noEmit` e `npm run build` limpos; Playwright
31/31; dez handlers no banco, **todos `GET`**, `user_ords_enabled_objects`
igual a zero; bundle de produção sem host Oracle, wallet ou credencial; nenhuma
seção passando de metade da altura da página em 1280x800 nem em 390x844.

### Corrigido durante a revisão do webapp

- competência anterior à janela de dados era exibida como falha do endpoint,
  quando o endpoint respondia 200 com `count` zero. O cliente passou a
  classificar os blocos de contexto em completo, ausente e inválido, e a tela
  distingue ausência legítima de erro em todos os endpoints;
- o `limit` padrão declarado em `fluxos` era inalcançável: o
  `p_items_per_page` do módulo ORDS preenche o bind `:limit` antes do SQL, e o
  `coalesce` do handler nunca disparava. Declaração alinhada ao observável;
- `benchmark_zero` estava rotulado como "sem hospital par na região" quando
  significa o oposto: existem de 1 a 10 hospitais pares, mas a permanência
  média deles é zero, o que tornaria o IPR uma divisão por zero;
- a lista de hospitais numa seção única passava de metade da altura da página;
  foi dividida em prévia e bloco de menor volume;
- o recorte de diagnósticos elegíveis era um controle dentro do painel que ele
  mesmo refazia, e sumia da tela durante a nova requisição.

## 0.2.0 — publicado em 29/07/2026

### Adicionado

- camada Gold com TMH, IPR, IS, CMI e IPH estimado;
- população IBGE 2022 por município e região;
- GeoJSON e TopoJSON das 62 regiões de saúde;
- contratos JSON e dicionários gerados para Bronze, Silver e Gold;
- validação integrada de esquema, fórmulas, hashes e geografia.

### Alterado

- Bronze separada entre origem imutável, DBF intermediário e Parquet;
- Silver restrita a dimensões e fatos;
- nomes Silver padronizados em `snake_case` com prefixos semânticos;
- `fato_leitos_mensal` renomeada para `fato_leito_mensal`;
- caminhos de notebooks executados, figuras e referências reorganizados.

### Incompatibilidades

- consumidores da Silver `0.1.x` precisam aplicar
  `contratos/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv`;
- tabelas `base_hospital_*` não existem mais na Silver;
- artefatos de 2022–2023 ficam somente em `data/legado/`;
- o proxy baseado em `QT_DIARIAS` não alimenta o IPH Gold.

## 0.1.0 — 29/07/2026

- pipeline Bronze/Silver reproduzível para 2024-01 a 2026-05;
- domínios, qualidade e batch mensal validados;
- primeira publicação pública do MedFlow.

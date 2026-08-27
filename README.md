# MedFlow: onde investigar primeiro

**Do sinal territorial à hipótese: com fonte, amostra e limite à vista.**

Enterprise Challenge FIAP × Oracle · Sprint 2 · Equipe Ômega Urban Tech

## O problema, do lado de quem decide

Para saber onde investigar primeiro, o gestor regional precisa cruzar à mão o
SIH, o CNES, a população e a lista ICSAP, porque cada base foi feita para uma
finalidade própria e nenhuma responde sozinha à pergunta dele.

A persona é o **gestor ou analista regional de saúde de São Paulo** que recebe
uma nova competência de dados públicos hospitalares e precisa priorizar o que
olhar. O MedFlow conduz uma triagem auditável em quatro passos, região →
hospital → especialidade ou diagnóstico → hipótese, carregando fonte, amostra,
benchmark e limitação em cada tela. A decisão e a ação continuam com as equipes
locais.

Recorte solicitado: Estado de São Paulo, competências de 2024 a 2026. Recorte
disponível e validado: **2024-01 a 2026-06 (30 meses)**.

## Os três formatos de dado, e o papel de cada um

| Formato | Fonte | Papel |
|---|---|---|
| Relacional | SIH/RD e as tabelas Gold | fatos, dimensões, indicadores e consultas |
| JSON | API atual do CNES | cadastro atual do estabelecimento e atributos variáveis |
| CSV / External Table | regiões de saúde e população IBGE 2022, do Ministério da Saúde | taxas populacionais e integração no Oracle |

## O produto está no ar

<https://lucas-d-s-1.github.io/medflow/>

Site estático no GitHub Pages falando direto com o Autonomous Database pelo
módulo ORDS público `api/v1`, somente leitura. Publicado e conferido no
navegador em 16/08/2026. Versão pública estável:
[`v0.4.0`](https://github.com/Lucas-D-S-1/medflow/releases/tag/v0.4.0), com
Oracle carregado, API pública, WebApp no ar, FlowIA contextual, Select AI
governado no ORDS, busca hospitalar por alias e território municipal. A
evidência da comparação temporal final está em
[`docs/qualidade/AVALIACAO_FLOWIA_PARCIAL_F12.md`](docs/qualidade/AVALIACAO_FLOWIA_PARCIAL_F12.md),
e o roteiro anterior permanece em
[`docs/qualidade/REVALIDACAO_SELECT_AI.md`](docs/qualidade/REVALIDACAO_SELECT_AI.md).

**O acordo de disponibilidade.** O Autonomous Database é Always Free e para
sozinho depois de sete dias sem atividade. Com ele no ar, a entrega é uma só,
ao vivo contra o Oracle. Sem ele, o webapp cai para dez snapshots de
contingência, com selo explícito na tela, e recusa misturar as duas origens
dentro do mesmo recorte.

## Por onde continuar

Proposta metodológica e revisão dos requisitos:
[`docs/decisoes/REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md`](docs/decisoes/REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md).

Arquitetura detalhada:
[`ARQUITETURA.md`](ARQUITETURA.md).
Instalação e mapa do repositório:
[`HOW_TO_INSTALL.md`](HOW_TO_INSTALL.md).
Nomenclatura:
[`contracts/NOMENCLATURA.md`](contracts/NOMENCLATURA.md).
Contrato da API:
[`contracts/openapi.yaml`](contracts/openapi.yaml).
Último gate:
[`VALIDACAO_TECNICA.md`](VALIDACAO_TECNICA.md).
Mudanças incompatíveis:
[`CHANGELOG.md`](CHANGELOG.md).
Política de tags e releases:
[`VERSIONAMENTO.md`](VERSIONAMENTO.md).
Como contribuir:
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## Pipeline atual

O pipeline possui três camadas com responsabilidades explícitas:

```text
SIH/RD + CNES/LT + referências oficiais MS/DATASUS/IBGE
                  │
                  ▼
src/medflow/bronze/
BRONZE: ingestão fiel, linhagem, manifesto e hashes
                  │
                  ▼
src/medflow/silver/
SILVER: tipos analíticos, de/paras, dimensões, fatos e qualidade
                  │
                  ▼
src/medflow/gold.py + geografia.py
GOLD: indicadores hospitalares/territoriais, fluxos, ICSAP e geografia
```

### Bronze — não contém regra de negócio

A etapa Bronze, implementada em `src/medflow/bronze/`:

- preserva DBC em `data/bronze/origem/datasus/`;
- mantém DBF apenas como cache em `data/bronze/intermediario/dbf/`;
- descobre as competências comuns de SIH/RD e CNES/LT dentro de 2024–2026;
- baixa somente arquivos ainda ausentes no cache a cada batch mensal;
- serializa o conteúdo DBF em Parquet sem filtro, imputação ou de/para;
- acrescenta apenas linhagem técnica de arquivo e competência;
- preserva as respostas e arquivos oficiais de município, região de saúde,
  CID-10, IPCA, natureza jurídica e cadastro atual dos estabelecimentos;
- grava Parquets fiéis em `data/bronze/parquet/`;
- grava `data/bronze/MANIFESTO.json` com fonte, volumetria e SHA-256;
- preserva também o CSV oficial de regiões/população e a malha IBGE 2024.

Saídas validadas:

| Artefato | Linhas | Colunas |
|---|---:|---:|
| `sih_rd_sp_2024_2026.parquet` | 7.284.476 | 117 |
| `cnes_lt_sp_2024_2026.parquet` | 251.457 | 31 |
| `ibge_municipios_sp_raw.json` | 645 municípios | — |
| `ms_regioes_saude_sp_raw.json` | 645 municípios | — |
| `ms_cnes_estabelecimentos_atuais_raw.json` | 655 hospitais | — |
| `datasus_cid10_2008.zip` | 6 tabelas | — |
| `ibge_concla_natureza_juridica_2021.html` | página oficial | — |
| `ibge_ipca_numero_indice_raw.json` | 30 competências | — |

As colunas adicionais em relação à fonte são somente de linhagem.

### Silver — dimensões e fatos conformados

A etapa Silver, implementada em `src/medflow/silver/`:

- tipa os campos usados analiticamente;
- documenta e aplica os de/paras;
- preserva `N_AIH`, `IDENT` e `COD_IDADE`;
- separa AIH aprovada, internação nova e continuação de longa permanência;
- distingue `QT_DIARIAS` de `DIAS_PERM`;
- associa região e macrorregião oficiais pela referência municipal do MS;
- preserva a região histórica do CNES/LT para auditoria de conflitos;
- enriquece hospitais com nome e esfera **atuais**, sem tratá-los como
  atributos historicamente vigentes;
- usa `dropna=False` nos agregados e reconcilia os totais;
- padroniza colunas em `snake_case` com prefixos semânticos;
- publica somente dimensões e fatos, sem antecipar regra da Gold.

Saídas canônicas:

| Base | Linhas | Papel |
|---|---:|---|
| `silver/fatos/fato_internacao` | 7.284.476 | AIH aprovada, tipada e enriquecida |
| `silver/fatos/fato_leito_mensal` | 19.341 | capacidade CNES por hospital e mês |
| `silver/dimensoes/dim_municipio` | 645 | município, região e população IBGE 2022 |
| 8 outras dimensões | — | tempo, hospital, especialidade, CID, domínios, território municipal, território atual do hospital e aliases |

A Silver também gera:

- `DICIONARIO.md`;
- `qualidade/DOMINIOS.md`;
- `qualidade/RELATORIO_QUALIDADE.md`;
- `qualidade/METADADOS.json`;
- `contratos/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv`.

### Gold — índices e consumo

A etapa Gold, implementada em `src/medflow/gold.py`, `icsap.py`, `ipca.py` e
`geografia.py`, publica:

| Mart | Linhas | Indicadores |
|---|---:|---|
| `mart_indicador_hospital_mensal` | 19.341 | IPH, TMH, CMI nominal/real e permanência |
| `mart_indicador_hospital_especialidade_mensal` | 54.328 | TMH, CMI e permanência com amostra |
| `mart_indicador_hospital_cid_periodo` | 455.054 | IPR e benchmark regional |
| `mart_indicador_regiao_mensal` | 1.860 | oferta, residência, IS, fluxo e ICSAP |
| `mart_indicador_regiao_periodo` | 62 | distribuição regional do IPR |
| `mart_fluxo_assistencial_regiao_mensal` | 31.033 | origem–destino assistencial |
| `mart_icsap_regiao_mensal` | 35.340 | 19 grupos ICSAP por residência |

Também são gerados:

- `dim_geografia_municipio.csv`;
- `dim_geografia_regiao.csv`;
- `mapa_regiao_saude_sp.geojson`;
- `mapa_regiao_saude_sp.topojson`.

### Oracle e Select AI — carga validada e roteiro revalidado

A Gold está carregada no Autonomous AI Database 26ai `MEDFLOW`, workload
Lakehouse, região São Paulo:

- esquema de aplicação separado do `ADMIN`;
- 5 dimensões, 7 marts, 209 colunas comentadas e 10 índices secundários;
- 597.930 linhas carregadas e conferidas após a migração territorial;
- 39/39 métricas Oracle com estado `ok`, incluindo as dimensões territoriais;
- profile `MEDFLOW_GENAI` usando OCI Generative AI por Resource Principal, sincronizado com os doze objetos analíticos;
- roteiro de 13 perguntas em cinco blocos, oito com SQL de referência conferido
  por execução. Na rodada de 23/08/2026, seis das oito coincidiram exatamente;
  as divergências e as limitações de narrativa/conversação estão registradas,
  não escondidas.

Runbook e evidências:
[`db/README.md`](db/README.md) e
[`docs/qualidade/REVALIDACAO_SELECT_AI.md`](docs/qualidade/REVALIDACAO_SELECT_AI.md).
A leitura dos limites medidos está em
[`docs/qualidade/LEITURA_SELECT_AI.md`](docs/qualidade/LEITURA_SELECT_AI.md), e
a base versionada da demonstração APEX, em [`db/apex/`](db/apex/README.md).

### Webapp — concluído e revisado em 26/08/2026

O produto é uma aplicação React + Vite em `web/`, servida por dez endpoints
ORDS analíticos somente leitura (`GET`) sobre nove views de projeção pura e um
`POST` governado para perguntas livres do assistente. Nenhum objeto da Gold é
publicado por AutoREST.

Os endpoints existem em dois módulos: `api/dev/v1`, que aceita só `localhost` e
é onde se trabalha, e `api/v1`, que aceita só a origem do site publicado e é
quem serve o link da entrega. O segundo é clone do primeiro, gerado dos
metadados do ORDS e recusado se divergir. Ver [`db/README.md`](db/README.md).

O contrato das onze operações está em
[`contracts/openapi.yaml`](contracts/openapi.yaml), conferido por teste contra
o SQL dos handlers e contra a API viva. Um contrato que ninguém confere vira
só uma terceira versão da verdade.

| Rota | Pergunta que responde | Endpoints |
|---|---|---|
| `/regional` | Onde está o sinal e como ele evolui? | `regioes/resumo`, `regioes/{id}/serie` |
| `/fluxos` | A população é atendida no próprio território, e quais condições sensíveis puxam a demanda? | `fluxos`, `icsap` |
| `/hospital` | O que explica o sinal e onde ele se concentra? | `hospitais`, `.../serie`, `.../especialidades`, `.../cids` |
| `/metodologia` | Posso confiar no número e quais são seus limites? | `status`, `metodologia` |
| assistente flutuante | O que este indicador significa e o que devo investigar? | respostas locais; fallback `POST assistente/perguntar` |

Regras que o produto respeita, detalhadas em
[`DECISOES.md`](docs/decisoes/DECISOES.md), seção 10:

- nenhum indicador é calculado fora da Gold — o front formata com `Intl`, não
  calcula, e não inventa faixas nem cortes;
- ausência legítima nunca é exibida como falha do endpoint, e indicador sem
  denominador diz o motivo em vez de mostrar número;
- fontes nunca se misturam: quando o Oracle não responde, a tela vai para o
  snapshot de contingência com selo explícito e recusa trocar de recorte;
- endpoints da mesma rota falham de forma independente;
- IPH não é apresentado como ocupação real, ICSAP não é apresentada como
  evitabilidade individual e IPR não é apresentado como qualidade ou desfecho;
- perguntas conceituais do assistente são determinísticas e não consomem IA;
  perguntas livres têm limite de cinco por sessão no cliente e 50 por dia no
  banco, com SQL guardado, auditado e nunca executado pela rota web;
- nenhuma seção passa de metade da altura da página, sem rolagem horizontal em
  1280x800 nem em 390x844.

Os dados exibidos são validados contra a Gold **campo a campo, posicional e
sem tolerância**. A última varredura completa, em 10/08/2026 sobre as 30
competências, fez **8.403.103 comparações com zero divergências**, cobrindo os
marts inteiros. Números renderizados foram lidos do DOM com Playwright e
conferidos contra os parquets.

Isso deixou de ser um evento manual: `make reconciliar-completo` reproduz a
varredura, e `make reconciliar` roda a amostra em segundos. O método está em
[`tests/reconciliacao/README.md`](tests/reconciliacao/README.md); a cobertura
por endpoint, no [`CHANGELOG.md`](CHANGELOG.md).

Para rodar o webapp em desenvolvimento, com o `.env` da raiz configurado:

```bash
cd web && npm run dev
```

O Vite serve em `http://127.0.0.1:5173` e faz proxy de `/api` para o ORDS, de
modo que o navegador nunca recebe host nem credencial do Oracle. Testes:
`npx playwright test`.

## O que a validação encontrou

| Controle | Resultado |
|---|---:|
| AIHs aprovadas | 7.284.476 |
| AIHs distintas (`N_AIH`) | 7.155.059 |
| Internações novas (`IDENT=1`) | 7.150.693 |
| Continuações de longa permanência (`IDENT=5`) | 133.783 |
| Cobertura dos 15 códigos `ESPEC` observados | 100% |
| Cobertura de capítulo CID | 100% |
| Hospitais SIH sem correspondência no CNES/LT | 0 |
| Hospitais com região conflitante | 4 |
| Registros sem região de saúde | 0 |
| CIDs sem descrição | 0 |
| Hospitais sem nome/esfera atuais | 0 |
| Hospitais sem natureza jurídica | 0 |
| `QT_DIARIAS == DIAS_PERM` | 70,0547% |
| `QT_DIARIAS=0` e `DIAS_PERM>0` | 181.584 |
| Internações que cruzam mês | 15,0798% |
| Competência diferente do mês da saída | 18,7633% |

## Situação metodológica dos índices

| Índice | Contrato Gold |
|---|---|
| TMH | óbitos / internações novas; mínimo de 30 para classificação |
| IPR | permanência hospital/CID / benchmark regional sem o hospital; cortes 20/50/3 |
| CMI | valor aprovado / internações novas; nominal preservado e real por IPCA |
| IS | 2026 / média do mesmo mês em 2024 e 2025 |
| IPH | pacientes-dia reconstruídos / leitos-dia mensais declarados |
| Taxa residente | internações de residentes atendidos em SP / população × 100 mil |
| Fluxo | residência × região do hospital; evasão somente intrastadual observada |
| ICSAP | Portaria 221/2008 por residência, taxa e 19 grupos |
| Permanência média | soma dos dias / internações novas |

O IPH atual não usa `QT_DIARIAS`: os pacientes-dia são distribuídos pelos
meses civis entre entrada e saída. O denominador ainda é capacidade mensal
declarada no CNES, portanto o resultado é pressão estimada e não ocupação real.

## Cobertura dos domínios

Todos os códigos observados estão cobertos:

- `NAT_JUR`: CONCLA/IBGE 2021;
- `REGSAUDE`: referência oficial DEMAS/MS por município;
- `DIAG_PRINC`: DATASUS CID-10 2008 e complementos oficiais do MS;
- `MARCA_UTI`: MS/DATASUS e Centro de Estudos da Metrópole;
- nome e esfera administrativa: API oficial atual do CNES.

O recorte CNES/LT traz `ESFERA_A` vazio. Esse campo bruto continua vazio:
nome e esfera atuais foram adicionados em colunas próprias, com flag temporal,
para impedir que uma fotografia atual seja apresentada como cadastro de
2024–2026.

## Onde fica o quê

Cada pasta tem um README que responde o quê, por quê e como. O mapa:

| Pasta | O que é | README |
|---|---|---|
| `src/medflow/` | o pipeline: Bronze, Silver, Gold e a carga do Oracle | [ler](src/medflow/README.md) |
| `db/` | **o backend**: schema, views de projeção e módulos ORDS | [ler](db/README.md) |
| `web/` | o produto: quatro visões em React + Vite | [ler](web/README.md) |
| `contracts/` | o que o projeto promete, e quem confere cada promessa | [ler](contracts/README.md) |
| `tests/` | três níveis, três garantias diferentes | [ler](tests/README.md) |
| `data/` | as camadas materializadas; quase tudo fora do Git | [ler](data/README.md) |
| `docs/` | decisões, pesquisa, evidência datada e entregas | [ler](docs/README.md) |
| `notebooks/` | a narrativa do pipeline — leitura, não motor | [ler](notebooks/README.md) |
| `scripts/` | utilitários de manutenção que não produzem dado | [ler](scripts/README.md) |

## Como executar

Pré-requisitos: Git, Make, Python 3.12+ e Node.js 24. `uv` é recomendado; sem
ele, o Python precisa incluir os módulos `venv` e `pip`. Num clone limpo, o
primeiro ciclo completo é:

```bash
git clone https://github.com/Lucas-D-S-1/medflow.git
cd medflow
make setup                      # Python, frontend e Chromium do Playwright
make test                       # não exige .env, wallet, Oracle nem dados locais
```

Para materializar os dados públicos e validar as três camadas:

```bash
make pipeline                   # Bronze, Silver, Gold e geografia
make validar
```

Esse caminho também não exige credenciais. Ele baixa as fontes públicas e
ocupa cerca de 11 GB. Cada etapa é idempotente: reexecutar o mesmo recorte não
duplica registro nem reescreve Parquet sem necessidade. A Bronze incorpora
automaticamente as competências comuns novas de SIH/RD e CNES/LT.

**Trocar o recorte é configuração, não código.** O padrão vive em
`src/medflow/config.py` e acompanha o que foi entregue; para experimentar
outro, use o ambiente:

```bash
MEDFLOW_PERIODO_FINAL=2026-07 make bronze silver gold
```

Os notebooks em `notebooks/` continuam sendo a leitura narrada do pipeline,
mas não são mais o motor.

### Testes

```bash
make test                    # Python + frontend, hermético e sem credenciais
make lint                    # ruff
make test-completo           # acrescenta Oracle e integrações ao vivo
make reconciliar             # amostra: API contra a Gold, campo a campo
make reconciliar-completo    # a varredura inteira, sob demanda
```

Os testes estão em três níveis, e cada um prova algo que os outros não provam:

| Nível | Onde | O que garante |
|---|---|---|
| unidade | `tests/test_indicadores.py` | cada fórmula nas bordas: denominador zero, benchmark vazio, hospital sem leito declarado, competência ausente |
| contrato | `tests/test_contratos_camadas.py` | cada camada obedece ao seu JSON, e o validador reprova o que deve reprovar |
| contrato da API | `tests/test_openapi.py` | o `openapi.yaml` bate com o SQL dos handlers e com a API viva |
| reconciliação | `tests/reconciliacao/` | o que a API devolve é o que está na Gold — mesmo dígito, mesma ordem |

A suíte padrão é a mesma base hermética usada pela CI. Testes que precisam dos
Parquets se pulam num clone ainda não materializado; integrações ao vivo ficam
em alvos explícitos. O detalhe está em
[`tests/README.md`](tests/README.md) e
[`tests/reconciliacao/README.md`](tests/reconciliacao/README.md).

Para o Oracle e o webapp, com o `.env` da raiz configurado a partir de
`.env.example`:

```bash
python3 src/medflow/oracle/executar_sql.py db/views/07_vw_api_hospitais.sql
python3 src/medflow/oracle/executar_sql.py db/ords/03_modulo_medflow_dev.sql
cd web && npm run dev
```

Em `db/views/` há uma view por fatia. Em `db/ords/`, cada
arquivo numerado é uma **redefinição cumulativa do módulo inteiro**: o `03`
define os dez handlers e é o único que precisa ser reaplicado ao mudar
qualquer endpoint.

## Fontes

- SIH/SUS — AIH reduzida (RD):
  `ftp.datasus.gov.br/dissemin/publicos/SIHSUS/200801_/Dados`
- CNES — Leitos (LT):
  `ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT`
- IBGE — Localidades:
  `servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios`
- Ministério da Saúde — API de Dados Abertos:
  `apidadosabertos.saude.gov.br`
- DATASUS — tabelas CID-10:
  `www2.datasus.gov.br/cid10/V2008/download.htm`
- CONCLA/IBGE — Natureza Jurídica 2021:
  `concla.ibge.gov.br/documentacao/3051-concla/estrutura/natureza-juridica-2021.html`
- IBGE/SIDRA — IPCA, tabela 1737, variável 2266:
  `apisidra.ibge.gov.br`
- Ministério da Saúde — Lista Brasileira de ICSAP, Portaria SAS/MS 221/2008:
  `bvsms.saude.gov.br/bvs/saudelegis/sas/2008/prt0221_17_04_2008.html`

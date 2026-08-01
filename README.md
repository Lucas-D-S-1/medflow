# MedFlow — pipeline de dados

**Enterprise Challenge FIAP × Oracle · Sprint 2 · Equipe Ômega Urban Tech**

Recorte solicitado: Estado de São Paulo, competências de 2024 a 2026.
Recorte disponível e validado: **2024-01 a 2026-05 (29 meses)**.
Versão pública estável:
[`v0.2.0`](https://github.com/Lucas-D-S-1/fiap-1tscoa/releases/tag/v0.2.0),
com Silver canônica, Gold, contratos de dados e ativos geográficos.
A [`v0.1.0`](https://github.com/Lucas-D-S-1/medflow/releases/tag/v0.1.0)
permanece como o primeiro marco público do pipeline Bronze/Silver.

Proposta metodológica e revisão dos requisitos:
[`REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md`](REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md).

Arquitetura detalhada:
[`ARQUITETURA_CAMADAS.md`](ARQUITETURA_CAMADAS.md).
Nomenclatura:
[`CONTRATO_NOMENCLATURA.md`](CONTRATO_NOMENCLATURA.md).
Último gate:
[`VALIDACAO_TECNICA.md`](VALIDACAO_TECNICA.md).
Mudanças incompatíveis:
[`CHANGELOG.md`](CHANGELOG.md).

## Estado validado em 29/07/2026

O pipeline possui três camadas com responsabilidades explícitas:

```text
SIH/RD + CNES/LT + referências oficiais MS/DATASUS/IBGE
                  │
                  ▼
00_extracao_dados.ipynb
BRONZE: ingestão fiel, linhagem, manifesto e hashes
                  │
                  ▼
01_engenharia_dados.ipynb
SILVER: tipos analíticos, de/paras, dimensões, fatos e qualidade
                  │
                  ▼
02_analise_dados.ipynb
GOLD: cinco índices, comparações regionais e geografia para o BI
```

### Bronze — não contém regra de negócio

O notebook `00_extracao_dados.ipynb`:

- preserva DBC em `dados/bronze/origem/datasus/`;
- mantém DBF apenas como cache em `dados/bronze/intermediario/dbf/`;
- descobre as competências comuns de SIH/RD e CNES/LT dentro de 2024–2026;
- baixa somente arquivos ainda ausentes no cache a cada batch mensal;
- serializa o conteúdo DBF em Parquet sem filtro, imputação ou de/para;
- acrescenta apenas linhagem técnica de arquivo e competência;
- preserva as respostas e arquivos oficiais de município, região de saúde,
  CID-10, natureza jurídica e cadastro atual dos estabelecimentos;
- grava Parquets fiéis em `dados/bronze/parquet/`;
- grava `dados/bronze/MANIFESTO.json` com fonte, volumetria e SHA-256;
- preserva também o CSV oficial de regiões/população e a malha IBGE 2024.

Saídas validadas:

| Artefato | Linhas | Colunas |
|---|---:|---:|
| `sih_rd_sp_2024_2026.parquet` | 7.034.961 | 117 |
| `cnes_lt_sp_2024_2026.parquet` | 243.085 | 31 |
| `ibge_municipios_sp_raw.json` | 645 municípios | — |
| `ms_regioes_saude_sp_raw.json` | 645 municípios | — |
| `ms_cnes_estabelecimentos_atuais_raw.json` | 653 hospitais | — |
| `datasus_cid10_2008.zip` | 6 tabelas | — |
| `ibge_concla_natureza_juridica_2021.html` | página oficial | — |

As colunas adicionais em relação à fonte são somente de linhagem.

### Silver — dimensões e fatos conformados

O notebook `01_engenharia_dados.ipynb`:

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
| `silver/fatos/fato_internacao` | 7.034.961 | AIH aprovada, tipada e enriquecida |
| `silver/fatos/fato_leito_mensal` | 18.690 | capacidade CNES por hospital e mês |
| `silver/dimensoes/dim_municipio` | 645 | município, região e população IBGE 2022 |
| 5 outras dimensões | — | tempo, hospital, especialidade, CID e domínios |

O notebook também gera:

- `DICIONARIO.md`;
- `qualidade/DOMINIOS.md`;
- `qualidade/RELATORIO_QUALIDADE.md`;
- `qualidade/METADADOS.json`;
- `contratos/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv`.

### Gold — índices e consumo

O notebook `02_analise_dados.ipynb` publica:

| Mart | Linhas | Indicadores |
|---|---:|---|
| `mart_indicador_hospital_mensal` | 18.690 | IPH estimado, TMH e CMI |
| `mart_indicador_hospital_especialidade_mensal` | 52.525 | TMH e CMI com amostra |
| `mart_indicador_hospital_cid_periodo` | 447.334 | IPR e benchmark regional |
| `mart_indicador_regiao_mensal` | 1.798 | IS, IPH, TMH, CMI e taxa populacional |
| `mart_indicador_regiao_periodo` | 62 | distribuição regional do IPR |

Também são gerados:

- `dim_geografia_municipio.csv`;
- `dim_geografia_regiao.csv`;
- `mapa_regiao_saude_sp.geojson`;
- `mapa_regiao_saude_sp.topojson`.

### Oracle e Select AI — validados em 01/08/2026

A Gold está carregada no Autonomous AI Database 26ai `MEDFLOW`, workload
Lakehouse, região São Paulo:

- esquema de aplicação separado do `ADMIN`;
- 2 dimensões, 5 marts, 118 colunas comentadas e 7 índices secundários;
- 521.116 linhas carregadas e conferidas;
- 25/25 métricas Oracle com estado `ok`;
- profile `MEDFLOW_GENAI` usando OCI Generative AI por Resource Principal;
- três perguntas validadas em SQL convencional, `showsql` e `narrate`.

Runbook e evidências:
[`oracle/README.md`](oracle/README.md) e
[`oracle/VALIDACAO_ORACLE_SELECT_AI.md`](oracle/VALIDACAO_ORACLE_SELECT_AI.md).

## O que a validação encontrou

| Controle | Resultado |
|---|---:|
| AIHs aprovadas | 7.034.961 |
| AIHs distintas (`N_AIH`) | 6.909.807 |
| Internações novas (`IDENT=1`) | 6.905.441 |
| Continuações de longa permanência (`IDENT=5`) | 129.520 |
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
| CMI | valor aprovado nominal / internações novas; continuações separadas |
| IS | 2026 / média do mesmo mês em 2024 e 2025 |
| IPH | pacientes-dia reconstruídos / leitos-dia mensais declarados |

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

## Como executar

Na raiz do repositório:

```bash
.venv/bin/jupyter lab
```

Execute `00_extracao_dados.ipynb`, `01_engenharia_dados.ipynb` e
`02_analise_dados.ipynb`, nessa ordem.
O primeiro incorpora automaticamente novas competências comuns até 2026-12;
o segundo promove a Silver apenas após todas as reconciliações. Reexecutar o
mesmo recorte não duplica registros nem substitui Parquets sem necessidade.

Os artefatos anteriores ficam em `dados/legado/`, `figuras/legado/`,
`notebooks/_legado/` e `referencias/legado_sprint_1/`. Eles não alimentam o
contrato `0.2.0`.

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

# MedFlow — pipeline de dados

**Enterprise Challenge FIAP × Oracle · Sprint 2 · Equipe Ômega Urban Tech**

Recorte solicitado: Estado de São Paulo, competências de 2024 a 2026.
Recorte disponível e validado: **2024-01 a 2026-05 (29 meses)**.
Versão pública:
[`v0.1.0`](https://github.com/Lucas-D-S-1/medflow/releases/tag/v0.1.0).

Proposta metodológica e revisão dos requisitos:
[`REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md`](REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md).

## Estado validado em 29/07/2026

O pipeline foi separado em duas camadas com responsabilidades explícitas:

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
GOLD/ANÁLISE: índices, comparações e visualizações — ainda não implementado
```

### Bronze — não contém regra de negócio

O notebook `00_extracao_dados.ipynb`:

- baixa e mantém os arquivos DBC/DBF em `dados/raw/`;
- descobre as competências comuns de SIH/RD e CNES/LT dentro de 2024–2026;
- baixa somente arquivos ainda ausentes no cache a cada batch mensal;
- serializa o conteúdo DBF em Parquet sem filtro, imputação ou de/para;
- acrescenta apenas linhagem técnica de arquivo e competência;
- preserva as respostas e arquivos oficiais de município, região de saúde,
  CID-10, natureza jurídica e cadastro atual dos estabelecimentos;
- grava `dados/bronze/MANIFESTO.json` com fonte, volumetria e SHA-256.

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

### Silver — todos os tratamentos ficam aqui

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
- prepara os insumos dos índices sem antecipar a camada analítica.

Saídas em `dados/silver/`:

| Base | Linhas | Papel |
|---|---:|---|
| `fato_internacao` | 7.034.961 | fato no grão mensal da AIH |
| `fato_leitos_mensal` | 18.690 | capacidade CNES por hospital e mês |
| `base_hospital_mes` | 17.856 | insumos de IPH, IS, TMH e CMI |
| `base_hospital_espec_mes` | 52.796 | insumos por especialidade |
| `base_hospital_cid` | 447.334 | insumos do IPR, incluindo região nula |
| 6 dimensões | — | tempo, hospital, município, especialidade, CID e domínios |

O notebook também gera:

- `DICIONARIO.md`;
- `DOMINIOS.md`;
- `RELATORIO_QUALIDADE.md`.
- `METADADOS.json`, com recorte, hash Bronze e métricas bloqueantes.

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

| Índice | Situação após a Silver |
|---|---|
| TMH | insumos validados; denominador deve ser `internacoes_novas` |
| IPR | insumos validados com `DIAS_PERM`, sem excluir permanência zero |
| CMI | insumos validados; a fórmula final ainda deve declarar AIH versus internação |
| IS | contagens de AIH e de internações novas disponíveis; definição final fica na análise |
| IPH | **bloqueado como ocupação real**; o cálculo com `QT_DIARIAS` fica somente como proxy faturado experimental |

`QT_DIARIAS` representa diárias faturadas. Somá-lo na competência de
processamento não reconstrói os dias efetivamente ocupados em cada mês. Por
isso, o valor médio de `0,472168` foi reproduzido para auditoria, mas
não é mais critério de correção nem evidência de ocupação física.

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

Execute `00_extracao_dados.ipynb` e depois `01_engenharia_dados.ipynb`.
O primeiro incorpora automaticamente novas competências comuns até 2026-12;
o segundo promove a Silver apenas após todas as reconciliações. Reexecutar o
mesmo recorte não duplica registros nem substitui Parquets sem necessidade.

Os arquivos em `dados/processados/` e `dados/curados/` são artefatos legados.
O contrato atual usa exclusivamente `dados/bronze/` e `dados/silver/`.

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

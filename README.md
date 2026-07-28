# MedFlow — Painel Inteligente de Acesso Hospitalar

**Enterprise Challenge FIAP × Oracle · Sprint 2 · Equipe Ômega Urban Tech · Turma 1TSCOA**

O MedFlow não cria dados novos. Ele torna visível o que já existe no DATASUS, em
linguagem de gestão, para quem precisa decidir onde alocar leitos e recursos.

Recorte: **Estado de São Paulo, 2022–2023** — 5.210.357 internações SUS,
669 hospitais, 331 municípios. 100% de dados públicos e abertos.

---

## Os 5 índices

| Sigla | Nome | Fórmula | Grão |
|---|---|---|---|
| **IPH** | Índice de Pressão Hospitalar | `SUM(QT_DIARIAS) ÷ (leitos_SUS × dias_do_mês)` | Hospital → Município → Região |
| **IPR** | Índice de Permanência Relativa | permanência média do hospital ÷ média regional, mesmo CID | Hospital × CID-10 |
| **IS** | Índice de Sazonalidade | internações do mês ÷ média histórica do mesmo mês | Hospital ou Município × Mês |
| **TMH** | Taxa de Mortalidade Hospitalar | `SUM(MORTE) ÷ COUNT(AIH) × 100` | Hospital × Especialidade |
| **CMI** | Custo Médio por Internação | `SUM(VAL_TOT) ÷ internações com valor` | Hospital × Especialidade × Mês |

Faixas do IPH: **Normal** `< 0,70` · **Atenção** `0,70–0,85` · **Crítico** `> 0,85`.

### A decisão técnica que sustenta o projeto

O IPH mede **ocupação**, não fluxo. O numerador é **paciente-dia** (`SUM(QT_DIARIAS)`),
não contagem de AIH. Uma internação de 30 dias e uma de 1 dia ocupam o leito de forma
radicalmente diferente — contá-las igual subestima a pressão sobre a rede.

Medido sobre SP 2022–2023, o IPH médio por hospital-mês é **0,4403** — valor que o
notebook 01 verifica a cada execução. A fórmula por contagem de AIH achataria a
distribuição para perto de 0,14, e **nenhum hospital jamais apareceria como crítico**:
o produto perderia o sentido.

---

## Pipeline

```
FTP DATASUS + API IBGE
        │
        ▼
  00_extracao_dados.ipynb ──► dados/raw/*.dbc,*.dbf
        │                     dados/processados/*_raw.parquet
        ▼                     dados/referencias/municipios_ibge.csv
  01_engenharia_dados.ipynb ─► dados/curados/  (5 dimensões + 1 fato + 3 bases)
        │
        ▼
  02_analise_dados.ipynb ────► os 5 índices, figuras e achados   (não implementado)
```

Os notebooks rodam **em ordem** e cada um valida o próprio resultado antes de gravar.

> ### Escopo desta v0
>
> Este repositório contém **apenas código e documentação**. Nenhum dado, nenhuma
> figura, nenhum resultado pré-calculado: tudo o que aparece aqui é produzido pelos
> notebooks presentes, a partir das fontes públicas.
>
> As duas primeiras etapas — extração e engenharia de dados — estão completas,
> executadas e validadas.
>
> O cálculo dos 5 índices, as figuras e a integração com o Oracle vêm no
> `02_analise_dados.ipynb`. Enquanto não existirem, não há figura nem resultado
> publicado aqui: as bases entregam os **ingredientes** de cada índice, e a conta
> final é a próxima entrega.
>
> As fórmulas documentadas abaixo são o contrato que o notebook 02 vai implementar.

### As bases curadas

Cada base existe porque um índice precisa dela num grão específico. Elas guardam os
**ingredientes** (paciente-dia, leitos, óbitos, custo), não os índices prontos — a
divisão final acontece na análise, onde é fácil auditar.

| Base | Linhas | Alimenta |
|---|---:|---|
| `base_hospital_mes` | 14.821 | IPH, IS |
| `base_hospital_espec_mes` | 43.407 | TMH, CMI |
| `base_hospital_cid` | 361.273 | IPR |
| `fato_internacao` | 5.210.357 | tabela-verdade, uma linha por AIH |

Dimensões: `dim_hospital`, `dim_municipio`, `dim_especialidade`, `dim_cid`, `dim_tempo`.
O dicionário completo — colunas, tipos e contagem de nulos de cada base — é gerado
pelo notebook 01 em `dados/curados/DICIONARIO.md`, e uma cópia da última execução está
em [`docs/DICIONARIO_BASES.md`](docs/DICIONARIO_BASES.md).

---

## Como reproduzir

Os dados **não estão no repositório** — são 4 GB de arquivos brutos. Tudo é
reconstruído a partir das fontes públicas.

```bash
uv venv .venv
uv pip install --python .venv/bin/python \
    pandas pyarrow matplotlib seaborn jupyter datasus-dbc dbfread

.venv/bin/jupyter lab      # execute 00 e depois 01
```

A primeira execução do notebook 00 baixa ~400 MB de `.dbc` do FTP do DATASUS e expande
para ~3,9 GB de `.dbf`. As seguintes usam o cache em `dados/raw/`. A etapa mais longa é
a leitura dos 24 arquivos do SIH — cerca de 9 minutos.

### Critérios de aceite

A execução é considerada fiel se reproduzir:

| Verificação | Valor |
|---|---|
| Linhas SIH/RD | 5.210.357 |
| Linhas CNES/LT | 200.075 |
| Linhas em `base_hospital_mes` | 14.821 |
| Hospitais · municípios | 669 · 331 |
| IPH médio (hospital-mês) | 0,4403 |
| Hospital-meses Crítico · Atenção | 7,8% · 10,5% |

Os notebooks 00 e 01 checam isso sozinhos e **abortam a gravação** se algo divergir.

---

## Decisões de engenharia

**Flag em vez de descarte.** As ~401 mil AIH com `QT_DIARIAS = 0` ficam nas bases,
marcadas. Entram no IPH (ocupação zero é ocupação real) e saem só do IPR, onde
distorceriam a permanência média. O filtro fica visível na análise, não escondido no ETL.

**`REGSAUDE` normalizado sem inventar código.** O campo bruto mistura números de 1 a 4
dígitos, 11 rótulos de texto livre (`DRS1`, `GSP`, `XVI`…) e 23% de vazios. Os numéricos
são padronizados em 4 dígitos, fundindo `105` com `0105`. Os textuais viram **nulo** —
preencher `GSP` com zeros fabricaria uma região inexistente. Falta de região é herdada
do município, e `origem_regiao` registra a procedência: 579 declarada, 74 inferida,
16 sem região.

**`ESPEC` pela tabela oficial do SIH/SUS.** O material da Sprint 1 usou rótulos de
apresentação (`04 = UTI`). A tabela oficial lê `04` como *Crônicos* e `09` como
*Hospital-dia*. Consequência: **`ESPEC` não é fonte para recortes de UTI** — para isso
existem `MARCA_UTI` e `UTI_MES_TO`, consolidados na flag `fl_uti`.

**Código de município nas duas formas.** O SIH usa 6 dígitos, o IBGE usa 7. O dígito
verificador não é derivável — vem da tabela de referência. Sem isso, cruzamentos com
população, PIB ou malha geográfica quebram em silêncio.

---

## Estrutura

```
medflow/
├── notebooks/
│   ├── 00_extracao_dados.ipynb        DATASUS + IBGE  →  brutos
│   ├── 01_engenharia_dados.ipynb      brutos          →  bases curadas
│   └── *_executed.ipynb               as mesmas, com as saídas da execução
└── docs/
    ├── DECISOES_TECNICAS.md           decisões vinculantes do pipeline
    └── DICIONARIO_BASES.md            colunas, tipos e nulos de cada base
```

Os notebooks `*_executed.ipynb` carregam as saídas reais da última execução — dá para
conferir cada número sem rodar nada.

## Fontes

- **SIH/SUS — AIH reduzida (RD):** `ftp.datasus.gov.br/dissemin/publicos/SIHSUS/200801_/Dados`
- **CNES — Leitos (LT):** `ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/LT`
- **IBGE — Localidades:** `servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios`

O DATASUS publica com 2 a 3 meses de defasagem. Isso é tratado como **decisão de
design** — o MedFlow é um produto de análise retrospectiva — e não como limitação.

## Equipe

Carol Oliveira · Leandro Lopes · Leandro Scutari · Lucas Lima · Pedro Padovan

# PIPELINE — estado real do encadeamento de dados do MedFlow

> **Rastreio:** `AMEM-20260728-CLAUDE-CODEX`
> **Registrado em:** 28/07/2026
> **Escopo:** `02_oracle_medflow/sprint_2_em_andamento/`
> **Severidade:** bloqueante para o GitHub da Sprint 2 (peso 20%)

---

## O achado, em uma frase

**Os parquets de IPH que sustentam todos os números do pitch foram gerados por
um notebook que não existe no repositório.** O `inspecao_datasus.ipynb`
versionado ainda calcula o IPH pela fórmula antiga e, se executado hoje,
**sobrescreve os dados bons com dados errados**.

---

## Os dois lados da divergência

### Lado A — o notebook versionado (errado)

`notebooks/inspecao_datasus.ipynb`, célula 25, comentário original incluído:

```python
# 5a) IPH por hospital (CNES) × mês
# Numerador: contagem de AIH por CNES × competência      ← a fórmula antiga, assumida
...
intern = (sih_full.groupby([col_cnes_sih, "_ano", "_mes"])
                  .size()                                 ← COUNT(AIH)
                  .reset_index(name="internacoes"))
...
iph_hosp["dias"] = iph_hosp.apply(lambda r: dias_no_mes(r["_ano"], r["_mes"]), axis=1)
iph_hosp["denominador"] = iph_hosp["leitos_sus"] * iph_hosp["dias"]
iph_hosp["iph"] = np.where(iph_hosp["denominador"] > 0,
                           iph_hosp["internacoes"] / iph_hosp["denominador"],   ← errado
                           np.nan)
```

A célula 31 do mesmo notebook grava os quatro parquets em
`dados/processados/`. **É um pipeline destrutivo:** rodar o notebook como está
substitui os parquets corretos.

### Lado B — os parquets em disco (corretos)

`dados/processados/iph_por_hospital_mensal.parquet` — 14.821 linhas:

| Verificação | Resultado |
|---|---|
| `iph == patient_days / denominador` | **100,0%** das linhas |
| `iph == internacoes / denominador` | 1,3% das linhas (coincidência aritmética onde permanência ≈ 1 dia) |
| IPH médio | **0,4403** — bate com o `CONTEXTO.md` |
| Hospital-meses `> 0,85` | **7,8%** — bate com o achado-chave do pitch |
| Distribuição de `classe` | Normal 12.098 · Atenção 1.562 · Crítico 1.160 · Sem dados 1 |

---

## Quatro evidências independentes de que o código se perdeu

**1. Coluna que o notebook nunca cria.** Os parquets têm `patient_days`.
Nenhuma célula do `inspecao_datasus.ipynb` computa esse campo.

**2. Nomes de coluna incompatíveis.** O notebook cria `dias`; os parquets têm
`dias_mes`. O parquet de hospital ainda tem `munic`, que o notebook não produz
nessa etapa. São nomes de outra versão do código.

**3. Esquema de agregação diferente nas granularidades superiores.** Não é só o
numerador que mudou — a metodologia mudou:

| | `inspecao_datasus.ipynb` (versionado) | Parquet em disco |
|---|---|---|
| `iph_por_municipio_mensal` | `['municipio','_ano','_mes','iph_medio']` — média do IPH dos hospitais **ponderada por leitos** | `['municipio','_ano','_mes','patient_days','leitos_sus','internacoes','dias_mes','denominador','iph','classe']` — **IPH recalculado do zero** somando paciente-dia e leitos do município |
| `iph_por_regiao_mensal` | `['REGSAUDE','_ano','_mes','iph_medio']` — idem | mesma estrutura completa, recalculada |

A versão perdida abandonou a média ponderada e passou a **recalcular o índice
nativamente em cada granularidade**. É metodologicamente mais correto (uma taxa
de ocupação agregada é a razão das somas, não a média das razões) e é o que está
nos números apresentados.

**4. O notebook de patches declara a dependência por escrito.**
`notebooks/medflow_patches_v2.ipynb`, célula 10, primeira linha:

```python
# Usar iph_por_hospital_mensal.parquet que já foi recalculado com patient-days
```

O `medflow_patches_v2.ipynb` **não recalcula o IPH** — ele apenas consome os
parquets (célula 2: quatro `pd.read_parquet`). O cabeçalho lista como patch 3
*"Série histórica IPH com fórmula correta (patient-days)"*, mas o que ele
corrige é a **figura**, não o dado. A correção do dado aconteceu antes, fora
deste arquivo.

**Âncora temporal:** `dados/processados/relatorio_qualidade.txt` é gravado na
célula 32, na mesma execução que grava os parquets. Ele diz
`Gerado em: 2026-06-07 18:13`. Essa é a data da execução perdida — nove dias
antes da entrega da Sprint 1 (16/06/2026).

---

## Encadeamento atual

```
DATASUS (FTP/API)
      │
      ▼
  dados/raw/  ── 96 .dbf/.dbc, git-ignored  ─────────────┐
      │                                                  │
      ▼                                                  │
[ inspecao_datasus.ipynb ]  ← VERSIONADO, FÓRMULA ERRADA │  não reproduz
      │                                                  │
      ╳ NÃO é o que gerou os parquets                    │
                                                         │
[ notebook perdido, exec. 2026-06-07 18:13 ] ────────────┘
      │
      ▼
  dados/processados/*.parquet  ← CORRETOS (patient-days)
      │
      ├──► [ medflow_patches_v2.ipynb ] ──► figuras P1–P5  (oficiais)
      │
      └──► [ notebook perdido nº 2 ] ──► figuras 08d, 09, 10, 12, 13
                                          + CSVs de TMH/CMI/IS
```

São **dois** notebooks ausentes. O segundo produziu as figuras `08d` a `13` e os
CSVs `tmh_por_especialidade.csv`, `cmi_por_especialidade.csv`,
`indice_sazonalidade_2023.csv` e `detalhe_regsaude_105.csv` — nenhum arquivo do
repositório contém esse código. Detalhado na pendência 3 de
`../PENDENCIAS.md`.

---

## Risco imediato

Enquanto isso não for corrigido:

1. **Risco de destruição de dados.** Qualquer pessoa que abra o
   `inspecao_datasus.ipynb` e execute "Run All" perde os parquets corretos.
   Não há backup versionado — os parquets estão no `.gitignore`.
2. **Risco de avaliação.** O GitHub vale 20% e a avaliação técnica do pitch 50%.
   Um avaliador que rode o notebook publicado obtém IPH médio ≈ 0,14 e conclui
   que os números do pitch não se sustentam.
3. **Risco de narrativa.** A correção paciente-dia é o argumento técnico mais
   forte do projeto. Publicar o código com a fórmula que a decisão rejeitou
   inverte a mensagem.

**Mitigação enquanto não se reconstrói:** fazer cópia dos quatro parquets fora
de `dados/processados/` antes de qualquer execução.

---

## Como reconstruir

### Alteração 1 — numerador paciente-dia

Na célula 25, o agregado por `CNES × _ano × _mes` deve produzir as duas colunas:

```python
intern = (sih_full
          .assign(_qtd=pd.to_numeric(sih_full["QT_DIARIAS"], errors="coerce"))
          .groupby([col_cnes_sih, "_ano", "_mes"])
          .agg(patient_days=("_qtd", "sum"),
               internacoes=("_qtd", "size"))
          .reset_index()
          .rename(columns={col_cnes_sih: "CNES"}))

iph_hosp["dias_mes"]    = iph_hosp.apply(lambda r: dias_no_mes(r["_ano"], r["_mes"]), axis=1)
iph_hosp["denominador"] = iph_hosp["leitos_sus"] * iph_hosp["dias_mes"]
iph_hosp["iph"]         = np.where(iph_hosp["denominador"] > 0,
                                   iph_hosp["patient_days"] / iph_hosp["denominador"],
                                   np.nan)
```

`internacoes` **continua sendo gravada** — os parquets a têm, e o
`medflow_patches_v2.ipynb` a consome na célula 14 (`internacoes = ('internacoes', 'sum')`).
Renomear `dias` → `dias_mes`.

### Alteração 2 — recalcular por granularidade, não fazer média

Para município e região, substituir a média ponderada (células 26 e 27) por
soma dos numeradores e denominadores dentro do grupo, gerando o mesmo esquema
de 10 colunas do parquet atual, incluindo `classe`.

### Alteração 3 — segurança

Fazer as células de escrita não sobrescreverem silenciosamente: gravar em
diretório temporário e promover só após os critérios de aceite passarem.

### Critérios de aceite

A execução corrigida deve reproduzir, sobre SP 2022–2023:

| Verificação | Valor esperado |
|---|---|
| Linhas em `iph_por_hospital_mensal` | 14.821 |
| Linhas em `iph_por_municipio_mensal` | 7.817 |
| Linhas em `iph_por_regiao_mensal` | 1.397 |
| IPH médio (hospital-mês) | 0,4403 |
| Hospital-meses `> 0,85` | 7,8% |
| Hospital-meses em Atenção | 10,5% |
| REGSAUDE mais pressionada | 105 → IPH 0,880 |
| CNES 2097648, IPH médio | 1,01 |
| Linhas SIH carregadas | 5.210.357 |

Se os três `shape` e o IPH médio baterem, a reconstrução é fiel. Se não
baterem, **não promover** — os parquets atuais são a referência, não o código.

---

## Nota de método

A conclusão acima não veio da leitura dos comentários do notebook — veio de
confrontar o código versionado com o conteúdo binário dos parquets. Os
comentários, aliás, apontam para a direção errada: a célula 25 ainda diz
*"Numerador: contagem de AIH"*, e `referencias/medflow_data_map.jsx` documenta
`internações_mês ÷ (QT_SUS × dias_do_mês)` como fórmula oficial do IPH
(pendência 2 de `../PENDENCIAS.md`). **A documentação do projeto descreve a
fórmula rejeitada; só os dados estão certos.**

---

## Referências cruzadas

- `../DECISOES.md` § 3 — a decisão da correção paciente-dia e seu impacto medido
- `../PENDENCIAS.md` § 1, 2 e 3 — as ações derivadas deste achado
- Memória do projeto: `decisions/medflow-organizacao-material`

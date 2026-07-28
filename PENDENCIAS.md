# PENDÊNCIAS — Challenge Oracle: MedFlow

> Atualizado em 28/07/2026, após a consolidação do material de
> `challenge_oracle` em `sprint_2_em_andamento/` e a triagem de Downloads.
> Entrega da Sprint 2: **01/09/2026**.

---

## Sprint 1 — situação confirmada

- Entregue em 16/06/2026.
- Nota máxima: **10/10**.
- Arquivo:
  `EC_Sprint_1_1TSCO_ideacao_arquitetura_projeto_MedFlow_OmegaUrbanTech.zip`.
- Feedback preservado em `entregues/sprint_1/AVALIACAO.md`.
- ZIP original preservado em `entregues/sprint_1/original/` e apresentação
  extraída em `entregues/sprint_1/conteudo_extraido/`.
- Transcrição da mentoria de 07/06/2026 preservada em
  `referencias/mentorias/challenge oracle mentoria.txt`.

Para futuras entregas, repetir a separação `original/`,
`conteudo_extraido/` e `AVALIACAO.md`. O procedimento operacional compartilhado
com as fases está em `../00_fases/GUIA_IMPORTACAO_FASE.md`.

---

## ORDEM DE ATAQUE — artefatos perdidos

> Decisão aceita e registrada em
> `decisions/medflow-ordem-reconstrucao-artefatos.md`.
> Rastreio: `AMEM-20260728-CODEX-CLAUDE`.

| Prioridade | Artefato | Justificativa de avaliação |
|---|---|---|
| **1** | Pipeline que reproduz os parquets corrigidos do IPH | É a base de reprodutibilidade do GitHub (20%) e da defesa técnica dos números (50%); elimina também o risco de sobrescrever os parquets corretos com a fórmula antiga |
| **2** | IPR calculado, persistido e navegável | Está totalmente ausente e impede cumprir o critério funcional dos cinco índices, diretamente exposto na avaliação técnica (50%) |
| **3** | Nova `03_distribuicao_iph.png` | Restaura a evidência visual dos 7,8% críticos, mas o achado já pode ser verificado no parquet correto e não substitui a lacuna funcional do IPR |

**Regra de execução:** validar e promover o pipeline corrigido antes de usar seus
resultados como base dos demais artefatos. O IPR pode ser especificado em
paralelo, mas não desloca a prioridade 1.

---

## BLOQUEANTES — inconsistências técnicas do material herdado

### 1. `inspecao_datasus.ipynb` está desatualizado em relação aos parquets

**Prioridade 1 na reconstrução dos três artefatos.**

O notebook em `sprint_2_em_andamento/notebooks/inspecao_datasus.ipynb` **ainda
calcula o IPH com a fórmula errada**. Na célula 25:

```python
intern = sih_full.groupby([col_cnes_sih, "_ano", "_mes"]).size()   # COUNT(AIH)
iph_hosp["iph"] = iph_hosp["internacoes"] / iph_hosp["denominador"]
```

Mas o parquet `iph_por_hospital_mensal.parquet` **já está correto** — tem a
coluna `patient_days` e `iph = patient_days / denominador` (IPH médio 0,4403).

Ou seja: **o pipeline que gerou os dados bons não está versionado.** Alguém
rodou uma versão corrigida do notebook que se perdeu. O `medflow_patches_v2.ipynb`
confirma isso no comentário da célula 10: *"Usar iph_por_hospital_mensal.parquet
que já foi recalculado com patient-days"*.

**Ação:** corrigir a célula 25 de `inspecao_datasus.ipynb` para
`SUM(QT_DIARIAS)` e re-executar, validando que reproduz IPH médio = 0,4403.
Sem isso o GitHub da Sprint 2 (peso 20%) publica um pipeline que não gera os
números do pitch.

### 2. `medflow_data_map.jsx` documenta a fórmula errada do IPH

Em `sprint_2_em_andamento/referencias/medflow_data_map.jsx`, linha ~103:

```
formula: "internações_mês ÷ (QT_SUS × dias_do_mês)"
```

Deve ser `SUM(QT_DIARIAS) ÷ (QT_SUS × dias_do_mês)`. Este arquivo é material de
referência da apresentação — corrigir antes de reaproveitar em slide.

### 3. Não existe notebook-fonte para as figuras 08d a 13

As figuras `08d`, `09`, `10`, `12` (oficiais) e `13` (descartada) **não são
geradas por nenhum notebook presente no repositório**. `inspecao_datasus.ipynb`
só salva `01`, `02`, `03` e `04_permanencia_por_especialidade.png` (que nem
existe no disco — foi renomeada para `08d_...`).

Os CSVs de apoio (`tmh_por_especialidade.csv`, `cmi_por_especialidade.csv`,
`indice_sazonalidade_2023.csv`, `detalhe_regsaude_105.csv`) existem e batem com
as figuras, então o código roda — só não foi salvo.

**Ação:** reconstruir esse notebook (TMH, CMI, IS, permanência por especialidade
e a agregação por REGSAUDE) e versioná-lo. É requisito do GitHub da entrega.

---

## LACUNA DE CONTEÚDO

### 4. Falta a distribuição do IPH com a fórmula correta

**Prioridade 3 na reconstrução dos três artefatos.**

`03_distribuicao_iph.png` foi **descartada** (histograma com a fórmula errada —
massa concentrada entre 0,05 e 0,15). Não existe substituta.

Essa figura é a que sustenta o número **"7,8% de hospital-meses críticos"**, um
dos achados-chave do pitch. **Regerar** o histograma a partir de
`iph_por_hospital_mensal.parquet`, com as linhas de corte em 0,70 e 0,85.

### 5. Os índices IPR e IS não têm implementação versionada

- **IPR (Índice de Permanência Relativa) — prioridade 2 na reconstrução.**
  **Nunca foi calculado.** Não há
  parquet, CSV nem figura. É 1 dos 5 índices que o critério de sucesso exige
  navegáveis no dashboard.
- **IS (Índice de Sazonalidade)** — existe o CSV e a figura, mas sem código-fonte
  (ver pendência 3).

**Ação:** implementar o IPR (`média QT_DIARIAS do hospital ÷ média regional,
mesmo DIAG_PRINC`), lembrando de filtrar `QT_DIARIAS = 0` (400.958 registros).

---

## ENTREGÁVEIS DA SPRINT 2 — nada iniciado

Critério de sucesso declarado, item a item:

| Entregável | Peso | Status |
|---|---|---|
| Dashboard com os 5 índices navegáveis | — | **Não iniciado.** IPR sequer calculado |
| Histórico 2022–2023 + benchmark SP | — | Dados prontos; visualização não |
| Link público funcionando | 10% | **Não iniciado.** Hospedagem não definida |
| Oracle Select AI — 3 perguntas ao vivo | — | **Não iniciado.** Sem evidência de setup |
| GitHub com README | 20% | **Não iniciado.** Nenhum repo do MedFlow existe |
| PPT / pitch | 10% | **Não iniciado** |
| Vídeo YouTube | 10% | **Não iniciado** |
| Apresentação técnica ao vivo | 50% | **Não iniciado** |

### Decisões de produto ainda em aberto

- **Ferramenta do dashboard.** A arquitetura da Sprint 1 declara **Power BI** na
  camada de consumo, mas o critério exige **link público funcionando** — Power BI
  gratuito não publica link público de forma trivial. Definir: Power BI com
  licença, ou trocar por algo que publique (Streamlit, APEX no próprio
  Autonomous DB). **Decidir cedo — muda o cronograma inteiro.**
- **Carga no Oracle Autonomous DB.** Não há evidência de que os parquets já
  tenham sido carregados. A arquitetura depende disso e o Select AI também.
- **As 3 perguntas do Select AI.** Não foram escolhidas nem testadas.
- **Narrativa comercial.** O conselho recomendou pivotar de B2G (ciclo 12–18
  meses) para redes privadas — ainda não incorporado ao pitch.

---

## Organização do material (referência)

Consolidado em `sprint_2_em_andamento/` em 28/07/2026, vindo de
`~/projetos/data-scientist/Work Space/Faculdade/challenge_oracle/`
(diretório de origem removido após a movimentação).

```
sprint_2_em_andamento/
├── notebooks/          3 notebooks (.ipynb)
├── dados/
│   ├── raw/            96 arquivos .dbf/.dbc do DATASUS (~3,3 GB, git-ignored)
│   └── processados/    4 parquets + 6 CSVs + relatorio_qualidade.txt
├── figuras/
│   ├── oficiais/       9 figuras
│   └── descartadas/    8 figuras
└── referencias/        5 arquivos .jsx + 2 arquivos .txt
```

O PDF `1TSCOA - Regras gerais - Challenge Oracle_RevFinal.pdf` está na raiz de
`02_oracle_medflow/`. A triagem acrescentou `medflow_prompt_executor.txt` e
`OmegaUrbanTech_instrucoes_SQL.txt` a `referencias/`. O
`medflow_data_map.jsx` encontrado em Downloads era idêntico ao já consolidado
(SHA-256 `f6b6affc345fbbb9341bbfdefe85eea798c5073520b60984bfbc2c7aeea1c640`);
a duplicata de Downloads foi removida, sem sobrescrever o arquivo versionado.

### Figuras oficiais (9)

| Arquivo | Por que vale |
|---|---|
| `P1_top10_cids_nomes.png` | Top 10 CIDs com nomes legíveis, 3 painéis (volume, permanência, custo) |
| `P2_top15_municipios_nomes.png` | Top 15 municípios com nomes IBGE, IPH corrigido |
| `P3_iph_serie_historica_corrigida.png` | Série mensal com a fórmula paciente-dia e zonas de criticidade |
| `P4_top10_regioes_saude.png` | Ranking das 10 regiões de saúde por IPH ponderado |
| `P5_storytelling_exemplo.png` | Demonstração das 4 camadas com dados reais (CNES 2097648) |
| `08d_permanencia_especialidade_boxplot.png` | Permanência por especialidade — não depende de IPH |
| `09_indice_sazonalidade.png` | IS 2023 — baseado em contagem de internações, não em IPH |
| `10_tmh_por_especialidade.png` | TMH — Clínica 12,73% vs. UTI 4,44%, achado-chave do pitch |
| `12_cmi_por_especialidade.png` | CMI por especialidade, com média SP de referência |

### Figuras descartadas (8)

| Arquivo | Motivo |
|---|---|
| `01_iph_serie_historica.png` | IPH pela fórmula errada (0,12–0,15). Substituída por `P3` |
| `02_top15_municipios_iph.png` | IPH errado + códigos IBGE em vez de nomes. Substituída por `P2` |
| `03_distribuicao_iph.png` | IPH errado. **Sem substituta** — ver pendência 4 |
| `11_top10_cids.png` | Sem os nomes dos CIDs. Substituída por `P1` |
| `13_detalhe_regsaude_105.png` | IPH correto, mas gráfico degenerado de 1 barra. Substituída por `P4` |
| `P1_test.png` | Rascunho de iteração — sem título, sem eixos, sem paleta |
| `P4_test.png` | Rascunho de iteração |
| `P5_test.png` | Rascunho de iteração |

`files.zip` (bundle original dos 5 `.jsx`) foi extraído para `referencias/` e o
zip arquivado em `99_arquivo/`.

# DECISÕES — Challenge Oracle: MedFlow

> **MedFlow — Painel Inteligente de Acesso Hospitalar e Perfil de Atendimento.**
> Enterprise Challenge FIAP × Oracle Corporation, 100% dados públicos DATASUS.
> Derivado do `CONTEXTO.md` da raiz (fonte de verdade), complementado pelo que
> foi verificado no material da Sprint 1 consolidado em
> `sprint_2_em_andamento/`.
> Decisões abaixo são **vinculantes**.

---

## 1. Escopo

**Recorte: São Paulo, 2022–2023.** Decisão de escopo **validada pelos mentores**
— qualidade sobre volume. 24 meses completos.

**Volumetria validada:** 5.210.357 linhas SIH (115 colunas) e ~200.075 linhas
CNES (30 colunas). Download 24/24 em ambas as bases, sem falhas.

### O que está DENTRO

- Os 5 índices navegáveis (abaixo), com histórico 2022–2023 e benchmark SP.
- Storytelling histórico em **4 camadas**.
- Oracle Select AI na camada de consumo (Sprint 2).

### O que está FORA

- **ML / predição está fora do escopo.** Substituído deliberadamente pela
  abordagem de storytelling histórico.
- k-means de hospitais — roadmap.
- Cruzamento SIA × SIH — roadmap.
- Alertas automáticos — roadmap.

### Lag de publicação DATASUS

O atraso de **2 a 3 meses** na publicação é tratado como **decisão de design**
(o produto é de análise retrospectiva), **não** como limitação a ser justificada.

---

## 2. Os 5 índices

| Sigla | Nome | Fórmula | Granularidade |
|---|---|---|---|
| **IPH** | Índice de Pressão Hospitalar | `SUM(QT_DIARIAS) ÷ (QT_SUS × dias_do_mês)` | Hospital → Município → Região |
| **IPR** | Índice de Permanência Relativa | `média(QT_DIARIAS)_hospital ÷ média(QT_DIARIAS)_regional`, mesmo `DIAG_PRINC` | Hospital × CID-10 |
| **IS** | Índice de Sazonalidade | `internações_período ÷ média_histórica_mesmo_período` | Hospital ou Município × Mês |
| **TMH** | Taxa de Mortalidade Hospitalar | `SUM(MORTE=1) ÷ COUNT(AIH) × 100` | Hospital × CID ou Hospital × ESPEC |
| **CMI** | Custo Médio por Internação | `SUM(VAL_TOT) ÷ COUNT(AIH)` | Hospital × Especialidade × Mês |

**Faixas de classificação do IPH:** Normal `< 0,70` · Atenção `0,70–0,85` ·
Crítico `> 0,85` · Sem dados (denominador = 0).

**Cuidados de qualidade já mapeados:**

- `QT_DIARIAS = 0` em 400.958 registros — **filtrar antes** de médias de
  permanência (distorce IPR).
- `VAL_TOT = 0` com `MORTE = 1` em 20 registros — filtrar antes da média de CMI.
- `MUNIC_MOV` do SIH tem **6 dígitos**; IBGE usa **7** — cortar o dígito
  verificador em qualquer join com tabela externa.
- Campos de data chegam como string — converter com `pd.to_datetime`.

---

## 3. Correção crítica do IPH — paciente-dia

**Esta é a decisão técnica mais importante do projeto.**

O IPH mede **taxa de ocupação real**. O numerador correto é **paciente-dia**:

```
IPH = SUM(QT_DIARIAS) ÷ (QT_SUS × dias_do_mês)
```

**NÃO** é `COUNT(AIH)` (contagem de internações). Contar AIH mede *fluxo*
(quantas pessoas entraram), não *ocupação* (quantos leitos ficaram cheios e
por quanto tempo) — uma internação de 30 dias e uma de 1 dia pesam igual, o que
subestima grosseiramente a pressão sobre a rede.

### Impacto medido da correção

| | Fórmula errada (`COUNT(AIH)`) | Fórmula correta (paciente-dia) |
|---|---|---|
| IPH médio SP | ~0,14 | **0,4403** |
| Série mensal 2022–2023 | 0,12 – 0,15 | 0,413 – 0,472 |
| Top municípios | 0,20 – 0,29 | acima de 0,85 no topo |

A fórmula errada achatava tudo abaixo de 0,3 — **nenhum hospital jamais
apareceria como crítico**, e o produto inteiro perderia o sentido.

**Onde a correção está aplicada (28/07/2026):** em todo o pipeline. O
`01_engenharia_dados.ipynb` produz `patient_days` na `base_hospital_mes` e valida o
IPH médio em 0,4403 antes de gravar. O notebook que usava a fórmula antiga foi
arquivado em `notebooks/_legado/`.

---

## 4. Personas

**Primária — Secretário(a) de Saúde.**
Gerencia a rede regional. Pergunta: *"onde a rede está sob pressão e para onde
eu direciono recurso?"*

**Secundária — Gestor Hospitalar.**
Pergunta: *"meu hospital versus meus pares."* Benchmark comparativo.

---

## 5. Storytelling em 4 camadas

Formato obrigatório de apresentação de qualquer indicador no painel:

1. **Número atual** — o valor e sua classificação (Normal / Atenção / Crítico).
2. **Contexto comparativo** — versus o mês anterior, com delta.
3. **Padrão histórico** — versus a média 2022–2023 do próprio hospital.
4. **O que significa** — a leitura de gestão, não o número.

Referência visual implementada: `figuras/oficiais/P5_storytelling_exemplo.png`
(caso CNES 2097648).

---

## 6. Arquitetura (4 camadas)

```
INGESTÃO          SIH .dbc (FTP) + CNES JSON (API) + IBGE CSV (External Table)
     ↓
PROCESSAMENTO     Python / pysus 2.2 no Google Colab
     ↓
ARMAZENAMENTO     Oracle Autonomous DB — banco convergente
                  (relacional + JSON + External Table)
     ↓
CONSUMO           Power BI  +  Oracle Select AI (Sprint 2)
```

**Oracle Select AI** é posicionado como o **diferencial da Sprint 2** — "a cereja
do bolo". Orientação explícita do mentor: **focar no bolo**, não na cereja.

---

## 7. Achados-chave da Sprint 1

Todos recalculados com a fórmula corrigida do IPH.

| Achado | Valor |
|---|---|
| IPH médio SP | 0,4403 |
| Hospital-meses em status Crítico | 7,8% |
| Hospital-meses em status Atenção | 10,5% |
| Região de saúde mais pressionada | REGSAUDE 105 — IPH 0,880 (Barueri) |
| Município crítico | Franco da Rocha — IPH 0,939 |
| CNES 2097648 | IPH médio 1,01 — acima da capacidade teórica por 24 meses consecutivos |
| TMH Clínica vs. UTI | 12,73% vs. 4,44% |
| TMH geral SP | 5,36% |
| CID mais frequente | O800 (parto normal) — 206.376 internações |
| CID mais caro | A419 (sepse) — R$ 4.734/internação |
| CMI médio | R$ 1.670 |
| Sazonalidade 2023 | IS entre 1,00 e 1,05 — sem mês em alerta (>1,2) |

---

## 8. Decisões sobre as figuras (28/07/2026)

Das 17 figuras herdadas do challenge_oracle, **9 são oficiais** e **8 foram
descartadas**. Critério e lista completa em `sprint_2_em_andamento/figuras/` e
em `PENDENCIAS.md`.

**Regra que orientou o corte:** figura gerada antes da correção do IPH está
errada e não vai para a apresentação, mesmo que visualmente bonita. Figura que
não depende de IPH (TMH, CMI, IS, permanência) permanece válida.

---

---

## 11. Estrutura do pipeline (28/07/2026)

Três notebooks, executados em ordem, cada um validando o próprio resultado:

| Notebook | Entrada | Saída |
|---|---|---|
| `00_extracao_dados` | FTP DATASUS + API IBGE | parquets brutos, cache `.dbc`/`.dbf`, tabela de municípios |
| `01_engenharia_dados` | parquets brutos | 5 dimensões, 1 fato, 3 bases analíticas |
| `02_analise_dados` | bases curadas | os 5 índices, figuras e achados |

**Os dados pesados não vão para o GitHub.** São ~4 GB reconstruídos das fontes
públicas pelo notebook 00. O repositório carrega o código e a documentação; qualquer
máquina limpa refaz a base.

**Extração pelo FTP direto, não pelo `pysus`.** A arquitetura da Sprint 1 declara
`pysus 2.2`. Na versão 2.7 o catálogo interno devolve apenas 3 dos 24 arquivos RD de
SP no período — não reproduz a base. O notebook 00 fala com
`ftp.datasus.gov.br` pela `ftplib` da biblioteca padrão, que é o que o próprio `pysus`
espelha.

**Escrita nunca destrutiva.** Toda gravação verifica se o destino já existe e aborta,
a menos que `SOBRESCREVER = True`. Downloads e parquets são escritos com sufixo
`.parcial` e renomeados só ao final, para que uma interrupção nunca deixe arquivo
válido pela metade.

## 12. Tratamento de qualidade — flag em vez de descarte

Registros problemáticos permanecem nas bases, marcados por flag. Quem consome decide
o filtro, e o filtro fica visível na análise em vez de escondido no ETL.

| Flag | Volume | Quem filtra |
|---|---:|---|
| `fl_sem_diaria` (`QT_DIARIAS = 0`) | 400.958 | só o IPR — entra normalmente no IPH |
| `fl_sem_valor` (`VAL_TOT = 0`) | 7.827 | o CMI |
| `fl_obito_sem_val` | 20 | o CMI |
| `fl_uti` (`MARCA_UTI` / `UTI_MES_TO`) | 523.422 | fonte correta para recortes de UTI |

## 13. Normalização do `REGSAUDE`

Cumpre a promessa do slide 12 da Sprint 1. O campo bruto tem 82 valores distintos
misturando números de 1 a 4 dígitos, 11 rótulos de texto livre e 23% de vazios.

1. Numérico → `zfill(4)`, fundindo `105` com `0105`.
2. Texto livre (`DRS1`, `GSP`, `XVI`, `MC`, `R17`…) → **nulo**. Preencher com zeros
   fabricaria um código inexistente.
3. Hospital sem região herda a região modal do seu município.

Resultado nos 669 hospitais: **579 declarada · 74 inferida · 16 sem região**,
rastreável pela coluna `origem_regiao`.

## 14. `ESPEC` pela tabela oficial do SIH/SUS

Os rótulos do material da Sprint 1 (`04 = UTI`, `09 = Crônico`) eram de apresentação,
sem pretensão de oficialidade. A Sprint 2 adota a tabela oficial: `04` é **Crônicos**,
`09` é **Hospital-dia (cirúrgico)**, e entram `06` (Tisiologia) e `08` (Reabilitação),
antes fora do de-para.

**Consequência vinculante:** `ESPEC` **não é fonte para recortes de UTI** — não existe
código de UTI nessa tabela. Use a flag `fl_uti`.

## 15. Código de município nas duas formas

O SIH grava `MUNIC_MOV` com 6 dígitos; o IBGE usa 7. O dígito verificador **não é
derivável** — vem da tabela de referência do IBGE, materializada pelo notebook 00.
`dim_municipio` guarda as duas formas mais o nome. Sem isso, qualquer cruzamento com
população, PIB ou malha geográfica quebra em silêncio.

## 9. Sprint 1 — entregue

**Data:** 16/06/2026, portal FIAP ON.
**Arquivo:** `EC_Sprint_1_1TSCO_ideacao_arquitetura_projeto_MedFlow_OmegaUrbanTech.pptx`
(15 slides, RMs em ordem alfabética). Ideação + arquitetura + evidência técnica
do pipeline funcionando.

## 10. Sprint 2 — próxima entrega (01/09/2026)

**Critério de sucesso declarado:** dashboard com os 5 índices navegáveis,
histórico 2022–2023, benchmark SP, link público funcionando, Select AI com
3 perguntas demonstradas ao vivo, GitHub com README.

| Item avaliado | Peso |
|---|---|
| PPT / pitch | 10% |
| Vídeo YouTube | 10% |
| Link da aplicação | 10% |
| GitHub | 20% |
| Avaliação técnica do pitch + apresentação ao vivo | 50% |

Top 6 apresenta à banca Oracle via Teams na semana de **14–18/09/2026**.

**Nota de negócio (conselho avaliador):** B2G tem ciclo de 12–18 meses; redes
privadas (Rede D'Or, Einstein, Santa Catarina) recomendadas como clientes
pagantes na narrativa comercial.

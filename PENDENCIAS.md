# PENDÊNCIAS — Challenge Oracle: MedFlow

> Atualizado em 28/07/2026, após a reconstrução do pipeline em dois notebooks
> novos (`00_extracao_dados` e `01_engenharia_dados`), ambos executados e validados.
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

## RESOLVIDO em 28/07/2026 — o pipeline voltou a ser reprodutível

> Detalhe técnico e decisões em `sprint_2_em_andamento/README.md`.

O bloqueio central da Sprint 2 — *"os parquets foram gerados por um notebook que não
existe no repositório"* — está resolvido. Em vez de remendar o notebook quebrado,
o pipeline foi reescrito em dois notebooks novos, ambos executados e validados:

| Notebook | Faz | Validação |
|---|---|---|
| `00_extracao_dados.ipynb` | FTP DATASUS + API IBGE → parquets brutos | 5.210.357 SIH · 200.075 CNES · 645 municípios |
| `01_engenharia_dados.ipynb` | brutos → 5 dimensões + 1 fato + 3 bases analíticas | 14.821 linhas · IPH 0,4403 · 7,8% crítico · 10,5% atenção |

O notebook 00 foi conferido regerando os brutos do zero num diretório separado: esquema
idêntico, mesma ordem de colunas, zero divergência de tipo, e todos os agregados que
sustentam os índices batendo (soma de `QT_DIARIAS`, `MORTE`, `VAL_TOT`, contagens
distintas). Leva ~9 minutos a partir do cache local.

**Consequências:**

- O GitHub da entrega (peso 20%) passa a publicar um pipeline que gera os números do
  pitch. Um avaliador que clonar e executar chega a IPH médio 0,4403.
- Os dados pesados ficam fora do repositório e são reconstruídos das fontes públicas.
- `inspecao_datasus.ipynb` foi movido para `notebooks/_legado/`, com README explicando
  por que não deve ser executado. O risco de destruição dos parquets acabou.
- Nomes de município resolvidos pela API do IBGE — `350570` agora é `Barueri`,
  `351640` é `Franco da Rocha`, e o código de 7 dígitos existe para joins externos.
- `REGSAUDE` normalizado sem fabricar código: 579 hospitais com região declarada,
  74 inferidas do município, 16 sem região, tudo rastreável em `origem_regiao`.
- `ESPEC` passa a usar a tabela oficial do SIH/SUS. **`04` é Crônicos, não UTI** —
  para recortes de UTI existe a flag `fl_uti` (`MARCA_UTI` / `UTI_MES_TO`).

### O que ainda falta no pipeline

| Prioridade | Artefato | Situação |
|---|---|---|
| **1** | **IPR calculado e navegável** | Base `base_hospital_cid` pronta (361.273 pares hospital×CID, já sem as AIH de diária zero). Falta o cálculo do índice no notebook 02 |
| **2** | `02_analise_dados.ipynb` | Não iniciado. Consolida os 5 índices, o TMH/CMI/IS e as figuras — substitui os dois notebooks perdidos |
| **3** | Nova `03_distribuicao_iph.png` | Regerar do `base_hospital_mes` com cortes em 0,70 e 0,85 |

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

# Relatório de qualidade — MedFlow Silver

## Reconciliações

- `linhas_sih_reconciliadas`: 7,793,976
- `linhas_cnes_reconciliadas`: 268,107
- `aih_aprovadas`: 7,793,976
- `aih_distintas`: 7,656,059
- `internacoes_novas`: 7,651,693
- `continuacoes_longa_permanencia`: 142,283
- `especialidades_sem_depara`: 0
- `hospitais_sem_match_cnes`: 0
- `cids_sem_capitulo`: 0
- `cids_sem_descricao`: 0
- `hospitais_sem_nome_atual`: 0
- `hospitais_sem_esfera_atual`: 2
- `hospitais_sem_natureza_juridica`: 0
- `registros_sem_regiao`: 0
- `internacoes_novas_sem_regiao`: 0
- `hospitais_regiao_conflitante`: 5
- `qt_diarias_igual_dias_perm_pct`: 69.9235
- `qt_zero_dias_perm_positivo`: 200,898
- `cruza_mes_pct`: 15.0675
- `competencia_diverge_saida_pct`: 18.7351
- `tmh_internacoes_novas_pct`: 5.1094
- `proxy_iph_media_hospital_mes`: 0.472647

## Contratos aprovados dos índices

- **TMH** — `contrato_aprovado`: óbitos / internações novas; mínimo de 30 para classificação
- **IPR** — `contrato_aprovado`: permanência hospital/CID / benchmark regional sem o hospital
- **IS** — `contrato_aprovado`: 2026 / média do mesmo mês em 2024 e 2025
- **CMI** — `contrato_aprovado`: valor aprovado / internações novas; continuações separadas
- **IPH** — `contrato_aprovado_com_limitacao`: pacientes-dia estimados / leitos-dia declarados; não é ocupação real

## Conclusão

A Bronze foi reconciliada integralmente e todos os de/paras observados estão cobertos.
A Silver publica somente dimensões e fatos. Métricas de negócio são produzidas na Gold.
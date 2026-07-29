# Relatório de qualidade — MedFlow Silver

## Reconciliações

- `linhas_sih_reconciliadas`: 5,210,357
- `linhas_cnes_reconciliadas`: 200,075
- `aih_aprovadas`: 5,210,357
- `aih_distintas`: 5,102,190
- `internacoes_novas`: 5,097,456
- `continuacoes_longa_permanencia`: 112,901
- `especialidades_sem_depara`: 0
- `hospitais_sem_match_cnes`: 0
- `cids_sem_capitulo`: 0
- `cids_sem_descricao`: 0
- `hospitais_sem_nome_atual`: 0
- `hospitais_sem_esfera_atual`: 0
- `hospitais_sem_natureza_juridica`: 0
- `registros_sem_regiao`: 0
- `internacoes_novas_sem_regiao`: 0
- `hospitais_regiao_conflitante`: 4
- `qt_diarias_igual_dias_perm_pct`: 71.9762
- `qt_zero_dias_perm_positivo`: 131,869
- `cruza_mes_pct`: 16.2554
- `competencia_diverge_saida_pct`: 23.589
- `tmh_internacoes_novas_pct`: 5.4648
- `proxy_iph_media_hospital_mes`: 0.440272

## Situação dos índices

- **TMH** — `insumos_validados`: óbitos em internações novas / internações novas
- **CMI** — `insumos_validados_formula_pendente`: declarar explicitamente AIH versus internação
- **IPR** — `insumos_validados`: DIAS_PERM / internações novas; sem excluir zero; dropna=False
- **IPH** — `bloqueado_como_ocupacao_real`: proxy faturado preservado apenas para auditoria

## Conclusão

A extração Bronze foi reconciliada integralmente. Os de/paras observados estão cobertos.
Não restam lacunas de descrição nos códigos observados; o limite remanescente é temporal no cadastro CNES atual.
O IPH baseado em diárias faturadas permanece apenas como proxy experimental, não como ocupação real.

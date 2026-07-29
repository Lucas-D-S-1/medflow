# Relatório de qualidade — MedFlow Silver

## Reconciliações

- `linhas_sih_reconciliadas`: 7,034,961
- `linhas_cnes_reconciliadas`: 243,085
- `aih_aprovadas`: 7,034,961
- `aih_distintas`: 6,909,807
- `internacoes_novas`: 6,905,441
- `continuacoes_longa_permanencia`: 129,520
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
- `qt_diarias_igual_dias_perm_pct`: 70.0547
- `qt_zero_dias_perm_positivo`: 181,584
- `cruza_mes_pct`: 15.0798
- `competencia_diverge_saida_pct`: 18.7633
- `tmh_internacoes_novas_pct`: 5.1078
- `proxy_iph_media_hospital_mes`: 0.472168

## Situação dos índices

- **TMH** — `insumos_validados`: óbitos em internações novas / internações novas
- **CMI** — `insumos_validados_formula_pendente`: declarar explicitamente AIH versus internação
- **IPR** — `insumos_validados`: DIAS_PERM / internações novas; sem excluir zero; dropna=False
- **IPH** — `bloqueado_como_ocupacao_real`: proxy faturado preservado apenas para auditoria

## Conclusão

A extração Bronze foi reconciliada integralmente. Os de/paras observados estão cobertos.
Não restam lacunas de descrição nos códigos observados; o limite remanescente é temporal no cadastro CNES atual.
O IPH baseado em diárias faturadas permanece apenas como proxy experimental, não como ocupação real.
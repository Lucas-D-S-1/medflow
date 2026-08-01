# Relatório de qualidade — MedFlow Gold

## Reconciliações

- `internacoes_novas_reconciliadas`: 6,905,441
- `pacientes_dia_estimados`: 32,425,897
- `regioes_saude`: 62
- `competencias`: 29
- `internacoes_residentes_sp_observadas`: 6,846,665
- `internacoes_residentes_fora_sp_atendidas`: 58,776
- `internacoes_icsap_residentes_sp_observadas`: 953,656
- `fluxos_origem_destino_mensais`: 30,018
- `linhas_is_calculadas`: 310
- `combinacoes_ipr_elegiveis`: 30,550
- `cobertura_internacoes_ipr_pct`: 57.1383
- `linhas_tmh_cmi_amostra_suficiente`: 36,006
- `hospitais_mes_acima_capacidade_declarada`: 493
- `hospitais_mes_sem_leito_sus_declarado`: 142

## Limites de interpretação

- TMH não possui ajuste de risco clínico.
- IPR só recebe valor com os mínimos 20/50/3 hospitais.
- IS é comparação sazonal histórica de 2026 contra 2024–2025.
- CMI nominal é valor aprovado; CMI real corrige o poder de compra pelo IPCA, mas nenhum deles representa custo econômico integral.
- IPH usa pacientes-dia reconstruídos e leitos mensais declarados; não é ocupação real.
- Taxas territoriais consideram residentes de SP atendidos em hospitais de SP; saídas para outras UFs não estão no RD-SP.
- A participação de ICSAP usa todas as internações novas observadas de residentes no denominador, pois o procedimento necessário ao denominador clínico oficial não foi preservado na Silver.
- Lista ICSAP: Portaria SAS/MS 221/2008.
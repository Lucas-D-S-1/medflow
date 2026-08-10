# Relatório de qualidade — MedFlow Gold

## Reconciliações

- `internacoes_novas_reconciliadas`: 7,150,693
- `pacientes_dia_estimados`: 33,593,969
- `regioes_saude`: 62
- `competencias`: 30
- `internacoes_residentes_sp_observadas`: 7,089,959
- `internacoes_residentes_fora_sp_atendidas`: 60,734
- `internacoes_icsap_residentes_sp_observadas`: 988,453
- `fluxos_origem_destino_mensais`: 31,033
- `linhas_is_calculadas`: 372
- `combinacoes_ipr_elegiveis`: 31,452
- `cobertura_internacoes_ipr_pct`: 57.489
- `linhas_tmh_cmi_amostra_suficiente`: 37,257
- `hospitais_mes_acima_capacidade_declarada`: 511
- `hospitais_mes_sem_leito_sus_declarado`: 146

## Limites de interpretação

- TMH não possui ajuste de risco clínico.
- IPR só recebe valor com os mínimos 20/50/3 hospitais.
- IS é comparação sazonal histórica de 2026 contra 2024–2025.
- CMI nominal é valor aprovado; CMI real corrige o poder de compra pelo IPCA, mas nenhum deles representa custo econômico integral.
- IPH usa pacientes-dia reconstruídos e leitos mensais declarados; não é ocupação real.
- Taxas territoriais consideram residentes de SP atendidos em hospitais de SP; saídas para outras UFs não estão no RD-SP.
- A participação de ICSAP usa todas as internações novas observadas de residentes no denominador, pois o procedimento necessário ao denominador clínico oficial não foi preservado na Silver.
- Lista ICSAP: Portaria SAS/MS 221/2008.
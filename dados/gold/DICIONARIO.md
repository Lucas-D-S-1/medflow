# Dicionário da camada Gold — MedFlow

Contrato de esquema `0.3.0`, gerado automaticamente em `2026-08-01T21:12:55.970726+00:00`.

## Responsabilidade da camada

- Marts orientados às perguntas de gestão e ao consumo no BI.
- Toda métrica expõe amostra, numerador, denominador ou estado de calculabilidade.
- IPH é pressão estimada contra capacidade declarada, não ocupação real.
- Valores financeiros nominais são preservados e os valores reais usam IPCA/IBGE com competência de referência explícita.
- Indicadores populacionais usam residência; indicadores de oferta usam a região do hospital.
- Fluxos para fora de SP não são observáveis no recorte SIH/RD-SP e nunca são tratados como evasão total.
- ICSAP classificada pela Portaria SAS/MS 221/2008; a participação publicada usa o total observado, não o denominador clínico oficial.

## `mart_indicador_hospital_mensal`

Pressão estimada, capacidade e volume mensal por hospital.

- Caminho: `dados/gold/marts/mart_indicador_hospital_mensal.parquet`
- Grão: uma linha por hospital e competência
- Linhas: 18,690
- Chave lógica: `cd_cnes`, `cd_competencia`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_cnes` | `string` | 0 | Código de sete dígitos do estabelecimento no CNES. |
| `nr_ano_competencia` | `int16` | 0 | Ano da competência de processamento. |
| `nr_mes_competencia` | `int8` | 0 | Número do mês da competência de processamento. |
| `cd_competencia` | `string` | 0 | Competência no formato AAAAMM. |
| `qt_leito_sus` | `int32` | 0 | Quantidade mensal de leitos disponíveis ao SUS declarada no CNES. |
| `qt_leito_total` | `int32` | 0 | Quantidade mensal total de leitos declarada no CNES. |
| `qt_tipo_leito` | `int64` | 0 | Quantidade de tipos de leito distintos observados no mês. |
| `qt_dia_mes` | `int64` | 0 | Quantidade de dias civis da competência. |
| `qt_capacidade_teorica_leito_dia` | `int64` | 0 | Leitos SUS multiplicados pelos dias civis do mês. |
| `qt_paciente_dia_estimado` | `int64` | 0 | Pacientes-dia reconstruídos pelas datas de entrada e saída. |
| `qt_internacao_nova` | `int64` | 0 | Quantidade de internações novas, identificadas por AIH normal. |
| `qt_obito` | `int64` | 0 | Quantidade de óbitos em internações novas. |
| `qt_dia_permanencia_soma` | `int64` | 0 | Soma dos dias de permanência das internações novas. |
| `vl_aprovado_internacao_nova_soma` | `float64` | 0 | Soma nominal dos valores aprovados para internações novas. |
| `nm_hospital_atual` | `object` | 0 | Nome fantasia atual do estabelecimento; não representa histórico mensal. |
| `cd_municipio_ibge_6` | `string` | 0 | Código municipal de seis dígitos usado nas bases do DATASUS. |
| `cd_regiao_saude` | `string` | 0 | Código oficial de cinco dígitos da região de saúde. |
| `nm_regiao_saude` | `object` | 0 | Nome oficial da região de saúde. |
| `cd_macrorregiao_saude` | `string` | 0 | Código oficial da macrorregião de saúde. |
| `nm_macrorregiao_saude` | `object` | 0 | Nome oficial da macrorregião de saúde. |
| `cd_tipo_unidade` | `string` | 0 | Código CNES do tipo de unidade. |
| `nm_tipo_unidade` | `object` | 0 | Descrição do tipo de unidade. |
| `nr_iph_estimado` | `float64` | 142 | Razão entre pacientes-dia estimados e leitos-dia declarados. |
| `pc_iph_estimado` | `float64` | 142 | IPH estimado expresso em percentual. |
| `st_capacidade` | `object` | 0 | Estado da disponibilidade de capacidade SUS para calcular o IPH. |
| `fl_acima_capacidade_declarada` | `int8` | 0 | Indica IPH estimado superior à capacidade declarada; sinaliza investigação, não ocupação comprovada. |
| `pc_tmh` | `float64` | 998 | Óbitos em internações novas divididos pelas internações novas, em percentual. |
| `vl_cmi` | `float64` | 998 | Valor nominal aprovado nas internações novas dividido pela quantidade de internações novas. |
| `nr_permanencia_media` | `float64` | 998 | Soma dos dias de permanência dividida pela quantidade de internações novas. |
| `st_amostra` | `object` | 0 | Estado da amostra segundo os mínimos definidos no contrato do indicador. |
| `nr_indice_ipca` | `Float64` | 0 | Número-índice mensal do IPCA/IBGE, tabela SIDRA 1737, variável 2266. |
| `nr_fator_correcao_ipca` | `Float64` | 0 | Fator que atualiza o valor nominal da competência para o preço de referência explícito. |
| `cd_competencia_preco_referencia` | `object` | 0 | Competência AAAAMM para a qual os valores reais foram corrigidos pelo IPCA. |
| `vl_aprovado_internacao_nova_real_soma` | `Float64` | 0 | Soma dos valores aprovados para internações novas corrigida pelo IPCA para o preço de referência. |
| `vl_cmi_real` | `float64` | 998 | Valor aprovado médio corrigido pelo IPCA para a competência indicada em cd_competencia_preco_referencia. |

## `mart_indicador_hospital_especialidade_mensal`

TMH e CMI por hospital, especialidade e competência.

- Caminho: `dados/gold/marts/mart_indicador_hospital_especialidade_mensal.parquet`
- Grão: uma linha por hospital, especialidade e competência
- Linhas: 52,525
- Chave lógica: `cd_cnes`, `cd_especialidade_sih`, `cd_competencia`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_cnes` | `string` | 0 | Código de sete dígitos do estabelecimento no CNES. |
| `cd_especialidade_sih` | `string` | 0 | Código de especialidade da internação no SIH. |
| `nm_especialidade` | `object` | 0 | Descrição da especialidade do SIH. |
| `cd_regiao_saude` | `string` | 0 | Código oficial de cinco dígitos da região de saúde. |
| `nm_regiao_saude` | `object` | 0 | Nome oficial da região de saúde. |
| `cd_macrorregiao_saude` | `string` | 0 | Código oficial da macrorregião de saúde. |
| `nm_macrorregiao_saude` | `object` | 0 | Nome oficial da macrorregião de saúde. |
| `nr_ano_competencia` | `int16` | 0 | Ano da competência de processamento. |
| `nr_mes_competencia` | `int8` | 0 | Número do mês da competência de processamento. |
| `cd_competencia` | `string` | 0 | Competência no formato AAAAMM. |
| `qt_internacao_nova` | `int64` | 0 | Quantidade de internações novas, identificadas por AIH normal. |
| `qt_obito` | `int64` | 0 | Quantidade de óbitos em internações novas. |
| `qt_dia_permanencia_soma` | `int32` | 0 | Soma dos dias de permanência das internações novas. |
| `vl_aprovado_internacao_nova_soma` | `float64` | 0 | Soma nominal dos valores aprovados para internações novas. |
| `vl_aprovado_continuacao_soma` | `float64` | 0 | Soma nominal dos valores aprovados para continuações de longa permanência. |
| `pc_tmh` | `float64` | 0 | Óbitos em internações novas divididos pelas internações novas, em percentual. |
| `vl_cmi` | `float64` | 0 | Valor nominal aprovado nas internações novas dividido pela quantidade de internações novas. |
| `nr_permanencia_media` | `float64` | 0 | Soma dos dias de permanência dividida pela quantidade de internações novas. |
| `st_amostra` | `object` | 0 | Estado da amostra segundo os mínimos definidos no contrato do indicador. |
| `nr_indice_ipca` | `Float64` | 0 | Número-índice mensal do IPCA/IBGE, tabela SIDRA 1737, variável 2266. |
| `nr_fator_correcao_ipca` | `Float64` | 0 | Fator que atualiza o valor nominal da competência para o preço de referência explícito. |
| `cd_competencia_preco_referencia` | `object` | 0 | Competência AAAAMM para a qual os valores reais foram corrigidos pelo IPCA. |
| `vl_aprovado_internacao_nova_real_soma` | `Float64` | 0 | Soma dos valores aprovados para internações novas corrigida pelo IPCA para o preço de referência. |
| `vl_cmi_real` | `float64` | 0 | Valor aprovado médio corrigido pelo IPCA para a competência indicada em cd_competencia_preco_referencia. |

## `mart_indicador_hospital_cid_periodo`

IPR por hospital e diagnóstico no período completo.

- Caminho: `dados/gold/marts/mart_indicador_hospital_cid_periodo.parquet`
- Grão: uma linha por hospital e CID principal
- Linhas: 447,334
- Chave lógica: `cd_cnes`, `cd_cid_principal`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_cnes` | `string` | 0 | Código de sete dígitos do estabelecimento no CNES. |
| `cd_regiao_saude` | `string` | 0 | Código oficial de cinco dígitos da região de saúde. |
| `nm_regiao_saude` | `object` | 0 | Nome oficial da região de saúde. |
| `cd_macrorregiao_saude` | `string` | 0 | Código oficial da macrorregião de saúde. |
| `nm_macrorregiao_saude` | `object` | 0 | Nome oficial da macrorregião de saúde. |
| `cd_cid_principal` | `object` | 0 | Código CID-10 do diagnóstico principal. |
| `ds_cid` | `object` | 0 | Descrição completa do diagnóstico CID-10. |
| `cd_capitulo_cid` | `object` | 0 | Código do capítulo da CID-10. |
| `ds_capitulo_cid` | `object` | 0 | Descrição do capítulo da CID-10. |
| `qt_internacao_nova` | `int64` | 0 | Quantidade de internações novas, identificadas por AIH normal. |
| `qt_dia_permanencia_soma` | `int32` | 0 | Soma dos dias de permanência das internações novas. |
| `qt_internacao_benchmark` | `int64` | 0 | Quantidade de internações no benchmark regional, excluído o hospital avaliado. |
| `qt_dia_permanencia_benchmark` | `int32` | 0 | Quantidade referente a dia permanencia benchmark. |
| `qt_hospital_benchmark` | `int64` | 0 | Quantidade de outros hospitais que compõem o benchmark. |
| `nr_permanencia_media_hospital` | `float64` | 0 | Valor numérico referente a permanencia media hospital. |
| `nr_permanencia_media_benchmark` | `float64` | 94,813 | Valor numérico referente a permanencia media benchmark. |
| `nr_ipr` | `float64` | 416,784 | Permanência média do hospital/CID dividida pelo benchmark regional que exclui o hospital. |
| `st_amostra` | `object` | 0 | Estado da amostra segundo os mínimos definidos no contrato do indicador. |

## `mart_indicador_regiao_mensal`

Indicadores consolidados para mapa e visão executiva regional.

- Caminho: `dados/gold/marts/mart_indicador_regiao_mensal.parquet`
- Grão: uma linha por região de saúde e competência
- Linhas: 1,798
- Chave lógica: `cd_regiao_saude`, `cd_competencia`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_regiao_saude` | `string` | 0 | Código oficial de cinco dígitos da região de saúde. |
| `nm_regiao_saude` | `object` | 0 | Nome oficial da região de saúde. |
| `cd_macrorregiao_saude` | `string` | 0 | Código oficial da macrorregião de saúde. |
| `nm_macrorregiao_saude` | `object` | 0 | Nome oficial da macrorregião de saúde. |
| `nr_ano_competencia` | `int16` | 0 | Ano da competência de processamento. |
| `nr_mes_competencia` | `int8` | 0 | Número do mês da competência de processamento. |
| `cd_competencia` | `string` | 0 | Competência no formato AAAAMM. |
| `qt_internacao_nova` | `int64` | 0 | Quantidade de internações novas, identificadas por AIH normal. |
| `qt_obito` | `int64` | 0 | Quantidade de óbitos em internações novas. |
| `qt_dia_permanencia_soma` | `int32` | 0 | Soma dos dias de permanência das internações novas. |
| `vl_aprovado_internacao_nova_soma` | `float64` | 0 | Soma nominal dos valores aprovados para internações novas. |
| `qt_hospital_com_internacao` | `int64` | 0 | Quantidade referente a hospital com internacao. |
| `qt_paciente_dia_estimado` | `int64` | 0 | Pacientes-dia reconstruídos pelas datas de entrada e saída. |
| `qt_leito_sus` | `int32` | 0 | Quantidade mensal de leitos disponíveis ao SUS declarada no CNES. |
| `qt_capacidade_teorica_leito_dia` | `int64` | 0 | Leitos SUS multiplicados pelos dias civis do mês. |
| `qt_populacao_ibge_2022` | `int64` | 0 | População municipal do Censo IBGE 2022 distribuída no CSV oficial do Ministério da Saúde. |
| `qt_internacao_residente_observada` | `int64` | 0 | Internações novas de residentes da região observadas nos hospitais de São Paulo. |
| `qt_internacao_residente_na_propria_regiao` | `int64` | 0 | Internações de residentes atendidos em hospital da própria região de saúde. |
| `qt_evasao_intrastadual_observada` | `int64` | 0 | Internações de residentes atendidos em outra região de saúde de SP; não inclui saídas para outras UFs. |
| `qt_internacao_icsap_residente_observada` | `int64` | 0 | Internações novas de residentes classificadas na Lista Brasileira de ICSAP e atendidas em SP. |
| `qt_internacao_recebida_outra_regiao_sp` | `int64` | 0 | Internações realizadas na região para residentes de outra região de saúde paulista. |
| `qt_internacao_recebida_fora_sp` | `int64` | 0 | Internações realizadas na região para residentes de outra unidade da Federação. |
| `tx_internacao_residente_observada_por_100_mil` | `float64` | 0 | Internações de residentes da região atendidos em SP por 100 mil habitantes; não observa atendimentos fora do estado. |
| `pc_evasao_intrastadual_observada` | `float64` | 0 | Evasão intrastadual observada dividida pelas internações de residentes atendidos em SP. |
| `pc_atracao_assistencial` | `float64` | 0 | Internações recebidas de fora da região divididas pelo total de internações realizadas na região. |
| `pc_icsap_no_total_internacao_residente_observada` | `float64` | 0 | ICSAP divididas por todas as internações novas observadas de residentes; não é o denominador clínico oficial. |
| `tx_icsap_residente_observada_por_10_mil` | `float64` | 0 | ICSAP observadas de residentes por 10 mil habitantes do Censo IBGE 2022. |
| `pc_tmh` | `float64` | 0 | Óbitos em internações novas divididos pelas internações novas, em percentual. |
| `vl_cmi` | `float64` | 0 | Valor nominal aprovado nas internações novas dividido pela quantidade de internações novas. |
| `nr_permanencia_media` | `float64` | 0 | Soma dos dias de permanência dividida pela quantidade de internações novas. |
| `nr_iph_estimado` | `float64` | 0 | Razão entre pacientes-dia estimados e leitos-dia declarados. |
| `pc_iph_estimado` | `float64` | 0 | IPH estimado expresso em percentual. |
| `qt_internacao_media_historica` | `float64` | 0 | Quantidade referente a internacao media historica. |
| `qt_ano_historico` | `int64` | 0 | Quantidade de anos históricos usados na referência sazonal. |
| `nr_indice_sazonalidade` | `float64` | 1,488 | Volume atual dividido pela média do mesmo mês em 2024 e 2025. |
| `pc_variacao_sazonal` | `float64` | 1,488 | Variação percentual correspondente ao índice de sazonalidade. |
| `st_indice_sazonalidade` | `object` | 0 | Estado de calculabilidade do índice sazonal. |
| `nr_indice_ipca` | `Float64` | 0 | Número-índice mensal do IPCA/IBGE, tabela SIDRA 1737, variável 2266. |
| `nr_fator_correcao_ipca` | `Float64` | 0 | Fator que atualiza o valor nominal da competência para o preço de referência explícito. |
| `cd_competencia_preco_referencia` | `object` | 0 | Competência AAAAMM para a qual os valores reais foram corrigidos pelo IPCA. |
| `vl_aprovado_internacao_nova_real_soma` | `Float64` | 0 | Soma dos valores aprovados para internações novas corrigida pelo IPCA para o preço de referência. |
| `vl_cmi_real` | `float64` | 0 | Valor aprovado médio corrigido pelo IPCA para a competência indicada em cd_competencia_preco_referencia. |

## `mart_indicador_regiao_periodo`

Resumo da distribuição do IPR elegível por região de saúde.

- Caminho: `dados/gold/marts/mart_indicador_regiao_periodo.parquet`
- Grão: uma linha por região de saúde no período
- Linhas: 62
- Chave lógica: `cd_regiao_saude`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_regiao_saude` | `string` | 0 | Código oficial de cinco dígitos da região de saúde. |
| `nm_regiao_saude` | `object` | 0 | Nome oficial da região de saúde. |
| `cd_macrorregiao_saude` | `string` | 0 | Código oficial da macrorregião de saúde. |
| `nm_macrorregiao_saude` | `object` | 0 | Nome oficial da macrorregião de saúde. |
| `qt_combinacao_hospital_cid` | `int64` | 0 | Quantidade referente a combinacao hospital cid. |
| `qt_internacao_nova` | `int64` | 0 | Quantidade de internações novas, identificadas por AIH normal. |
| `qt_combinacao_ipr_elegivel` | `float64` | 9 | Quantidade referente a combinacao ipr elegivel. |
| `nr_ipr_mediana` | `float64` | 9 | Valor numérico referente a ipr mediana. |
| `nr_ipr_media` | `float64` | 9 | Valor numérico referente a ipr media. |
| `qt_combinacao_ipr_acima_referencia` | `float64` | 9 | Quantidade referente a combinacao ipr acima referencia. |
| `pc_combinacao_ipr_acima_referencia` | `float64` | 9 | Percentual referente a combinacao ipr acima referencia. |

## `mart_fluxo_assistencial_regiao_mensal`

Tabela analítica mart_fluxo_assistencial_regiao_mensal.

- Caminho: `dados/gold/marts/mart_fluxo_assistencial_regiao_mensal.parquet`
- Grão: granularidade documentada pelo pipeline produtor
- Linhas: 30,018
- Chave lógica: sem unicidade assumida; usar o identificador da fonte e a competência

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_origem_residencia` | `string` | 0 | Região de saúde de residência ou FORA_SP para residentes de outra UF. |
| `cd_regiao_saude_atendimento` | `string` | 0 | Região de saúde do hospital que realizou o atendimento. |
| `nr_ano_competencia` | `int16` | 0 | Ano da competência de processamento. |
| `nr_mes_competencia` | `int8` | 0 | Número do mês da competência de processamento. |
| `cd_competencia` | `string` | 0 | Competência no formato AAAAMM. |
| `st_fluxo_assistencial` | `object` | 0 | Classificação do fluxo: intrarregional, interregional_sp ou entrada_outro_estado. |
| `qt_internacao_nova` | `int64` | 0 | Quantidade de internações novas, identificadas por AIH normal. |
| `nm_origem_residencia` | `object` | 0 | Nome da região de residência ou indicação de residência fora de São Paulo. |
| `cd_macrorregiao_origem` | `string` | 1,526 | Macrorregião de saúde da residência; nula para residentes fora de SP. |
| `nm_macrorregiao_origem` | `object` | 1,526 | Nome da macrorregião de residência; nulo para residentes fora de SP. |
| `nm_regiao_saude_atendimento` | `object` | 0 | Nome da região de saúde do hospital que realizou o atendimento. |
| `cd_macrorregiao_atendimento` | `string` | 0 | Macrorregião de saúde do hospital que realizou o atendimento. |
| `nm_macrorregiao_atendimento` | `object` | 0 | Nome da macrorregião de saúde do hospital que realizou o atendimento. |
| `pc_origem_no_atendimento` | `float64` | 0 | Participação da origem no total de internações realizadas na região de atendimento e competência. |
| `pc_destino_na_origem_observada` | `float64` | 0 | Participação do destino nas internações da origem observadas em hospitais de SP. |

## `mart_icsap_regiao_mensal`

Tabela analítica mart_icsap_regiao_mensal.

- Caminho: `dados/gold/marts/mart_icsap_regiao_mensal.parquet`
- Grão: granularidade documentada pelo pipeline produtor
- Linhas: 34,162
- Chave lógica: sem unicidade assumida; usar o identificador da fonte e a competência

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_regiao_saude` | `string` | 0 | Código oficial de cinco dígitos da região de saúde. |
| `nm_regiao_saude` | `object` | 0 | Nome oficial da região de saúde. |
| `cd_macrorregiao_saude` | `string` | 0 | Código oficial da macrorregião de saúde. |
| `nm_macrorregiao_saude` | `object` | 0 | Nome oficial da macrorregião de saúde. |
| `qt_populacao_ibge_2022` | `int64` | 0 | População municipal do Censo IBGE 2022 distribuída no CSV oficial do Ministério da Saúde. |
| `nr_ano_competencia` | `int16` | 0 | Ano da competência de processamento. |
| `nr_mes_competencia` | `int8` | 0 | Número do mês da competência de processamento. |
| `cd_competencia` | `string` | 0 | Competência no formato AAAAMM. |
| `cd_grupo_icsap` | `object` | 0 | Código ordinal de dois dígitos do grupo da Lista Brasileira de ICSAP. |
| `nm_grupo_icsap` | `object` | 0 | Nome do grupo da Lista Brasileira de ICSAP da Portaria SAS/MS 221/2008. |
| `qt_internacao_icsap` | `int64` | 0 | Quantidade de internações novas classificadas no grupo ICSAP. |
| `qt_internacao_icsap_total_regiao` | `int64` | 0 | Total de internações ICSAP observadas entre residentes da região e competência. |
| `pc_grupo_no_total_icsap` | `float64` | 0 | Participação do grupo no total de ICSAP da região e competência. |
| `tx_icsap_grupo_por_10_mil_habitantes` | `float64` | 0 | Internações do grupo ICSAP por 10 mil residentes da região. |

## `dim_geografia_municipio`

Municípios, população e hierarquia regional para integração geográfica.

- Caminho: `dados/gold/geografia/dim_geografia_municipio.csv`
- Grão: uma linha por município
- Linhas: 645
- Chave lógica: `cd_municipio_ibge_7`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_municipio_ibge_7` | `object` | 0 | Código oficial de sete dígitos do município no IBGE. |
| `cd_municipio_ibge_6` | `object` | 0 | Código municipal de seis dígitos usado nas bases do DATASUS. |
| `nm_municipio` | `object` | 0 | Nome oficial do município. |
| `sg_uf` | `object` | 0 | Sigla da unidade da Federação. |
| `cd_regiao_saude` | `string` | 0 | Código oficial de cinco dígitos da região de saúde. |
| `nm_regiao_saude` | `object` | 0 | Nome oficial da região de saúde. |
| `cd_macrorregiao_saude` | `string` | 0 | Código oficial da macrorregião de saúde. |
| `nm_macrorregiao_saude` | `object` | 0 | Nome oficial da macrorregião de saúde. |
| `qt_populacao_ibge_2022` | `int64` | 0 | População municipal do Censo IBGE 2022 distribuída no CSV oficial do Ministério da Saúde. |
| `ds_fonte_populacao` | `object` | 0 | Fonte e ano de referência da população municipal. |

## `dim_geografia_regiao`

Regiões de saúde, população agregada e quantidade de municípios.

- Caminho: `dados/gold/geografia/dim_geografia_regiao.csv`
- Grão: uma linha por região de saúde
- Linhas: 62
- Chave lógica: `cd_regiao_saude`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_regiao_saude` | `string` | 0 | Código oficial de cinco dígitos da região de saúde. |
| `nm_regiao_saude` | `object` | 0 | Nome oficial da região de saúde. |
| `cd_macrorregiao_saude` | `string` | 0 | Código oficial da macrorregião de saúde. |
| `nm_macrorregiao_saude` | `object` | 0 | Nome oficial da macrorregião de saúde. |
| `qt_municipio` | `int64` | 0 | Quantidade referente a municipio. |
| `qt_populacao_ibge_2022` | `int64` | 0 | População municipal do Censo IBGE 2022 distribuída no CSV oficial do Ministério da Saúde. |

## Ativos não tabulares

### `mapa_regiao_saude_sp.geojson`

Polígonos das 62 regiões de saúde, dissolvidos da malha municipal IBGE 2024.

- Caminho: `dados/gold/geografia/mapa_regiao_saude_sp.geojson`
- Fonte: https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2024/UFs/SP/SP_Municipios_2024.zip
- Formato: `geojson`

### `mapa_regiao_saude_sp.topojson`

Topologia simplificada das regiões de saúde para mapas customizados no BI.

- Caminho: `dados/gold/geografia/mapa_regiao_saude_sp.topojson`
- Fonte: https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2024/UFs/SP/SP_Municipios_2024.zip
- Formato: `topojson`

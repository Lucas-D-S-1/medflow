# Dicionário da camada Gold — MedFlow

Contrato de esquema `0.2.0`, gerado automaticamente em `2026-07-29T23:17:49.038842+00:00`.

## Responsabilidade da camada

- Marts orientados às perguntas de gestão e ao consumo no BI.
- Toda métrica expõe amostra, numerador, denominador ou estado de calculabilidade.
- IPH é pressão estimada contra capacidade declarada, não ocupação real.
- Valores financeiros são nominais enquanto o IPCA não for incorporado.

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
| `st_amostra` | `object` | 0 | Estado da amostra segundo os mínimos definidos no contrato do indicador. |

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
| `st_amostra` | `object` | 0 | Estado da amostra segundo os mínimos definidos no contrato do indicador. |

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
| `qt_internacao_por_100_mil_habitante` | `float64` | 0 | Internações novas por 100 mil habitantes usando população do Censo IBGE 2022. |
| `pc_tmh` | `float64` | 0 | Óbitos em internações novas divididos pelas internações novas, em percentual. |
| `vl_cmi` | `float64` | 0 | Valor nominal aprovado nas internações novas dividido pela quantidade de internações novas. |
| `nr_iph_estimado` | `float64` | 0 | Razão entre pacientes-dia estimados e leitos-dia declarados. |
| `pc_iph_estimado` | `float64` | 0 | IPH estimado expresso em percentual. |
| `qt_internacao_media_historica` | `float64` | 0 | Quantidade referente a internacao media historica. |
| `qt_ano_historico` | `int64` | 0 | Quantidade de anos históricos usados na referência sazonal. |
| `nr_indice_sazonalidade` | `float64` | 1,488 | Volume atual dividido pela média do mesmo mês em 2024 e 2025. |
| `pc_variacao_sazonal` | `float64` | 1,488 | Variação percentual correspondente ao índice de sazonalidade. |
| `st_indice_sazonalidade` | `object` | 0 | Estado de calculabilidade do índice sazonal. |

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

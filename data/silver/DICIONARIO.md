# Dicionário da camada Silver — MedFlow

Contrato de esquema `0.3.0`, gerado automaticamente em `2026-08-27T00:12:50.372559+00:00`.

## Responsabilidade da camada

- Dados tipados, conformados, reconciliados e prontos para reuso.
- Somente dimensões e fatos; indicadores e benchmarks pertencem à Gold.
- Nomes em snake_case, no singular e com prefixos semânticos.

## `dim_tempo`

Calendário mensal do recorte analítico.

- Caminho: `data/silver/dimensoes/dim_tempo.parquet`
- Grão: uma linha por competência
- Linhas: 30
- Chave lógica: `cd_competencia`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `nr_ano_competencia` | `int64` | 0 | Ano da competência de processamento. |
| `nr_mes_competencia` | `int64` | 0 | Número do mês da competência de processamento. |
| `qt_dia_mes` | `int64` | 0 | Quantidade de dias civis da competência. |
| `cd_competencia` | `object` | 0 | Competência no formato AAAAMM. |
| `dt_competencia` | `datetime64[ns]` | 0 | Primeiro dia do mês de competência. |
| `nr_trimestre` | `int32` | 0 | Número do trimestre civil da competência. |

## `dim_hospital`

Cadastro conformado dos hospitais presentes no SIH.

- Caminho: `data/silver/dimensoes/dim_hospital.parquet`
- Grão: uma linha por CNES
- Linhas: 655
- Chave lógica: `cd_cnes`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_cnes` | `string` | 0 | Código de sete dígitos do estabelecimento no CNES. |
| `cd_municipio_ibge_6` | `string` | 0 | Código municipal de seis dígitos usado nas bases do DATASUS. |
| `cd_tipo_unidade` | `string` | 0 | Código CNES do tipo de unidade. |
| `cd_esfera_administrativa_cnes_lt` | `string` | 0 | Código bruto da esfera administrativa no CNES/LT. |
| `cd_natureza_juridica` | `string` | 0 | Código CONCLA da natureza jurídica. |
| `cd_tipo_gestao` | `string` | 0 | Código do tipo de gestão do estabelecimento. |
| `cd_regiao_saude_cnes_lt` | `string` | 81 | Código de região declarado historicamente no arquivo CNES/LT. |
| `qt_regiao_saude_declarada_cnes_lt` | `float64` | 81 | Quantidade de códigos regionais distintos observados no histórico CNES/LT. |
| `cd_regiao_saude` | `string` | 0 | Código oficial de cinco dígitos da região de saúde. |
| `nm_regiao_saude` | `object` | 0 | Nome oficial da região de saúde. |
| `cd_macrorregiao_saude` | `string` | 0 | Código oficial da macrorregião de saúde. |
| `nm_macrorregiao_saude` | `object` | 0 | Nome oficial da macrorregião de saúde. |
| `nm_hospital_atual` | `object` | 0 | Nome fantasia atual do estabelecimento; não representa histórico mensal. |
| `nm_razao_social_hospital_atual` | `object` | 0 | Razão social atual do estabelecimento. |
| `nm_esfera_administrativa_atual` | `object` | 0 | Descrição atual da esfera administrativa obtida na API do CNES. |
| `dt_atualizacao_cadastro_cnes` | `object` | 0 | Data de atualização informada pela fotografia atual do CNES. |
| `ds_origem_regiao` | `object` | 0 | Fonte usada para atribuir a região analítica. |
| `fl_regiao_conflitante` | `int8` | 0 | Indica hospital com mais de uma região declarada no histórico CNES/LT. |
| `fl_regiao_nao_confiavel` | `int8` | 0 | Indica ausência de região oficial confiável. |
| `nm_tipo_unidade` | `object` | 0 | Descrição do tipo de unidade. |
| `nm_tipo_gestao` | `object` | 0 | Descrição do tipo de gestão do estabelecimento. |
| `nm_natureza_juridica` | `object` | 0 | Descrição CONCLA da natureza jurídica. |
| `fl_esfera_ausente_cnes_lt` | `int8` | 0 | Indica ausência da esfera administrativa no CNES/LT. |
| `fl_cadastro_atual_nao_historico` | `int8` | 0 | Indica atributo cadastral atual, sem vigência histórica garantida. |

## `dim_hospital_alias`

Aliases governados para pesquisa de hospitais.

- Caminho: `data/silver/dimensoes/dim_hospital_alias.parquet`
- Grão: uma linha por alias e CNES
- Linhas: 2
- Chave lógica: `cd_cnes`, `nm_alias_normalizado`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_cnes` | `object` | 0 | Código de sete dígitos do estabelecimento no CNES. |
| `nm_alias` | `object` | 0 | Nome alternativo governado aceito na busca do hospital. |
| `nm_alias_normalizado` | `object` | 0 | Alias normalizado para comparação sem acentos e pontuação. |
| `tp_alias` | `object` | 0 | Tipo do alias: popular, oficial, histórico ou sigla. |
| `fl_alias_preferencial` | `int64` | 0 | Indica alias preferencial dentro do seu tipo. |
| `ds_fonte_alias` | `object` | 0 | Fonte que sustenta o alias hospitalar. |
| `dt_referencia_fonte` | `object` | 0 | Data de referência da edição territorial ou cadastral usada. |

## `dim_hospital_territorio_atual`

Atribuição cadastral atual dos hospitais de São Paulo ao território municipal.

- Caminho: `data/silver/dimensoes/dim_hospital_territorio_atual.parquet`
- Grão: uma linha por CNES dentro do município de São Paulo
- Linhas: 107
- Chave lógica: `cd_cnes`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_cnes` | `object` | 0 | Código de sete dígitos do estabelecimento no CNES. |
| `cd_municipio_ibge_7` | `object` | 0 | Código oficial de sete dígitos do município no IBGE. |
| `cd_distrito_sp` | `object` | 6 | Código do distrito municipal de São Paulo na camada oficial do GeoSampa. |
| `id_subprefeitura_sp` | `object` | 6 | Identificador canônico da subprefeitura municipal no GeoSampa. |
| `id_crs_sms_sp` | `object` | 6 | Identificador da Coordenadoria Regional de Saúde municipal no GeoSampa. |
| `id_sts_sms_sp` | `object` | 6 | Identificador da Supervisão Técnica de Saúde municipal no GeoSampa. |
| `nm_bairro_cnes_atual` | `object` | 0 | Bairro informado pela fotografia atual do cadastro CNES. |
| `vl_latitude_cnes_atual` | `float64` | 0 | Latitude informada pela fotografia atual do cadastro CNES. |
| `vl_longitude_cnes_atual` | `float64` | 0 | Longitude informada pela fotografia atual do cadastro CNES. |
| `tp_metodo_atribuicao` | `object` | 0 | Método usado para atribuir o hospital ao território municipal. |
| `fl_atribuicao_ambigua` | `int64` | 0 | Indica hospital sem atribuição territorial única no ponto cadastral. |
| `ds_fonte_territorio` | `object` | 0 | Fonte e sistema de referência usados na atribuição territorial. |
| `dt_referencia_fonte` | `object` | 6 | Data de referência da edição territorial ou cadastral usada. |

## `dim_municipio`

Municípios paulistas e sua hierarquia regional.

- Caminho: `data/silver/dimensoes/dim_municipio.parquet`
- Grão: uma linha por município
- Linhas: 645
- Chave lógica: `cd_municipio_ibge_7`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_municipio_ibge_7` | `object` | 0 | Código oficial de sete dígitos do município no IBGE. |
| `cd_municipio_ibge_6` | `object` | 0 | Código municipal de seis dígitos usado nas bases do DATASUS. |
| `nm_municipio` | `object` | 0 | Nome oficial do município. |
| `sg_uf` | `object` | 0 | Sigla da unidade da Federação. |
| `nm_microrregiao` | `object` | 0 | Nome da microrregião geográfica do IBGE. |
| `nm_mesorregiao` | `object` | 0 | Nome da mesorregião geográfica do IBGE. |
| `cd_regiao_saude` | `string` | 0 | Código oficial de cinco dígitos da região de saúde. |
| `nm_regiao_saude` | `object` | 0 | Nome oficial da região de saúde. |
| `cd_macrorregiao_saude` | `string` | 0 | Código oficial da macrorregião de saúde. |
| `nm_macrorregiao_saude` | `object` | 0 | Nome oficial da macrorregião de saúde. |
| `qt_populacao_ibge_2022` | `int64` | 0 | População municipal do Censo IBGE 2022 distribuída no CSV oficial do Ministério da Saúde. |
| `ds_fonte_populacao` | `object` | 0 | Fonte e ano de referência da população municipal. |

## `dim_territorio_municipal`

Hierarquia municipal de São Paulo por distrito, subprefeitura, CRS e STS.

- Caminho: `data/silver/dimensoes/dim_territorio_municipal.parquet`
- Grão: uma linha por distrito municipal
- Linhas: 96
- Chave lógica: `cd_municipio_ibge_7`, `cd_distrito_sp`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_municipio_ibge_7` | `object` | 0 | Código oficial de sete dígitos do município no IBGE. |
| `cd_distrito_sp` | `object` | 0 | Código do distrito municipal de São Paulo na camada oficial do GeoSampa. |
| `nm_distrito` | `object` | 0 | Nome oficial do distrito municipal de São Paulo. |
| `id_subprefeitura_sp` | `object` | 0 | Identificador canônico da subprefeitura municipal no GeoSampa. |
| `nm_subprefeitura` | `object` | 0 | Nome oficial da subprefeitura municipal. |
| `id_crs_sms_sp` | `object` | 0 | Identificador da Coordenadoria Regional de Saúde municipal no GeoSampa. |
| `nm_crs_sms` | `object` | 0 | Nome da Coordenadoria Regional de Saúde municipal. |
| `id_sts_sms_sp` | `object` | 0 | Identificador da Supervisão Técnica de Saúde municipal no GeoSampa. |
| `nm_sts_sms` | `object` | 0 | Nome da Supervisão Técnica de Saúde municipal. |
| `nm_regiao_municipal_5` | `object` | 0 | Região municipal ampla informada pelo GeoSampa; não é Região de Saúde do SUS. |
| `nm_regiao_municipal_8` | `object` | 0 | Subdivisão regional municipal informada pelo GeoSampa; não é Região de Saúde do SUS. |
| `nm_zona_popular` | `object` | 0 | Rótulo municipal amigável para busca; não é chave espacial nem sinônimo de Região de Saúde. |
| `ds_fonte_territorio` | `object` | 0 | Fonte e sistema de referência usados na atribuição territorial. |
| `dt_referencia_fonte` | `object` | 0 | Data de referência da edição territorial ou cadastral usada. |

## `dim_especialidade`

Domínio observado de especialidades do SIH.

- Caminho: `data/silver/dimensoes/dim_especialidade.parquet`
- Grão: uma linha por especialidade
- Linhas: 15
- Chave lógica: `cd_especialidade_sih`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_especialidade_sih` | `string` | 0 | Código de especialidade da internação no SIH. |
| `qt_aih_aprovada` | `Int64` | 0 | Quantidade de AIHs aprovadas associadas ao registro dimensional. |
| `nm_especialidade` | `object` | 0 | Descrição da especialidade do SIH. |
| `fl_especialidade_mapeada` | `int8` | 0 | Indica se o código de especialidade possui de/para validado. |

## `dim_cid`

Diagnósticos CID-10 observados no recorte.

- Caminho: `data/silver/dimensoes/dim_cid.parquet`
- Grão: uma linha por CID principal
- Linhas: 9,513
- Chave lógica: `cd_cid_principal`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `cd_cid_principal` | `object` | 0 | Código CID-10 do diagnóstico principal. |
| `qt_aih_aprovada` | `Int64` | 0 | Quantidade de AIHs aprovadas associadas ao registro dimensional. |
| `ds_cid` | `object` | 0 | Descrição completa do diagnóstico CID-10. |
| `ds_cid_abreviada` | `object` | 0 | Descrição abreviada do diagnóstico CID-10. |
| `ds_fonte_descricao` | `object` | 0 | Fonte usada para descrever ou mapear o código. |
| `cd_categoria_cid` | `object` | 0 | Categoria de três caracteres da CID-10. |
| `ds_categoria_cid` | `object` | 4 | Descrição da categoria CID-10. |
| `cd_capitulo_cid` | `object` | 0 | Código do capítulo da CID-10. |
| `ds_capitulo_cid` | `object` | 0 | Descrição do capítulo da CID-10. |

## `dim_dominio`

De/paras auditáveis dos códigos utilizados na Silver.

- Caminho: `data/silver/dimensoes/dim_dominio.parquet`
- Grão: uma linha por campo e código
- Linhas: 84
- Chave lógica: `nm_campo_origem`, `cd_dominio`

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `nm_campo_origem` | `object` | 0 | Nome do campo de origem ao qual o domínio se aplica. |
| `cd_dominio` | `object` | 0 | Código do domínio. |
| `ds_dominio` | `object` | 0 | Descrição do código do domínio. |
| `ds_fonte_dominio` | `object` | 0 | Fonte usada no de/para do domínio. |
| `st_mapeamento` | `object` | 0 | Estado de cobertura e validação do mapeamento. |

## `fato_internacao`

AIHs aprovadas enriquecidas e tipadas para análise.

- Caminho: `data/silver/fatos/fato_internacao.parquet`
- Grão: uma linha por registro mensal de AIH
- Linhas: 7,284,476
- Chave lógica: sem unicidade assumida; usar o identificador da fonte e a competência

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `id_aih` | `string` | 0 | Identificador da Autorização de Internação Hospitalar informado no SIH. |
| `cd_tipo_aih` | `string` | 0 | Código que distingue internação nova de continuação de longa permanência. |
| `ds_tipo_aih` | `object` | 0 | Descrição do tipo de AIH. |
| `cd_cnes` | `string` | 0 | Código de sete dígitos do estabelecimento no CNES. |
| `cd_municipio_ibge_6` | `string` | 0 | Código municipal de seis dígitos usado nas bases do DATASUS. |
| `cd_municipio_residencia_ibge_6` | `string` | 0 | Código DATASUS do município de residência do paciente. |
| `cd_regiao_saude` | `string` | 0 | Código oficial de cinco dígitos da região de saúde. |
| `nm_regiao_saude` | `object` | 0 | Nome oficial da região de saúde. |
| `cd_macrorregiao_saude` | `string` | 0 | Código oficial da macrorregião de saúde. |
| `nm_macrorregiao_saude` | `object` | 0 | Nome oficial da macrorregião de saúde. |
| `ds_origem_regiao` | `object` | 0 | Fonte usada para atribuir a região analítica. |
| `fl_regiao_conflitante` | `int8` | 0 | Indica hospital com mais de uma região declarada no histórico CNES/LT. |
| `fl_regiao_nao_confiavel` | `int8` | 0 | Indica ausência de região oficial confiável. |
| `nr_ano_competencia` | `int16` | 0 | Ano da competência de processamento. |
| `nr_mes_competencia` | `int8` | 0 | Número do mês da competência de processamento. |
| `cd_competencia` | `string` | 0 | Competência no formato AAAAMM. |
| `dt_internacao` | `datetime64[ns]` | 0 | Data de entrada da internação. |
| `dt_saida` | `datetime64[ns]` | 0 | Data de saída da internação. |
| `fl_cruza_mes` | `int8` | 0 | Indica internação cuja entrada e saída estão em meses diferentes. |
| `fl_competencia_diverge_saida` | `int8` | 0 | Indica que a competência de processamento diverge do mês da saída. |
| `cd_especialidade_sih` | `string` | 0 | Código de especialidade da internação no SIH. |
| `nm_especialidade` | `object` | 0 | Descrição da especialidade do SIH. |
| `cd_cid_principal` | `object` | 0 | Código CID-10 do diagnóstico principal. |
| `ds_cid` | `object` | 0 | Descrição completa do diagnóstico CID-10. |
| `ds_categoria_cid` | `object` | 17 | Descrição da categoria CID-10. |
| `cd_capitulo_cid` | `object` | 0 | Código do capítulo da CID-10. |
| `ds_capitulo_cid` | `object` | 0 | Descrição do capítulo da CID-10. |
| `ds_fonte_descricao` | `object` | 0 | Fonte usada para descrever ou mapear o código. |
| `qt_diaria_faturada` | `int32` | 0 | Quantidade de diárias faturadas na AIH; não equivale automaticamente a permanência. |
| `qt_dia_permanencia` | `int32` | 0 | Quantidade de dias de permanência registrada na AIH. |
| `vl_total_aprovado_sus` | `float64` | 0 | Valor nominal total aprovado pelo SUS para a AIH. |
| `qt_diaria_uti_faturada` | `int32` | 0 | Quantidade total de diárias de UTI faturadas na AIH. |
| `cd_tipo_uti` | `string` | 0 | Código da marca ou tipo de UTI informado no SIH. |
| `ds_tipo_uti` | `object` | 0 | Descrição do código de UTI. |
| `nr_idade_informada` | `int32` | 0 | Valor de idade informado, interpretado junto de cd_unidade_idade. |
| `cd_unidade_idade` | `string` | 0 | Código da unidade usada para registrar a idade. |
| `ds_unidade_idade` | `object` | 0 | Descrição da unidade usada para registrar a idade. |
| `nr_idade_ano_aproximada` | `float64` | 1 | Idade aproximada em anos calculada a partir do valor e da unidade informados. |
| `cd_sexo` | `string` | 0 | Código de sexo informado no SIH. |
| `ds_sexo` | `object` | 10 | Descrição do código de sexo. |
| `cd_carater_internacao` | `string` | 0 | Código do caráter da internação. |
| `ds_carater_internacao` | `object` | 0 | Descrição do caráter da internação. |
| `cd_complexidade` | `string` | 0 | Código do nível de complexidade do procedimento. |
| `ds_complexidade` | `object` | 0 | Descrição do nível de complexidade. |
| `fl_aih_aprovada` | `int8` | 0 | Indicador unitário de AIH aprovada. |
| `fl_internacao_nova` | `int8` | 0 | Indica AIH normal, considerada uma nova internação. |
| `fl_continuacao_longa_permanencia` | `int8` | 0 | Indica AIH de continuação de longa permanência. |
| `qt_dia_permanencia_internacao_nova` | `int32` | 0 | Dias de permanência somente quando a linha representa internação nova. |
| `qt_diaria_faturada_internacao_nova` | `int32` | 0 | Diárias faturadas somente quando a linha representa internação nova. |
| `vl_aprovado_internacao_nova` | `float64` | 0 | Valor aprovado somente para internações novas. |
| `vl_aprovado_continuacao` | `float64` | 0 | Valor aprovado somente para continuações de longa permanência. |
| `fl_sem_diaria_faturada` | `int8` | 0 | Indica AIH sem diária faturada. |
| `fl_permanencia_zero` | `int8` | 0 | Indica permanência registrada igual a zero. |
| `fl_sem_valor` | `int8` | 0 | Indica valor total aprovado igual a zero. |
| `fl_obito` | `int8` | 0 | Indica óbito registrado na AIH. |
| `fl_obito_internacao_nova` | `int8` | 0 | Indica óbito em uma internação nova. |
| `fl_aih_com_valor` | `int8` | 0 | Indica AIH com valor total aprovado maior que zero. |
| `fl_uti` | `int8` | 0 | Indica presença de marca de UTI ou diária de UTI faturada. |
| `nm_arquivo_origem` | `object` | 0 | Nome do arquivo DBF de origem da linha. |

## `fato_leito_mensal`

Capacidade de leitos declarada no CNES.

- Caminho: `data/silver/fatos/fato_leito_mensal.parquet`
- Grão: uma linha por hospital e competência
- Linhas: 19,341
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

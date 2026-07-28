# Dicionário da camada Silver — MedFlow

Gerado por `01_engenharia_dados.ipynb`.

## `dim_tempo`

24 linhas × 6 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `_ano` | int64 | 0 |
| `_mes` | int64 | 0 |
| `dias_no_mes` | int64 | 0 |
| `competencia` | object | 0 |
| `data_ref` | datetime64[ns] | 0 |
| `trimestre` | int32 | 0 |

## `dim_hospital`

669 linhas × 24 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `CNES` | string | 0 |
| `municipio_cod6` | string | 0 |
| `tipo_unidade_cod` | string | 0 |
| `esfera_cod_cnes_lt` | string | 0 |
| `natureza_jur_cod` | string | 0 |
| `gestao_cod` | string | 0 |
| `regiao_saude_cnes_lt` | string | 90 |
| `qtd_regioes_declaradas_cnes_lt` | float64 | 90 |
| `regiao_saude` | string | 0 |
| `regiao_saude_nome` | object | 0 |
| `macrorregiao_saude_codigo` | string | 0 |
| `macrorregiao_saude_nome` | object | 0 |
| `hospital_nome_atual` | object | 0 |
| `hospital_razao_social_atual` | object | 0 |
| `esfera_administrativa_atual` | object | 0 |
| `cadastro_cnes_atualizado_em` | object | 0 |
| `origem_regiao` | object | 0 |
| `fl_regiao_conflitante` | int8 | 0 |
| `fl_regiao_nao_confiavel` | int8 | 0 |
| `tipo_unidade` | object | 0 |
| `gestao` | object | 0 |
| `natureza_juridica` | object | 0 |
| `fl_esfera_ausente_cnes_lt` | int8 | 0 |
| `fl_cadastro_atual_nao_historico` | int8 | 0 |

## `dim_municipio`

645 linhas × 10 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `municipio_cod7` | object | 0 |
| `municipio_cod6` | object | 0 |
| `municipio_nome` | object | 0 |
| `uf` | object | 0 |
| `microrregiao` | object | 0 |
| `mesorregiao` | object | 0 |
| `regiao_saude` | string | 0 |
| `regiao_saude_nome` | object | 0 |
| `macrorregiao_saude_codigo` | string | 0 |
| `macrorregiao_saude_nome` | object | 0 |

## `dim_especialidade`

16 linhas × 4 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `ESPEC` | string | 0 |
| `aih_aprovadas` | Int64 | 0 |
| `especialidade` | object | 0 |
| `mapeada` | int8 | 0 |

## `dim_cid`

9,212 linhas × 9 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `cid_principal` | object | 0 |
| `aih_aprovadas` | Int64 | 0 |
| `cid_descricao` | object | 0 |
| `cid_descricao_abreviada` | object | 0 |
| `fonte_descricao` | object | 0 |
| `categoria` | object | 0 |
| `categoria_descricao` | object | 3 |
| `capitulo` | object | 0 |
| `capitulo_desc` | object | 0 |

## `dim_dominio`

83 linhas × 5 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `campo` | object | 0 |
| `codigo` | object | 0 |
| `descricao` | object | 0 |
| `fonte` | object | 0 |
| `status` | object | 0 |

## `fato_internacao`

5,210,357 linhas × 59 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `N_AIH` | string | 0 |
| `IDENT` | string | 0 |
| `ident_descricao` | object | 0 |
| `CNES` | string | 0 |
| `municipio_cod6` | string | 0 |
| `municipio_res_cod6` | string | 0 |
| `regiao_saude` | string | 0 |
| `regiao_saude_nome` | object | 0 |
| `macrorregiao_saude_codigo` | string | 0 |
| `macrorregiao_saude_nome` | object | 0 |
| `origem_regiao` | object | 0 |
| `fl_regiao_conflitante` | int8 | 0 |
| `fl_regiao_nao_confiavel` | int8 | 0 |
| `_ano` | int16 | 0 |
| `_mes` | int8 | 0 |
| `dt_internacao` | datetime64[ns] | 0 |
| `dt_saida` | datetime64[ns] | 0 |
| `fl_cruza_mes` | int8 | 0 |
| `fl_competencia_diverge_saida` | int8 | 0 |
| `ESPEC` | string | 0 |
| `especialidade` | object | 0 |
| `cid_principal` | object | 0 |
| `cid_descricao` | object | 0 |
| `categoria_descricao` | object | 15 |
| `capitulo` | object | 0 |
| `capitulo_desc` | object | 0 |
| `fonte_descricao` | object | 0 |
| `QT_DIARIAS` | int32 | 0 |
| `DIAS_PERM` | int32 | 0 |
| `MORTE` | int32 | 0 |
| `VAL_TOT` | float64 | 0 |
| `UTI_MES_TO` | int32 | 0 |
| `MARCA_UTI` | string | 0 |
| `marca_uti_descricao` | object | 0 |
| `IDADE` | int32 | 0 |
| `COD_IDADE` | string | 0 |
| `unidade_idade` | object | 0 |
| `idade_anos_aprox` | float64 | 0 |
| `SEXO` | string | 0 |
| `sexo_descricao` | object | 0 |
| `CAR_INT` | string | 0 |
| `carater_internacao` | object | 0 |
| `COMPLEX` | string | 0 |
| `complexidade` | object | 0 |
| `fl_aih_aprovada` | int8 | 0 |
| `fl_internacao_nova` | int8 | 0 |
| `fl_continuacao_longa_permanencia` | int8 | 0 |
| `dias_perm_internacao_nova` | int32 | 0 |
| `qt_diarias_internacao_nova` | int32 | 0 |
| `valor_internacao_nova` | float64 | 0 |
| `valor_continuacao` | float64 | 0 |
| `fl_sem_diaria_faturada` | int8 | 0 |
| `fl_permanencia_zero` | int8 | 0 |
| `fl_sem_valor` | int8 | 0 |
| `fl_obito` | int8 | 0 |
| `fl_obito_internacao_nova` | int8 | 0 |
| `fl_aih_com_valor` | int8 | 0 |
| `fl_uti` | int8 | 0 |
| `_arquivo_fonte` | object | 0 |

## `fato_leitos_mensal`

15,533 linhas × 8 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `CNES` | string | 0 |
| `_ano` | int16 | 0 |
| `_mes` | int8 | 0 |
| `leitos_sus` | int32 | 0 |
| `leitos_totais` | int32 | 0 |
| `tipos_de_leito` | int64 | 0 |
| `dias_no_mes` | int64 | 0 |
| `capacidade_teorica_leito_dia` | int64 | 0 |

## `base_hospital_mes`

14,821 linhas × 32 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `CNES` | string | 0 |
| `_ano` | int16 | 0 |
| `_mes` | int8 | 0 |
| `aih_aprovadas` | int64 | 0 |
| `aih_distintas` | int64 | 0 |
| `internacoes_novas` | int64 | 0 |
| `continuacoes_longa_permanencia` | int64 | 0 |
| `qt_diarias_soma` | int32 | 0 |
| `qt_diarias_internacoes_novas_soma` | int32 | 0 |
| `dias_perm_soma` | int32 | 0 |
| `dias_perm_internacoes_novas_soma` | int32 | 0 |
| `obitos_aih` | int64 | 0 |
| `obitos_internacoes_novas` | int64 | 0 |
| `valor_total` | float64 | 0 |
| `valor_internacoes_novas` | float64 | 0 |
| `valor_continuacoes` | float64 | 0 |
| `aih_com_valor` | int64 | 0 |
| `registros_uti` | int64 | 0 |
| `leitos_sus` | int32 | 0 |
| `dias_no_mes` | int64 | 0 |
| `capacidade_teorica_leito_dia` | int64 | 0 |
| `municipio_cod6` | string | 0 |
| `hospital_nome_atual` | object | 0 |
| `regiao_saude` | string | 0 |
| `regiao_saude_nome` | object | 0 |
| `macrorregiao_saude_codigo` | string | 0 |
| `macrorregiao_saude_nome` | object | 0 |
| `origem_regiao` | object | 0 |
| `fl_regiao_nao_confiavel` | int8 | 0 |
| `permanencia_media_internacoes_novas` | float64 | 155 |
| `proxy_iph_diarias_faturadas` | float64 | 1 |
| `status_proxy_iph` | object | 0 |

## `base_hospital_espec_mes`

43,407 linhas × 25 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `CNES` | string | 0 |
| `ESPEC` | string | 0 |
| `especialidade` | object | 0 |
| `_ano` | int16 | 0 |
| `_mes` | int8 | 0 |
| `aih_aprovadas` | int64 | 0 |
| `aih_distintas` | int64 | 0 |
| `internacoes_novas` | int64 | 0 |
| `continuacoes_longa_permanencia` | int64 | 0 |
| `qt_diarias_soma` | int32 | 0 |
| `qt_diarias_internacoes_novas_soma` | int32 | 0 |
| `dias_perm_soma` | int32 | 0 |
| `dias_perm_internacoes_novas_soma` | int32 | 0 |
| `obitos_aih` | int64 | 0 |
| `obitos_internacoes_novas` | int64 | 0 |
| `valor_total` | float64 | 0 |
| `valor_internacoes_novas` | float64 | 0 |
| `valor_continuacoes` | float64 | 0 |
| `aih_com_valor` | int64 | 0 |
| `registros_uti` | int64 | 0 |
| `municipio_cod6` | string | 0 |
| `hospital_nome_atual` | object | 0 |
| `regiao_saude` | string | 0 |
| `regiao_saude_nome` | object | 0 |
| `origem_regiao` | object | 0 |

## `base_hospital_cid`

377,708 linhas × 11 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `CNES` | string | 0 |
| `regiao_saude` | string | 0 |
| `origem_regiao` | object | 0 |
| `cid_principal` | object | 0 |
| `capitulo` | object | 0 |
| `internacoes_novas` | int64 | 0 |
| `dias_perm_soma` | int32 | 0 |
| `qt_diarias_soma` | int32 | 0 |
| `obitos` | int64 | 0 |
| `valor_total` | float64 | 0 |
| `permanencia_media` | float64 | 0 |

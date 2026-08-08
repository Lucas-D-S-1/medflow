# Dicionário — bases curadas MedFlow

Gerado pelo notebook `01_engenharia_dados.ipynb`. Recorte: SP 2022–2023.

## `dim_tempo`

24 linhas × 8 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `_ano` | int64 | 0 |
| `_mes` | int64 | 0 |
| `dias_no_mes` | int64 | 0 |
| `competencia` | object | 0 |
| `data_ref` | datetime64[ns] | 0 |
| `trimestre` | int32 | 0 |
| `mes_nome` | object | 0 |
| `rotulo` | object | 0 |

## `dim_hospital`

669 linhas × 8 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `CNES` | object | 0 |
| `municipio_cod6` | object | 0 |
| `tipo_unidade` | object | 0 |
| `esfera` | object | 0 |
| `natureza_jur` | object | 0 |
| `gestao` | object | 0 |
| `regiao_saude` | object | 16 |
| `origem_regiao` | object | 0 |

## `dim_municipio`

364 linhas × 5 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `municipio_cod6` | object | 0 |
| `uf` | object | 0 |
| `regiao_saude` | object | 21 |
| `municipio_cod7` | object | 0 |
| `municipio_nome` | object | 0 |

## `dim_especialidade`

16 linhas × 5 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `ESPEC` | object | 0 |
| `internacoes` | int64 | 0 |
| `especialidade` | object | 0 |
| `mapeada` | int64 | 0 |
| `pct` | float64 | 0 |

## `dim_cid`

9,212 linhas × 5 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `DIAG_PRINC` | object | 0 |
| `internacoes` | int64 | 0 |
| `capitulo` | object | 0 |
| `capitulo_desc` | object | 0 |
| `categoria` | object | 0 |

## `fato_internacao`

5,210,357 linhas × 28 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `CNES` | object | 0 |
| `municipio_cod6` | object | 0 |
| `MUNIC_RES` | object | 0 |
| `regiao_saude` | object | 62,303 |
| `origem_regiao` | object | 0 |
| `_ano` | int64 | 0 |
| `_mes` | int64 | 0 |
| `dt_internacao` | datetime64[ns] | 0 |
| `dt_saida` | datetime64[ns] | 0 |
| `ESPEC` | object | 0 |
| `especialidade` | object | 0 |
| `cid_principal` | object | 0 |
| `cid_capitulo` | object | 0 |
| `cid_capitulo_desc` | object | 0 |
| `QT_DIARIAS` | int32 | 0 |
| `DIAS_PERM` | int32 | 0 |
| `MORTE` | int32 | 0 |
| `VAL_TOT` | float64 | 0 |
| `UTI_MES_TO` | int32 | 0 |
| `MARCA_UTI` | object | 0 |
| `IDADE` | int32 | 0 |
| `SEXO` | object | 0 |
| `CAR_INT` | object | 0 |
| `COMPLEX` | object | 0 |
| `fl_sem_diaria` | int8 | 0 |
| `fl_sem_valor` | int8 | 0 |
| `fl_obito_sem_val` | int8 | 0 |
| `fl_uti` | int8 | 0 |

## `fato_leitos_mensal`

15,533 linhas × 8 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `CNES` | object | 0 |
| `_ano` | int64 | 0 |
| `_mes` | int64 | 0 |
| `leitos_sus` | int64 | 0 |
| `leitos_totais` | int64 | 0 |
| `tipos_de_leito` | int64 | 0 |
| `dias_no_mes` | int64 | 0 |
| `denominador` | int64 | 0 |

## `base_hospital_mes`

14,821 linhas × 16 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `CNES` | object | 0 |
| `_ano` | int64 | 0 |
| `_mes` | int64 | 0 |
| `patient_days` | int32 | 0 |
| `internacoes` | int64 | 0 |
| `dias_perm_soma` | int32 | 0 |
| `obitos` | int32 | 0 |
| `valor_total` | float64 | 0 |
| `internacoes_uti` | int64 | 0 |
| `leitos_sus` | int64 | 0 |
| `dias_no_mes` | int64 | 0 |
| `denominador` | int64 | 0 |
| `municipio_cod6` | object | 0 |
| `regiao_saude` | object | 372 |
| `origem_regiao` | object | 0 |
| `permanencia_media` | float64 | 0 |

## `base_hospital_espec_mes`

43,407 linhas × 13 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `CNES` | object | 0 |
| `ESPEC` | object | 0 |
| `especialidade` | object | 0 |
| `_ano` | int64 | 0 |
| `_mes` | int64 | 0 |
| `internacoes` | int64 | 0 |
| `obitos` | int32 | 0 |
| `patient_days` | int32 | 0 |
| `valor_total` | float64 | 0 |
| `internacoes_com_valor` | int64 | 0 |
| `dias_perm_soma` | int32 | 0 |
| `municipio_cod6` | object | 0 |
| `regiao_saude` | object | 1,029 |

## `base_hospital_cid`

361,273 linhas × 9 colunas

| coluna | tipo | nulos |
|---|---|---:|
| `CNES` | object | 0 |
| `regiao_saude` | object | 0 |
| `cid_principal` | object | 0 |
| `cid_capitulo` | object | 0 |
| `internacoes` | int64 | 0 |
| `patient_days` | int32 | 0 |
| `obitos` | int32 | 0 |
| `valor_total` | float64 | 0 |
| `permanencia_media` | float64 | 0 |

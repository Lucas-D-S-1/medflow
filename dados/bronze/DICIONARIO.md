# Dicionário da camada Bronze — MedFlow

Contrato de esquema `0.2.0`, gerado automaticamente em `2026-07-29T23:19:04.877755+00:00`.

## Responsabilidade da camada

- Arquivos de origem são imutáveis e preservados no formato recebido.
- DBF é cache técnico intermediário; Parquet é serialização fiel e reproduzível.
- Não há filtro analítico, imputação, de/para ou regra de negócio.

## `sih_rd_sp_2024_2026`

Registros SIH/RD preservados com linhagem técnica.

- Caminho: `dados/bronze/parquet/sih_rd_sp_2024_2026.parquet`
- Grão: uma linha conforme o registro original da fonte mensal
- Linhas: 7,034,961
- Chave lógica: sem unicidade assumida; usar o identificador da fonte e a competência

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `UF_ZI` | `string` | não materializado | Campo `UF_ZI` preservado conforme o leiaute original da fonte. |
| `ANO_CMPT` | `string` | não materializado | Campo `ANO_CMPT` preservado conforme o leiaute original da fonte. |
| `MES_CMPT` | `string` | não materializado | Campo `MES_CMPT` preservado conforme o leiaute original da fonte. |
| `ESPEC` | `string` | não materializado | Campo `ESPEC` preservado conforme o leiaute original da fonte. |
| `CGC_HOSP` | `string` | não materializado | Campo `CGC_HOSP` preservado conforme o leiaute original da fonte. |
| `N_AIH` | `string` | não materializado | Campo `N_AIH` preservado conforme o leiaute original da fonte. |
| `IDENT` | `string` | não materializado | Campo `IDENT` preservado conforme o leiaute original da fonte. |
| `CEP` | `string` | não materializado | Campo `CEP` preservado conforme o leiaute original da fonte. |
| `MUNIC_RES` | `string` | não materializado | Campo `MUNIC_RES` preservado conforme o leiaute original da fonte. |
| `NASC` | `string` | não materializado | Campo `NASC` preservado conforme o leiaute original da fonte. |
| `SEXO` | `string` | não materializado | Campo `SEXO` preservado conforme o leiaute original da fonte. |
| `UTI_MES_IN` | `int64` | não materializado | Campo `UTI_MES_IN` preservado conforme o leiaute original da fonte. |
| `UTI_MES_AN` | `int64` | não materializado | Campo `UTI_MES_AN` preservado conforme o leiaute original da fonte. |
| `UTI_MES_AL` | `int64` | não materializado | Campo `UTI_MES_AL` preservado conforme o leiaute original da fonte. |
| `UTI_MES_TO` | `int64` | não materializado | Campo `UTI_MES_TO` preservado conforme o leiaute original da fonte. |
| `MARCA_UTI` | `string` | não materializado | Campo `MARCA_UTI` preservado conforme o leiaute original da fonte. |
| `UTI_INT_IN` | `int64` | não materializado | Campo `UTI_INT_IN` preservado conforme o leiaute original da fonte. |
| `UTI_INT_AN` | `int64` | não materializado | Campo `UTI_INT_AN` preservado conforme o leiaute original da fonte. |
| `UTI_INT_AL` | `int64` | não materializado | Campo `UTI_INT_AL` preservado conforme o leiaute original da fonte. |
| `UTI_INT_TO` | `int64` | não materializado | Campo `UTI_INT_TO` preservado conforme o leiaute original da fonte. |
| `DIAR_ACOM` | `int64` | não materializado | Campo `DIAR_ACOM` preservado conforme o leiaute original da fonte. |
| `QT_DIARIAS` | `int64` | não materializado | Campo `QT_DIARIAS` preservado conforme o leiaute original da fonte. |
| `PROC_SOLIC` | `string` | não materializado | Campo `PROC_SOLIC` preservado conforme o leiaute original da fonte. |
| `PROC_REA` | `string` | não materializado | Campo `PROC_REA` preservado conforme o leiaute original da fonte. |
| `VAL_SH` | `double` | não materializado | Campo `VAL_SH` preservado conforme o leiaute original da fonte. |
| `VAL_SP` | `double` | não materializado | Campo `VAL_SP` preservado conforme o leiaute original da fonte. |
| `VAL_SADT` | `double` | não materializado | Campo `VAL_SADT` preservado conforme o leiaute original da fonte. |
| `VAL_RN` | `double` | não materializado | Campo `VAL_RN` preservado conforme o leiaute original da fonte. |
| `VAL_ACOMP` | `double` | não materializado | Campo `VAL_ACOMP` preservado conforme o leiaute original da fonte. |
| `VAL_ORTP` | `double` | não materializado | Campo `VAL_ORTP` preservado conforme o leiaute original da fonte. |
| `VAL_SANGUE` | `double` | não materializado | Campo `VAL_SANGUE` preservado conforme o leiaute original da fonte. |
| `VAL_SADTSR` | `double` | não materializado | Campo `VAL_SADTSR` preservado conforme o leiaute original da fonte. |
| `VAL_TRANSP` | `double` | não materializado | Campo `VAL_TRANSP` preservado conforme o leiaute original da fonte. |
| `VAL_OBSANG` | `double` | não materializado | Campo `VAL_OBSANG` preservado conforme o leiaute original da fonte. |
| `VAL_PED1AC` | `double` | não materializado | Campo `VAL_PED1AC` preservado conforme o leiaute original da fonte. |
| `VAL_TOT` | `double` | não materializado | Campo `VAL_TOT` preservado conforme o leiaute original da fonte. |
| `VAL_UTI` | `double` | não materializado | Campo `VAL_UTI` preservado conforme o leiaute original da fonte. |
| `US_TOT` | `double` | não materializado | Campo `US_TOT` preservado conforme o leiaute original da fonte. |
| `DT_INTER` | `string` | não materializado | Campo `DT_INTER` preservado conforme o leiaute original da fonte. |
| `DT_SAIDA` | `string` | não materializado | Campo `DT_SAIDA` preservado conforme o leiaute original da fonte. |
| `DIAG_PRINC` | `string` | não materializado | Campo `DIAG_PRINC` preservado conforme o leiaute original da fonte. |
| `DIAG_SECUN` | `string` | não materializado | Campo `DIAG_SECUN` preservado conforme o leiaute original da fonte. |
| `COBRANCA` | `string` | não materializado | Campo `COBRANCA` preservado conforme o leiaute original da fonte. |
| `NATUREZA` | `string` | não materializado | Campo `NATUREZA` preservado conforme o leiaute original da fonte. |
| `NAT_JUR` | `string` | não materializado | Campo `NAT_JUR` preservado conforme o leiaute original da fonte. |
| `GESTAO` | `string` | não materializado | Campo `GESTAO` preservado conforme o leiaute original da fonte. |
| `RUBRICA` | `int64` | não materializado | Campo `RUBRICA` preservado conforme o leiaute original da fonte. |
| `IND_VDRL` | `string` | não materializado | Campo `IND_VDRL` preservado conforme o leiaute original da fonte. |
| `MUNIC_MOV` | `string` | não materializado | Campo `MUNIC_MOV` preservado conforme o leiaute original da fonte. |
| `COD_IDADE` | `string` | não materializado | Campo `COD_IDADE` preservado conforme o leiaute original da fonte. |
| `IDADE` | `int64` | não materializado | Campo `IDADE` preservado conforme o leiaute original da fonte. |
| `DIAS_PERM` | `int64` | não materializado | Campo `DIAS_PERM` preservado conforme o leiaute original da fonte. |
| `MORTE` | `int64` | não materializado | Campo `MORTE` preservado conforme o leiaute original da fonte. |
| `NACIONAL` | `string` | não materializado | Campo `NACIONAL` preservado conforme o leiaute original da fonte. |
| `NUM_PROC` | `string` | não materializado | Campo `NUM_PROC` preservado conforme o leiaute original da fonte. |
| `CAR_INT` | `string` | não materializado | Campo `CAR_INT` preservado conforme o leiaute original da fonte. |
| `TOT_PT_SP` | `int64` | não materializado | Campo `TOT_PT_SP` preservado conforme o leiaute original da fonte. |
| `CPF_AUT` | `string` | não materializado | Campo `CPF_AUT` preservado conforme o leiaute original da fonte. |
| `HOMONIMO` | `string` | não materializado | Campo `HOMONIMO` preservado conforme o leiaute original da fonte. |
| `NUM_FILHOS` | `int64` | não materializado | Campo `NUM_FILHOS` preservado conforme o leiaute original da fonte. |
| `INSTRU` | `string` | não materializado | Campo `INSTRU` preservado conforme o leiaute original da fonte. |
| `CID_NOTIF` | `string` | não materializado | Campo `CID_NOTIF` preservado conforme o leiaute original da fonte. |
| `CONTRACEP1` | `string` | não materializado | Campo `CONTRACEP1` preservado conforme o leiaute original da fonte. |
| `CONTRACEP2` | `string` | não materializado | Campo `CONTRACEP2` preservado conforme o leiaute original da fonte. |
| `GESTRISCO` | `string` | não materializado | Campo `GESTRISCO` preservado conforme o leiaute original da fonte. |
| `INSC_PN` | `string` | não materializado | Campo `INSC_PN` preservado conforme o leiaute original da fonte. |
| `SEQ_AIH5` | `string` | não materializado | Campo `SEQ_AIH5` preservado conforme o leiaute original da fonte. |
| `CBOR` | `string` | não materializado | Campo `CBOR` preservado conforme o leiaute original da fonte. |
| `CNAER` | `string` | não materializado | Campo `CNAER` preservado conforme o leiaute original da fonte. |
| `VINCPREV` | `string` | não materializado | Campo `VINCPREV` preservado conforme o leiaute original da fonte. |
| `GESTOR_COD` | `string` | não materializado | Campo `GESTOR_COD` preservado conforme o leiaute original da fonte. |
| `GESTOR_TP` | `string` | não materializado | Campo `GESTOR_TP` preservado conforme o leiaute original da fonte. |
| `GESTOR_CPF` | `string` | não materializado | Campo `GESTOR_CPF` preservado conforme o leiaute original da fonte. |
| `GESTOR_DT` | `string` | não materializado | Campo `GESTOR_DT` preservado conforme o leiaute original da fonte. |
| `CNES` | `string` | não materializado | Campo `CNES` preservado conforme o leiaute original da fonte. |
| `CNPJ_MANT` | `string` | não materializado | Campo `CNPJ_MANT` preservado conforme o leiaute original da fonte. |
| `INFEHOSP` | `string` | não materializado | Campo `INFEHOSP` preservado conforme o leiaute original da fonte. |
| `CID_ASSO` | `string` | não materializado | Campo `CID_ASSO` preservado conforme o leiaute original da fonte. |
| `CID_MORTE` | `string` | não materializado | Campo `CID_MORTE` preservado conforme o leiaute original da fonte. |
| `COMPLEX` | `string` | não materializado | Campo `COMPLEX` preservado conforme o leiaute original da fonte. |
| `FINANC` | `string` | não materializado | Campo `FINANC` preservado conforme o leiaute original da fonte. |
| `FAEC_TP` | `string` | não materializado | Campo `FAEC_TP` preservado conforme o leiaute original da fonte. |
| `REGCT` | `string` | não materializado | Campo `REGCT` preservado conforme o leiaute original da fonte. |
| `RACA_COR` | `string` | não materializado | Campo `RACA_COR` preservado conforme o leiaute original da fonte. |
| `ETNIA` | `string` | não materializado | Campo `ETNIA` preservado conforme o leiaute original da fonte. |
| `SEQUENCIA` | `int64` | não materializado | Campo `SEQUENCIA` preservado conforme o leiaute original da fonte. |
| `REMESSA` | `string` | não materializado | Campo `REMESSA` preservado conforme o leiaute original da fonte. |
| `AUD_JUST` | `string` | não materializado | Campo `AUD_JUST` preservado conforme o leiaute original da fonte. |
| `SIS_JUST` | `string` | não materializado | Campo `SIS_JUST` preservado conforme o leiaute original da fonte. |
| `VAL_SH_FED` | `double` | não materializado | Campo `VAL_SH_FED` preservado conforme o leiaute original da fonte. |
| `VAL_SP_FED` | `double` | não materializado | Campo `VAL_SP_FED` preservado conforme o leiaute original da fonte. |
| `VAL_SH_GES` | `double` | não materializado | Campo `VAL_SH_GES` preservado conforme o leiaute original da fonte. |
| `VAL_SP_GES` | `double` | não materializado | Campo `VAL_SP_GES` preservado conforme o leiaute original da fonte. |
| `VAL_UCI` | `double` | não materializado | Campo `VAL_UCI` preservado conforme o leiaute original da fonte. |
| `MARCA_UCI` | `string` | não materializado | Campo `MARCA_UCI` preservado conforme o leiaute original da fonte. |
| `DIAGSEC1` | `string` | não materializado | Campo `DIAGSEC1` preservado conforme o leiaute original da fonte. |
| `DIAGSEC2` | `string` | não materializado | Campo `DIAGSEC2` preservado conforme o leiaute original da fonte. |
| `DIAGSEC3` | `string` | não materializado | Campo `DIAGSEC3` preservado conforme o leiaute original da fonte. |
| `DIAGSEC4` | `string` | não materializado | Campo `DIAGSEC4` preservado conforme o leiaute original da fonte. |
| `DIAGSEC5` | `string` | não materializado | Campo `DIAGSEC5` preservado conforme o leiaute original da fonte. |
| `DIAGSEC6` | `string` | não materializado | Campo `DIAGSEC6` preservado conforme o leiaute original da fonte. |
| `DIAGSEC7` | `string` | não materializado | Campo `DIAGSEC7` preservado conforme o leiaute original da fonte. |
| `DIAGSEC8` | `string` | não materializado | Campo `DIAGSEC8` preservado conforme o leiaute original da fonte. |
| `DIAGSEC9` | `string` | não materializado | Campo `DIAGSEC9` preservado conforme o leiaute original da fonte. |
| `TPDISEC1` | `string` | não materializado | Campo `TPDISEC1` preservado conforme o leiaute original da fonte. |
| `TPDISEC2` | `string` | não materializado | Campo `TPDISEC2` preservado conforme o leiaute original da fonte. |
| `TPDISEC3` | `string` | não materializado | Campo `TPDISEC3` preservado conforme o leiaute original da fonte. |
| `TPDISEC4` | `string` | não materializado | Campo `TPDISEC4` preservado conforme o leiaute original da fonte. |
| `TPDISEC5` | `string` | não materializado | Campo `TPDISEC5` preservado conforme o leiaute original da fonte. |
| `TPDISEC6` | `string` | não materializado | Campo `TPDISEC6` preservado conforme o leiaute original da fonte. |
| `TPDISEC7` | `string` | não materializado | Campo `TPDISEC7` preservado conforme o leiaute original da fonte. |
| `TPDISEC8` | `string` | não materializado | Campo `TPDISEC8` preservado conforme o leiaute original da fonte. |
| `TPDISEC9` | `string` | não materializado | Campo `TPDISEC9` preservado conforme o leiaute original da fonte. |
| `_arquivo_fonte` | `string` | não materializado | Campo `_arquivo_fonte` preservado conforme o leiaute original da fonte. |
| `_ano_arquivo` | `int64` | não materializado | Campo `_ano_arquivo` preservado conforme o leiaute original da fonte. |
| `_mes_arquivo` | `int64` | não materializado | Campo `_mes_arquivo` preservado conforme o leiaute original da fonte. |
| `FONTE_ORC` | `string` | não materializado | Campo `FONTE_ORC` preservado conforme o leiaute original da fonte. |

## `cnes_lt_sp_2024_2026`

Registros CNES/LT preservados com linhagem técnica.

- Caminho: `dados/bronze/parquet/cnes_lt_sp_2024_2026.parquet`
- Grão: uma linha conforme o registro original da fonte mensal
- Linhas: 243,085
- Chave lógica: sem unicidade assumida; usar o identificador da fonte e a competência

| coluna | tipo | nulos | significado |
|---|---|---:|---|
| `CNES` | `string` | não materializado | Campo `CNES` preservado conforme o leiaute original da fonte. |
| `CODUFMUN` | `string` | não materializado | Campo `CODUFMUN` preservado conforme o leiaute original da fonte. |
| `REGSAUDE` | `string` | não materializado | Campo `REGSAUDE` preservado conforme o leiaute original da fonte. |
| `MICR_REG` | `string` | não materializado | Campo `MICR_REG` preservado conforme o leiaute original da fonte. |
| `DISTRSAN` | `string` | não materializado | Campo `DISTRSAN` preservado conforme o leiaute original da fonte. |
| `DISTRADM` | `string` | não materializado | Campo `DISTRADM` preservado conforme o leiaute original da fonte. |
| `TPGESTAO` | `string` | não materializado | Campo `TPGESTAO` preservado conforme o leiaute original da fonte. |
| `PF_PJ` | `string` | não materializado | Campo `PF_PJ` preservado conforme o leiaute original da fonte. |
| `CPF_CNPJ` | `string` | não materializado | Campo `CPF_CNPJ` preservado conforme o leiaute original da fonte. |
| `NIV_DEP` | `string` | não materializado | Campo `NIV_DEP` preservado conforme o leiaute original da fonte. |
| `CNPJ_MAN` | `string` | não materializado | Campo `CNPJ_MAN` preservado conforme o leiaute original da fonte. |
| `ESFERA_A` | `string` | não materializado | Campo `ESFERA_A` preservado conforme o leiaute original da fonte. |
| `ATIVIDAD` | `string` | não materializado | Campo `ATIVIDAD` preservado conforme o leiaute original da fonte. |
| `RETENCAO` | `string` | não materializado | Campo `RETENCAO` preservado conforme o leiaute original da fonte. |
| `NATUREZA` | `string` | não materializado | Campo `NATUREZA` preservado conforme o leiaute original da fonte. |
| `CLIENTEL` | `string` | não materializado | Campo `CLIENTEL` preservado conforme o leiaute original da fonte. |
| `TP_UNID` | `string` | não materializado | Campo `TP_UNID` preservado conforme o leiaute original da fonte. |
| `TURNO_AT` | `string` | não materializado | Campo `TURNO_AT` preservado conforme o leiaute original da fonte. |
| `NIV_HIER` | `string` | não materializado | Campo `NIV_HIER` preservado conforme o leiaute original da fonte. |
| `TERCEIRO` | `string` | não materializado | Campo `TERCEIRO` preservado conforme o leiaute original da fonte. |
| `TP_LEITO` | `string` | não materializado | Campo `TP_LEITO` preservado conforme o leiaute original da fonte. |
| `CODLEITO` | `string` | não materializado | Campo `CODLEITO` preservado conforme o leiaute original da fonte. |
| `QT_EXIST` | `int64` | não materializado | Campo `QT_EXIST` preservado conforme o leiaute original da fonte. |
| `QT_CONTR` | `int64` | não materializado | Campo `QT_CONTR` preservado conforme o leiaute original da fonte. |
| `QT_SUS` | `int64` | não materializado | Campo `QT_SUS` preservado conforme o leiaute original da fonte. |
| `QT_NSUS` | `int64` | não materializado | Campo `QT_NSUS` preservado conforme o leiaute original da fonte. |
| `COMPETEN` | `string` | não materializado | Campo `COMPETEN` preservado conforme o leiaute original da fonte. |
| `NAT_JUR` | `string` | não materializado | Campo `NAT_JUR` preservado conforme o leiaute original da fonte. |
| `_arquivo_fonte` | `string` | não materializado | Campo `_arquivo_fonte` preservado conforme o leiaute original da fonte. |
| `_ano_arquivo` | `int64` | não materializado | Campo `_ano_arquivo` preservado conforme o leiaute original da fonte. |
| `_mes_arquivo` | `int64` | não materializado | Campo `_mes_arquivo` preservado conforme o leiaute original da fonte. |

## Ativos não tabulares

### `ibge`

Resposta original da API de municípios do IBGE.

- Caminho: `dados/bronze/origem/referencias/ibge_municipios_sp_raw.json`
- Fonte: https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios
- Formato: `json`

### `regioes_saude_ms`

Resposta original da API de regiões e macrorregiões de saúde.

- Caminho: `dados/bronze/origem/referencias/ms_regioes_saude_sp_raw.json`
- Fonte: https://apidadosabertos.saude.gov.br/macrorregiao-e-regiao-de-saude/municipio?sigla_uf=SP&limit=860&offset=0
- Formato: `json`

### `regioes_saude_ms_csv`

Pacote CSV oficial de regiões de saúde, população IBGE 2022 e municípios.

- Caminho: `dados/bronze/origem/referencias/macrorregiao_de_saude_csv.zip`
- Fonte: https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/dbgeral/macroregiao_de_saude_csv.zip
- Formato: `zip`

### `malha_municipal_ibge_2024`

Malha municipal oficial de São Paulo usada para formar as regiões do BI.

- Caminho: `dados/bronze/origem/referencias/geografia/SP_Municipios_2024.zip`
- Fonte: https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2024/UFs/SP/SP_Municipios_2024.zip
- Formato: `zip`

### `cid10_datasus`

Pacote original das tabelas CID-10 do DATASUS.

- Caminho: `dados/bronze/origem/referencias/datasus_cid10_2008.zip`
- Fonte: http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip
- Formato: `zip`

### `natureza_juridica_concla`

Página oficial da CONCLA usada para natureza jurídica.

- Caminho: `dados/bronze/origem/referencias/ibge_concla_natureza_juridica_2021.html`
- Fonte: https://concla.ibge.gov.br/documentacao/3051-concla/estrutura/natureza-juridica-2021.html
- Formato: `html`

### `cnes_estabelecimentos_atuais`

Respostas atuais da API CNES para os hospitais observados.

- Caminho: `dados/bronze/origem/referencias/ms_cnes_estabelecimentos_atuais_raw.json`
- Fonte: https://apidadosabertos.saude.gov.br/cnes/estabelecimentos/{cnes}
- Formato: `json`

# Geografia para o BI

Ativos derivados de fontes oficiais e ligados aos marts pela coluna `cd_regiao_saude`.

- Municípios: 645
- Regiões de saúde: 62
- Macrorregiões: 19
- População IBGE 2022: 44,411,238

## Fontes

- Malha municipal IBGE 2024: https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2024/UFs/SP/SP_Municipios_2024.zip
- Regiões e população: https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/dbgeral/macroregiao_de_saude_csv.zip

## Integridade

- SHA-256 da malha original: `92a54d06e6f5a9749368e522861b785eae8c797329c9fa09cbb1a0696319d8e3`
- SHA-256 do CSV original: `e27b30dd2c6c06f3f8c1d55795a3b9851946fdc62fcec0a6ca57e8f58cc7d774`
- 645/645 municípios associados sem imputação.
- 62/62 regiões com geometria válida.
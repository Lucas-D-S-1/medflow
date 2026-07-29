# Inventário de domínios — MedFlow Silver

| campo | códigos observados | códigos sem de/para | cobertura | status | fonte |
|---|---:|---|---:|---|---|
| `ESPEC` | 15 | nenhum | 100.0000% | mapeado | DATASUS/TabNet |
| `IDENT` | 2 | nenhum | 100.0000% | mapeado | DATASUS/TabNet |
| `COD_IDADE` | 5 | nenhum | 100.0000% | mapeado | Dicionário SIH |
| `SEXO` | 2 | nenhum | 100.0000% | mapeado | Dicionário SIH |
| `CAR_INT` | 6 | nenhum | 100.0000% | mapeado | Dicionário SIH |
| `COMPLEX` | 2 | nenhum | 100.0000% | mapeado | Dicionário SIH |
| `MARCA_UTI` | 14 | nenhum | 100.0000% | mapeado_multifonte | MS/DATASUS + CEM |
| `NAT_JUR` | 21 | nenhum | 100.0000% | mapeado | CONCLA/IBGE 2021 |

## Proveniência e limites temporais

- `NAT_JUR`: descrições da CONCLA/IBGE 2021; cobertura observada de 100%.
- `REGSAUDE`: código, nome e macrorregião da API oficial DEMAS/MS por município; cobertura de 100%.
- `DIAG_PRINC`: DATASUS CID-10 2008 complementado apenas para oito códigos posteriores, com fontes MS explícitas.
- Nome e esfera: API oficial CNES com 100% de cobertura, mas fotografia atual — não histórica.
- `ESFERA_A` do CNES/LT permanece preservado e vazio; não é preenchido retroativamente.
- `MARCA_UTI` 01: documentação oficial histórica; 99: dicionário confiável do Centro de Estudos da Metrópole.
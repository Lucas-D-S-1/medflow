# Contrato de nomenclatura dos dados

Versão `0.4.0`. Este contrato se aplica às camadas Silver e Gold. A Bronze
preserva os nomes originais para garantir fidelidade e rastreabilidade.

## Regras

- nomes em português, no singular e em `snake_case`;
- somente letras minúsculas, números e `_`;
- nomes claros e abreviações apenas quando o domínio as torna inequívocas;
- tabelas dimensionais usam `dim_`, fatos usam `fato_` e tabelas de consumo
  usam `mart_`;
- o mesmo conceito usa o mesmo nome em todas as tabelas;
- nomes físicos no Oracle podem ser exibidos em maiúsculas pelo catálogo, mas
  mantêm os mesmos termos e não usam identificadores entre aspas.

## Prefixos semânticos

| Prefixo | Uso | Exemplo |
|---|---|---|
| `id_` | identificador da ocorrência | `id_aih` |
| `cd_` | código de domínio ou cadastro | `cd_cnes` |
| `nm_` | nome próprio ou rótulo curto | `nm_hospital_atual` |
| `ds_` | descrição ou texto explicativo | `ds_tipo_aih` |
| `dt_` | data | `dt_internacao` |
| `nr_` | número sem caráter aditivo | `nr_ano_competencia` |
| `qt_` | quantidade aditiva | `qt_leito_sus` |
| `vl_` | valor monetário | `vl_total_aprovado_sus` |
| `pc_` | percentual ou taxa expressa em percentual | `pc_tmh` |
| `tx_` | taxa com base populacional ou unidade explícita no nome | `tx_icsap_residente_observada_por_10_mil` |
| `fl_` | indicador binário | `fl_obito` |
| `sg_` | sigla | `sg_uf` |
| `st_` | estado de processamento ou classificação | `st_amostra` |

## Compatibilidade

A migração entre o contrato `0.1.x` e `0.2.0` está registrada em
`contratos/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv`. Mudanças de nome, tipo,
granularidade ou caminho de tabela são incompatíveis e exigem incremento da
versão secundária ou principal do contrato.

## Referência acadêmica

As regras foram adaptadas das páginas 31–38 de
`00_fases/fase_2/capitulos/Cap 4 - Do Modelo ao Banco Projeto Físico
Relacional_RevFinal.pdf`. O conteúdo sobre dicionário de dados está nas páginas
57–60 do mesmo capítulo.

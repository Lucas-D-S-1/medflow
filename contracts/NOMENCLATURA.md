# Contrato de nomenclatura dos dados

Versão `0.5.0`. Este contrato se aplica às camadas Silver e Gold. A Bronze
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

A origem de cada coluna da Silver está em
[`dados/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv`](dados/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv).
Mudanças de nome, tipo,
granularidade ou caminho de tabela são incompatíveis e exigem incremento da
versão secundária ou principal do contrato.

## Origem das regras

As convenções seguem a prática usual de modelagem dimensional para projeto
físico relacional: prefixo semântico no nome da coluna, `snake_case`, e o mesmo
conceito com o mesmo nome em todas as tabelas.

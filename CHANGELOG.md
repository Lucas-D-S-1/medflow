# Changelog

## 0.3.0 — em andamento

### Adicionado

- diretório `oracle/` com o setup reproduzível do Autonomous AI Database,
  sem segredos versionados;
- `sql/01_criar_usuario_medflow.sql`: esquema de aplicação `MEDFLOW` separado
  do `ADMIN`, com `DWROLE`, quota e acesso ao Database Actions;
- `sql/02_criar_tabelas_gold.sql`: modelo dimensional com 2 dimensões e 5
  marts, chaves primárias, estrangeiras, índices e as 118 colunas comentadas;
- `carregar_gold.py`: carga idempotente de 521.116 linhas em ordem de
  dependência, com `--conferir` e `--somente`;
- `sql/03_validar_carga.sql`: reconciliação de 25 métricas contra o contrato
  `0.2.0`, mais três verificações de integridade;
- `sql/04_select_ai.sql`: Resource Principal OCI, profile, três perguntas da
  demonstração e o SQL de referência de cada uma;
- `oracle/VALIDACAO_ORACLE_SELECT_AI.md`: evidências da conexão, carga,
  reconciliação, rankings e respostas do Select AI.

### Alterado

- `.env.example` passa a apontar para o usuário `MEDFLOW`, não `ADMIN`, e
  documenta os aliases do workload Lakehouse;
- `requirements.txt` inclui `pandas`, `pyarrow` e `python-dotenv`, necessários
  à carga e ao uso seguro do `.env`;
- `README.md` do `oracle/` virou runbook de seis passos com os riscos de
  Always Free e de disponibilidade do Select AI;
- comentários de negócio e perguntas do Select AI explicitam os cortes de
  100 hospital-mês e 10 combinações hospital-CID.

### Validado em 01/08/2026

- conexão mTLS como `MEDFLOW`;
- 7 tabelas, 118 colunas comentadas e 7 índices secundários;
- 521.116 linhas carregadas e conferidas;
- 25/25 métricas `ok` e verificações de integridade vazias;
- OCI Generative AI ativo em GRU com três `showsql` e `narrate` validados.

## 0.2.0 — publicado em 29/07/2026

### Adicionado

- camada Gold com TMH, IPR, IS, CMI e IPH estimado;
- população IBGE 2022 por município e região;
- GeoJSON e TopoJSON das 62 regiões de saúde;
- contratos JSON e dicionários gerados para Bronze, Silver e Gold;
- validação integrada de esquema, fórmulas, hashes e geografia.

### Alterado

- Bronze separada entre origem imutável, DBF intermediário e Parquet;
- Silver restrita a dimensões e fatos;
- nomes Silver padronizados em `snake_case` com prefixos semânticos;
- `fato_leitos_mensal` renomeada para `fato_leito_mensal`;
- caminhos de notebooks executados, figuras e referências reorganizados.

### Incompatibilidades

- consumidores da Silver `0.1.x` precisam aplicar
  `contratos/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv`;
- tabelas `base_hospital_*` não existem mais na Silver;
- artefatos de 2022–2023 ficam somente em `dados/legado/`;
- o proxy baseado em `QT_DIARIAS` não alimenta o IPH Gold.

## 0.1.0 — 29/07/2026

- pipeline Bronze/Silver reproduzível para 2024-01 a 2026-05;
- domínios, qualidade e batch mensal validados;
- primeira publicação pública do MedFlow.

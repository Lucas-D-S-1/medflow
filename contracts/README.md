# `contracts/` — o que este projeto promete

**O quê.** Os contratos que o resto do repositório tem de honrar: o das três
camadas de dados, o da API e o de nomenclatura.

**Por quê.** Contrato aqui não é documentação: é coisa que um teste confere. Um
contrato que ninguém verifica vira só mais uma versão da verdade, e a pior
delas, porque parece autoridade.

| Arquivo | O que promete | Quem confere |
|---|---|---|
| `dados/bronze.json`, `silver.json`, `gold.json` | esquema, linhas e descrição de cada coluna | `tests/test_contratos_camadas.py` |
| `dados/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv` | de onde veio cada coluna da Silver | revisão |
| `openapi.yaml` | os 10 endpoints: parâmetros, envelope, itens e erros | `tests/test_openapi.py` |
| `NOMENCLATURA.md` | prefixos semânticos e `snake_case` | `validar.py` |

## Os inventários de migração saíram em 25/08/2026

`INVENTARIO_PRE_MIGRACAO.json` e `INVENTARIO_PRE_REORG.json` congelavam o
estado de julho e o da fatia 0 para provar que as migrações daquele período não
perderam arquivo. As duas migrações terminaram, e a revisão de requisitos manda
regenerar o recorte de 2022-2023 em vez de conservá-lo, então a conferência de
preservação por SHA-256 deixou de existir em `validar.py`.

`medflow inventario` continua gerando um inventário sob demanda, agora em
`contracts/INVENTARIO.json`, que é gitignored por ser artefato de execução. A
proveniência do estado anterior segue no histórico do Git e na tag
`pre-reorg`.

## O contrato da API descreve o observável

`openapi.yaml` documenta o que a API devolve **hoje**, não o que seria
desejável. Inclusive onde o comportamento é discutível, como o 404 com HTML
em parâmetro inválido. O motivo está no próprio arquivo: um contrato que
descreve a intenção faz quem o lê parar de conferir.

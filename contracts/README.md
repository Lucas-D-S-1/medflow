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
| `openapi.yaml` | os 10 GET analíticos e o POST governado do assistente: parâmetros, envelope, itens e erros | `tests/test_openapi.py` |
| `NOMENCLATURA.md` | prefixos semânticos e `snake_case` | `validar.py` |

## O inventário é gerado sob demanda

`medflow inventario` escreve `contracts/INVENTARIO.json`, que fica fora do
índice por ser artefato de execução: ele descreve a árvore no momento em que
rodou, e não uma promessa que alguém deva honrar.

## O contrato da API descreve o observável

`openapi.yaml` documenta o que a API devolve **hoje**, não o que seria
desejável. Inclusive onde o comportamento é discutível, como o 404 com HTML
em parâmetro inválido. O motivo está no próprio arquivo: um contrato que
descreve a intenção faz quem o lê parar de conferir.

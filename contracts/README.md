# `contracts/` — o que este projeto promete

**O quê.** Os contratos que o resto do repositório tem de honrar: o das três
camadas de dados, o da API, o de nomenclatura e os inventários que provam que
nada se perdeu nas migrações.

**Por quê.** Contrato aqui não é documentação: é coisa que um teste confere. Um
contrato que ninguém verifica vira só mais uma versão da verdade, e a pior
delas, porque parece autoridade.

| Arquivo | O que promete | Quem confere |
|---|---|---|
| `dados/bronze.json`, `silver.json`, `gold.json` | esquema, linhas e descrição de cada coluna | `tests/test_contratos_camadas.py` |
| `dados/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv` | de onde veio cada coluna da Silver | revisão |
| `openapi.yaml` | os 10 endpoints: parâmetros, envelope, itens e erros | `tests/test_openapi.py` |
| `NOMENCLATURA.md` | prefixos semânticos e `snake_case` | `validar.py` |
| `INVENTARIO_PRE_MIGRACAO.json` | SHA-256 do estado de 29/07/2026 | `validar.py` |
| `INVENTARIO_PRE_REORG.json` | SHA-256 do estado de 08/08/2026, antes da reorganização | `medflow inventario` |

## Os dois inventários são marcos, não backups

Cada um congela um estado que uma mudança grande ia atravessar, para que a
mudança pudesse ser provada em vez de acreditada. O de julho antecede a
migração de pastas; o da fatia 0 antecede a saída do pipeline dos notebooks, e
foi o portão da fatia 4: os parquets tinham de sair com o mesmo hash.

A distinção que a validação faz importa: só o que o pipeline **não regenera**
entra na conferência. As saídas mudam legitimamente quando o recorte avança, e
compará-las contra um inventário antigo produziria uma falha permanente que
ninguém mais olharia.

## O contrato da API descreve o observável

`openapi.yaml` documenta o que a API devolve **hoje**, não o que seria
desejável. Inclusive onde o comportamento é discutível, como o 404 com HTML
em parâmetro inválido. O motivo está no próprio arquivo: um contrato que
descreve a intenção faz quem o lê parar de conferir.

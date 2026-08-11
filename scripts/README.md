# `scripts/` — utilitários que não são pipeline

**O quê.** Duas ferramentas de manutenção que não pertencem ao pacote porque
não produzem dado: elas mantêm artefatos derivados em dia com o que o pipeline
já produziu.

| Script | O que faz | Quando rodar |
|---|---|---|
| `atualizar_esperados_sql.py` | regenera os valores esperados de `db/schema/03_validar_carga.sql` a partir dos metadados | depois que o recorte avança |
| `reancorar_fixtures.py` | sincroniza o carimbo da Gold nos snapshots do webapp | depois de reexecutar a Gold sem recarregar o Oracle |

O gerador de snapshots propriamente dito é `web/scripts/gerar-mocks.ts`
(`make fixtures`), porque precisa falar com a API.

## Por que o `atualizar_esperados_sql.py` exige `--conferir` antes

Ele **abençoa o estado do banco**: pega o que o banco devolve e grava como
esperado. Fazer isso sem uma conferência independente seria só carimbar — por
isso ele exige que `carregar_gold.py --conferir` tenha passado, que é a garantia
de que o banco reproduz a Gold linha a linha.

O arquivo SQL sempre prometeu, no próprio cabeçalho, que os esperados vinham
dos metadados. Eram literais, e quando o recorte avançou 20 das 36 linhas
saíram `DIVERGENTE` sem nada estar errado. Este script cumpre a promessa.

## A divisão entre reancorar e regerar

Reexecutar a Gold muda o carimbo `gerado_em_utc`, e há um teste que exige que o
snapshot declare de qual Gold veio. Se **só** o carimbo mudou, `make
fixtures-carimbo` resolve offline. Se o recorte avançou ou um contrato de
endpoint mudou, o conteúdo mudou junto e é `make fixtures`, que precisa do
Oracle no ar.

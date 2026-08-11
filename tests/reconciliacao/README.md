# Reconciliação: a API contra a Gold

Esta pasta responde uma pergunta só: **o que a API devolve é o que está na
Gold?** Não "parece", não "bate na média" — é o mesmo dígito, na mesma ordem.

O caminho entre um número e a tela tem cinco elos: o parquet da Gold, a carga
no Oracle, a tabela, a view de projeção, o handler ORDS. Cada elo é uma chance
de perder precisão, trocar coluna ou reordenar. Os testes de contrato provam
que o parquet obedece ao contrato; a Playwright prova que a tela mostra o que a
API mandou. O meio ficava sem prova — é este pacote.

## Rodando

```bash
make reconciliar             # amostra: alguns recortes por endpoint, segundos
make reconciliar-completo    # tudo, campo a campo: minutos
```

Os dois precisam do Oracle no ar e de `ORDS_BASE_URL` no ambiente (os alvos do
Makefile já carregam o `.env`). Sem isso os testes **se pulam**, não falham: a
CI não tem wallet e não deve ter.

Parte dos testes não usa rede nenhuma e roda sempre, inclusive na CI — é a que
verifica a extração do SQL. Um regex que deixou de casar produziria um mapa de
campos vazio, e um mapa vazio compara zero campos e passa. Essa falha é pior
que uma divergência, porque parece sucesso.

## Por que quase nada está escrito aqui

Três fatos são necessários para comparar, e os três já existem no `db/`:

| Fato | Fonte | Lido por |
|---|---|---|
| nome JSON → coluna da Gold | `db/ords/03_modulo_medflow_dev.sql` | `fontes.py` |
| ordenação de cada handler | o `order by` do mesmo arquivo | `fontes.py` |
| escala decimal de cada número | `db/schema/02_criar_tabelas_gold.sql` | `fontes.py` |

São cerca de 150 campos. Uma cópia deles em Python divergiria do banco na
primeira alteração de handler, e a reconciliação passaria a comparar a API com
uma expectativa velha — exatamente o defeito que ela existe para achar. O que
este pacote acrescenta é só o que não está no SQL: de qual mart vem cada
endpoint e como enumerar os recortes (`plano.py`).

## As decisões que não são óbvias

**A comparação é posicional.** O handler declara um `order by`, e a ordem faz
parte do contrato — o webapp mostra "os 10 maiores". Comparar por chave
esconderia uma ordenação errada, que é um defeito real e invisível.

**A comparação é exata, sem tolerância.** O Oracle guarda cada número com
escala declarada na DDL; a Gold arredondada para essa escala tem de dar o mesmo
dígito. Tolerância aqui só serviria para esconder erro de conversão. O
arredondamento é meio-para-cima, como o do Oracle, e não o meio-para-par do
Python: `round(2.5)` é 2 em Python e 3 no banco.

**Três conexões, nunca mais.** O ORDS devolve 429 em varredura e a Always Free
não tem folga. O cliente segura um semáforo de três permissões, recua
exponencialmente com jitter e respeita `Retry-After`. Na varredura completa os
recuos acontecem às dezenas e são absorvidos — é para isso que existem.

**A amostra é espalhada, não os primeiros N.** Pegar o começo da lista olharia
sempre janeiro de 2024 e nunca a competência que o produto exibe, que é
justamente a que quebra quando o recorte avança.

## Arquivos

| Arquivo | Papel |
|---|---|
| `fontes.py` | extrai do SQL o mapa de campos, a ordenação, o teto de paginação e as escalas |
| `cliente.py` | cliente ORDS paginado, com o freio de três conexões |
| `plano.py` | de qual mart vem cada endpoint, como enumerar recortes, e o comparador |
| `test_reconciliacao.py` | os dois modos, mais o que roda sem rede |

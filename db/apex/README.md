# A demonstração de Select AI no APEX

Uma página onde alguém digita a pergunta em português e vê três coisas: a
tabela que voltou do banco, o SQL que o modelo escreveu, e a resposta narrada.
Quando o modelo escorrega no vocabulário, um aviso aparece na própria tela.

Isto é peça de demonstração, não produto. A decisão registrada em
[`../../ARQUITETURA.md`](../../ARQUITETURA.md) é que o Select AI não vira chat
público: as telas do MedFlow usam consultas determinísticas sobre a Gold. O
que esta página faz é mostrar a capacidade do Oracle com as mesmas garantias
que o resto do projeto aplica.

## O que já existe e o que falta

O APEX **já vem instalado** no Autonomous Database — 26.1.3 nesta instância.
Não há o que provisionar nem o que pagar. Faltam duas coisas: um workspace
apontando para o schema `MEDFLOW`, e a aplicação.

## Parte 1 — o workspace, uma vez só

Precisa de `ADMIN`: criar workspace exige `APEX_ADMINISTRATOR_ROLE`, e o
usuário `MEDFLOW` tem `CONNECT`, `RESOURCE` e `DWROLE`.

1. Console OCI → o banco `MEDFLOW` → **Database Actions** → entrar como `ADMIN`.
2. Abrir **SQL**.
3. Abrir [`01_criar_workspace.sql`](01_criar_workspace.sql), **trocar a senha**
   marcada no arquivo, colar e executar como script.

Depois, entrar no App Builder:

```
https://gf68e03b2a30d55-medflow.adb.sa-saopaulo-1.oraclecloudapps.com/ords/apex

workspace: MEDFLOW_DEMO
usuário:   MEDFLOW_DEV
```

## Parte 2 — o backend, já instalado

[`02_pacote_select_ai.sql`](02_pacote_select_ai.sql) já está no banco. Ele
guarda toda a regra, pelo mesmo motivo que nenhum indicador é calculado no
front do MedFlow: garantia que mora na tela vale só naquela tela.

| Chamada | Devolve |
|---|---|
| `medflow_select_ai.responder(pergunta)` | faz **uma** rodada de modelo, grava a linha, devolve o `id` |
| `medflow_select_ai.sql_da_resposta(id)` | o SQL gerado, já passado pelo guarda de leitura |
| `medflow_select_ai.narrativa_da_resposta(id)` | a resposta narrada |
| `medflow_select_ai.aviso_da_resposta(id)` | o aviso, ou nulo se estiver tudo certo |

Uma pergunta, uma rodada. Se cada região chamasse o modelo por conta própria,
o relatório e o texto ao lado poderiam descrever consultas diferentes na mesma
tela — numa demonstração ao vivo, é o tipo de coisa que ninguém percebe na hora
e não dá para explicar depois.

Para reinstalar depois de mexer no pacote:

```bash
.venv/bin/python -m dotenv -f .env run -- \
  .venv/bin/python src/medflow/oracle/executar_sql.py db/apex/02_pacote_select_ai.sql
```

## Parte 3 — a página, no App Builder

Nenhum passo abaixo escreve código: o pacote já fez essa parte.

**Criar a aplicação.** App Builder → *Create* → *New Application* → nome
`MedFlow — Select AI` → *Create Application*.

**Criar a página.** *Create Page* → *Blank Page* → nome `Pergunte à Gold`.

**O formulário.** Na página, criar uma região *Static Content* chamada
`Pergunta` e, dentro dela:

| Item | Tipo | Configuração |
|---|---|---|
| `P1_PERGUNTA` | Textarea | *Label* `Pergunta em português`, largura 100% |
| `P1_ID` | Hidden | *Value Protected* = **Off** |

Um botão `PERGUNTAR`, *Action* = *Submit Page*.

**O processo.** *Processing* → *Create Process* → tipo *Execute Code*, nome
`Responder`, *Server-side Condition* = *When Button Pressed* = `PERGUNTAR`:

```plsql
:P1_ID := medflow_select_ai.responder(:P1_PERGUNTA);
```

**A região do aviso.** *Static Content*, título `Atenção`, e no corpo:

```
&P1_AVISO.
```

Criar `P1_AVISO` como item *Display Only*, *Source* = *SQL Query (return single
value)*:

```sql
select medflow_select_ai.aviso_da_resposta(:P1_ID) from dual
```

E na região do aviso, *Server-side Condition* = *Item is NOT NULL* =
`P1_AVISO`. Assim ela só aparece quando há o que avisar.

**A região da tabela.** *Create Region* → tipo *Classic Report* → *Source* →
*Type* = **SQL Query (Function Body returning SQL Query)**:

```plsql
return medflow_select_ai.sql_da_resposta(:P1_ID);
```

Marcar *Use Generic Column Names* = **On**: as colunas mudam a cada pergunta.

**A região do SQL gerado.** *Static Content*, título `O SQL que o modelo
escreveu`, colapsável, com um item *Display Only* `P1_SQL` cuja *Source* é
*SQL Query (return single value)*:

```sql
select medflow_select_ai.sql_da_resposta(:P1_ID) from dual
```

**A região da narrativa.** Mesma receita, item `P1_NARRATIVA`:

```sql
select medflow_select_ai.narrativa_da_resposta(:P1_ID) from dual
```

## Duas perguntas para testar

Depois de montar, vale rodar estas duas — elas mostram os dois lados:

1. `quais as cinco regioes de saude com maior indice de pressao hospitalar
   medio em 2026` — deve trazer `LIMEIRA` no topo, sem aviso.
2. `qual a taxa de ocupacao de leitos de cada regiao em 2026` — é a armadilha.
   O modelo escolhe a coluna certa, o IPH, e apelida a coluna de
   `taxa_ocupacao_leitos`, que vira cabeçalho na tela. O aviso precisa
   aparecer dizendo exatamente isso.

A segunda é a mais importante para a banca: mostra que o produto sabe onde o
modelo erra, em vez de torcer para ninguém perguntar.

## O rastro

Cada pergunta grava uma linha em `select_ai_resposta` — quando, o que foi
perguntado, o SQL, a narrativa e o aviso. Não faz parte do contrato da Gold,
não entra na carga nem na reconciliação.

```sql
select id, momento, pergunta, aviso from select_ai_resposta order by id desc;
```

## Onde a regra é testada

`tests/test_select_ai.py` cobre o guarda de leitura e a varredura das duas
implementações — Python e PL/SQL — e **compara as duas**. A regra vive em dois
lugares, e regra duplicada é regra que diverge em silêncio: a divergência
apareceria como o APEX aceitando o que o roteiro recusa. Os testes de paridade
pulam sem Oracle, não falham.

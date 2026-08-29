# FlowIA — o resultado consolidado de 29/08/2026

`AVALIACAO_FLOWIA.md` é sempre a **última execução**, e não o estado atual: cada
rodada sobrescreve o arquivo. Em 29/08 houve mais de uma, e a última rodada
completa ficou congelada em 11/20 antes das correções que vieram depois. Esta
página existe para que ninguém leia aquele número como o estado do produto.

## O que os 20 casos dizem hoje

**20 de 20**, montados em quatro execuções do mesmo dia. Cada caso aparece aqui
com a rodada que produziu seu veredito final.

| Rodada | Casos | Resultado | Arquivo |
|---|---|---|---|
| 13:52 | os 20 | 11/20 | `AVALIACAO_FLOWIA.md` |
| depois das regras 15–21 | 9 que falhavam | 5/9 | `..._PARCIAL_F03-F04-F05-F06-F08-F09-F15-F17-F20.md` |
| depois do envelope e da regra 16 | F03 F05 F08 F17 | 2/4 | `..._PARCIAL_F03-F05-F08-F17.md` |
| depois da regra 17 e do rótulo | F05 F08 | 2/2 | `..._PARCIAL_F05-F08.md` |
| regressão | os 11 que já passavam | 11/11 | `..._PARCIAL_F01-F02-...-F19.md` |

A rodada de regressão é a que impede a leitura otimista: as regras novas podiam
ter quebrado o que já funcionava, e **quebraram uma vez** — a regra 15, de
fluxo, sequestrou o caso de ICSAP, que passou a responder evasão. Por isso os
11 foram refeitos por último, depois de todas as mudanças.

## O que ainda não foi feito

**Uma rodada única dos 20.** A cota diária do Select AI é de 50 perguntas e
fechou em 50/50 em 29/08. Os 20 casos passam, mas nunca na mesma execução.
Refazer com `make` ou:

    .venv/bin/python -m dotenv -f .env run -- \
      .venv/bin/python scripts/avaliar_flowia.py

**O roteiro das cinco perguntas registradas** (`select-ai-revalidar`) não foi
reexecutado depois das regras novas. Elas mudam o prompt para todo mundo, então
as três perguntas fechadas podem ter mudado de resposta. Rodar antes de
apresentar.

## Os sete defeitos corrigidos

Os quatro primeiros já eram conhecidos de 28/08; os três últimos saíram desta
bateria. Todos vivem no prompt de `db/apex/02_pacote_select_ai.sql`, que é o
mesmo caminho da bateria e do site.

1. **Caixa alta** — comparava `'Sao Paulo'` com `SAO PAULO` e concluía ausência
   de dado. Regra 14: `UPPER` e `LIKE`.
2. **Ordem invertida** — ordenava sempre `DESC` e respondia "maior alta" a quem
   perguntou "maior queda". Regra 6.
3. **Mês truncado** — trazia só a competência final e dizia que a outra não
   existia. Regra 6.
4. **Buffer do prompt** — `varchar2(4000)` estourava só com o texto fixo das
   regras. Passou para `32767`.
5. **Corte de amostra ausente** — ranking de média subia ao topo unidades com
   uma internação no mês. Regra 16 exige `ST_AMOSTRA = 'suficiente'`.
6. **ICSAP confundido com evasão** — "a atenção básica não está segurando" caía
   em evasão intrastadual. Regra 17 separa os dois e fixa a taxa por 10 mil.
7. **Competência solta no ranking** — sem competência no contexto, o ranking
   percorria os 30 meses e devolvia o mesmo hospital cinco vezes, um por mês.
   Regra 22 fixa `MAX(CD_COMPETENCIA)`.

**O sétimo só apareceu no site**, não na bateria: a bateria sempre envia a
competência no contexto, e o widget envia `competencia=nao informada` enquanto a
página ainda carrega. Ver [[gotchas/flowia-bateria-nao-cobre-contexto-vazio]].

## Duas mudanças que não são de prompt

**O envelope de desculpa do Select AI.** Ele às vezes responde
`"Sorry, unfortunately a valid SELECT statement could not be generated ... Here
is some more information to help you further: SELECT ..."` — com o SQL inteiro
depois do marcador. O `limpar` não reconhecia isso e a consulta era descartada
como "não começa por SELECT". Agora o marcador é reconhecido, o SQL é extraído,
passa pela mesma guarda de somente leitura, e a resposta sai com um **aviso de
baixa confiança**. Era o que reprovava a pergunta de evasão.

**O rastro perdia a evidência.** Quando a guarda recusava, `sql_gerado` ficava
nulo e não restava nenhum vestígio do que o modelo tinha respondido —
diagnosticar exigia reproduzir a chamada e gastar cota. Agora os 200 primeiros
caracteres do bruto entram em `recusa`, junto do erro. `sql_gerado` continua
recebendo só SQL aprovado e executado.

## Uma nota sobre o verificador

`conferir_lideres_narrados` passou a comparar rótulos **ignorando espaços**. O
CNES grava `FUNDACAO FACULDADE DE MEDICINAHCFMUSP INST DE PSIQUIATRIA SP` com as
palavras coladas; o modelo separa ao escrever, e a comparação exata reprovava
uma narrativa correta — os cinco hospitais eram os certos, na ordem certa.

Isso afrouxa a conferência num ponto e só nesse: trocar um hospital por outro,
ou mudar a ordem, continua reprovando.

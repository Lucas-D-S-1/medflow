# APEX e o backend governado da FlowIA

Esta pasta contém a implementação Oracle da interface conversacional do
MedFlow. O pacote PL/SQL atende tanto o webapp publicado por ORDS quanto a
aplicação APEX. As duas interfaces compartilham geração, segurança, cota,
auditoria e narrativa.

## Arquitetura

```text
WebApp / APEX
      │ pergunta + contexto
      ▼
MEDFLOW_SELECT_AI.responder
      ├── intenção governada ──► SQL determinístico
      └── pergunta livre ──────► DBMS_CLOUD_AI.GENERATE
                                      │
                                      ▼
                          extrator + guarda de leitura
                                      │
                                      ▼
                               marts e views Gold
                                      │
                     ┌────────────────┴───────────────┐
                     ▼                                ▼
                narrativa                     SELECT_AI_RESPOSTA
```

A interface recebe um identificador de resposta. Tabela, narrativa, aviso e SQL
auditável são recuperados por esse mesmo ID, sem novas chamadas ao modelo.

## Artefatos

| Arquivo | Responsabilidade |
|---|---|
| `01_criar_workspace.sql` | associação opcional do workspace APEX ao schema `MEDFLOW` |
| `02_pacote_select_ai.sql` | tabelas de rastro e cota, pacote público e corpo da implementação |
| `03_estilo_apresentacao.css` | estilo da página APEX |
| `04_cabecalho_apresentacao.html` | introdução exibida pela página |
| `05_aplicacao_medflow_select_ai.sql` | export completo do App 100 |

O arquivo `05` é o artefato canônico da aplicação. Ele preserva a estrutura
da página e evita que uma montagem manual se torne uma segunda fonte.

## Contrato público do pacote

| Símbolo | Papel |
|---|---|
| `responder(pergunta, contexto)` | executa uma rodada, grava o rastro e devolve o ID |
| `json_da_resposta(id)` | resposta consumida pelo handler ORDS |
| `sql_da_resposta(id)` | SQL aprovado exibido sob demanda |
| `narrativa_da_resposta(id)` | narrativa vinculada ao resultado consultado |
| `aviso_da_resposta(id)` | ressalva metodológica |
| `perguntas_hoje` | uso observado da cota diária |

As funções auxiliares de limpeza, terminologia e guarda permanecem dentro do
corpo do pacote. A página não consegue contorná-las.

## Persistência e auditoria

`SELECT_AI_RESPOSTA` guarda uma linha por pergunta:

| Campo | Conteúdo |
|---|---|
| `MOMENTO` | instante da rodada |
| `PERGUNTA` | texto recebido |
| `CONTEXTO` | estado analítico limitado da tela |
| `SQL_GERADO` | consulta aprovada pelo guarda |
| `NARRATIVA` | explicação produzida a partir do resultado |
| `AVISO` | ressalva mostrada ao usuário |
| `RECUSA` | motivo da rejeição e amostra limitada do retorno bruto |

A tabela não pertence à Gold, não entra na carga analítica e não altera os
indicadores. `SELECT_AI_COTA` contabiliza tentativas por dia, inclusive falhas
anteriores ao rastro final, para que indisponibilidade externa não permita
repetição ilimitada.

## Guardas de execução

O SQL gerado é tratado como entrada hostil:

- somente `SELECT` e `WITH` de leitura são aceitos;
- comandos múltiplos, DDL, DML e blocos PL/SQL são recusados;
- a transação de validação é somente leitura;
- rankings e comparações mensais passam por verificações adicionais;
- termos que transformam IPH em ocupação real ou competência em tempo real
  geram aviso;
- aliases também são verificados, pois viram cabeçalhos no APEX;
- a pergunta é limitada e a cota diária é atômica.

`tests/test_select_ai.py` compara as implementações Python e PL/SQL dessas
regras. A paridade evita que o validador aprove um SQL que o backend recusaria,
ou o contrário.

## Interface APEX

O App 100 organiza a resposta na ordem de leitura do usuário:

1. pergunta;
2. narrativa;
3. resultado tabular;
4. aviso metodológico, quando existe;
5. SQL gerado, colapsado;
6. identificador do rastro.

O APEX não contém regra de indicador nem lógica de geração. Seu processo chama
`responder` uma vez e as regiões seguintes consultam o ID devolvido.

## Limites medidos

- Comentários de tabela e coluna orientam o Select AI, mas não garantem que ele
  agregue antes de ranquear.
- Uma narrativa pode repetir um termo inadequado da pergunta mesmo quando o SQL
  usa a coluna correta.
- Chamadas isoladas de `DBMS_CLOUD_AI.GENERATE` não preservam de modo
  confiável um seguimento como “e em 2025?”.
- A base é mensal e o IPH é pressão estimada; nenhum dos dois representa estado
  físico em tempo real.

A apresentação técnica da aplicação está em
[`docs/flowia/DEMONSTRACAO_APEX.md`](../../docs/flowia/DEMONSTRACAO_APEX.md).
O conjunto de casos e resultados está em
[`docs/flowia/REVALIDACAO_SELECT_AI.md`](../../docs/flowia/REVALIDACAO_SELECT_AI.md).

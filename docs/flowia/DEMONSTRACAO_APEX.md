# FlowIA no Oracle APEX — implementação técnica

A aplicação APEX demonstra o mesmo caminho governado usado pela FlowIA no
webapp: pergunta em português, SQL gerado pelo Select AI, resultado consultado
na Gold, narrativa e rastro auditável.

O APEX é uma segunda interface para o backend, não uma segunda implementação.
As regras ficam no pacote `MEDFLOW_SELECT_AI`, dentro do schema `MEDFLOW`.

## Estado implementado

| Componente | Estado |
|---|---|
| Oracle APEX | 26.1.3 no Autonomous Database |
| Workspace | `MEDFLOW_DEMO`, schema de parsing `MEDFLOW` |
| Aplicação | App 100, página “Investigar com Select AI” |
| Backend | pacote `MEDFLOW_SELECT_AI` válido |
| Auditoria | tabela `SELECT_AI_RESPOSTA` |
| Artefato reproduzível | `db/apex/05_aplicacao_medflow_select_ai.sql` |

O export da aplicação contém a página, seus itens, regiões, processos e estilos.
O workspace é infraestrutura da instância e permanece separado do código da
aplicação.

## Componentes versionados

| Arquivo | Papel técnico |
|---|---|
| `01_criar_workspace.sql` | declaração opcional da associação entre workspace e schema |
| `02_pacote_select_ai.sql` | orquestração, guarda de SQL, narrativa, avisos e auditoria |
| `03_estilo_apresentacao.css` | identidade visual da interface APEX |
| `04_cabecalho_apresentacao.html` | contexto curto exibido antes da pergunta |
| `05_aplicacao_medflow_select_ai.sql` | export completo e importável do App 100 |

## Ciclo de uma pergunta

1. A página envia `P1_PERGUNTA` ao pacote.
2. `medflow_select_ai.responder` cria uma única rodada e devolve seu
   identificador.
3. O pacote interpreta intenções governadas ou solicita ao Select AI um SQL
   candidato.
4. O SQL passa pelo extrator e pelo guarda de somente leitura.
5. A consulta aprovada roda na mesma transação e seu resultado alimenta a
   narrativa.
6. A linha auditada recebe pergunta, SQL, narrativa, aviso e recusa.
7. Relatório, narrativa e SQL colapsável consultam o mesmo identificador.

Uma única rodada por pergunta impede que a tabela e o texto da página sejam
produzidos por chamadas diferentes ao modelo.

## Contrato exposto à página

| Chamada | Resultado |
|---|---|
| `responder(pergunta, contexto)` | grava a rodada e devolve o ID |
| `sql_da_resposta(id)` | SQL aprovado pelo guarda |
| `narrativa_da_resposta(id)` | explicação produzida a partir do resultado |
| `aviso_da_resposta(id)` | ressalva metodológica ou nulo |

O APEX não calcula indicador, não monta SQL e não repete regras de segurança.
Ele apresenta o que o pacote já validou.

## Governança

- O SQL do modelo é entrada não confiável e só executa quando o comando é de
  leitura.
- A sessão de validação é declarada somente leitura.
- A varredura terminológica cobre narrativa e aliases do SQL, porque o alias
  vira cabeçalho visível no relatório.
- A pergunta tem limite de tamanho e o contexto contém somente estado da tela.
- Credenciais, wallet e configuração da conta APEX não fazem parte do export.
- O rastro fica fora da Gold e não altera os fatos nem os indicadores.

## Evidências de comportamento

Dois casos representam as garantias principais:

| Pergunta | Comportamento observado |
|---|---|
| “quais as cinco regiões de saúde com maior índice de pressão hospitalar médio em 2026” | consulta executada, resultado tabular, narrativa e SQL auditável |
| “qual a taxa de ocupação de leitos de cada região em 2026” | o uso indevido de “ocupação” é sinalizado; o MedFlow mede IPH, uma pressão estimada |

A segunda pergunta é deliberadamente adversarial. Ela verifica se a interface
expõe a limitação sem transformar um indicador de pressão em afirmação sobre
ocupação física.

## Limite de produto

As telas analíticas do MedFlow continuam baseadas em consultas determinísticas.
O Select AI acrescenta exploração em linguagem natural, com custo, variabilidade
e erros conhecidos. A página APEX torna esse mecanismo visível e auditável; ela
não substitui os indicadores contratados pelo produto.

A implementação detalhada do pacote está em
[`db/apex/README.md`](../../db/apex/README.md). Os resultados das baterias de
validação estão em
[`AVALIACAO_20_PERGUNTAS.md`](AVALIACAO_20_PERGUNTAS.md) e
[`REVALIDACAO_SELECT_AI.md`](REVALIDACAO_SELECT_AI.md).

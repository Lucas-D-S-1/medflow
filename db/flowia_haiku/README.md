# FlowIA: Haiku reescreve; Select AI gera SQL

O Haiku recebe pergunta e até três rodadas da conversa como dados. Retorna
somente `status` (`ready`, `clarify`, `refused`) e `rewritten_question`.
O prompt curto está em `src/medflow/select_ai/reescrever.py` e no pacote SQL.
Nomes e códigos são resolvidos pelo catálogo mensal aprovado, incluindo nomes
retomados do histórico. Não se fornecem respostas de referência ao modelo.
Não há lista fechada de perguntas no prompt. `contracts/flowia-haiku-cases.json`
e `route_known`/`validate_result` conservam o contrato legado das reservas.

A função `ask` recusa leitos atuais antes da API. Perguntas prontas seguem
para `medflow_select_ai.responder`, que conserva perfil OCI, cotas e auditoria.
A pergunta completa vai no contexto (até 3900 bytes); o pacote existente limita
a pergunta a 300 caracteres. Falhas voltam às reservas da interface.
O cliente envia o histórico e espera até 60 segundos pelo fluxo completo.

## Instalação isolada e rollback

`001_create.sql` é instalação NOVA, não migração do piloto já instalado.
`scripts/flowia_haiku_db.py --env-file CAMINHO rewrite-candidate` extrai dessa
fonte apenas spec/body e cria `FLOWIA_HAIKU_REWRITE_API`, sem trocar API/ORDS.
`rollback-rewrite` executa `098_rollback_rewrite.sql` e remove só esse candidato.
O rollback foi exercitado no ADB. Perfil, tabelas e API anteriores não mudam.
`099_rollback.sql` continua sendo o rollback completo do piloto anterior.

A rota paga continua desligada (`FLOWIA_HAIKU_BUDGET.enabled=0`). Bearer/ACL
não está resolvido. Não habilitar como parte deste experimento. O teste real
usou HTTPS com `x-api-key` por bind transitório; chave lida somente em memória.
Não foi implementado armazenamento permanente nem infraestrutura intermediária.

## Verificação

`tests/test_flowia_reescrever.py` testa histórico, resolução de entidades,
contrato, encaminhamento ao Select AI, recusa e reserva, sem chamar APIs.
`web/e2e/flowia-haiku.spec.ts` usa transporte simulado, duas larguras e relógio
virtual. Ative `FLOWIA_HAIKU_E2E=1 VITE_FLOWIA_HAIKU=1`; escolha porta isolada
com `FLOWIA_E2E_PORT`. Vite exige `ORDS_BASE_URL`, mesmo com rede simulada.

`scripts/avaliar_flowia_haiku.py` recebe `--env-file`, `--key-env`, `--cases`
e `--output`. Casos JSON têm `question`, `context` e `sql_reference` opcional.
O avaliador chama `GENERATE(..., showsql)` no perfil atual e executa somente
SQL aprovado pelo guarda em transação de leitura. A resposta usa essas mesmas
linhas; não faz uma segunda geração de narrativa. Isso difere do pacote
`medflow_select_ai.responder`, cujo fluxo HTTP completo ainda não foi testado.

O avaliador reserva conservadoramente US$0,018 por rodada, máximo US$0,30.
`usage` mede Anthropic a US$0,10/MTok entrada e US$0,50/MTok saída, sem cache.
OCI não devolve usage via GENERATE: a reserva usa a estimativa histórica do app,
não uma confirmação de fatura. As cotas antigas do piloto não foram ampliadas.
`VITE_FLOWIA_HAIKU=0` preserva o caminho publicado. Preview: build com
`VITE_FLOWIA_HAIKU=1 VITE_BASE=/medflow/`; não reiniciar o processo 4184.

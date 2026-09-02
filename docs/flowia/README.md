# FlowIA — arquitetura, governança e validação

A FlowIA é a camada conversacional do MedFlow. Ela recebe uma pergunta curta
em português e o contexto analítico que já está visível na aplicação, consulta
a camada Gold no Oracle Autonomous AI Database e devolve uma narrativa com o
resultado e suas ressalvas.

O Select AI participa da tradução de texto para SQL. Ele não recebe confiança
implícita: o SQL gerado passa por um guarda de leitura, roda em transação
somente leitura e deixa rastro antes de qualquer resultado chegar à interface.

## Fluxo técnico

1. O webapp envia a pergunta e um contexto limitado: visão ativa, competência,
   região, hospital e análise selecionada.
2. O pacote `MEDFLOW_SELECT_AI` limita a entrada e acrescenta as regras do
   modelo semântico.
3. `DBMS_CLOUD_AI.GENERATE` produz o SQL candidato.
4. O backend extrai o `SELECT`, recusa comandos de escrita e bloqueia termos
   incompatíveis com o contrato analítico.
5. A consulta aprovada roda contra as views e os marts Gold.
6. A narrativa é produzida a partir do resultado e passa pela mesma verificação
   terminológica.
7. Pergunta, contexto, SQL, narrativa, aviso e motivo de recusa são gravados em
   `SELECT_AI_RESPOSTA`.

O resultado exibido, o SQL auditável e os avisos leem a mesma linha de rastro.
Isso evita que componentes da tela façam chamadas independentes e descrevam
consultas diferentes.

## Componentes implementados

| Responsabilidade | Implementação |
|---|---|
| Contexto enviado pelo webapp | `web/src/` e contrato `POST /assistente` |
| Orquestração, guarda e auditoria | `db/apex/02_pacote_select_ai.sql` |
| Perfil semântico do Select AI | `db/select_ai/` |
| Casos controlados e SQL de referência | `src/medflow/select_ai/perguntas.py` |
| Executor e comparador | `src/medflow/select_ai/executar.py` |
| Perguntas coloquiais da FlowIA | `scripts/avaliar_flowia.py` |
| Paridade entre Python e PL/SQL | `tests/test_select_ai.py` |
| Aplicação APEX exportada | `db/apex/05_aplicacao_medflow_select_ai.sql` |

## Evidências curadas

| Documento | Evidência apresentada |
|---|---|
| [`AVALIACAO_20_PERGUNTAS.md`](AVALIACAO_20_PERGUNTAS.md) | as vinte perguntas coloquiais, a interpretação esperada e o resultado consolidado |
| [`REVALIDACAO_SELECT_AI.md`](REVALIDACAO_SELECT_AI.md) | os treze casos técnicos, o método de comparação e as limitações observadas |
| [`LEITURA_SELECT_AI.md`](LEITURA_SELECT_AI.md) | análise das causas, alcance dos comentários semânticos e consequências para o produto |
| [`DEMONSTRACAO_APEX.md`](DEMONSTRACAO_APEX.md) | arquitetura da implementação APEX e o rastro de uma resposta |

As saídas brutas das ferramentas ficam em `ULTIMA_EXECUCAO.md` e
`ULTIMA_REVALIDACAO.md`. Elas são locais e ignoradas pelo Git. O repositório
versiona a leitura técnica dos resultados, não o log de uma máquina.

## Limites assumidos

- A base é mensal por competência; a FlowIA não afirma tempo real.
- IPH mede pressão estimada sobre a capacidade SUS declarada, não ocupação
  física de leitos.
- O modelo pode falhar quando precisa agregar antes de ranquear.
- Cada pergunta é autossuficiente; chamadas isoladas de
  `DBMS_CLOUD_AI.GENERATE` não preservam com segurança o turno anterior.
- A bateria consolidada aprovou os vinte casos, mas eles não passaram juntos em
  uma única rodada por causa da cota diária do Select AI.

Esses limites determinam a arquitetura: as visões principais usam consultas
determinísticas; a FlowIA acrescenta investigação em linguagem natural com
guarda, rastreabilidade e avisos explícitos.

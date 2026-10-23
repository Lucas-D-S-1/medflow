# FlowIA: ativação na prévia 4184

O caminho ativo de feira está em `010_live.sql` e `011_live_ords.sql`.
Haiku 5.5 reescreve a pergunta com três rodadas de histórico; o perfil existente
`MEDFLOW_GENAI` gera SQL com `showsql`. A narrativa usa as linhas dessa mesma
consulta, sem uma segunda geração `narrate`. O pacote antigo não é alterado.
Não há cotas diárias, por IP ou teto de orçamento nesse caminho. Usage serve
somente para medição. As cotas antigas permanecem isoladas nas rotas antigas.

## Recursos novos

- `FLOWIA_HAIKU_SEGREDO`: uma chave, sem grants; lida só pelo pacote novo.
- `FLOWIA_HAIKU_LIVE_API`: resolvedor, reescrita, guarda SQL, execução e reserva.
- `FLOWIA_HAIKU_LIVE_USAGE`: tokens, custo, tempos, reescrita e SQL; sem cabeçalhos.
- Módulo `flowia_haiku_live`, base `api/flowia-haiku-live/v1/`.
- `POST perguntar`: caminho pago. `POST reserva`: consultas determinísticas sem LLM.

Ambas recebem `{question, context}`. O contexto tem `competence`, códigos e
nomes opcionais de região/hospital/especialidade e `history: [{question, answer}]`.
A resposta tem `status`, `narrative`, `provenance` e fonte/mês/limites completos.
SQL e cabeçalhos não são enviados ao navegador. O pacote valida fontes e funções
do SQL antes de executar. Apenas os 13 marts/dimensões do perfil são permitidos.
Máximo de cinco linhas; hospital de maior pressão no singular retorna uma.

## Chave e instalação

Use `scripts/flowia_haiku_live.py --env-file CAMINHO action`:
`apply` cria objetos novos; `secret` grava `ANTHROPIC_API_KEY` já presente no
ambiente do processo por bind; `ords` cria as rotas; `compile` atualiza somente
o pacote novo; `inspect` verifica compilação e grants; `rollback` remove tudo
que foi criado nesta ativação, inclusive a tabela do segredo.

Não passar o valor por argumento, literal SQL, arquivo intermediário ou `VITE_*`.
O carregador autorizado lê a chave do arquivo de origem existente para o ambiente
do processo. As exceções do driver não são impressas: podem conter cabeçalhos.
A credencial anterior `FLOWIA_HAIKU_ANTHROPIC` é usada apenas como suporte de
transporte HTTPS; `x-api-key` vem da tabela por bind transitório; `cache=false`.

**Risco assumido para a feira:** o valor está em texto na tabela, sem grants.
Não há cifragem adicional DBMS_CRYPTO nem gestor separado de chave de cifragem.
O dono do esquema e administradores do banco conseguem acessá-lo. Não confundir
esse isolamento com cifragem da aplicação. A autorização de Lucas permitiu essa
alternativa; planejar cofre externo e rotação depois da feira.

## Prazo e contingência

A interface inicia a consulta paga e uma reserva determinística em paralelo.
A reserva tem prazo de 4,8 s. Se o caminho pago falhar ou passar de 15 s, usa a
reserva já preparada. Respostas tardias não substituem o histórico exibido.
O HTTP Anthropic mantém prazo de transferência de 7 s e `max_tokens=1000`;
a configuração anterior de timeout da sessão Oracle é restaurada.
Cancelar o fetch não garante cancelar a execução no ADB nem a cobrança.
O Select AI pode terminar depois; os testes HTTP completos medem esse tempo.

Leitos livres agora são recusados antes da API. Definições continuam locais.
Se também o ORDS falhar, a interface mantém as reservas locais e os painéis.
O balão mostra progresso aos 2,5 s; não recebe telemetria de fase do ADB.
As respostas identificam Haiku → Oracle ou reserva Oracle nesta prévia.
Os 15 s são prazo de interface; OCI pode continuar após o abort.
A conversa de feira foi validada em 06/2026, Jundiaí, sem alterar o perfil.
Outros recortes e perguntas livres continuam sujeitos aos erros do Select AI.

## Build e testes

No worktree, execute em `web/`:

```sh
VITE_FLOWIA_HAIKU=1 VITE_BASE=/medflow/ VITE_API_BASE=/api/dev/v1 npm run build
```

O tmux `medflow-preview-4184` já serve `web/dist` e encaminha `/api` ao ORDS.
Não precisa reiniciar. Não mudar o preview 4183. `VITE_FLOWIA_HAIKU=0` conserva
o comportamento do site público, que não foi publicado nem recebeu push.

`web/e2e/flowia-haiku.spec.ts` valida transporte simulado, timeout, reserva e
histórico em 1440 e 390 px. Ative `FLOWIA_HAIKU_E2E=1 VITE_FLOWIA_HAIKU=1`,
use uma porta de teste isolada com `FLOWIA_E2E_PORT` e defina `ORDS_BASE_URL`.
Os relatórios externos desta ativação guardam HTTP real, navegador e rollback.

## Pilotos anteriores

`001_create.sql` descreve o piloto antigo, cuja rota paga permanece desligada.
`FLOWIA_HAIKU_REWRITE_API` conserva o candidato da avaliação conversacional.
`098_rollback_rewrite.sql` e `099_rollback.sql` pertencem a esses experimentos.
**Para reverter esta ativação use somente `012_live_rollback.sql`.**

## Reverter o ajuste de 23/10

`013_rollback_ajuste.sql` restaura somente o pacote da ativação anterior,
conservando a chave, o usage e as rotas. Para desligar toda a ativação,
`012_live_rollback.sql` continua removendo seus objetos e a rota nova.
O rollback do frontend é o revert do commit de ajuste, seguido do build.
O merge do cabeçalho pode ser conservado. Não alterar a prévia 4183.

# FlowIA no NEXT: integração e scripts de banco

A versão atual da FlowIA usa Haiku para gerar SQL diretamente, passa a consulta
por um guarda antes de executar no Oracle ADB e faz uma segunda chamada ao
Haiku para redigir a resposta em português a partir do resultado.

O serviço integra a versão publicada do MedFlow no GitHub Pages. O recorte
é São Paulo, de janeiro de 2024 a agosto de 2026, em 32 competências mensais.
O fluxo está descrito em [`docs/flowia/README.md`](../../docs/flowia/README.md).

## Contrato usado pela interface

O cliente `web/src/lib/api/haiku.ts` deriva a base da URL do ORDS e usa:

| Rota | Finalidade |
|---|---|
| `POST api/flowia-haiku-live/v1/perguntar` | consulta em linguagem natural |
| `POST api/flowia-haiku-live/v1/reserva` | resposta determinística de contingência |

O corpo contém `question` e `context`. O contexto inclui competência, região,
hospital e especialidade quando disponíveis, além de até três turnos do histórico.
A resposta contém estado, narrativa, SQL opcional e proveniência. O cliente
valida o contrato e oferece `Ver query` quando recebe SQL.

A interface inicia consulta e reserva em paralelo. O cliente concede 4,8 s à
reserva e 25 s à consulta principal. Se a consulta falhar, tenta aproveitar a
reserva disponível. Esses prazos são do cliente e não garantem cancelamento
remoto ou limite de cobrança. A chave de integração permanece no ADB e não é
enviada ao navegador.

## Alcance dos arquivos SQL

Esta pasta contém definições de objetos, rotas e operações de manutenção.
Ela não contém um manifesto verificado de reinstalação integral do serviço
do NEXT. Cada arquivo precisa ser entendido pelo que efetivamente define.

| Arquivo | Alcance verificado no código versionado |
|---|---|
| `000_credential.sql` | criação da credencial de transporte HTTPS |
| `001_create.sql` | objetos e pacote de classificação e consultas determinísticas |
| `010_live.sql` | definição de `FLOWIA_HAIKU_LIVE_API`; o gerador SQL desse arquivo chama `DBMS_CLOUD_AI.GENERATE` com `showsql` |
| `011_live_ords.sql` | definição das rotas `perguntar` e `reserva` para o pacote `FLOWIA_HAIKU_LIVE_API` |
| `012_live_rollback.sql` | remoção dos objetos e das rotas nomeados no arquivo |
| `013_rollback_ajuste.sql` | substituição do corpo do pacote pela definição contida no arquivo |
| `014_pages_cors.sql` | ajuste de CORS do módulo |
| `098_rollback_rewrite.sql`, `099_rollback.sql` | operações de remoção dos objetos explicitamente listados nos scripts |

**Executar `010_live.sql` não instala o fluxo de duas chamadas Haiku descrito
acima.** Esse arquivo não deve ser apresentado como a definição completa do
backend publicado. As operações de recompilação e remoção também não
constituem um procedimento verificado de recuperação do serviço atual.

O helper `scripts/flowia_haiku_live.py` executa os arquivos desta pasta:
`apply` lê `010_live.sql`, `compile` recompila o pacote definido nesse arquivo,
`ords` lê `011_live_ords.sql` e `rollback` lê `012_live_rollback.sql`.
`inspect` consulta compilação e grants dos objetos definidos pelo helper.
Esses comandos não comprovam equivalência com o código instalado no ADB.

Para preparar uma reinstalação do NEXT, é necessário primeiro conferir as
definições instaladas de geração SQL, guarda, narrativa, despacho e rotas,
reconciliá-las com os arquivos de implantação e validar o conjunto. Essa
reinstalação não foi executada nem comprovada nesta atualização documental.

## Chave e configuração

O helper recebe o caminho do arquivo de ambiente e usa bind para gravar a
chave carregada no processo. O valor não deve entrar em SQL literal, argumentos,
logs ou variáveis `VITE_*`. Os scripts que lidam com a chave não são necessários
para ler a documentação ou executar testes herméticos.

## Build e verificação

O workflow `.github/workflows/pages.yml` ativa `VITE_FLOWIA_HAIKU=1` no build
publicado. A URL-base do ORDS é configuração do ambiente, não uma credencial.
O serviço já está integrado ao site oficial; não há dependência de uma sessão
tmux de prévia para o visitante acessar a FlowIA.

`web/e2e/flowia-haiku.spec.ts` verifica o transporte simulado, a validação da
resposta, os prazos, a reserva e o histórico. Esses testes não validam por
inferência o código instalado no Oracle. As avaliações datadas e seus limites
estão no [índice da FlowIA](../../docs/flowia/README.md).

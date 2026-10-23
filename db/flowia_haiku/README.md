# Piloto FlowIA Haiku

Este diretório mantém exclusivamente objetos `FLOWIA_HAIKU_*` e o módulo ORDS
`flowia_haiku`, em `/api/flowia-haiku/v1/perguntar`. Não reaplicar os módulos antigos.
O provisionamento começa **desabilitado** (`FLOWIA_HAIKU_BUDGET.enabled=0`).

`000_credential.sql` recebe `:api_key` por bind. O provisionador
`scripts/flowia_haiku_db.py credential` lê somente `ANTHROPIC_API_KEY` do ambiente
do processo. Não passar o valor por argumento, literal SQL, arquivo ou `VITE_*`.
`001_create.sql` cria as tabelas, pacote e módulo. `099_rollback.sql` remove
somente esses recursos, incluindo a credencial e os índices das tabelas.
Os scripts de criação e remoção devem existir antes do provisionamento.

O transporte candidato usa `bearer://` com a credencial. Sua ativação depende de
aprovação da alternativa ao cabeçalho `x-api-key` e de ACL funcional no ADB.
Não basta alterar `enabled`: a instalação atual devolveu ORA-24247 para Bearer.
HTTPS com `x-api-key` em bind transitório foi validado pelo avaliador privado;
isso não configura uma solução de armazenamento/extração da chave no ORDS.
O relatório da execução e os resultados ficam fora do repositório, na pasta
do executor. Cloudflare Worker é uma alternativa proposta, sem implementação.

A função `ask` aplica recusas e validação antes de classificar. A saída do
modelo passa por JSON Schema, enum fechado e validação de slots contra Gold.
O único bloco PL/SQL dinâmico do transporte é constante e recebe binds.
O pacote usa invoker rights para os privilégios DBMS_CLOUD via DWROLE, sem
grant adicional. `route_known` e `validate_result` são pontos de teste internos;
o ORDS expõe somente `ask`. SQL do modelo não entra nas consultas conhecidas.
Exploração explícita chama o pacote Select AI existente, com suas próprias
cotas e limitações. O perfil OCI não é alterado.

A cota padrão é 100 chamadas/dia e US$0,50 para o piloto. Uma atualização
atômica reserva US$0,005 antes de chamar a API. `usage` reconcilia a reserva
com o custo medido a US$0,10/MTok de entrada e US$0,50/MTok de saída, sem cache.
Falhas sem `usage` mantêm a reserva. O avaliador privado usa a mesma cota,
mesmo com a rota desligada; ele não deve ser disponibilizado no navegador.
O prompt, contexto restrito e saída de 512 tokens ficam abaixo de 100 mil tokens.

O servidor descarta classificações após 5 s; isso não cancela o HTTP já iniciado.
O cliente encerra a espera em 5,5 s, preservando explicações locais e ranking
regional dos dados já carregados quando o universo está completo e atual.
Não há retentativa paga nem Select AI automático em falhas. Exploração OCI
pode exceder esse prazo; não foi validada de ponta a ponta neste piloto.

Validação sem API paga: `tests/test_flowia_haiku_db.py` injeta classificações
no roteador real. Ativar com `FLOWIA_HAIKU_TEST_ENV` apontando ao `.env` do ADB.
Testes da interface: `FLOWIA_HAIKU_E2E=1 VITE_FLOWIA_HAIKU=1` e o arquivo
`web/e2e/flowia-haiku.spec.ts`; `FLOWIA_E2E_PORT` isola a porta do servidor.
`VITE_FLOWIA_HAIKU=0` preserva o caminho publicado. `ORDS_BASE_URL` é necessário
no processo Vite. O preview usa `VITE_BASE=/medflow/` e bind `127.0.0.1:4184`.

# `db/`: o backend do MedFlow

**Este diretório é o servidor da aplicação.** Não há Node nem Python entre a
tela e o banco: o ORDS publica os endpoints direto do Autonomous Database, e as
views e os módulos ORDS publicam os indicadores produzidos na Gold.
A FlowIA usa Haiku para gerar SQL, um guarda antes de executar no Oracle e
outra chamada ao Haiku para redigir a resposta a partir do resultado.

| Pasta | Papel |
|---|---|
| `schema/` | usuário, modelo dimensional e reconciliação da carga |
| `views/` | projeções dos campos analíticos para publicação |
| `ords/` | módulos REST; o `03` redefine o de trabalho, o `04` clona o público |
| `select_ai/` | definições de perfil e avaliação SQL, com escopo das medições em `docs/flowia/` |
| [`apex/`](apex/README.md) | workspace, pacote e aplicação da demonstração APEX |
| [`flowia_haiku/`](flowia_haiku/README.md) | integração da FlowIA e alcance dos scripts disponíveis |

O contrato do que esses handlers expõem está em
[`../contracts/openapi.yaml`](../contracts/openapi.yaml), e
`tests/test_openapi.py` confere que ele não divergiu deste SQL nem da API viva.

Os arquivos configuram partes do Autonomous AI Database `MEDFLOW`. O
[README da FlowIA no banco](flowia_haiku/README.md) delimita o que os scripts
instalam; não há um procedimento verificado de reinstalação integral do NEXT.
Credenciais ficam fora do código: wallet, `.env`, chaves e
arquivos de conexão são ignorados pelo Git.

## Instância de referência

| Item | Valor |
|---|---|
| Nome / DB name | `MedFlow` / `MEDFLOW` |
| Workload | **Lakehouse**: a evolução do Autonomous Data Warehouse no 26ai, com suporte a Iceberg e dados externos em Object Storage ([doc oficial](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/about-autonomous-database-workloads.html)) |
| Versão | 26ai |
| Tipo de instância | Always Free |
| Região | Brazil East, `sa-saopaulo-1` |
| Tenancy | institucional FIAP/Oracle; o OCID e o usuário ficam no `.env`, fora do repositório |
| Autenticação | mTLS obrigatório, acesso seguro de qualquer lugar |
| Criado em | 31/07/2026 |

## Banco da versão atual do NEXT

O recorte publicado é São Paulo, de janeiro de 2024 a agosto de 2026, com
32 competências mensais. `/status` informa a competência mais recente e
`/metodologia` informa cobertura e reconciliações. Contagens locais são lidas
de `data/gold/qualidade/METADADOS.json` e precisam ser conferidas no banco.

A FlowIA usa `api/flowia-haiku-live/v1/perguntar` e `reserva`. O fluxo de
geração SQL, execução e narrativa está em
[`docs/flowia/README.md`](../docs/flowia/README.md). A descrição de um pacote
versionado não comprova que ele equivale à definição instalada no serviço.

`carregar_gold.py --conferir` e `schema/03_validar_carga.sql` medem a carga.
As avaliações datadas e seus critérios estão no
[índice da FlowIA](../docs/flowia/README.md). Elas não são prova de implantação
nem validação completa de toda pergunta livre.

## Instalação

Na raiz do repositório:

```bash
make setup        # instala o pacote com os extras, incluindo oracledb
```

## Wallet e variáveis

Use um **wallet de instância**, restrito ao `MEDFLOW`. Extraia-o localmente em:

```text
wallets/MEDFLOW/
```

A senha do wallet deve ser diferente da senha do usuário `ADMIN`.

Na raiz do repositório:

```bash
cp .env.example .env
```

Preencha o `.env` da raiz localmente. Confirme os aliases reais no `tnsnames.ora`
do wallet: no workload Lakehouse o esperado é `medflow_low`, `medflow_medium`,
`medflow_high`, `medflow_tp` e `medflow_tpurgent`.

## Ordem de execução

A sequência organiza a camada analítica. A integração da FlowIA e os
artefatos APEX têm alcance próprio, indicado nos respectivos READMEs.
O `.env` aponta para o usuário `MEDFLOW`; a criação de esquema usa `ADMIN`.

| # | Passo | Como | Usuário |
|---|---|---|---|
| 1 | Criar o esquema de aplicação | `db/schema/01_criar_usuario_medflow.sql` | `ADMIN` |
| 2 | Testar a conexão | `make oracle-ping` | `MEDFLOW` |
| 3 | Criar o modelo dimensional | `executar_sql.py db/schema/02_criar_tabelas_gold.sql` | `MEDFLOW` |
| 4 | Carregar a Gold | `make oracle-carregar` | `MEDFLOW` |
| 5 | Reconciliar a carga | `executar_sql.py db/schema/03_validar_carga.sql` | `MEDFLOW` |
| 6 | Publicar as views | `executar_sql.py db/views/*.sql` | `MEDFLOW` |
| 7 | Conferir a integração da FlowIA com a implantação do NEXT | [`flowia_haiku/README.md`](flowia_haiku/README.md); os scripts não formam um instalador integral verificado | Conforme a operação |
| 8 | Publicar o módulo de trabalho | `executar_sql.py db/ords/03_modulo_medflow_dev.sql` | `MEDFLOW` |
| 9 | Publicar o módulo público | `make ords-publicar` | `MEDFLOW` |
| 10 | Importar a interface APEX opcional | `db/apex/05_aplicacao_medflow_select_ai.sql` | `ADMIN` + `MEDFLOW` |

Para acrescentar dimensões territoriais a uma instância existente, use
`make oracle-migrar-territorio` em vez de recriar o schema. A carga seletiva
permite carregar essas dimensões sem reter locks nos marts:

```bash
.venv/bin/python -m dotenv -f .env run -- \
  .venv/bin/python src/medflow/oracle/carregar_gold.py \
  --somente dim_territorio_municipal \
  --somente dim_hospital_territorio_atual \
  --somente dim_hospital_alias
```

O filtro `busca` de `/hospitais` e os campos territoriais do item só entram no
módulo público depois da ordem normal `03_modulo_medflow_dev.sql` seguida de
`make ords-publicar`. Os módulos analíticos não substituem a implantação
da rota própria da FlowIA.

Para acrescentar o diagnóstico mensal por especialidade a uma instância já
existente, não execute novamente o schema destrutivo `02`. Revise e execute,
nesta ordem, a migração aditiva, a carga isolada, a view e os módulos:

```bash
.venv/bin/python src/medflow/oracle/executar_sql.py \
  db/schema/07_adicionar_diagnostico_especialidade_mensal.sql
safe-run .venv/bin/python src/medflow/oracle/carregar_gold.py \
  --somente mart_indicador_hospital_especialidade_cid_mensal
.venv/bin/python src/medflow/oracle/executar_sql.py \
  db/views/10_vw_api_hospital_diagnosticos_especialidade.sql
.venv/bin/python src/medflow/oracle/executar_sql.py \
  db/ords/03_modulo_medflow_dev.sql
.venv/bin/python src/medflow/oracle/executar_sql.py \
  db/ords/04_modulo_medflow_prod.sql
```

O rollback operacional está em
`db/schema/07_reverter_diagnostico_especialidade_mensal.sql`: primeiro restaure
pacote, profile, ORDS e frontend anteriores; o mart e a view podem permanecer
inativos, preservando a carga. Remoção física é uma etapa destrutiva separada,
guardada por confirmação em
`db/schema/07_remover_fisicamente_diagnostico_especialidade.sql`, e só vem
depois da retirada de todas as dependências. Nenhum desses comandos foi
executado nesta implementação local.

### Passos 8 e 9: dois módulos, uma definição

| Módulo | Caminho | Origem aceita no CORS | Para quê |
|---|---|---|---|
| `medflow_dev` | `api/dev/v1/` | `http://localhost:5173` | desenvolvimento, pelo proxy do Vite |
| `medflow` | `api/v1/` | `https://lucas-d-s-1.github.io` | o site publicado |

O `04` **não redeclara os handlers**: ele lê os metadados do ORDS e clona o
`medflow_dev`, mudando só nome, prefixo e origem. Foi aquela definição: não
outra parecida. Que passou pelas comparações campo a campo contra a Gold, e
uma cópia manual criaria uma segunda verdade que envelhece calada. No fim do
bloco há um portão que compara handler a handler, inclusive o SQL byte a byte,
e recusa a publicação se algo divergir.

A consequência: **`medflow_dev` é a fonte**. Se ele for redefinido, rode o `04`
de novo. A ordem é sempre 03 e depois 04.

Para provar o módulo público em vez de confiar no clone:

```bash
make contrato-publico        # o openapi.yaml contra a API que o site consome
make reconciliar-publico     # amostra campo a campo contra a Gold
```

### Passo 2: teste de conexão

Na raiz do repositório:

```bash
make oracle-ping              # ou, sem make:
.venv/bin/python -m dotenv -f .env run -- \
  .venv/bin/python src/medflow/oracle/testar_conexao.py
```

O teste consulta apenas o nome do banco, o esquema conectado e o horário do
servidor. Nenhuma credencial é exibida.

### Passo 4: carga

```bash
make oracle-carregar          # ou, sem make:
.venv/bin/python -m dotenv -f .env run -- \
  .venv/bin/python src/medflow/oracle/carregar_gold.py
```

A carga esvazia cada tabela selecionada antes de inserir, na ordem inversa
das chaves estrangeiras. Quantidades de linhas e tabelas dependem da Gold
validada e dos metadados usados. Para conferir sem carregar:

```bash
.venv/bin/python -m dotenv -f .env run -- \
  .venv/bin/python src/medflow/oracle/carregar_gold.py --conferir
```

### Passo 5: reconciliação

`schema/03_validar_carga.sql` compara as métricas de reconciliação contra
`data/gold/qualidade/METADADOS.json`. A contagem e a versão do contrato não
ficam escritas aqui: os dois números já andaram para a frente sem esta linha
acompanhar, e é o próprio arquivo de metadados que os carrega. **Toda linha tem de
sair como `ok`.** Os marts partem do mesmo fato e precisam fechar no mesmo
total de internações novas registrado em `internacoes_novas_reconciliadas`
nos metadados da Gold; se um divergir, a
carga perdeu dado e o dashboard não deve ser construído sobre essa base.

O recorte da versão atual do NEXT é SP, de janeiro de 2024 a agosto de 2026,
com 32 competências. A API pública informa essa cobertura em `/status` e
`/metodologia`. Conferir os metadados não substitui a reconciliação da carga.

Os valores esperados do SQL não são digitados à mão: `scripts/atualizar_esperados_sql.py`
os regenera a partir dos metadados, e exige `carregar_gold.py --conferir`
antes: abençoar o estado do banco sem conferência independente seria só
carimbar.

### Passo 7: FlowIA do NEXT

A interface usa a rota `api/flowia-haiku-live/v1/perguntar` para perguntas e
`reserva` para contingência determinística. Haiku gera o SQL, um guarda o
restringe antes da execução no Oracle e uma segunda chamada redige a resposta.
A chave de integração permanece no ADB e não chega ao navegador.

O cliente está em `web/src/lib/api/haiku.ts`, ativado por
`VITE_FLOWIA_HAIKU=1` no workflow publicado. O OpenAPI de `api/v1` inclui um
`POST /assistente`, mas esse endpoint não especifica a integração própria da
FlowIA. O pacote da demonstração APEX tem escopo descrito em
[`apex/README.md`](apex/README.md).

Os scripts de `flowia_haiku/` e seus helpers operam os objetos que definem.
Executar `010_live.sql` ou a recompilação do helper não instala o fluxo de
duas chamadas Haiku. O [README da integração](flowia_haiku/README.md) descreve
esse limite. Uma reinstalação requer conferir geração SQL, guarda, narrativa,
despacho e rotas com a definição da implantação, antes de validar o conjunto.

## Dependências operacionais

A FlowIA depende do Oracle, do ORDS e da integração Haiku. A inferência é
cobrada por consumo. O prazo do cliente não garante cancelamento remoto nem
limite de cobrança. Erros de interpretação continuam possíveis.

O Always Free pode hibernar por inatividade. `make preflight` verifica o caminho
público. O heartbeat está definido em `.github/workflows/heartbeat.yml`; sua
saída precisa ser conferida junto do período esperado e do `/status` real.
Ele não inicia um banco já parado.

## Por que um esquema separado do ADMIN

O `ADMIN` é a conta de administração do Autonomous Database. A Gold vive no
esquema `MEDFLOW`, com quota e privilégios mínimos. Isso mantém a modelagem
explícita, evita que o `ADMIN` acumule objeto de aplicação e permite habilitar
o esquema no Database Actions sem expor a conta administrativa na interface.

## Definições de tabelas e colunas

Os comentários documentam granularidade, métricas e limites das colunas.
Devem ser coerentes com os contratos e com o contexto usado pelo gerador SQL.
Documentar um campo não comprova, por si, que um modelo interpreta toda pergunta
corretamente. O fluxo da FlowIA está no
[README da assistente](../docs/flowia/README.md).

## Dados

Os Parquets dos marts não são versionados (`.gitignore`). Gere-os localmente
com `make pipeline` antes da carga. Os notebooks narram o raciocínio, mas não
são mais o motor. Os SHA-256 de referência estão em
`data/gold/qualidade/METADADOS.json`.

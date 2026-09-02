# `db/` — o backend do MedFlow

**Este diretório é o servidor da aplicação.** Não há Node nem Python entre a
tela e o banco: o ORDS publica os endpoints direto do Autonomous Database, e as
nove views mais os módulos ORDS daqui não são "scripts auxiliares do Oracle",
são o código de servidor do produto. Menos peças reduzem a superfície
operacional, e o dado nunca é recalculado fora do banco.

| Pasta | Papel |
|---|---|
| `schema/` | usuário, modelo dimensional e reconciliação da carga |
| `views/` | nove views de projeção pura, uma por fatia do produto |
| `ords/` | módulos REST; o `03` redefine o de trabalho, o `04` clona o público |
| `select_ai/` | perfil semântico, casos de validação e SQL de referência |
| `apex/` | pacote PL/SQL governado, compartilhado pelo assistente web, e workspace opcional |

O contrato do que esses handlers expõem está em
[`../contracts/openapi.yaml`](../contracts/openapi.yaml), e
`tests/test_openapi.py` confere que ele não divergiu deste SQL nem da API viva.

Configuração reproduzível e sem segredos para o Autonomous AI Database
`MEDFLOW`. Nada neste diretório contém credencial: wallet, `.env`, chaves e
arquivos de conexão são ignorados pelo Git.

## Instância de referência

| Item | Valor |
|---|---|
| Nome / DB name | `MedFlow` / `MEDFLOW` |
| Workload | **Lakehouse** — a evolução do Autonomous Data Warehouse no 26ai, com suporte a Iceberg e dados externos em Object Storage ([doc oficial](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/about-autonomous-database-workloads.html)) |
| Versão | 26ai |
| Tipo de instância | Always Free |
| Região | Brazil East, `sa-saopaulo-1` |
| Tenancy | institucional FIAP/Oracle; o OCID e o usuário ficam no `.env`, fora do repositório |
| Autenticação | mTLS obrigatório, acesso seguro de qualquer lugar |
| Criado em | 31/07/2026 |

## O que está no banco

- conexão mTLS como `MEDFLOW`, sem senha em arquivo versionado;
- 5 dimensões e 7 marts, com 13 tabelas e 225 colunas comentadas, e 10 índices
  secundários;
- **597.930 linhas**: 597.018 nos marts e 912 nas dimensões;
- reconciliação da carga com todas as métricas em `ok`, incluindo território, e
  seis verificações adicionais de integridade com zero ocorrências;
- Resource Principal OCI habilitado para o esquema, e o profile `MEDFLOW_GENAI`
  ativo com OCI Generative AI em `sa-saopaulo-1`, sincronizado com os doze
  objetos analíticos;
- pacote `medflow_select_ai` instalado, servindo o assistente web e a
  demonstração APEX;
- heartbeat diário e `make preflight` conferindo o produto publicado.

Nenhum desses números é para acreditar: `make oracle-carregar --conferir` e
`schema/03_validar_carga.sql` os medem no banco, no momento em que você
pergunta.

As evidências atuais estão em
[`../docs/flowia/REVALIDACAO_SELECT_AI.md`](../docs/flowia/REVALIDACAO_SELECT_AI.md),
e a leitura dos limites medidos, em
[`../docs/flowia/LEITURA_SELECT_AI.md`](../docs/flowia/LEITURA_SELECT_AI.md).

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

Cada passo pressupõe o anterior. O `.env` aponta para o usuário `MEDFLOW`; o
`ADMIN` é usado apenas no passo 1, conectando pelo Database Actions ou pelo
SQLcl.

| # | Passo | Como | Usuário |
|---|---|---|---|
| 1 | Criar o esquema de aplicação | `db/schema/01_criar_usuario_medflow.sql` | `ADMIN` |
| 2 | Testar a conexão | `make oracle-ping` | `MEDFLOW` |
| 3 | Criar o modelo dimensional | `executar_sql.py db/schema/02_criar_tabelas_gold.sql` | `MEDFLOW` |
| 4 | Carregar a Gold | `make oracle-carregar` | `MEDFLOW` |
| 5 | Reconciliar a carga | `executar_sql.py db/schema/03_validar_carga.sql` | `MEDFLOW` |
| 6 | Publicar as views | `executar_sql.py db/views/*.sql` | `MEDFLOW` |
| 7 | Habilitar o Select AI e instalar o pacote governado | `db/select_ai/04_select_ai.sql` + `db/apex/02_pacote_select_ai.sql` | `ADMIN` + `MEDFLOW` |
| 8 | Publicar o módulo de trabalho | `executar_sql.py db/ords/03_modulo_medflow_dev.sql` | `MEDFLOW` |
| 9 | Publicar o módulo público | `make ords-publicar` | `MEDFLOW` |
| 10 | Importar a interface APEX opcional | `db/apex/05_aplicacao_medflow_select_ai.sql` | `ADMIN` + `MEDFLOW` |

Em uma instância que já estava no modelo anterior, use
`make oracle-migrar-territorio` em vez de recriar o schema. Depois, carregue só
as novas dimensões, sem reter locks nos marts existentes:

```bash
.venv/bin/python -m dotenv -f .env run -- \
  .venv/bin/python src/medflow/oracle/carregar_gold.py \
  --somente dim_territorio_municipal \
  --somente dim_hospital_territorio_atual \
  --somente dim_hospital_alias
```

O filtro `busca` de `/hospitais` e os campos territoriais do item só entram no
módulo público depois da ordem normal `03_modulo_medflow_dev.sql` seguida de
`make ords-publicar`. O profile Select AI pode ser atualizado sem inferência
com `make select-ai-sincronizar-territorio`.

### Passos 8 e 9 — dois módulos, uma definição

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

### Passo 2 — teste de conexão

Na raiz do repositório:

```bash
make oracle-ping              # ou, sem make:
.venv/bin/python -m dotenv -f .env run -- \
  .venv/bin/python src/medflow/oracle/testar_conexao.py
```

O teste consulta apenas o nome do banco, o esquema conectado e o horário do
servidor. Nenhuma credencial é exibida.

### Passo 4 — carga

```bash
make oracle-carregar          # ou, sem make:
.venv/bin/python -m dotenv -f .env run -- \
  .venv/bin/python src/medflow/oracle/carregar_gold.py
```

A carga é idempotente: esvazia cada tabela antes de inserir, na ordem inversa
das chaves estrangeiras. São 597.930 linhas em 12 tabelas: 597.018 nos
sete marts e 912 nas cinco dimensões. Para conferir sem carregar:

```bash
make oracle-carregar          # ou, sem make:
.venv/bin/python -m dotenv -f .env run -- \
  .venv/bin/python src/medflow/oracle/carregar_gold.py --conferir
```

### Passo 5 — reconciliação

`schema/03_validar_carga.sql` compara as métricas de reconciliação contra
`data/gold/qualidade/METADADOS.json`. A contagem e a versão do contrato não
ficam escritas aqui: os dois números já andaram para a frente sem esta linha
acompanhar, e é o próprio arquivo de metadados que os carrega. **Toda linha tem de
sair como `ok`.** Os marts partem do mesmo fato e precisam fechar no mesmo
total de internações novas, 7.150.693 no recorte atual; se um divergir, a
carga perdeu dado e o dashboard não deve ser construído sobre essa base.

Os valores esperados do SQL não são digitados à mão: `scripts/atualizar_esperados_sql.py`
os regenera a partir dos metadados, e exige `carregar_gold.py --conferir`
antes: abençoar o estado do banco sem conferência independente seria só
carimbar.

### Passo 7 — Select AI

**A suíte de perguntas não mora aqui.** Ela vive em
`src/medflow/select_ai/perguntas.py` e roda com `make select-ai-revalidar`: são
13 perguntas em cinco blocos, oito com comparação por execução contra o SQL de
referência. A evidência e a leitura dela estão em
[`../docs/flowia/`](../docs/flowia/README.md).

O que está nesta pasta é a infraestrutura. `select_ai/04_select_ai.sql` registra
o Dynamic Group, a policy IAM, a habilitação do Resource Principal e o profile. A configuração usa OCI Generative AI na própria região de São
Paulo, sem chave de API externa.

A página APEX continua sendo uma demonstração opcional. O pacote versionado em
[`apex/`](apex/README.md), porém, agora é também o backend do assistente web:
limita a pergunta, guarda a rodada e recusa SQL que não seja de leitura.

## Dois riscos operacionais

**Select AI foi revalidado em 23/08/2026, mas continua sendo uma dependência
externa do MVP.** Preserve o Dynamic Group `MedFlowADBGenAI`, a policy
`use generative-ai-family` e o Resource Principal. Uma verificação ao vivo
deve usar perguntas autossuficientes da suíte validada.

**Always Free hiberna por inatividade.** O workflow
`.github/workflows/heartbeat.yml` executa SQL diariamente para mantê-lo ativo e
falha de forma visível se ele já estiver parado. Antes de uma verificação
externa, `make preflight` confirma o caminho público; a automação não substitui
essa conferência.

## Por que um esquema separado do ADMIN

O `ADMIN` é a conta de administração do Autonomous Database. A Gold vive no
esquema `MEDFLOW`, com quota e privilégios mínimos. Isso mantém a modelagem
explícita, evita que o `ADMIN` acumule objeto de aplicação e permite habilitar
o esquema no Database Actions sem expor a conta administrativa na interface.

## Por que os COMMENT ON importam

O Select AI usa comentário de tabela e de coluna como contexto ao traduzir
pergunta em SQL. É o que o atributo `"comments": "true"` do profile envia
junto do prompt. Por isso `schema/02_criar_tabelas_gold.sql` comenta as 225
colunas e as 13 tabelas, e não apenas as chaves. Erros de semântica devem ser corrigidos no
comentário da coluna. Cortes de negócio ausentes da pergunta devem ser
declarados explicitamente, sem ajustes por tentativa e erro.

Caso concreto: o comentário de `nr_iph_estimado` diz explicitamente que o
índice é pressão estimada sobre capacidade declarada, e **não** ocupação real
de leito. Essa distinção é decisão de contrato do projeto: confundir os dois
transforma um sinal de pressão estimada em uma afirmação sobre ocupação física
que o dado não sustenta.

## Dados

Os Parquets dos marts não são versionados (`.gitignore`). Gere-os localmente
com `make pipeline` antes da carga. Os notebooks narram o raciocínio, mas não
são mais o motor. Os SHA-256 de referência estão em
`data/gold/qualidade/METADADOS.json`.

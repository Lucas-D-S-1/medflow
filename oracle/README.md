# Oracle — setup e carga do MedFlow

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
| Tenancy | `rm572207` (institucional FIAP/Oracle, usuário `rm572207@fiap.com.br`) |
| Autenticação | mTLS obrigatório, acesso seguro de qualquer lugar |
| Criado em | 31/07/2026 |

## Estado validado em 01/08/2026

- conexão mTLS validada como `MEDFLOW`;
- 2 dimensões, 7 marts, 175 colunas comentadas e 10 índices secundários;
- **585.296 linhas** carregadas: 584.589 nos marts e 707 nas dimensões;
- 36/36 métricas de reconciliação com estado `ok`;
- seis verificações adicionais de integridade com zero ocorrências;
- Resource Principal OCI habilitado para o esquema;
- profile `MEDFLOW_GENAI` ativo com OCI Generative AI em `sa-saopaulo-1`;
- três perguntas originais validadas em SQL, `showsql` e `narrate`; as duas
  novas perguntas territoriais aguardam a revalidação planejada do Select AI.

As evidências e os rankings obtidos estão em
[`VALIDACAO_ORACLE_SELECT_AI.md`](VALIDACAO_ORACLE_SELECT_AI.md).

## Instalação

Na raiz do repositório:

```bash
uv pip install --python .venv/bin/python -r 02_oracle_medflow/sprint_2_em_andamento/oracle/requirements.txt
```

## Wallet e variáveis

Use um **wallet de instância**, restrito ao `MEDFLOW`. Extraia-o localmente em:

```text
02_oracle_medflow/sprint_2_em_andamento/oracle/wallets/MEDFLOW/
```

A senha do wallet deve ser diferente da senha do usuário `ADMIN`.

Na raiz de `sprint_2_em_andamento/`:

```bash
cp oracle/.env.example oracle/.env
```

Preencha `oracle/.env` localmente. Confirme os aliases reais no `tnsnames.ora`
do wallet: no workload Lakehouse o esperado é `medflow_low`, `medflow_medium`,
`medflow_high`, `medflow_tp` e `medflow_tpurgent`.

## Ordem de execução

Cada passo pressupõe o anterior. O `.env` aponta para o usuário `MEDFLOW`; o
`ADMIN` é usado apenas no passo 1, conectando pelo Database Actions ou pelo
SQLcl.

| # | Passo | Como | Usuário |
|---|---|---|---|
| 1 | Criar o esquema de aplicação | `sql/01_criar_usuario_medflow.sql` | `ADMIN` |
| 2 | Testar a conexão | `python oracle/testar_conexao.py` | `MEDFLOW` |
| 3 | Criar o modelo dimensional | `python oracle/executar_sql.py sql/02_criar_tabelas_gold.sql` | `MEDFLOW` |
| 4 | Carregar a Gold | `python oracle/carregar_gold.py` | `MEDFLOW` |
| 5 | Reconciliar a carga | `python oracle/executar_sql.py sql/03_validar_carga.sql` | `MEDFLOW` |
| 6 | Habilitar e demonstrar o Select AI | `sql/04_select_ai.sql` | `ADMIN` + `MEDFLOW` |

### Passo 2 — teste de conexão

Na raiz de `sprint_2_em_andamento/`:

```bash
../../.venv/bin/python -m dotenv -f oracle/.env run -- \
  ../../.venv/bin/python oracle/testar_conexao.py
```

O teste consulta apenas o nome do banco, o esquema conectado e o horário do
servidor. Nenhuma credencial é exibida.

### Passo 4 — carga

```bash
../../.venv/bin/python -m dotenv -f oracle/.env run -- \
  ../../.venv/bin/python oracle/carregar_gold.py
```

A carga é idempotente: esvazia cada tabela antes de inserir, na ordem inversa
das chaves estrangeiras. São 585.296 linhas em 9 tabelas: 584.589 linhas nos
sete marts e 707 nas duas dimensões. Para conferir sem carregar:

```bash
../../.venv/bin/python -m dotenv -f oracle/.env run -- \
  ../../.venv/bin/python oracle/carregar_gold.py --conferir
```

### Passo 5 — reconciliação

`sql/03_validar_carga.sql` compara 36 métricas contra
`dados/gold/qualidade/METADADOS.json`, contrato `0.3.0`. **Toda linha tem de
sair como `ok`.** Os marts partem do mesmo fato e precisam fechar em
6.905.441 internações novas; se um divergir, a carga perdeu dado e o dashboard
não deve ser construído sobre essa base.

### Passo 6 — Select AI

`sql/04_select_ai.sql` registra o Dynamic Group, a policy IAM, a habilitação
do Resource Principal, o profile e as cinco perguntas. A configuração validada
usa OCI Generative AI na própria região de São Paulo, sem chave de API externa.
O `showsql` deve ser conferido contra o SQL de referência antes do `narrate`.

## Dois avisos que valem nota

**Select AI foi validado em 01/08/2026, mas continua sendo uma dependência
externa do MVP.** Preserve o Dynamic Group `MedFlowADBGenAI`, a policy
`use generative-ai-family` e o Resource Principal. Antes da apresentação,
execute novamente o teste de fumaça e as cinco perguntas.

**Always Free hiberna por inatividade.** Uma instância Always Free é parada
automaticamente após alguns dias consecutivos sem conexão e pode ser
recuperada de volta pela Oracle se ficar longos períodos parada. Reiniciar é
trivial pelo console, mas não é o tipo de surpresa que se quer no dia da
apresentação. Conecte ao banco pelo menos uma vez por semana até a entrega, e
confirme que ele está `Disponível` na véspera.

## Por que um esquema separado do ADMIN

O `ADMIN` é a conta de administração do Autonomous Database. A Gold vive no
esquema `MEDFLOW`, com quota e privilégios mínimos. Isso mantém a modelagem
explícita, evita que o `ADMIN` acumule objeto de aplicação e permite habilitar
o esquema no Database Actions sem expor a conta administrativa numa
demonstração ao vivo.

## Por que os COMMENT ON importam

O Select AI usa comentário de tabela e de coluna como contexto ao traduzir
pergunta em SQL — é o que o atributo `"comments": "true"` do profile envia
junto do prompt. Por isso `sql/02_criar_tabelas_gold.sql` comenta as 175
colunas, e não apenas as chaves. Erros de semântica devem ser corrigidos no
comentário da coluna. Cortes de negócio ausentes da pergunta devem ser
declarados explicitamente, sem ajustes por tentativa e erro.

Caso concreto: o comentário de `nr_iph_estimado` diz explicitamente que o
índice é pressão estimada sobre capacidade declarada, e **não** ocupação real
de leito. Essa distinção é decisão de contrato do projeto e é exatamente o
tipo de imprecisão que a banca cobra.

## Dados

Os Parquets dos marts não são versionados (`.gitignore`). Gere-os localmente
com `notebooks/02_analise_dados.ipynb` antes da carga; os SHA-256 de
referência estão em `dados/gold/qualidade/METADADOS.json`.

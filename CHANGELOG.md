# Changelog

As releases seguem a política de [`VERSIONAMENTO.md`](VERSIONAMENTO.md).
A versão da release e a versão dos contratos de dados evoluem separadamente.

## 1.0.1 — 29/08/2026

Correção de conteúdo, sem mudança de contrato nem de cálculo.

### Metodologia

A página respondia ao próprio título com as duas metades escondidas.
**Reconciliação** e **limites** subiram para blocos visíveis: são eles que dizem
se o número fecha e o que ele não sustenta. Ficou colapsado o que é material de
consulta.

- **cortes de amostra absorveram os estados de ausência**: o corte diz o que é
  exigido e o estado diz quantas linhas ficaram de fora e por quê, então
  entender um número nulo obrigava a abrir dois blocos;
- a **matriz do Oracle** ficou a um clique: os três cartões acima já concluem o
  que as seis colunas repetiam;
- saiu a nota que explicava que os blocos são colapsáveis e têm rolagem interna:
  descrevia o widget, não o dado;
- **benchmark zerado** saiu da cobertura, porque é estado de ausência e não
  volume, e já aparece com sua contagem no bloco de cortes; entraram
  **hospitais** e a cobertura do **IPE**.

### Ortografia

Todo o texto da metodologia vem do banco, e chegava à tela **sem acento algum**:
"TMH nao possui ajuste de risco clinico", "Internacoes novas", "permanencia
media". Foram **70 strings** corrigidas no módulo ORDS, com teste travando a
acentuação para que não volte em silêncio.

O texto escrito no front já estava correto, e a varredura do texto renderizado
das três páginas não achou erro de acento nem de pontuação. O que continua sem
acento são nomes oficiais de região e hospital, como o DATASUS e o CNES os
gravam — esses não se corrigem.

## 1.0.0 — 29/08/2026

Primeira versão estável. Produto e contrato de dados fecham juntos, que era a
condição declarada para a `1.0`: marcar antes deixaria o marco sem o índice que
o motivou.

O que fecha aqui: o **Índice de Permanência por Especialidade** existindo em
todos os grãos que o produto lê — hospital-especialidade, hospital e região —,
a **comparação com pares fixando o porte**, a FlowIA com **memória de conversa**
e a análise em duas páginas sem repetição entre blocos.

Contrato de dados **`0.5.0`**, aplicado ao Oracle em 28/08/2026, no mesmo dia
do `0.4.0`: o IPE existia num grão só, e o produto precisava dele nas outras
visões.

### O que mudou depois da `v0.4.0`

- **Comparação com pares por porte**: os dois grupos fixam a faixa de leitos
  SUS e variam só o alcance, região ou estado. O modo antigo comparava por
  região sem controlar porte, e punha um hospital de 876 leitos contra um de 9;
- o painel de pares passou a **nomear os pares** e a dizer o critério, o porte,
  o alcance e quanto das internações da região passam por aquele hospital;
- **FlowIA com conversa persistente**: o fio inteiro fica na tela e as duas
  rodadas anteriores acompanham a próxima pergunta, então "e o TMH?" depois de
  "qual o IPH de São Paulo?" responde sobre São Paulo;
- **território sem repetição**: saíram o painel de comportamento sazonal, que já
  vivia na série mensal, e o quadro da região selecionada, que repetia o cartão
  do mapa;
- **mapa legível**: rampa sequencial com o pior par adjacente indo de ΔE 7,3
  para 14,8, e escala que se estica até o máximo observado, então o melhor do
  recorte é sempre o tom mais claro e o pior é sempre o mais escuro;
- a **série mensal do hospital** virou uma lista só, ordenável, que rola sem
  prender a página.

### Adicionado

- **Resumo do IPE por hospital e por região** na Gold, no banco e na API. Por
  hospital, a mediana entre as especialidades comparáveis e quantas ficam acima
  dos pares; por região, o mesmo sobre as combinações hospital-especialidade.
  A mediana e não a média porque a razão tem cauda longa à direita, e uma
  especialidade extrema deslocaria o hospital inteiro;
- coluna **IPE** na lista hospitalar, ordenável, com a contagem de
  especialidades acima dos pares embaixo;
- o IPE entrou na **comparação com pares** do hospital, com a mesma barra de
  posição dos demais indicadores;
- **totais do território** e **cartão do mapa** passaram a mostrar em quantas
  comparações da região a permanência fica acima da dos pares;
- quatro portões novos no `03_validar_carga.sql`, que provam que o índice subiu
  de grão sem perder nem inventar linha: as três contagens fecham em 34.741.

### FlowIA

- **conversa persistente**: o painel guarda o fio inteiro e a pergunta seguinte
  leva as duas rodadas anteriores ao modelo. "Qual o IPH de São Paulo?" seguido
  de "e o TMH?" agora responde sobre São Paulo. Antes cada pergunta apagava a
  anterior da tela e da memória;
- **respostas mais curtas**: regra de concisão no prompt e poda determinística
  do parágrafo final que só repetia o que já tinha sido dito. Uma resposta de
  ranking caiu de 594 para 439 caracteres, sem perder número, unidade nem
  competência;
- IPE, diferença entre IPE e IPR e a ressalva do hospital-dia entram no
  glossário do Select AI e nas respostas locais, que não gastam cota;
- **nome de região deixou de falhar por caixa**: o modelo comparava
  `= 'Sao Paulo'` contra `SAO PAULO` na Gold e devolvia zero linha, dizendo que
  não havia dado. Agora a regra manda usar `UPPER` e `LIKE`.

### Corrigido

- o buffer do prompt do Select AI era `varchar2(4000)` e o texto fixo das regras
  já passava disso somado ao contexto e à pergunta. Passou para `varchar2(32767)`;
- a série mensal do hospital virou uma lista só, que rola e ordena, em vez de
  abrir um segundo painel com as competências restantes.

## `0.4.0` do contrato de dados — 28/08/2026

Contrato de dados **`0.4.0`**, aplicado ao Oracle em 28/08/2026. É a primeira
mudança do contrato desde o `0.3.0`: campos novos numa resposta existente.

### Adicionado

- **Índice de Permanência por Especialidade (IPE)** na Gold, no banco e na API:
  permanência média do hospital naquela especialidade dividida pela dos demais
  hospitais da mesma região, na mesma especialidade e competência, com o
  próprio hospital fora do benchmark. É a construção do IPR um degrau acima no
  grão;
- `hospitais/:cnes/especialidades` passou a expor `ipe`, `ipe_sample_status`,
  `benchmark_admissions`, `benchmark_hospitals` e `average_stay_benchmark`;
- coluna **IPE** na tabela de especialidades do WebApp, ordenável como as
  demais, com a permanência dos pares abaixo da permanência do hospital e o
  motivo escrito quando o índice não é calculável;
- cobertura do IPE na tela de Metodologia: elegíveis, benchmark zerado e
  amostra insuficiente, com fórmula e cortes declarados ao lado dos do IPR;
- quatro portões novos em `03_validar_carga.sql`, que juntos provam que os três
  estados somam as 54.328 linhas do mart — nenhuma linha ficou sem estado;
- `05_adicionar_indice_especialidade.sql`, migração aditiva que acrescenta as
  seis colunas sem recriar o modelo. Recriar derrubaria os marts que o site
  público lê enquanto a carga não termina.

### Sobre os cortes

Os cortes ficaram iguais aos do IPR — 20 internações no hospital, 50 no
benchmark, 3 hospitais pares — e isso foi medido antes de ser decidido. Com
eles, a cobertura vai de **6,9%** (31.452 de 455.054 pares hospital/CID) para
**63,9%** (34.741 de 54.328 linhas do mart de especialidades). Nove vezes mais,
sem afrouxar nada: o ganho veio do grão. Cortes menores foram medidos e
descartados; há teste travando os que ficaram.

### Limite preservado

O IPE compara permanência observada sem ajuste de risco. **Não é medida de
qualidade nem de desfecho clínico**, pela mesma razão que o IPR não é.

## 0.4.0 — 27/08/2026

Publicada em 27/08/2026 como o primeiro marco em que a FlowIA faz parte do
produto público e recebe o contexto da investigação em andamento.

### Adicionado

- **FlowIA no WebApp**: assistente contextual acessível em todas as quatro
  visões, com rota, competência, região, hospital e análise ativa enviados
  separadamente da pergunta. Conceitos simples são respondidos de forma
  determinística; perguntas analíticas seguem para o Select AI governado;
- `POST /assistente/perguntar` no módulo ORDS público e no contrato OpenAPI,
  com guarda de somente leitura, auditoria da resposta, tratamento explícito
  de cota e falha de inferência e contexto territorial controlado;
- identidade visual da **FlowIA**, unificando no mesmo nome as respostas
  locais, governadas e produzidas pelo Select AI;
- avaliador de vinte perguntas humanas, curtas e deliberadamente vagas, com
  consultas de referência e conferência separada de SQL, dados e narrativa;
- território municipal de São Paulo com quatro camadas oficiais do GeoSampa:
  distrito, subprefeitura, Coordenadoria Regional de Saúde e Supervisão
  Técnica de Saúde;
- aliases pesquisáveis de hospitais e busca por nome oficial, nome popular,
  CNES e território. O caso público de aceite é “Ermelino Matarazzo” → Hospital
  Municipal Prof. Dr. Alípio Corrêa Netto, CNES `2082829`.

### Alterado

- `/hospitais` passou a expor, sem misturar conceitos, Região de Saúde SUS e
  os recortes territoriais municipais do estabelecimento;
- o profile e o pacote PL/SQL do Select AI receberam semântica temporal em
  `AAAAMM`, glossário governado e guardas para ranking, comparação mensal,
  ordenação e limite;
- a pergunta F12, “quem piorou de uns meses pra cá?”, passou a usar intenção
  governada: interpreta “uns meses” como três competências, compara o IPH no
  mesmo grão e narra exatamente os dados auditados, sem nova inferência;
- a interface recebeu a identidade azul-marinho, azul e verde da apresentação,
  mantendo fonte, amostra, origem e limites próximos aos números.

### Medido

- F12 aprovada por inteiro: SQL equivalente à referência, mesmos cinco rótulos
  na mesma ordem e narrativa com os três primeiros rótulos na ordem correta;
- suíte Python hermética: 194 testes aprovados e 69 integrações puladas;
- Playwright: 38 testes herméticos e 2 testes ao vivo aprovados;
- contrato de desenvolvimento e público: 46 verificações aprovadas em cada;
- reconciliação amostral de desenvolvimento e pública: 8 endpoints e 30.988
  comparações em cada módulo, sem divergência;
- pacote Oracle válido em 4 de 4 objetos e preflight público aprovado em 12 de
  12 verificações.

## 0.3.1 — 25/08/2026

Publicada em 25/08/2026 depois dos portões de escrita, testes e lint.

### Adicionado

- roteiro de Select AI executável, em `src/medflow/select_ai/`, com treze
  perguntas em cinco blocos de dificuldade crescente. Oito têm SQL de
  referência e são conferidas **por execução**: as duas consultas rodam e as
  respostas são comparadas pela sequência ordenada de rótulos. As outras cinco
  testam armadilha, conversação e a diferença entre `chat` e `narrate`;
- `make select-ai-revalidar`, que roda o roteiro e regrava
  `docs/qualidade/REVALIDACAO_SELECT_AI.md`. Falha em regressão, não em
  limitação já medida e documentada — e avisa quando uma limitação marcada
  para de acontecer;
- `docs/qualidade/LEITURA_SELECT_AI.md`, a leitura do que a evidência mostra e
  o que fazer antes da banca. Separado da evidência de propósito: aquela é
  reescrita a cada execução, esta não;
- `tests/test_select_ai.py`: o guarda que decide se o SQL vindo do modelo pode
  tocar o banco, e a varredura de terminologia. Rodam sem Oracle. Com Oracle,
  acrescentam a paridade entre as duas implementações da mesma regra, Python e
  PL/SQL — regra duplicada é regra que diverge em silêncio.

- `db/apex/`: a demonstração de Select AI com cara de produto. O pacote
  `medflow_select_ai` carrega a regra — guarda de leitura sobre o SQL do
  modelo, varredura de terminologia sobre a narrativa **e sobre os apelidos de
  coluna**, que no APEX viram cabeçalho na tela. Uma pergunta faz uma rodada de
  modelo e grava uma linha; as três regiões da página leem dessa linha, então o
  relatório e o texto ao lado nunca descrevem consultas diferentes. O
  `README.md` da pasta traz o roteiro de montagem, e `01_criar_workspace.sql`,
  o que precisa rodar como ADMIN;
- `.github/workflows/heartbeat.yml`, que consulta diariamente o `/status`, uma
  linha real dos marts e o GitHub Pages. A chamada ao ORDS executa SQL e evita
  a hibernação por inatividade do Always Free; se o banco já estiver parado, o
  workflow falha e imprime o procedimento de reinício;
- `make preflight`: doze verificações contra o produto publicado, sem `.env`,
  wallet ou Gold local, mais a lista do que ainda precisa ser conferido à mão
  antes da banca;

- `make estilo` e `scripts/estilo.py`: a escrita dos documentos versionados
  passa a ser conferida no build. Travessão em prosa corrida, parágrafo que é
  lista escrita como texto, frase-clichê e advérbio de reforço reprovam. Os
  registros datados ficam isentos, e a lista está no topo do script; as regras
  estão em `CONTRIBUTING.md`, seção Escrita;
- `docs/entrega_sprint_2/QA_BANCA.md`: vinte perguntas e respostas curtas para
  alinhar os cinco integrantes sobre produto, dados, Oracle, evidências e
  limites antes da banca;

### Alterado

- `executar_sql.py` passou a reconhecer `create package`, `function`,
  `procedure`, `trigger` e `type` como blocos terminados por barra, e a ignorar
  `show`. Antes ele quebrava um pacote no primeiro `;` do corpo e mandava um
  fragmento ao banco;
- `COMMENT ON` das três tabelas regionais e das duas colunas de IPH: passam a
  declarar o grão, pedir agregação antes do ranking e proibir o vocabulário de
  ocupação nome por nome. Dois deles ainda diziam `2026-05` e `29
  competencias`, defasados desde que o recorte avançou;
- a varredura de terminologia parou de reprovar a resposta certa. Uma boa
  recusa precisa nomear o que recusa — "as bases **não** fornecem dado em
  **tempo real**" contém o termo —, então a saída do `chat` saiu da varredura e,
  dentro do `narrate`, mencionar deixou de ser afirmar.
- documentação corrente e dossiê do time alinhados ao estado pós-`v0.3.0`:
  roteiro de 13 perguntas, heartbeat ativo, base APEX opcional e pendências
  restritas aos artefatos acadêmicos e à montagem da demonstração.
- GitHub Actions oficiais atualizadas para `v7`, removendo o runtime Node 20
  que o runner já precisava forçar para Node 24.
- passada de escrita em 24 documentos: 153 travessões de prosa viraram vírgula,
  ponto, dois-pontos ou parênteses, e quatro parágrafos que eram lista escrita
  como texto viraram bullets. Os geradores do Select AI foram corrigidos junto,
  para a evidência não voltar com o vício a cada `make select-ai-revalidar`;
- abertura do `README.md` reescrita: slogan "Onde investigar primeiro", o
  problema dito do lado do gestor, a persona regional, os três formatos de dado
  e o acordo entre Oracle ao vivo e os dez snapshots de contingência. Saiu o
  "Foco atual", que anunciava obra inacabada a uma semana da entrega;
- quatro links de release apontavam para o `fiap-1tscoa`, que é privado, e
  devolviam 404 para quem não é o dono. Passam a apontar para as tags deste
  repositório, que respondem 200 sem autenticação;
- `VERSIONAMENTO.md` dizia que a `v0.1.0` foi "espelhada neste repositório" e
  que a "publicação original" era o `medflow`. O texto foi escrito de dentro do
  `fiap-1tscoa` e inverteu de sentido na migração de 08/08: o original é este
  repositório;
- `db/views/` pulava do `07` para o `09`. Renumerado. Não faltava arquivo: a
  rota `hospitais/:cnes/serie` é servida por SQL embutido no módulo ORDS;
- `CONTEXTO_TIME.md` e `PENDENCIAS.md` alinhados ao estado real: a página APEX
  foi montada em 25/08 e o PPT existe, os dois ainda descritos como pendentes.

### Removido

- o recorte de 2022-2023 em `data/legado/` e `docs/qualidade/figuras/legado/`,
  mais os dois `contracts/INVENTARIO_PRE_*.json`. A revisão de requisitos manda
  regenerar aquele recorte, e a proveniência segue nas tags `v0.1.0` e
  `pre-reorg`, na branch `arquivo/v0-2026-07` e no histórico do Git. Registrado
  em `docs/decisoes/DECISOES.md`, seção 12;
- junto com eles, a checagem de preservação por SHA-256 do `validar.py`, que
  existia para provar que a migração de julho não perdeu arquivo e que exigia
  justamente o legado. O que fica é mais forte que um hash: contratos de
  camada, `MANIFESTO.json` e invariantes entre camadas.

### Medido

Na execução de 23/08/2026, seis das oito perguntas conferidas devolveram
exatamente a resposta da referência. As três falhas restantes são limitações do
modelo, não do roteiro, e estão documentadas: ele não agrega antes de ranquear
em marts mensais, e aceita o vocabulário errado que vem na pergunta. O
`COMMENT ON` governa bem a geração de SQL e mal a redação da narrativa — que é
a razão pela qual o Select AI é demonstração controlada e as telas do produto
usam consultas determinísticas sobre a Gold.

## 0.3.0 — 23/08/2026

### Adicionado

- `CONTRIBUTING.md`: primeiro uso, fluxo de trabalho, comandos por área e
  definição de pronto. O ciclo normal de desenvolvimento não depende de
  credenciais Oracle, e agora isso está escrito em algum lugar;
- `make pipeline`, que encadeia Bronze, Silver e Gold. A geografia sai junto
  porque o comando `gold` já a executa — a receita anterior,
  `make bronze silver gold geografia`, rodava a geração geográfica duas vezes;
- `make setup-py` e `make web-browser`, e um `make setup` que passou a chamar
  os dois: venv, instalação editável, `npm ci` e o Chromium do Playwright.
  Antes, `make setup` num clone novo deixava o frontend e os testes de fora, e
  reexecutá-lo depois do venv existir não atualizava nada;
- `make test-completo`, que acrescenta ao `make test` as integrações ao vivo:
  os dois testes Playwright `@live`, o contrato contra a API e a amostra da
  reconciliação;
- `scripts/revalidar_select_ai.py`, que repete as cinco perguntas da
  demonstração contra o produto final e grava
  `docs/qualidade/REVALIDACAO_SELECT_AI.md` com o SQL de referência, o
  resultado no banco, o `showsql` e o `narrate` de cada uma. Usa
  `DBMS_CLOUD_AI.GENERATE` em vez do atalho `select ai`, que depende do
  translation profile do cliente, e falha se a narrativa tratar o IPH como
  ocupação real ou o dado como tempo real.

- **link público da entrega**, em <https://lucas-d-s-1.github.io/medflow/>:
  site estático no GitHub Pages falando direto com o Autonomous Database, sem
  servidor no meio;
- módulo ORDS de produção `medflow` em `api/v1`, aceitando só a origem
  publicada e respondendo 403 às demais. `db/ords/04_modulo_medflow_prod.sql`
  não redeclara os dez handlers: clona o `medflow_dev` dos metadados do ORDS e
  recusa publicar se os dois divergirem, comparando o SQL byte a byte;
- `ORDS_API_PATH`, que aponta reconciliação, teste de contrato e gerador de
  snapshots para qualquer um dos dois módulos. Contra `api/v1`: 42 checagens do
  contrato e 31.792 comparações campo a campo, sem divergência;
- `make ords-publicar`, `make contrato-publico` e `make reconciliar-publico`;
- `web/src/lib/api/base.ts`: o prefixo da API num lugar só, no lugar dos dez
  caminhos escritos à mão;
- `.github/workflows/pages.yml`: build e deploy a cada push que toque `web/`,
  com um passo final que busca o HTML publicado e o JS que ele referencia —
  um deploy verde não prova que o link abre.

- `web/`: aplicação React + Vite com as quatro visões do produto
  (`/regional`, `/fluxos`, `/hospital`, `/metodologia`), construída em dez
  fatias verticais — cada fatia entrega view SQL, handler ORDS, snapshot de
  contingência, interface e teste, e só é commitada após revisão independente;
- dez endpoints somente leitura em `api/dev/v1`, todos `GET`, sobre nove views
  de projeção pura: `status`, `metodologia`, `regioes/resumo`,
  `regioes/{id}/serie`, `fluxos`, `icsap`, `hospitais`,
  `hospitais/{cnes}/serie`, `hospitais/{cnes}/especialidades` e
  `hospitais/{cnes}/cids`;
- snapshot local de contingência por endpoint: quando o Oracle não responde, a
  tela mostra os dados versionados com selo explícito e recusa trocar de
  recorte, em vez de misturar fontes;
- suíte Playwright cobrindo renderização contra a Gold, estados
  de erro, ausência legítima, contingência, preservação de filtros na URL e
  ausência de rolagem horizontal em 1280x800 e 390x844;
- diretório `db/` com o setup reproduzível do Autonomous AI Database,
  sem segredos versionados;
- `db/schema/01_criar_usuario_medflow.sql`: esquema de aplicação `MEDFLOW` separado
  do `ADMIN`, com `DWROLE`, quota e acesso ao Database Actions;
- `db/schema/02_criar_tabelas_gold.sql`: modelo dimensional com 2 dimensões e 7
  marts, chaves primárias, estrangeiras, índices e 175 colunas comentadas;
- `carregar_gold.py`: carga idempotente em ordem de dependência, com
  `--conferir` e `--somente`; 597.725 linhas no recorte atual;
- `db/schema/03_validar_carga.sql`: reconciliação de 36 métricas contra o contrato
  `0.3.0`, mais seis verificações de integridade;
- `db/select_ai/04_select_ai.sql`: Resource Principal OCI, profile, cinco perguntas da
  demonstração e o SQL de referência de cada uma;
- `docs/qualidade/VALIDACAO_ORACLE_SELECT_AI.md`: evidências da conexão, carga,
  reconciliação, rankings e respostas do Select AI.
- `src/medflow/icsap.py`: classificação versionada dos 19 grupos da Portaria
  SAS/MS 221/2008;
- `src/medflow/ipca.py`: leitura do número-índice IPCA/IBGE preservado na Bronze;
- marts de fluxo assistencial e ICSAP por região de residência;
- `src/medflow/oracle/executar_sql.py`: executor SQL/PLSQL pela conexão mTLS existente.

### Alterado

- `ARQUITETURA.md` foi reescrito como mapa técnico curto, mas as seções de
  segurança e privacidade, disponibilidade e contingência, decisões que evitam
  complexidade, custos e referências voltaram ao documento: elas não existiam
  em nenhum outro arquivo do repositório e são conteúdo avaliado da entrega.

- `make test` passou a ser hermético: Python mais os testes de frontend que não
  tocam o Oracle. É a mesma base que a CI executa, então "passou aqui" e
  "passou lá" voltaram a significar a mesma coisa. O que exige `.env`, wallet
  ou banco no ar mora em `make test-completo`;
- `README.md` aponta para o pacote — `src/medflow/bronze/`, `silver/` e
  `gold.py` — onde ainda nomeava os três notebooks como etapas do pipeline.
  Eles deixaram de ser o motor na fatia 4; o README ainda dizia que eram;
- `ARQUITETURA.md` condensado em cinco seções: fluxo end-to-end, decisões,
  status atual e a construção técnica de cada etapa;
- `tests/README.md`, `web/README.md` e `data/README.md` acompanham os alvos
  novos; o comentário de recorte do `pyproject.toml` corrigido de 2026-05 para
  o 2026-06 que a fatia 5b entregou;

- documentação de retomada alinhada à ordem de fechamento: webapp público,
  validação dos dados do produto, revalidação do Select AI e apresentação;
- links históricos de `v0.1.0` sincronizados com a release espelhada no
  repositório consolidado;
- `.env.example` passa a apontar para o usuário `MEDFLOW`, não `ADMIN`, e
  documenta os aliases do workload Lakehouse;
- `requirements.txt` inclui `pandas`, `pyarrow` e `python-dotenv`, necessários
  à carga e ao uso seguro do `.env`;
- `README.md` do `db/` virou runbook de seis passos com os riscos de
  Always Free e de disponibilidade do Select AI;
- comentários de negócio e perguntas do Select AI explicitam os cortes de
  100 hospital-mês e 10 combinações hospital-CID.
- taxa populacional corrigida para usar região de residência no numerador;
- CMI passa a oferecer série nominal e real corrigida por IPCA;
- permanência média é persistida diretamente nas visões mensais;
- fluxos distinguem atendimento intrarregional, inter-regional em SP e entrada
  de residentes de outras UFs, sem alegar evasão para fora de SP.

### Reorganização do repositório — 08 a 10/08/2026

Este repositório passou a ser o de entrega. A linhagem original da `v0.1.0`
está preservada na branch `arquivo/v0-2026-07` e nas tags `v0` e `v0.1.0`.

**Fatia 4 — Bronze e Silver saem dos notebooks.** A ingestão, a conversão, o
manifesto, as dimensões, os fatos e os de/paras viraram `src/medflow/bronze/`
e `src/medflow/silver/`. O portão foi objetivo: SHA-256 idêntico ao inventário
congelado na fatia 0.

**Fatia 5 — parametrização e logging.** Recorte, UF e caminhos saem do
ambiente; `logging` estruturado com etapa e competência em cada linha
substitui os `print`.

**Fatia 5b — o recorte avançou para 2026-06.** O DATASUS publicou junho e a
decisão foi incluí-lo. O recorte oficial passa a ser **2024-01 a 2026-06, 30
competências**:

| Métrica | 29 competências | 30 competências |
|---|---:|---:|
| AIH aprovadas | 7.034.961 | **7.284.476** |
| Internações novas | 6.905.441 | **7.150.693** |
| Hospitais · CIDs | 653 · 9.494 | **655 · 9.513** |
| ICSAP | 953.656 | **988.453** |
| Evasão = atração | 906.060 | **939.143** |
| Linhas no Oracle | 585.296 | **597.725** |

Zero lacunas de de/para mesmo com 19 CIDs e 2 hospitais novos. Três defeitos
só apareceram porque o recorte se mexeu: `ORA-12860` na recarga, a checagem de
preservação misturando artefatos imutáveis com saídas do pipeline, e os
esperados congelados em `03_validar_carga.sql`.

**Fatia 6 — testes em três níveis.** A suíte foi de 24 para 155 testes:

- **unidade** (`tests/test_indicadores.py`): cada fórmula nas bordas —
  denominador zero, benchmark vazio, hospital sem leito SUS declarado,
  competência ausente no IPCA, internação que cruza o mês;
- **contrato** (`tests/test_contratos_camadas.py`): cada camada contra o seu
  JSON, com o validador exercitado também no caminho de reprovação;
- **reconciliação** (`tests/reconciliacao/`): a API ORDS contra a Gold, campo
  a campo, posicional e sem tolerância. Lê do SQL versionado o mapa de campos,
  a ordenação, o teto de paginação e a escala decimal, em vez de guardar cópia
  dos 150 campos. Dois modos: amostra e varredura completa.

A varredura completa sobre as 30 competências deu **8.403.103 comparações e
zero divergências**, em 25.303 recortes e 25.611 requisições. O que antes era
um evento manual de dez fatias virou `make reconciliar-completo`.

O 429 do ORDS derrubou a primeira tentativa: o recuo era por requisição, mas o
limite é global — enquanto uma thread esperava, as outras duas seguiam batendo.
O freio passou a ser do cliente inteiro, com espaçamento adaptativo. Estabilizou
em 1,27 s entre chamadas e absorveu 258 recuos sem perder nenhuma.

Três defeitos encontrados pelos testes novos:

1. `PERIODO_FINAL_PADRAO` ainda era `2026-05`, então um clone limpo não
   reproduzia o recorte entregue. O recorte estava escrito em quatro lugares;
   virou uma constante, conferida contra o `MANIFESTO.json` da Bronze;
2. o `VALIDACAO_TECNICA.md` trazia os totais como literais e contradizia os
   próprios dados; passou a ser derivado dos metadados;
3. `qt_municipio` vem de uma dimensão, não do mart, e teria sido pulado em
   silêncio pelo comparador.

**Fatia 7 — o contrato da API.** `contracts/openapi.yaml` descreve os 10
endpoints: parâmetros com formato e teto, envelope, itens campo a campo e
comportamento de erro. `tests/test_openapi.py` o confere contra o SQL dos
handlers e contra a API viva, para que o contrato não vire uma terceira versão
da verdade ao lado do SQL e dos tipos TypeScript.

Três defeitos apareceram ao escrever o contrato:

1. **`origem` em `/fluxos` e `regiao` em `/icsap` passam a ser obrigatórios.**
   Omitidos, os endpoints devolviam 200 somando fluxos e grupos de **todas** as
   regiões numa página só, com o contexto nulo — 1.015 e 1.178 linhas de
   territórios diferentes. Ausência de filtro não é filtro vazio;
2. **`cnes` em `/hospitais` é aceito, validado e ignorado** pelo `where`.
   Declarado `deprecated` no contrato em vez de silenciado. Não corrigido: o
   plano não listou esse endpoint;
3. **`competence` não estava sendo reconciliado.** As séries montam esse campo
   por concatenação, e o extrator da fatia 6 só enxergava projeções diretas de
   coluna. Campos derivados agora entram na comparação, e um teste pergunta à
   API quais chaves ela devolve para fechar o buraco.

Parâmetro inválido continua devolvendo **404 com HTML**, não 400 com JSON: os
handlers são consultas SQL, e uma consulta SQL não escolhe o código HTTP. O
contrato documenta o motivo em vez de descrever um 400 que não existe.

**Fatia 8 / B.4 — gerador de fixtures.** `web/scripts/gerar-mocks.ts` regrava
os dez snapshots a partir da API ao vivo (`make fixtures`), com a competência
lida do manifesto da Bronze. As fixtures deixaram de descrever 2026-05.

Quatro defeitos, três deles no produto:

1. **`gold_updated_at` era literal dentro de `vw_api_metodologia`** e ficou
   congelado em 01/08 enquanto a Gold era regerada em 10/08 — a tela anunciava
   uma data que o dado contradizia. Passa a vir da tabela `gold_manifesto`,
   escrita por `carregar_gold.py` a cada carga;
2. **`FluxosView` e `HospitalView` cravavam a competência** no texto do estado
   de contingência ("O snapshot preserva JUNDIAI em 05/2026"), contradizendo os
   números logo abaixo. Passam a derivar do dado exibido;
3. **o passo de fixtures da CI nunca poderia passar**: `reancorar_fixtures.py`
   levantava `FileNotFoundError` num runner limpo, porque `data/` é gitignored;
4. 34 asserções herméticas cravavam a competência e 24 cravavam também os
   números. Passam a derivar da fixture; a suíte foi de 31 para 32 testes.

**Limpeza para publicação.** O repositório saiu de 216 para 205 arquivos e de
17,7 para 15,2 MB, com uma pergunta só: o que um avaliador ou alguém que reusa
o projeto precisa ver? Saíram a configuração das ferramentas de IA, o material
de curso da Sprint 1, a evidência da v0.1.0, um `requirements-geografia.txt`
órfão e uma cópia congelada de um relatório que é gerado.

Os três documentos de arquitetura — `arquitetura.md`, `ARQUITETURA_CAMADAS.md`
e `PIPELINE.md`, 838 linhas descrevendo a mesma coisa em recortes diferentes —
viraram `ARQUITETURA.md`. Fundir revelou que a tabela "estado real versus
arquitetura-alvo" ainda dizia *Proposto* para views, endpoints, webapp e
snapshot, todos entregues desde 02/08.

Duas remoções previstas no plano **não** foram feitas: `figuras/legado/` e os
CSVs de 2022-2023 são carregados pela checagem de preservação, que casa
artefatos por SHA-256. Removê-los derrubaria 24 dos 38 artefatos exigidos.

### Validado em 01/08/2026

- conexão mTLS como `MEDFLOW`;
- 9 tabelas, 175 colunas comentadas e 10 índices secundários;
- 585.296 linhas carregadas e conferidas;
- 36/36 métricas `ok` e seis verificações de integridade vazias;
- 6.846.665 internações de residentes SP, 906.060 fluxos inter-regionais e
  953.656 ICSAP reconciliadas;
- bateria original do OCI Generative AI validada; duas perguntas novas ficam
  para a revalidação do Select AI após o produto.

### Validado em 02/08/2026 — webapp

Cada uma das dez fatias foi revisada contra a Gold antes do commit, percorrendo
o endpoint inteiro e comparando campo a campo com os parquets em
`dados/gold/marts/`:

| Endpoint | Cobertura | Comparações |
|---|---|---:|
| `fluxos` | 28.492 pares origem–destino | 372.470 |
| `icsap` | 34.162 grupos | 226.548 |
| `hospitais` | 18.690 hospital-competências | 347.208 |
| `hospitais/{cnes}/serie` | 18.690 pontos em 653 hospitais | 324.913 |
| `hospitais/{cnes}/especialidades` | 52.525 linhas | 718.760 |
| `hospitais/{cnes}/cids` | 447.334 linhas | 6.267.240 |

**8.257.139 comparações no total, zero divergências.** O teste é exato, não por
tolerância: a API tem que devolver a Gold arredondada para a escala declarada
da coluna Oracle. A comparação é posicional contra a parquet ordenada pelas
mesmas chaves do `order by` de cada handler, o que prova a ordenação declarada
em cada contrato.

Também validado: `npx tsc -b --noEmit` e `npm run build` limpos; Playwright
31/31; dez handlers no banco, **todos `GET`**, `user_ords_enabled_objects`
igual a zero; bundle de produção sem host Oracle, wallet ou credencial; nenhuma
seção passando de metade da altura da página em 1280x800 nem em 390x844.

### Corrigido durante a revisão do webapp

- competência anterior à janela de dados era exibida como falha do endpoint,
  quando o endpoint respondia 200 com `count` zero. O cliente passou a
  classificar os blocos de contexto em completo, ausente e inválido, e a tela
  distingue ausência legítima de erro em todos os endpoints;
- o `limit` padrão declarado em `fluxos` era inalcançável: o
  `p_items_per_page` do módulo ORDS preenche o bind `:limit` antes do SQL, e o
  `coalesce` do handler nunca disparava. Declaração alinhada ao observável;
- `benchmark_zero` estava rotulado como "sem hospital par na região" quando
  significa o oposto: existem de 1 a 10 hospitais pares, mas a permanência
  média deles é zero, o que tornaria o IPR uma divisão por zero;
- a lista de hospitais numa seção única passava de metade da altura da página;
  foi dividida em prévia e bloco de menor volume;
- o recorte de diagnósticos elegíveis era um controle dentro do painel que ele
  mesmo refazia, e sumia da tela durante a nova requisição.

## 0.2.0 — publicado em 29/07/2026

### Adicionado

- camada Gold com TMH, IPR, IS, CMI e IPH estimado;
- população IBGE 2022 por município e região;
- GeoJSON e TopoJSON das 62 regiões de saúde;
- contratos JSON e dicionários gerados para Bronze, Silver e Gold;
- validação integrada de esquema, fórmulas, hashes e geografia.

### Alterado

- Bronze separada entre origem imutável, DBF intermediário e Parquet;
- Silver restrita a dimensões e fatos;
- nomes Silver padronizados em `snake_case` com prefixos semânticos;
- `fato_leitos_mensal` renomeada para `fato_leito_mensal`;
- caminhos de notebooks executados, figuras e referências reorganizados.

### Incompatibilidades

- consumidores da Silver `0.1.x` precisam aplicar
  `contratos/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv`;
- tabelas `base_hospital_*` não existem mais na Silver;
- artefatos de 2022–2023 ficam somente em `data/legado/`;
- o proxy baseado em `QT_DIARIAS` não alimenta o IPH Gold.

## 0.1.0 — 29/07/2026

- pipeline Bronze/Silver reproduzível para 2024-01 a 2026-05;
- domínios, qualidade e batch mensal validados;
- primeira publicação pública do MedFlow.

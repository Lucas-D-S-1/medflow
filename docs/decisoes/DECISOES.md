# DECISÕES — Challenge Oracle: MedFlow

Atualizado em 01/08/2026. As decisões abaixo substituem interpretações
anteriores quando houver conflito.

## 1. Escopo

- São Paulo, competências solicitadas de 2024 a 2026.
- A execução usa todas as competências comuns já publicadas para SIH/RD e
  CNES/LT. O recorte efetivo é **2024-01 a 2026-06 (30 meses)**, avançado em
  09/08/2026; 2026 é um período parcial.
- A descoberta remota e o cache incremental permitem que o mesmo batch mensal
  incorpore novas competências até 2026-12 sem alterar o código.
- Fontes públicas: SIH/RD, CNES/LT, API de Dados Abertos do Ministério da
  Saúde, tabelas CID-10 do DATASUS, IPCA/SIDRA e referências do IBGE/CONCLA.
- Análise histórica; ML e predição permanecem fora do escopo.
- O atraso de publicação do DATASUS é característica do produto retrospectivo.

Volumetria Bronze validada:

- SIH/RD: 7.284.476 linhas e 117 colunas;
- CNES/LT: 251.457 linhas e 31 colunas;
- IBGE: 645 municípios.

## 2. Arquitetura de dados

```text
00_extracao_dados.ipynb       → Bronze
01_engenharia_dados.ipynb     → Silver
02_analise_dados.ipynb        → Gold, implementada e validada
Oracle Autonomous DB + ORDS   → armazenamento/serving
Webapp público + Select AI    → consumo
```

### Bronze

Ingere e preserva. Não aplica regra de negócio, filtro, de/para ou imputação.
Pode descomprimir, serializar e acrescentar linhagem técnica. O
`MANIFESTO.json` registra fonte, esquema, volumetria e hashes.

### Silver

Contém toda tipagem analítica, de/para, dimensão, fato, flag de qualidade e
reconciliação. Publica somente dimensões e fatos com nomes canônicos.

### Gold/análise

Contém fórmulas, benchmarks, estados de amostra, marts e geografia. O contrato
`0.3.0` mantém o núcleo hospitalar e acrescenta residência, fluxo assistencial,
ICSAP, permanência média e CMI real corrigido pelo IPCA.

## 3. Unidade de contagem do SIH

Uma linha mensal da base reduzida é uma **AIH aprovada**, não necessariamente
uma nova internação.

- `IDENT=1`: AIH normal / internação nova;
- `IDENT=5`: continuação de longa permanência.

No recorte:

- 7.284.476 AIHs aprovadas;
- 7.155.059 números de AIH distintos;
- 7.150.693 internações novas;
- 133.783 registros de continuação.

Decisão: preservar `N_AIH` e `IDENT` no fato e expor contagens separadas. Os
indicadores usam internações novas; continuações aparecem separadamente no
CMI. Medidas populacionais usam região de residência, enquanto medidas de
oferta usam a região do hospital.

## 4. Permanência e diárias

`QT_DIARIAS` e `DIAS_PERM` não são equivalentes:

- `QT_DIARIAS`: diárias faturadas;
- `DIAS_PERM`: permanência registrada.

Somente 70,0547% das linhas têm valores iguais; 181.584 registros têm
`QT_DIARIAS=0` e `DIAS_PERM>0`.

Decisões:

- IPR e tempo médio usam `DIAS_PERM`;
- permanência zero não é excluída automaticamente;
- `QT_DIARIAS` é preservado e recebe nome explícito de faturamento;
- filtros viram regras analíticas documentadas, nunca descarte silencioso.

## 5. Situação dos cinco índices

| Índice | Definição aprovada | Situação |
|---|---|---|
| TMH | óbitos / internações novas | Gold validada; mínimo 30 |
| IPR | permanência hospital/CID / benchmark regional sem o hospital | Gold validada; cortes 20/50/3 |
| IS | 2026 / média do mesmo mês em 2024–2025 | Gold validada para jan–mai/2026 |
| CMI | valor aprovado / internações novas | nominal preservado e real por IPCA; continuações separadas |
| IPH | pacientes-dia reconstruídos / leitos-dia declarados | Gold validada como pressão estimada |

### Contratos territoriais do 0.3.0

- taxa populacional usa internações de residentes da região atendidos em SP;
- produção hospitalar continua agrupada pela região do estabelecimento;
- evasão significa somente deslocamento para outra região paulista observado
  no RD-SP; saídas para outras UFs não são observáveis nesse recorte;
- atração separa residentes de outra região de SP e residentes de outra UF;
- ICSAP segue os 19 grupos da Portaria SAS/MS 221/2008 e é calculada por
  residência;
- a taxa ICSAP usa população residente; a participação no total observado não
  é rotulada como a proporção clínica oficial;
- permanência média é persistida diretamente antes da interpretação do IPR.

### IPH

O cálculo histórico:

```text
SUM(QT_DIARIAS) / (leitos_SUS × dias_do_mês)
```

é preservado somente como `proxy_iph_diarias_faturadas`. Ele reproduz a média
`0,472168`, mas não prova ocupação física porque:

- `QT_DIARIAS` é faturamento;
- 18,7633% das competências divergem do mês da saída;
- 15,0798% das internações cruzam mês;
- a soma na competência não distribui a ocupação no calendário.

Decisão vinculante: não chamar o proxy histórico nem o IPH Gold de “ocupação
real”. O contrato atual não usa faixas históricas Normal/Atenção/Crítico;
denominador zero recebe IPH nulo.

## 6. Domínios

### Especialidade

Os 15 códigos `ESPEC` observados têm cobertura de de/para de 100%. `ESPEC` não
é fonte para recorte de UTI; usar `MARCA_UTI` e `UTI_MES_TO`, com as ressalvas
documentadas.

### Idade

Preservar `IDADE` junto de `COD_IDADE`. A interpretação depende da unidade:
dias, meses, anos ou adicional acima de 100 anos.

### Município

O SIH usa código de seis dígitos e o IBGE, sete. A dimensão municipal mantém
ambos; o dígito verificador vem da referência IBGE.

### Região de saúde

A região analítica usa o código oficial de cinco dígitos, nome e macrorregião
da referência DEMAS/MS por município. A região contida no CNES/LT é preservada
separadamente para auditoria; seus quatro conflitos não alteram a referência
analítica. A cobertura do fato passou a 100%, sem imputação arbitrária.

### Demais referências

- `NAT_JUR`: CONCLA/IBGE 2021, 21/21 códigos observados; o código `1228`,
  surgido no perfil mais recente de um hospital, foi incorporado como
  “Consórcio Público de Direito Privado”;
- `DIAG_PRINC`: DATASUS CID-10 2008 e complementos oficiais do MS, cobrindo
  **todos** os códigos observados — a cobertura é asserção do pipeline, não
  contagem copiada: quando o recorte avançou e 19 CIDs novos entraram, ela
  passou sem intervenção;
- `MARCA_UTI`: MS/DATASUS e CEM, 14/14 códigos observados;
- nome e esfera atuais: API oficial CNES, cobrindo todos os hospitais observados.

Nome e esfera são fotografia atual, explicitamente marcados como não
históricos. O `ESFERA_A` bruto do CNES/LT permanece vazio e não é preenchido
retroativamente.

## 7. Personas e storytelling

Persona primária: secretário(a) de saúde, com visão regional e alocação de
recursos.

Persona secundária: gestor hospitalar, comparando seu estabelecimento com pares.

Qualquer indicador aprovado deve ser apresentado em quatro camadas:

1. valor atual;
2. comparação com período anterior;
3. padrão histórico;
4. interpretação de gestão.

## 8. Segurança e reprodutibilidade

- FTP direto é a fonte operacional. O notebook descobre a interseção de
  competências SIH/RD e CNES/LT dentro de 2024–2026.
- Downloads e cadastros usam cache incremental; uma nova competência promove
  automaticamente um novo recorte consolidado.
- Reexecuções do mesmo recorte preservam os Parquets, salvo
  `SOBRESCREVER=True`.
- Arquivos em construção usam sufixo `.parcial`.
- A Silver só promove dados após reconciliar totais e domínios.
- todo material anterior foi isolado em `data/legado/` e não alimenta o
  pipeline `0.3.0`.

## 9. Infraestrutura Oracle

Decidido em 30/07/2026, ao provisionar o banco.

### 9.1 Tenancy — institucional, confirmada

A pendência de localizar o acesso OCI do challenge está **encerrada**. O
console autentica `rm572207@fiap.com.br` na tenancy `rm572207`, região home
GRU, sem tenant de origem. É o acesso institucional FIAP/Oracle, não uma conta
pessoal. Nenhuma conta Always Free particular foi criada, como manda a decisão
tomada após a mentoria de 07/06/2026.

### 9.2 Workload — Lakehouse

O banco `MEDFLOW` usa o workload **Lakehouse**, e isso não é um desvio do
Autonomous Data Warehouse: no 26ai serverless, os workloads disponíveis são
Lakehouse, Transaction Processing, JSON Database e APEX Service. "Data
Warehouse" não existe mais como opção, e a
[documentação oficial](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/about-autonomous-database-workloads.html)
descreve o Lakehouse como "an evolution of Oracle's Autonomous Data Warehouse
that adds support for open-source technologies like Apache Iceberg".

É o workload adequado ao MedFlow porque o projeto tem carga em lote, 7.284.476
registros de AIH, transformações Bronze/Silver/Gold, consultas analíticas e
agregações, modelo dimensional com fatos e dimensões, indicadores e dashboards,
e a possibilidade futura de consultar Parquet/Iceberg direto no Object Storage
sem carga intermediária.

Consequência prática: os aliases do `tnsnames.ora` seguem o padrão analítico —
`medflow_tpurgent`, `medflow_tp`, `medflow_high`, `medflow_medium` e
`medflow_low`. O `_low` serve o teste de conexão e o BI; o `_medium`, que roda
consultas em paralelo, serve a carga em lote.

### 9.3 Instância

| Item | Valor |
|---|---|
| Versão | 26ai |
| Tipo | Always Free |
| Região | Brazil East, `sa-saopaulo-1` |
| Autenticação | mTLS obrigatório |
| Acesso | seguro de qualquer lugar |
| Backup | retenção de 60 dias |

Always Free é suficiente: a Gold ocupa cerca de 10 MB contra os 20 GB da cota.
O risco não é espaço, é hibernação por inatividade — instância Always Free é
parada após dias consecutivos sem conexão. Conectar ao menos uma vez por semana
até a entrega, e confirmar o estado `Disponível` na véspera da apresentação.

### 9.4 Esquema separado do ADMIN

A Gold é carregada no esquema `MEDFLOW`, com `DWROLE`, quota e privilégios
mínimos. O `ADMIN` é usado apenas no setup. Motivo: manter a modelagem
explícita, não acumular objeto de aplicação na conta administrativa e poder
habilitar o esquema no Database Actions sem expor o `ADMIN` numa demonstração
ao vivo.

### 9.5 Comentários de tabela e coluna são parte do produto

As 175 colunas do modelo recebem `COMMENT ON`. Não é documentação decorativa:
o Select AI envia comentário de tabela e coluna ao modelo como contexto,
via atributo `"comments": "true"` do profile. Quando o Select AI errar a
semântica de uma coluna, a correção é melhorar o comentário. Cortes de negócio
que não aparecem na pergunta devem ser declarados explicitamente uma vez, não
descobertos por tentativa e erro.

O comentário de `nr_iph_estimado` afirma explicitamente que o índice é pressão
estimada sobre capacidade declarada e não ocupação real de leito. A decisão de
nomenclatura da seção 5 vale também para o que o LLM narra.

### 9.6 Select AI validado com OCI Generative AI

Validado em 01/08/2026 com OCI Generative AI em `sa-saopaulo-1`. A instância
usa Resource Principal, Dynamic Group `MedFlowADBGenAI` e policy
`use generative-ai-family`, sem chave de API externa. O profile
`MEDFLOW_GENAI` cobre as duas dimensões e os sete marts, com comentários e
restrições enviados ao modelo.

As três perguntas foram validadas primeiro em SQL convencional. Depois, os
três `showsql` reproduziram filtros, agregações e cortes, e os três `narrate`
devolveram os rankings esperados. O IPH foi narrado como pressão sobre a
capacidade, não ocupação real. Ordem vinculante para demonstrações futuras:
SQL convencional, `showsql`, conferência e somente então `narrate`.

## 10. Webapp — decisões tomadas na construção

Registradas em 02/08/2026, depois de as dez fatias serem revisadas e commitadas.

### 10.1 Nenhum indicador é calculado fora da Gold

As views de API são projeção pura: leem colunas já persistidas e não contêm
expressão de indicador. No TypeScript não há uma única operação aritmética
sobre valor de indicador — o front formata com `Intl.NumberFormat`, não calcula.
As únicas divisões no cliente são projeção de pixel (coordenada de gráfico e
largura de barra decorativa).

O corolário prático: **é proibido criar faixas, cortes ou classificações de
indicador no cliente.** Se um corte é necessário, ele nasce na Gold, é
persistido e chega pronto pela API. Isso vale para todas as fatias.

### 10.2 Ausência legítima não pode ser exibida como falha

Um endpoint que responde 200 com zero linhas está funcionando. A tela precisa
dizer "não há dado publicado para este recorte", nunca "o endpoint não
respondeu".

Cada resposta traz um bloco de contexto (território, região ou hospital) que o
cliente classifica em três estados: **completo**, **ausente** e **inválido**.
Ausente exige que o bloco venha inteiramente nulo **e** que a resposta tenha
zero itens — bloco vazio com itens é contradição e conta como contrato quebrado.
Só o estado inválido leva à tela de erro.

Isso vale também para indicador sem denominador: sem leito SUS declarado não
existe IPH e sem internação nova não existem TMH, CMI nem permanência. Nesses
casos a tela diz o motivo em vez de exibir número.

### 10.3 O `p_items_per_page` do módulo ORDS sobrepõe o bind `:limit`

O módulo `medflow_dev` foi definido com `p_items_per_page => 100`. Quando o
chamador omite `limit`, o ORDS preenche o bind `:limit` com esse valor **antes**
de o SQL do handler ser avaliado. Um `coalesce(:limit, N)` com `N` diferente de
100 é código morto e faz o handler declarar um padrão que o serviço não pratica.

Consequência para handlers futuros: conferir sempre chamando sem `limit`. E não
subir o `p_items_per_page` do módulo — `/regioes/{id}/serie` declara máximo 120
e passaria a responder 404 na chamada sem `limit`.

### 10.4 Fontes nunca se misturam na mesma tela

Quando o Oracle não responde, a tela inteira vai para o snapshot de contingência
com selo explícito. O snapshot cobre um recorte só; pedir outro recorte nesse
estado devolve um aviso, não um dado de outra origem. Endpoints da mesma rota
falham de forma independente: a ICSAP pode cair sem derrubar a matriz de fluxos,
e os diagnósticos podem cair sem derrubar a série do hospital.

### 10.5 CORS restrito por origem

Os endpoints são somente leitura sobre dados públicos e agregados, mas o CORS é
restrito às origens do webapp. Isso é política de navegador, não autenticação, e
está registrado como tal — não substitui os controles de acesso do banco.

### 10.6 Nome de estado da Gold não é definição

`benchmark_zero` parecia significar "sem hospital par na região" e significa o
oposto: existem de 1 a 10 hospitais pares em todas as 6.680 linhas do estado, e
o que é zero é a permanência média deles, o que tornaria o IPR uma divisão por
zero. O rótulo errado chegou à tela e só caiu na revisão.

Regra que fica: antes de nomear um estado da Gold na interface, conferir o que
ele significa **nos dados**, não no nome da coluna.

### 10.7 Uma seção não passa de metade da altura da página

Interface longa demais deixa de ser navegável. Nenhuma seção pode ocupar mais
de 50% da altura renderizada, em 1280x800 e em 390x844, sem rolagem horizontal
em nenhum dos dois. Tabela longa vira dois blocos — prévia e "demais" — em vez
de uma seção única. Lista truncada declara "N de M" e oferece ver todas.

## 11. Sprint 2

Entrega prevista: 01/09/2026.

Concluído: as quatro visões do webapp, servidas por dez endpoints ORDS; dados
validados contra a Gold em 8.403.103 comparações sem divergência; módulo público
`api/v1` e link publicados; roteiro de Select AI revalidado em 13 perguntas; e
heartbeat diário acompanhado por `make preflight`.

Ordem de trabalho restante para a entrega acadêmica:

1. gravar o vídeo com as evidências já produzidas;
2. completar a planilha oficial com o quinto integrante;
3. montar e conferir o ZIP único exigido pelo FIAP ON;
4. preparar os cinco integrantes e rodar `make preflight` antes da banca.

A versão pública
[`v0.3.0`](https://github.com/Lucas-D-S-1/medflow/releases/tag/v0.3.0)
foi publicada em 23/08/2026 com o produto de ponta a ponta. A `v0.3.1` reúne o
hardening posterior e foi validada e publicada em 25/08/2026.

A base metodológica, a estrutura de dados, a carga Oracle e o WebApp público
estão fechados. O profile Select AI cobre os nove objetos, e os limites medidos
do modelo estão registrados. A página APEX foi montada como demonstração e não
bloqueia o produto nem os critérios da Sprint 2.

## 12. O legado de 2022-2023 sai do repositório

Decidido em 25/08/2026, na preparação da entrega. Supersede o último item da
seção 8, que registrava o material anterior como isolado em `data/legado/`.

Saíram do controle de versão os 14 arquivos de `data/legado/`, os 10 de
`docs/qualidade/figuras/legado/` e os dois `contracts/INVENTARIO_PRE_*.json`.

O motivo: a revisão de requisitos manda regenerar o recorte de 2022-2023 em vez
de conservá-lo, e manter um recorte antigo no repositório público de entrega
custa dois cliques de confusão para quem avalia. A proveniência não depende
desses arquivos: continua na tag `v0.1.0`, na tag `pre-reorg`, na branch
`arquivo/v0-2026-07` e no histórico do Git.

A consequência técnica é que a checagem de preservação por SHA-256 do
`validar.py` deixou de existir. Ela provava que a migração de julho de 2026 não
perdeu nada que o pipeline não regenera, e as duas migrações que ela vigiava
terminaram. O que sobra é regenerável e tem garantias mais fortes que um hash:
os contratos de camada, o `MANIFESTO.json` e os invariantes entre camadas,
todos conferidos a cada `make validar`.

`medflow inventario` continua existindo e passou a gravar em
`contracts/INVENTARIO.json`, que é gitignored.

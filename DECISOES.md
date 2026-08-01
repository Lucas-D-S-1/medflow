# DECISÕES — Challenge Oracle: MedFlow

Atualizado em 01/08/2026. As decisões abaixo substituem interpretações
anteriores quando houver conflito.

## 1. Escopo

- São Paulo, competências solicitadas de 2024 a 2026.
- A execução usa todas as competências comuns já publicadas para SIH/RD e
  CNES/LT. Na validação de 29/07/2026, o recorte efetivo foi
  **2024-01 a 2026-05 (29 meses)**; 2026 é um período parcial.
- A descoberta remota e o cache incremental permitem que o mesmo batch mensal
  incorpore novas competências até 2026-12 sem alterar o código.
- Fontes públicas: SIH/RD, CNES/LT, API de Dados Abertos do Ministério da
  Saúde, tabelas CID-10 do DATASUS, IPCA/SIDRA e referências do IBGE/CONCLA.
- Análise histórica; ML e predição permanecem fora do escopo.
- O atraso de publicação do DATASUS é característica do produto retrospectivo.

Volumetria Bronze validada:

- SIH/RD: 7.034.961 linhas e 117 colunas;
- CNES/LT: 243.085 linhas e 31 colunas;
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

- 7.034.961 AIHs aprovadas;
- 6.909.807 números de AIH distintos;
- 6.905.441 internações novas;
- 129.520 registros de continuação.

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
- `DIAG_PRINC`: DATASUS CID-10 2008 e complementos oficiais do MS,
  9.494/9.494 códigos observados;
- `MARCA_UTI`: MS/DATASUS e CEM, 14/14 códigos observados;
- nome e esfera atuais: API oficial CNES, 653/653 hospitais.

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
- todo material anterior foi isolado em `dados/legado/` e não alimenta o
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

É o workload adequado ao MedFlow porque o projeto tem carga em lote, 7.034.961
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

## 10. Sprint 2

Entrega prevista: 01/09/2026.

Ordem de trabalho restante:

1. construir as quatro visões do webapp usando ORDS e snapshot de contingência;
2. validar filtros, totais, territorialidade e interpretações contra a Gold;
3. revalidar as cinco perguntas do Select AI — três originais e duas novas;
4. regenerar achados e figuras;
5. atualizar pitch, vídeo, link público e roteiro da apresentação.

A versão pública
[`v0.2.0`](https://github.com/Lucas-D-S-1/fiap-1tscoa/releases/tag/v0.2.0)
foi publicada em 29/07/2026 com Silver canônica, Gold, geografia, contratos e
validação integrada. A `v0.1.0` permanece como marco histórico do pipeline
Bronze/Silver.

A base metodológica, a estrutura de dados e a carga Oracle estão fechadas. O
produto final será um webapp público sem licença de BI, servido por ORDS com
snapshot estático de contingência. O profile Select AI já cobre os nove objetos;
as duas perguntas territoriais serão validadas depois do produto. O próximo
marco é **`v0.3.0` — Oracle e webapp MVP**.

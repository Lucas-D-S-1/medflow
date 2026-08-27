# Proposta — território municipal e busca hospitalar

**Status:** implementada e validada em 27/08/2026.
**Retomada:** 26/08/2026, depois do fechamento da rodada publicada do Oracle
Challenge.

## Por que esta frente existe

O MedFlow já responde por Região de Saúde do SUS. Ao pesquisar “Ermelino
Matarazzo”, porém, apareceu uma lacuna diferente: o usuário pode estar falando
de uma região municipal, de um distrito, de uma subprefeitura, de uma
Coordenadoria Regional de Saúde (CRS) ou do nome popular de um hospital.

Esses conceitos não devem ser misturados. A Região de Saúde continua sendo a
dimensão estadual do SUS (`cd_regiao_saude`); o território municipal será uma
dimensão complementar, inicialmente restrita ao município de São Paulo
(`3550308`).

## Fontes e autoridade

| Informação | Fonte primária | Uso | Ressalva |
|---|---|---|---|
| Código e nome do município | IBGE Cidades e Estados | `cd_municipio_ibge_7` e nome oficial | o código de São Paulo é `3550308` |
| Nome, endereço, bairro e coordenadas do estabelecimento | API/dataset de estabelecimentos do CNES | fotografia cadastral atual do hospital | não é histórico mensal |
| Polígonos de distrito e subprefeitura | GeoSampa / Prefeitura de São Paulo | ponto-em-polígono do endereço CNES | guardar arquivo original e hash |
| Hierarquia CRS, Supervisão Técnica de Saúde (STS) e unidades | GeoSampa/SMS/CEInfo da Prefeitura | CRS/STS e conferência da atribuição | a camada tem data de carga; a página/mapa tem data de atualização |
| Alias hospitalar | CNES e página oficial da SMS | busca e rótulo amigável | alias não substitui o CNES |

Fontes de referência:

- IBGE: <https://www.ibge.gov.br/cidades-e-estados/sp/sao-paulo.html>
- CNES: <https://dadosabertos.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude>
- CRS Leste/SMS: <https://prefeitura.sp.gov.br/web/saude/w/coordenadorias-regionais-de-saude-leste>
- Mapas CEInfo/SMS: <https://prefeitura.sp.gov.br/web/saude/w/epidemiologia_e_informacao/mapoteca/317344>
- GeoSampa: <https://geosampa.prefeitura.sp.gov.br/>

O WFS que será preservado na Bronze é
`https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs`. As camadas
consultadas em 26/08/2026 foram:

- `geoportal:distrito_municipal` — 96 polígonos, com `cd_distrito_municipal`,
  `nm_distrito_municipal` e `cd_identificador_subprefeitura`;
- `geoportal:subprefeitura` — 32 polígonos, com `cd_subprefeitura` e
  `nm_subprefeitura`;
- `geoportal:equipamento_saude_coordenadoria_regional` — 5 polígonos, com
  `cd_identificador_coordenadoria_regional_saude` e nome da CRS;
- `geoportal:equipamento_saude_supervisao_tecnica` — 26 polígonos, com
  `cd_identificador_supervisao_tecnica_saude`, STS e CRS.

O WFS devolve `EPSG:31983` por padrão. A extração deve pedir
`srsName=EPSG:4326` antes de comparar os polígonos com latitude/longitude do
CNES; essa escolha precisa ficar registrada no manifesto.

## Granularidade aprovada para implementação

### 1. `dim_territorio_municipal`

Uma linha por distrito municipal oficial dentro de São Paulo. O distrito é a
unidade espacial de referência porque possui geometria para atribuição dos
estabelecimentos e pode ser relacionado à subprefeitura, à CRS e à STS.

Campos mínimos propostos:

| Campo | Obrigatório | Semântica |
|---|---:|---|
| `cd_municipio_ibge_7` | sim | código IBGE do município |
| `cd_distrito_sp` | sim | identificador do distrito na fonte municipal |
| `nm_distrito` | sim | nome oficial do distrito |
| `id_subprefeitura_sp` | sim | chave canônica interna da subprefeitura |
| `nm_subprefeitura` | sim | nome oficial da subprefeitura |
| `id_crs_sms_sp` | sim | chave canônica interna da CRS municipal |
| `nm_crs_sms` | sim | nome da CRS, por exemplo `Leste` |
| `id_sts_sms_sp` | não | chave canônica interna da STS |
| `nm_sts_sms` | não | nome da Supervisão Técnica de Saúde |
| `nm_regiao_municipal_5` | sim | região municipal ampla informada pelo GeoSampa |
| `nm_regiao_municipal_8` | sim | subdivisão regional municipal informada pelo GeoSampa |
| `nm_zona_popular` | não | rótulo amigável, por exemplo `Leste` |
| `ds_fonte_territorio` | sim | fonte e edição usada na linha |
| `dt_referencia_fonte` | sim | data de referência da fonte |

`id_*` é uma chave governada pelo MedFlow quando a fonte não oferece um código
estável. Ela não pode ser interpretada como código do SUS. Os nomes oficiais
ficam preservados separadamente para exibição e auditoria.

### 2. `dim_hospital_territorio_atual`

Uma linha por `cd_cnes` observado na Silver cujo município cadastral seja São
Paulo (`CODUFMUN`/`codigo_municipio = 355030`). A dimensão é atual, assim como
o cadastro CNES usado para nome, endereço e coordenadas. Hospitais dos outros
municípios continuam na Silver e nos marts atuais, mas ficam fora desta
primeira carga territorial.

Campos mínimos propostos:

| Campo | Obrigatório | Semântica |
|---|---:|---|
| `cd_cnes` | sim | chave do hospital no CNES |
| `cd_municipio_ibge_7` | sim | município do endereço cadastral |
| `cd_distrito_sp` | não | distrito atribuído ao ponto CNES; nulo quando o ponto está fora da malha |
| `id_subprefeitura_sp` | não | subprefeitura herdada do distrito |
| `id_crs_sms_sp` | não | CRS municipal herdada do distrito |
| `id_sts_sms_sp` | não | STS municipal herdada do distrito |
| `nm_bairro_cnes_atual` | não | bairro informado pelo CNES |
| `vl_latitude_cnes_atual` | não | latitude informada pelo CNES |
| `vl_longitude_cnes_atual` | não | longitude informada pelo CNES |
| `tp_metodo_atribuicao` | sim | inicialmente `ponto_em_poligono` |
| `fl_atribuicao_ambigua` | sim | 0/1; não esconder fronteiras ou dados faltantes |
| `ds_fonte_territorio` | sim | fonte e edição usada na atribuição |
| `dt_referencia_fonte` | não | data de referência da atribuição; nula para ponto não atribuído |

O endereço não será copiado para os marts mensais. O hospital será relacionado
à dimensão territorial por essa dimensão atual, com a ressalva já existente de
que atributos cadastrais atuais não reconstituem a situação histórica.

### 3. `bridge_hospital_alias`

Uma linha por alias pesquisável e por `cd_cnes`. O nome oficial atual continua
em `dim_hospital.nm_hospital_atual`.

Campos mínimos propostos:

| Campo | Obrigatório | Semântica |
|---|---:|---|
| `cd_cnes` | sim | hospital ao qual o alias pertence |
| `nm_alias` | sim | texto exibido ou aceito na busca |
| `nm_alias_normalizado` | sim | caixa, acentos e pontuação normalizados |
| `tp_alias` | sim | `popular`, `oficial`, `historico` ou `sigla` |
| `fl_alias_preferencial` | sim | 0/1; no máximo um por hospital e tipo |
| `ds_fonte_alias` | sim | fonte que sustenta o alias |
| `dt_referencia_fonte` | sim | data da fonte |

Primeiro caso de aceite:

```text
cd_cnes: 2082829
nome oficial CNES: HOSP MUN PROFESSOR DOUTOR ALIPIO CORREA NETTO
alias de busca: Ermelino Matarazzo
alias oficial de apresentação: Hospital Municipal Ermelino Matarazzo — Prof. Dr. Alípio Corrêa Netto
```

O alias “Ermelino Matarazzo” é uma ponte de busca para o CNES `2082829`; não
deve virar uma segunda instituição nem substituir o nome cadastral.

## Regras de separação territorial

- `cd_regiao_saude` continua significando Região de Saúde do SUS.
- `id_crs_sms_sp` significa CRS municipal da SMS; não reutilizar o código da
  Região de Saúde.
- `id_sts_sms_sp` significa Supervisão Técnica de Saúde; não é distrito
  administrativo.
- `cd_distrito_sp` e `id_subprefeitura_sp` são divisões administrativas
  municipais.
- `nm_zona_popular` é um rótulo de apresentação e busca. “Zona Leste” não será
  usada como chave espacial nem como sinônimo universal de CRS.
- Falta de coordenada, ponto fora da malha ou conflito de fonte gera flag e
  revisão; não gera atribuição por bairro aproximado ou por texto livre.

## Critérios de aceite da primeira carga

1. O arquivo de referência municipal é preservado na Bronze com URL, data,
   edição e SHA-256.
2. A dimensão não tem distrito duplicado e todos os distritos da edição de São
   Paulo aparecem exatamente uma vez.
3. Os 107 hospitais da Silver cujo endereço cadastral é São Paulo têm uma
   linha na dimensão: 101 recebem atribuição única e 6 ficam explicitamente
   pendentes porque o ponto CNES está fora da malha distrital; os outros 548
   são marcados como fora do escopo municipal desta primeira carga, sem serem
   descartados da Silver ou dos marts existentes.
4. O CNES `2082829` é atribuído ao distrito, subprefeitura e STS de Ermelino
   Matarazzo, à CRS Leste e ao rótulo `Leste`, conforme a fonte municipal.
5. O alias “Ermelino Matarazzo” encontra somente o CNES `2082829` no primeiro
   conjunto de aliases.
6. A reconciliação prova que os marts existentes não mudaram apenas por causa
   da nova dimensão; filtros municipais só entram nos marts/API após a
   atribuição ser completa.
7. A carga mantém a ressalva temporal: CNES, geometria e hierarquia municipal
   têm a data da fonte e não são apresentados como vigentes em cada competência
   histórica.

## Ordem de implementação

1. Baixar e preservar as quatro camadas WFS oficiais do GeoSampa e a referência
   de conferência CRS/STS da SMS/CEInfo.
2. Confirmar os nomes e códigos de cada fonte e criar o de/para auditável entre
   distrito, subprefeitura, CRS e STS.
3. Enriquecer `EntradaSilver` com o cadastro CNES atual já preservado e gerar as
   três estruturas acima, começando por São Paulo.
4. Testar cobertura, unicidade, normalização e o caso Ermelino Matarazzo.
5. Só depois adicionar filtros/pesquisa em Gold, Oracle, ORDS e WebApp.
6. Retomar o plano visual da página analítica contínua por último.

A F12 e a investigação do HTTP 400 são uma frente independente e não alteram
os critérios territoriais desta decisão.

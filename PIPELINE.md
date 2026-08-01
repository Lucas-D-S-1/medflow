# PIPELINE — contratos Bronze, Silver e Gold do MedFlow

Atualizado em 29/07/2026 após execuções integrais e idempotentes para o recorte
disponível de 2024-01 a 2026-05.

## Contrato das camadas

### Bronze — `00_extracao_dados.ipynb`

Responsabilidade: adquirir e preservar as fontes.

Permitido:

- download e cache;
- descoberta da última competência comum de SIH/RD e CNES/LT;
- descompressão técnica DBC/DBF e HTTP gzip;
- serialização em Parquet;
- metadados de linhagem;
- manifesto, hashes, esquema e volumetria.

Estrutura:

- `origem/datasus`: DBC imutável;
- `origem/referencias`: JSON, ZIP, HTML, CSV e malha oficial;
- `intermediario/dbf`: cache técnico descartável e reproduzível;
- `parquet`: serialização fiel e consolidada.

Proibido:

- filtro analítico;
- preenchimento de ausência;
- de/para;
- normalização de código de negócio;
- dimensão, fato ou indicador.

### Silver — `01_engenharia_dados.ipynb`

Responsabilidade: tornar os dados consistentes e auditáveis para análise.

Inclui:

- tipagem;
- todos os de/paras;
- dimensões e fatos com nomes canônicos;
- classificação de qualidade e origem;
- reconciliações antes da promoção;
- documentação automática de esquema, domínios e qualidade.

Proibido:

- indicador, benchmark ou classificação de negócio;
- publicação de agregados `base_*`;
- exposição de nomes brutos quando já existe conceito canônico.

### Gold — `02_analise_dados.ipynb`

Responsabilidade: aplicar os contratos hospitalares e territoriais e publicar
marts para Oracle e produto.

Inclui:

- TMH e CMI por hospital, especialidade e mês;
- IPR por hospital/CID com benchmark regional que exclui o hospital;
- IS regional de 2026 contra 2024–2025;
- IPH por mês civil usando pacientes-dia reconstruídos;
- permanência média e CMI real corrigido pelo IPCA;
- demanda por região de residência e taxa populacional territorialmente coerente;
- fluxos origem–destino e evasão intrastadual observada;
- ICSAP por residência e pelos 19 grupos oficiais;
- CSV, GeoJSON e TopoJSON regionais.

## Oito controles implementados

1. **Inventário de domínios:** cobertura medida por campo; lacunas explícitas.
2. **De/paras:** todos os códigos observados de especialidade, natureza
   jurídica, CID e UTI estão cobertos e têm proveniência.
3. **Identificadores preservados:** `N_AIH`, `IDENT` e `COD_IDADE` estão no fato.
4. **Unidade de contagem:** 7.034.961 AIHs aprovadas, 6.905.441 internações
   novas e 129.520 continuações.
5. **Permanência:** `DIAS_PERM` alimenta permanência; `QT_DIARIAS` permanece
   nomeado como faturamento.
6. **Região:** região analítica vem da referência oficial municipal do MS;
   a declaração histórica do CNES/LT e seus quatro conflitos são preservados
   para auditoria.
7. **Nulos em agrupamento:** `dropna=False` e reconciliação impedem perdas
   silenciosas.
8. **Indicadores:** contratos hospitalares e territoriais são calculados na
   Gold, com amostra, denominador, residência/atendimento e limitações explícitos.

## Reconciliações bloqueantes

A Silver só grava se:

- fato SIH = 7.034.961 linhas;
- AIH normal + continuação = total do fato;
- todos os códigos `ESPEC` observados tiverem de/para;
- todos os CIDs tiverem capítulo e descrição;
- todos os hospitais SIH existirem na dimensão hospital;
- todos os hospitais tiverem região, natureza jurídica, nome e esfera atuais;
- a dimensão municipal cobrir 645 municípios e reconciliar API e CSV oficiais;
- as chaves `cd_competencia`, `cd_cnes` e `cd_regiao_saude` não perderem
  cobertura.

Nome e esfera atuais não são usados para reescrever o cadastro histórico. A
dimensão hospital os identifica com sufixo `_atual` e
`fl_cadastro_atual_nao_historico=1`. Se o produto exigir o atributo vigente em
cada competência de 2024–2026, será necessária uma fonte cadastral histórica.

## IPH: proxy histórico e contrato atual

O proxy:

```text
SUM(QT_DIARIAS) / (leitos_SUS × dias_do_mês)
```

reproduz a média `0,472168`, mas isso não comprova ocupação real.
`QT_DIARIAS` é faturamento, a competência pode divergir da saída e 15,0798% das
internações cruzam mês. Para medir ocupação física seria necessário distribuir
intervalos de internação no calendário e validar as regras de leito/transferência.

Esse proxy é mantido apenas na trilha de auditoria. O mart Gold reconstrói
32.425.897 pacientes-dia pelas datas de entrada e saída e os relaciona à
capacidade CNES do mês civil. Capacidade zero produz IPH nulo e status
`sem_leito_sus_declarado`. Mesmo assim, o resultado continua sendo pressão
estimada, não ocupação real.

## Reconciliações Gold

- 6.905.441 internações novas nos marts hospitalar, especialidade e regional;
- 310 linhas de IS calculadas, correspondentes a 62 regiões × 5 meses de 2026;
- 30.550 combinações hospital/CID elegíveis para IPR;
- 645 municípios e 62 regiões associados à geometria sem imputação;
- 142 hospital/mês com denominador CNES zero preservados com IPH nulo.

## Artefatos legados

`dados/legado/`, `figuras/legado/`, `notebooks/_legado/` e
`referencias/legado_sprint_1/` não fazem parte do contrato atual. Permanecem
somente para rastreabilidade histórica.

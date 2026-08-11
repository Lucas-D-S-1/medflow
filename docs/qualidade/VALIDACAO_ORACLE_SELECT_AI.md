# Validação Oracle e Select AI — MedFlow

Executada em **01/08/2026** no Autonomous AI Database `MEDFLOW`, versão 26ai,
workload Lakehouse, região `sa-saopaulo-1`.

> **Evidência datada.** As contagens abaixo são as do recorte de 29
> competências, vigente naquele dia. Em 09/08/2026 o recorte avançou para 30
> competências e a carga passou a 597.725 linhas, mantendo 36/36 na
> reconciliação. O estado corrente do banco não se lê aqui: rode
> `make oracle-carregar` com `--conferir` e
> `medflow.oracle.executar_sql db/schema/03_validar_carga.sql`.

## Conexão e modelo

- conexão mTLS validada no banco `GF68E03B2A30D55_MEDFLOW`;
- esquema de aplicação: `MEDFLOW`;
- 9 tabelas: 2 dimensões e 7 marts;
- 175 colunas, todas comentadas;
- 10 índices secundários, além dos índices das chaves primárias;
- aliases usados: `medflow_low` para conexão e `medflow_medium` para carga.

Wallet, `.env` e senhas permanecem locais e ignorados pelo Git.

## Carga e reconciliação

| Tabela | Linhas Oracle | Linhas no arquivo | Estado |
|---|---:|---:|---|
| `dim_geografia_regiao` | 62 | 62 | ok |
| `dim_geografia_municipio` | 645 | 645 | ok |
| `mart_indicador_hospital_mensal` | 18.690 | 18.690 | ok |
| `mart_indicador_hospital_especialidade_mensal` | 52.525 | 52.525 | ok |
| `mart_indicador_hospital_cid_periodo` | 447.334 | 447.334 | ok |
| `mart_indicador_regiao_mensal` | 1.798 | 1.798 | ok |
| `mart_indicador_regiao_periodo` | 62 | 62 | ok |
| `mart_fluxo_assistencial_regiao_mensal` | 30.018 | 30.018 | ok |
| `mart_icsap_regiao_mensal` | 34.162 | 34.162 | ok |
| **Total** | **585.296** | **585.296** | **ok** |

O total se divide em 584.589 linhas nos sete marts e 707 linhas nas duas
dimensões.

O roteiro `sql/03_validar_carga.sql` retornou **36 de 36 métricas como `ok`**.
As seis consultas adicionais retornaram zero ocorrências para:

- fatos sem região correspondente;
- IPH nulo apesar de capacidade disponível;
- flag de pressão acima da capacidade com IPH incompatível.
- fluxo ou ICSAP sem região correspondente;
- decomposição dos grupos ICSAP divergente do resumo regional;
- assimetria entre saída e entrada inter-regional.

As reconciliações novas confirmaram 6.846.665 internações de residentes
paulistas observadas em SP, 58.776 atendimentos de residentes de outras UFs,
906.060 fluxos inter-regionais e 953.656 ICSAP.

## SQL convencional de referência

As três perguntas foram respondidas primeiro em SQL convencional.

### 1. Regiões com maior IPH médio em 2026

| Posição | Região | IPH médio | Internações novas |
|---:|---|---:|---:|
| 1 | Limeira | 77,1% | 6.820 |
| 2 | Franco da Rocha | 75,7% | 14.241 |
| 3 | Jundiaí | 75,1% | 24.475 |
| 4 | São José do Rio Preto | 70,4% | 41.754 |
| 5 | Alta Sorocabana | 68,6% | 21.991 |

### 2. TMH média por especialidade

Filtro: somente `st_amostra = 'suficiente'` e pelo menos 100 linhas
hospital-mês por especialidade.

| Posição | Especialidade | TMH média | Hospital-mês |
|---:|---|---:|---:|
| 1 | Crônicos | 31,58% | 112 |
| 2 | Clínica médica | 10,92% | 12.255 |
| 3 | Cirurgia | 1,64% | 9.481 |
| 4 | Pediatria | 1,51% | 4.739 |
| 5 | Intercorrência pós-transplante — hospital-dia | 0,56% | 134 |
| 6 | Saúde mental — clínico | 0,22% | 137 |
| 7 | Hospital-dia (cirúrgico) | 0,10% | 2.322 |
| 8 | Psiquiatria | 0,08% | 1.223 |
| 9 | Obstetrícia | 0,03% | 5.462 |

Há nove especialidades elegíveis, embora a consulta permita até dez.

### 3. Diagnósticos com maior IPR médio

Filtro: somente combinações hospital-CID com amostra suficiente e pelo menos
10 combinações por diagnóstico.

| Posição | Diagnóstico | Combinações | IPR médio |
|---:|---|---:|---:|
| 1 | Cisto epidérmico | 24 | 5,57 |
| 2 | Hemorróidas internas com outras complicações | 10 | 5,00 |
| 3 | Mononeuropatia não especificada | 14 | 4,15 |
| 4 | Descolamento da retina com defeito retiniano | 11 | 3,55 |
| 5 | Síndrome do túnel do carpo | 123 | 3,36 |
| 6 | Hipertrofia das amígdalas com hipertrofia das adenóides | 76 | 3,15 |
| 7 | Amigdalite crônica | 36 | 2,71 |
| 8 | Hipertrofia das adenóides | 38 | 2,69 |
| 9 | Outras afecções especificadas da pele e do tecido subcutâneo | 74 | 2,60 |
| 10 | Afecções da pele e do tecido subcutâneo, não especificados | 166 | 2,29 |

## Select AI

Configuração validada:

- Dynamic Group: `MedFlowADBGenAI`;
- IAM: `use generative-ai-family`;
- autenticação: `OCI$RESOURCE_PRINCIPAL`, sem chave externa;
- profile: `MEDFLOW_GENAI`, estado `ENABLED`;
- provedor: OCI Generative AI em `sa-saopaulo-1`;
- metadados do contrato anterior: comentários e restrições das sete tabelas.

O primeiro teste mostrou que critérios ocultos no SQL não eram inferidos de
forma confiável. Os comentários de negócio foram aprimorados e os cortes de
100 hospital-mês e 10 combinações hospital-CID passaram a aparecer
explicitamente nas perguntas. Isso eliminou tentativa e erro e tornou o
contrato auditável.

Na validação final:

- os três `showsql` aplicaram os mesmos filtros, agregações, cortes e limites
  das consultas de referência;
- os três `narrate` reproduziram os rankings corretos;
- a narrativa do IPH usou “pressão sobre a capacidade” e não “ocupação real”.

Esses resultados comprovam a configuração e as três perguntas originais. O
contrato `0.3.0` ampliou o profile para nove objetos e acrescentou perguntas de
fluxo e ICSAP no roteiro `sql/04_select_ai.sql`; essa bateria ampliada será
revalidada depois do webapp, conforme a ordem de entrega aprovada. O profile já
foi sincronizado com os nove objetos e confirmado no estado `ENABLED`; apenas a
execução comparativa das duas perguntas novas permanece pendente.

## Verificação antes da apresentação

1. confirmar que o banco está `Disponível`;
2. testar a conexão mTLS;
3. confirmar que `MEDFLOW_GENAI` está `ENABLED`;
4. executar o SQL convencional, depois `showsql` e por último `narrate`;
5. interromper a demonstração se o SQL gerado divergir da referência.

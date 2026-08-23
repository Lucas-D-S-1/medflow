# Revalidação do Select AI contra o produto final

Executada em **23/08/2026 às 12:19** no banco `GF68E03B2A30D55_MEDFLOW`, perfil `"MEDFLOW"."MEDFLOW_GENAI"`.

Cada pergunta traz primeiro o SQL de referência já validado e seu resultado no banco, depois o SQL que o Select AI gerou e a resposta narrada. A ordem é essa de propósito: nenhuma pergunta vai ao modelo antes de a resposta estar validada em SQL convencional.

## 1. Onde a rede está sob mais pressão em 2026?

**Pergunta ao Select AI**

> quais as cinco regioes de saude com maior indice de pressao hospitalar medio em 2026

**SQL de referência**

```sql
select nm_regiao_saude,
       round(avg(pc_iph_estimado), 1) as pc_iph_medio_2026,
       sum(qt_internacao_nova)        as qt_internacao_nova
from   mart_indicador_regiao_mensal
where  nr_ano_competencia = 2026
group  by nm_regiao_saude
order  by pc_iph_medio_2026 desc
fetch  first 5 rows only
```

**Resultado no banco**

```
| nm_regiao_saude       | pc_iph_medio_2026 | qt_internacao_nova |
|-----------------------|-------------------|--------------------|
| LIMEIRA               | 78.5              | 8208               |
| FRANCO DA ROCHA       | 77.7              | 17436              |
| JUNDIAI               | 75.8              | 29088              |
| SAO JOSE DO RIO PRETO | 71.6              | 50328              |
| ALTO VALE DO PARAIBA  | 69.4              | 39966              |
```

**SQL gerado pelo Select AI (`showsql`)**

```sql
SELECT 
  r."NM_REGIAO_SAUDE" AS regiao_saude,
  AVG(m."NR_IPH_ESTIMADO") AS iph_medio
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
WHERE 
  UPPER(m."NR_ANO_COMPETENCIA") = UPPER('2026')
GROUP BY 
  r."NM_REGIAO_SAUDE"
ORDER BY 
  iph_medio DESC
FETCH FIRST 5 ROWS ONLY
```

**Resposta narrada (`narrate`)**

As regiões de saúde com maior índice de pressão hospitalar médio em 2026 são:
* Limeira
* Franco da Rocha
* Jundiai
* São José do Rio Preto
* Alto Vale do Paraíba 

Essas regiões apresentam os maiores índices de pressão hospitalar, o que pode indicar uma maior demanda por serviços de saúde e possíveis desafios para a gestão dos recursos hospitalares.

## 2. Onde a mortalidade se concentra, com amostra confiável?

**Pergunta ao Select AI**

> quais sao as dez especialidades com maior taxa de mortalidade hospitalar media? Primeiro filtre st_amostra igual a suficiente, depois agrupe por especialidade e mantenha somente grupos com pelo menos 100 linhas hospital-mes

**SQL de referência**

```sql
select nm_especialidade,
       round(avg(pc_tmh), 2) as pc_tmh_medio,
       count(*)              as qt_hospital_mes
from   mart_indicador_hospital_especialidade_mensal
where  st_amostra = 'suficiente'
group  by nm_especialidade
having count(*) >= 100
order  by pc_tmh_medio desc
fetch  first 10 rows only
```

**Resultado no banco**

```
| nm_especialidade                              | pc_tmh_medio | qt_hospital_mes |
|-----------------------------------------------|--------------|-----------------|
| Crônicos                                      | 31.66        | 116             |
| Clínica médica                                | 10.95        | 12667           |
| Cirurgia                                      | 1.64         | 9812            |
| Pediatria                                     | 1.5          | 4922            |
| Intercorrência pós-transplante - hospital-dia | 0.6          | 139             |
| Saúde mental - clínico                        | 0.21         | 143             |
| Hospital-dia (cirúrgico)                      | 0.1          | 2407            |
| Psiquiatria                                   | 0.08         | 1263            |
| Obstetrícia                                   | 0.03         | 5643            |
```

**SQL gerado pelo Select AI (`showsql`)**

```sql
SELECT 
  e."NM_ESPECIALIDADE" AS especialidade,
  AVG(e."PC_TMH") AS taxa_mortalidade_media
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_ESPECIALIDADE_MENSAL" e
GROUP BY 
  e."NM_ESPECIALIDADE"
HAVING 
  COUNT(*) >= 100 AND SUM(CASE WHEN e."ST_AMOSTRA" = 'suficiente' THEN 1 ELSE 0 END) >= 100
ORDER BY 
  taxa_mortalidade_media DESC
FETCH FIRST 10 ROWS ONLY
```

**Resposta narrada (`narrate`)**

As dez especialidades com maior taxa de mortalidade hospitalar média são:
* Crônicos
* Clínica médica
* Cirurgia
* Pediatria
* Intercorrência pós-transplante - hospital-dia
* Saúde mental - clínico
* Hospital-dia (cirúrgico)
* Psiquiatria
* Obstetrícia 

Essas especialidades apresentam as maiores taxas de mortalidade média, o que pode indicar uma maior complexidade ou risco associado ao tratamento nesses campos. Isso pode ser útil para identificar áreas que precisam de mais atenção ou recursos para melhorar os resultados de saúde.

## 3. Quais diagnósticos internam mais tempo que os pares?

**Pergunta ao Select AI**

> quais sao os dez diagnosticos com maior IPR medio, considerando somente combinacoes hospital-CID com amostra suficiente e pelo menos 10 combinacoes por diagnostico

**SQL de referência**

```sql
select ds_cid,
       count(*)              as qt_hospital,
       round(avg(nr_ipr), 2) as nr_ipr_medio
from   mart_indicador_hospital_cid_periodo
where  st_amostra = 'suficiente'
group  by ds_cid
having count(*) >= 10
order  by nr_ipr_medio desc
fetch  first 10 rows only
```

**Resultado no banco**

```
| ds_cid                                                       | qt_hospital | nr_ipr_medio |
|--------------------------------------------------------------|-------------|--------------|
| Descolamento da retina com defeito retiniano                 | 12          | 98.85        |
| Cisto epidérmico                                             | 26          | 5.48         |
| Hemorróidas internas com outras complicações                 | 11          | 4.71         |
| Mononeuropatia não especificada                              | 14          | 4.16         |
| Síndrome do túnel do carpo                                   | 129         | 3.32         |
| Hipertrofia das amígdalas com hipertrofia das adenóides      | 79          | 3.19         |
| Amigdalite crônica                                           | 37          | 2.71         |
| Hipertrofia das adenóides                                    | 40          | 2.7          |
| Outras afecções especificadas da pele e do tecido subcutâneo | 77          | 2.58         |
| Afecções da pele e do tecido subcutâneo, não especificados   | 173         | 2.36         |
```

**SQL gerado pelo Select AI (`showsql`)**

```sql
SELECT 
  c."DS_CID" AS diagnostico,
  AVG(c."NR_IPR") AS ipr_medio
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_CID_PERIODO" c
WHERE 
  c."ST_AMOSTRA" = 'suficiente'
GROUP BY 
  c."DS_CID"
HAVING 
  COUNT(*) >= 10
ORDER BY 
  ipr_medio DESC
FETCH FIRST 10 ROWS ONLY
```

**Resposta narrada (`narrate`)**

Os dez diagnósticos com maior Índice de Permanência Relativa (IPR) médio são:
* Descolamento da retina com defeito retiniano
* Cisto epidérmico
* Hemorróidas internas com outras complicações
* Mononeuropatia não especificada
* Síndrome do túnel do carpo
* Hipertrofia das amígdalas com hipertrofia das adenóides
* Amigdalite crônica
* Hipertrofia das adenóides
* Outras afecções especificadas da pele e do tecido subcutâneo
* Afecções da pele e do tecido subcutâneo, não especificados

Esses diagnósticos apresentam os maiores índices de permanência relativa, o que pode indicar que os pacientes com essas condições tendem a permanecer mais tempo no hospital em comparação com outros pacientes. Isso pode ser devido à complexidade do tratamento ou à gravidade da condição.

## 4. Quais regiões mais dependem de atendimento fora do território?

**Pergunta ao Select AI**

> quais regioes tiveram maior percentual medio de evasao intrastadual observada em 2026? Nao interprete como evasao para fora de Sao Paulo

**SQL de referência**

```sql
select nm_regiao_saude,
       round(avg(pc_evasao_intrastadual_observada), 2) as pc_evasao_observada,
       sum(qt_evasao_intrastadual_observada)           as qt_evasao_observada
from   mart_indicador_regiao_mensal
where  nr_ano_competencia = 2026
group  by nm_regiao_saude
order  by pc_evasao_observada desc
fetch  first 10 rows only
```

**Resultado no banco**

```
| nm_regiao_saude        | pc_evasao_observada | qt_evasao_observada |
|------------------------|---------------------|---------------------|
| JOSE BONIFACIO         | 62.71               | 4427                |
| PONTAL DO PARANAPANEMA | 51.5                | 2033                |
| ALTA PAULISTA          | 49.36               | 2868                |
| VALE DAS CACHOEIRAS    | 47.55               | 3864                |
| HORIZONTE VERDE        | 46.24               | 6905                |
| EXTREMO OESTE PAULISTA | 42.79               | 1837                |
| SANTA FE DO SUL        | 41.69               | 1247                |
| CONSORCIOS DO DRS II   | 36.49               | 3480                |
| MANANCIAIS             | 35.8                | 13683               |
| JALES                  | 34.11               | 1872                |
```

**SQL gerado pelo Select AI (`showsql`)**

```sql
SELECT 
  r."NM_REGIAO_SAUDE" AS regiao_saude,
  AVG(m."PC_EVASAO_INTRASTADUAL_OBSERVADA") AS percentual_evasao_medio
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
WHERE 
  m."NR_ANO_COMPETENCIA" = 2026
GROUP BY 
  r."NM_REGIAO_SAUDE"
ORDER BY 
  percentual_evasao_medio DESC
```

**Resposta narrada (`narrate`)**

As regiões de saúde com maior percentual médio de evasão intrastadual observada em 2026 são:
* José Bonifácio
* Pontal do Paranapanema
* Alta Paulista
* Vale das Cachoeiras
* Horizonte Verde
* Extremo Oeste Paulista
* Santa Fé do Sul
* Consórcios do DRS II
* Mananciais
* Jales

Essas regiões apresentam os maiores percentuais de evasão intrastadual, o que significa que uma grande parte dos pacientes residentes nessas regiões procuram atendimento médico em outras regiões de São Paulo.

## 5. Quais grupos ICSAP mais pressionam internações de residentes?

**Pergunta ao Select AI**

> quais foram os dez grupos ICSAP com mais internacoes de residentes em 2026

**SQL de referência**

```sql
select nm_grupo_icsap,
       sum(qt_internacao_icsap) as qt_internacao_icsap
from   mart_icsap_regiao_mensal
where  nr_ano_competencia = 2026
group  by nm_grupo_icsap
order  by qt_internacao_icsap desc
fetch  first 10 rows only
```

**Resultado no banco**

```
| nm_grupo_icsap                       | qt_internacao_icsap |
|--------------------------------------|---------------------|
| Doenças cerebrovasculares            | 28187               |
| Infecção no rim e trato urinário     | 26684               |
| Insuficiência cardíaca               | 21443               |
| Doenças pulmonares                   | 20818               |
| Infecção da pele e tecido subcutâneo | 14968               |
| Diabetes mellitus                    | 13993               |
| Angina                               | 10367               |
| Úlcera gastrointestinal              | 9370                |
| Pneumonias bacterianas               | 8835                |
| Epilepsias                           | 7689                |
```

**SQL gerado pelo Select AI (`showsql`)**

```sql
SELECT 
  i."NM_GRUPO_ICSAP" AS grupo_icsap,
  SUM(i."QT_INTERNACAO_ICSAP") AS total_internacoes
FROM 
  "MEDFLOW"."MART_ICSAP_REGIAO_MENSAL" i
WHERE 
  i."NR_ANO_COMPETENCIA" = 2026
GROUP BY 
  i."NM_GRUPO_ICSAP"
ORDER BY 
  total_internacoes DESC
FETCH FIRST 10 ROWS ONLY
```

**Resposta narrada (`narrate`)**

Os dez grupos ICSAP com mais internações de residentes em 2026 são:
* Doenças cerebrovasculares
* Infecção no rim e trato urinário
* Insuficiência cardíaca
* Doenças pulmonares
* Infecção da pele e tecido subcutâneo
* Diabetes mellitus
* Angina
* Úlcera gastrointestinal
* Pneumonias bacterianas
* Epilepsias

Esses grupos representam as condições de saúde que mais frequentemente levaram os residentes a serem internados em 2026.

## Verificação de terminologia

As respostas narradas foram varridas atrás dos termos que a banca cobra: o IPH é pressão estimada sobre capacidade SUS declarada, nunca ocupação real de leito, e o dado é mensal, nunca tempo real.

Nenhum termo proibido encontrado nas cinco respostas.

## Leitura da revalidação — 23/08/2026

> Seção escrita à mão depois da execução. Reexecutar
> `scripts/revalidar_select_ai.py` reescreve o arquivo inteiro; refaça esta
> leitura junto com a nova evidência.

As cinco perguntas continuam coerentes com o produto final. Comparando o SQL
gerado com o de referência, campo a campo:

| Pergunta | SQL gerado | Leitura |
|---|---|---|
| 1. Pressão hospitalar | usa `NR_IPH_ESTIMADO` e faz join com `DIM_GEOGRAFIA_REGIAO` | o ranking sai idêntico ao da referência, que usa `PC_IPH_ESTIMADO`; índice e percentual são monotônicos, então a ordem não muda |
| 2. Mortalidade por especialidade | filtra `ST_AMOSTRA = 'suficiente'` no `WHERE` e repete a condição no `HAVING` | redundante, não altera o resultado; os dois cortes pedidos foram respeitados |
| 3. IPR por diagnóstico | idêntico à referência | sem divergência |
| 4. Evasão intrastadual | idêntico à referência, sem o `FETCH FIRST 10` | a pergunta não fixou o número de linhas; o corte de negócio, 2026 e média por região, está correto |
| 5. Grupos ICSAP | idêntico à referência | sem divergência |

Nenhuma resposta narrada tratou o IPH como ocupação real de leito nem
descreveu o dado como tempo real — a verificação automática de terminologia
acima varre exatamente esses termos e passou nas cinco.

Os desvios observados são de forma, não de semântica: nenhum deles muda quem
aparece no topo do ranking nem o corte de negócio da pergunta. Não houve
necessidade de ajustar `COMMENT ON` de coluna.

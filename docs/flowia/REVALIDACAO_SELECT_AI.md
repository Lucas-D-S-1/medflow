# Revalidação do Select AI contra o produto final

Executada em **23/08/2026 às 13:28** no banco `GF68E03B2A30D55_MEDFLOW`, perfil `"MEDFLOW"."MEDFLOW_GENAI"`.

## O que este documento prova, e como

A pergunta que a banca faz sobre qualquer demonstração de texto-para-SQL é a
mesma: *como você sabe que ele acertou?* Ler o SQL gerado e achar parecido com o
de referência não responde isso.

Aqui a conferência é executada. Para cada pergunta com SQL de referência, as
duas consultas rodam contra o mesmo banco e as duas respostas são comparadas
pela sequência ordenada de rótulos que produziram: a lista de regiões, de
especialidades, de diagnósticos. É o que a pergunta de negócio pede, e é o que
precisa bater. Duas consultas escritas de forma diferente que devolvem a mesma
lista na mesma ordem responderam a mesma pergunta; uma que devolve outra lista
errou, por mais elegante que seja o SQL.

O SQL vindo do modelo é tratado como entrada não confiável. Só executa se for
consulta de leitura, e executa em transação declarada somente leitura.

| | |
|---|---:|
| Perguntas no roteiro | 13 |
| Com SQL de referência, conferidas por execução | 8 |
| Respostas equivalentes à referência | 6 de 8 |
| Respostas com termo proibido afirmado | 1 |
| Falhas marcadas como limitação conhecida | 4 |

A varredura de terminologia procura `ocupação real`, `ocupacao real`, `taxa de ocupação`, `taxa de ocupacao`, `leitos ocupados`, `tempo real`, `em tempo real`
no que o modelo narrou. O IPH é pressão estimada sobre capacidade SUS declarada,
nunca ocupação real de leito, e a base é mensal por competência, nunca tempo
real. Mencionar não é afirmar: uma ocorrência só conta quando aparece sem
negação e sem ressalva, senão a recusa correta. Que precisa nomear o que
recusa: seria reprovada.

> **Este documento é a medida, não o julgamento.** Ele é gerado por execução e
> reescrito inteiro a cada rodada. A leitura do que estes números significam,
> incluindo o que falhou e o que fazer antes da banca, está em
> [`LEITURA_SELECT_AI.md`](LEITURA_SELECT_AI.md).

## A. Leitura direta: uma tabela, um corte

### A1. Onde a rede está sob mais pressão em 2026?
**Pergunta**

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

**Resposta da referência**

```
| nm_regiao_saude       | pc_iph_medio_2026 | qt_internacao_nova |
|-----------------------|-------------------|--------------------|
| LIMEIRA               | 78.5              | 8208               |
| FRANCO DA ROCHA       | 77.7              | 17436              |
| JUNDIAI               | 75.8              | 29088              |
| SAO JOSE DO RIO PRETO | 71.6              | 50328              |
| ALTO VALE DO PARAIBA  | 69.4              | 39966              |
```

**SQL gerado pelo Select AI**

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

**Resposta do SQL gerado**

```
| regiao_saude          | iph_medio          |
|-----------------------|--------------------|
| LIMEIRA               | 0.7846276666666666 |
| FRANCO DA ROCHA       | 0.7774321666666667 |
| JUNDIAI               | 0.7579121666666667 |
| SAO JOSE DO RIO PRETO | 0.7158811666666667 |
| ALTO VALE DO PARAIBA  | 0.6939893333333333 |
```

**Conferência** ✅ equivalente: mesmos 5 rótulos, na mesma ordem

**Resposta narrada (`narrate`)**

As regiões de saúde com maior pressão hospitalar média em 2026 são:
* LIMEIRA
* FRANCO DA ROCHA
* JUNDIAI
* SÃO JOSÉ DO RIO PRETO
* ALTO VALE DO PARAÍBA 

Isso significa que essas regiões tiveram uma maior demanda por leitos hospitalares em relação à capacidade disponível. A pressão hospitalar é um indicador importante para avaliar a necessidade de recursos de saúde em uma região.

### A2. Onde a mortalidade se concentra, com amostra confiável?
**Pergunta**

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

**Resposta da referência**

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

**SQL gerado pelo Select AI**

```sql
SELECT 
  "e"."NM_ESPECIALIDADE" AS "especialidade",
  AVG("e"."PC_TMH") AS "taxa_mortalidade_media"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_ESPECIALIDADE_MENSAL" "e"
WHERE 
  UPPER("e"."ST_AMOSTRA") = UPPER('suficiente')
GROUP BY 
  "e"."NM_ESPECIALIDADE"
HAVING 
  COUNT(*) >= 100
ORDER BY 
  "taxa_mortalidade_media" DESC
FETCH FIRST 10 ROWS ONLY
```

**Resposta do SQL gerado**

```
| especialidade                                 | taxa_mortalidade_media |
|-----------------------------------------------|------------------------|
| Crônicos                                      | 31.66146048275862      |
| Clínica médica                                | 10.949866399778953     |
| Cirurgia                                      | 1.6420691040562576     |
| Pediatria                                     | 1.5045429309223892     |
| Intercorrência pós-transplante - hospital-dia | 0.5963270071942446     |
| Saúde mental - clínico                        | 0.21365135664335663    |
| Hospital-dia (cirúrgico)                      | 0.10137162235147487    |
| Psiquiatria                                   | 0.07930286619160729    |
| Obstetrícia                                   | 0.027558802764486974   |
```

**Conferência** ✅ equivalente: mesmos 9 rótulos, na mesma ordem

**Resposta narrada (`narrate`)**

As especialidades com maior taxa de mortalidade hospitalar média são:
* Crônicos
* Clínica médica
* Cirurgia
* Pediatria
* Intercorrência pós-transplante - hospital-dia
* Saúde mental - clínico
* Hospital-dia (cirúrgico)
* Psiquiatria
* Obstetrícia 

Essas especialidades têm taxas de mortalidade mais altas em hospitais, o que pode indicar a necessidade de mais atenção e recursos para melhorar os resultados de saúde nesses áreas.

### A3. Quais diagnósticos internam mais tempo que os pares?
**Pergunta**

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

**Resposta da referência**

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

**SQL gerado pelo Select AI**

```sql
SELECT 
  "MART_INDICADOR_HOSPITAL_CID_PERIODO"."DS_CID" AS "diagnostico",
  AVG("MART_INDICADOR_HOSPITAL_CID_PERIODO"."NR_IPR") AS "ipr_medio"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_CID_PERIODO"
WHERE 
  "MART_INDICADOR_HOSPITAL_CID_PERIODO"."ST_AMOSTRA" = 'suficiente'
GROUP BY 
  "MART_INDICADOR_HOSPITAL_CID_PERIODO"."DS_CID"
HAVING 
  COUNT(*) >= 10
ORDER BY 
  "ipr_medio" DESC
FETCH FIRST 10 ROWS ONLY
```

**Resposta do SQL gerado**

```
| diagnostico                                                  | ipr_medio          |
|--------------------------------------------------------------|--------------------|
| Descolamento da retina com defeito retiniano                 | 98.84814216666666  |
| Cisto epidérmico                                             | 5.480268692307693  |
| Hemorróidas internas com outras complicações                 | 4.705022818181818  |
| Mononeuropatia não especificada                              | 4.160504928571428  |
| Síndrome do túnel do carpo                                   | 3.31602            |
| Hipertrofia das amígdalas com hipertrofia das adenóides      | 3.186193670886076  |
| Amigdalite crônica                                           | 2.710630918918919  |
| Hipertrofia das adenóides                                    | 2.7046265          |
| Outras afecções especificadas da pele e do tecido subcutâneo | 2.5819703766233766 |
| Afecções da pele e do tecido subcutâneo, não especificados   | 2.3552832080924855 |
```

**Conferência** ✅ equivalente: mesmos 10 rótulos, na mesma ordem

**Resposta narrada (`narrate`)**

Os dez diagnósticos com maior índice de permanência relativa médio são:
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

Esses diagnósticos têm um índice de permanência relativa mais alto, o que significa que os pacientes que receberam esses diagnósticos permaneceram mais tempo no hospital em comparação com outros pacientes com os mesmos diagnósticos em outras regiões. Isso pode indicar que esses diagnósticos requerem mais tempo de tratamento ou que os hospitais que atendem esses pacientes têm uma capacidade de atendimento mais limitada.

### A4. Quais regiões mais dependem de atendimento fora do território?
**Pergunta**

> quais as dez regioes com maior percentual medio de evasao intrastadual observada em 2026? Nao interprete como evasao para fora de Sao Paulo

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

**Resposta da referência**

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

**SQL gerado pelo Select AI**

```sql
SELECT 
  r."NM_REGIAO_SAUDE" AS regiao, 
  AVG(m."PC_EVASAO_INTRASTADUAL_OBSERVADA") AS percentual_medio_evasao
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
WHERE 
  UPPER(m."NR_ANO_COMPETENCIA") = UPPER('2026')
GROUP BY 
  r."NM_REGIAO_SAUDE"
ORDER BY 
  percentual_medio_evasao DESC
FETCH FIRST 10 ROWS ONLY
```

**Resposta do SQL gerado**

```
| regiao                 | percentual_medio_evasao |
|------------------------|-------------------------|
| JOSE BONIFACIO         | 62.70565233333333       |
| PONTAL DO PARANAPANEMA | 51.501675               |
| ALTA PAULISTA          | 49.355189833333334      |
| VALE DAS CACHOEIRAS    | 47.54633                |
| HORIZONTE VERDE        | 46.2422085              |
| EXTREMO OESTE PAULISTA | 42.78829533333333       |
| SANTA FE DO SUL        | 41.69230133333333       |
| CONSORCIOS DO DRS II   | 36.490707666666665      |
| MANANCIAIS             | 35.7958885              |
| JALES                  | 34.11276333333333       |
```

**Conferência** ✅ equivalente: mesmos 10 rótulos, na mesma ordem

**Resposta narrada (`narrate`)**

As regiões com maior percentual médio de evasão intrastadual observada em 2026 são:
* Jose Bonifacio
* Pontal do Paranapanema
* Alta Paulista
* Vale das Cachoeiras
* Horizonte Verde
* Extremo Oeste Paulista
* Santa Fe do Sul
* Consorcios do DRS II
* Mananciais
* Jales

Isso significa que essas regiões têm um alto percentual de pacientes que buscam atendimento médico em outras regiões de São Paulo, em vez de serem atendidos em sua própria região. A evasão intrastadual se refere ao deslocamento de pacientes dentro do estado de São Paulo, e não para fora do estado.

### A5. Quais grupos ICSAP mais pressionam internações de residentes?
**Pergunta**

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

**Resposta da referência**

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

**SQL gerado pelo Select AI**

```sql
SELECT 
  m."NM_GRUPO_ICSAP" AS grupo_icsap,
  SUM(m."QT_INTERNACAO_ICSAP") AS total_internacoes
FROM 
  "MEDFLOW"."MART_ICSAP_REGIAO_MENSAL" m
WHERE 
  UPPER(m."NR_ANO_COMPETENCIA") = UPPER('2026')
GROUP BY 
  m."NM_GRUPO_ICSAP"
ORDER BY 
  total_internacoes DESC
FETCH FIRST 10 ROWS ONLY
```

**Resposta do SQL gerado**

```
| grupo_icsap                          | total_internacoes |
|--------------------------------------|-------------------|
| Doenças cerebrovasculares            | 28187             |
| Infecção no rim e trato urinário     | 26684             |
| Insuficiência cardíaca               | 21443             |
| Doenças pulmonares                   | 20818             |
| Infecção da pele e tecido subcutâneo | 14968             |
| Diabetes mellitus                    | 13993             |
| Angina                               | 10367             |
| Úlcera gastrointestinal              | 9370              |
| Pneumonias bacterianas               | 8835              |
| Epilepsias                           | 7689              |
```

**Conferência** ✅ equivalente: mesmos 10 rótulos, na mesma ordem

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

## B. Profundidade analítica: junção entre marts e colunas de estado

### B1. A pressão coincide com o que a atenção primária poderia ter evitado?
**Pergunta**

> nas cinco regioes de saude com maior indice de pressao hospitalar medio em 2026, qual foi o grupo ICSAP com mais internacoes de residentes em 2026? Traga uma linha por regiao, com o nome da regiao e o nome do grupo

**O que se espera:** junção entre mart_indicador_regiao_mensal e mart_icsap_regiao_mensal, com o grupo líder por região

**SQL de referência**

```sql
with pressao as (
    select cd_regiao_saude,
           nm_regiao_saude,
           avg(pc_iph_estimado) as pc_iph_medio
    from   mart_indicador_regiao_mensal
    where  nr_ano_competencia = 2026
    group  by cd_regiao_saude, nm_regiao_saude
    order  by pc_iph_medio desc
    fetch  first 5 rows only
),
lider as (
    select cd_regiao_saude,
           nm_grupo_icsap,
           sum(qt_internacao_icsap) as qt_internacao_icsap,
           row_number() over (
               partition by cd_regiao_saude
               order by sum(qt_internacao_icsap) desc
           ) as posicao
    from   mart_icsap_regiao_mensal
    where  nr_ano_competencia = 2026
    group  by cd_regiao_saude, nm_grupo_icsap
)
select p.nm_regiao_saude,
       round(p.pc_iph_medio, 1) as pc_iph_medio,
       l.nm_grupo_icsap,
       l.qt_internacao_icsap
from   pressao p
       join lider l on l.cd_regiao_saude = p.cd_regiao_saude
                   and l.posicao = 1
order  by p.pc_iph_medio desc
```

**Resposta da referência**

```
| nm_regiao_saude       | pc_iph_medio | nm_grupo_icsap                   | qt_internacao_icsap |
|-----------------------|--------------|----------------------------------|---------------------|
| LIMEIRA               | 78.5         | Doenças cerebrovasculares        | 214                 |
| FRANCO DA ROCHA       | 77.7         | Doenças cerebrovasculares        | 460                 |
| JUNDIAI               | 75.8         | Doenças cerebrovasculares        | 558                 |
| SAO JOSE DO RIO PRETO | 71.6         | Infecção no rim e trato urinário | 1364                |
| ALTO VALE DO PARAIBA  | 69.4         | Doenças cerebrovasculares        | 698                 |
```

**SQL gerado pelo Select AI**

```sql
SELECT 
  r."NM_REGIAO_SAUDE" AS "NOME_REGIAO",
  i."NM_GRUPO_ICSAP" AS "NOME_GRUPO_ICSAP"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
  JOIN (
    SELECT 
      "CD_REGIAO_SAUDE",
      "NM_GRUPO_ICSAP",
      ROW_NUMBER() OVER (PARTITION BY "CD_REGIAO_SAUDE" ORDER BY SUM("QT_INTERNACAO_ICSAP") DESC) AS "RNK_GRUPO_ICSAP"
    FROM 
      "MEDFLOW"."MART_ICSAP_REGIAO_MENSAL"
    WHERE 
      "NR_ANO_COMPETENCIA" = 2026
    GROUP BY 
      "CD_REGIAO_SAUDE", "NM_GRUPO_ICSAP"
  ) i ON m."CD_REGIAO_SAUDE" = i."CD_REGIAO_SAUDE" AND i."RNK_GRUPO_ICSAP" = 1
WHERE 
  m."NR_ANO_COMPETENCIA" = 2026
  AND m."PC_IPH_ESTIMADO" IS NOT NULL
ORDER BY 
  AVG(m."PC_IPH_ESTIMADO") OVER (PARTITION BY m."CD_REGIAO_SAUDE") DESC
FETCH FIRST 5 ROWS ONLY
```

**Resposta do SQL gerado**

```
| nome_regiao | nome_grupo_icsap          |
|-------------|---------------------------|
| LIMEIRA     | Doenças cerebrovasculares |
| LIMEIRA     | Doenças cerebrovasculares |
| LIMEIRA     | Doenças cerebrovasculares |
| LIMEIRA     | Doenças cerebrovasculares |
| LIMEIRA     | Doenças cerebrovasculares |
```

**Conferência** 📌 divergente: ausentes no gerado: FRANCO DA ROCHA, JUNDIAI, SAO JOSE DO RIO PRETO, ALTO VALE DO PARAIBA; presentes só no gerado: nenhum

**Resposta narrada (`narrate`)**

As regiões de saúde com maior pressão hospitalar média em 2026 tiveram o mesmo grupo de ICSAP com mais internações de residentes, que é doenças cerebrovasculares. Isso ocorreu em todas as cinco regiões.

> 📌 **Limitação conhecida e aceita:** o modelo ordena as linhas mensais em vez de agregar por região antes de ranquear, e devolve o mês extremo no lugar da região extrema. Reforçar o COMMENT ON do grão nas três tabelas não corrigiu. Analisada em [`LEITURA_SELECT_AI.md`](LEITURA_SELECT_AI.md); não derruba a execução, mas uma falha nova em qualquer outra pergunta derruba.

### B2. Quais hospitais operaram acima da capacidade que eles mesmos declararam?
**Pergunta**

> quais os dez hospitais que mais vezes operaram acima da capacidade de leitos SUS declarada em 2026? Traga o nome do hospital, a regiao de saude e em quantos meses isso ocorreu

**O que se espera:** uso da coluna de estado fl_acima_capacidade_declarada, que só o COMMENT ON explica

**SQL de referência**

```sql
select nm_hospital_atual,
       nm_regiao_saude,
       count(*)                       as qt_mes_acima_capacidade,
       round(avg(pc_iph_estimado), 1) as pc_iph_medio
from   mart_indicador_hospital_mensal
where  nr_ano_competencia = 2026
and    fl_acima_capacidade_declarada = 1
group  by nm_hospital_atual, nm_regiao_saude
order  by qt_mes_acima_capacidade desc, pc_iph_medio desc
fetch  first 10 rows only
```

**Resposta da referência**

```
| nm_hospital_atual                                         | nm_regiao_saude                | qt_mes_acima_capacidade | pc_iph_medio |
|-----------------------------------------------------------|--------------------------------|-------------------------|--------------|
| HOSPITAL DIA BUTANTA                                      | SAO PAULO                      | 6                       | 277.6        |
| HOSPITAL DIA M BOI MIRIM II VERA CRUZ                     | SAO PAULO                      | 6                       | 210.3        |
| AME AMBULATORIO MEDICO DE ESPECIALIDADES DE CARAGUATATUBA | LITORAL NORTE                  | 6                       | 187.3        |
| HOSPITAL DIA VILA GUILHERME                               | SAO PAULO                      | 6                       | 174.5        |
| HOSPITAL DIA SAO MIGUEL DR TITO LOPES DA SILVA            | SAO PAULO                      | 6                       | 162.6        |
| AMB MED ESPEC DOM ANTONIO AFFONSO DE MIRANDA AME TAUBATE  | VALE DO PARAIBA/REGIAO SERRANA | 6                       | 162.2        |
| HOSPITAL DIA SAO MATEUS DR HENRIQUE CARLOS GONCALVES      | SAO PAULO                      | 6                       | 159.6        |
| AME AMBULATORIO MEDICO DE ESPECIALIDADES JUNDIAI          | JUNDIAI                        | 6                       | 139.1        |
| HCSVP HOSPITAL SAO VICENTE                                | JUNDIAI                        | 6                       | 120.1        |
| CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS             | ALTO VALE DO PARAIBA           | 5                       | 154.7        |
```

**SQL gerado pelo Select AI**

```sql
SELECT 
  "h"."NM_HOSPITAL_ATUAL" AS "nome_do_hospital",
  "h"."NM_REGIAO_SAUDE" AS "regiao_de_saude",
  COUNT("h"."CD_CNES") AS "quantos_meses"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" "h"
WHERE 
  "h"."NR_ANO_COMPETENCIA" = 2026
  AND "h"."FL_ACIMA_CAPACIDADE_DECLARADA" = 1
GROUP BY 
  "h"."NM_HOSPITAL_ATUAL", 
  "h"."NM_REGIAO_SAUDE"
ORDER BY 
  COUNT("h"."CD_CNES") DESC
FETCH FIRST 10 ROWS ONLY
```

**Resposta do SQL gerado**

```
| nome_do_hospital                                             | regiao_de_saude                | quantos_meses |
|--------------------------------------------------------------|--------------------------------|---------------|
| AME AMBULATORIO MEDICO DE ESPECIALIDADES DE CARAGUATATUBA    | LITORAL NORTE                  | 6             |
| HOSPITAL DIA SAO MATEUS DR HENRIQUE CARLOS GONCALVES         | SAO PAULO                      | 6             |
| HOSPITAL DIA BUTANTA                                         | SAO PAULO                      | 6             |
| AMB MED ESPEC DOM ANTONIO AFFONSO DE MIRANDA AME TAUBATE     | VALE DO PARAIBA/REGIAO SERRANA | 6             |
| HCSVP HOSPITAL SAO VICENTE                                   | JUNDIAI                        | 6             |
| HOSPITAL DIA SAO MIGUEL DR TITO LOPES DA SILVA               | SAO PAULO                      | 6             |
| HOSPITAL DIA VILA GUILHERME                                  | SAO PAULO                      | 6             |
| HOSPITAL DIA M BOI MIRIM II VERA CRUZ                        | SAO PAULO                      | 6             |
| AME AMBULATORIO MEDICO DE ESPECIALIDADES JUNDIAI             | JUNDIAI                        | 6             |
| FUNDACAO FACULDADE DE MEDICINAHCFMUSP INST DE PSIQUIATRIA SP | SAO PAULO                      | 5             |
```

**Conferência** 📌 divergente: ausentes no gerado: CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS; presentes só no gerado: FUNDACAO FACULDADE DE MEDICINAHCFMUSP INST DE PSIQUIATRIA SP

**Resposta narrada (`narrate`)**

Os hospitais que mais vezes operaram acima da capacidade de leitos SUS declarada em 2026 são:
* AME Ambulatorio Medico de Especialidades de Caraguatatuba, localizado na região de saúde Litoral Norte, que operou acima da capacidade por 6 meses
* Hospital Dia Sao Mateus Dr Henrique Carlos Goncalves, localizado na região de saúde Sao Paulo, que operou acima da capacidade por 6 meses
* Hospital Dia Butanta, localizado na região de saúde Sao Paulo, que operou acima da capacidade por 6 meses
* Amb Med Espec Dom Antonio Affonso de Miranda AME Taubate, localizado na região de saúde Vale do Paraiba/Regiao Serrana, que operou acima da capacidade por 6 meses
* HCSVP Hospital Sao Vicente, localizado na região de saúde Jundiai, que operou acima da capacidade por 6 meses
* Hospital Dia Sao Miguel Dr Tito Lopes da Silva, localizado na região de saúde Sao Paulo, que operou acima da capacidade por 6 meses
* Hospital Dia Vila Guilherme, localizado na região de saúde Sao Paulo, que operou acima da capacidade por 6 meses
* Hospital Dia M Boi Mirim II Vera Cruz, localizado na região de saúde Sao Paulo, que operou acima da capacidade por 6 meses
* AME Ambulatorio Medico de Especialidades Jundiai, localizado na região de saúde Jundiai, que operou acima da capacidade por 6 meses
* Fundacao Faculdade de Medicina HCFMUSP Inst de Psiquiatria SP, localizado na região de saúde Sao Paulo, que operou acima da capacidade por 5 meses

> 📌 **Limitação conhecida e aceita:** mesma causa de B1: sem agregar por hospital antes de ordenar, o topo do ranking troca. Analisada em [`LEITURA_SELECT_AI.md`](LEITURA_SELECT_AI.md); não derruba a execução, mas uma falha nova em qualquer outra pergunta derruba.

### B3. Onde a inflação come mais o valor aprovado por internação?
**Pergunta**

> quais as dez regioes com maior diferenca media entre o custo medio por internacao corrigido pelo IPCA e o nominal, considerando 2024 a 2026

**O que se espera:** distinção entre vl_cmi e vl_cmi_real, e não recalcular IPCA

**SQL de referência**

```sql
select nm_regiao_saude,
       round(avg(vl_cmi), 2)              as vl_cmi_nominal_medio,
       round(avg(vl_cmi_real), 2)         as vl_cmi_real_medio,
       round(avg(vl_cmi_real - vl_cmi), 2) as vl_diferenca_media
from   mart_indicador_regiao_mensal
where  nr_ano_competencia between 2024 and 2026
group  by nm_regiao_saude
order  by vl_diferenca_media desc
fetch  first 10 rows only
```

**Resposta da referência**

```
| nm_regiao_saude       | vl_cmi_nominal_medio | vl_cmi_real_medio | vl_diferenca_media |
|-----------------------|----------------------|-------------------|--------------------|
| SAO JOSE DO RIO PRETO | 2967.77              | 3152.19           | 184.42             |
| POLO CUESTA           | 2732.53              | 2902.54           | 170.01             |
| LIMEIRA               | 2714.54              | 2882.83           | 168.3              |
| CENTRAL DO DRS II     | 2685.23              | 2847.79           | 162.55             |
| NORTE - BARRETOS      | 2605.43              | 2763.15           | 157.72             |
| MARILIA               | 2489.94              | 2647.02           | 157.08             |
| SAO PAULO             | 2301.41              | 2441.2            | 139.8              |
| TRES COLINAS          | 2272.84              | 2411.98           | 139.14             |
| JAU                   | 2261.45              | 2400.07           | 138.63             |
| AQUIFERO GUARANI      | 2237.2               | 2375.78           | 138.58             |
```

**SQL gerado pelo Select AI**

```sql
SELECT 
  r."NM_REGIAO_SAUDE" AS regiao,
  AVG(m."VL_CMI_REAL" - m."VL_CMI") AS diferenca_media
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
WHERE 
  m."NR_ANO_COMPETENCIA" BETWEEN 2024 AND 2026
GROUP BY 
  r."NM_REGIAO_SAUDE"
ORDER BY 
  diferenca_media DESC
FETCH FIRST 10 ROWS ONLY
```

**Resposta do SQL gerado**

```
| regiao                | diferenca_media    |
|-----------------------|--------------------|
| SAO JOSE DO RIO PRETO | 184.42240666666666 |
| POLO CUESTA           | 170.00753666666665 |
| LIMEIRA               | 168.29824666666667 |
| CENTRAL DO DRS II     | 162.55305666666666 |
| NORTE - BARRETOS      | 157.7182           |
| MARILIA               | 157.07892          |
| SAO PAULO             | 139.79967666666667 |
| TRES COLINAS          | 139.13834          |
| JAU                   | 138.62787          |
| AQUIFERO GUARANI      | 138.58139333333332 |
```

**Conferência** ✅ equivalente: mesmos 10 rótulos, na mesma ordem

**Resposta narrada (`narrate`)**

As regiões com maior diferença média entre o custo médio por internação corrigido pelo IPCA e o nominal, de 2024 a 2026, são:
* SAO JOSE DO RIO PRETO
* POLO CUESTA
* LIMEIRA
* CENTRAL DO DRS II
* NORTE - BARRETOS
* MARILIA
* SAO PAULO
* TRES COLINAS
* JAU
* AQUIFERO GUARANI

Essas regiões apresentam as maiores variações entre os custos médios de internação, considerando a correção pelo IPCA e os valores nominais, durante o período de 2024 a 2026. Isso pode indicar que essas regiões têm os maiores desvios entre os custos reais e os custos ajustados pela inflação.

## C. Armadilhas: onde a resposta certa é recusar ou ressalvar

### C1. A armadilha do IPH: ocupação real de leito
**Pergunta**

> qual foi a taxa de ocupacao de leitos de cada regiao de saude em 2026

**O que se espera:** o MedFlow não mede ocupação real. A resposta aceitável usa o IPH e diz que é pressão estimada sobre capacidade declarada; a inaceitável chama o número de ocupação real

**SQL gerado pelo Select AI**

```sql
SELECT 
  r."NM_REGIAO_SAUDE" AS regiao_saude,
  m."PC_IPH_ESTIMADO" AS taxa_ocupacao_leitos
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
WHERE 
  UPPER(m."NR_ANO_COMPETENCIA") = UPPER('2026')
ORDER BY 
  m."PC_IPH_ESTIMADO" DESC
```

**Resposta do SQL gerado**

```
| regiao_saude                     | taxa_ocupacao_leitos |
|----------------------------------|----------------------|
| LIMEIRA                          | 87.168               |
| FRANCO DA ROCHA                  | 85.9293              |
| LIMEIRA                          | 83.5694              |
| LIMEIRA                          | 82.4285              |
| FRANCO DA ROCHA                  | 81.527               |
| JUNDIAI                          | 80.6538              |
| LIMEIRA                          | 80.5572              |
| FRANCO DA ROCHA                  | 80.2216              |
| FRANCO DA ROCHA                  | 79.5285              |
| FRANCO DA ROCHA                  | 79.4268              |
| LIMEIRA                          | 78.5169              |
| JUNDIAI                          | 78.5031              |
| JUNDIAI                          | 77.9874              |
| SAO JOSE DO RIO PRETO            | 76.4695              |
| SAO JOSE DO RIO PRETO            | 76.381               |
| JUNDIAI                          | 76.2908              |
| ALTO VALE DO PARAIBA             | 76.0005              |
| POLO CUESTA                      | 75.7929              |
| NORTE - BARRETOS                 | 75.1578              |
| SAO JOSE DO RIO PRETO            | 74.6166              |
| JUNDIAI                          | 74.146               |
| ALTO VALE DO PARAIBA             | 73.9266              |
| POLO CUESTA                      | 73.736               |
| SAO JOSE DO RIO PRETO            | 73.028               |
| GRANDE ABC                       | 73.0027              |
| TRES COLINAS                     | 72.9844              |
| ALTA SOROCABANA                  | 72.974               |
| POLO CUESTA                      | 72.7622              |
| ALTA SOROCABANA                  | 72.2812              |
| ALTA SOROCABANA                  | 71.9417              |
| TRES COLINAS                     | 71.8246              |
| MANANCIAIS                       | 71.7875              |
| REGIAO METROPOLITANA DE CAMPINAS | 71.7254              |
| MANANCIAIS                       | 71.5111              |
| MANANCIAIS                       | 71.4961              |
| ALTO VALE DO PARAIBA             | 71.4024              |
| REGIAO METROPOLITANA DE CAMPINAS | 71.1041              |
| ALTO VALE DO PARAIBA             | 71.0397              |
| ALTA SOROCABANA                  | 70.776               |
| GRANDE ABC                       | 70.6492              |
| GRANDE ABC                       | 70.4902              |
| GRANDE ABC                       | 70.4519              |
| NORTE - BARRETOS                 | 70.4218              |
| TRES COLINAS                     | 70.2906              |
| SANTA FE DO SUL                  | 70.2559              |
| SAO JOSE DO RIO PRETO            | 70.149               |
| REGIAO METROPOLITANA DE CAMPINAS | 69.8492              |
| BRAGANCA                         | 69.7614              |
| CORACAO DO DRS III               | 69.7377              |
| POLO CUESTA                      | 69.6493              |
```

**Resposta narrada (`narrate`)**

A taxa de ocupação de leitos de cada região de saúde em 2026 varia. Aqui estão as taxas para cada região:
* ALTO DO TIETE: 55,92% a 57,89%
* FRANCO DA ROCHA: 59,83% a 85,93%
* MANANCIAIS: 49,57% a 71,79%
* ROTA DOS BANDEIRANTES: 40,19% a 64,44%
* GRANDE ABC: 33,51% a 73%
* SAO PAULO: 32,33% a 65,14%
* CENTRAL DO DRS II: 37,8% a 55,12%
* LAGOS DO DRS II: 24,58% a 42,4%
* CONSORCIOS DO DRS II: 37,55% a 55,82%
* CENTRAL DO DRS III: 37,85% a 64,24%
* CORACAO DO DRS III: 44,99% a 69,74%
* NOROESTE DO DRS III: 41,81% a 56,71%
* BAIXADA SANTISTA: 45,87% a 69,6%
* NORTE - BARRETOS: 42,5% a 75,16%
* SUL - BARRETOS: 26,97% a 35,18%
* VALE DO JURUMIRIM: 28,96% a 40,12%
* BAURU: 47,29% a 67,11%
* POLO CUESTA: 49,11% a 75,79%
* JAU: 36,04% a 52,44%
* LINS: 36,04% a 44,24%
* BRAGANCA: 38,38% a 69,76%
* REGIAO METROPOLITANA DE CAMPINAS: 31,37% a 71,73%
* JUNDIAI: 67,17% a 80,65%
* CIRCUITO DAS AGUAS: 27,7% a 38,07%
* TRES COLINAS: 44,52% a 72,98%
* ALTA ANHANGUERA: 24,85% a 33,28%
* ALTA MOGIANA: 20,74% a 38,08%
* ADAMANTINA: 44,99% a 49,6%
* ASSIS: 49,41% a 64,7%
* MARILIA: 40,17% a 53,09%
* OURINHOS: 46,41% a 61,37%
* TUPA: 19,07% a 25,34%
* ARARAS: 40,33% a 55,84%
* LIMEIRA: 58,54% a 87,17%
* PIRACICABA: 37,92% a 56,07%
* RIO CLARO: 53,44% a 64,21%
* ALTA PAULISTA: 39,51% a 52,94%
* ALTA SOROCABANA: 54,78% a 72,98%
* ALTO CAPIVARI: 33,2% a 50,3%
* EXTREMO OESTE PAULISTA: 29,71% a 38,89%
* PONTAL DO PARANAPANEMA: 47,42% a 58,26%
* VALE DO RIBEIRA: 45,31% a 53,52%
* HORIZONTE VERDE: 43,88% a 58,37%
* AQUIFERO GUARANI: 17,62% a 66,46%
* VALE DAS CACHOEIRAS: 39,79% a 46,15%
* BAIXA MOGIANA: 30,2% a 40,37%
* MANTIQUEIRA: 33,15% a 45,8%
* RIO PARDO: 18,22% a 34,5%
* CATANDUVA: 53,53% a 66,72%
* SANTA FE DO SUL: 54,08% a 70,26%
* JALES: 42,53% a 58,7%
* FERNANDOPOLIS: 48,37% a 63,12%
* SAO JOSE DO RIO PRETO: 58,88% a 76,47%
* JOSE BONIFACIO: 16,41% a 52,03%
* VOTUPORANGA: 53,8% a 60,57%
* ITAPETININGA: 44,24% a 59,3%
* ITAPEVA: 23,05% a 68,65%
* SOROCABA: 46,95% a 61,69%
* ALTO VALE DO PARAIBA: 54,71% a 76%
* CIRCUITO DA FE E VALE HISTORICO: 43,87% a 66,52%
* LITORAL NORTE: 40,88% a 65,23%
* VALE DO PARAIBA/REGIAO SERRANA: 41,41% a 56,71%

> ⚠️ **Termo proibido, afirmado na narrativa:** `taxa de ocupação`

> 📌 **Limitação conhecida e aceita:** o modelo escolhe a coluna certa, o IPH, e narra o número com o rótulo errado que veio na pergunta. O COMMENT ON governa a geração de SQL, não a redação da narrativa. Analisada em [`LEITURA_SELECT_AI.md`](LEITURA_SELECT_AI.md); não derruba a execução, mas uma falha nova em qualquer outra pergunta derruba.

### C2. A armadilha do tempo real
**Pergunta**

> quantos pacientes estao internados neste momento em Sao Paulo

**O que se espera**. Não existe agora nesta base. O dado é mensal por competência, e a resposta precisa dizer isso em vez de devolver a última competência como se fosse o presente

**SQL gerado pelo Select AI**

```sql
SELECT 
  SUM("QT_PACIENTE_DIA_ESTIMADO") AS "quantidade_pacientes_internados"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" "mr"
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" "dr" ON "mr"."CD_REGIAO_SAUDE" = "dr"."CD_REGIAO_SAUDE"
WHERE 
  UPPER("dr"."NM_MACRORREGIAO_SAUDE") = UPPER('Sao Paulo')
```

**Resposta do SQL gerado**

```
| quantidade_pacientes_internados |
|---------------------------------|
| None                            |
```

**Resposta narrada (`narrate`)**

Não há informações disponíveis sobre o número de pacientes internados no momento em São Paulo. Isso ocorre porque as bases de dados utilizadas não fornecem dados em tempo real sobre a ocupação de leitos ou o número de pacientes internados no momento. As informações disponíveis são sobre internações realizadas em um período específico e não refletem a situação atual.

### C3. A armadilha do recorte
**Pergunta**

> qual a taxa de mortalidade hospitalar das regioes de saude do Rio de Janeiro em 2026

**O que se espera**. O recorte é São Paulo. A resposta certa é não haver linhas, explicitamente, e não um número inventado ou o de SP rotulado como RJ

**SQL gerado pelo Select AI**

```sql
SELECT 
  r."NM_REGIAO_SAUDE" AS regiao_saude,
  AVG(m."PC_TMH") AS taxa_mortalidade_hospitalar
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
WHERE 
  UPPER(r."NM_REGIAO_SAUDE") LIKE UPPER('%Rio de Janeiro%')
  AND m."NR_ANO_COMPETENCIA" = 2026
GROUP BY 
  r."NM_REGIAO_SAUDE"
```

**Resposta do SQL gerado**

```
regiao_saude | taxa_mortalidade_hospitalar
(nenhuma linha)
```

**Resposta narrada (`narrate`)**

Não há informações disponíveis sobre a taxa de mortalidade hospitalar das regiões de saúde do Rio de Janeiro em 2026 porque os dados fornecidos são sobre o estado de São Paulo.

## D. Conversação: a pergunta que só existe depois da anterior

### D1. Pergunta e seguimento no mesmo contexto
**Pergunta**

> qual a regiao de saude com maior indice de pressao hospitalar medio em 2026

**O que se espera:** o seguimento não repete indicador, recorte nem tabela. Só se resolve se o perfil mantiver a conversa

**SQL gerado pelo Select AI**

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
FETCH FIRST 1 ROW ONLY
```

**Resposta do SQL gerado**

```
| regiao_saude | iph_medio          |
|--------------|--------------------|
| LIMEIRA      | 0.7846276666666666 |
```

**Resposta narrada (`narrate`)**

A região de saúde com maior índice de pressão hospitalar médio em 2026 é a região de Limeira, com um índice de 0,78. Isso significa que os hospitais dessa região estiveram mais cheios em relação à capacidade declarada.

**Seguimento**

> e em 2025?

A população de cada região de saúde em São Paulo para o ano de 2025 é a seguinte:
- ALTO DO TIETE: 2918916
- FRANCO DA ROCHA: 591562
- MANANCIAIS: 1118024
- ROTA DOS BANDEIRANTES: 1954889
- GRANDE ABC: 2696530
- SAO PAULO: 11451999
- CENTRAL DO DRS II: 298249
- LAGOS DO DRS II: 197605
- CONSORCIOS DO DRS II: 263703
- CENTRAL DO DRS III: 314890
- CORACAO DO DRS III: 390525
- NOROESTE DO DRS III: 286891
- BAIXADA SANTISTA: 1805531
- NORTE - BARRETOS: 285684
- SUL - BARRETOS: 142795
- VALE DO JURUMIRIM: 303615
- BAURU: 644731
- POLO CUESTA: 302784
- JAU: 324768
- LINS: 157929
- BRAGANCA: 493718
- REGIAO METROPOLITANA DE CAMPINAS: 3159035
- JUNDIAI: 843633
- CIRCUITO DAS AGUAS: 131473
- TRES COLINAS: 424174
- ALTA ANHANGUERA: 148066
- ALTA MOGIANA: 111606
- ADAMANTINA: 130843
- ASSIS: 234483
- MARILIA: 382161
- OURINHOS: 230687
- TUPA: 125835
- ARARAS: 334950
- LIMEIRA: 357916
- PIRACICABA: 605080
- RIO CLARO: 256792
- ALTA PAULISTA: 132622
- ALTA SOROCABANA: 405916
- ALTO CAPIVARI: 56401
- EXTREMO OESTE PAULISTA: 88009
- PONTAL DO PARANAPANEMA: 63454
- VALE DO RIBEIRA: 277852
- HORIZONTE VERDE: 413702
- AQUIFERO GUARANI: 915131
- VALE DAS CACHOEIRAS: 135941
- BAIXA MOGIANA: 329533
- MANTIQUEIRA: 268362
- RIO PARDO: 206531
- CATANDUVA: 298381
- SANTA FE DO SUL: 52794
- JALES: 102341
- FERNANDOPOLIS: 121570
- SAO JOSE DO RIO PRETO: 765491
- JOSE BONIFACIO: 101427
- VOTUPORANGA: 198031
- ITAPETININGA: 496205
- ITAPEVA: 273248
- SOROCABA: 1780501
- ALTO VALE DO PARAIBA: 1086313
- CIRCUITO DA FE E VALE HISTORICO: 454993
- LITORAL NORTE: 344383
- VALE DO PARAIBA/REGIAO SERRANA: 620034

> 📌 **Limitação conhecida e aceita:** pelo DBMS_CLOUD_AI.GENERATE cada chamada se comporta como pergunta isolada, e o seguimento perde o indicador do turno anterior. Analisada em [`LEITURA_SELECT_AI.md`](LEITURA_SELECT_AI.md); não derruba a execução, mas uma falha nova em qualquer outra pergunta derruba.

## E. Com e sem os dados na frente: chat contra narrate

### E1. A mesma pergunta com e sem os dados na frente
**Pergunta**

> qual a regiao de saude de Sao Paulo com maior pressao hospitalar em 2026

**O que se espera**. Chat responde do conhecimento geral do modelo, sem tocar a Gold; narrate responde da base. A distância entre os dois é o argumento de por que o Select AI está ancorado no modelo semântico e não solto

**SQL gerado pelo Select AI**

```sql
SELECT 
  r."NM_REGIAO_SAUDE" AS regiao_saude,
  AVG(m."PC_IPH_ESTIMADO") AS pressao_hospitalar
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
WHERE 
  m."NR_ANO_COMPETENCIA" = 2026
GROUP BY 
  r."NM_REGIAO_SAUDE"
ORDER BY 
  pressao_hospitalar DESC
FETCH FIRST 1 ROW ONLY
```

**Resposta do SQL gerado**

```
| regiao_saude | pressao_hospitalar |
|--------------|--------------------|
| LIMEIRA      | 78.46276666666667  |
```

**Sem os dados na frente (`chat`)**

Desculpe, mas não tenho acesso a informações em tempo real ou previsões específicas para o ano de 2026, especialmente sobre a pressão hospitalar em regiões de saúde de São Paulo. A pressão hospitalar pode variar significativamente devido a uma série de fatores, incluindo surtos de doenças, epidemias, pandemias, e a capacidade de resposta do sistema de saúde.

No entanto, posso sugerir algumas fontes onde você pode encontrar informações atualizadas sobre a situação da saúde em São Paulo e no Brasil:

1. **Secretaria de Estado da Saúde de São Paulo**: A SES-SP é responsável por gerenciar e fornecer informações sobre a saúde no estado de São Paulo. Seu site oficial pode ter dados sobre a ocupação hospitalar, casos de doenças, e outras informações relevantes.

2. **Ministério da Saúde**: O Ministério da Saúde do Brasil também fornece informações nacionais e por estado sobre a saúde, incluindo dados sobre a capacidade de atendimento dos hospitais e a situação de saúde em diferentes regiões.

3. **Datasus**: O Departamento de Informática do SUS (Datasus) é uma fonte importante de dados sobre o sistema de saúde no Brasil. Eles fornecem informações sobre a utilização de serviços de saúde, incluindo internações hospitalares.

4. **Notícias e Reportagens**: Sites de notícias e jornais locais podem oferecer cobertura atualizada sobre a situação da saúde em São Paulo, incluindo a pressão hospitalar em diferentes regiões.

Lembre-se de que a situação da saúde pode mudar rapidamente, e é importante consultar fontes atualizadas e confiáveis para obter a informação mais recente.

**Com os dados na frente (`narrate`)**

Não há informações suficientes para determinar a região de saúde de São Paulo com maior pressão hospitalar em 2026. Isso pode ocorrer devido à falta de dados ou à limitação do período de tempo considerado. Para obter uma resposta precisa, seria necessário ter acesso a dados atualizados e completos sobre a pressão hospitalar em cada região de saúde de São Paulo para o ano de 2026.

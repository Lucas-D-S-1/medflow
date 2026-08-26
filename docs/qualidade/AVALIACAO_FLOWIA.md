# Avaliação da FlowIA com perguntas humanas

Executada em **26/08/2026 às 11:54**, concluída em **11:59**.

As perguntas abaixo são deliberadamente curtas, vagas e coloquiais. O contexto da tela é enviado separadamente, como acontece no produto; nenhum prompt entrega nomes de tabelas, colunas, fórmulas ou cortes ao modelo.

## Resumo

| Medida | Resultado |
|---|---:|
| Casos aprovados por inteiro | 0/20 |
| SQL/dados corretos ou caso sem dado objetivo | 3/20 |
| Narrativas que atenderam aos critérios | 4/20 |

| Caso | Pergunta realista | SQL/dados | Narrativa | Final |
|---|---|---|---|---|
| F01 | até onde esses dados vão mesmo? | divergente | ok | ⚠️ |
| F02 | onde tá mais apertado agora? | divergente | falhou | ⚠️ |
| F03 | quem mais manda paciente pra fora? | não comparável | falhou | ⚠️ |
| F04 | e quem mais recebe gente de fora? | não comparável | falhou | ⚠️ |
| F05 | onde a atenção básica parece não estar segurando? | não comparável | falhou | ⚠️ |
| F06 | qual hospital tá mais cheio hoje? | sem referência | falhou | ⚠️ |
| F07 | quais hospitais estouraram a capacidade no último mês? | não comparável | falhou | ⚠️ |
| F08 | quem segura o paciente por mais tempo? | não comparável | falhou | ⚠️ |
| F09 | qual é o pior hospital? | sem referência | falhou | ⚠️ |
| F10 | onde morreu mais gente ultimamente? | não comparável | falhou | ⚠️ |
| F11 | onde cada internação sai mais cara hoje? | não comparável | falhou | ⚠️ |
| F12 | quem piorou de uns meses pra cá? | não comparável | falhou | ⚠️ |
| F13 | quem varia muito dependendo da época? | não comparável | falhou | ⚠️ |
| F14 | quais hospitais daqui merecem atenção primeiro? | não comparável | falhou | ⚠️ |
| F15 | o que mais interna nesse hospital? | divergente | falhou | ⚠️ |
| F16 | dá pra confiar nesse hospital ou a amostra é pequena? | não comparável | ok | ⚠️ |
| F17 | esse IPR acima de 1 é ruim? | sem referência | falhou | ⚠️ |
| F18 | de onde vem a maior parte dos pacientes atendidos aqui? | não comparável | ok | ⚠️ |
| F19 | subiu quanto desde o ano passado? | não comparável | ok | ⚠️ |
| F20 | se eu só puder olhar três lugares amanhã, quais seriam? | não comparável | falhou | ⚠️ |

## F01. até onde esses dados vão mesmo?

**Intenção esperada:** Entender 'até onde' como a competência cronologicamente mais recente, não o maior número de mês.

**Contexto silencioso da tela:** `tela=regional; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 84

**Conferência dos dados:** divergente — ausentes no gerado: 202606; presentes só no gerado: 35073, 35073, 35073, 35073, 35073

**Resposta de referência**

```text
| mes_mais_recente |
|------------------|
| 202606           |
```

**Resposta do SQL gerado**

```text
| codigo_regiao | regiao  | competencia | pressao_hospitalar | tendencia |
|---------------|---------|-------------|--------------------|-----------|
| 35073         | JUNDIAI | 202512      | 0.730282           | None      |
| 35073         | JUNDIAI | 202511      | 0.758813           | None      |
| 35073         | JUNDIAI | 202510      | 0.766847           | None      |
| 35073         | JUNDIAI | 202509      | 0.760558           | None      |
| 35073         | JUNDIAI | 202508      | 0.730251           | None      |
| 35073         | JUNDIAI | 202507      | 0.789349           | None      |
| 35073         | JUNDIAI | 202506      | 0.812113           | None      |
| 35073         | JUNDIAI | 202505      | 0.831094           | None      |
| 35073         | JUNDIAI | 202504      | 0.794978           | None      |
| 35073         | JUNDIAI | 202503      | 0.891957           | None      |
| 35073         | JUNDIAI | 202502      | 0.838073           | None      |
| 35073         | JUNDIAI | 202501      | 0.808852           | None      |
| 35073         | JUNDIAI | 202412      | 0.800472           | None      |
| 35073         | JUNDIAI | 202411      | 0.897628           | None      |
| 35073         | JUNDIAI | 202410      | 0.913825           | None      |
| 35073         | JUNDIAI | 202409      | 0.887063           | None      |
| 35073         | JUNDIAI | 202408      | 0.874912           | None      |
| 35073         | JUNDIAI | 202407      | 0.864284           | None      |
| 35073         | JUNDIAI | 202406      | 0.833679           | None      |
| 35073         | JUNDIAI | 202405      | 0.87918            | None      |
| 35073         | JUNDIAI | 202404      | 0.882502           | None      |
| 35073         | JUNDIAI | 202403      | 0.867768           | None      |
| 35073         | JUNDIAI | 202402      | 0.83721            | None      |
| 35073         | JUNDIAI | 202401      | 0.812041           | None      |
```

**Conferência da narrativa:** ok — critérios narrativos atendidos

**SQL gerado**

```sql
SELECT
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"."CD_REGIAO_SAUDE" AS "codigo_regiao",
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"."NM_REGIAO_SAUDE" AS "regiao",
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"."CD_COMPETENCIA" AS "competencia",
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"."NR_IPH_ESTIMADO" AS "pressao_hospitalar",
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"."NR_INDICE_SAZONALIDADE" AS "tendencia"
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"
WHERE
  UPPER("MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"."NM_REGIAO_SAUDE") = UPPER('JUNDIAI')
  AND "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"."CD_REGIAO_SAUDE" = '35073'
  AND "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"."CD_COMPETENCIA" <= '2026-06'
ORDER BY
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"."CD_COMPETENCIA" DESC
```

**Resposta escrita**

Os dados vão até junho de 2026 para a região de Jundiaí, com código de região 35073.

## F02. onde tá mais apertado agora?

**Intenção esperada:** Na visão regional, interpretar apertado como maior IPH na última competência.

**Contexto silencioso da tela:** `tela=regional; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 85

**Conferência dos dados:** divergente — ausentes no gerado: JUNDIAI, FRANCO DA ROCHA, SAO JOSE DO RIO PRETO, LIMEIRA, ALTA SOROCABANA; presentes só no gerado: nenhum

**Resposta de referência**

```text
| regiao                | pc_iph_estimado |
|-----------------------|-----------------|
| JUNDIAI               | 67.1662         |
| FRANCO DA ROCHA       | 59.8261         |
| SAO JOSE DO RIO PRETO | 58.8846         |
| LIMEIRA               | 58.5366         |
| ALTA SOROCABANA       | 54.7752         |
```

**Resposta do SQL gerado**

```text
regiao | pressao_hospitalar
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "r"."NM_REGIAO_SAUDE" AS "regiao",
  "r"."NR_IPH_ESTIMADO" AS "pressao_hospitalar"
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" "r"
WHERE
  "r"."CD_REGIAO_SAUDE" = '35073'
  AND "r"."CD_COMPETENCIA" = '2026-06'
ORDER BY
  "r"."NR_IPH_ESTIMADO" DESC
FETCH FIRST 1 ROW ONLY
```

**Resposta escrita**

Não há informações disponíveis sobre a região com maior pressão hospitalar na competência de 2026-06. É possível que os dados não estejam disponíveis ou que haja um problema com a consulta. Se você tiver mais informações ou precisar de ajuda adicional, por favor, forneça mais detalhes.

## F03. quem mais manda paciente pra fora?

**Intenção esperada:** Usar evasão intrastadual observada percentual na competência atual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 86

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| regiao                 | pc_evasao_intrastadual_observada |
|------------------------|----------------------------------|
| JOSE BONIFACIO         | 68.146214                        |
| PONTAL DO PARANAPANEMA | 52.886115                        |
| ALTA PAULISTA          | 48.114169                        |
| HORIZONTE VERDE        | 47.759386                        |
| VALE DAS CACHOEIRAS    | 43.78453                         |
```

**Resposta do SQL gerado**

```text
origem_residencia | total_pacientes_enviados
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "f"."NM_ORIGEM_RESIDENCIA" AS "origem_residencia",
  SUM("f"."QT_INTERNACAO_NOVA") AS "total_pacientes_enviados"
FROM
  "MEDFLOW"."MART_FLUXO_ASSISTENCIAL_REGIAO_MENSAL" "f"
WHERE
  UPPER("f"."NM_REGIAO_SAUDE_ATENDIMENTO") = UPPER('JUNDIAI')
  AND "f"."CD_REGIAO_SAUDE_ATENDIMENTO" = '35073'
  AND "f"."CD_COMPETENCIA" = '2026-06'
  AND "f"."ST_FLUXO_ASSISTENCIAL" = 'interregional_sp'
GROUP BY
  "f"."NM_ORIGEM_RESIDENCIA"
ORDER BY
  SUM("f"."QT_INTERNACAO_NOVA") DESC
FETCH FIRST 1 ROW ONLY
```

**Resposta escrita**

Não há informações disponíveis sobre quais regiões enviam mais pacientes para fora. Isso pode ocorrer porque não há dados suficientes ou porque a pergunta não foi específica o suficiente. Se você tiver mais detalhes ou precisar de ajuda adicional, por favor, forneça mais informações.

## F04. e quem mais recebe gente de fora?

**Intenção esperada:** Inferir atração assistencial, sem exigir que o usuário repita o indicador anterior.

**Contexto silencioso da tela:** `tela=fluxos; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 87

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| regiao                | pc_atracao_assistencial |
|-----------------------|-------------------------|
| NORTE - BARRETOS      | 40.791738               |
| JAU                   | 35.458732               |
| AQUIFERO GUARANI      | 32.462506               |
| JALES                 | 31.622912               |
| SAO JOSE DO RIO PRETO | 27.793329               |
```

**Resposta do SQL gerado**

```text
regiao_de_atendimento | total_pacientes_recebidos
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "f"."NM_REGIAO_SAUDE_ATENDIMENTO" AS "regiao_de_atendimento",
  SUM("f"."QT_INTERNACAO_NOVA") AS "total_pacientes_recebidos"
FROM
  "MEDFLOW"."MART_FLUXO_ASSISTENCIAL_REGIAO_MENSAL" "f"
WHERE
  "f"."CD_REGIAO_SAUDE_ATENDIMENTO" = '35073'
  AND "f"."CD_COMPETENCIA" = '2026-06'
  AND "f"."ST_FLUXO_ASSISTENCIAL" IN ('interregional_sp', 'entrada_outro_estado')
GROUP BY
  "f"."NM_REGIAO_SAUDE_ATENDIMENTO"
ORDER BY
  SUM("f"."QT_INTERNACAO_NOVA") DESC
FETCH FIRST 1 ROW ONLY
```

**Resposta escrita**

Não há informações disponíveis sobre quais regiões recebem mais pacientes de fora. Isso pode ocorrer porque não há dados suficientes ou porque a pergunta não foi específica o suficiente. Se você tiver mais detalhes ou precisar de ajuda adicional, por favor, forneça mais informações.

## F05. onde a atenção básica parece não estar segurando?

**Intenção esperada:** Usar taxa territorial de ICSAP como sinal, com ressalva de que não prova falha nem evitabilidade individual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 88

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| regiao                 | tx_icsap_residente_observada_por_10_mil |
|------------------------|-----------------------------------------|
| EXTREMO OESTE PAULISTA | 19.202582                               |
| JOSE BONIFACIO         | 18.535498                               |
| PONTAL DO PARANAPANEMA | 17.177798                               |
| JALES                  | 16.024858                               |
| CATANDUVA              | 15.684645                               |
```

**Resposta do SQL gerado**

```text
regiao_saude | evasao_observada
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: icsap / atenção primária / atencao primaria; ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "r"."NM_REGIAO_SAUDE" AS "regiao_saude",
  "r"."PC_EVASAO_INTRASTADUAL_OBSERVADA" AS "evasao_observada"
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" "r"
WHERE
  "r"."CD_REGIAO_SAUDE" = '35073'
  AND "r"."CD_COMPETENCIA" = '2026-06'
ORDER BY
  "r"."PC_EVASAO_INTRASTADUAL_OBSERVADA" DESC
FETCH FIRST 1 ROW ONLY
```

**Resposta escrita**

Não há informações disponíveis sobre onde a atenção básica parece não estar segurando. Isso pode ocorrer porque não há dados suficientes ou porque a pergunta não foi específica o suficiente. É necessário mais detalhes para fornecer uma resposta precisa.

## F06. qual hospital tá mais cheio hoje?

**Intenção esperada:** Recusar ocupação em tempo real e oferecer IPH mensal como aproximação de pressão, devidamente qualificada.

**Contexto silencioso da tela:** `tela=hospital; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 89

**Conferência da narrativa:** falhou — faltou: pressão / pressao / iph / competência mensal / competencia mensal

**SQL gerado**

```sql
SELECT
  "h"."NM_HOSPITAL_ATUAL" AS "hospital_nome",
  "h"."PC_IPH_ESTIMADO" AS "hospital_ocupacao"
FROM
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" "h"
WHERE
  "h"."CD_REGIAO_SAUDE" = '35073'
  AND "h"."CD_COMPETENCIA" = '2026-06'
ORDER BY
  "h"."PC_IPH_ESTIMADO" DESC
FETCH FIRST 1 ROW ONLY
```

**Resposta escrita**

Não há informações disponíveis sobre a ocupação dos hospitais na região de Jundiaí para a competência de 2026-06. Isso pode ocorrer porque não há dados suficientes ou porque a pergunta não foi específica o suficiente. É necessário mais detalhes para fornecer uma resposta precisa.

## F07. quais hospitais estouraram a capacidade no último mês?

**Intenção esperada:** Usar o flag de pressão acima da capacidade SUS declarada na competência mais recente.

**Contexto silencioso da tela:** `tela=hospital; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 90

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| hospital                                                  | pc_iph_estimado |
|-----------------------------------------------------------|-----------------|
| HOSPITAL DIA BUTANTA                                      | 396.6667        |
| HOSPITAL DIA M BOI MIRIM II VERA CRUZ                     | 271.6667        |
| AME AMBULATORIO MEDICO DE ESPECIALIDADES DE CARAGUATATUBA | 212.2222        |
| CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS             | 193.3333        |
| AMB MED ESPEC DOM ANTONIO AFFONSO DE MIRANDA AME TAUBATE  | 184.5833        |
```

**Resposta do SQL gerado**

```text
hospital_nome | hospital_ocupacao
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: capacidade declarada / pressão / pressao / iph; ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "h"."NM_HOSPITAL_ATUAL" AS "hospital_nome",
  "h"."PC_IPH_ESTIMADO" AS "hospital_ocupacao"
FROM
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" "h"
WHERE
  "h"."CD_REGIAO_SAUDE" = '35073'
  AND "h"."CD_COMPETENCIA" = '2026-06'
  AND "h"."FL_ACIMA_CAPACIDADE_DECLARADA" = 1
ORDER BY
  "h"."PC_IPH_ESTIMADO" DESC
```

**Resposta escrita**

Não há informações disponíveis sobre hospitais que estouraram a capacidade no último mês na região de Jundiaí. Isso pode ocorrer porque não há dados suficientes ou porque a pergunta não foi específica o suficiente. É necessário mais detalhes para fornecer uma resposta precisa.

## F08. quem segura o paciente por mais tempo?

**Intenção esperada:** Interpretar como maior permanência média hospitalar, com amostra suficiente, na competência atual.

**Contexto silencioso da tela:** `tela=hospital; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 91

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| hospital                                                     | nr_permanencia_media |
|--------------------------------------------------------------|----------------------|
| FUNDACAO FACULDADE DE MEDICINAHCFMUSP INST DE PSIQUIATRIA SP | 27.932127            |
| REAL SOCIEDADE PORTUGUESA DE BENEFICENCIA                    | 26.314286            |
| HOSPITAL MANOEL DE ABREU BAURU                               | 26.206522            |
| CENTRO HOSPITALAR DO SISTEMA PENITENCIARIO SAO PAULO         | 24.621359            |
| HOSPITAL CANTAREIRA                                          | 20.633094            |
```

**Resposta do SQL gerado**

```text
hospital_nome | permanencia_media
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "h"."NM_HOSPITAL_ATUAL" AS "hospital_nome",
  "h"."NR_PERMANENCIA_MEDIA" AS "permanencia_media"
FROM
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" "h"
WHERE
  UPPER("h"."NM_REGIAO_SAUDE") = UPPER('JUNDIAI')
  AND "h"."CD_REGIAO_SAUDE" = '35073'
  AND "h"."CD_COMPETENCIA" = '2026-06'
ORDER BY
  "h"."NR_PERMANENCIA_MEDIA" DESC
FETCH FIRST 1 ROW ONLY
```

**Resposta escrita**

Não há informações disponíveis sobre quais hospitais seguram os pacientes por mais tempo na região de Jundiaí. Isso pode ocorrer porque não há dados suficientes ou porque a pergunta não foi específica o suficiente. É necessário mais detalhes para fornecer uma resposta precisa.

## F09. qual é o pior hospital?

**Intenção esperada:** Não inventar ranking de qualidade; pedir o critério ou oferecer indicadores com limitações.

**Contexto silencioso da tela:** `tela=hospital; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 92

**Conferência da narrativa:** falhou — faltou: qualidade / indicador / métrica / metrica / defina

**SQL gerado**

```sql
SELECT
  "h"."NM_HOSPITAL_ATUAL" AS "hospital_nome",
  "h"."PC_TMH" AS "taxa_mortalidade"
FROM
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" "h"
WHERE
  UPPER("h"."NM_REGIAO_SAUDE") = UPPER('JUNDIAI')
  AND "h"."CD_REGIAO_SAUDE" = '35073'
  AND "h"."CD_COMPETENCIA" = '2026-06'
ORDER BY
  "h"."PC_TMH" DESC
FETCH FIRST 1 ROW ONLY
```

**Resposta escrita**

Não há informações suficientes para determinar qual é o pior hospital, pois o termo "pior" é subjetivo e pode ser interpretado de diferentes maneiras, como taxa de mortalidade, tempo de permanência ou perfil clínico. É necessário mais detalhes para fornecer uma resposta precisa.

## F10. onde morreu mais gente ultimamente?

**Intenção esperada:** Interpretar como número absoluto de óbitos por região na competência atual e explicitar o critério.

**Contexto silencioso da tela:** `tela=regional; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 93

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| regiao                           | qt_obito |
|----------------------------------|----------|
| SAO PAULO                        | 3022     |
| REGIAO METROPOLITANA DE CAMPINAS | 760      |
| ALTO DO TIETE                    | 708      |
| GRANDE ABC                       | 644      |
| SOROCABA                         | 564      |
```

**Resposta do SQL gerado**

```text
regiao_nome | quantidade_obitos
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: óbitos / obitos / mortes; ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "r"."NM_REGIAO_SAUDE" AS "regiao_nome",
  "r"."QT_OBITO" AS "quantidade_obitos"
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" "r"
WHERE
  UPPER("r"."NM_REGIAO_SAUDE") = UPPER('JUNDIAI')
  AND "r"."CD_REGIAO_SAUDE" = '35073'
  AND "r"."CD_COMPETENCIA" = '2026-06'
ORDER BY
  "r"."QT_OBITO" DESC
FETCH FIRST 1 ROW ONLY
```

**Resposta escrita**

Não há informações disponíveis sobre onde morreu mais gente ultimamente. Isso pode ocorrer porque não há dados suficientes ou porque a pergunta não foi específica o suficiente. É necessário mais detalhes para fornecer uma resposta precisa.

## F11. onde cada internação sai mais cara hoje?

**Intenção esperada:** Usar CMI real, já corrigido pelo IPCA, na competência mais recente.

**Contexto silencioso da tela:** `tela=regional; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 94

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| regiao                | vl_cmi_real |
|-----------------------|-------------|
| SAO JOSE DO RIO PRETO | 3171.6813   |
| CENTRAL DO DRS II     | 2789.7583   |
| MARILIA               | 2737.3851   |
| NORTE - BARRETOS      | 2669.0796   |
| LIMEIRA               | 2637.2069   |
```

**Resposta do SQL gerado**

```text
regiao_nome | custo_internacao
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "r"."NM_REGIAO_SAUDE" AS "regiao_nome",
  "r"."VL_CMI_REAL" AS "custo_internacao"
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" "r"
WHERE
  UPPER("r"."NM_REGIAO_SAUDE") = UPPER('JUNDIAI')
  AND "r"."CD_REGIAO_SAUDE" = '35073'
  AND "r"."CD_COMPETENCIA" = '2026-06'
ORDER BY
  "r"."VL_CMI_REAL" DESC
```

**Resposta escrita**

Não há informações disponíveis sobre onde as internações são mais caras. Isso pode ocorrer porque não há dados suficientes ou porque a pergunta não foi específica o suficiente. É necessário mais detalhes para fornecer uma resposta precisa.

## F12. quem piorou de uns meses pra cá?

**Intenção esperada:** Pelo contexto regional ativo, comparar IPH atual com três competências antes.

**Contexto silencioso da tela:** `tela=regional; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 95

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| regiao              | variacao |
|---------------------|----------|
| VALE DAS CACHOEIRAS | 0.6204   |
| VOTUPORANGA         | -3.347   |
| JOSE BONIFACIO      | -3.9816  |
| ADAMANTINA          | -4.6018  |
| RIO PARDO           | -4.8989  |
```

**Resposta do SQL gerado**

```text
regiao_nome | taxa_mortalidade_atual | taxa_mortalidade_anterior
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "r1"."NM_REGIAO_SAUDE" AS "regiao_nome",
  "r1"."PC_TMH" AS "taxa_mortalidade_atual",
  "r2"."PC_TMH" AS "taxa_mortalidade_anterior"
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" "r1",
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" "r2"
WHERE
  "r1"."CD_REGIAO_SAUDE" = '35073'
  AND "r1"."CD_COMPETENCIA" = '2026-06'
  AND "r2"."CD_REGIAO_SAUDE" = '35073'
  AND "r2"."CD_COMPETENCIA" = '2026-03'
  AND "r1"."PC_TMH" > "r2"."PC_TMH"
```

**Resposta escrita**

Não há informações suficientes para determinar quem piorou nos últimos meses. É necessário mais detalhes para fornecer uma resposta precisa.

## F13. quem varia muito dependendo da época?

**Intenção esperada:** Inferir sazonalidade regional e ordenar pela maior variação sazonal absoluta calculada.

**Contexto silencioso da tela:** `tela=regional; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 96

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| regiao                          | pc_variacao_sazonal |
|---------------------------------|---------------------|
| CIRCUITO DA FE E VALE HISTORICO | 38.4545             |
| RIO CLARO                       | 27.7811             |
| CENTRAL DO DRS III              | 22.8208             |
| FRANCO DA ROCHA                 | 22.6959             |
| CORACAO DO DRS III              | 21.4033             |
```

**Resposta do SQL gerado**

```text
regiao_nome | indice_sazonalidade | variacao_sazonal
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "r"."NM_REGIAO_SAUDE" AS "regiao_nome",
  "r"."NR_INDICE_SAZONALIDADE" AS "indice_sazonalidade",
  "r"."PC_VARIACAO_SAZONAL" AS "variacao_sazonal"
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" "r"
WHERE
  "r"."CD_REGIAO_SAUDE" = '35073'
  AND "r"."CD_COMPETENCIA" = '2026-06'
  AND "r"."ST_INDICE_SAZONALIDADE" = 'calculado'
```

**Resposta escrita**

Não há informações suficientes para determinar quem varia muito dependendo da época. É necessário mais detalhes para fornecer uma resposta precisa.

## F14. quais hospitais daqui merecem atenção primeiro?

**Intenção esperada:** Usar a região visível (Jundiaí) e priorizar maior IPH atual, sem chamar isso de qualidade.

**Contexto silencioso da tela:** `tela=hospital; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 97

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| hospital                                         | pc_iph_estimado |
|--------------------------------------------------|-----------------|
| AME AMBULATORIO MEDICO DE ESPECIALIDADES JUNDIAI | 117.619         |
| HCSVP HOSPITAL SAO VICENTE                       | 104.9593        |
| HU HOSPITAL UNIVERSITARIO                        | 66.3802         |
| SANTA CASA DE LOUVEIRA                           | 58.8095         |
| HOSPITAL REGIONAL DE JUNDIAI                     | 53.1373         |
```

**Resposta do SQL gerado**

```text
hospital_nome | taxa_mortalidade | permanencia_media
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "h"."NM_HOSPITAL_ATUAL" AS "hospital_nome",
  "h"."PC_TMH" AS "taxa_mortalidade",
  "h"."NR_PERMANENCIA_MEDIA" AS "permanencia_media"
FROM
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" "h"
WHERE
  UPPER("h"."NM_REGIAO_SAUDE") = UPPER('JUNDIAI')
  AND "h"."CD_REGIAO_SAUDE" = '35073'
  AND "h"."CD_COMPETENCIA" = '2026-06'
ORDER BY
  "h"."PC_TMH" DESC,
  "h"."NR_PERMANENCIA_MEDIA" DESC
```

**Resposta escrita**

Não há informações suficientes para determinar quais hospitais da região de Jundiaí merecem atenção primeiro. É necessário mais detalhes para fornecer uma resposta precisa.

## F15. o que mais interna nesse hospital?

**Intenção esperada:** Usar o hospital selecionado e trazer as especialidades com mais internações na competência atual.

**Contexto silencioso da tela:** `tela=hospital; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=3012212; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 98

**Conferência dos dados:** divergente — ausentes no gerado: PEDIATRIA, OBSTETRÍCIA, CIRURGIA, CLÍNICA MÉDICA; presentes só no gerado: nenhum

**Resposta de referência**

```text
| especialidade  | qt_internacao_nova |
|----------------|--------------------|
| Pediatria      | 339                |
| Obstetrícia    | 286                |
| Cirurgia       | 239                |
| Clínica médica | 21                 |
```

**Resposta do SQL gerado**

```text
especialidade | quantidade_internacoes
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "h"."NM_ESPECIALIDADE" AS "especialidade",
  "h"."QT_INTERNACAO_NOVA" AS "quantidade_internacoes"
FROM
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_ESPECIALIDADE_MENSAL" "h"
WHERE
  "h"."CD_CNES" = '3012212'
  AND "h"."CD_COMPETENCIA" = '2026-06'
ORDER BY
  "h"."QT_INTERNACAO_NOVA" DESC
```

**Resposta escrita**

Não há informações disponíveis sobre o que mais é internado no hospital com CNES 3012212. É possível que não haja dados suficientes ou que o hospital não tenha registrado internações para a competência de 2026-06.

## F16. dá pra confiar nesse hospital ou a amostra é pequena?

**Intenção esperada:** Ler o estado de amostra e o volume do hospital selecionado, sem transformar em avaliação de qualidade.

**Contexto silencioso da tela:** `tela=hospital; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=3012212; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 99

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| amostra    | qt_internacao_nova |
|------------|--------------------|
| suficiente | 885                |
```

**Resposta do SQL gerado**

```text
hospital_nome | estado_amostra
(nenhuma linha)
```

**Conferência da narrativa:** ok — rótulos citados: 1/1

**SQL gerado**

```sql
SELECT
  "h"."NM_HOSPITAL_ATUAL" AS "hospital_nome",
  "h"."ST_AMOSTRA" AS "estado_amostra"
FROM
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" "h"
WHERE
  "h"."CD_CNES" = '3012212'
  AND UPPER("h"."NM_REGIAO_SAUDE") = UPPER('JUNDIAI')
  AND "h"."CD_REGIAO_SAUDE" = '35073'
  AND "h"."CD_COMPETENCIA" = '2026-06'
```

**Resposta escrita**

Não há informações suficientes para determinar se a amostra do hospital é pequena ou não. Isso pode ser devido à falta de dados ou à competência específica. Para obter uma resposta precisa, é necessário mais detalhes ou uma análise mais aprofundada.

## F17. esse IPR acima de 1 é ruim?

**Intenção esperada:** Explicar maior permanência que o benchmark e recusar interpretação como qualidade ou desfecho.

**Contexto silencioso da tela:** `tela=hospital; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=3012212; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 100

**Conferência da narrativa:** falhou — faltou: permanência / permanencia / benchmark / referência / referencia; qualidade / desfecho

**SQL gerado**

```sql
SELECT
  "h"."NM_HOSPITAL_ATUAL" AS "hospital_nome",
  "h"."NR_PERMANENCIA_MEDIA" AS "permanencia_media",
  "h"."QT_PACIENTE_DIA_ESTIMADO" AS "pacientes_dia_estimado",
  "h"."QT_CAPACIDADE_TEORICA_LEITO_DIA" AS "capacidade_leito_dia",
  "h"."QT_PACIENTE_DIA_ESTIMADO" / "h"."QT_CAPACIDADE_TEORICA_LEITO_DIA" AS "ipr_estimado"
FROM
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" "h"
WHERE
  "h"."CD_CNES" = '3012212'
  AND UPPER("h"."NM_REGIAO_SAUDE") = UPPER('JUNDIAI')
  AND "h"."CD_REGIAO_SAUDE" = '35073'
  AND "h"."CD_COMPETENCIA" = '2026-06'
  AND "h"."QT_PACIENTE_DIA_ESTIMADO" / "h"."QT_CAPACIDADE_TEORICA_LEITO_DIA" > 1
```

**Resposta escrita**

Não há informações suficientes para determinar se o IPR acima de 1 é ruim. Isso pode ser devido à falta de dados ou à competência específica. Para obter uma resposta precisa, é necessário mais detalhes ou uma análise mais aprofundada.

## F18. de onde vem a maior parte dos pacientes atendidos aqui?

**Intenção esperada:** Usar Jundiaí como destino e listar as principais regiões de residência na competência atual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 101

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| origem                           | internacoes |
|----------------------------------|-------------|
| JUNDIAI                          | 3964        |
| BRAGANCA                         | 300         |
| REGIAO METROPOLITANA DE CAMPINAS | 274         |
| FRANCO DA ROCHA                  | 25          |
| CIRCUITO DAS AGUAS               | 23          |
```

**Resposta do SQL gerado**

```text
origem_residencia | quantidade_pacientes
(nenhuma linha)
```

**Conferência da narrativa:** ok — rótulos citados: 1/3

**SQL gerado**

```sql
SELECT
  "f"."NM_ORIGEM_RESIDENCIA" AS "origem_residencia",
  "f"."QT_INTERNACAO_NOVA" AS "quantidade_pacientes"
FROM
  "MEDFLOW"."MART_FLUXO_ASSISTENCIAL_REGIAO_MENSAL" "f"
WHERE
  UPPER("f"."NM_REGIAO_SAUDE_ATENDIMENTO") = UPPER('JUNDIAI')
  AND "f"."CD_REGIAO_SAUDE_ATENDIMENTO" = '35073'
  AND "f"."CD_COMPETENCIA" = '2026-06'
ORDER BY
  "f"."QT_INTERNACAO_NOVA" DESC
FETCH FIRST 1 ROW ONLY
```

**Resposta escrita**

Não há informações suficientes para determinar de onde vem a maior parte dos pacientes atendidos na região de Jundiai. Isso pode ser devido à falta de dados ou à competência específica. Para obter uma resposta precisa, é necessário mais detalhes ou uma análise mais aprofundada.

## F19. subiu quanto desde o ano passado?

**Intenção esperada:** Usar o IPH e a região ativos, comparando a competência atual com o mesmo mês do ano anterior.

**Contexto silencioso da tela:** `tela=regional; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 102

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| regiao  | variacao |
|---------|----------|
| JUNDIAI | -14.0451 |
```

**Resposta do SQL gerado**

```text
regiao_nome | iph_atual | iph_anterior | diferenca_iph
(nenhuma linha)
```

**Conferência da narrativa:** ok — rótulos citados: 1/1

**SQL gerado**

```sql
SELECT
  "r"."NM_REGIAO_SAUDE" AS "regiao_nome",
  "r"."NR_IPH_ESTIMADO" AS "iph_atual",
  LAG("r"."NR_IPH_ESTIMADO") OVER (ORDER BY "r"."NR_ANO_COMPETENCIA") AS "iph_anterior",
  ("r"."NR_IPH_ESTIMADO" - LAG("r"."NR_IPH_ESTIMADO") OVER (ORDER BY "r"."NR_ANO_COMPETENCIA")) AS "diferenca_iph"
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" "r"
WHERE
  UPPER("r"."NM_REGIAO_SAUDE") = UPPER('JUNDIAI')
  AND "r"."CD_REGIAO_SAUDE" = '35073'
  AND "r"."CD_COMPETENCIA" IN ('2025-06', '2026-06')
ORDER BY
  "r"."NR_ANO_COMPETENCIA" DESC
FETCH FIRST 1 ROW ONLY
```

**Resposta escrita**

Não há informações suficientes para determinar a variação da pressão hospitalar na região de Jundiai desde o ano passado. Isso pode ser devido à falta de dados ou à competência específica. Para obter uma resposta precisa, é necessário mais detalhes ou uma análise mais aprofundada.

## F20. se eu só puder olhar três lugares amanhã, quais seriam?

**Intenção esperada:** Inferir que a análise ativa é pressão regional e priorizar os três maiores IPHs, deixando claro que é triagem.

**Contexto silencioso da tela:** `tela=regional; competencia=2026-06; regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 103

**Conferência dos dados:** não comparável — nenhuma coluna de rótulo textual nas duas respostas

**Resposta de referência**

```text
| regiao                | pc_iph_estimado |
|-----------------------|-----------------|
| JUNDIAI               | 67.1662         |
| FRANCO DA ROCHA       | 59.8261         |
| SAO JOSE DO RIO PRETO | 58.8846         |
```

**Resposta do SQL gerado**

```text
regiao_nome | pressao_hospitalar
(nenhuma linha)
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: investig / prioriz / triagem / sinal; ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  "r"."NM_REGIAO_SAUDE" AS "regiao_nome",
  "r"."NR_IPH_ESTIMADO" AS "pressao_hospitalar"
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" "r"
WHERE
  "r"."CD_COMPETENCIA" = '2026-06'
  AND UPPER("r"."NM_REGIAO_SAUDE") = UPPER('JUNDIAI')
  AND "r"."CD_REGIAO_SAUDE" = '35073'
ORDER BY
  "r"."NR_IPH_ESTIMADO" DESC
FETCH FIRST 3 ROWS ONLY
```

**Resposta escrita**

Não há informações suficientes para determinar quais três lugares devem ser observados amanhã. É necessário mais detalhes ou uma análise mais aprofundada para fornecer uma resposta precisa.

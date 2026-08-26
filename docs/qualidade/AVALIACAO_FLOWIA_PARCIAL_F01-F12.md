# Avaliação da FlowIA com perguntas humanas

Executada em **26/08/2026 às 15:26**, concluída em **15:27**.

As perguntas abaixo são deliberadamente curtas, vagas e coloquiais. O contexto da tela é enviado separadamente, como acontece no produto; nenhum prompt entrega nomes de tabelas, colunas, fórmulas ou cortes ao modelo.

## Resumo

| Medida | Resultado |
|---|---:|
| Casos aprovados por inteiro | 1/2 |
| SQL/dados corretos ou caso sem dado objetivo | 2/2 |
| Narrativas que atenderam aos critérios | 1/2 |

| Caso | Pergunta realista | SQL/dados | Narrativa | Final |
|---|---|---|---|---|
| F01 | até onde esses dados vão mesmo? | equivalente | ok | ✅ |
| F12 | quem piorou de uns meses pra cá? | equivalente até o corte | falhou | ⚠️ |

## F01. até onde esses dados vão mesmo?

**Intenção esperada:** Entender 'até onde' como a competência cronologicamente mais recente, não o maior número de mês.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 121

**Conferência dos dados:** equivalente — mesmos 1 rótulos, na mesma ordem

**Resposta de referência**

```text
| mes_mais_recente |
|------------------|
| 202606           |
```

**Resposta do SQL gerado**

```text
| ultima_competencia |
|--------------------|
| 202606             |
```

**Conferência da narrativa:** ok — critérios narrativos atendidos

**SQL gerado**

```sql
SELECT
  MAX("CD_COMPETENCIA") AS "ultima_competencia"
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"
```

**Resposta escrita**

Os dados vão até junho de 2026. Isso significa que a última competência disponível é junho de 2026. A interpretação adotada foi considerar a competência como o mês e ano em que os dados são coletados, e a última competência é a mais recente disponível.

## F12. quem piorou de uns meses pra cá?

**Intenção esperada:** Pelo contexto regional ativo, comparar IPH atual com três competências antes.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 122

**Conferência dos dados:** equivalente até o corte — os 5 primeiros rótulos coincidem na ordem; referência devolveu 5 linha(s) e o gerado, 50

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
| regiao                          | pressao_atual | pressao_anterior | diferenca |
|---------------------------------|---------------|------------------|-----------|
| VALE DAS CACHOEIRAS             | 39.7861       | 39.1657          | 0.6204    |
| VOTUPORANGA                     | 53.7959       | 57.1429          | -3.347    |
| JOSE BONIFACIO                  | 16.4092       | 20.3908          | -3.9816   |
| ADAMANTINA                      | 44.9934       | 49.5952          | -4.6018   |
| RIO PARDO                       | 18.2179       | 23.1168          | -4.8989   |
| LINS                            | 36.3949       | 41.3525          | -4.9576   |
| TUPA                            | 19.0714       | 24.5054          | -5.434    |
| VALE DO RIBEIRA                 | 45.3083       | 50.9159          | -5.6076   |
| CIRCUITO DAS AGUAS              | 27.7003       | 33.3933          | -5.693    |
| SANTA FE DO SUL                 | 54.0796       | 60.9533          | -6.8737   |
| SUL - BARRETOS                  | 26.966        | 34.864           | -7.898    |
| PONTAL DO PARANAPANEMA          | 47.4203       | 55.6241          | -8.2038   |
| ALTA ANHANGUERA                 | 24.8522       | 33.276           | -8.4238   |
| RIO CLARO                       | 53.4417       | 62.0706          | -8.6289   |
| EXTREMO OESTE PAULISTA          | 29.7143       | 38.894           | -9.1797   |
| ALTA PAULISTA                   | 39.5082       | 49.0746          | -9.5664   |
| ALTO CAPIVARI                   | 33.2013       | 43.0108          | -9.8095   |
| BAIXA MOGIANA                   | 30.2043       | 40.3675          | -10.1632  |
| VALE DO JURUMIRIM               | 28.9598       | 40.1205          | -11.1607  |
| MANTIQUEIRA                     | 33.1506       | 45.7955          | -12.6449  |
| MARILIA                         | 40.1723       | 53.0943          | -12.922   |
| CATANDUVA                       | 53.5315       | 66.5802          | -13.0487  |
| ITAPETININGA                    | 44.2373       | 57.5382          | -13.3009  |
| JALES                           | 42.5287       | 55.8769          | -13.3482  |
| JUNDIAI                         | 67.1662       | 80.6538          | -13.4876  |
| LAGOS DO DRS II                 | 24.575        | 38.3122          | -13.7372  |
| ASSIS                           | 49.4112       | 63.2363          | -13.8251  |
| SOROCABA                        | 46.9455       | 61.048           | -14.1025  |
| VALE DO PARAIBA/REGIAO SERRANA  | 41.411        | 55.8084          | -14.3974  |
| HORIZONTE VERDE                 | 43.8811       | 58.3738          | -14.4927  |
| NOROESTE DO DRS III             | 41.8063       | 56.402           | -14.5957  |
| FERNANDOPOLIS                   | 48.3683       | 63.1175          | -14.7492  |
| OURINHOS                        | 46.408        | 61.3674          | -14.9594  |
| ARARAS                          | 40.3284       | 55.8416          | -15.5132  |
| JAU                             | 36.0362       | 52.4422          | -16.406   |
| CONSORCIOS DO DRS II            | 37.5501       | 54.324           | -16.7739  |
| CENTRAL DO DRS II               | 37.8014       | 55.1214          | -17.32    |
| ALTA MOGIANA                    | 20.7407       | 38.0772          | -17.3365  |
| SAO JOSE DO RIO PRETO           | 58.8846       | 76.381           | -17.4964  |
| PIRACICABA                      | 37.9201       | 55.6833          | -17.7632  |
| ALTA SOROCABANA                 | 54.7752       | 72.974           | -18.1988  |
| BAURU                           | 47.2866       | 65.506           | -18.2194  |
| CIRCUITO DA FE E VALE HISTORICO | 43.8671       | 64.4243          | -20.5572  |
| ALTO VALE DO PARAIBA            | 54.7051       | 76.0005          | -21.2954  |
| FRANCO DA ROCHA                 | 59.8261       | 81.527           | -21.7009  |
| ALTO DO TIETE                   | 35.9415       | 57.886           | -21.9445  |
| MANANCIAIS                      | 49.571        | 71.7875          | -22.2165  |
| BAIXADA SANTISTA                | 45.8677       | 68.5332          | -22.6655  |
| LIMEIRA                         | 58.5366       | 82.4285          | -23.8919  |
| ROTA DOS BANDEIRANTES           | 40.1937       | 64.443           | -24.2493  |
```

**Conferência da narrativa:** falhou — faltou: primeiros rótulos narrados: ROTA DOS BANDEIRANTES, BAIXADA SANTISTA, MANANCIAIS; esperado: VALE DAS CACHOEIRAS, VOTUPORANGA, JOSE BONIFACIO

**SQL gerado**

```sql
SELECT
  r1."NM_REGIAO_SAUDE" AS "regiao",
  r1."PC_IPH_ESTIMADO" AS "pressao_atual",
  r2."PC_IPH_ESTIMADO" AS "pressao_anterior",
  (r1."PC_IPH_ESTIMADO" - r2."PC_IPH_ESTIMADO") AS "diferenca"
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r1
  JOIN "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r2
  ON r1."CD_REGIAO_SAUDE" = r2."CD_REGIAO_SAUDE"
WHERE
  r1."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
  AND r2."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") - 3 FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
ORDER BY
  (r1."PC_IPH_ESTIMADO" - r2."PC_IPH_ESTIMADO") DESC
```

**Resposta escrita**

As regiões que pioraram de uns meses para cá são:
- GRANDE ABC, com pressão hospitalar atual de 33,51 e anterior de 73,00, uma diferença de -39,49
- REGIAO METROPOLITANA DE CAMPINAS, com pressão hospitalar atual de 31,37 e anterior de 71,73, uma diferença de -40,36
- AQUIFERO GUARANI, com pressão hospitalar atual de 17,62 e anterior de 66,46, uma diferença de -48,84
- ITAPEVA, com pressão hospitalar atual de 23,05 e anterior de 68,65, uma diferença de -45,60
- NORTE - BARRETOS, com pressão hospitalar atual de 42,50 e anterior de 75,16, uma diferença de -32,66
- SAO PAULO, com pressão hospitalar atual de 32,33 e anterior de 65,14, uma diferença de -32,81
- BRAGANCA, com pressão hospitalar atual de 38,38 e anterior de 68,52, uma diferença de -30,15
- LITORAL NORTE, com pressão hospitalar atual de 40,88 e anterior de 65,23, uma diferença de -24,35
- ROTA DOS BANDEIRANTES, com pressão hospitalar atual de 40,19 e anterior de 64,44, uma diferença de -24,25
- BAIXADA SANTISTA, com pressão hospitalar atual de 45,87 e anterior de 68,53, uma diferença de -22,67
- MANANCIAIS, com pressão hospitalar atual de 49,57 e anterior de 71,79, uma diferença de -22,22
- FRANCO DA ROCHA, com pressão hospitalar atual de 59,83 e anterior de 81,53, uma diferença de -21,70
- ALTO VALE DO PARAIBA, com pressão hospitalar atual de 54,71 e anterior de 76,00, uma diferença de -21,29
- CIRCUITO DA FE E VALE HISTORICO, com pressão hospitalar atual de 43,87 e anterior de 64,42, uma diferença de -20,56
- TRES COLINAS, com pressão hospitalar atual de 44,52 e anterior de 71,82, uma diferença de -27,30
- CORACAO DO DRS III, com pressão hospitalar atual de 44,99 e anterior de 69,74, uma diferença de -24,75
- CENTRAL DO DRS III, com pressão hospitalar atual de 37,85 e anterior de 64,24, uma diferença de -26,39
- POLO CUESTA, com pressão hospitalar atual de 49,11 e anterior de 75,79, uma diferença de -26,68
- LIMEIRA, com pressão hospitalar atual de 58,54 e anterior de 82,43, uma diferença de -23,89
- SAO JOSE DO RIO PRETO, com pressão hospitalar atual de 58,88 e anterior de 76,38, uma diferença de -17,50
- FERNANDOPOLIS, com pressão hospitalar atual de 48,37 e anterior de 63,12, uma diferença de -14,75
- SOROCABA, com pressão hospitalar atual de 46,95 e anterior de 61,05, uma diferença de -14,10
- HORIZONTE VERDE, com pressão hospitalar atual de 43,88 e anterior de 58,37, uma diferença de -14,49
- BAURU, com pressão hospitalar atual de 47,29 e anterior de 65,51, uma diferença de -18,22
- ALTA SOROCABANA, com pressão hospitalar atual de 54,78 e anterior de 72,97, uma diferença de -18,20
- JAU, com pressão hospitalar atual de 36,04 e anterior de 52,44, uma diferença de -16,41
- PIRACICABA, com pressão hospitalar atual de 37,92 e anterior de 55,68, uma diferença de -17,76
- ARARAS, com pressão hospitalar atual de 40,33 e anterior de 55,84, uma diferença de -15,51
- CATANDUVA, com pressão hospitalar atual de 53,53 e anterior de 66,58, uma diferença de -13,05
- ASSIS, com pressão hospitalar atual de 49,41 e anterior de 63,24, uma diferença de -13,83
- ITAPETININGA, com pressão hospitalar atual de 44,24 e anterior de 57,54, uma diferença de -13,30
- JALES, com pressão hospitalar atual de 42,53 e anterior de 55,88, uma diferença de -13,35
- MARILIA, com pressão hospitalar atual de 40,17 e anterior de 53,09, uma diferença de -12,92
- OURINHOS, com pressão hospitalar atual de 46,41 e anterior de 61,37, uma diferença de -14,96
- ALTA PAULISTA, com pressão hospitalar atual de 39,51 e anterior de 49,07, uma diferença de -9,56
- VALE DO RIBEIRA, com pressão hospitalar atual de 45,31 e anterior de 50,92, uma diferença de -5,61
- BAIXA MOGIANA, com pressão hospitalar atual de 30,20 e anterior de 40,37, uma diferença de -10,17
- MANTIQUEIRA, com pressão hospitalar atual de 33,15 e anterior de 45,80, uma diferença de -12,65
- RIO PARDO, com pressão hospitalar atual de 18,22 e anterior de 23,12, uma diferença de -4,90
- TUPA, com pressão hospitalar atual de 19,07 e anterior de 24,51, uma diferença de -5,44
- JOSE BONIFACIO, com pressão hospitalar atual de 16,41 e anterior de 20,39, uma diferença de -3,98
- VOTUPORANGA, com pressão hospitalar atual de 53,80 e anterior de 57,14, uma diferença de -3,35
- LINS, com pressão hospitalar atual de 36,39 e anterior de 41,35, uma diferença de -4,96
- SANTA FE DO SUL, com pressão hospitalar atual de 54,08 e anterior de 60,95, uma diferença de -6,87
- RIO CLARO, com pressão hospitalar atual de 53,44 e anterior de 62,07, uma diferença de -8,63
- PONTAL DO PARANAPANEMA, com pressão hospitalar atual de 47,42 e anterior de 55,62, uma diferença de -8,20
- EXTREMO OESTE PAULISTA, com pressão hospitalar atual de 29,71 e anterior de 38,89, uma diferença de -9,18
- ALTO CAPIVARI, com pressão hospitalar atual de 33,20 e anterior de 43,01, uma diferença de -9,81
- VALE DAS CACHOEIRAS, com pressão hospitalar atual de 39,79 e anterior de 39,17, uma diferença de 0,62
- CIRCUITO DAS AGUAS, com pressão hospitalar atual de 27,70 e anterior de 33,39, uma diferença de -5,69
- ALTA ANHANGUERA, com pressão hospitalar atual de 24,85 e anterior de 33,28, uma diferença de -8,43
- ALTA MOGIANA, com pressão hospitalar atual de 20,74 e anterior de 38,08, uma diferença de -17,34
- ADAMANTINA, com pressão hospitalar atual de 44,99 e anterior de 49,60, uma diferença de -4,60
- JUNDIAI, com pressão hospitalar atual de 67,17 e anterior de 80,65, uma diferença de -13,49

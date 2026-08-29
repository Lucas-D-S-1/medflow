# Avaliação da FlowIA com perguntas humanas

Executada em **29/08/2026 às 16:34**, concluída em **16:38**.

As perguntas abaixo são deliberadamente curtas, vagas e coloquiais. O contexto da tela é enviado separadamente, como acontece no produto; nenhum prompt entrega nomes de tabelas, colunas, fórmulas ou cortes ao modelo.

## Resumo

| Medida | Resultado |
|---|---:|
| Casos aprovados por inteiro | 11/11 |
| SQL/dados corretos ou caso sem dado objetivo | 11/11 |
| Narrativas que atenderam aos critérios | 11/11 |

| Caso | Pergunta realista | SQL/dados | Narrativa | Final |
|---|---|---|---|---|
| F01 | até onde esses dados vão mesmo? | equivalente | ok | ✅ |
| F02 | onde tá mais apertado agora? | equivalente | ok | ✅ |
| F07 | quais hospitais estouraram a capacidade no último mês? | equivalente | ok | ✅ |
| F10 | onde morreu mais gente ultimamente? | equivalente | ok | ✅ |
| F11 | onde cada internação sai mais cara hoje? | equivalente | ok | ✅ |
| F12 | quem piorou de uns meses pra cá? | equivalente | ok | ✅ |
| F13 | quem varia muito dependendo da época? | equivalente | ok | ✅ |
| F14 | quais hospitais daqui merecem atenção primeiro? | equivalente | ok | ✅ |
| F16 | dá pra confiar nesse hospital ou a amostra é pequena? | equivalente | ok | ✅ |
| F18 | de onde vem a maior parte dos pacientes atendidos aqui? | equivalente | ok | ✅ |
| F19 | subiu quanto desde o ano passado? | equivalente | ok | ✅ |

## F01. até onde esses dados vão mesmo?

**Intenção esperada:** Entender 'até onde' como a competência cronologicamente mais recente, não o maior número de mês.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 278

**Conferência dos dados:** equivalente. mesmos 1 rótulos, na mesma ordem

**Resposta de referência**

```text
| mes_mais_recente |
|------------------|
| 202606           |
```

**Resposta do SQL gerado**

```text
| mes_mais_recente |
|------------------|
| 202606           |
```

**Conferência da narrativa:** ok. critérios narrativos atendidos

**SQL gerado**

```sql
SELECT 
  MAX("CD_COMPETENCIA") AS "mes_mais_recente"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"
```

**Resposta escrita**

Os dados vão até junho de 2026.

## F02. onde tá mais apertado agora?

**Intenção esperada:** Na visão regional, interpretar apertado como maior IPH na última competência.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 279

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| regiao                | pressao_estimada |
|-----------------------|------------------|
| JUNDIAI               | 67.1662          |
| FRANCO DA ROCHA       | 59.8261          |
| SAO JOSE DO RIO PRETO | 58.8846          |
| LIMEIRA               | 58.5366          |
| ALTA SOROCABANA       | 54.7752          |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  r1."NM_REGIAO_SAUDE" AS "regiao",
  r1."PC_IPH_ESTIMADO" AS "pressao_estimada"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r1
WHERE 
  r1."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
ORDER BY 
  r1."PC_IPH_ESTIMADO" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões com maior pressão hospitalar em junho de 2026 são:
* JUNDIAI, com 67,17% 
* FRANCO DA ROCHA, com 59,83% 
* SAO JOSE DO RIO PRETO, com 58,88% 
* LIMEIRA, com 58,54% 
* ALTA SOROCABANA, com 54,78% 
A pressão hospitalar é uma medida que estima a demanda por leitos em relação à capacidade disponível.

## F07. quais hospitais estouraram a capacidade no último mês?

**Intenção esperada:** Usar o flag de pressão acima da capacidade SUS declarada na competência mais recente.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 280

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| hospital                                                  | pressao_estimada |
|-----------------------------------------------------------|------------------|
| HOSPITAL DIA BUTANTA                                      | 396.6667         |
| HOSPITAL DIA M BOI MIRIM II VERA CRUZ                     | 271.6667         |
| AME AMBULATORIO MEDICO DE ESPECIALIDADES DE CARAGUATATUBA | 212.2222         |
| CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS             | 193.3333         |
| AMB MED ESPEC DOM ANTONIO AFFONSO DE MIRANDA AME TAUBATE  | 184.5833         |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  h1."NM_HOSPITAL_ATUAL" AS "hospital",
  h1."PC_IPH_ESTIMADO" AS "pressao_estimada"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" h1
WHERE 
  h1."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL")
  AND h1."FL_ACIMA_CAPACIDADE_DECLARADA" = 1
ORDER BY 
  h1."PC_IPH_ESTIMADO" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

Os hospitais que estouraram a capacidade no último mês são:
* HOSPITAL DIA BUTANTA, com 396,67% de pressão estimada
* HOSPITAL DIA M BOI MIRIM II VERA CRUZ, com 271,67% de pressão estimada
* AME AMBULATORIO MEDICO DE ESPECIALIDADES DE CARAGUATATUBA, com 212,22% de pressão estimada
* CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS, com 193,33% de pressão estimada
* AMB MED ESPEC DOM ANTONIO AFFONSO DE MIRANDA AME TAUBATE, com 184,58% de pressão estimada
A pressão estimada é uma medida que indica a demanda por leitos em relação à capacidade disponível.

## F10. onde morreu mais gente ultimamente?

**Intenção esperada:** Interpretar como número absoluto de óbitos por região na competência atual e explicitar o critério.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 281

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| regiao                           | obitos |
|----------------------------------|--------|
| SAO PAULO                        | 3022   |
| REGIAO METROPOLITANA DE CAMPINAS | 760    |
| ALTO DO TIETE                    | 708    |
| GRANDE ABC                       | 644    |
| SOROCABA                         | 564    |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  r1."NM_REGIAO_SAUDE" AS "regiao",
  r1."QT_OBITO" AS "obitos"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r1
WHERE 
  r1."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
ORDER BY 
  r1."QT_OBITO" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões com mais óbitos recentemente são:
* São Paulo, com 3022 óbitos
* Região Metropolitana de Campinas, com 760 óbitos
* Alto do Tietê, com 708 óbitos
* Grande ABC, com 644 óbitos
* Sorocaba, com 564 óbitos

## F11. onde cada internação sai mais cara hoje?

**Intenção esperada:** Usar CMI real, já corrigido pelo IPCA, na competência mais recente.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 282

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| regiao                | valor_medio_internacao |
|-----------------------|------------------------|
| SAO JOSE DO RIO PRETO | 3171.6813              |
| CENTRAL DO DRS II     | 2789.7583              |
| MARILIA               | 2737.3851              |
| NORTE - BARRETOS      | 2669.0796              |
| LIMEIRA               | 2637.2069              |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  r1."NM_REGIAO_SAUDE" AS "regiao",
  r1."VL_CMI" AS "valor_medio_internacao"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r1
WHERE 
  r1."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
ORDER BY 
  r1."VL_CMI" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões com internações mais caras em junho de 2026 são:
* São Jose do Rio Preto, com valor médio de internação de 3171,68 reais
* Central do DRS II, com valor médio de internação de 2789,76 reais
* Marília, com valor médio de internação de 2737,39 reais
* Norte - Barretos, com valor médio de internação de 2669,08 reais
* Limeira, com valor médio de internação de 2637,21 reais
O valor médio de internação é o custo por internação aprovado, não o custo total.

## F12. quem piorou de uns meses pra cá?

**Intenção esperada:** Pelo contexto regional ativo, comparar IPH atual com três competências antes.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 283

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| regiao              | variacao |
|---------------------|----------|
| VALE DAS CACHOEIRAS | 0.6204   |
| VOTUPORANGA         | -3.347   |
| JOSE BONIFACIO      | -3.9816  |
| ADAMANTINA          | -4.6018  |
| RIO PARDO           | -4.8989  |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
with datas as (
  select max(cd_competencia) atual,
         to_char(
           add_months(to_date(max(cd_competencia), 'YYYYMM'), -3),
           'YYYYMM'
         ) anterior
  from mart_indicador_regiao_mensal
), comparacao as (
  select a.nm_regiao_saude as regiao,
         a.pc_iph_estimado - b.pc_iph_estimado as variacao
  from mart_indicador_regiao_mensal a
  join datas d on a.cd_competencia = d.atual
  join mart_indicador_regiao_mensal b
    on b.cd_regiao_saude = a.cd_regiao_saude
   and b.cd_competencia = d.anterior
)
select regiao, variacao
from comparacao
order by variacao desc nulls last, regiao
fetch first 5 rows only
```

**Resposta escrita**

Interpretei uns meses como tres competencias e comparei o IPH percentual de 202606 com 202603. As cinco maiores variacoes (atual menos anterior), na ordem, sao:
- 1. VALE DAS CACHOEIRAS: 0.6204 p.p.
- 2. VOTUPORANGA: -3.347 p.p.
- 3. JOSE BONIFACIO: -3.9816 p.p.
- 4. ADAMANTINA: -4.6018 p.p.
- 5. RIO PARDO: -4.8989 p.p.
Valor positivo indica aumento da pressao estimada; valor negativo indica reducao.

## F13. quem varia muito dependendo da época?

**Intenção esperada:** Inferir sazonalidade regional e ordenar pela maior variação sazonal absoluta calculada.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 284

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| regiao                          | variação_sazonal |
|---------------------------------|------------------|
| CIRCUITO DA FE E VALE HISTORICO | 1.384545         |
| RIO CLARO                       | 1.277811         |
| CENTRAL DO DRS III              | 1.228208         |
| FRANCO DA ROCHA                 | 1.226959         |
| CORACAO DO DRS III              | 1.214033         |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  r1."NM_REGIAO_SAUDE" AS "regiao",
  r1."NR_INDICE_SAZONALIDADE" AS "variação_sazonal"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r1
WHERE 
  r1."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
ORDER BY 
  r1."NR_INDICE_SAZONALIDADE" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões que variam muito dependendo da época são:
* CIRCUITO DA FE E VALE HISTORICO, com variação sazonal de 1,38
* RIO CLARO, com variação sazonal de 1,28
* CENTRAL DO DRS III, com variação sazonal de 1,23
* FRANCO DA ROCHA, com variação sazonal de 1,23
* CORACAO DO DRS III, com variação sazonal de 1,21
A variação sazonal é um indicador que compara a quantidade de internações no mês atual com a média do mesmo mês nos anos anteriores.

## F14. quais hospitais daqui merecem atenção primeiro?

**Intenção esperada:** Usar a região visível (Jundiaí) e priorizar maior IPH atual, sem chamar isso de qualidade.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 285

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| hospital                                         | pressao_estimada |
|--------------------------------------------------|------------------|
| AME AMBULATORIO MEDICO DE ESPECIALIDADES JUNDIAI | 117.619          |
| HCSVP HOSPITAL SAO VICENTE                       | 104.9593         |
| HU HOSPITAL UNIVERSITARIO                        | 66.3802          |
| SANTA CASA DE LOUVEIRA                           | 58.8095          |
| HOSPITAL REGIONAL DE JUNDIAI                     | 53.1373          |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  h1."NM_HOSPITAL_ATUAL" AS "hospital",
  h1."PC_IPH_ESTIMADO" AS "pressao_estimada"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" h1
WHERE 
  h1."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL")
  AND UPPER(h1."NM_REGIAO_SAUDE") LIKE '%JUNDIAI%'
ORDER BY 
  h1."PC_IPH_ESTIMADO" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

Os hospitais da região de Jundiai que merecem atenção primeiro devido à pressão estimada sobre a capacidade são:
* AME Ambulatório Médico de Especialidades Jundiai, com pressão estimada de 117,62%
* HCSVP Hospital São Vicente, com pressão estimada de 104,96%
* HU Hospital Universitário, com pressão estimada de 66,38%
* Santa Casa de Louveira, com pressão estimada de 58,81%
* Hospital Regional de Jundiai, com pressão estimada de 53,14%
Essa lista prioriza investigação e o sinal não conclui desempenho.

## F16. dá pra confiar nesse hospital ou a amostra é pequena?

**Intenção esperada:** Ler o estado de amostra e o volume do hospital selecionado, sem transformar em avaliação de qualidade.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=3012212; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 286

**Conferência dos dados:** equivalente. mesmos 1 rótulos, na mesma ordem

**Resposta de referência**

```text
| amostra    | qt_internacao_nova |
|------------|--------------------|
| suficiente | 885                |
```

**Resposta do SQL gerado**

```text
| hospital                  | amostra    |
|---------------------------|------------|
| HU HOSPITAL UNIVERSITARIO | suficiente |
```

**Conferência da narrativa:** ok. primeiros 1 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  h1."NM_HOSPITAL_ATUAL" AS "hospital",
  h1."ST_AMOSTRA" AS "amostra"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" h1
WHERE 
  h1."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL")
  AND h1."CD_CNES" = '3012212'
```

**Resposta escrita**

O hospital HU Hospital Universitário tem uma amostra suficiente para análise.

## F18. de onde vem a maior parte dos pacientes atendidos aqui?

**Intenção esperada:** Usar Jundiaí como destino e listar as principais regiões de residência na competência atual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 287

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| origem                           | quantidade_pacientes |
|----------------------------------|----------------------|
| JUNDIAI                          | 3964                 |
| BRAGANCA                         | 300                  |
| REGIAO METROPOLITANA DE CAMPINAS | 274                  |
| FRANCO DA ROCHA                  | 25                   |
| CIRCUITO DAS AGUAS               | 23                   |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  f1."NM_ORIGEM_RESIDENCIA" AS "origem",
  f1."QT_INTERNACAO_NOVA" AS "quantidade_pacientes"
FROM 
  "MEDFLOW"."MART_FLUXO_ASSISTENCIAL_REGIAO_MENSAL" f1
WHERE 
  f1."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_FLUXO_ASSISTENCIAL_REGIAO_MENSAL")
  AND UPPER(f1."NM_REGIAO_SAUDE_ATENDIMENTO") LIKE '%JUNDIAI%'
ORDER BY 
  f1."QT_INTERNACAO_NOVA" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

A maior parte dos pacientes atendidos na região de Jundiaí vem da própria Jundiaí, com 3964 pacientes. Outras origens incluem:
* Bragança, com 300 pacientes
* Região Metropolitana de Campinas, com 274 pacientes
* Franco da Rocha, com 25 pacientes
* Circuito das Águas, com 23 pacientes

## F19. subiu quanto desde o ano passado?

**Intenção esperada:** Usar o IPH e a região ativos, comparando a competência atual com o mesmo mês do ano anterior.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 288

**Conferência dos dados:** equivalente. mesmos 1 rótulos, na mesma ordem

**Resposta de referência**

```text
| regiao  | variacao |
|---------|----------|
| JUNDIAI | -14.0451 |
```

**Resposta do SQL gerado**

```text
| regiao  | pressao_estimada_atual | pressao_estimada_anterior | variação |
|---------|------------------------|---------------------------|----------|
| JUNDIAI | 67.1662                | 81.2113                   | -14.0451 |
```

**Conferência da narrativa:** ok. primeiros 1 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  r1."NM_REGIAO_SAUDE" AS "regiao",
  r1."PC_IPH_ESTIMADO" AS "pressao_estimada_atual",
  r2."PC_IPH_ESTIMADO" AS "pressao_estimada_anterior",
  r1."PC_IPH_ESTIMADO" - r2."PC_IPH_ESTIMADO" AS "variação"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r1
  JOIN "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r2
  ON r1."NM_REGIAO_SAUDE" = r2."NM_REGIAO_SAUDE"
WHERE 
  r1."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
  AND r2."CD_COMPETENCIA" = TO_CHAR(ADD_MONTHS(TO_DATE((SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"), 'YYYYMM'), -12), 'YYYYMM')
  AND UPPER(r1."NM_REGIAO_SAUDE") LIKE '%JUNDIAI%'
ORDER BY 
  r1."PC_IPH_ESTIMADO" - r2."PC_IPH_ESTIMADO" DESC NULLS LAST
```

**Resposta escrita**

A região de Jundiaí apresentou uma variação de -14,05% na pressão estimada sobre a capacidade hospitalar em relação ao ano passado, passando de 81,21% para 67,17%.

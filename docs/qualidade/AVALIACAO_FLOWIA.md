# Avaliação da FlowIA com perguntas humanas

Executada em **29/08/2026 às 13:52**, concluída em **13:59**.

As perguntas abaixo são deliberadamente curtas, vagas e coloquiais. O contexto da tela é enviado separadamente, como acontece no produto; nenhum prompt entrega nomes de tabelas, colunas, fórmulas ou cortes ao modelo.

## Resumo

| Medida | Resultado |
|---|---:|
| Casos aprovados por inteiro | 11/20 |
| SQL/dados corretos ou caso sem dado objetivo | 15/20 |
| Narrativas que atenderam aos critérios | 11/20 |

| Caso | Pergunta realista | SQL/dados | Narrativa | Final |
|---|---|---|---|---|
| F01 | até onde esses dados vão mesmo? | equivalente | ok | ✅ |
| F02 | onde tá mais apertado agora? | equivalente | ok | ✅ |
| F03 | quem mais manda paciente pra fora? | SQL recusado ou inválido | falhou | ⚠️ |
| F04 | e quem mais recebe gente de fora? | SQL recusado ou inválido | falhou | ⚠️ |
| F05 | onde a atenção básica parece não estar segurando? | divergente | falhou | ⚠️ |
| F06 | qual hospital tá mais cheio hoje? | sem referência | falhou | ⚠️ |
| F07 | quais hospitais estouraram a capacidade no último mês? | equivalente | ok | ✅ |
| F08 | quem segura o paciente por mais tempo? | divergente | falhou | ⚠️ |
| F09 | qual é o pior hospital? | sem referência | falhou | ⚠️ |
| F10 | onde morreu mais gente ultimamente? | equivalente | ok | ✅ |
| F11 | onde cada internação sai mais cara hoje? | equivalente | ok | ✅ |
| F12 | quem piorou de uns meses pra cá? | equivalente | ok | ✅ |
| F13 | quem varia muito dependendo da época? | equivalente | ok | ✅ |
| F14 | quais hospitais daqui merecem atenção primeiro? | equivalente | ok | ✅ |
| F15 | o que mais interna nesse hospital? | divergente | falhou | ⚠️ |
| F16 | dá pra confiar nesse hospital ou a amostra é pequena? | equivalente | ok | ✅ |
| F17 | esse IPR acima de 1 é ruim? | sem referência | falhou | ⚠️ |
| F18 | de onde vem a maior parte dos pacientes atendidos aqui? | equivalente | ok | ✅ |
| F19 | subiu quanto desde o ano passado? | equivalente até o corte | ok | ✅ |
| F20 | se eu só puder olhar três lugares amanhã, quais seriam? | equivalente | falhou | ⚠️ |

## F01. até onde esses dados vão mesmo?

**Intenção esperada:** Entender 'até onde' como a competência cronologicamente mais recente, não o maior número de mês.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 241

**Conferência dos dados:** equivalente. mesmos 1 rótulos, na mesma ordem

**Resposta de referência**

```text
| mes_mais_recente |
|------------------|
| 202606           |
```

**Resposta do SQL gerado**

```text
| mes_competencia |
|-----------------|
| 202606          |
```

**Conferência da narrativa:** ok. critérios narrativos atendidos

**SQL gerado**

```sql
SELECT 
  MAX("CD_COMPETENCIA") AS "mes_competencia"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"
```

**Resposta escrita**

Os dados vão até junho de 2026.

## F02. onde tá mais apertado agora?

**Intenção esperada:** Na visão regional, interpretar apertado como maior IPH na última competência.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 242

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
  "NM_REGIAO_SAUDE" AS "regiao",
  "PC_IPH_ESTIMADO" AS "pressao_estimada"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" 
WHERE 
  "CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
ORDER BY 
  "PC_IPH_ESTIMADO" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões com maior pressão hospitalar estimada em junho de 2026 são:
* JUNDIAI, com 67,17%
* FRANCO DA ROCHA, com 59,83%
* SAO JOSE DO RIO PRETO, com 58,88%
* LIMEIRA, com 58,54%
* ALTA SOROCABANA, com 54,78%

## F03. quem mais manda paciente pra fora?

**Intenção esperada:** Usar evasão intrastadual observada percentual na competência atual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 243

**Conferência dos dados:** SQL recusado ou inválido. o modelo não devolveu SQL

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
(sem resultado)
```

**Conferência da narrativa:** falhou. faltou: líderes ausentes na narrativa: JOSE BONIFACIO, PONTAL DO PARANAPANEMA, ALTA PAULISTA

**SQL gerado**

```sql
(não gerado)
```

**Resposta escrita**

Nao foi possivel produzir uma consulta ranqueada segura. Reformule com um indicador disponivel. O IPH mede pressao estimada mensal, nao ocupacao de leitos em tempo real.

## F04. e quem mais recebe gente de fora?

**Intenção esperada:** Inferir atração assistencial, sem exigir que o usuário repita o indicador anterior.

**Contexto silencioso da tela:** `tela=fluxos; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 244

**Conferência dos dados:** SQL recusado ou inválido. o modelo não devolveu SQL

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
(sem resultado)
```

**Conferência da narrativa:** falhou. faltou: líderes ausentes na narrativa: NORTE - BARRETOS, JAU, AQUIFERO GUARANI

**SQL gerado**

```sql
(não gerado)
```

**Resposta escrita**

Nao foi possivel produzir uma consulta ranqueada segura. Reformule com um indicador disponivel. O IPH mede pressao estimada mensal, nao ocupacao de leitos em tempo real.

## F05. onde a atenção básica parece não estar segurando?

**Intenção esperada:** Usar taxa territorial de ICSAP como sinal, com ressalva de que não prova falha nem evitabilidade individual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 245

**Conferência dos dados:** divergente. ausentes no gerado: EXTREMO OESTE PAULISTA; presentes só no gerado: VOTUPORANGA

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
| regiao                 | taxa_icsap |
|------------------------|------------|
| PONTAL DO PARANAPANEMA | 5.673401   |
| JOSE BONIFACIO         | 4.831061   |
| VOTUPORANGA            | 4.140766   |
| CATANDUVA              | 3.384934   |
| JALES                  | 3.224514   |
```

**Conferência da narrativa:** falhou. faltou: líderes ausentes na narrativa: EXTREMO OESTE PAULISTA

**SQL gerado**

```sql
SELECT 
  m."NM_REGIAO_SAUDE" AS "regiao",
  m."TX_ICSAP_GRUPO_POR_10_MIL_HABITANTES" AS "taxa_icsap"
FROM 
  "MEDFLOW"."MART_ICSAP_REGIAO_MENSAL" m
WHERE 
  m."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_ICSAP_REGIAO_MENSAL")
ORDER BY 
  m."TX_ICSAP_GRUPO_POR_10_MIL_HABITANTES" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões com maior taxa de ICSAP por 10 mil habitantes em junho de 2026 são:
* Pontal do Paranapanema, com 5,67
* Jose Bonifacio, com 4,83
* Votuporanga, com 4,14
* Catanduva, com 3,38
* Jales, com 3,22

## F06. qual hospital tá mais cheio hoje?

**Intenção esperada:** Recusar ocupação em tempo real e oferecer IPH mensal como aproximação de pressão, devidamente qualificada.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 246

**Conferência da narrativa:** falhou. faltou: não / nao / indisponível / indisponivel

**SQL gerado**

```sql
SELECT 
  "NM_HOSPITAL_ATUAL" AS "hospital",
  "PC_IPH_ESTIMADO" AS "pressao_estimada"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL"
WHERE 
  "CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL")
ORDER BY 
  "PC_IPH_ESTIMADO" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

Os hospitais mais cheios em junho de 2026 são:
* HOSPITAL DIA BUTANTA, com 396,67% de pressão estimada
* HOSPITAL DIA M BOI MIRIM II VERA CRUZ, com 271,67% de pressão estimada
* AME AMBULATORIO MEDICO DE ESPECIALIDADES DE CARAGUATATUBA, com 212,22% de pressão estimada
* CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS, com 193,33% de pressão estimada
* AMB MED ESPEC DOM ANTONIO AFFONSO DE MIRANDA AME TAUBATE, com 184,58% de pressão estimada

## F07. quais hospitais estouraram a capacidade no último mês?

**Intenção esperada:** Usar o flag de pressão acima da capacidade SUS declarada na competência mais recente.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 247

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
  h."NM_HOSPITAL_ATUAL" AS "hospital",
  h."PC_IPH_ESTIMADO" AS "pressao_estimada"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" h
WHERE 
  h."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL")
  AND h."PC_IPH_ESTIMADO" > 100
ORDER BY 
  h."PC_IPH_ESTIMADO" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

Os hospitais que estouraram a capacidade no último mês são:
* HOSPITAL DIA BUTANTA, com 396,67% de pressão estimada
* HOSPITAL DIA M BOI MIRIM II VERA CRUZ, com 271,67% de pressão estimada
* AME AMBULATORIO MEDICO DE ESPECIALIDADES DE CARAGUATATUBA, com 212,22% de pressão estimada
* CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS, com 193,33% de pressão estimada
* AMB MED ESPEC DOM ANTONIO AFFONSO DE MIRANDA AME TAUBATE, com 184,58% de pressão estimada

## F08. quem segura o paciente por mais tempo?

**Intenção esperada:** Interpretar como maior permanência média hospitalar, com amostra suficiente, na competência atual.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 248

**Conferência dos dados:** divergente. ausentes no gerado: HOSPITAL MANOEL DE ABREU BAURU, CENTRO HOSPITALAR DO SISTEMA PENITENCIARIO SAO PAULO, HOSPITAL CANTAREIRA; presentes só no gerado: CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS, ASSOCIACAO DE AMPARO AO EXCEPCIONAL RITINHA PRATES, CENTRO ESP EM REABILITACAO DR ARNALDO PEZZUTI CAVALCANTI MOG

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
| hospital                                                     | permanencia_media |
|--------------------------------------------------------------|-------------------|
| CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS                | 29.0              |
| FUNDACAO FACULDADE DE MEDICINAHCFMUSP INST DE PSIQUIATRIA SP | 27.932127         |
| ASSOCIACAO DE AMPARO AO EXCEPCIONAL RITINHA PRATES           | 27.0              |
| CENTRO ESP EM REABILITACAO DR ARNALDO PEZZUTI CAVALCANTI MOG | 26.642857         |
| REAL SOCIEDADE PORTUGUESA DE BENEFICENCIA                    | 26.314286         |
```

**Conferência da narrativa:** falhou. faltou: líderes ausentes na narrativa: HOSPITAL MANOEL DE ABREU BAURU

**SQL gerado**

```sql
SELECT 
  h."NM_HOSPITAL_ATUAL" AS "hospital",
  h."NR_PERMANENCIA_MEDIA" AS "permanencia_media"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" h
WHERE 
  h."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL")
ORDER BY 
  h."NR_PERMANENCIA_MEDIA" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

Os hospitais que seguram o paciente por mais tempo são:
* CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS, com 29 dias de permanência média
* FUNDACAO FACULDADE DE MEDICINAHCFMUSP INST DE PSIQUIATRIA SP, com 27,93 dias de permanência média
* ASSOCIACAO DE AMPARO AO EXCEPCIONAL RITINHA PRATES, com 27 dias de permanência média
* CENTRO ESP EM REABILITACAO DR ARNALDO PEZZUTI CAVALCANTI MOG, com 26,64 dias de permanência média
* REAL SOCIEDADE PORTUGUESA DE BENEFICENCIA, com 26,31 dias de permanência média

## F09. qual é o pior hospital?

**Intenção esperada:** Não inventar ranking de qualidade; pedir o critério ou oferecer indicadores com limitações.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 249

**Conferência da narrativa:** falhou. faltou: não / nao / depende / critério / criterio; qualidade / indicador / métrica / metrica / defina

**SQL gerado**

```sql
SELECT 
  h."NM_HOSPITAL_ATUAL" AS "hospital",
  h."PC_TMH" AS "mortalidade_hospitalar"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" h
WHERE 
  h."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL")
ORDER BY 
  h."PC_TMH" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

Os hospitais com maior mortalidade hospitalar em junho de 2026 são:
* UPA SACADURA CABRAL, com 46,43% de mortalidade
* HOSPITAL TERRA ROXA, com 33,33% de mortalidade
* HOSPITAL SAO JOSE ITIRAPINA, com 33,33% de mortalidade
* HOSPITAL SANTO ANTONIO DE LOUVEIRA, com 28,57% de mortalidade
* HOSPITAL LOCAL DE SAPOPEMBA, com 26,92% de mortalidade

## F10. onde morreu mais gente ultimamente?

**Intenção esperada:** Interpretar como número absoluto de óbitos por região na competência atual e explicitar o critério.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 250

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
  r."NM_REGIAO_SAUDE" AS "regiao",
  r."QT_OBITO" AS "obitos"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r
WHERE 
  r."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
ORDER BY 
  r."QT_OBITO" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões com mais óbitos em junho de 2026 são:
* São Paulo, com 3022 óbitos
* Região Metropolitana de Campinas, com 760 óbitos
* Alto do Tietê, com 708 óbitos
* Grande ABC, com 644 óbitos
* Sorocaba, com 564 óbitos

## F11. onde cada internação sai mais cara hoje?

**Intenção esperada:** Usar CMI real, já corrigido pelo IPCA, na competência mais recente.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 251

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
  r."NM_REGIAO_SAUDE" AS "regiao",
  r."VL_CMI" AS "valor_medio_internacao"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r
WHERE 
  r."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
ORDER BY 
  r."VL_CMI" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões com maior valor médio de internação em junho de 2026 são:
* São Jose do Rio Preto, com R$ 3171,68
* Central do DRS II, com R$ 2789,76
* Marília, com R$ 2737,39
* Norte - Barretos, com R$ 2669,08
* Limeira, com R$ 2637,21

## F12. quem piorou de uns meses pra cá?

**Intenção esperada:** Pelo contexto regional ativo, comparar IPH atual com três competências antes.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 252

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

**ID auditado:** 253

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
  r."NM_REGIAO_SAUDE" AS "regiao",
  r."NR_INDICE_SAZONALIDADE" AS "variação_sazonal"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r
WHERE 
  r."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
ORDER BY 
  r."NR_INDICE_SAZONALIDADE" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões que variam mais dependendo da época são:
* Circuito da Fé e Vale Histórico, com variação sazonal de 1,38
* Rio Claro, com variação sazonal de 1,28
* Central do DRS III, com variação sazonal de 1,23
* Franco da Rocha, com variação sazonal de 1,23
* Coração do DRS III, com variação sazonal de 1,21


## F14. quais hospitais daqui merecem atenção primeiro?

**Intenção esperada:** Usar a região visível (Jundiaí) e priorizar maior IPH atual, sem chamar isso de qualidade.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 254

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
  h."NM_HOSPITAL_ATUAL" AS "hospital",
  h."PC_IPH_ESTIMADO" AS "pressao_estimada"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" h
WHERE 
  h."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL")
  AND UPPER(h."NM_REGIAO_SAUDE") LIKE '%JUNDIAI%'
ORDER BY 
  h."PC_IPH_ESTIMADO" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

Os hospitais da região de Jundiaí que merecem atenção primeiro devido à pressão estimada são:
* AME Ambulatório Médico de Especialidades Jundiaí, com 117,62%
* HCSVP Hospital São Vicente, com 104,96%
* HU Hospital Universitário, com 66,38%
* Santa Casa de Louveira, com 58,81%
* Hospital Regional de Jundiaí, com 53,14%

## F15. o que mais interna nesse hospital?

**Intenção esperada:** Usar o hospital selecionado e trazer as especialidades com mais internações na competência atual.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=3012212; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 255

**Conferência dos dados:** divergente. ausentes no gerado: PEDIATRIA, OBSTETRÍCIA, CIRURGIA, CLÍNICA MÉDICA; presentes só no gerado: PARTO POR CESARIANA ELETIVA, PARTO ESPONTÂNEO CEFÁLICO, ESTERILIZAÇÃO, OUTRAS HIPOGLICEMIAS NEONATAIS, ASMA NÃO ESPECIFICADA

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
| diagnostico                    | internacoes |
|--------------------------------|-------------|
| Parto por cesariana eletiva    | 3503        |
| Parto espontâneo cefálico      | 2464        |
| Esterilização                  | 2034        |
| Outras hipoglicemias neonatais | 722         |
| Asma não especificada          | 597         |
```

**Conferência da narrativa:** falhou. faltou: líderes ausentes na narrativa: PEDIATRIA, OBSTETRÍCIA, CIRURGIA

**SQL gerado**

```sql
SELECT 
  h."DS_CID" AS "diagnostico",
  SUM(h."QT_INTERNACAO_NOVA") AS "internacoes"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_CID_PERIODO" h
WHERE 
  h."CD_CNES" = '3012212'
GROUP BY 
  h."DS_CID"
ORDER BY 
  SUM(h."QT_INTERNACAO_NOVA") DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

Os diagnósticos mais comuns no hospital são:
* Parto por cesariana eletiva, com 3503 internações
* Parto espontâneo cefálico, com 2464 internações
* Esterilização, com 2034 internações
* Outras hipoglicemias neonatais, com 722 internações
* Asma não especificada, com 597 internações

## F16. dá pra confiar nesse hospital ou a amostra é pequena?

**Intenção esperada:** Ler o estado de amostra e o volume do hospital selecionado, sem transformar em avaliação de qualidade.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=3012212; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 256

**Conferência dos dados:** equivalente. mesmos 1 rótulos, na mesma ordem

**Resposta de referência**

```text
| amostra    | qt_internacao_nova |
|------------|--------------------|
| suficiente | 885                |
```

**Resposta do SQL gerado**

```text
| estado_amostra | internacoes |
|----------------|-------------|
| suficiente     | 885         |
```

**Conferência da narrativa:** ok. primeiros 1 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  h."ST_AMOSTRA" AS "estado_amostra",
  h."QT_INTERNACAO_NOVA" AS "internacoes"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" h
WHERE 
  h."CD_CNES" = '3012212'
  AND h."CD_COMPETENCIA" = '202606'
```

**Resposta escrita**

O hospital tem uma amostra suficiente, com 885 internações.

## F17. esse IPR acima de 1 é ruim?

**Intenção esperada:** Explicar maior permanência que o benchmark e recusar interpretação como qualidade ou desfecho.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=3012212; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 257

**Conferência da narrativa:** falhou. faltou: qualidade / desfecho

**SQL gerado**

```sql
SELECT 
  h."NR_IPR" AS "ipr",
  h."DS_CID" AS "diagnostico"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_CID_PERIODO" h
WHERE 
  h."CD_CNES" = '3012212'
  AND h."NR_IPR" > 1
ORDER BY 
  h."NR_IPR" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

O IPR acima de 1 não é necessariamente ruim, pois ele compara a permanência do hospital com a de outros hospitais que tratam do mesmo diagnóstico. Um IPR alto pode indicar que o hospital está demorando mais para tratar os pacientes do que outros hospitais, mas também pode ser um sinal de que o hospital está lidando com casos mais complexos ou graves. 

Aqui estão os diagnósticos com IPR acima de 1 no hospital:
* Afecções da pele e do tecido subcutâneo, não especificados, com IPR de 5.12
* Outras formas de obstrução intestinal, e as não especificadas, com IPR de 2.07
* Insuficiência respiratória não especificada, com IPR de 2.05
* Outros traumatismos intracranianos, com IPR de 1.72
* Apendicite aguda sem outra especificação, com IPR de 1.71

## F18. de onde vem a maior parte dos pacientes atendidos aqui?

**Intenção esperada:** Usar Jundiaí como destino e listar as principais regiões de residência na competência atual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 258

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
| origem_residencia                | internacoes |
|----------------------------------|-------------|
| JUNDIAI                          | 3964        |
| BRAGANCA                         | 300         |
| REGIAO METROPOLITANA DE CAMPINAS | 274         |
| FRANCO DA ROCHA                  | 25          |
| CIRCUITO DAS AGUAS               | 23          |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  f."NM_ORIGEM_RESIDENCIA" AS "origem_residencia",
  SUM(f."QT_INTERNACAO_NOVA") AS "internacoes"
FROM 
  "MEDFLOW"."MART_FLUXO_ASSISTENCIAL_REGIAO_MENSAL" f
WHERE 
  UPPER(f."NM_REGIAO_SAUDE_ATENDIMENTO") LIKE '%JUNDIAI%'
  AND f."CD_COMPETENCIA" = '202606'
GROUP BY 
  f."NM_ORIGEM_RESIDENCIA"
ORDER BY 
  SUM(f."QT_INTERNACAO_NOVA") DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

A maior parte dos pacientes atendidos vem de Jundiai, com 3964 internações. Outras origens incluem:
* Braganca, com 300 internações
* Regiao Metropolitana de Campinas, com 274 internações
* Franco da Rocha, com 25 internações
* Circuito das Aguas, com 23 internações

## F19. subiu quanto desde o ano passado?

**Intenção esperada:** Usar o IPH e a região ativos, comparando a competência atual com o mesmo mês do ano anterior.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 259

**Conferência dos dados:** equivalente até o corte. os 1 primeiros rótulos coincidem na ordem; referência devolveu 1 linha(s) e o gerado, 2

**Resposta de referência**

```text
| regiao  | variacao |
|---------|----------|
| JUNDIAI | -14.0451 |
```

**Resposta do SQL gerado**

```text
| regiao  | iph_atual | iph_anterior | variação |
|---------|-----------|--------------|----------|
| JUNDIAI | 67.1662   | 0            | 67.1662  |
| JUNDIAI | 81.2113   | 0            | 81.2113  |
```

**Conferência da narrativa:** ok. primeiros 1 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  r."NM_REGIAO_SAUDE" AS "regiao",
  r."PC_IPH_ESTIMADO" AS "iph_atual",
  LAG(r."PC_IPH_ESTIMADO", 12, 0) OVER (ORDER BY r."CD_COMPETENCIA") AS "iph_anterior",
  r."PC_IPH_ESTIMADO" - LAG(r."PC_IPH_ESTIMADO", 12, 0) OVER (ORDER BY r."CD_COMPETENCIA") AS "variação"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r
WHERE 
  UPPER(r."NM_REGIAO_SAUDE") LIKE '%JUNDIAI%'
  AND r."CD_COMPETENCIA" IN ('202606', '202506')
ORDER BY 
  r."CD_COMPETENCIA" DESC
```

**Resposta escrita**

A região de Jundiai apresentou uma variação no IPH, que é um indicador de pressão hospitalar.

## F20. se eu só puder olhar três lugares amanhã, quais seriam?

**Intenção esperada:** Inferir que a análise ativa é pressão regional e priorizar os três maiores IPHs, deixando claro que é triagem.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 260

**Conferência dos dados:** equivalente. mesmos 3 rótulos, na mesma ordem

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
| regiao                | pressao_estimada |
|-----------------------|------------------|
| JUNDIAI               | 67.1662          |
| FRANCO DA ROCHA       | 59.8261          |
| SAO JOSE DO RIO PRETO | 58.8846          |
```

**Conferência da narrativa:** falhou. faltou: investig / prioriz / triagem / sinal

**SQL gerado**

```sql
SELECT 
  r."NM_REGIAO_SAUDE" AS "regiao",
  r."PC_IPH_ESTIMADO" AS "pressao_estimada"
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" r
WHERE 
  r."CD_COMPETENCIA" = (SELECT MAX("CD_COMPETENCIA") FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
ORDER BY 
  r."PC_IPH_ESTIMADO" DESC NULLS LAST
FETCH FIRST 3 ROWS ONLY
```

**Resposta escrita**

As três regiões com maior pressão hospitalar são: 
* Jundiai, com 67,17% de pressão estimada
* Franco da Rocha, com 59,83% de pressão estimada
* São José do Rio Preto, com 58,88% de pressão estimada

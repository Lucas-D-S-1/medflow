# Avaliação da FlowIA com perguntas humanas

Executada em **29/08/2026 às 15:35**, concluída em **15:38**.

As perguntas abaixo são deliberadamente curtas, vagas e coloquiais. O contexto da tela é enviado separadamente, como acontece no produto; nenhum prompt entrega nomes de tabelas, colunas, fórmulas ou cortes ao modelo.

## Resumo

| Medida | Resultado |
|---|---:|
| Casos aprovados por inteiro | 5/9 |
| SQL/dados corretos ou caso sem dado objetivo | 6/9 |
| Narrativas que atenderam aos critérios | 5/9 |

| Caso | Pergunta realista | SQL/dados | Narrativa | Final |
|---|---|---|---|---|
| F03 | quem mais manda paciente pra fora? | SQL recusado ou inválido | falhou | ⚠️ |
| F04 | e quem mais recebe gente de fora? | equivalente | ok | ✅ |
| F05 | onde a atenção básica parece não estar segurando? | divergente | falhou | ⚠️ |
| F06 | qual hospital tá mais cheio hoje? | sem referência | ok | ✅ |
| F08 | quem segura o paciente por mais tempo? | SQL recusado ou inválido | falhou | ⚠️ |
| F09 | qual é o pior hospital? | sem referência | ok | ✅ |
| F15 | o que mais interna nesse hospital? | equivalente | ok | ✅ |
| F17 | esse IPR acima de 1 é ruim? | sem referência | falhou | ⚠️ |
| F20 | se eu só puder olhar três lugares amanhã, quais seriam? | equivalente | ok | ✅ |

## F03. quem mais manda paciente pra fora?

**Intenção esperada:** Usar evasão intrastadual observada percentual na competência atual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 261

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

**ID auditado:** 262

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| regiao                | codigo_regiao | percentual_atracao |
|-----------------------|---------------|--------------------|
| NORTE - BARRETOS      | 35051         | 40.79              |
| JAU                   | 35064         | 35.46              |
| AQUIFERO GUARANI      | 35132         | 32.46              |
| JALES                 | 35153         | 31.62              |
| SAO JOSE DO RIO PRETO | 35155         | 27.79              |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  r.NM_REGIAO_SAUDE AS regiao,
  r.CD_REGIAO_SAUDE AS codigo_regiao,
  ROUND(f.PC_ATRACAO_ASSISTENCIAL, 2) AS percentual_atracao
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" f
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON f.CD_REGIAO_SAUDE = r.CD_REGIAO_SAUDE
WHERE 
  f.CD_COMPETENCIA = '202606'
ORDER BY 
  f.PC_ATRACAO_ASSISTENCIAL DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões que mais recebem gente de fora são:
* NORTE - BARRETOS, com 40,79% de atração
* JAU, com 35,46% de atração
* AQUIFERO GUARANI, com 32,46% de atração
* JALES, com 31,62% de atração
* SAO JOSE DO RIO PRETO, com 27,79% de atração

## F05. onde a atenção básica parece não estar segurando?

**Intenção esperada:** Usar taxa territorial de ICSAP como sinal, com ressalva de que não prova falha nem evitabilidade individual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 263

**Conferência dos dados:** divergente. ausentes no gerado: EXTREMO OESTE PAULISTA, JALES, CATANDUVA; presentes só no gerado: ALTA PAULISTA, HORIZONTE VERDE, VALE DAS CACHOEIRAS

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
| regiao                 | codigo_regiao | percentual_evasao |
|------------------------|---------------|-------------------|
| JOSE BONIFACIO         | 35156         | 68.15             |
| PONTAL DO PARANAPANEMA | 35115         | 52.89             |
| ALTA PAULISTA          | 35111         | 48.11             |
| HORIZONTE VERDE        | 35131         | 47.76             |
| VALE DAS CACHOEIRAS    | 35133         | 43.78             |
```

**Conferência da narrativa:** falhou. faltou: icsap / atenção primária / atencao primaria; líderes ausentes na narrativa: EXTREMO OESTE PAULISTA

**SQL gerado**

```sql
SELECT 
  r.NM_REGIAO_SAUDE AS regiao,
  r.CD_REGIAO_SAUDE AS codigo_regiao,
  ROUND(f.PC_EVASAO_INTRASTADUAL_OBSERVADA, 2) AS percentual_evasao
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" f
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON f.CD_REGIAO_SAUDE = r.CD_REGIAO_SAUDE
WHERE 
  f.CD_COMPETENCIA = '202606'
ORDER BY 
  f.PC_EVASAO_INTRASTADUAL_OBSERVADA DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões com maior evasão intrastadual observada são:
* Jose Bonifacio, com 68,15% de evasão
* Pontal do Paranapanema, com 52,89% de evasão
* Alta Paulista, com 48,11% de evasão
* Horizonte Verde, com 47,76% de evasão
* Vale das Cachoeiras, com 43,78% de evasão

Essas regiões têm os maiores percentuais de pacientes que saem em busca de atendimento em outras regiões, o que pode indicar que a atenção básica não está segurando nesses locais.

## F06. qual hospital tá mais cheio hoje?

**Intenção esperada:** Recusar ocupação em tempo real e oferecer IPH mensal como aproximação de pressão, devidamente qualificada.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 264

**Conferência da narrativa:** ok. critérios narrativos atendidos

**SQL gerado**

```sql
(não gerado)
```

**Resposta escrita**

Nao foi possivel produzir uma consulta ranqueada segura. Reformule com um indicador disponivel. O IPH mede pressao estimada mensal, nao ocupacao de leitos em tempo real.

## F08. quem segura o paciente por mais tempo?

**Intenção esperada:** Interpretar como maior permanência média hospitalar, com amostra suficiente, na competência atual.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 265

**Conferência dos dados:** SQL recusado ou inválido. o modelo não devolveu SQL

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
(sem resultado)
```

**Conferência da narrativa:** falhou. faltou: líderes ausentes na narrativa: FUNDACAO FACULDADE DE MEDICINAHCFMUSP INST DE PSIQUIATRIA SP, REAL SOCIEDADE PORTUGUESA DE BENEFICENCIA, HOSPITAL MANOEL DE ABREU BAURU

**SQL gerado**

```sql
(não gerado)
```

**Resposta escrita**

Nao foi possivel produzir uma consulta ranqueada segura. Reformule com um indicador disponivel. O IPH mede pressao estimada mensal, nao ocupacao de leitos em tempo real.

## F09. qual é o pior hospital?

**Intenção esperada:** Não inventar ranking de qualidade; pedir o critério ou oferecer indicadores com limitações.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 266

**Conferência da narrativa:** ok. critérios narrativos atendidos

**SQL gerado**

```sql
SELECT 
  m."NM_HOSPITAL_ATUAL" AS hospital,
  m."CD_CNES" AS cnes,
  ROUND(m."PC_TMH", 2) AS tmh
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
WHERE 
  m."CD_COMPETENCIA" = '202606'
  AND UPPER(r."NM_REGIAO_SAUDE") LIKE UPPER('%JUNDIAI%')
ORDER BY 
  m."PC_TMH" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

O dado não mede qualidade nem desfecho. Os hospitais com maior taxa de mortalidade hospitalar na região de Jundiaí em junho de 2026 são:
* Hospital Santo Antonio de Louveira, com 28,57% de taxa de mortalidade
* HCSVP Hospital Sao Vicente, com 8,38% de taxa de mortalidade
* Unidade Mista de Saude de Jarinu Monsenhor Jacob Conti, com 6,78% de taxa de mortalidade
* Hospital de Clinicas Campo Limpo Paulista, com 5,86% de taxa de mortalidade
* Hospital Municipal Dr Alcipo da Silva Oliveira Junior, com 4,48% de taxa de mortalidade

## F15. o que mais interna nesse hospital?

**Intenção esperada:** Usar o hospital selecionado e trazer as especialidades com mais internações na competência atual.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=3012212; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 267

**Conferência dos dados:** equivalente. mesmos 4 rótulos, na mesma ordem

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
| especialidade  | cd_especialidade | qt_internacao |
|----------------|------------------|---------------|
| Pediatria      | 07               | 339           |
| Obstetrícia    | 02               | 286           |
| Cirurgia       | 01               | 239           |
| Clínica médica | 03               | 21            |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  h."NM_ESPECIALIDADE" AS especialidade,
  h."CD_ESPECIALIDADE_SIH" AS cd_especialidade,
  ROUND(h."QT_INTERNACAO_NOVA", 2) AS qt_internacao
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_ESPECIALIDADE_MENSAL" h
WHERE 
  h."CD_CNES" = '3012212'
  AND h."CD_COMPETENCIA" = '202606'
ORDER BY 
  h."QT_INTERNACAO_NOVA" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

O hospital com CNES 3012212 internou mais em Pediatria, com 339 internações, seguida de Obstetrícia, com 286, Cirurgia, com 239, e Clínica médica, com 21, em junho de 2026. 
A lista das especialidades com mais internações é:
* Pediatria: 339
* Obstetrícia: 286
* Cirurgia: 239
* Clínica médica: 21

## F17. esse IPR acima de 1 é ruim?

**Intenção esperada:** Explicar maior permanência que o benchmark e recusar interpretação como qualidade ou desfecho.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=3012212; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 268

**Conferência da narrativa:** falhou. faltou: não / nao; qualidade / desfecho

**SQL gerado**

```sql
SELECT 
  'IPR' AS indicador,
  'permanencia maior que a dos pares' AS descricao
FROM 
  DUAL
```

**Resposta escrita**

O IPR acima de 1 significa que o hospital tem permanência maior que a dos pares,

## F20. se eu só puder olhar três lugares amanhã, quais seriam?

**Intenção esperada:** Inferir que a análise ativa é pressão regional e priorizar os três maiores IPHs, deixando claro que é triagem.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 269

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
| regiao                | codigo_regiao | iph   |
|-----------------------|---------------|-------|
| JUNDIAI               | 35073         | 67.17 |
| FRANCO DA ROCHA       | 35012         | 59.83 |
| SAO JOSE DO RIO PRETO | 35155         | 58.88 |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  r."NM_REGIAO_SAUDE" AS regiao,
  r."CD_REGIAO_SAUDE" AS codigo_regiao,
  ROUND(m."PC_IPH_ESTIMADO", 2) AS iph
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
WHERE 
  m."CD_COMPETENCIA" = '202606'
ORDER BY 
  m."PC_IPH_ESTIMADO" DESC NULLS LAST
FETCH FIRST 3 ROWS ONLY
```

**Resposta escrita**

As três regiões com maior pressão hospitalar em junho de 2026 são:
* Jundiaí, com 67,17% de pressão estimada
* Franco da Rocha, com 59,83% de pressão estimada
* São José do Rio Preto, com 58,88% de pressão estimada
Essa lista prioriza investigação e o sinal não conclui desempenho.

# Avaliação da FlowIA com perguntas humanas

Executada em **26/08/2026 às 13:14**, concluída em **13:16**.

As perguntas abaixo são deliberadamente curtas, vagas e coloquiais. O contexto da tela é enviado separadamente, como acontece no produto; nenhum prompt entrega nomes de tabelas, colunas, fórmulas ou cortes ao modelo.

## Resumo

| Medida | Resultado |
|---|---:|
| Casos aprovados por inteiro | 1/5 |
| SQL/dados corretos ou caso sem dado objetivo | 2/5 |
| Narrativas que atenderam aos critérios | 2/5 |

| Caso | Pergunta realista | SQL/dados | Narrativa | Final |
|---|---|---|---|---|
| F01 | até onde esses dados vão mesmo? | divergente | falhou | ⚠️ |
| F03 | quem mais manda paciente pra fora? | SQL recusado ou inválido | ok | ⚠️ |
| F07 | quais hospitais estouraram a capacidade no último mês? | equivalente até o corte | ok | ✅ |
| F12 | quem piorou de uns meses pra cá? | divergente | falhou | ⚠️ |
| F20 | se eu só puder olhar três lugares amanhã, quais seriam? | equivalente | falhou | ⚠️ |

## F01. até onde esses dados vão mesmo?

**Intenção esperada:** Entender 'até onde' como a competência cronologicamente mais recente, não o maior número de mês.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 109

**Conferência dos dados:** divergente — ausentes no gerado: 202606; presentes só no gerado: JUNDIAI, JUNDIAI, JUNDIAI, LIMEIRA, JUNDIAI

**Resposta de referência**

```text
| mes_mais_recente |
|------------------|
| 202606           |
```

**Resposta do SQL gerado**

```text
| regiao                           | competencia | pressao_hospitalar |
|----------------------------------|-------------|--------------------|
| JUNDIAI                          | 202410      | 0.913825           |
| JUNDIAI                          | 202411      | 0.897628           |
| JUNDIAI                          | 202503      | 0.891957           |
| LIMEIRA                          | 202507      | 0.890269           |
| JUNDIAI                          | 202409      | 0.887063           |
| JUNDIAI                          | 202404      | 0.882502           |
| JUNDIAI                          | 202405      | 0.87918            |
| JUNDIAI                          | 202408      | 0.874912           |
| LIMEIRA                          | 202604      | 0.87168            |
| LIMEIRA                          | 202406      | 0.868898           |
| JUNDIAI                          | 202403      | 0.867768           |
| JUNDIAI                          | 202407      | 0.864284           |
| FRANCO DA ROCHA                  | 202604      | 0.859293           |
| LIMEIRA                          | 202504      | 0.857741           |
| LIMEIRA                          | 202505      | 0.854906           |
| LIMEIRA                          | 202508      | 0.849642           |
| LIMEIRA                          | 202506      | 0.848675           |
| LIMEIRA                          | 202405      | 0.847753           |
| FRANCO DA ROCHA                  | 202404      | 0.843585           |
| LIMEIRA                          | 202407      | 0.838575           |
| JUNDIAI                          | 202502      | 0.838073           |
| JUNDIAI                          | 202402      | 0.83721            |
| LIMEIRA                          | 202404      | 0.836681           |
| LIMEIRA                          | 202605      | 0.835694           |
| LIMEIRA                          | 202511      | 0.834163           |
| JUNDIAI                          | 202406      | 0.833679           |
| JUNDIAI                          | 202505      | 0.831094           |
| LIMEIRA                          | 202603      | 0.824285           |
| LIMEIRA                          | 202409      | 0.82371            |
| LIMEIRA                          | 202410      | 0.820354           |
| LIMEIRA                          | 202503      | 0.820084           |
| LIMEIRA                          | 202502      | 0.820084           |
| FRANCO DA ROCHA                  | 202506      | 0.818895           |
| FRANCO DA ROCHA                  | 202405      | 0.815676           |
| FRANCO DA ROCHA                  | 202603      | 0.81527            |
| LIMEIRA                          | 202509      | 0.814086           |
| REGIAO METROPOLITANA DE CAMPINAS | 202404      | 0.813347           |
| JUNDIAI                          | 202506      | 0.812113           |
| JUNDIAI                          | 202401      | 0.812041           |
| SANTA FE DO SUL                  | 202502      | 0.811301           |
| LIMEIRA                          | 202408      | 0.809151           |
| JUNDIAI                          | 202501      | 0.808852           |
| REGIAO METROPOLITANA DE CAMPINAS | 202505      | 0.806691           |
| JUNDIAI                          | 202603      | 0.806538           |
| REGIAO METROPOLITANA DE CAMPINAS | 202405      | 0.805697           |
| LIMEIRA                          | 202602      | 0.805572           |
| FRANCO DA ROCHA                  | 202505      | 0.805359           |
| LIMEIRA                          | 202403      | 0.804697           |
| MANANCIAIS                       | 202405      | 0.804389           |
| FRANCO DA ROCHA                  | 202605      | 0.802216           |
```

**Conferência da narrativa:** falhou — faltou: junho / 06/2026 / 2026-06 / 202606

**SQL gerado**

```sql
SELECT
  "NM_REGIAO_SAUDE" AS regiao,
  "CD_COMPETENCIA" AS competencia,
  "NR_IPH_ESTIMADO" AS pressao_hospitalar
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL"
ORDER BY
  "NR_IPH_ESTIMADO" DESC
```

**Resposta escrita**

A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a tendencia sao calculadas com base em dados de internacoes e leitos disponiveis em hospitais de Sao Paulo. A pressao hospitalar regional e a

## F03. quem mais manda paciente pra fora?

**Intenção esperada:** Usar evasão intrastadual observada percentual na competência atual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 110

**Conferência dos dados:** SQL recusado ou inválido — o modelo não devolveu SQL

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

**Conferência da narrativa:** ok — rótulos citados: 3/3

**SQL gerado**

```sql
(não gerado)
```

**Resposta escrita**

A região que mais manda pacientes para fora é a Mananciais, com 2458 pacientes enviados. Em seguida, vem a região Rota dos Bandeirantes, com 2637 pacientes enviados, e a região Alto do Tietê, com 3054 pacientes enviados. As regiões que mais enviaram pacientes para fora são:
- Alto do Tietê, com 3054 pacientes
- Rota dos Bandeirantes, com 2637 pacientes
- Mananciais, com 2458 pacientes
- Grande ABC, com 1526 pacientes
- Horizonte Verde, com 1183 pacientes
- Vale do Paraíba/Região Serrana, com 1022 pacientes
- São Paulo, com 1676 pacientes
- Itapetininga, com 847 pacientes
- Franca, com 902 pacientes
- Circuito da Fé e Vale Histórico, com 698 pacientes
- Bragança, com 612 pacientes
- Consórcios do DRS II, com 618 pacientes
- Baixada Santista, com 516 pacientes
- Sorocaba, com 485 pacientes
- Votuporanga, com 499 pacientes
- José Bonifácio, com 783 pacientes
- Noroeste do DRS III, com 573 pacientes
- Vale das Cachoeiras, com 634 pacientes
- Extremo Oeste Paulista, com 313 pacientes
- Tres Colinas, com 250 pacientes
- Araras, com 349 pacientes
- Alta Anhanguera, com 245 pacientes
- Limeira, com 291 pacientes
- Ourinhos, com 298 pacientes
- Litoral Norte, com 356 pacientes
- Lagos do DRS II, com 295 pacientes
- Fernandópolis, com 371 pacientes
- Itapeva, com 369 pacientes
- Bauru, com 351 pacientes
- Pontal do Paranapanema, com 339 pacientes
- Jau, com 454 pacientes
- Alta Paulista, com 472 pacientes
- Rio Claro, com 296 pacientes
- Central do DRS II, com 359 pacientes
- Alto Vale do Paraíba, com 264 pacientes
- Alta Mogiana, com 201 pacientes
- Adamantina, com 229 pacientes
- Lins, com 266 pacientes
- Jales, com 300 pacientes
- Piracicaba, com 195 pacientes
- Sul - Barretos, com 322 pacientes
- Região Metropolitana de Campinas, com 669 pacientes
- Circuito das Águas, com 238 pacientes
- Vale do Jurumirim, com 645 pacientes
- Catanduva, com 195 pacientes
- Tupa, com 204 pacientes
- Baixa Mogiana, com 268 pacientes
- Marília, com 124 pacientes
- Vale do Ribeira, com 127 pacientes
- Mantiqueira, com 541 pacientes
- Coração do DRS III, com 287 pacientes
- Assis, com 215 pacientes
- Santa Fé do Sul, com 190 pacientes
- Aquifero Guarani, com 85 pacientes
- Rio Pardo, com 284 pacientes
- Polo Cuesta, com 100 pacientes
- Alta Capivari, com 183 pacientes
- Baixada Santista, com 516 pacientes.

## F07. quais hospitais estouraram a capacidade no último mês?

**Intenção esperada:** Usar o flag de pressão acima da capacidade SUS declarada na competência mais recente.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 111

**Conferência dos dados:** equivalente até o corte — os 5 primeiros rótulos coincidem na ordem; referência devolveu 5 linha(s) e o gerado, 13

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
| nome_hospital                                             | regiao                         | iph_estimado | estourou_capacidade |
|-----------------------------------------------------------|--------------------------------|--------------|---------------------|
| HOSPITAL DIA BUTANTA                                      | SAO PAULO                      | 3.966667     | 1                   |
| HOSPITAL DIA M BOI MIRIM II VERA CRUZ                     | SAO PAULO                      | 2.716667     | 1                   |
| AME AMBULATORIO MEDICO DE ESPECIALIDADES DE CARAGUATATUBA | LITORAL NORTE                  | 2.122222     | 1                   |
| CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS             | ALTO VALE DO PARAIBA           | 1.933333     | 1                   |
| AMB MED ESPEC DOM ANTONIO AFFONSO DE MIRANDA AME TAUBATE  | VALE DO PARAIBA/REGIAO SERRANA | 1.845833     | 1                   |
| INSTITUTO OFTALMOLOGICO PAULISTA                          | SAO PAULO                      | 1.833333     | 1                   |
| HOSPITAL DIA SAO MIGUEL DR TITO LOPES DA SILVA            | SAO PAULO                      | 1.633333     | 1                   |
| HOSPITAL DIA VILA GUILHERME                               | SAO PAULO                      | 1.513333     | 1                   |
| AMBULATORIO DE ESPECIALIDADES DR GERALDO PAULO BOURROUL   | SAO PAULO                      | 1.322222     | 1                   |
| HOSPITAL DIA SAO MATEUS DR HENRIQUE CARLOS GONCALVES      | SAO PAULO                      | 1.27619      | 1                   |
| HOSPITAL DIA MOOCA                                        | SAO PAULO                      | 1.191667     | 1                   |
| AME AMBULATORIO MEDICO DE ESPECIALIDADES JUNDIAI          | JUNDIAI                        | 1.17619      | 1                   |
| HCSVP HOSPITAL SAO VICENTE                                | JUNDIAI                        | 1.049593     | 1                   |
```

**Conferência da narrativa:** ok — rótulos citados: 3/3

**SQL gerado**

```sql
SELECT
  "NM_HOSPITAL_ATUAL" AS nome_hospital,
  "NM_REGIAO_SAUDE" AS regiao,
  "NR_IPH_ESTIMADO" AS iph_estimado,
  "FL_ACIMA_CAPACIDADE_DECLARADA" AS estourou_capacidade
FROM
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL"
WHERE
  "CD_COMPETENCIA" = '202606'
  AND "FL_ACIMA_CAPACIDADE_DECLARADA" = 1
ORDER BY
  "NR_IPH_ESTIMADO" DESC
```

**Resposta escrita**

Os hospitais que estouraram a capacidade no último mês são:
- HOSPITAL DIA BUTANTA, localizado em SAO PAULO, com um IPH estimado de 3,97
- AMBULATORIO DE ESPECIALIDADES DR GERALDO PAULO BOURROUL, localizado em SAO PAULO, com um IPH estimado de 1,32
- HOSPITAL DIA SAO MIGUEL DR TITO LOPES DA SILVA, localizado em SAO PAULO, com um IPH estimado de 1,63
- INSTITUTO OFTALMOLOGICO PAULISTA, localizado em SAO PAULO, com um IPH estimado de 1,83
- HOSPITAL DIA MOOCA, localizado em SAO PAULO, com um IPH estimado de 1,19
- HOSPITAL DIA SAO MATEUS DR HENRIQUE CARLOS GONCALVES, localizado em SAO PAULO, com um IPH estimado de 1,28
- HOSPITAL DIA M BOI MIRIM II VERA CRUZ, localizado em SAO PAULO, com um IPH estimado de 2,72
- HOSPITAL DIA VILA GUILHERME, localizado em SAO PAULO, com um IPH estimado de 1,51
- HCSVP HOSPITAL SAO VICENTE, localizado em JUNDIAI, com um IPH estimado de 1,05
- AME AMBULATORIO MEDICO DE ESPECIALIDADES JUNDIAI, localizado em JUNDIAI, com um IPH estimado de 1,18
- CENTRO DE REFERENCIA EM MOLESTIAS INFECCIOSAS, localizado em ALTO VALE DO PARAIBA, com um IPH estimado de 1,93
- AME AMBULATORIO MEDICO DE ESPECIALIDADES DE CARAGUATATUBA, localizado em LITORAL NORTE, com um IPH estimado de 2,12
- AMB MED ESPEC DOM ANTONIO AFFONSO DE MIRANDA AME TAUBATE, localizado em VALE DO PARAIBA/REGIAO SERRANA, com um IPH estimado de 1,85

Esses hospitais tiveram um IPH estimado acima de 1, o que indica que estouraram a capacidade no último mês. O IPH estimado é um indicador que mede a pressão sobre a capacidade de atendimento de um hospital.

## F12. quem piorou de uns meses pra cá?

**Intenção esperada:** Pelo contexto regional ativo, comparar IPH atual com três competências antes.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 112

**Conferência dos dados:** divergente — ausentes no gerado: VALE DAS CACHOEIRAS, VOTUPORANGA, JOSE BONIFACIO, RIO PARDO; presentes só no gerado: nenhum

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
| regiao     | codigo_regiao | iph_estimado_202606 | iph_estimado_202605 | variacao_iph |
|------------|---------------|---------------------|---------------------|--------------|
| ADAMANTINA | 35091         | 0.449934            | 0.447757            | 0.002177     |
```

**Conferência da narrativa:** falhou — rótulos citados: 0/3; faltou: ao menos um dos 3 primeiros rótulos da referência

**SQL gerado**

```sql
SELECT
  r."NM_REGIAO_SAUDE" AS regiao,
  r."CD_REGIAO_SAUDE" AS codigo_regiao,
  m1."NR_IPH_ESTIMADO" AS iph_estimado_202606,
  m2."NR_IPH_ESTIMADO" AS iph_estimado_202605,
  (m1."NR_IPH_ESTIMADO" - m2."NR_IPH_ESTIMADO") AS variacao_iph
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m1
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m1."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
  JOIN "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m2 ON m1."CD_REGIAO_SAUDE" = m2."CD_REGIAO_SAUDE"
WHERE
  m1."CD_COMPETENCIA" = '202606'
  AND m2."CD_COMPETENCIA" = '202605'
  AND (m1."NR_IPH_ESTIMADO" - m2."NR_IPH_ESTIMADO") > 0
ORDER BY
  variacao_iph DESC
```

**Resposta escrita**

A região de Adamantina apresentou uma ligeira piora na pressão hospitalar, com um aumento de 0,002177 no índice de pressão hospitalar estimado, passando de 0,447757 em maio para 0,449934 em junho.

## F20. se eu só puder olhar três lugares amanhã, quais seriam?

**Intenção esperada:** Inferir que a análise ativa é pressão regional e priorizar os três maiores IPHs, deixando claro que é triagem.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 113

**Conferência dos dados:** equivalente — mesmos 3 rótulos, na mesma ordem

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
| regiao                | codigo_regiao | iph_estimado |
|-----------------------|---------------|--------------|
| JUNDIAI               | 35073         | 0.671662     |
| FRANCO DA ROCHA       | 35012         | 0.598261     |
| SAO JOSE DO RIO PRETO | 35155         | 0.588846     |
```

**Conferência da narrativa:** falhou — rótulos citados: 3/3; faltou: investig / prioriz / triagem / sinal

**SQL gerado**

```sql
SELECT
  r."NM_REGIAO_SAUDE" AS regiao,
  r."CD_REGIAO_SAUDE" AS codigo_regiao,
  m."NR_IPH_ESTIMADO" AS iph_estimado
FROM
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
WHERE
  m."CD_COMPETENCIA" = '202606'
ORDER BY
  m."NR_IPH_ESTIMADO" DESC
FETCH FIRST 3 ROWS ONLY
```

**Resposta escrita**

As três regiões que você deve olhar amanhã são:
* Jundiai, com um índice de pressão hospitalar estimado de 0,67
* Franco da Rocha, com um índice de pressão hospitalar estimado de 0,60
* São José do Rio Preto, com um índice de pressão hospitalar estimado de 0,59

Essas regiões têm os maiores índices de pressão hospitalar, o que significa que elas estão enfrentando uma maior demanda por serviços hospitalares. É importante monitorar essas regiões para garantir que elas estejam preparadas para atender às necessidades da população.

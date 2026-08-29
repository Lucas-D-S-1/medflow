# Avaliação da FlowIA com perguntas humanas

Executada em **29/08/2026 às 16:26**, concluída em **16:27**.

As perguntas abaixo são deliberadamente curtas, vagas e coloquiais. O contexto da tela é enviado separadamente, como acontece no produto; nenhum prompt entrega nomes de tabelas, colunas, fórmulas ou cortes ao modelo.

## Resumo

| Medida | Resultado |
|---|---:|
| Casos aprovados por inteiro | 2/2 |
| SQL/dados corretos ou caso sem dado objetivo | 2/2 |
| Narrativas que atenderam aos critérios | 2/2 |

| Caso | Pergunta realista | SQL/dados | Narrativa | Final |
|---|---|---|---|---|
| F05 | onde a atenção básica parece não estar segurando? | equivalente | ok | ✅ |
| F08 | quem segura o paciente por mais tempo? | equivalente | ok | ✅ |

## F05. onde a atenção básica parece não estar segurando?

**Intenção esperada:** Usar taxa territorial de ICSAP como sinal, com ressalva de que não prova falha nem evitabilidade individual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 276

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| nm_regiao_saude        | cd_regiao_saude | tx_icsap_residente_observada_por_10_mil |
|------------------------|-----------------|-----------------------------------------|
| EXTREMO OESTE PAULISTA | 35114           | 19.202582                               |
| JOSE BONIFACIO         | 35156           | 18.535498                               |
| PONTAL DO PARANAPANEMA | 35115           | 17.177798                               |
| JALES                  | 35153           | 16.024858                               |
| CATANDUVA              | 35151           | 15.684645                               |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  r.NM_REGIAO_SAUDE, 
  r.CD_REGIAO_SAUDE, 
  rm.TX_ICSAP_RESIDENTE_OBSERVADA_POR_10_MIL
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" rm
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON rm.CD_REGIAO_SAUDE = r.CD_REGIAO_SAUDE
WHERE 
  rm.CD_COMPETENCIA = (SELECT MAX(CD_COMPETENCIA) FROM "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL")
ORDER BY 
  rm.TX_ICSAP_RESIDENTE_OBSERVADA_POR_10_MIL DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões de saúde com maior taxa de ICSAP por 10 mil habitantes em junho de 2026 são:
* Extremo Oeste Paulista, com 19,20 internações por 10 mil habitantes
* Jose Bonifacio, com 18,54 internações por 10 mil habitantes
* Pontal do Paranapanema, com 17,18 internações por 10 mil habitantes
* Jales, com 16,02 internações por 10 mil habitantes
* Catanduva, com 15,68 internações por 10 mil habitantes

Essas regiões têm as maiores taxas de ICSAP, o que pode indicar que a atenção básica não está segurando bem nesses locais. ICSAP significa internações que a atenção primária poderia ter evitado, e é um sinal territorial, não evitabilidade individual.

## F08. quem segura o paciente por mais tempo?

**Intenção esperada:** Interpretar como maior permanência média hospitalar, com amostra suficiente, na competência atual.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 277

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| nome_hospital                                                | nome_regiao                      | permanencia_media |
|--------------------------------------------------------------|----------------------------------|-------------------|
| FUNDACAO FACULDADE DE MEDICINAHCFMUSP INST DE PSIQUIATRIA SP | SAO PAULO                        | 27.932127         |
| REAL SOCIEDADE PORTUGUESA DE BENEFICENCIA                    | REGIAO METROPOLITANA DE CAMPINAS | 26.314286         |
| HOSPITAL MANOEL DE ABREU BAURU                               | BAURU                            | 26.206522         |
| CENTRO HOSPITALAR DO SISTEMA PENITENCIARIO SAO PAULO         | SAO PAULO                        | 24.621359         |
| HOSPITAL CANTAREIRA                                          | SAO PAULO                        | 20.633094         |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL".NM_HOSPITAL_ATUAL AS "NOME_HOSPITAL",
  "MEDFLOW"."DIM_GEOGRAFIA_REGIAO".NM_REGIAO_SAUDE AS "NOME_REGIAO",
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL".NR_PERMANENCIA_MEDIA AS "PERMANENCIA_MEDIA"
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL"
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" ON "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL".CD_REGIAO_SAUDE = "MEDFLOW"."DIM_GEOGRAFIA_REGIAO".CD_REGIAO_SAUDE
WHERE 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL".CD_COMPETENCIA = (SELECT MAX(CD_COMPETENCIA) FROM "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL")
  AND "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL".ST_AMOSTRA = 'suficiente'
ORDER BY 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL".NR_PERMANENCIA_MEDIA DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

Os hospitais que seguram o paciente por mais tempo são:
* FUNDACAO FACULDADE DE MEDICINAHCFMUSP INST DE PSIQUIATRIA SP, em SAO PAULO, com permanência média de 27,93 dias
* REAL SOCIEDADE PORTUGUESA DE BENEFICENCIA, em REGIAO METROPOLITANA DE CAMPINAS, com permanência média de 26,31 dias
* HOSPITAL MANOEL DE ABREU BAURU, em BAURU, com permanência média de 26,21 dias
* CENTRO HOSPITALAR DO SISTEMA PENITENCIARIO SAO PAULO, em SAO PAULO, com permanência média de 24,62 dias
* HOSPITAL CANTAREIRA, em SAO PAULO, com permanência média de 20,63 dias

Esses hospitais têm as maiores permanências médias em junho de 2026, o que pode indicar que eles estão segurando os pacientes por mais tempo. É importante notar que a permanência média é um indicador administrativo e não mede a qualidade ou o desfecho do tratamento.

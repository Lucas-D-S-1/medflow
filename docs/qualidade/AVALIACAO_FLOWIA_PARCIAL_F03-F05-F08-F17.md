# Avaliação da FlowIA com perguntas humanas

Executada em **29/08/2026 às 16:23**, concluída em **16:25**.

As perguntas abaixo são deliberadamente curtas, vagas e coloquiais. O contexto da tela é enviado separadamente, como acontece no produto; nenhum prompt entrega nomes de tabelas, colunas, fórmulas ou cortes ao modelo.

## Resumo

| Medida | Resultado |
|---|---:|
| Casos aprovados por inteiro | 2/4 |
| SQL/dados corretos ou caso sem dado objetivo | 3/4 |
| Narrativas que atenderam aos critérios | 2/4 |

| Caso | Pergunta realista | SQL/dados | Narrativa | Final |
|---|---|---|---|---|
| F03 | quem mais manda paciente pra fora? | equivalente | ok | ✅ |
| F05 | onde a atenção básica parece não estar segurando? | divergente | falhou | ⚠️ |
| F08 | quem segura o paciente por mais tempo? | equivalente | falhou | ⚠️ |
| F17 | esse IPR acima de 1 é ruim? | sem referência | ok | ✅ |

## F03. quem mais manda paciente pra fora?

**Intenção esperada:** Usar evasão intrastadual observada percentual na competência atual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 272

**Conferência dos dados:** equivalente. mesmos 5 rótulos, na mesma ordem

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
| regiao                 | codigo_regiao | percentual_evasao |
|------------------------|---------------|-------------------|
| JOSE BONIFACIO         | 35156         | 68.15             |
| PONTAL DO PARANAPANEMA | 35115         | 52.89             |
| ALTA PAULISTA          | 35111         | 48.11             |
| HORIZONTE VERDE        | 35131         | 47.76             |
| VALE DAS CACHOEIRAS    | 35133         | 43.78             |
```

**Conferência da narrativa:** ok. primeiros 3 rótulos narrados na ordem correta

**SQL gerado**

```sql
SELECT 
  r.NM_REGIAO_SAUDE AS regiao,
  r.CD_REGIAO_SAUDE AS codigo_regiao,
  ROUND(m.PC_EVASAO_INTRASTADUAL_OBSERVADA, 2) AS percentual_evasao
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m.CD_REGIAO_SAUDE = r.CD_REGIAO_SAUDE
WHERE 
  m.CD_COMPETENCIA = '202606'
ORDER BY 
  m.PC_EVASAO_INTRASTADUAL_OBSERVADA DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões que mais mandam pacientes para fora são:
* Jose Bonifacio, com 68,15% de evasão
* Pontal do Paranapanema, com 52,89% de evasão
* Alta Paulista, com 48,11% de evasão
* Horizonte Verde, com 47,76% de evasão
* Vale das Cachoeiras, com 43,78% de evasão

## F05. onde a atenção básica parece não estar segurando?

**Intenção esperada:** Usar taxa territorial de ICSAP como sinal, com ressalva de que não prova falha nem evitabilidade individual.

**Contexto silencioso da tela:** `tela=fluxos; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=fluxos assistenciais, evasao e ICSAP`

**ID auditado:** 273

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
  r."NM_REGIAO_SAUDE" AS regiao,
  r."CD_REGIAO_SAUDE" AS codigo_regiao,
  ROUND(m."PC_EVASAO_INTRASTADUAL_OBSERVADA", 2) AS percentual_evasao
FROM 
  "MEDFLOW"."MART_INDICADOR_REGIAO_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m."CD_REGIAO_SAUDE" = r."CD_REGIAO_SAUDE"
WHERE 
  m."CD_COMPETENCIA" = '202606'
ORDER BY 
  m."PC_EVASAO_INTRASTADUAL_OBSERVADA" DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

As regiões com maior evasão intrastadual observada são:
* Jose Bonifacio, com 68,15% de evasão
* Pontal do Paranapanema, com 52,89% de evasão
* Alta Paulista, com 48,11% de evasão
* Horizonte Verde, com 47,76% de evasão
* Vale das Cachoeiras, com 43,78% de evasão

Essas regiões têm os maiores percentuais de pacientes que são enviados para fora delas para receber atendimento médico. Isso pode indicar que a atenção básica nesses locais não está segurando a demanda por cuidados de saúde.

## F08. quem segura o paciente por mais tempo?

**Intenção esperada:** Interpretar como maior permanência média hospitalar, com amostra suficiente, na competência atual.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 274

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
| hospital                                                     | regiao                           | permanencia_media |
|--------------------------------------------------------------|----------------------------------|-------------------|
| FUNDACAO FACULDADE DE MEDICINAHCFMUSP INST DE PSIQUIATRIA SP | SAO PAULO                        | 27.93             |
| REAL SOCIEDADE PORTUGUESA DE BENEFICENCIA                    | REGIAO METROPOLITANA DE CAMPINAS | 26.31             |
| HOSPITAL MANOEL DE ABREU BAURU                               | BAURU                            | 26.21             |
| CENTRO HOSPITALAR DO SISTEMA PENITENCIARIO SAO PAULO         | SAO PAULO                        | 24.62             |
| HOSPITAL CANTAREIRA                                          | SAO PAULO                        | 20.63             |
```

**Conferência da narrativa:** falhou. faltou: líderes ausentes na narrativa: FUNDACAO FACULDADE DE MEDICINAHCFMUSP INST DE PSIQUIATRIA SP

**SQL gerado**

```sql
SELECT 
  m.NM_HOSPITAL_ATUAL AS hospital,
  r.NM_REGIAO_SAUDE AS regiao,
  ROUND(m.NR_PERMANENCIA_MEDIA, 2) AS permanencia_media
FROM 
  "MEDFLOW"."MART_INDICADOR_HOSPITAL_MENSAL" m
  JOIN "MEDFLOW"."DIM_GEOGRAFIA_REGIAO" r ON m.CD_REGIAO_SAUDE = r.CD_REGIAO_SAUDE
WHERE 
  m.CD_COMPETENCIA = '202606'
  AND m.ST_AMOSTRA = 'suficiente'
ORDER BY 
  m.NR_PERMANENCIA_MEDIA DESC NULLS LAST
FETCH FIRST 5 ROWS ONLY
```

**Resposta escrita**

Os hospitais que seguram o paciente por mais tempo são:
* FUNDACAO FACULDADE DE MEDICINA HCFMUSP INST DE PSIQUIATRIA SP, com permanência média de 27,93 dias, localizado em SAO PAULO
* REAL SOCIEDADE PORTUGUESA DE BENEFICENCIA, com permanência média de 26,31 dias, localizado em REGIAO METROPOLITANA DE CAMPINAS
* HOSPITAL MANOEL DE ABREU BAURU, com permanência média de 26,21 dias, localizado em BAURU
* CENTRO HOSPITALAR DO SISTEMA PENITENCIARIO SAO PAULO, com permanência média de 24,62 dias, localizado em SAO PAULO
* HOSPITAL CANTAREIRA, com permanência média de 20,63 dias, localizado em SAO PAULO

Esses hospitais têm as maiores permanências médias, o que pode indicar que eles estão segurando os pacientes por mais tempo em comparação com outros hospitais.

## F17. esse IPR acima de 1 é ruim?

**Intenção esperada:** Explicar maior permanência que o benchmark e recusar interpretação como qualidade ou desfecho.

**Contexto silencioso da tela:** `tela=hospital; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=3012212; analise_ativa=hospitais, permanencia, perfil clinico e IPR`

**ID auditado:** 275

**Conferência da narrativa:** ok. critérios narrativos atendidos

**SQL gerado**

```sql
SELECT 
  'O IPR acima de 1 não mede qualidade nem desfecho, ele compara a permanência com pares por CID' AS resposta
FROM 
  dual
```

**Resposta escrita**

O IPR acima de 1 não mede qualidade nem desfecho, ele compara a permanência com pares por CID.

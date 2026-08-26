# Avaliação da FlowIA com perguntas humanas

Executada em **26/08/2026 às 15:57**, concluída em **15:57**.

As perguntas abaixo são deliberadamente curtas, vagas e coloquiais. O contexto da tela é enviado separadamente, como acontece no produto; nenhum prompt entrega nomes de tabelas, colunas, fórmulas ou cortes ao modelo.

## Resumo

| Medida | Resultado |
|---|---:|
| Casos aprovados por inteiro | 0/1 |
| SQL/dados corretos ou caso sem dado objetivo | 0/1 |
| Narrativas que atenderam aos critérios | 0/1 |

| Caso | Pergunta realista | SQL/dados | Narrativa | Final |
|---|---|---|---|---|
| F12 | quem piorou de uns meses pra cá? | sem referência | falhou | ⚠️ |

## F12. quem piorou de uns meses pra cá?

**Intenção esperada:** Pelo contexto regional ativo, comparar IPH atual com três competências antes.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** não gerado

**Erro:** ORA-20400: Request failed with status HTTP 400 - https://inference.generativeai.sa-saopaulo-1.oci.my$cloud_domain/20231130/actions/chat

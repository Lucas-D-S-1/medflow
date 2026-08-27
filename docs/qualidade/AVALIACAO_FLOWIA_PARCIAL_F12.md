# Avaliação da FlowIA com perguntas humanas

Executada em **26/08/2026 às 23:29**, concluída em **23:29**.

As perguntas abaixo são deliberadamente curtas, vagas e coloquiais. O contexto da tela é enviado separadamente, como acontece no produto; nenhum prompt entrega nomes de tabelas, colunas, fórmulas ou cortes ao modelo.

## Resumo

| Medida | Resultado |
|---|---:|
| Casos aprovados por inteiro | 1/1 |
| SQL/dados corretos ou caso sem dado objetivo | 1/1 |
| Narrativas que atenderam aos critérios | 1/1 |

| Caso | Pergunta realista | SQL/dados | Narrativa | Final |
|---|---|---|---|---|
| F12 | quem piorou de uns meses pra cá? | equivalente | ok | ✅ |

## F12. quem piorou de uns meses pra cá?

**Intenção esperada:** Pelo contexto regional ativo, comparar IPH atual com três competências antes.

**Contexto silencioso da tela:** `tela=regional; competencia=202606 (formato AAAAMM, igual ao da coluna CD_COMPETENCIA); regiao=JUNDIAI; codigo_regiao=35073; hospital_cnes=nao informado; analise_ativa=pressao hospitalar regional e tendencia`

**ID auditado:** 145

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

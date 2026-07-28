# Notebooks legados — não executar

Material preservado por rastreabilidade histórica. **Nada aqui deve ser executado nem
publicado como pipeline do projeto.**

## `inspecao_datasus.ipynb`

Foi o notebook original de inspeção do DATASUS, arquivado em 28/07/2026. Dois motivos:

**1. Calcula o IPH pela fórmula rejeitada.** A célula 25 usa `COUNT(AIH)` como
numerador:

```python
intern = sih_full.groupby([col_cnes_sih, "_ano", "_mes"]).size()   # errado
iph_hosp["iph"] = iph_hosp["internacoes"] / iph_hosp["denominador"]
```

O correto é paciente-dia — `SUM(QT_DIARIAS)` — conforme `../../DECISOES.md` § 3. A
fórmula antiga produz IPH médio ≈ 0,14 em vez de 0,4403, achatando tudo abaixo de 0,3:
nenhum hospital jamais apareceria como crítico.

**2. É destrutivo.** A célula 31 grava direto em `dados/processados/`. Um "Run All"
distraído substituía os parquets corretos por dados errados, sem backup — eles estão
no `.gitignore`.

### O que o substitui

| Antes | Agora |
|---|---|
| download e leitura dos `.dbc` | `../00_extracao_dados.ipynb` |
| transformação e cálculo do IPH | `../01_engenharia_dados.ipynb` |

Os notebooks novos gravam em diretórios próprios, nunca sobrescrevem sem
`SOBRESCREVER = True` e validam o resultado contra os números da Sprint 1 antes de
promover qualquer arquivo.

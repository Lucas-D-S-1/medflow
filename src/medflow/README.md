# `src/medflow/` — o pipeline

**O quê.** O pacote Python que produz as três camadas de dados: Bronze fiel à
fonte, Silver conformada, Gold com os indicadores. É ele que roda, não os
notebooks.

**Por quê aqui.** Até a fatia 4 da reorganização a lógica vivia dentro dos
notebooks, o que a tornava impossível de testar, de reexecutar em lote e de
revisar em diff. Mover foi feito com portão objetivo: os SHA-256 dos parquets
tinham de continuar idênticos aos do inventário congelado antes da mudança.

**Como.** Pelo CLI, que é o que o `Makefile` chama:

```bash
medflow bronze | silver | gold | geografia | validar | inventario
```

## O mapa

| Módulo | Responsabilidade |
|---|---|
| `config.py` | recorte, UF, caminhos e logging — tudo do ambiente |
| `bronze/` | ingestão, conversão DBF→Parquet, manifesto e referências oficiais |
| `silver/` | dimensões, fatos, de/paras e agregados conformados |
| `gold.py` | os sete marts e os seis indicadores: IPH, IPR, IPE, IS, TMH e CMI |
| `icsap.py` | os 19 grupos da Portaria SAS/MS 221/2008 |
| `ipca.py` | número-índice do IPCA e o fator de correção do CMI real |
| `geografia.py` | regiões, população IBGE 2022 e as malhas GeoJSON/TopoJSON |
| `contratos.py` | publica os contratos de dados e os dicionários |
| `validar.py` | validação integrada das três camadas contra os contratos |
| `inventario.py` | SHA-256 dos artefatos, para provar que nada se perdeu |
| `oracle/` | conexão mTLS, carga da Gold e executor de SQL |
| `select_ai/` | a suíte de perguntas, o SQL de referência e o executor que compara as duas respostas |
| `cli.py` | a porta de entrada de tudo acima |

## Duas regras que o código segue

**Nenhum total é memorizado.** Contagens e reconciliações são medidas contra o
manifesto e os metadados, nunca contra um número escrito no código. A regra
nasceu de três defeitos reais: o recorte avançou de 29 para 30 competências e
tudo que guardava um número passou a mentir em silêncio.

**Trocar o recorte é configuração.** `MEDFLOW_PERIODO_FINAL=2026-07 make gold`
funciona sem editar uma linha. O padrão em `config.py` acompanha o recorte
entregue, e um teste o confere contra o manifesto real da Bronze.

# DECISÕES — Challenge Oracle: MedFlow

Atualizado em 29/07/2026. As decisões abaixo substituem interpretações
anteriores quando houver conflito.

## 1. Escopo

- São Paulo, competências solicitadas de 2024 a 2026.
- A execução usa todas as competências comuns já publicadas para SIH/RD e
  CNES/LT. Na validação de 29/07/2026, o recorte efetivo foi
  **2024-01 a 2026-05 (29 meses)**; 2026 é um período parcial.
- A descoberta remota e o cache incremental permitem que o mesmo batch mensal
  incorpore novas competências até 2026-12 sem alterar o código.
- Fontes públicas: SIH/RD, CNES/LT, API de Dados Abertos do Ministério da
  Saúde, tabelas CID-10 do DATASUS e referências do IBGE/CONCLA.
- Análise histórica; ML e predição permanecem fora do escopo.
- O atraso de publicação do DATASUS é característica do produto retrospectivo.

Volumetria Bronze validada:

- SIH/RD: 7.034.961 linhas e 117 colunas;
- CNES/LT: 243.085 linhas e 31 colunas;
- IBGE: 645 municípios.

## 2. Arquitetura de dados

```text
00_extracao_dados.ipynb       → Bronze
01_engenharia_dados.ipynb     → Silver
02_analise_dados.ipynb        → Gold, implementada e validada
Oracle Autonomous DB          → armazenamento/serving
Dashboard + Select AI         → consumo
```

### Bronze

Ingere e preserva. Não aplica regra de negócio, filtro, de/para ou imputação.
Pode descomprimir, serializar e acrescentar linhagem técnica. O
`MANIFESTO.json` registra fonte, esquema, volumetria e hashes.

### Silver

Contém toda tipagem analítica, de/para, dimensão, fato, flag de qualidade e
reconciliação. Publica somente dimensões e fatos com nomes canônicos.

### Gold/análise

Contém as fórmulas finais, benchmarks, estados de amostra, marts e geografia.
Os cinco contratos foram aprovados em 29/07/2026.

## 3. Unidade de contagem do SIH

Uma linha mensal da base reduzida é uma **AIH aprovada**, não necessariamente
uma nova internação.

- `IDENT=1`: AIH normal / internação nova;
- `IDENT=5`: continuação de longa permanência.

No recorte:

- 7.034.961 AIHs aprovadas;
- 6.909.807 números de AIH distintos;
- 6.905.441 internações novas;
- 129.520 registros de continuação.

Decisão: preservar `N_AIH` e `IDENT` no fato e expor contagens separadas. Os
cinco indicadores principais usam internações novas; continuações aparecem
separadamente no CMI.

## 4. Permanência e diárias

`QT_DIARIAS` e `DIAS_PERM` não são equivalentes:

- `QT_DIARIAS`: diárias faturadas;
- `DIAS_PERM`: permanência registrada.

Somente 70,0547% das linhas têm valores iguais; 181.584 registros têm
`QT_DIARIAS=0` e `DIAS_PERM>0`.

Decisões:

- IPR e tempo médio usam `DIAS_PERM`;
- permanência zero não é excluída automaticamente;
- `QT_DIARIAS` é preservado e recebe nome explícito de faturamento;
- filtros viram regras analíticas documentadas, nunca descarte silencioso.

## 5. Situação dos cinco índices

| Índice | Definição aprovada | Situação |
|---|---|---|
| TMH | óbitos / internações novas | Gold validada; mínimo 30 |
| IPR | permanência hospital/CID / benchmark regional sem o hospital | Gold validada; cortes 20/50/3 |
| IS | 2026 / média do mesmo mês em 2024–2025 | Gold validada para jan–mai/2026 |
| CMI | valor aprovado nominal / internações novas | Gold validada; continuações separadas |
| IPH | pacientes-dia reconstruídos / leitos-dia declarados | Gold validada como pressão estimada |

### IPH

O cálculo histórico:

```text
SUM(QT_DIARIAS) / (leitos_SUS × dias_do_mês)
```

é preservado somente como `proxy_iph_diarias_faturadas`. Ele reproduz a média
`0,472168`, mas não prova ocupação física porque:

- `QT_DIARIAS` é faturamento;
- 18,7633% das competências divergem do mês da saída;
- 15,0798% das internações cruzam mês;
- a soma na competência não distribui a ocupação no calendário.

Decisão vinculante: não chamar o proxy histórico nem o IPH Gold de “ocupação
real”. O contrato atual não usa faixas históricas Normal/Atenção/Crítico;
denominador zero recebe IPH nulo.

## 6. Domínios

### Especialidade

Os 15 códigos `ESPEC` observados têm cobertura de de/para de 100%. `ESPEC` não
é fonte para recorte de UTI; usar `MARCA_UTI` e `UTI_MES_TO`, com as ressalvas
documentadas.

### Idade

Preservar `IDADE` junto de `COD_IDADE`. A interpretação depende da unidade:
dias, meses, anos ou adicional acima de 100 anos.

### Município

O SIH usa código de seis dígitos e o IBGE, sete. A dimensão municipal mantém
ambos; o dígito verificador vem da referência IBGE.

### Região de saúde

A região analítica usa o código oficial de cinco dígitos, nome e macrorregião
da referência DEMAS/MS por município. A região contida no CNES/LT é preservada
separadamente para auditoria; seus quatro conflitos não alteram a referência
analítica. A cobertura do fato passou a 100%, sem imputação arbitrária.

### Demais referências

- `NAT_JUR`: CONCLA/IBGE 2021, 21/21 códigos observados; o código `1228`,
  surgido no perfil mais recente de um hospital, foi incorporado como
  “Consórcio Público de Direito Privado”;
- `DIAG_PRINC`: DATASUS CID-10 2008 e complementos oficiais do MS,
  9.494/9.494 códigos observados;
- `MARCA_UTI`: MS/DATASUS e CEM, 14/14 códigos observados;
- nome e esfera atuais: API oficial CNES, 653/653 hospitais.

Nome e esfera são fotografia atual, explicitamente marcados como não
históricos. O `ESFERA_A` bruto do CNES/LT permanece vazio e não é preenchido
retroativamente.

## 7. Personas e storytelling

Persona primária: secretário(a) de saúde, com visão regional e alocação de
recursos.

Persona secundária: gestor hospitalar, comparando seu estabelecimento com pares.

Qualquer indicador aprovado deve ser apresentado em quatro camadas:

1. valor atual;
2. comparação com período anterior;
3. padrão histórico;
4. interpretação de gestão.

## 8. Segurança e reprodutibilidade

- FTP direto é a fonte operacional. O notebook descobre a interseção de
  competências SIH/RD e CNES/LT dentro de 2024–2026.
- Downloads e cadastros usam cache incremental; uma nova competência promove
  automaticamente um novo recorte consolidado.
- Reexecuções do mesmo recorte preservam os Parquets, salvo
  `SOBRESCREVER=True`.
- Arquivos em construção usam sufixo `.parcial`.
- A Silver só promove dados após reconciliar totais e domínios.
- todo material anterior foi isolado em `dados/legado/` e não alimenta o
  pipeline `0.2.0`.

## 9. Sprint 2

Entrega prevista: 01/09/2026.

Ordem de trabalho restante:

1. modelar e carregar as tabelas aprovadas no Oracle;
2. construir dashboard usando os marts e o TopoJSON;
3. validar as consultas SQL e três perguntas do Select AI;
4. regenerar achados e figuras;
5. atualizar pitch e vídeo.

A versão pública `v0.1.0` do pipeline Bronze/Silver foi publicada em
29/07/2026.

A base metodológica e a estrutura de dados estão fechadas. Ferramenta de
dashboard, carga no Oracle e perguntas finais do Select AI continuam em aberto.

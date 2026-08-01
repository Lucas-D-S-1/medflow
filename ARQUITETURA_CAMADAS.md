# Arquitetura de dados do MedFlow

Contrato `0.3.0`, atualizado em 01/08/2026.

## Referência acadêmica

A organização segue o zoneamento apresentado nas páginas 9–19 de
`00_fases/fase_3/capitulos/CAP 5 - Arquitetura de Data Lake em Ambientes de
Nuvem e Híbrido_RevFinal.pdf`:

| Termo da aula | Termo do projeto | Responsabilidade |
|---|---|---|
| Raw | Bronze | preservar fontes, linhagem e serializações fiéis |
| Trusted | Silver | tipar, conformar, reconciliar, documentar dimensões e fatos |
| Curated | Gold | aplicar regras de negócio, indicadores, agregações e ativos de BI |
| Refined | Platinum | fora do escopo atual |

## Fluxo

```text
SIH/RD + CNES/LT + APIs MS/IBGE + CSV MS + IPCA + malha IBGE
                              │
                              ▼
00_extracao_dados.ipynb ── Bronze
  origem/      arquivos imutáveis recebidos
  intermediario/dbf/ cache técnico reproduzível
  parquet/     serialização fiel com linhagem
                              │
                              ▼
01_engenharia_dados.ipynb ── Silver
  dimensoes/   tempo, hospital, município, especialidade, CID, domínio
  fatos/       internação e leito mensal
  qualidade/   reconciliações, domínios e metadados
                              │
                              ▼
02_analise_dados.ipynb ── Gold
  marts/       indicadores hospitalares, residência, fluxo e ICSAP
  geografia/   CSV, GeoJSON e TopoJSON para o produto
  qualidade/   cobertura, amostras, hashes e limitações
```

## Estrutura física

```text
sprint_2_em_andamento/
├── notebooks/
│   ├── 00_extracao_dados.ipynb
│   ├── 01_engenharia_dados.ipynb
│   ├── 02_analise_dados.ipynb
│   ├── executados/
│   └── _legado/
├── pipeline/
│   ├── contratos.py
│   ├── geografia.py
│   ├── gold.py
│   ├── icsap.py
│   ├── ipca.py
│   └── inventario.py
├── contratos/
├── dados/
│   ├── bronze/
│   ├── silver/
│   ├── gold/
│   └── legado/
├── figuras/
│   ├── gold/
│   └── legado/
└── referencias/
    └── legado_sprint_1/
```

## Fronteiras

### Bronze

- conserva DBC, JSON, ZIP, HTML, CSV e malha geográfica recebidos;
- DBF é cache técnico e não fonte soberana;
- Parquet pode acrescentar somente arquivo e competência de origem;
- nomes de coluna permanecem iguais aos da fonte.

### Silver

- contém somente dimensões e fatos reutilizáveis;
- aplica os de/paras e nomes canônicos;
- mantém a competência como chave `cd_competencia`;
- não contém benchmark, classificação ou indicador de negócio.

### Gold

- contém contratos hospitalares e territoriais aprovados;
- registra amostras e denominadores insuficientes sem descartá-los;
- oferece chaves regionais consistentes em todos os marts;
- mantém explícito que o IPH é pressão estimada, não ocupação real.
- separa região de residência da região do hospital;
- preserva CMI nominal e publica CMI real com referência IPCA explícita;
- classifica ICSAP pela Portaria SAS/MS 221/2008.

## Contratos e documentação

- `CONTRATO_NOMENCLATURA.md`: convenção de tabelas e colunas;
- `contratos/bronze.json`, `silver.json` e `gold.json`: contratos legíveis por
  máquina;
- `contratos/MAPEAMENTO_COLUNAS_ORIGEM_SILVER.csv`: migração `0.1.x → 0.2.0`;
- `dados/<camada>/DICIONARIO.md`: dicionários gerados;
- `contratos/INVENTARIO_PRE_MIGRACAO.json`: hashes anteriores à reorganização.

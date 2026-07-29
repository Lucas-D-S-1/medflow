# PIPELINE — contrato Bronze e Silver do MedFlow

Atualizado em 28/07/2026 após execução integral dos notebooks.

## Contrato das camadas

### Bronze — `00_extracao_dados.ipynb`

Responsabilidade: adquirir e preservar as fontes.

Permitido:

- download e cache;
- descompressão técnica DBC/DBF e HTTP gzip;
- serialização em Parquet;
- metadados de linhagem;
- manifesto, hashes, esquema e volumetria.

Proibido:

- filtro analítico;
- preenchimento de ausência;
- de/para;
- normalização de código de negócio;
- dimensão, fato ou indicador.

### Silver — `01_engenharia_dados.ipynb`

Responsabilidade: tornar os dados consistentes e auditáveis para análise.

Inclui:

- tipagem;
- todos os de/paras;
- dimensões e fatos;
- classificação de qualidade e origem;
- agregações com `dropna=False`;
- reconciliações antes da promoção;
- documentação automática de esquema, domínios e qualidade.

### Gold/análise — futuro `02_analise_dados.ipynb`

Responsabilidade: fórmulas finais, benchmarks, faixas, visualizações e narrativa.
Nenhum índice é declarado validado apenas porque a Silver contém seus insumos.

## Oito controles implementados

1. **Inventário de domínios:** cobertura medida por campo; lacunas explícitas.
2. **De/paras:** todos os códigos observados de especialidade, natureza
   jurídica, CID e UTI estão cobertos e têm proveniência.
3. **Identificadores preservados:** `N_AIH`, `IDENT` e `COD_IDADE` estão no fato.
4. **Unidade de contagem:** 5.210.357 AIHs aprovadas, 5.097.456 internações
   novas e 112.901 continuações.
5. **Permanência:** `DIAS_PERM` alimenta permanência; `QT_DIARIAS` permanece
   nomeado como faturamento.
6. **Região:** região analítica vem da referência oficial municipal do MS;
   a declaração histórica do CNES/LT e seus quatro conflitos são preservados
   para auditoria.
7. **Nulos em agrupamento:** `dropna=False` e reconciliação impedem perdas
   silenciosas; a base CID cresceu de 361.273 para 377.708 linhas.
8. **Índices:** TMH e IPR têm insumos validados; CMI exige decisão da unidade;
   IPH real está bloqueado.

## Reconciliações bloqueantes

A Silver só grava se:

- fato SIH = 5.210.357 linhas;
- AIH normal + continuação = total do fato;
- todos os códigos `ESPEC` observados tiverem de/para;
- todos os CIDs tiverem capítulo e descrição;
- todos os hospitais SIH existirem na dimensão hospital;
- todos os hospitais tiverem região, natureza jurídica, nome e esfera atuais;
- agregados hospital/mês e hospital/especialidade/mês somarem o fato;
- agregado hospital/CID somar todas as internações novas;
- internações com região nula continuarem presentes após o `groupby`.

Nome e esfera atuais não são usados para reescrever o cadastro histórico. A
dimensão hospital os identifica com sufixo `_atual` e
`fl_cadastro_atual_nao_historico=1`. Se o produto exigir o atributo vigente em
cada competência de 2022–2023, será necessária uma fonte cadastral histórica.

## Observação sobre o IPH histórico

O proxy:

```text
SUM(QT_DIARIAS) / (leitos_SUS × dias_do_mês)
```

reproduz a média histórica `0,440272`, mas isso não comprova ocupação real.
`QT_DIARIAS` é faturamento, a competência pode divergir da saída e 16,2554% das
internações cruzam mês. Para medir ocupação física seria necessário distribuir
intervalos de internação no calendário e validar as regras de leito/transferência.

Até essa investigação, o campo chama-se `proxy_iph_diarias_faturadas` e recebe
o status `experimental_nao_validado_como_ocupacao_real`.

## Artefatos legados

`dados/processados/`, `dados/curados/`, `medflow_patches_v2.ipynb` e
`notebooks/_legado/` não fazem parte do contrato atual. Permanecem somente para
rastreabilidade histórica e não devem alimentar novos resultados.

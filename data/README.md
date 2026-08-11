# `data/` — as camadas, quase todas fora do Git

**O quê.** As três camadas materializadas, mais o legado preservado para
auditoria. São cerca de 11 GB, então **o conteúdo é gitignored**: o que está
versionado aqui são os artefatos pequenos que descrevem o resto — manifesto,
dicionários, metadados de qualidade, geografia e o legado curado.

```text
bronze/   origem (DBC), intermediário (DBF, cache), parquet e MANIFESTO.json
silver/   dimensões, fatos e qualidade/
gold/     marts/, geografia/ e qualidade/
legado/   contrato anterior e o recorte 2022-2023, para auditoria
```

**Como materializar**, num clone limpo:

```bash
make bronze silver gold geografia
make validar
```

A Bronze baixa só o que falta no cache, então uma segunda execução é barata.
Nenhuma etapa duplica registro ou reescreve Parquet sem necessidade.

## O que é imutável e o que não é

A distinção governa a checagem de preservação em `validar.py`, e ela custou um
defeito para ficar clara:

- **imutável** — o legado de 2022-2023 e as figuras de referência. Nunca são
  regenerados, e um SHA-256 diferente significa perda;
- **regenerável** — Bronze, Silver e Gold do recorte corrente. Mudam
  legitimamente quando o recorte avança, e compará-las contra um inventário
  antigo produziria uma falha permanente que ninguém mais olharia.

As saídas regeneráveis têm garantias mais fortes que um hash: contratos,
manifesto e invariantes conferidas a cada `make validar`.

## Por que 12 MB de referência estão versionados

`bronze/origem/referencias/` guarda a malha municipal do IBGE, o CSV de regiões
do Ministério da Saúde, a CID-10 do DATASUS e as respostas das APIs oficiais.
São 12 MB — a maior parte do repositório — e o pipeline sabe baixá-los sozinho
(`bronze/referencias.py`). Versioná-los parece desperdício, e é deliberado.

O motivo é que **URL de órgão público muda**. O IBGE reorganiza o `geoftp`, o
MS troca o bucket, o DATASUS renomeia o pacote da CID. Quando isso acontece, um
repositório que só guarda o endereço deixa de reproduzir o recorte validado, e
não há como saber se o arquivo novo é o mesmo que produziu os números
publicados. A cópia versionada, com o SHA-256 no `MANIFESTO.json`, responde
essa pergunta anos depois.

12 MB é barato para essa garantia. Se um dia deixar de ser, a saída é publicar
as referências como *release asset* — não apagá-las.

## O manifesto é a fonte do recorte

`bronze/MANIFESTO.json` registra fonte, volumetria, SHA-256 e as competências
efetivamente disponíveis. É dele que saem a competência do webapp, o padrão do
`config.py` e os testes — nunca de um número escrito à mão.

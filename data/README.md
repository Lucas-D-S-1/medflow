# `data/` — as camadas, quase todas fora do Git

**O quê.** As três camadas materializadas. São cerca de 11 GB, então **o
conteúdo é gitignored**: o que está versionado aqui são os artefatos pequenos
que descrevem o resto: manifesto, dicionários, metadados de qualidade e
geografia.

```text
bronze/   origem (DBC), intermediário (DBF, cache), parquet e MANIFESTO.json
silver/   dimensões, fatos e qualidade/
gold/     marts/, geografia/ e qualidade/
```

**Como materializar**, num clone limpo:

```bash
make pipeline
make validar
```

A Bronze baixa só o que falta no cache, então uma segunda execução é barata.
Nenhuma etapa duplica registro ou reescreve Parquet sem necessidade.

## Tudo aqui é regenerável

Bronze, Silver e Gold mudam legitimamente quando o recorte avança, e as
garantias que valem para elas são mais fortes que um hash: contratos,
manifesto e invariantes conferidos a cada `make validar`.

## Por que 12 MB de referência estão versionados

`bronze/origem/referencias/` guarda a malha municipal do IBGE, o CSV de regiões
do Ministério da Saúde, a CID-10 do DATASUS e as respostas das APIs oficiais.
São 12 MB (a maior parte do repositório) e o pipeline sabe baixá-los sozinho
(`bronze/referencias.py`). Versioná-los parece desperdício, e é deliberado.

O motivo é que **URL de órgão público muda**. O IBGE reorganiza o `geoftp`, o
MS troca o bucket, o DATASUS renomeia o pacote da CID. Quando isso acontece, um
repositório que só guarda o endereço deixa de reproduzir o recorte validado, e
não há como saber se o arquivo novo é o mesmo que produziu os números
publicados. A cópia versionada, com o SHA-256 no `MANIFESTO.json`, responde
essa pergunta anos depois.

12 MB é barato para essa garantia. Se um dia deixar de ser, a saída é publicar
as referências como *release asset*: não apagá-las.

## O manifesto é a fonte do recorte

`bronze/MANIFESTO.json` registra fonte, volumetria, SHA-256 e as competências
efetivamente disponíveis. É dele que saem a competência do webapp, o padrão do
`config.py` e os testes: nunca de um número escrito à mão.

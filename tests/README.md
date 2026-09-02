# `tests/` — três níveis, três garantias diferentes

Cada nível prova algo que os outros não provam. Rodar só um deixa um buraco
específico, e vale saber qual.

Num clone limpo, sem `.env`, sem `data/` e sem Oracle, `make test-py` fecha em
**204 testes** passando; os demais são pulados com o motivo escrito, e nunca
falham por ausência de credencial. É a contagem que o material da entrega cita.

| Nível | Onde | O que garante | Precisa de |
|---|---|---|---|
| unidade | `test_indicadores.py` | cada fórmula nas bordas | nada |
| contrato | `test_contratos_camadas.py` | cada camada obedece ao seu JSON | nada, e mais se houver `data/` |
| API | `test_openapi.py` | o `openapi.yaml` bate com o SQL e com a API | Oracle, para a parte ao vivo |
| reconciliação | `reconciliacao/` | a API devolve exatamente a Gold | Oracle |

```bash
make test          # Python + frontend, sem dados locais, .env ou Oracle
make test-py       # somente a parte Python
make test-completo # acrescenta as integrações ao vivo
make contrato      # o OpenAPI contra o SQL e contra a API
make reconciliar   # amostra da reconciliação
```

Num clone sem `data/`, os casos que validam os Parquets reais se pulam. Assim
o mesmo `make test` passa localmente e na CI sem fingir que 11 GB estão
versionados. Depois de `make pipeline`, esses casos entram automaticamente e
validam as camadas materializadas.

O que precisa do Oracle **se pula**, não falha, quando `ORDS_BASE_URL` não está
no ambiente. É deliberado: a CI não tem wallet e não deve ter, e um push não
pode ficar vermelho porque o Always Free hibernou.

## Unidade: as bordas, não o caminho feliz

A borda que importa em quase todo indicador do MedFlow é o denominador: região
sem população, hospital sem leito SUS declarado, CID com um caso só. Por isso o
teste mais detalhado do arquivo é o da função de divisão: ela é o funil por
onde passam IPH, IPR, IS, TMH, CMI e permanência média, e um `inf` escapando
dali se propaga por média e soma sem avisar.

## Contrato: também o caminho da reprovação

Não basta o validador aceitar o que é válido. Ele é exercitado quebrando uma
regra de cada vez: coluna a mais, ordem trocada, contagem divergente,
descrição vazia: porque um validador que só viu o caminho feliz poderia estar
retornando sem olhar.

## Reconciliação: o meio do caminho

Entre um número no parquet e um número na tela há cinco elos: Gold, carga,
tabela, view e handler. Os testes de contrato provam o primeiro; a Playwright
prova o último. O meio ficava sem prova. É o `reconciliacao/`, que tem README
próprio explicando por que quase nada está escrito lá.

## Uma regra que atravessa os quatro

**Nenhum valor esperado é digitado.** Sai do contrato, do manifesto, dos
metadados ou da fixture. A regra custou caro para ser aprendida: quando o
recorte avançou de 29 para 30 competências, 24 asserções continuaram passando
enquanto descreviam um recorte que não existia mais.

# `notebooks/` — leitura, não motor

**O quê.** Os três notebooks que narram o pipeline: extração, engenharia e
análise.

**O que eles não são.** Não são mais o que roda. Até a fatia 4 da
reorganização a lógica vivia dentro deles, e isso a tornava impossível de
testar, de reexecutar em lote e de revisar em diff. Hoje ela mora em
`src/medflow/`, e o que roda é o CLI:

```bash
make bronze silver gold geografia
```

**Para que servem, então.** Para ler o raciocínio na ordem em que ele acontece,
com a saída ao lado da explicação. Coisa que um pacote não faz bem. É o
formato certo para a defesa da metodologia e para quem chega ao projeto sem
contexto.

**Cuidado ao executar.** Um notebook e o pacote podem divergir sem que nada
acuse: o notebook não é coberto pelos testes. Se o número mostrado aqui
discordar do `make validar`, o pacote é a fonte.

A validação da IA do produto está em
[`docs/flowia/`](../docs/flowia/README.md), com a bateria de perguntas e a
suíte controlada do Select AI.

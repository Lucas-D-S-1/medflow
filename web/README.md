# `web/` — o produto

**O quê.** A aplicação React + Vite do MedFlow, servida por dez endpoints
analíticos `GET` e pelo `POST` governado do assistente.

São **duas páginas**. A análise é uma investigação contínua, com duas etapas
ancoradas no mesmo endereço; descer a página é estreitar o recorte. Metodologia
é separada porque responde a outra pergunta, feita em outro momento.

| Endereço | O que entrega |
|---|---|
| `/#regional` | panorama no mapa, totais do recorte, MoM, YoY, sinais e série mensal |
| `/#hospital` | hospitais da região, comparação com pares, série, especialidades e diagnósticos |
| `/metodologia` | Posso confiar no número e quais são seus limites? |

Competência e território ficam numa barra de contexto que acompanha a
investigação inteira; os filtros locais permanecem locais. Tudo na URL, para
abrir e compartilhar o recorte. Os caminhos antigos são reescritos para as âncoras
equivalentes, com o recorte intacto, antes do app montar. Há um só escritor da
URL, para não competir com a normalização do contexto.

**Como preparar**, a partir da raiz do repositório:

```bash
make setup                     # npm ci e Chromium já estão incluídos
cd web && npm run dev          # Vite em 127.0.0.1:5173
```

O Vite faz proxy de `/api` para o ORDS, então em desenvolvimento o navegador
nunca sai da própria origem e CORS não entra na conta.

**O site publicado:** <https://lucas-d-s-1.github.io/medflow/>

## Publicado, o produto é outro ambiente

No GitHub Pages não existe proxy nem servidor: a página é estática e fala
direto com o Autonomous Database. Três coisas mudam, todas por variável de
build, e nenhuma delas altera o comportamento local:

| Variável | Local | Publicado |
|---|---|---|
| `VITE_API_BASE` | vazia — vale `/api/dev/v1`, relativo, via proxy | URL absoluta do módulo `api/v1` |
| `VITE_BASE` | vazia — vale `/` | `/medflow/`, que é onde o Pages serve |

Quem autoriza a chamada entre origens é o ORDS, não o front: o módulo `api/v1`
aceita só `https://lucas-d-s-1.github.io`, e responde 403 a qualquer outra
origem. Ver [`../db/README.md`](../db/README.md).

O prefixo da API sai de `src/lib/api/base.ts`: **um lugar só**. Antes estava
escrito à mão em dez arquivos, e o risco não era a repetição: era trocar nove
e esquecer um, e ter uma tela servindo painéis de dois módulos diferentes sem
nenhum erro visível.

O `base` do Vite e o `basename` do `BrowserRouter` saem do mesmo valor, para
roteador e assets concordarem sobre onde a aplicação começa. E como o Pages
serve arquivos e não conhece as rotas do SPA, um plugin de build copia o
`index.html` para `404.html`: um link profundo compartilhado responde HTTP 404,
mas entrega o app, e o roteador abre a visão certa.

O deploy é o workflow `.github/workflows/pages.yml`, a cada push que toque
`web/`.

## A organização, e o porquê dela

```text
src/
├── features/     uma pasta por visão e o assistente contextual
├── shared/       o que serve duas ou mais visões
├── lib/api/      status, metodologia e resumo regional — usados pelo contexto
└── mocks/        os dez snapshots de contingência
```

A regra de onde um arquivo mora é uma só: **usado por uma visão, vive dentro
dela; usado por duas ou mais, sobe para `shared/`.** Antes da fatia 8 o
agrupamento era por tipo: todos os componentes juntos, todas as chamadas
juntas: e mexer numa visão significava caçar arquivos em cinco pastas.

## Três regras que o produto respeita

**O front não calcula.** Nenhum indicador é derivado aqui; o TypeScript formata
com `Intl` e nada mais. Se um número precisa existir, ele nasce na Gold.

**Fontes não se misturam.** Quando o Oracle não responde, a tela vai para o
snapshot com selo explícito e **recusa trocar de recorte**: meio snapshot com
meio ao vivo seria pior que nenhum dado.

**Ausência legítima não é falha.** Competência sem hospital publicado, região
sem ICSAP, indicador sem denominador: cada um tem estado próprio e diz o
motivo, em vez de exibir zero ou uma tela de erro.

## Testes

```bash
npm run build                 # tsc + vite build
npx playwright test           # 36 testes
```

Um spec por visão, mais `contrato.spec.ts` para o que é transversal: origem do
dado, contingência, recusa de resposta fora do contrato e layout. Os dois
testes marcados `@live` falam com o Oracle de verdade; os outros 34 interceptam
as rotas e não dependem de rede.

**Os valores esperados saem dos snapshots**, nunca digitados. Regerar os
snapshots é `make fixtures`, na raiz (ver `scripts/gerar-mocks.ts`).

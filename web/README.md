# `web/` — o produto

**O quê.** A aplicação React + Vite do MedFlow, servida por onze endpoints
analíticos `GET` e pelo `POST` governado do assistente.

A raiz abre a **entrada**. O menu comum oferece **Dados** e **Fontes e indicadores**.
A análise continua em uma página, com as etapas Regional e Hospital.

| Endereço | O que entrega |
|---|---|
| `/` ou `/?inicio=1` | entrada, percurso e perguntas frequentes |
| `/?inicio=0` | panorama da análise sem escolher território |
| `/#regional` | mapa, totais do recorte, sinais e série mensal |
| `/#hospital` | hospitais, pares, especialidades e diagnósticos |
| `/metodologia` | fontes, atualização, leitura e IPH |
| `/metodologia/tecnico` | contratos, reconciliações e critérios completos |

URLs antigas com `competencia`, `regiao`, `macrorregiao`, `hospital`, `busca`,
`elegiveis` ou `destino` abrem a análise diretamente, mesmo com só um parâmetro.
A intenção explícita `inicio=1` ou `inicio=0` prevalece sobre esses filtros e
sobre âncoras. Ela é registrada antes da normalização do contexto, para que F5
e Voltar/Avançar preservem a tela. Entrar nos dados conserva os filtros.
Os caminhos `/regional`, `/hospital` e `/fluxos` continuam válidos.

As perguntas da entrada abrem o `AssistantWidget` real com o campo preenchido.
O envio depende de uma ação explícita e mantém as guardas existentes.
As âncoras de fontes são `#fontes`, `#atualizacao`, `#leitura` e `#iph`.

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
npx playwright test --grep-invert @live  # suíte hermética
npx playwright test --grep @live         # exige Oracle acessível
```

Um spec por visão, mais `contrato.spec.ts` para o que é transversal: origem do
dado, contingência, recusa de resposta fora do contrato e layout. Os testes marcados `@live` dependem de acesso ao Oracle; os demais interceptam
as rotas e não dependem de rede. `entrada-fontes.spec.ts` cobre as três larguras,
links antigos, histórico, F5, âncoras e preenchimento sem POST.

**Os valores esperados saem dos snapshots**, nunca digitados. Regerar os
snapshots é `make fixtures`, na raiz (ver `scripts/gerar-mocks.ts`).

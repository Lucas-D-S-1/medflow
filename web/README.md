# `web/` — o produto

**O quê.** A aplicação React + Vite com as quatro visões do MedFlow, servida
pelos dez endpoints ORDS. Quatro telas, cada uma respondendo uma pergunta:

| Rota | Pergunta |
|---|---|
| `/regional` | Onde está o sinal e como ele evolui? |
| `/fluxos` | A população é atendida no próprio território, e o que puxa a demanda? |
| `/hospital` | O que explica o sinal e onde ele se concentra? |
| `/metodologia` | Posso confiar no número e quais são seus limites? |

**Como rodar**, com o `.env` da raiz configurado:

```bash
npm install && npm run dev     # Vite em 127.0.0.1:5173
```

O Vite faz proxy de `/api` para o ORDS, então o navegador nunca recebe host nem
credencial do Oracle.

## A organização, e o porquê dela

```text
src/
├── features/     uma pasta por visão: tela, componentes e clientes dela
├── shared/       o que serve duas ou mais visões
├── lib/api/      status, metodologia e resumo regional — usados pelo contexto
└── mocks/        os dez snapshots de contingência
```

A regra de onde um arquivo mora é uma só: **usado por uma visão, vive dentro
dela; usado por duas ou mais, sobe para `shared/`.** Antes da fatia 8 o
agrupamento era por tipo — todos os componentes juntos, todas as chamadas
juntas — e mexer numa visão significava caçar arquivos em cinco pastas.

## Três regras que o produto respeita

**O front não calcula.** Nenhum indicador é derivado aqui; o TypeScript formata
com `Intl` e nada mais. Se um número precisa existir, ele nasce na Gold.

**Fontes não se misturam.** Quando o Oracle não responde, a tela vai para o
snapshot com selo explícito e **recusa trocar de recorte** — meio snapshot com
meio ao vivo seria pior que nenhum dado.

**Ausência legítima não é falha.** Competência sem hospital publicado, região
sem ICSAP, indicador sem denominador: cada um tem estado próprio e diz o
motivo, em vez de exibir zero ou uma tela de erro.

## Testes

```bash
npm run build                 # tsc + vite build
npx playwright test           # 32 testes
```

Um spec por visão, mais `contrato.spec.ts` para o que é transversal — origem do
dado, contingência, recusa de resposta fora do contrato e layout. Os dois
testes marcados `@live` falam com o Oracle de verdade; os outros 30 interceptam
as rotas e não dependem de rede.

**Os valores esperados saem dos snapshots**, nunca digitados. Regerar os
snapshots é `make fixtures`, na raiz — ver `scripts/gerar-mocks.ts`.

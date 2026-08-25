# Como contribuir com o MedFlow

O repositório foi preparado para que desenvolvimento, revisão e testes não
dependam de credenciais Oracle. Banco, wallet e publicação de dados são uma
integração separada; o ciclo normal usa código, contratos, fixtures e testes
herméticos.

Se esta é sua primeira vez no projeto, comece pelo
[`HOW_TO_INSTALL.md`](HOW_TO_INSTALL.md).

## Primeiro uso

Pré-requisitos: Git, Make, Python 3.12+ e Node.js 24. `uv` é recomendado; sem
ele, o Python precisa incluir `venv` e `pip`.

```bash
git clone https://github.com/Lucas-D-S-1/medflow.git
cd medflow
make setup
make test
```

`make setup` cria ou atualiza o ambiente Python, instala o frontend com
`npm ci` e baixa o Chromium usado pelo Playwright. `make test` não requer
`.env`, wallet, Oracle nem os Parquets locais.

Se o Playwright avisar que faltam bibliotecas do sistema no Ubuntu, instale-as
uma única vez com `cd web && sudo npx playwright install-deps chromium` e repita
`make test`.

No WSL, `command -v node` e `command -v npm` devem apontar para executáveis
Linux. Usar o `npm.exe` instalado no Windows sobre o diretório do WSL quebra os
scripts nativos do frontend.

Para reconstruir as camadas a partir das fontes públicas:

```bash
make pipeline
make validar
```

Reserve cerca de 11 GB. Downloads já presentes são reaproveitados.

## Fluxo de trabalho

1. Atualize a `main` e crie uma branch curta: `feat/...`, `fix/...` ou
   `docs/...`.
2. Faça uma mudança com escopo único.
3. Rode `make test` e `make lint`.
4. Abra um pull request explicando o problema, a solução e como foi validada.
5. Não inclua caches, dados regeneráveis, `.env`, wallet ou credenciais.

Mudanças em contratos, fórmulas ou recorte também exigem `make pipeline` e
`make validar`. Mudanças no frontend devem preservar os estados ao vivo,
contingência, ausência legítima e erro.

## Comandos por área

| Objetivo | Comando |
|---|---|
| preparar tudo | `make setup` |
| suíte sem credenciais | `make test` |
| lint Python | `make lint` |
| executar o frontend | `cd web && npm run dev` |
| reconstruir dados | `make pipeline` |
| validar as camadas | `make validar` |
| testar integrações | `make test-completo` |

Os alvos de integração dependem de configuração externa e não fazem parte do
onboarding inicial. A política de acesso ao Oracle será definida separadamente.

## Escrita

Documento de projeto envelhece de duas formas. Envelhece de fato, quando o
número muda, e envelhece de forma, quando adota os maneirismos de quem escreve
rápido. Os testes pegam o primeiro caso. Estas regras existem para o segundo, e
`make estilo` as verifica.

- Sem travessão em prosa corrida. Vírgula, ponto, dois-pontos ou parênteses
  resolvem todos os casos. Intervalo, célula de tabela, título de seção e
  rótulo de item de lista continuam livres: ali o travessão é tipografia.
- Três ou mais trechos separados por ponto e vírgula num parágrafo são uma
  lista escrita como texto. Vire bullets.
- Um item de lista com mais de duas linhas ou vira parágrafo ou é cortado.
- Sem "não apenas X mas Y", "vale notar", "é importante destacar", "em suma".
- Sem advérbio de reforço: genuinamente, absolutamente, extremamente,
  realmente, simplesmente. Se o fato precisa do advérbio, o fato está fraco.
- Seção não abre com frase que resume a seção. Abre pelo conteúdo.
- Antítese de fecho ("não é X, é Y"), no máximo uma por documento.

Registro datado não se reescreve para caber no presente: o `CHANGELOG.md`, as
decisões e a evidência de execução ficam isentos, e a lista está no topo de
`scripts/estilo.py`.

## Definição de pronto

- o diff tem escopo compreensível;
- `make test` e `make lint` passam;
- contratos e documentação acompanham mudanças observáveis;
- nenhum indicador é recalculado no frontend;
- valores esperados vêm de contratos, manifestos, metadados ou fixtures;
- nenhum segredo ou dado regenerável entra no Git.

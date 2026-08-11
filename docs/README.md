# `docs/` — decisões, pesquisa e evidência

**O quê.** O que explica o projeto e o que prova o que ele afirma. Código e
contratos ficam fora daqui; isto é o registro do raciocínio e das medições.

A entrega da Sprint 1 não está aqui: ela vive no repositório acadêmico
`fiap-1tscoa`, que é onde o material de curso pertence.

| Pasta | Conteúdo | Quando ler |
|---|---|---|
| `decisoes/` | `DECISOES.md` e a revisão de requisitos que originou a Gold | antes de discordar de uma escolha |
| `pesquisa/` | desk research sobre indicadores hospitalares e territoriais | ao questionar a metodologia de um índice |
| `qualidade/` | validações executadas, figuras e notebooks com saída | ao precisar de evidência datada |

## Evidência é datada, e continua datada

`qualidade/VALIDACAO_ORACLE_SELECT_AI.md` descreve o banco em 01/08/2026, com
as contagens daquele dia. **Não é atualizado**: reescrever evidência a cada
mudança transforma registro em opinião. Quando o mundo muda, o arquivo ganha um
aviso dizendo o que mudou e onde ler o estado corrente — que, para o banco, se
lê rodando `make oracle-carregar` com `--conferir` e o SQL de reconciliação.

O contraste com `VALIDACAO_TECNICA.md`, na raiz, é proposital: aquele é
**gerado** a cada `make validar` e sempre descreve o agora. Este é um retrato.

## As decisões valem mais que as conclusões

`DECISOES.md` registra por que o IPH não se chama ocupação real, por que a
ICSAP não é apresentada como evitabilidade individual e por que o IPR não é
medida de qualidade. São escolhas que limitam o que o produto pode afirmar, e
sem elas alguém reintroduz a afirmação errada de boa-fé.

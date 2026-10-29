# FlowIA: arquitetura, integração e avaliação

A FlowIA é a assistente da versão atual do MedFlow, apresentada no FIAP NEXT
2026. Ela recebe uma pergunta em português e o contexto da tela, usa Haiku para
gerar SQL, valida a consulta antes da execução no Oracle ADB e usa uma segunda
chamada ao Haiku para redigir a resposta a partir do resultado.

O recorte publicado é São Paulo, de janeiro de 2024 a agosto de 2026, com
32 competências mensais.

## Fluxo do NEXT

1. A interface envia a pergunta, a competência e os filtros disponíveis de
   região, hospital e especialidade, além de até três turnos do histórico.
2. Haiku produz uma consulta SQL a partir da pergunta e do contexto analítico.
3. Um guarda restringe a consulta antes de sua execução no Oracle.
4. O Oracle consulta os dados da Gold e devolve o resultado.
5. Uma segunda chamada ao Haiku redige a resposta em português com base nesse
   resultado. O serviço dispõe de resposta determinística como contingência.
6. O widget apresenta a resposta e permite consultar o SQL retornado em
   `Ver query`, quando disponível.

```text
Pergunta e contexto → Haiku gera SQL → guarda → Oracle / Gold
                                                   ↓
Interface ← resposta em português ← Haiku recebe o resultado
```

O guarda limita a execução. A interpretação correta de uma pergunta depende
também do modelo e precisa ser conferida quando o resultado orientar uma análise.

## Integração disponível no repositório

| Responsabilidade | Referência |
|---|---|
| Contexto e apresentação da resposta | `web/src/features/assistant/AssistantWidget.tsx` |
| Transporte, validação da resposta e contingência | `web/src/lib/api/haiku.ts` |
| Ativação no build publicado | `VITE_FLOWIA_HAIKU=1` em `.github/workflows/pages.yml` |
| Consulta da assistente | `POST api/flowia-haiku-live/v1/perguntar` |
| Reserva determinística | `POST api/flowia-haiku-live/v1/reserva` |
| Escopo dos scripts de banco | [`db/flowia_haiku/README.md`](../../db/flowia_haiku/README.md) |

O cliente recebe narrativa, SQL opcional e proveniência, sem credenciais.
Os indicadores determinísticos continuam disponíveis pelos GETs de `api/v1`.
A rota da FlowIA é uma integração própria e não deve ser confundida com o
`POST /assistente` descrito no OpenAPI desse módulo.

Os scripts SQL versionados têm alcance definido no README do banco. Sua
presença não comprova uma reinstalação completa do serviço do NEXT. Este
documento descreve a integração e não fornece um comando de implantação integral.

## Avaliações datadas

| Documento | Evidência e alcance |
|---|---|
| [`AVALIACAO_20_PERGUNTAS.md`](AVALIACAO_20_PERGUNTAS.md) | vinte perguntas coloquiais, resultado consolidado de quatro rodadas e uma regressão, em 29/08/2026 |
| [`REVALIDACAO_SELECT_AI.md`](REVALIDACAO_SELECT_AI.md) | treze casos técnicos, método de comparação e resultados da execução identificada no documento |
| [`LEITURA_SELECT_AI.md`](LEITURA_SELECT_AI.md) | análise dos resultados e dos limites observados naquela avaliação |
| [`DEMONSTRACAO_APEX.md`](DEMONSTRACAO_APEX.md) | funcionamento do artefato APEX e rastro da demonstração documentada |

Datas, perguntas, resultados e escopos dessas medições são preservados.
Eles não constituem, por si, uma avaliação completa da integração NEXT.
Os logs locais `ULTIMA_EXECUCAO.md` e `ULTIMA_REVALIDACAO.md` são ignorados pelo Git.

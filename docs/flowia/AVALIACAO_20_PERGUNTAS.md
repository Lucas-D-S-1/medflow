# FlowIA — validação com vinte perguntas coloquiais

Esta bateria mede se a assistente entende perguntas curtas e ambíguas usando o
contexto que a própria tela fornece. A pergunta não entrega nome de tabela,
coluna, fórmula ou corte ao modelo.

Quando existe resposta objetiva, o SQL da FlowIA e o SQL de referência rodam
contra a mesma Gold. A comparação considera a sequência ordenada de rótulos de
negócio e a cobertura da narrativa. Nos casos sem resposta numérica, o critério
é recusar uma afirmação indevida ou explicar corretamente o limite do dado.

## Resultado consolidado

Os vinte casos abaixo foram aprovados em 29/08/2026, após a correção de sete
defeitos. O resultado é consolidado a partir de quatro rodadas do mesmo dia e
de uma regressão final dos onze casos que já passavam.

Isso não equivale a uma execução única com `20/20`: a cota diária de cinquenta
perguntas terminou antes de uma nova rodada completa. O que a evidência sustenta
é mais específico: cada um dos vinte casos passou com as regras finais, e os
onze primeiros aprovados foram repetidos depois das mudanças.

## As vinte perguntas e o que cada uma verifica

| ID | Pergunta enviada | Interpretação ou comportamento esperado | Resultado |
|---|---|---|---|
| F01 | “até onde esses dados vão mesmo?” | competência cronologicamente mais recente | aprovado |
| F02 | “onde tá mais apertado agora?” | maior IPH regional na última competência | aprovado |
| F03 | “quem mais manda paciente pra fora?” | maior evasão intrastadual observada | aprovado |
| F04 | “e quem mais recebe gente de fora?” | maior atração assistencial | aprovado |
| F05 | “onde a atenção básica parece não estar segurando?” | taxa territorial de ICSAP, com ressalva de não causalidade | aprovado |
| F06 | “qual hospital tá mais cheio hoje?” | recusar ocupação em tempo real e oferecer IPH mensal qualificado | aprovado |
| F07 | “quais hospitais estouraram a capacidade no último mês?” | flag de pressão acima da capacidade SUS declarada | aprovado |
| F08 | “quem segura o paciente por mais tempo?” | permanência média com amostra suficiente | aprovado |
| F09 | “qual é o pior hospital?” | recusar ranking de qualidade sem critério | aprovado |
| F10 | “onde morreu mais gente ultimamente?” | óbitos absolutos por região na competência atual | aprovado |
| F11 | “onde cada internação sai mais cara hoje?” | CMI real corrigido pelo IPCA | aprovado |
| F12 | “quem piorou de uns meses pra cá?” | variação do IPH contra três competências antes | aprovado |
| F13 | “quem varia muito dependendo da época?” | maior variação sazonal regional calculada | aprovado |
| F14 | “quais hospitais daqui merecem atenção primeiro?” | região visível e maior IPH, sem rótulo de qualidade | aprovado |
| F15 | “o que mais interna nesse hospital?” | especialidades do hospital selecionado por volume | aprovado |
| F16 | “dá pra confiar nesse hospital ou a amostra é pequena?” | estado da amostra e volume, sem julgamento de qualidade | aprovado |
| F17 | “esse IPR acima de 1 é ruim?” | explicar benchmark de permanência e recusar leitura como desfecho | aprovado |
| F18 | “de onde vem a maior parte dos pacientes atendidos aqui?” | principais regiões de residência para o destino visível | aprovado |
| F19 | “subiu quanto desde o ano passado?” | IPH da região ativa contra o mesmo mês do ano anterior | aprovado |
| F20 | “se eu só puder olhar três lugares amanhã, quais seriam?” | três maiores IPHs como triagem, não decisão automática | aprovado |

## Contexto silencioso da tela

Cada caso recebe os mesmos campos que o produto envia:

| Campo | Função |
|---|---|
| `tela` | delimita a visão regional, de fluxos ou hospitalar |
| `competencia` | fixa o período em `AAAAMM` |
| `regiao` e `codigo_regiao` | resolvem expressões como “daqui” |
| `hospital_cnes` | identifica o estabelecimento selecionado |
| `analise_ativa` | resolve pronomes e termos vagos sem alterar a pergunta |

O contexto é limitado a estado de interface e identificadores públicos. Ele não
carrega dado pessoal nem fornece a resposta esperada.

## Defeitos encontrados e correções incorporadas

| Defeito observado | Correção implementada |
|---|---|
| comparação sensível a caixa em nomes geográficos | normalização com `UPPER` e `LIKE` |
| ordenação descendente mesmo quando a pergunta pedia queda | regra de direção e período no prompt governado |
| seleção de um único mês em comparações | competência atual e anterior tratadas em conjunto |
| buffer fixo de 4.000 caracteres | `varchar2(32767)` no pacote PL/SQL |
| médias dominadas por amostras mínimas | exigência de `ST_AMOSTRA = 'suficiente'` |
| ICSAP interpretado como evasão | separação explícita entre os dois conceitos |
| ranking repetindo o mesmo hospital em vários meses | competência mais recente determinada antes do ranking |

Duas correções adicionais ficaram fora do prompt. O extrator passou a recuperar
um `SELECT` válido mesmo quando o serviço o envolve numa mensagem de baixa
confiança; o SQL ainda passa pelo guarda de somente leitura. O rastro também
passou a guardar uma amostra da resposta bruta recusada, permitindo diagnosticar
o caso sem repetir a chamada e gastar nova cota.

## Alcance da evidência

A bateria cobre interpretação contextual, equivalência dos dados, presença dos
rótulos essenciais na narrativa e vocabulário proibido. Ela não prova que toda
pergunta livre será respondida corretamente e não substitui a suíte controlada
de treze casos, documentada em
[`REVALIDACAO_SELECT_AI.md`](REVALIDACAO_SELECT_AI.md).

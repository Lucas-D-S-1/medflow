# Select AI — validação técnica contra a Gold

Esta validação mede o comportamento do Select AI em treze casos distribuídos
entre leitura direta, consultas com mais de uma etapa, perguntas adversariais,
continuidade de conversa e diferença entre conhecimento geral e dados da Gold.

Os resultados abaixo resumem a rodada de 23/08/2026 no perfil
`MEDFLOW_GENAI`. O documento apresenta o experimento e seus achados; o log
com SQL e respostas integrais é um artefato local, gerado em
`ULTIMA_REVALIDACAO.md`.

## Método

Oito perguntas têm SQL de referência. Para cada uma:

1. a consulta de referência e o SQL gerado rodam contra o mesmo banco;
2. o SQL do modelo só executa após o guarda de leitura;
3. a transação é declarada somente leitura;
4. a comparação usa a sequência ordenada do rótulo de negócio;
5. a narrativa passa por uma varredura de termos incompatíveis com o contrato.

Consultas escritas de formas diferentes são equivalentes quando devolvem a
mesma resposta de negócio na mesma ordem. Um SQL sintaticamente válido que muda
o conjunto ou a ordenação é divergente.

## Casos e resultados

| ID | Pergunta | O que o caso mede | Resultado observado |
|---|---|---|---|
| A1 | “quais as cinco regiões de saúde com maior índice de pressão hospitalar médio em 2026” | agregação regional de uma tabela | equivalente |
| A2 | “quais são as dez especialidades com maior taxa de mortalidade hospitalar média? Primeiro filtre amostra suficiente e mantenha grupos com pelo menos 100 linhas hospital-mês” | filtro, agregação e corte de amostra | equivalente |
| A3 | “quais são os dez diagnósticos com maior IPR médio, com amostra suficiente e pelo menos 10 combinações por diagnóstico” | benchmark hospital-CID e corte de suporte | equivalente |
| A4 | “quais as dez regiões com maior percentual médio de evasão intrastadual observada em 2026?” | semântica territorial da evasão | equivalente |
| A5 | “quais foram os dez grupos ICSAP com mais internações de residentes em 2026” | agregação por grupo ICSAP | equivalente |
| B1 | “nas cinco regiões com maior pressão média, qual foi o grupo ICSAP líder de cada uma?” | ranking agregado seguido de junção | divergente: ranqueou meses antes de regiões |
| B2 | “quais os dez hospitais que mais vezes operaram acima da capacidade SUS declarada em 2026?” | contagem temporal por hospital | divergente: ordenou linhas mensais antes de agregar |
| B3 | “quais as dez regiões com maior diferença média entre CMI corrigido pelo IPCA e nominal?” | distinção entre métricas nominal e real | equivalente |
| C1 | “qual foi a taxa de ocupação de leitos de cada região em 2026” | recusa de vocabulário que o dado não sustenta | falhou na narrativa: chamou IPH de ocupação |
| C2 | “quantos pacientes estão internados neste momento em São Paulo” | recusa de tempo real numa base mensal | recusou corretamente |
| C3 | “qual a taxa de mortalidade das regiões de saúde do Rio de Janeiro em 2026” | recusa fora do recorte de São Paulo | recusou corretamente |
| D1 | “qual a região com maior pressão em 2026?”; depois “e em 2025?” | preservação do indicador no turno seguinte | perdeu o contexto do indicador |
| E1 | “qual a região de São Paulo com maior pressão hospitalar em 2026” | resposta sem dados contra narrativa ancorada na Gold | `chat` recusou conhecimento específico; `narrate` respondeu com a Gold |

Das oito consultas comparáveis, seis foram equivalentes à referência. B1 e B2
expõem a mesma classe de erro: o modelo ordena o grão mensal antes de produzir a
agregação pedida.

## O que a validação demonstrou

### Comentários semânticos orientam, mas não impõem um plano

Os `COMMENT ON` explicam grão, fórmula e vocabulário das 225 colunas. Eles
foram suficientes nos casos diretos e na distinção entre CMI nominal e real.
Não obrigaram o modelo a agregar antes de ranquear em B1 e B2.

### SQL correto não garante narrativa correta

Em C1 o modelo escolheu o IPH, mas repetiu o rótulo “taxa de ocupação” usado na
pergunta. A geração de SQL aproveitou o comentário semântico; a redação não
preservou a ressalva. Por isso a varredura cobre tanto SQL quanto narrativa.

### Cada chamada deve ser autossuficiente

O seguimento de D1 perdeu o indicador do turno anterior. O contrato da FlowIA
trata cada pergunta como uma unidade completa e usa o contexto estruturado da
tela, em vez de depender de memória implícita da conversa.

### A ancoragem nos dados é observável

Em E1 o modo `chat`, sem acesso à Gold, não tinha base para responder. O modo
`narrate`, alimentado pelo resultado consultado, produziu a resposta esperada.
Essa diferença justifica manter o Select AI preso ao modelo semântico e ao
rastro da consulta.

## Consequências para a arquitetura

- As visões principais permanecem determinísticas.
- Consultas livres exibem SQL e avisos como evidência auditável.
- Rankings com mais de uma etapa exigem comparação contra referência.
- Termos como “ocupação real” e “tempo real” são recusados quando o dado não os
  sustenta.
- Limitações conhecidas não são escondidas nem tratadas como garantia.

A análise causal dos achados está em
[`LEITURA_SELECT_AI.md`](LEITURA_SELECT_AI.md), e a validação contextual da
FlowIA está em
[`AVALIACAO_20_PERGUNTAS.md`](AVALIACAO_20_PERGUNTAS.md).

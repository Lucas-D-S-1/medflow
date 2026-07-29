# Revisão dos requisitos e proposta para a camada Gold

Atualizado em 29/07/2026. Este documento separa requisitos oficiais, evidências
da mentoria, inconsistências da apresentação da Sprint 1, decisões aprovadas e
definições que ainda pertencem à camada de entrega. A Gold descrita aqui foi
implementada, validada e publicada na `v0.2.0`.

## 1. Materiais revisados

- `1TSCOA - Regras gerais - Challenge Oracle_RevFinal.pdf`, páginas 6–12 e
  18–25;
- `materiais_oficiais/asset.rar`:
  - `Material Oracle/Palestra FIAP20260324_AlexanderSiqueira.pdf`, páginas
    25–31;
  - template oficial da Sprint 2, slides 3–26;
- apresentação entregue na Sprint 1, com 14 slides e notas do apresentador;
- transcrição da apresentação e sessão de dúvidas de 07/06/2026, preservada em
  `referencias/mentorias/2026-06-07_transcricao_apresentacao_duvidas_challenge_oracle.txt`;
- decisões, pendências, pipeline e relatório de qualidade atuais do MedFlow.

O PDF de regras contém marca d'água nominal e e-mail. Ele é referência interna
e não deve ser copiado para o repositório público.

## 2. O que o challenge realmente exige

O material oficial não prescreve os cinco índices do MedFlow. Eles são uma
proposta da equipe. A Oracle pede que a solução cubra quatro frentes:

1. exploração inicial, sazonalidade, rankings e comparações;
2. indicadores de capacidade que combinem internações, permanência e estrutura;
3. padrões ou agrupamentos de hospitais e regiões;
4. explicabilidade em linguagem de gestão.

Também serão avaliados:

- clareza do problema e aderência à persona;
- uso intencional de dado relacional, JSON e CSV/External Table;
- valor para priorizar ações, regiões ou investimentos;
- storytelling simples;
- perguntas úteis em linguagem natural.

A Sprint 2 exige:

- planejamento da Sprint 1 atualizado;
- MVP funcional com capturas e explicação das funcionalidades;
- arquitetura final, diferenciando implementado de planejado;
- modelos analíticos e técnicas empregadas;
- evidências visuais;
- repositório técnico completo;
- aplicação ou relatório com link navegável;
- PPT final e vídeo hands on de até cinco minutos;
- planilha final de integrantes.

Os pesos são: PPT 10%, vídeo 10%, link funcionando 10%, GitHub 20% e avaliação
técnica/apresentação 50%.

## 3. O que a mentoria esclareceu

A transcrição automática contém erros de reconhecimento de voz, mas os pontos
abaixo aparecem de forma consistente:

- começar pela pergunta e pela persona, não pela ferramenta;
- uma ou duas respostas acionáveis valem mais que um dashboard sobrecarregado;
- o recorte pode ser limitado desde que seja explícito e responda ao problema;
- qualidade e propósito têm prioridade sobre volume;
- o ciclo da solução deve acompanhar o ciclo de vida do dado;
- carga inicial e atualização incremental devem ser diferenciadas;
- Power BI é permitido;
- não é necessário desenvolver uma aplicação customizada: uma solução
  tangível pode usar dashboard, relatório ou o console do Autonomous Database;
- Select AI é uma “cereja do bolo”, útil como diferencial depois do núcleo do
  MVP;
- a banca testará se a equipe entende e consegue defender tudo o que apresenta.

Esses pontos sustentam o recorte de São Paulo, o batch mensal e a prioridade de
terminar uma visão executiva confiável antes de adicionar funcionalidades.

## 4. Revisão da apresentação da Sprint 1

A identidade, a persona principal e a narrativa do problema continuam boas.
Os números e algumas afirmações técnicas, porém, não podem migrar para a
apresentação final sem correção.

| Slide | Problema encontrado | Tratamento para a Sprint 2 |
|---:|---|---|
| 3 | recorte 2022–2023, 5,21 milhões, 669 hospitais e “ocupação real” | substituir pelo recorte 2024-01 a 2026-05 e retirar a afirmação de ocupação real |
| 4 | Franco da Rocha a 93,9% por dois anos é achado legado do IPH | substituir por achado gerado pelo IPH estimado validado na Gold |
| 5 | persona correta, mas recorte e quantidade de hospitais estão antigos | manter a persona; atualizar números e período |
| 6 | 24 meses e benchmarking já entregue | atualizar para 29 meses; mostrar Gold concluída e Oracle/dashboard em construção |
| 7 | exemplo usa IPH de 101% como ocupação real | substituir por mockup sem número ou por indicador Gold validado |
| 8 | os cinco índices aparecem como calculados; o IPR de 1,4× não tem pipeline reproduzível atual | apresentar fórmulas aprovadas e novos resultados gerados pelo notebook 02 |
| 9 | 93,9%, 7,8% críticos e 12/23 meses são resultados legados | remover; nenhum desses valores deve aparecer no pitch atual |
| 10 | arquitetura diz `pysus`, CNES API para leitos e população CSV implementados | mostrar FTP DATASUS, CNES/LT, API CNES atual e CSV oficial como implementados; Oracle continua pendente |
| 11 | cita `scikit-learn`, Oracle, Power BI e cinco índices como implementados | separar tecnologias usadas, em construção e opcionais |
| 12 | protótipo pode ser reaproveitado como referência visual | atualizar dados, filtros, nomes dos indicadores e estados metodológicos |
| 13 | notas dizem que os cinco índices estão concluídos | atualizar Kanban com Gold, Oracle, dashboard, pitch e Select AI |
| 14 | encerramento repete 5,21 milhões | substituir pela volumetria congelada e validada da Gold `v0.2.0` |

Conclusão: o arquivo da Sprint 1 é insumo de narrativa e identidade, não fonte
dos números da apresentação final. Todas as figuras e métricas de 2022–2023
devem ser regeneradas para 2024–2026.

## 5. Definições aprovadas e decisões ainda abertas

Em 29/07/2026, a equipe aprovou:

1. os cinco contratos de indicador descritos neste documento;
2. as regras de amostra mínima e denominador zero;
3. o IPH como pressão estimada, sem faixas fixas de ocupação;
4. o IS de 2026 contra a média de 2024–2025;
5. o CMI nominal por internação nova, com continuações separadas;
6. o CSV oficial de regiões/população do Ministério da Saúde;
7. a malha municipal IBGE 2024 para formar o mapa regional.

Continuam abertas somente decisões da camada de entrega:

1. ferramenta e forma de publicação do dashboard;
2. tabelas e estratégia de carga no Oracle;
3. perguntas demonstradas no Select AI;
4. uso futuro de clustering após o MVP;
5. critérios finais do pitch e da apresentação técnica.

## 6. Proposta metodológica dos cinco índices

### 6.1 TMH — Taxa de Mortalidade Hospitalar

Pergunta: qual hospital ou especialidade apresenta mortalidade observada que
merece investigação?

Proposta:

```text
TMH = óbitos em internações novas / internações novas × 100
```

- população: somente `IDENT=1`;
- grão principal: hospital × especialidade × mês;
- comparações: período anterior e pares da mesma especialidade;
- amostra mínima para classificação: 30 internações novas;
- abaixo de 30: mostrar valor e amostra, mas status “amostra insuficiente”;
- não interpretar diferença como qualidade assistencial ou causalidade, pois
  não há ajuste de risco clínico.

No recorte atual, o corte de 30 mantém 97,01% das internações presentes nas
linhas hospital/especialidade/mês classificáveis.

### 6.2 IPR — Índice de Permanência Relativa

Pergunta: o paciente permanece mais tempo que em hospitais comparáveis para o
mesmo diagnóstico?

Proposta:

```text
IPR = média DIAS_PERM do hospital/CID
      / média DIAS_PERM da região/CID sem o próprio hospital
```

- população: internações novas;
- permanência zero é preservada;
- benchmark: região de saúde e mesmo CID, excluindo o hospital avaliado;
- mínimo do hospital/CID: 20 internações;
- mínimo do benchmark: 50 internações distribuídas em pelo menos 3 hospitais;
- sem benchmark suficiente: não calcular status;
- mostrar sempre numerador, denominador, amostras e período.

O corte hospital/CID preserva 80,77% das internações. Quando se exige também o
benchmark regional sem o próprio hospital, 50 internações e pelo menos dois
outros hospitais, 59,22% das internações ficam elegíveis para IPR classificado.
Essa perda de cobertura é o custo explícito de evitar rankings frágeis; os
demais casos continuam disponíveis com status “amostra insuficiente”.

### 6.3 IS — Índice de Sazonalidade

Pergunta: o volume atual está acima do esperado para o mesmo mês do ano?

Proposta para o MVP:

```text
IS de 2026 = internações novas do mês de 2026
             / média do mesmo mês em 2024 e 2025
```

- grão inicial: região de saúde × mês;
- usar internações novas, não AIHs aprovadas;
- calcular somente onde houver dois anos anteriores comparáveis;
- no recorte atual, isso produz IS validado para janeiro–maio de 2026;
- exibir também variação ano contra ano, sem confundi-la com sazonalidade;
- não criar faixas clínicas arbitrárias: apresentar índice, variação percentual
  e posição relativa entre regiões;
- hospital ou município só recebe classificação com pelo menos 30 internações
  no mês e histórico suficiente.

Com apenas dois anos completos, o resultado deve ser chamado de comparação
sazonal histórica, não de modelo sazonal definitivo.

### 6.4 CMI — Valor médio aprovado por internação

O SIH registra valores aprovados/reembolsados pelo SUS, não o custo econômico
integral do hospital. Por isso, a recomendação é preservar a sigla no produto,
mas usar o nome técnico explícito:

```text
CMI = soma de VAL_TOT das internações novas / internações novas
```

- população principal: `IDENT=1`;
- continuação de longa permanência fica fora do indicador principal;
- `valor_continuacoes` e sua participação são exibidos separadamente;
- grão: hospital × especialidade × mês;
- mínimo para classificação: 30 internações;
- comparação temporal preferencial em reais constantes;
- se o IPCA ainda não estiver incorporado, rotular valores como nominais e não
  comparar anos como se fossem diretamente equivalentes.

Evolução futura: custo completo por episódio, vinculando continuações. Isso
não é necessário para o MVP.

### 6.5 IPH — Índice de Pressão Hospitalar

A taxa oficial de ocupação usa pacientes-dia divididos por leitos-dia
operacionais. O MedFlow não possui o censo diário de leitos operacionais; o
CNES/LT informa capacidade mensal declarada. Portanto, mesmo com um numerador
melhor, o resultado será uma estimativa de pressão contra a capacidade
declarada, não ocupação real.

Proposta:

1. usar somente internações novas para não duplicar AIHs de continuação;
2. reconstruir pacientes-dia pelas datas de entrada e saída;
3. contar o dia da internação e não o da alta; internação e alta no mesmo dia
   contam um paciente-dia;
4. distribuir cada permanência nos meses civis em que ela ocorreu;
5. dividir pela soma de `leitos_sus × dias_do_mês`;
6. não limitar valores a 100%; valores acima disso viram flag de
   incompatibilidade entre numerador e capacidade declarada;
7. não usar as faixas antigas de 70% e 85% antes de validação com especialista.

```text
IPH estimado = pacientes-dia reconstruídos no mês
               / leitos-dia SUS declarados no mês
```

A viabilidade é boa: nas 6.905.441 internações novas, as datas estão completas,
não há intervalo negativo e a diferença entre saída e entrada coincide com
`DIAS_PERM` em 100% das linhas. Há 1.083.409 internações de mesmo dia, que
precisam da regra explícita de um paciente-dia.

O campo atual `proxy_iph_diarias_faturadas` deve permanecer apenas para
auditoria e não deve alimentar o dashboard principal.

Referências metodológicas:

- ANS, Taxa de Ocupação Operacional Geral:
  https://www.gov.br/ans/pt-br/arquivos/assuntos/prestadores/qualiss-programa-de-qualificacao-dos-prestadores-de-servicos-de-saude-1/versao-anterior-do-qualiss/e-efi-01.pdf
- Ministério da Saúde, Portaria SAS nº 356/2002, definições de
  paciente-dia e leito-dia:
  https://bvsms.saude.gov.br/bvs/saudelegis/gm/2002/prt0356_20_02_2002.html

## 7. Pares, padrões e agrupamentos

Abordagem recomendada por esforço/resultado:

1. começar com pares determinísticos: região de saúde, tipo de unidade e
   quartil de leitos SUS;
2. usar esses pares nos benchmarks de permanência, mortalidade e valor;
3. depois do MVP, avaliar clustering descritivo com volume, leitos,
   permanência, TMH, CMI e mix de complexidade;
4. se houver clustering, padronizar variáveis, justificar a quantidade de
   grupos com silhouette e nomear os grupos somente após interpretar os
   centroides;
5. não vender agrupamento como previsão, diagnóstico ou causalidade.

Os quartis atuais de leitos por hospital/mês são aproximadamente 25, 55 e 128,
o que permite formar portes baseados na própria distribuição sem inventar
limites externos.

## 8. Fontes e uso dos três formatos Oracle

Proposta de contrato:

| Formato | Fonte | Papel |
|---|---|---|
| relacional | SIH/RD e tabelas Gold | fatos, dimensões, indicadores e consultas |
| JSON | API atual do CNES | atributos variáveis e cadastro atual do estabelecimento |
| CSV / External Table | regiões de saúde e população IBGE 2022, Ministério da Saúde | taxas populacionais e integração Oracle |

O CSV oficial foi incorporado, reconciliado com a API e preservado na Bronze.
O CMI permanece nominal; IPCA continua como evolução opcional.

## 9. MVP e dashboard

Recomendação: usar Power BI para o MVP público, porque a mentoria autorizou a
ferramenta e ela reduz o esforço de interface. O Oracle Autonomous Database
continua como armazenamento e serving.

Três páginas são suficientes:

1. **Visão executiva:** volume, comparação sazonal, pressão estimada e ranking
   de regiões;
2. **Hospital e pares:** IPR, TMH, CMI, série temporal e amostras;
3. **Metodologia e qualidade:** fórmulas, cobertura, competência mais recente,
   limitações e flags.

Cada cartão deve mostrar valor, comparação, amostra e interpretação. Nenhum
status deve esconder amostra insuficiente ou dado parcial de 2026.

## 10. Oracle e Select AI

Carregar somente dimensões e tabelas Gold necessárias ao consumo. Views com
nomes e comentários de negócio melhoram tanto o dashboard quanto o Select AI.

Perguntas candidatas:

1. “Quais regiões de saúde tiveram maior aumento de internações novas em maio
   de 2026 comparado a maio de 2025?”
2. “Quais hospitais tiveram permanência acima do benchmark regional para o
   mesmo CID, com amostra suficiente?”
3. “Compare internações novas, pacientes-dia estimados e leitos SUS por região
   na competência mais recente.”

O Select AI entra após essas respostas estarem validadas em SQL convencional.

## 11. Ordem recomendada

1. carregar Oracle e validar SQL;
2. construir as três páginas do dashboard;
3. testar as perguntas do Select AI;
4. regenerar figuras e atualizar a apresentação usando somente a Gold;
5. ensaiar o pitch e uma bateria de perguntas técnicas.

## 12. Critérios de aceite da Gold

- toda métrica contém numerador, denominador, amostra, período e fórmula;
- somas Gold reconciliam com a Silver;
- nenhum indicador divide por zero;
- amostra insuficiente não recebe classificação;
- 2026 aparece explicitamente como parcial;
- nenhum texto usa “ocupação real” para o IPH estimado;
- toda figura nasce do notebook 02 e de uma tabela Gold persistida;
- os números do dashboard, PPT, vídeo e Select AI são os mesmos;
- cada integrante consegue explicar fonte, fórmula, limitação e decisão de
  negócio dos cinco índices.

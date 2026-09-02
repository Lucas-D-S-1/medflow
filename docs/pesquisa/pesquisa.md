# Pesquisa do problema, soluções similares e casos comparáveis

**MedFlow · desk research e plano de validação · 01/08/2026**

Este documento avalia se o problema de negócio do MedFlow é tão robusto quanto
a solução técnica já construída. Ele reúne evidências externas, compara
soluções existentes e registra um roteiro opcional para medir a utilidade real
se o produto evoluir depois da entrega acadêmica.

O desenho técnico correspondente está em [`ARQUITETURA.md`](../../ARQUITETURA.md).

> Este documento é um retrato de 01/08/2026 e não é reescrito para acompanhar o
> produto: reescrever pesquisa a cada mudança transforma registro em opinião. O
> produto evoluiu desde então — as quatro visões citadas aqui foram reagrupadas
> em duas páginas, e a etapa de fluxos saiu. O estado corrente está no
> [`ARQUITETURA.md`](../../ARQUITETURA.md).

## 1. Resposta executiva

**O problema estrutural é robusto e a aderência da solução ao problema está
suficientemente sustentada para o escopo acadêmico do projeto.**

Há evidência forte de que:

- o SUS possui múltiplos sistemas e bases cuja integração e interoperabilidade
  continuam sendo tema de política pública;
- SIH/SUS, CNES, geografia e população são fontes úteis, porém têm finalidades,
  temporalidades e limitações diferentes;
- gestores precisam de informação integrada, inteligível e comparável para
  planejamento, monitoramento e priorização;
- painéis, benchmarking e salas de situação já são categorias reconhecidas no
  Brasil e fora dele.

O projeto não realizou validação primária de campo. Portanto, não deve afirmar
que:

- a persona escolhida executa hoje exatamente a jornada desenhada pelo MedFlow;
- a combinação exata de indicadores hospitalares, fluxos e ICSAP resolve uma
  decisão recorrente melhor do que as ferramentas e planilhas já usadas;
- o usuário entende corretamente TMH, IPR e IPH sem mediação da equipe;
- o produto reduz tempo, erro ou retrabalho em magnitude relevante;
- a priorização gerada leva a uma ação ou investigação real.

Essa ausência não impede concluir que o problema existe nem que a solução faz
sentido. Ela apenas limita afirmações sobre adoção e impacto já obtido. A
formulação correta não é “provamos o impacto do MedFlow”. É:

> Existe um problema bem documentado de integração e transformação de dados de
> saúde em informação para gestão. Construímos uma solução tecnicamente
> reproduzível e coerente para um recorte concreto desse problema. Uma validação
> futura com usuários poderá medir adoção e impacto, mas não é condição para a
> demonstração acadêmica do MVP.

## 2. Formulação recomendada do problema

### 2.1 Versão principal

> Gestores regionais de saúde de São Paulo precisam combinar bases e conceitos
> distintos para separar demanda dos residentes, produção dos hospitais,
> deslocamentos assistenciais, condições sensíveis à atenção primária e sinais
> de desempenho hospitalar. A ausência dessa leitura integrada aumenta o
> esforço para localizar onde investigar acesso regional, pressão assistencial,
> permanência, mortalidade observada e valor aprovado.

### 2.2 Job to be done

> Quando recebo uma nova competência dos dados públicos hospitalares, quero
> localizar rapidamente regiões e hospitais com sinais fora do seu histórico ou
> dos seus pares, entender o recorte que concentra o sinal e levar uma hipótese
> documentada para investigação com a equipe local.

### 2.3 Proposta de valor

> O MedFlow transforma bases públicas administrativas em uma jornada auditável
> de triagem: região → hospital → especialidade/diagnóstico → hipótese de
> investigação, preservando fonte, amostra, benchmark e limitações.

### 2.4 Formulações que devem ser evitadas

| Evitar | Por quê | Usar no lugar |
|---|---|---|
| “O gestor só descobre a crise por telefone” | hipótese não sustentada por entrevista ou fonte | “A pesquisa verificará como o sinal chega hoje e quais etapas são manuais” |
| “Monitoramento em tempo real” | SIH e CNES são publicados por competência e podem ser reprocessados | “leitura mensal das competências disponíveis” |
| “Taxa de ocupação” | o IPH usa pacientes-dia reconstruídos e leitos SUS declarados | “pressão estimada sobre capacidade declarada” |
| “Hospital ineficiente” | dados administrativos não ajustam toda a complexidade clínica | “valor que merece investigação e contexto local” |
| “Custo da internação” | o SIH fornece valor aprovado nominal, não custo contábil completo | “valor médio aprovado por internação” |
| “Prevê surtos” | dois anos-base não sustentam modelo preditivo definitivo | “comparação com o mesmo mês de 2024–2025” |
| “Nenhuma solução integra esses dados” | existem painéis públicos e ferramentas de gestão | “o MedFlow integra um recorte e uma jornada específicos” |

## 3. Mapa de evidências

O problema precisa ser separado em quatro camadas. Misturá-las cria uma
história aparentemente forte, mas impossível de defender.

| Camada | Pergunta | Estado atual |
|---|---|---|
| Estrutural | há fragmentação e necessidade de integração/análise? | **bem sustentada** por políticas, fontes e literatura |
| Trabalho do usuário | essa integração gera esforço ou atraso para a persona escolhida? | **sustentado indiretamente por literatura, políticas e soluções análogas** |
| Adequação da solução | as quatro visões e os indicadores hospitalares/territoriais ajudam a priorizar? | **coerente com o problema e com produtos comparáveis** |
| Impacto | o produto reduz tempo/erro e melhora uma decisão? | **não medido; não será alegado como resultado obtido** |

### 3.1 Evidências de que o problema estrutural existe

| Evidência | O que sustenta | O que não prova |
|---|---|---|
| A [Política Nacional de Informação e Informática em Saúde](https://bvsms.saude.gov.br/bvs/saudelegis/cns/2022/res0659_15_06_2022.html) define integração de sistemas, governança, transparência e acesso como finalidades nacionais | integração e governança ainda são problemas relevantes de política pública | que o MedFlow é a melhor implementação |
| O [Programa SUS Digital](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2024/prt3232_04_03_2024.html) inclui um eixo de interoperabilidade, análise e disseminação de dados | análise e disseminação são necessidades reconhecidas, não invenção do projeto | qual dashboard ou indicador o gestor prefere |
| A [RNDS](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2020/prt1434_01_06_2020_rep.html) foi instituída para integração e interoperabilidade entre estabelecimentos e entes | o problema é sistêmico e nacional | que SIH e CNES devam ser unidos exatamente como no MedFlow |
| Reportagem técnica da [Fiocruz/EPSJV](https://www.epsjv.fiocruz.br/noticias/reportagem/falta-de-integracao-e-distribuicao-das-bases-de-dados-fragiliza-sistemas-de) documenta desafios de integração, distribuição, acesso e verificação de dados | equipes enfrentam problemas concretos ao operar múltiplos sistemas | frequência e intensidade do problema na persona do projeto |
| Revisão sobre [interoperabilidade dos sistemas brasileiros](https://revista.saude.ms.gov.br/index.php/rspms/article/view/78) identifica fragmentação na integração | a literatura confirma a lacuna estrutural | efeito de um painel retrospectivo sobre decisões |
| O [TABNET](https://datasus.saude.gov.br/informacoes-de-saude-tabnet/) mantém SIH, CNES, população e outras informações em conjuntos de navegação próprios | o dado existe e é relevante para decisão, mas exige conhecer diferentes domínios | que todo usuário considere a interface difícil |
| O [Ministério da Saúde](https://www.gov.br/saude/pt-br/composicao/se/dgip/regionalizacao) define regionalização como eixo estruturante do SUS e reconhece que os municípios não ofertam isoladamente todos os serviços | fluxo entre territórios, referência assistencial e capacidade regional são problemas legítimos de planejamento | que todo deslocamento represente falha da região de origem |
| A [PNAES](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2023/prt1604_20_10_2023.html) exige considerar demanda, oferta, capacidade instalada e deslocamentos no planejamento da atenção especializada | separar residência de atendimento é coerente com a política pública | qual meta de autonomia seria adequada para cada região |
| A [Portaria SAS/MS 221/2008](https://bvsms.saude.gov.br/bvs/saudelegis/sas/2008/prt0221_17_04_2008.html) institui a Lista Brasileira de ICSAP como instrumento de avaliação da atenção primária e do uso hospitalar | ICSAP é um indicador nacional legítimo para análise territorial | causalidade individual ou evitabilidade de cada internação |

### 3.2 Evidências sobre temporalidade e limitações dos dados

| Evidência | Implicação para o MedFlow |
|---|---|
| A [Portaria SAES/MS 1.110/2021](https://bvsms.saude.gov.br/bvs/saudelegis/saes/2021/prt1110_18_11_2021.html) permite apresentação retroativa, reapresentação e reprocessamento do SIH | competência recente pode mudar; registrar data de extração, corte e hash é obrigatório |
| Estudo de validação do [SIH/SUS para morbidade materna](https://pmc.ncbi.nlm.nih.gov/articles/PMC11295267/) encontrou boa identificação global de internações, mas sub-registro variável de diagnósticos e procedimentos | o SIH é valioso para análise populacional, mas não deve ser tratado como prontuário completo |
| Estudo sobre [registro de óbitos no SIH/SUS](https://pmc.ncbi.nlm.nih.gov/articles/PMC11653955/) destaca que a base nasceu para pagamento e pode ter falhas em variáveis relevantes | TMH é mortalidade observada administrativa; não uma medida causal de qualidade |
| Revisão sobre [limitações do DATASUS em pesquisa cirúrgica](https://pmc.ncbi.nlm.nih.gov/articles/PMC10508673/) reforça que a unidade do SIH é a internação/AIH, não a pessoa | contagens e linguagem devem permanecer no grão correto |
| Estudo de [confiabilidade do CNES](https://www.scielo.br/j/csc/a/j7fDnf87zJTpCLKH3DQYzLq/?lang=pt) encontrou diferenças relevantes em registros de estabelecimentos/leitos | leito cadastrado não é sinônimo de leito operacional disponível |

Essas limitações não invalidam o produto. Elas definem o tipo de decisão que ele
pode apoiar e explicam por que a tela de metodologia é parte central da
solução.

## 4. Soluções similares e substitutos atuais

O MedFlow não entra em um mercado vazio. A existência de soluções semelhantes
é, ao mesmo tempo, validação da categoria e aumento da exigência de
diferenciação.

| Solução | Escopo e proposta | Sobreposição com MedFlow | Lacuna/oportunidade para MedFlow |
|---|---|---|---|
| [TABNET/DATASUS](https://datasus.saude.gov.br/informacoes-de-saude-tabnet/) | tabulação oficial de assistência, morbidade, CNES, população e finanças | mesma matéria-prima pública | MedFlow entrega jornada, contratos e comparação já preparados; TABNET continua soberano para consulta ad hoc |
| [DigiSUS Gestor](https://www.gov.br/saude/pt-br/assuntos/noticias/2018/novembro/plataforma-auxiliara-gestor-no-planejamento-e-monitoramento-de-acoes-em-saude) | centralização de fontes, indicadores e metas para planejamento nas três esferas | mesma ambição de tornar informação acessível ao gestor | MedFlow deve focar o recorte hospitalar e regional, não tentar substituir uma plataforma nacional |
| LocalizaSUS | painéis temáticos e dados estratégicos abertos para análise e formulação de políticas; descrito no [Relatório de Gestão 2022](https://www.gov.br/saude/pt-br/acesso-a-informacao/auditorias/2022/relatorio-de-gestao-integrado) | visualização analítica e transparência pública | metodologia comparável e aprofundamento região → hospital → CID podem diferenciar o recorte |
| [Sala de Situação de Saúde](https://www.gov.br/saude/pt-br/composicao/svsa/resposta-a-emergencias/sala-de-situacao-de-saude) | análise sistemática de informação por equipe técnica para planejamento, avaliação e resposta | mesma lógica de transformar dados em priorização | reforça que ferramenta sem rotina, equipe e ação não produz decisão sozinha |
| [InfoSaúde/SES-DF](https://info.saude.df.gov.br/sala-de-situacao/painel-infosaude-indicadores/) | painéis e indicadores pactuados para gestão regional e hospitalar | uso real de indicadores e metas na gestão pública | mostra que contexto local e pactuação importam mais do que quantidade de gráficos |
| Painel de segurança do paciente da Ebserh | benchmarking em uma rede de hospitais universitários | comparação entre hospitais e transparência | fornece um caso brasileiro de implantação e governança, descrito abaixo |
| [NHS Model Health System](https://www.england.nhs.uk/applications/model-hospital/) | benchmark de qualidade e produtividade entre hospitais, pares e sistemas | é a referência funcional mais próxima da visão hospital/pares | confirma o valor do benchmark, mas também a necessidade de metodologia madura, acesso governado e inteligência local |

### 4.1 Onde o MedFlow pode ser diferente

A diferenciação defensável não é “ter dashboard”. É a combinação de:

- recorte hospitalar das 62 regiões de saúde de São Paulo;
- integração reproduzível de SIH, CNES, MS e IBGE;
- benchmark hospital/CID que exclui o próprio hospital da referência;
- passagem guiada de sinal regional para investigação hospitalar;
- amostra, denominador e limitações junto do número;
- Oracle como fonte servida ao produto, com reconciliação e Select AI;
- link público sem licença e contingência transparente;
- código, contratos e trilha de dados auditáveis.

Essa diferenciação precisa ser demonstrada em uma tarefa. Uma lista de
funcionalidades não prova vantagem sobre TABNET, planilha ou painel já usado.

## 5. Casos comparáveis: esforço, resultado e aprendizado

### 5.1 Rede Ebserh — painel de indicadores de segurança do paciente

O relato brasileiro de [implementação do painel](https://ojs.unifor.br/RBPS/article/view/9788)
cobre janeiro de 2016 a dezembro de 2018.

**Esforço relatado:**

- definição inicial de 62 indicadores;
- qualificação e uniformização dos dados;
- redução/priorização para 23 indicadores;
- cadastro de responsáveis;
- alimentação por 39 hospitais universitários federais;
- desenvolvimento de cultura de avaliação contínua.

**Resultados relatados:**

- adesão dos 39 hospitais;
- compartilhamento de informações e experiências;
- institucionalização de monitoramento contínuo por meio do programa Gestão à
  Vista.

**O que o caso ensina:** governança, uniformização e responsáveis pelos dados
consomem mais esforço do que montar o gráfico. O resultado demonstrado é de
adoção e processo; o relato não prova redução causal de mortalidade ou custo.

### 5.2 NHS Model Health System — benchmarking em escala

O [Model Health System](https://www.england.nhs.uk/applications/model-hospital/)
permite que equipes comparem produtividade, qualidade e capacidade de resposta
com pares e médias nacionais.

Uma [atualização oficial de transparência](https://www.england.nhs.uk/long-read/a-new-era-of-transparency-progress-update/)
publicada em 2026 informa mais de 76 mil usuários registrados, penetração em
100% dos provedores e sistemas integrados de cuidado e uso equivalente a cerca
de 1.200 usuários por dia útil.

**Esforço visível:**

- métricas e metodologias por domínio;
- comparação com pares e médias;
- política de acesso e expansão progressiva;
- participação clínica e seleção de áreas com melhor qualidade de dados;
- notas e ressalvas para reduzir interpretação incorreta.

**Resultado demonstrado:** adoção em escala e incorporação institucional do
benchmarking. Os números de uso não provam, isoladamente, ganho clínico.

**O que o caso ensina:** benchmark é uma categoria útil quando vem acompanhado
de método, pares adequados e contexto local. O MedFlow deve começar estreito e
explicável.

### 5.3 Dashboard operacional em uma unidade de 25 leitos

Um [estudo de melhoria da qualidade](https://pubmed.ncbi.nlm.nih.gov/34950952/)
testou por 30 dias um dashboard de processamento de medicamentos na alta de uma
unidade médico-cirúrgica de 25 leitos.

**Esforço relatado:** desenho do fluxo de comunicação, formulário, dashboard,
workflow e piloto delimitado, com medidas antes/depois.

**Resultados associados ao piloto:**

- tempo médio de processamento de medicamentos: 125 para 48 minutos;
- tempo médio entre ordem e alta: 137 para 117 minutos;
- chamadas entre enfermagem e farmácia: 1.115 para 434;
- tempo total em chamadas: 33h50 para 13h19;
- posterior expansão do processo para o hospital.

**O que o caso ensina:** o dashboard produziu resultado porque foi ligado a um
fluxo, atores e métrica operacional. O número não pode ser transferido para o
MedFlow; o padrão “baseline → ferramenta → mesma tarefa → resultado” pode.

### 5.4 O que a literatura agregada diz

Uma [revisão sistemática sobre dashboards hospitalares](https://pubmed.ncbi.nlm.nih.gov/40718761/)
incluiu 70 estudos. Entre os achados sobre permanência, 28 indicaram redução,
cinco aumento e dez nenhuma mudança; impactos econômicos foram favoráveis na
maioria dos achados que os mediram. Mortalidade e danos tiveram resultados mais
heterogêneos.

A conclusão útil para o MedFlow é cautelosa: dashboards podem apoiar melhoria,
mas o efeito depende da integração ao trabalho local. Interface e arquitetura,
sozinhas, não garantem impacto.

## 6. Robustez do recorte de dados

### 6.1 Pontos fortes

- AIH aprovada, internação nova e continuação de longa permanência contadas
  e reconciliadas separadamente;
- cobertura integral dos códigos observados usados nos de/paras;
- 645 municípios, 62 regiões e 19 macrorregiões;
- nove tabelas Gold e 175 colunas documentadas;
- carga do Oracle conferida tabela a tabela contra a Gold;
- 36/36 métricas Oracle com estado `ok` e seis gates de integridade vazios;
- evasão inter-regional simétrica entre saída e entrada, por construção;
- ICSAP reconciliada entre o resumo regional e os 19 grupos oficiais;
- geografia e metadados versionados;
- ausência e denominador zero preservados, sem descarte silencioso.

A volumetria de cada item sai de `make validar`,
que é gerado a cada `make validar`. Este documento é argumentativo e não repete
número: quando o recorte avança, prosa com total cravado passa a mentir, e foi o
que aconteceu com a versão anterior desta lista.

Os novos sinais não são residuais: 13,23% das internações observadas de
residentes ocorreram em outra região paulista, e 13,93% das internações de
residentes observadas foram classificadas como ICSAP. Esses percentuais não são
metas nem prova de falha; demonstram que fluxo territorial e atenção primária
têm materialidade suficiente para compor a triagem do produto.

### 6.2 Fragilidades que limitam o problema solucionável

- SIH é administrativo e orientado ao processamento/pagamento de AIH;
- uma AIH não equivale necessariamente a uma pessoa única;
- competências recentes aceitam reapresentação e reprocessamento;
- CNES representa capacidade declarada, não disponibilidade operacional em
  tempo real;
- nome e esfera enriquecidos no projeto são atuais, não fotografias históricas
  para cada mês;
- TMH não possui ajuste de risco clínico;
- IPR não elimina diferenças de complexidade entre pacientes;
- CMI nominal e real são valores aprovados, não custo total;
- IS usa somente 2024–2025 como base de comparação;
- IPH reconstrói pacientes-dia, mas ainda usa leitos declarados no denominador.
- o RD-SP não observa residentes paulistas internados fora do estado; evasão é
  apenas intrastadual observada;
- a Silver não preserva o procedimento necessário ao denominador oficial de
  internações clínicas de média complexidade da proporção ICSAP.

### 6.3 Avaliação por indicador

| Indicador | Robustez técnica | Utilidade provável | Risco de interpretação | Decisão |
|---|---|---|---|---|
| TMH | alta para a fórmula observada | triagem de variação com amostra | alto sem ajuste de risco | manter com linguagem restrita |
| IPR | alta para o contrato implementado | forte para aprofundar hospital/CID | médio/alto por case mix | manter; priorizar validação com gestor |
| IS | alta para a comparação definida | leitura rápida do mês contra histórico | médio se chamado de previsão | manter como comparação sazonal |
| CMI | alta para valor aprovado/AIH | contexto financeiro administrativo | alto se chamado de custo | manter com rótulo preciso |
| IPH | alta para o proxy reconstruído | sinal regional/hospitalar de pressão | muito alto se chamado de ocupação | manter apenas com caveat visível |
| Taxa de internação residente | alta no recorte observado | compara necessidade territorial entre populações | médio se tratada como utilização total | manter com “observada em SP” no rótulo |
| Fluxo assistencial | alta para origem–destino dentro de SP | identifica dependência, atração e referências | médio se evasão for tratada como falha | manter; interpretar junto da complexidade da oferta |
| ICSAP | alta para a lista CID oficial | sinal populacional indireto de APS e uso hospitalar | alto se chamada de internação individual evitável | manter por residência, taxa e grupo |
| Permanência média | alta para a fórmula administrativa | ponte simples para explicar IPR e uso de recursos | médio por case mix | manter como medida descritiva |

## 7. Diagnóstico de robustez do negócio

| Dimensão | Avaliação | Evidência atual | O que falta |
|---|---|---|---|
| Relevância pública do tema | forte | políticas de saúde digital, integração e salas de situação | nada crítico para sustentar o tema |
| Existência dos dados | forte | pipeline executado e fontes oficiais | rotina de atualização futura |
| Qualidade para triagem mensal | moderada/forte | reconciliações e contratos explícitos | validação de especialistas sobre leitura e limites |
| Dor da persona | moderada/forte para justificativa acadêmica | literatura, políticas e soluções análogas | validação direta seria evolução futura |
| Frequência da decisão | plausível, não medida diretamente | natureza mensal das fontes e rotinas de planejamento | medição futura, se o produto evoluir |
| Adequação das quatro visões | moderada/forte | coerência analítica e paralelo com salas de situação e benchmarking | teste futuro de usabilidade |
| Diferenciação | moderada | integração, benchmark e auditabilidade | comparação prática com processo atual |
| Resultado mensurável | fraca neste momento | nenhum piloto antes/depois | baseline e teste controlado |

**Síntese:** a escolha do problema é robusta como tema e como oportunidade de
integração analítica. Para a entrega acadêmica, a combinação de fontes oficiais,
literatura, soluções análogas e dados próprios validados é suficiente para
defender a coerência problema–solução. Entrevistas e medição permanecem como
evolução futura, não como bloqueio do MVP.

## 8. Hipóteses para uma evolução futura

| ID | Hipótese | Evidência que confirma | Evidência que refuta ou força ajuste |
|---|---|---|---|
| H1 | o usuário combina duas ou mais fontes/arquivos para analisar internações e capacidade | relato e demonstração do processo atual | uma única ferramenta já resolve a tarefa com pouco esforço |
| H2 | identificar onde investigar é uma tarefa recorrente | exemplos recentes, frequência e responsável definidos | tarefa rara, sem dono ou sem consequência |
| H3 | região → hospital → CID/especialidade é a sequência natural | usuário percorre a jornada sem ser induzido | usuário começa por outro objeto ou não usa CID |
| H4 | benchmark regional sem o próprio hospital é compreensível e útil | usuário explica o conceito e usa o valor | comparação considerada injusta ou irrelevante |
| H5 | IPH acrescenta sinal sem parecer ocupação real | usuário interpreta corretamente após ler a tela | interpretação equivocada recorrente |
| H6 | a solução reduz esforço | mesma tarefa é concluída mais rápido e com menos erro | ganho pequeno ou exigência de retrabalho paralelo |
| H7 | link público sem licença é valor real | compartilhamento aparece como barreira atual | acesso é restrito e exige autenticação institucional |

## 9. Plano opcional de validação futura com usuários

Esta etapa não é necessária para concluir ou apresentar o MVP acadêmico. O
roteiro é preservado para uma eventual evolução do MedFlow como produto usado
em ambiente real.

### 9.1 Amostra mínima

Realizar de cinco a oito sessões de 35–45 minutos, buscando ao menos:

- dois profissionais de planejamento, informação ou inteligência em secretaria
  municipal/regional/estadual;
- dois gestores ou analistas hospitalares;
- um profissional de regulação, auditoria ou avaliação;
- opcionalmente, um epidemiologista ou sanitarista para revisar linguagem e
  limitações.

Se não houver acesso à persona primária, registrar explicitamente o perfil de
cada participante e não generalizar o resultado.

### 9.2 Bloco A — entrevista de problema, sem mostrar a solução

Perguntas sugeridas:

1. Conte sobre a última vez em que precisou comparar internações, permanência ou
   capacidade entre hospitais ou regiões.
2. O que disparou a análise e qual decisão precisava ser tomada?
3. Quais sistemas, arquivos, painéis ou pessoas participaram?
4. Mostre, se puder, a sequência de trabalho e os artefatos gerados.
5. Quanto tempo transcorreu entre a pergunta e uma resposta utilizável?
6. Onde houve espera, retrabalho, dúvida de conceito ou reconciliação manual?
7. Como escolheu o benchmark ou o período de comparação?
8. O que aconteceu depois da análise? Quem recebeu e qual ação foi tomada?
9. Que tipo de erro ou interpretação incorreta seria mais perigoso?
10. Com que frequência uma tarefa parecida acontece?

Evitar perguntar “você usaria o MedFlow?” antes de conhecer o comportamento
atual. Opinião futura é evidência mais fraca do que um caso recente e concreto.

### 9.3 Bloco B — teste moderado do protótipo

Entregar tarefas, sem explicar a navegação:

1. identificar uma região que mereça investigação no último período disponível;
2. explicar por que ela chamou atenção e qual limitação acompanha o indicador;
3. abrir um hospital daquela região e localizar a tendência temporal;
4. encontrar um diagnóstico elegível para comparação com pares;
5. explicar o que o IPR significa e o que ele não prova;
6. verificar a competência e dizer se os dados estão no Oracle ou em
   contingência;
7. indicar a próxima ação fora do produto.

Registrar tempo, conclusão, pedido de ajuda, caminho, erro e interpretação.

### 9.4 Critérios de passagem

O problema e a solução podem avançar sem reposicionamento grande se:

- pelo menos quatro de cinco participantes da persona primária descreverem uma
  tarefa recorrente de integração/comparação;
- pelo menos três mostrarem esforço manual, troca entre fontes ou dependência de
  analista;
- pelo menos quatro concluírem cinco das sete tarefas sem ajuda crítica;
- o tempo mediano da tarefa comparável cair ao menos 30% contra o processo atual
  ou contra uma consulta equivalente no TABNET/planilha;
- nenhum participante confundir IPH com ocupação real após ler a explicação;
- pelo menos três produzirem uma hipótese de investigação coerente;
- pelo menos dois indicarem onde o resultado entraria em uma rotina real.

Esses cortes são critérios do experimento, não verdades universais. Se falharem,
o resultado útil é saber qual hipótese deve mudar.

### 9.5 Métrica principal do piloto

**Tempo para produzir uma hipótese de investigação correta e rastreável.**

Definição operacional:

- início: participante recebe período e pergunta padronizados;
- fim: identifica região, hospital e recorte, cita o indicador e registra uma
  limitação correta;
- qualidade: resposta confere com a Gold e não faz inferência proibida;
- comparação: processo atual versus MedFlow, com a mesma pessoa ou perfis
  equivalentes.

Métricas secundárias:

- número de fontes/telas acessadas;
- pedidos de ajuda;
- erros de filtro ou denominador;
- confiança declarada de 1 a 5, antes e depois de ver a metodologia;
- compreensão correta de cada indicador;
- intenção concreta de compartilhar o link ou levar o achado a uma reunião.

## 10. Experimento futuro de esforço/resultado do próprio MedFlow

Caso o produto continue depois da entrega, um piloto pequeno poderá gerar um
case próprio e mensurar impacto:

| Elemento | Definição |
|---|---|
| Participantes | 5 pessoas, priorizando a persona primária |
| Pergunta | mesma competência e mesma tarefa de priorização |
| Baseline | ferramenta/processo que a pessoa usaria hoje |
| Intervenção | webapp MedFlow sem explicação da equipe |
| Resultado primário | tempo até hipótese correta e rastreável |
| Qualidade | acerto do recorte, indicador e limitação |
| Evidência | planilha anonimizada de sessão, roteiro e síntese |
| Regra ética | sem dado pessoal de paciente e sem avaliação individual do participante |

Exemplo de comunicação futura, somente se os dados permitirem:

> Em cinco testes moderados, o tempo mediano para localizar uma região, abrir o
> hospital e registrar uma hipótese com a limitação correta caiu de X para Y
> minutos. N participantes concluíram sem ajuda. O piloto mede eficiência da
> tarefa, não impacto assistencial.

Nunca preencher `X`, `Y` ou `N` com estimativa.

## 11. Decisão após a pesquisa

### Manter agora

- persona principal: gestor/analista de planejamento e informação regional;
- problema: esforço para integrar e interpretar sinais mensais;
- jornada: região → hospital → especialidade/CID → hipótese;
- quatro visões enxutas;
- núcleo hospitalar e territorial com limitações explícitas;
- webapp sem licença conectado ao Oracle;
- benchmark e rastreabilidade como diferenciais.

### Validar antes de expandir

- qual indicador realmente inicia a investigação na prática;
- se CID é um aprofundamento usado pela persona ou detalhe excessivo;
- qual região de comparação é considerada justa;
- frequência real da rotina;
- necessidade de exportar ou compartilhar uma visão;
- linguagem de IPH, TMH e IPR;
- valor do Select AI para usuário, além do valor demonstrativo para a banca.

### Não construir ainda

- previsão de demanda;
- recomendação automática;
- alerta clínico;
- semáforo sem validação;
- chat público sobre toda a base;
- autenticação e perfis complexos;
- ingestão em tempo real;
- cópia da Gold para Supabase;
- grande quantidade de telas antes do teste das três principais.

## 12. Riscos de negócio e mitigação

| Risco | Consequência | Mitigação |
|---|---|---|
| resolver uma dor genérica, não uma tarefa real | dashboard impressiona, mas não entra em rotina | entrevistas baseadas na última ocorrência e demonstração do processo atual |
| competir apenas por visual | ferramentas existentes já possuem painéis | diferenciar pela jornada, benchmark, contrato e auditabilidade |
| excesso de indicadores | usuário não sabe onde começar | uma pergunta principal por visão e divulgação progressiva |
| ranking virar julgamento | dano reputacional e interpretação indevida | amostra, benchmark, linguagem de investigação e contexto local |
| dado administrativo parecer clínico | conclusão incorreta sobre qualidade | caveats na mesma tela e teste de compreensão |
| promessa de tempo real | quebra de confiança | mostrar competência e data de extração |
| prova técnica dominar a narrativa | banca não identifica valor de negócio | abrir apresentação com decisão e usuário; arquitetura entra como sustentação |
| Select AI gerar resposta inadequada | fragilidade na demonstração | SQL de referência, `showsql`, revisão e roteiro controlado |

## 13. Estrutura recomendada da narrativa final

1. **Quem decide:** gestor/analista regional de saúde.
2. **Qual tarefa:** localizar onde investigar após nova competência mensal.
3. **Por que é difícil:** fontes e conceitos distintos, processamento técnico e
   risco de comparação inconsistente.
4. **O que o MedFlow faz:** integra, reconcilia e conduz da região ao recorte
   hospitalar com método visível.
5. **Demonstração:** uma única jornada completa em até três minutos.
6. **Confiança:** fonte, amostra, limitações, Oracle ao vivo e contingência.
7. **Validação:** resultado das entrevistas/testes, inclusive o que foi mudado.
8. **Limite honesto:** triagem mensal; não ocupação, regulação ou decisão
   automática.
9. **Próximo passo:** piloto com rotina e responsável definidos.

## 14. Fontes organizadas

### Problema, integração e política pública

- [Política Nacional de Informação e Informática em Saúde — PNIIS](https://bvsms.saude.gov.br/bvs/saudelegis/cns/2022/res0659_15_06_2022.html)
- [Programa SUS Digital — Portaria GM/MS 3.232/2024](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2024/prt3232_04_03_2024.html)
- [Rede Nacional de Dados em Saúde — Portaria GM/MS 1.434/2020](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2020/prt1434_01_06_2020_rep.html)
- [Saúde Digital — DATASUS](https://datasus.saude.gov.br/saude-digital/)
- [Fiocruz/EPSJV — integração e distribuição das bases de saúde](https://www.epsjv.fiocruz.br/noticias/reportagem/falta-de-integracao-e-distribuicao-das-bases-de-dados-fragiliza-sistemas-de)
- [Revisão sobre interoperabilidade entre sistemas de saúde brasileiros](https://revista.saude.ms.gov.br/index.php/rspms/article/view/78)

### Fontes e limitações metodológicas

- [Informações de Saúde TABNET — DATASUS](https://datasus.saude.gov.br/informacoes-de-saude-tabnet/)
- [Regras de apresentação e reprocessamento do SIH/SUS](https://bvsms.saude.gov.br/bvs/saudelegis/saes/2021/prt1110_18_11_2021.html)
- [Validação do SIH/SUS para morbidade materna](https://pmc.ncbi.nlm.nih.gov/articles/PMC11295267/)
- [Registro de óbitos no SIH/SUS](https://pmc.ncbi.nlm.nih.gov/articles/PMC11653955/)
- [Limitações do DATASUS como fonte para pesquisa cirúrgica](https://pmc.ncbi.nlm.nih.gov/articles/PMC10508673/)
- [Confiabilidade dos dados do CNES](https://www.scielo.br/j/csc/a/j7fDnf87zJTpCLKH3DQYzLq/?lang=pt)

### Soluções e casos

- [DigiSUS Gestor — planejamento e monitoramento](https://www.gov.br/saude/pt-br/assuntos/noticias/2018/novembro/plataforma-auxiliara-gestor-no-planejamento-e-monitoramento-de-acoes-em-saude)
- [Sala de Situação de Saúde — Ministério da Saúde](https://www.gov.br/saude/pt-br/composicao/svsa/resposta-a-emergencias/sala-de-situacao-de-saude)
- [InfoSaúde — Secretaria de Saúde do Distrito Federal](https://info.saude.df.gov.br/sala-de-situacao/painel-infosaude-indicadores/)
- [Painel de segurança do paciente na rede Ebserh](https://ojs.unifor.br/RBPS/article/view/9788)
- [NHS Model Health System](https://www.england.nhs.uk/applications/model-hospital/)
- [Dashboard de alta em unidade médico-cirúrgica](https://pubmed.ncbi.nlm.nih.gov/34950952/)
- [Revisão sistemática do impacto de dashboards hospitalares](https://pubmed.ncbi.nlm.nih.gov/40718761/)

## 15. Conclusão

O MedFlow não está procurando um problema para justificar uma arquitetura. A
necessidade de integrar, qualificar e transformar dados de saúde em informação
de gestão é real, institucional e documentada.

Para o escopo acadêmico, problema e solução estão suficientemente robustos
juntos: fontes oficiais confirmam a necessidade estrutural, soluções similares
confirmam a categoria e o pipeline demonstra viabilidade sobre um recorte real.

O projeto deve agora fechar o webapp e validar tecnicamente os números exibidos.
Uma pesquisa de campo poderá ser feita no futuro para medir adoção e impacto,
sem bloquear produto, Select AI ou apresentação.

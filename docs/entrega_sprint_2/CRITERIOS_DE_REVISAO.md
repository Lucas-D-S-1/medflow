# Critérios de revisão da entrega

Instrumento de conferência dos entregáveis da Sprint 2. Reúne num lugar só o que
está espalhado entre as regras oficiais da FIAP, o template da Sprint 2, a
transcrição da mentoria de 07/06/2026 e a avaliação recebida na Sprint 1.

Escrito em 25/08/2026, corrigido no mesmo dia contra o PDF de regras. Entrega:
**01/09/2026, 23h59**. Banca ao vivo entre **14 e 18/09**, só para o Top 6.

Cada seção responde uma pergunta diferente. As de 1 a 7 dizem **contra o que**
os entregáveis são medidos. A 8 é a lista de conferência propriamente dita. As
de 9 e 10 são as travas factuais: números que precisam concordar entre si e
frases que não podem ser ditas.

Fontes primárias, todas no repositório acadêmico privado:

- `00_fases/fase_2/enterprise_challenge/1TSCOA - Regras gerais - Challenge Oracle_RevFinal.pdf`
- `materiais_oficiais/asset.rar`, com o template oficial da Sprint 2
- `referencias/mentorias/2026-06-07_transcricao_apresentacao_duvidas_challenge_oracle.txt`
- `entregues/sprint_1/AVALIACAO.md`

A destilação de requisitos está em `medflow/docs/decisoes/REVISAO_REQUISITOS_E_PROPOSTA_GOLD.md`,
e o dossiê factual do produto em `medflow/docs/entrega_sprint_2/CONTEXTO_TIME.md`.

---

## 1. Existem duas avaliações, e elas não são a mesma

Confundi-las leva a otimizar a coisa errada. A sequência está escrita nas
regras gerais, na seção "Critérios de avaliação da
sprint 2":

1. o professor tutor e o scrum master avaliam **individualmente todos os
   trabalhos entregues**, pela Tabela 1 da seção 3;
2. dessa avaliação saem os **6 melhores grupos da série**;
3. esses 6 são os **finalistas (Top 6)** e apresentam ao vivo pelo Microsoft
   Teams para a banca da Oracle, entre **14 e 18/09/2026, às 19h30**;
4. a banca escolhe os **3 melhores**, que apresentam no evento NEXT 2026.

| | Quem avalia | Quando | O que decide |
|---|---|---|---|
| **Nota** | tutor e scrum master, sobre os artefatos entregues | após 01/09 | a nota, e quem entra no Top 6 |
| **Seleção** | banca da Oracle, ao vivo | 14 a 18/09, só para o Top 6 | os 3 finalistas do NEXT |

**Consequência para a entrega de 01/09:** "apresentação" quer dizer o PPT e o
vídeo. A apresentação ao vivo é prêmio de quem passar, não requisito da nota.
Os critérios D2 e D3 da seção 8, domínio coletivo e ensaio, valem para o
cenário Top 6, e não para a nota da entrega.

## 2. Regras de forma, que não se negociam

Falhar aqui custa ponto sem discussão técnica.

- Entrega no portal **FIAP ON**, em **um único arquivo ZIP**. Links não
  substituem os arquivos dentro do ZIP.
- Planilha final: `Informacoes_Finais_Projeto_Integrantes_v1.xlsx`, com os cinco
  integrantes, RM e ordem alfabética, e o representante indicado.
- PPT nomeado na convenção oficial:
  `EC_Sprint_2_1TSCO_EvidenciasConstrucao_MedFlow_OmegaUrbanTech.pptx`. A
  Sprint 1 seguiu a convenção à risca e tirou 10.
- Vídeo hands-on publicado no **YouTube**, com **até 5 minutos**, e o **link
  dentro do PPT**. O link no PPT é regra, não acabamento.

## 3. Pesos, e o que cada item avalia de fato

Tabela 2 das regras gerais, transcrita:

| Avaliação | Peso |
|---|---:|
| Apresentação em PowerPoint / Canvas / PDF com os tópicos do pitch | 10% |
| Entrega do vídeo pitch com link no Youtube | 10% |
| Link da aplicação funcionando | 10% |
| Fontes do projeto ou link público do Github | 20% |
| **Avaliação técnica do vídeo pitch** e, caso seja um grupo finalista, apresentação obrigatória para a banca | **50%** |

**Leia a última linha devagar.** Os 50% são a avaliação técnica **do vídeo
pitch**. A apresentação para a banca só entra nesse peso se o grupo for
finalista. Somando com os 10% da entrega do vídeo, **o vídeo responde por 60%
da nota da Sprint 2**, e é o entregável mais pesado de todos.

### Os cinco critérios técnicos, da Tabela 1

O que o tutor e o scrum master aplicam sobre cada trabalho entregue:

| Critério | Pergunta |
|---|---|
| **Alinhamento com o objetivo** | a solução está adequada ao tema e ao público-alvo, técnico e de negócio? |
| **Inovação** | comparado ao que a parceira tem hoje, houve melhoria? Quanto o grupo foi além do esperado, considerando que são estudantes? |
| **Usabilidade** | o projeto é fácil de usar, claro e intuitivo? |
| **MVP em funcionamento** | a solução foi apresentada com as funcionalidades esperadas? |
| **Condução da apresentação** | houve boa elaboração dos slides, capacidade de síntese, **oratória** e clareza? |

O último critério confirma a leitura do peso: oratória e síntese só existem no
vídeo, para quem não é finalista.

## 4. Conteúdos obrigatórios

Para cada item abaixo, alguém precisa apontar o slide ou o arquivo em menos de
dez segundos.

- planejamento da Sprint 1 atualizado;
- MVP funcional, com capturas e explicação das funcionalidades;
- arquitetura final, **distinguindo implementado de planejado**;
- modelos analíticos e técnicas empregadas;
- evidências visuais;
- repositório técnico e código-fonte;
- aplicação ou relatório com link navegável;
- resultados, conclusão e próximos passos;
- PPT final, vídeo hands-on e planilha final de integrantes.

## 5. Critérios de avaliação nomeados nas fontes oficiais

As regras gerais registram cinco, sob o título "A avaliação vai ser feita pelo
time da Oracle e será considerado":

- **Clareza na definição do problema.** O grupo explicou com precisão qual
  pergunta de negócio quer responder?
- **Uso correto dos formatos dos arquivos.** Tabela relacional, JSON e CSV
  foram usados com propósito claro e justificado?
- **Valor para decisão.** Os resultados ajudam a priorizar ações, regiões ou
  investimentos em saúde?
- **Storytelling.** A apresentação é simples, clara e fácil de acompanhar pelo
  avaliador?
- **Perguntas com Select AI.** As perguntas em linguagem natural são úteis e
  conectadas ao problema de negócio?

O último item merece atenção. A mentoria disse que o Select AI não recebe nota
da FIAP, o que continua verdade, e ele **é critério nomeado da Oracle**. As duas
coisas convivem, e é exatamente a separação da seção 1.

O critério dos três formatos é o mais fácil de perder por omissão, porque o
projeto usa os três e pode não dizer isso em lugar nenhum. Os papéis são:

| Formato | Fonte | Papel |
|---|---|---|
| Relacional | SIH/RD e as tabelas Gold | fatos, dimensões, indicadores e consultas |
| JSON | API atual do CNES | cadastro do estabelecimento e atributos variáveis |
| CSV / External Table | regiões de saúde e população IBGE 2022 | taxas populacionais e integração no Oracle |

## 6. As quatro frentes que a Oracle pede

O material oficial não prescreve os cinco índices do MedFlow, que são proposta
da equipe. O que a Oracle pede que a solução cubra é isto:

1. exploração inicial, sazonalidade, rankings e comparações;
2. indicadores de capacidade que combinem internações, permanência e estrutura;
3. **padrões ou agrupamentos** de hospitais e regiões;
4. explicabilidade em linguagem de gestão.

A terceira frente é a que o material do projeto tende a não reivindicar, porque
o time associa "padrões e agrupamentos" a clustering, que está fora do MVP. O
que responde a frente sem inventar ML: os 19 grupos ICSAP, a matriz origem e
destino, a distribuição regional do IPR e a classificação de sazonalidade.

## 7. O que a mentoria de 07/06 acrescenta

A transcrição é automática e tem erros de reconhecimento de voz. Os pontos
abaixo aparecem de forma consistente e mudam decisões.

**Sobre propósito e escopo**

- Começar pela pergunta e pela persona, nunca pela ferramenta. O professor cita
  o TED do Simon Sinek sobre o porquê vir antes da solução.
- "Vestir os pés do cliente." O objetivo não é um sistema maravilhoso, é algo
  simples que produz resultado.
- Uma ou duas respostas acionáveis valem mais que um painel carregado de
  indicadores que ninguém lê.
- O escopo precisa ficar explícito nos dois lados: o que a equipe vai dar conta
  de desenvolver e o que não vai.
- Cuidado ao cortar funcionalidade. O desafio é o mesmo para todos os grupos, e
  a ideação é o que diferencia. O professor chama isso de "o tempero".
- Qualidade e propósito valem mais que volume de dados.

**Sobre os dados**

- Sair do paradigma "estruturadinho". A arquitetura da Sprint 2 precisa prever
  que parte da informação entra no OCI no formato de origem, o JSON incluído.
- O banco convergente e poliglota é o argumento da Oracle: várias fontes no
  mesmo repositório, sem movimentação cara de dado.
- O ciclo da solução acompanha o ciclo de vida do dado. Carga inicial e
  atualização incremental são coisas diferentes e precisam ser ditas.
- Indisponibilidade de terceiro é fato, não acidente. O desenho esperado é um
  acordo declarado: com a fonte no ar a entrega é A, B e C; sem ela, é A e B.
- Dado sintético é válido para completar lacuna, desde que declarado.

**Sobre o beneficiário**

Mesmo quando o usuário é o gestor, quem colhe o benefício é a população
atendida. O material ganha quando diz isso.

**Sobre a apresentação**

- É pitch, não arguição. "Vocês são testados a mostrar o trabalho e vender esse
  trabalho." O enquadramento oferecido é Shark Tank e entrega de projeto para um
  diretor.
- Ensaio é técnica, não zelo. O professor cita Steve Jobs repetindo mais de
  trinta vezes e a Disney sincronizando fala e animação.
- "Informação não é aquilo que você fala, é aquilo que o outro entende."
- A banca olha os cinco como profissionais, e testa se a equipe entende e
  consegue defender tudo o que apresenta.

**A pergunta do nome**

O avaliador conta que a primeira pergunta que fez a outro grupo foi o
significado da sigla da empresa, e que as cinco pessoas não souberam responder.
Ele usa o caso como exemplo de time que usou IA para deixar tudo bonito sem
dominar o próprio trabalho. Os cinco precisam da resposta na ponta da língua:
**MedFlow é marca, não sigla.** Med de saúde e do contexto médico-hospitalar,
Flow do fluxo do dado pelas camadas e do fluxo assistencial entre territórios.

**Select AI é cereja do bolo**

Dito na mentoria: o Select AI não recebe nota, e usar ou não usar não torna o
projeto melhor ou pior aos olhos da FIAP. Ele continua valioso para a seleção da
Oracle, porque é feature dela. A consequência para o material: o Select AI não
deve ocupar espaço que falta aos conteúdos obrigatórios da seção 4.

**Previsibilidade**

A professora encerra a sessão dizendo que previsibilidade é a palavra-chave do
curso de data science. O MedFlow não faz previsão nem ML, e essa é uma decisão
defensável. Declarar a ausência não basta: sem argumento, "não fazemos previsão"
é ouvido como lacuna. O argumento tem três partes:

1. prever sobre dado administrativo com reapresentação retroativa produz número
   bonito e falso;
2. o produto entrega comparação sazonal contra dois anos-base e benchmark
   elegível, que respondem a mesma necessidade sem fingir precisão;
3. o caminho honesto até previsão passa por série mais longa e validação com
   usuários, e está declarado como evidência futura.

## 8. Os dezoito critérios de aceite

Cada critério tem um objetivo verificável e um teste de um minuto. Use esta
seção como lista de conferência ao olhar cada entregável.

### Bloco A: o porquê

| # | Objetivo | Teste |
|---|---|---|
| A1 | O problema cabe numa frase, dita do lado de quem sofre dele | Leia só o slide do problema para alguém de fora e peça para repetir. Se "pipeline" ou "dado" aparecer antes de "gestor" ou "decisão", falhou |
| A2 | Uma persona só, presente do começo ao fim | Conte em quantos slides ela aparece. Se sumir justamente onde a jornada dela acontece, falhou |
| A3 | O beneficiário final aparece, mesmo não sendo o usuário | Procure uma menção à população atendida |
| A4 | Qualquer um dos cinco explica o nome sem hesitar | Pergunte a cada um, separadamente, o que significa MedFlow |

### Bloco B: o dado

| # | Objetivo | Teste |
|---|---|---|
| B1 | Os três formatos têm papel visível e intencional | Busque "relacional", "JSON" e "External Table" no PPT |
| B2 | O escopo é declarado nos dois lados | Procure a lista do que ficou fora: tempo real, ocupação real, custo contábil, prontuário, regulação |
| B3 | O ciclo do dado e o acordo de indisponibilidade estão declarados | Procure "contingência" ou "snapshot" no PPT |

### Bloco C: a solução

| # | Objetivo | Teste |
|---|---|---|
| C1 | As quatro frentes da Oracle têm resposta nomeada | Aponte o slide de cada uma. A terceira é a que costuma faltar |
| C2 | A arquitetura distingue implementado de planejado | Mostre o diagrama e pergunte o que já funciona |
| C3 | Existe algo tangível, demonstrável ao vivo | Abra o link público num navegador limpo, sem login |
| C4 | A posição sobre previsibilidade é decisão argumentada | Pergunte "cadê a previsibilidade?" e confira as três partes da seção 7 |
| C5 | O diferencial cabe numa frase e é dito cedo | Pergunte aos cinco qual é o diferencial. Cinco respostas diferentes reprovam |

### Bloco D: a entrega da mensagem

| # | Objetivo | Teste |
|---|---|---|
| D1 | É pitch, não relatório | Marque o ponto onde a curiosidade morre e conte quantos slides de prova seguida vêm depois |
| D2 | Os cinco respondem o transversal, não só a própria camada | Sorteie integrante e pergunta do `QA_BANCA.md` |
| D3 | Foi ensaiado como conjunto, com cronômetro | Conte quantos ensaios completos aconteceram |
| D4 | O feedback da Sprint 1 é respondido explicitamente | Procure a menção ao feedback no material |

### Bloco E: a forma

| # | Objetivo | Teste |
|---|---|---|
| E1 | Todo conteúdo obrigatório tem lugar identificável | Percorra a seção 4 com o deck aberto |
| E2 | A embalagem obedece à regra sem interpretação | Baixe o próprio ZIP num diretório limpo e abra tudo |

## 9. Invariantes: números que precisam concordar entre si

Divergência entre PPT, vídeo, repositório e fala é o defeito mais caro, porque
destrói a credibilidade do conjunto sem que nenhum número esteja isolado errado.

Conferidos contra o banco e o repositório em **29/08/2026**. Os de Oracle e API
saíram de consulta ao próprio Autonomous Database, não de documento.

| Invariante | Valor único |
|---|---|
| Período | 2024-01 a 2026-06; 30 competências; 2026 parcial até junho |
| Volumetria | 7.284.476 AIHs; 7.150.693 internações novas; 655 hospitais; 645 municípios; 62 regiões; 19 macrorregiões |
| Oracle | 597.930 linhas; schema `MEDFLOW`; 12 tabelas — 5 dimensões e 7 marts; views sem recálculo |
| Gate Oracle | 47 de 47 portões |
| Validação completa | 8.403.103 comparações; zero divergências |
| API | 11 endpoints: 10 `GET` e o `POST` do assistente, em `api/v1` |
| Produto | duas páginas e quatro visões; seis indicadores, com o IPE |
| Select AI | roteiro de 13 perguntas em cinco blocos; o bloco A, de cinco, tem evidência comparativa fechada em três |
| FlowIA | bateria de 20 perguntas humanas: 20 de 20 |
| Testes | 204 testes Python passam sem credencial nenhuma |
| Release | `v1.0.1`, publicada em 29/08/2026; contrato de dados `0.5.0` |
| Preflight | 12 de 12 |

Referências antigas a 2026-05, 585.296 ou 597.725 linhas, 653 hospitais, 29
competências, 8.257.139 comparações, 9 tabelas, 2 dimensões, 10 endpoints,
185 testes, `v0.3.1` ou "quatro visões" sem as duas páginas descrevem estados
históricos e não podem aparecer.

**Duas armadilhas de contagem**, que já produziram divergência entre slides:

- **tabelas.** O contrato da Gold tem 9 estruturas, e é o que
  `VALIDACAO_TECNICA.md` reporta. O schema carregado tem **12**, porque as três
  dimensões territoriais entraram por migração aditiva depois do contrato. Para
  o público, o número é 12.
- **endpoints.** São 10 `GET` mais 1 `POST`. Dizer "10 endpoints" omite o
  assistente; dizer "11 endpoints GET" é falso. O par certo é "10 GET e o POST
  do assistente", ou "onze endpoints".

## 10. Limites de alegação

O que o dado sustenta, e o que seria alegação sem lastro.

| Fato | Leitura correta | Alegação proibida |
|---|---|---|
| IPH usa pacientes-dia e leitos-dia SUS declarados | pressão estimada sobre capacidade declarada | taxa de ocupação real |
| CMI usa valores aprovados pelo SUS | valor médio aprovado por internação | custo da internação ou margem |
| TMH é óbito sobre internação nova | mortalidade administrativa, sem ajuste de risco | prova de qualidade ruim ou causalidade |
| IPR compara com benchmark regional elegível | sinal de permanência relativa | prova de ineficiência |
| Fluxo é observado em SP | evasão intrastadual observada | evasão total do residente |
| ICSAP segue a Portaria 221/2008 | sinal populacional indireto | internação comprovadamente evitável |
| IS compara 2026 aos mesmos meses de 2024 e 2025 | comparação sazonal | previsão ou modelo sazonal |
| 8.403.103 comparações sem divergência | consistência campo a campo no método executado | prova de impacto, causalidade ou ausência de defeito |
| O MVP foi validado tecnicamente | viabilidade e coerência no recorte | produto validado por gestores |
| MedFlow combina saúde e fluxo | nome de marca | sigla ou acrônimo |

## 11. O feedback da Sprint 1

Nota **10,00 / 10,00**, entregue em 16/06/2026. O professor escreveu:

> O trabalho apresentou todos os itens obrigatórios, com contextualização,
> público-alvo e arquitetura bem descritos. Para as próximas etapas, o ponto de
> atenção é aprofundar tecnicamente os diferenciais e apresentar prototipação
> funcional.

Os dois pedidos foram cumpridos com folga: o produto está público e navegável, e
os diferenciais têm contrato, reconciliação e teste. Cobrar esse crédito em voz
alta é barato e conversa direto com quem avalia. É o critério D4.

## 12. Protocolo de revisão, por entregável

**PPT.** Percorra a seção 4 apontando slide por item. Depois os blocos A, B, C e
E1 da seção 8. Por fim, confira cada número contra a seção 9 e cada frase de
resultado contra a seção 10.

**Repositório.** Abra o link como quem nunca viu o projeto. Em trinta segundos
de README, você precisa saber que problema resolve, para quem, e o que os três
formatos de dado fazem ali. Depois clone num diretório limpo e rode
`make setup && make test`. O número que sair tem de bater com o slide.

**Link público.** Abra a raiz em janela anônima, sem cache nem login. Divulgue a
raiz, nunca o link profundo: o GitHub Pages responde 404 antes de servir o
`index.html` em rota interna, e uma checagem automática lê isso como quebrado.

**Vídeo.** É 60% da nota, somando a entrega e a avaliação técnica. Até 5
minutos, no YouTube, com o link dentro do PPT. Escolha uma espinha, WebApp ou
Select AI, antes de gravar. Como a Tabela 1 avalia oratória e capacidade de
síntese, o roteiro e o ensaio da narração pesam tanto quanto o que aparece na
tela.

**ZIP.** Monte com `montar_zip_entrega.sh`, que recusa fechar enquanto o
`VIDEO_URL` não for uma URL real do YouTube. Depois baixe o próprio ZIP num
diretório limpo e abra cada arquivo.

**Banca.** Rode `make preflight` na véspera e no dia. Sorteie perguntas do
`QA_BANCA.md` entre os cinco. Ensaie o conjunto inteiro com cronômetro, pelo
menos três vezes, que é o critério D3.

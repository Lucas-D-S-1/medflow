# MedFlow: roteiro do vídeo e dos ensaios

Versão de **29/08/2026**, escrita contra `CRITERIOS_DE_REVISAO.md` e contra o
produto `v1.0.1` no ar. Substitui a versão anterior, que tinha as janelas de
tempo mas não a narração, e ainda descrevia o Select AI como capacidade solta.

## Por que este roteiro é o entregável mais caro

Pela Tabela 2 das regras gerais, o vídeo responde por **60% da nota**: 10% pela
entrega e 50% pela avaliação técnica do pitch. E a Tabela 1 avalia
**oratória e capacidade de síntese** — que, para quem não é finalista, só
existem aqui. Por isso este documento traz o texto falado, e não só o que
aparece na tela: o que se diz pesa tanto quanto o que se mostra.

Regras de forma, que não se negociam:

- **até 5 minutos**, publicado no **YouTube**;
- **o link vai dentro do PPT**, no slide final, antes de gerar o ZIP;
- o vídeo é *hands-on*: mostra o produto funcionando, não slides narrados.

**A espinha escolhida é o WebApp**, com a FlowIA como o momento alto. O
`CRITERIOS_DE_REVISAO.md` manda escolher uma espinha antes de gravar, e esta é
a que atende mais critérios de uma vez: o MVP funcionando, a usabilidade, o
valor para decisão e as perguntas em linguagem natural.

## A narração, minuto a minuto

Ritmo de referência: **150 palavras por minuto**. O texto abaixo soma cerca de
**720 palavras**, o que fecha em 4min50s e deixa dez segundos de margem. Falar
mais devagar é melhor que cortar conteúdo — se estourar, o corte sai da
janela 9, não da 7.

A coluna **Critério** aponta o que aquele trecho está respondendo, na numeração
de `CRITERIOS_DE_REVISAO.md`.

---

### 1. O problema, do lado de quem sofre dele — `0:00–0:23`

**Tela:** slide 1, depois já o produto.
**Critério:** A1, A3, e "clareza na definição do problema".

> Todo mês o SUS publica os dados das internações de São Paulo. Eles são
> públicos, abertos, e chegam sozinhos. Mas vivem em bases separadas, e juntá-los
> custa tempo — então normalmente só são abertos depois que alguém já reclamou.
> O gestor descobre o problema pelo telefone, não pelo dado. Quem paga essa
> demora é a população atendida.

**Não diga** "pipeline", "camada" ou "ETL" nestes vinte segundos. Se a primeira
palavra técnica vier antes de "gestor", o critério A1 falhou.

### 2. O nome e o diferencial, numa frase — `0:23–0:41`

**Tela:** abertura do produto.
**Critério:** A4, C5.

> MedFlow é marca, não sigla: Med de saúde, Flow do fluxo do dado e do fluxo do
> paciente entre territórios. E o diferencial cabe numa frase: todo número que
> aparece na tela vem com a fórmula, a amostra e o limite dele ao lado.

### 3. Território: onde olhar primeiro — `0:41–1:20`

**Tela:** raiz pública, competência 06/2026.
**Critério:** C3, frente 1 da Oracle, usabilidade.

> Esta é a aplicação, no ar, com as 62 regiões de saúde de São Paulo. O mapa está
> colorido pelo placar de sinais: o tom mais claro é o melhor do recorte, o mais
> escuro é o pior. Não é nota de qualidade — é um placar para priorizar
> investigação. Clico em Jundiaí, que está entre as mais escuras. O cartão abre
> com a pressão hospitalar estimada em 67%, quatro mil seiscentas internações
> novas, e mortalidade observada de 3,9%. Pressão estimada sobre a capacidade
> declarada no CNES: não é taxa de ocupação real, e a tela diz isso.

**Ação:** abrir a **raiz** do site, nunca o link profundo — o GitHub Pages
responde 404 em rota interna antes de servir o `index.html`.

### 4. A série, e a posição sobre previsibilidade — `1:20–1:45`

**Tela:** série mensal da região.
**Critério:** C4, frente 1.

> A série mensal responde outra pergunta: se o sinal é deste mês ou já vinha de
> antes. E aqui vale dizer o que o MedFlow não faz: não faz previsão. Prever
> sobre dado administrativo, que é reapresentado retroativamente, produz número
> bonito e falso. O que entregamos no lugar é comparação contra os mesmos meses
> de 2024 e 2025, e benchmark entre pares elegíveis.

### 5. Hospital e pares: a régua que fixa o porte — `1:45–2:30`

**Tela:** página do hospital, painel de comparação com pares.
**Critério:** frentes 2 e 3, inovação, valor para decisão.

> Descendo da região para o hospital, o número deixa de ser um valor solto e
> ganha uma régua. Comparo este hospital com os pares da mesma faixa de leitos,
> na mesma região — e a tela escreve o critério e nomeia os pares. O porte nunca
> sai do critério, e tem um motivo concreto: o Hospital de Base de São José do
> Rio Preto tem 876 leitos numa região cuja mediana é 25. Comparado com a própria
> região, ele aparecia com permanência 66% acima dos pares, e o grupo de
> comparação incluía um hospital com uma internação no mês. Contra os hospitais
> do mesmo porte no estado, ele fica melhor que 75% deles.

### 6. Especialidades e o IPE — `2:30–2:56`

**Tela:** tabela de especialidades do hospital.
**Critério:** frente 3, MVP em funcionamento.

> Descendo mais um grau, o índice de permanência por especialidade compara este
> hospital com os pares da mesma especialidade, com ele próprio fora do
> benchmark. Acima de 1 significa permanência maior que a dos pares — e só isso.
> Não é medida de qualidade nem de desfecho: não há ajuste de risco, e onde a
> amostra não alcança o corte a tela diz "insuficiente", não zero.

### 7. FlowIA: a pergunta em português — `2:56–3:34`

**Tela:** widget da FlowIA, na página do hospital.
**Critério:** frente 4, e "perguntas com Select AI" — critério nomeado da Oracle.

> A FlowIA é o assistente do produto, e por baixo dela está o Select AI do
> Oracle. Pergunto do jeito que se pergunta: "quem segura o paciente por mais
> tempo?". Não citei tabela, coluna nem indicador. Ela lê o contexto da tela,
> escolhe a permanência média, aplica o corte de amostra e fixa a competência —
> e devolve cinco hospitais nomeados. E aqui está o que importa: o SQL que ela
> gerou fica a um clique, auditável. A narrativa nunca é a fonte da verdade;
> ela só é liberada depois que o SQL é conferido.

**Ação:** deixar o `Ver SQL gerado e validado` **aberto** na tela por três
segundos. É a prova do diferencial, e é o que a banca da Oracle procura.

**Se a cota do dia tiver acabado**, ou o modelo demorar, corte para a captura
`capturas/flowia-ao-vivo.png` e narre por cima. Não improvise outra pergunta no
ar: a resposta pode variar e o roteiro perde o tempo.

### 8. Metodologia: reconciliação e limites — `3:34–3:58`

**Tela:** página de Metodologia.
**Critério:** B2, seção 10 inteira.

> Esta página existe para responder de onde vem cada número. O conteúdo servido
> pela aplicação foi comparado campo a campo com a camada Gold: oito milhões e
> quatrocentas mil comparações, zero divergências. E os limites estão no mesmo
> lugar, com o mesmo destaque: o que ficou de fora é tempo real, ocupação real
> de leito, custo contábil, prontuário e regulação.

### 9. Arquitetura, formatos e repositório — `3:58–4:25`

**Tela:** slide de arquitetura, depois o GitHub.
**Critério:** B1, B3, C2, e os 20% de fontes do projeto.

> Por trás disso: Bronze preserva a fonte, Silver conforma, Gold calcula, e o
> Oracle 26ai armazena — 597 mil linhas em doze tabelas, servidas por onze
> endpoints somente leitura. Os três formatos têm papel: relacional no SIH,
> JSON na API do CNES, CSV como external table para o IBGE. Se a fonte cair, a
> tela avisa que está em contingência. O código é público, com 204 testes.

### 10. Fechamento — `4:25–4:50`

**Tela:** slide final, com o link do produto visível.
**Critério:** D4, resultados e próximos passos.

> Na Sprint 1 o retorno pedia aprofundar os diferenciais e mostrar prototipação
> funcional. É o que este vídeo mostrou: o produto está público e navegável, e
> cada diferencial tem contrato, reconciliação e teste. O MedFlow não decide nem
> prova causa — ele diz onde investigar primeiro, e entrega a hipótese
> documentada para quem decide. Saúde que flui, tecnologia que transforma.

---

## Regras da gravação

**Vocabulário proibido.** Estas frases custam credibilidade na hora:

- IPH **não** é taxa de ocupação nem ocupação real;
- IPE e IPR **não** são nota de qualidade nem desfecho clínico;
- CMI **não** é custo da internação nem margem;
- TMH **não** prova qualidade ruim nem causalidade;
- ICSAP **não** é internação comprovadamente evitável;
- nada de impacto, ganho de tempo ou "validado por gestores".

**Tela limpa.** Sem senhas, tokens, wallet, `.env`, cabeçalhos de autenticação,
URLs de sessão ou abas pessoais. Janela anônima, uma aba.

**Coerência.** Usar a mesma região do começo ao fim, a mesma que aparece nos
slides. Identificar quando a fonte está em Oracle ao vivo ou em contingência.

**Antes de gravar:** rodar `make preflight` no `medflow` e confirmar 12 de 12.

**Depois de publicar:** assistir ao vídeo inteiro, conferir a duração, e colar
a URL no slide final **antes** de montar o ZIP.

## Os números que o vídeo pode dizer

Conferidos no banco e no repositório em 29/08/2026. Se o número não estiver
aqui, não diga no vídeo.

| | Valor |
|---|---|
| Período | 2024-01 a 2026-06, 30 competências, 2026 parcial |
| Cobertura | 655 hospitais, 645 municípios, 62 regiões, 19 macrorregiões |
| Bronze | 7.284.476 linhas SIH/RD, 251.457 CNES/LT |
| Oracle | 597.930 linhas em 12 tabelas: 5 dimensões e 7 marts |
| API | 11 endpoints: 10 GET e o POST do assistente |
| Produto | duas páginas, quatro visões, seis indicadores |
| Reconciliação | 8.403.103 comparações, zero divergências |
| Gate Oracle | 47 de 47 |
| Testes | 204 testes Python, sem credencial |
| FlowIA | bateria de 20 perguntas humanas, 20 de 20 |
| Release | `v1.0.1`, contrato de dados `0.5.0` |

## O caso que vale guardar para a arguição

Se a banca pedir um exemplo concreto de rigor, o Hospital de Base de São José do
Rio Preto é o melhor: 876 leitos numa região cuja mediana é 25. Comparado com os
hospitais da própria região, ele aparece com permanência 66% acima dos pares na
clínica médica — e o benchmark inclui um hospital com uma internação no mês.
Comparado com os hospitais do mesmo porte, fica melhor que 75% deles, com
mortalidade abaixo da mediana e custo médio 62% acima: recebe o caso complexo e
o resolve mais rápido.

É o argumento de por que o porte não sai do critério de pares, e de por que o
produto nomeia os pares na tela.

## O segundo caso, se perguntarem da IA

A bateria de 20 perguntas humanas reprovou **inteira** em 26/08 — zero de vinte.
As perguntas são curtas, vagas e coloquiais de propósito, e o contexto vem só da
tela. Hoje passa 20 de 20, depois de sete defeitos achados e corrigidos.

O melhor deles para contar: perguntando **no site publicado**, a FlowIA devolveu
o mesmo hospital cinco vezes, um por mês, porque o ranking não fixava a
competência quando o widget ainda não a tinha carregado. **A bateria nunca
acharia** — ela sempre envia a competência. Foi preciso perguntar como um
usuário pergunta.

Isso responde bem à pergunta "como vocês sabem que a IA não está inventando?".

## Três passadas de ensaio

### Passada 1: conteúdo e transições

- [ ] Os cinco integrantes explicam o problema, a persona e a decisão apoiada.
- [ ] Cada pessoa responde às perguntas de `QA_BANCA.md`, não apenas à própria
      camada.
- [ ] Os cinco explicam o nome MedFlow sem hesitar — é a pergunta que a mentoria
      contou que derrubou outro grupo.
- [ ] A investigação mantém a mesma região do território até a hipótese.
- [ ] Todos diferenciam demanda, produção, fluxo, IPH, IPR, IPE, TMH e CMI.
- [ ] Todos sabem dizer por que o grupo de pares fixa o porte.
- [ ] Os limites são ditos sem diminuir a entrega técnica.

### Passada 2: cronômetro e interrupções

- [ ] O vídeo cabe em 4min50s e reserva dez segundos de margem.
- [ ] A narração foi cronometrada em voz alta, não lida em silêncio.
- [ ] Uma pessoa interrompe com perguntas sobre Oracle, formatos, Select AI,
      ausência de previsão e falta de validação com usuários.
- [ ] As respostas são curtas, coerentes e não contradizem o dossiê.

### Passada 3: preflight final

- [ ] Produto e endpoints abrem em janela anônima.
- [ ] `make preflight` passa no repositório `medflow`: 12 de 12.
- [ ] A FlowIA responde no site, com o SQL abrindo na tela.
- [ ] O link do YouTube abre sem autenticação e está clicável no slide final.
- [ ] PPTX, planilha e ZIP têm os nomes oficiais.
- [ ] O ZIP é extraído em uma pasta vazia e os dois arquivos de entrega abrem.
- [ ] Cada integrante sabe onde estão código, fontes, fórmulas, testes e limites.

## O que este roteiro cobre, dos 18 critérios de aceite

| Critério | Onde |
|---|---|
| A1, A3 | janela 1 |
| A4, C5 | janela 2 |
| C3, usabilidade | janela 3 |
| C4 | janela 4 |
| C1 frentes 1 a 4 | janelas 3, 5, 6 e 7 |
| B2 | janelas 6 e 8 |
| B1, B3, C2 | janela 9 |
| D4 | janela 10 |
| D1 | a espinha é uma investigação só, do mapa à hipótese |
| D2, D3 | passadas 1 e 2 |
| E1, E2 | passada 3 |

**A2 — persona única — é o que este roteiro mais arrisca.** A narração fala do
gestor na janela 1 e some com ele até o fim. Ao gravar, retomar "o gestor" em
voz alta pelo menos nas janelas 3, 5 e 7, onde a jornada dele acontece.

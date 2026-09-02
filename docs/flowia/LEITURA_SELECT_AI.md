# O que a revalidação do Select AI mostrou

Análise dos resultados resumidos em
[`REVALIDACAO_SELECT_AI.md`](REVALIDACAO_SELECT_AI.md). Os dois documentos
são curados: um apresenta os casos e resultados; este discute causas e
consequências arquiteturais. A saída integral da execução é local e não é
versionada. Atualizado em 23/08/2026.

## Por que a primeira bateria não servia

A primeira versão fazia cinco perguntas, todas agregação de uma tabela só, e
passava nas cinco. O problema é que uma bateria que só faz perguntas fáceis não
mede a ferramenta: mede a facilidade das perguntas. E a conferência
entre o SQL gerado e o de referência era feita a olho, o que responde mal à
única pergunta que importa: *como se sabe que ele acertou?*

A suíte atual tem treze perguntas em cinco blocos de dificuldade crescente,
oito delas com SQL de referência conferido **por execução**: as duas consultas
rodam e as respostas são comparadas pela sequência ordenada de rótulos. Os
outros cinco casos não perguntam por um número. Perguntam o que o modelo faz
quando a pergunta é uma armadilha, quando depende do turno anterior e quando ele
não tem os dados na frente.

## Resultado

**Seis das oito perguntas conferidas devolveram exatamente a resposta da
referência**: mesmos rótulos, mesma ordem. Isso cobre todo o bloco A e a
pergunta de custo do bloco B, inclusive a distinção entre CMI nominal e CMI
corrigido pelo IPCA, que o modelo resolveu sem recalcular a correção.

As duas divergências e a armadilha que falhou são achados reais, e valem mais
que os seis acertos.

### 1. O modelo não agrega antes de ranquear

É a causa comum de B1 e B2. Os marts são mensais: uma linha por região e
competência. Perguntado pelas cinco regiões de maior pressão em 2026, o modelo
ordenou as **linhas mensais** e pegou as cinco primeiras: que colapsam em duas
regiões, porque uma mesma região ocupa vários dos meses mais extremos. O mesmo
erro em B2 trocou o hospital do topo.

Não é falta de contexto. O `COMMENT ON` de `pc_iph_estimado` já dizia, antes
desta rodada, para filtrar o ano, agrupar por região e ordenar pela média. Foi
reforçado no comentário das três tabelas, dizendo o grão em uma frase e pedindo
agregação antes do ranking. **O erro permaneceu.**

A conclusão é a que importa para a arquitetura: comentário de coluna orienta o
modelo, não o obriga. Texto-para-SQL erra justamente onde a pergunta exige uma
etapa intermediária que ninguém enunciou. E "primeiro agregue, depois ordene" é
exatamente esse tipo de etapa.

### 2. O modelo aceita o vocabulário errado da pergunta

C1 pergunta pela "taxa de ocupação de leitos" de cada região. O MedFlow não mede
ocupação: mede IPH, pressão estimada sobre a capacidade SUS declarada no CNES.
O modelo escolheu a coluna certa (usou o IPH) e **narrou o número com o rótulo
errado da pergunta**, sem ressalva.

Os comentários de `nr_iph_estimado` e `pc_iph_estimado` foram reescritos para
proibir o vocabulário nome por nome, e o comentário da tabela regional passou a
instruir a resposta correta. O SQL melhorou; a narrativa não. **O `COMMENT ON`
governa bem a geração de SQL e mal a redação da resposta.**

É por isso que a decisão de arquitetura de não deixar o Select AI comandar as
visões principais se sustenta. As telas do produto usam consultas
determinísticas sobre a Gold; perguntas livres passam por guarda, avisos e
rastro. Este achado não contradiz essa decisão. É a evidência que a justifica.

### 3. A conversa não sobrevive ao turno seguinte

D1 pergunta a região de maior pressão em 2026 e, em seguida, "e em 2025?". O
perfil tem `conversation` ligado, mas o seguimento perdeu o indicador e devolveu
CMI e TMH de várias regiões. Pelo `DBMS_CLOUD_AI.GENERATE`, cada chamada se
comporta como pergunta isolada.

Consequência prática: **o contrato não depende do turno anterior.** Cada
pergunta precisa ser autossuficiente e recebe o contexto estruturado da tela.

### 4. O que funcionou bem

- **C2 e C3, as duas outras armadilhas, foram recusadas corretamente.**
  Perguntado quantos pacientes estão internados "neste momento", o modelo
  respondeu que a base não tem dado em tempo real e que as informações são
  mensais. Perguntado pelo Rio de Janeiro, respondeu que o recorte é São Paulo.
  Nos dois casos ele preferiu não responder a inventar, que é o comportamento
  desejado.
- **E1 é a evidência mais clara da ancoragem.** A mesma pergunta vai ao `chat`, sem os
  dados, e ao `narrate`, com eles. Sem os dados, o modelo diz que não tem como
  saber e sugere procurar a Secretaria Estadual, o Ministério e o DATASUS. Com
  os dados, responde `LIMEIRA, 78,46%`. A distância entre as duas respostas é o
  argumento inteiro de por que o Select AI está ancorado no modelo semântico da
  Gold, e não solto.

## Um ajuste no próprio verificador

A varredura de terminologia reprovava a resposta certa. Uma boa recusa precisa
nomear o que está recusando ("as bases **não** fornecem dados em **tempo
real**" contém o termo proibido), e procurar a palavra e pronto transformava o
acerto em alarme. Duas correções:

- a saída do `chat` saiu da varredura: ali o modelo responde sem os dados, e
  dizer que não tem informação em tempo real é a resposta correta;
- dentro do `narrate`, mencionar deixou de ser afirmar. Uma ocorrência só conta
  como violação quando aparece sem negação na janela anterior e o texto não traz
  a ressalva que corrige o sentido.

As duas regras estão fixadas em `tests/test_select_ai.py`, junto com o guarda
que decide se o SQL vindo do modelo pode tocar o banco.

## Consequências incorporadas ao produto

1. Cada pergunta é autossuficiente e recebe contexto estruturado; o backend não
   promete memória implícita de conversa.
2. “Taxa de ocupação” dispara ressalva porque o dado sustenta IPH, não ocupação
   física.
3. Casos com agregação anterior ao ranking permanecem na suíte de regressão e
   não viram consultas determinísticas da interface.
4. O contraste entre `chat` e `narrate` permanece como teste da ancoragem na
   Gold.
5. SQL, narrativa, aviso e resultado ficam ligados pelo mesmo ID de auditoria.

# Entrega da Sprint 2 — material do time

Tudo o que o time precisa para fechar a entrega de **01/09/2026** está nesta
pasta. Ela foi trazida para cá em 29/08/2026 porque o material vivia no
repositório acadêmico, que é privado, e quem vai gravar o vídeo e montar a
apresentação precisa alcançá-lo.

## Por onde começar

| Você vai... | Abra |
|---|---|
| gravar o vídeo | [`ROTEIRO_VIDEO_E_ENSAIO.md`](ROTEIRO_VIDEO_E_ENSAIO.md) |
| conferir se a entrega atende as regras | [`CRITERIOS_DE_REVISAO.md`](CRITERIOS_DE_REVISAO.md) |
| estudar para a banca | [`QA_BANCA.md`](QA_BANCA.md) |
| checar um número antes de falar | [`CONTEXTO_TIME.md`](CONTEXTO_TIME.md) |
| entender a página APEX | [`APEX_SELECT_AI_PASSO_A_PASSO.md`](APEX_SELECT_AI_PASSO_A_PASSO.md) |

## O que é cada arquivo

- **`ROTEIRO_VIDEO_E_ENSAIO.md`** — o roteiro do vídeo com **o texto falado**,
  dez janelas, 723 palavras, 4min49s a 150 palavras por minuto. O limite da
  FIAP é cinco minutos. Traz também as três passadas de ensaio e o vocabulário
  proibido.
- **`CRITERIOS_DE_REVISAO.md`** — contra o que a entrega é medida: pesos,
  conteúdos obrigatórios, os 18 critérios de aceite, os invariantes numéricos e
  os limites de alegação.
- **`CONTEXTO_TIME.md`** — o dossiê factual do produto. É a fonte para conferir
  qualquer número antes de dizê-lo em voz alta.
- **`QA_BANCA.md`** — vinte perguntas transversais para revisar em grupo.
- **`Informacoes_Finais_Projeto_Integrantes_v1.xlsx`** — planilha oficial dos
  integrantes, no template da FIAP.
- **`montar_zip_entrega.sh`** — monta o ZIP final. Ver as travas abaixo.
- **`apresentacao/`** — o deck e o que o produz.

### Dentro de `apresentacao/`

- **`EC_Sprint_2_1TSCO_EvidenciasConstrucao_MedFlow_OmegaUrbanTech.pptx`** — o
  deck entregue, 23 slides. **É a fonte da verdade, editado no PowerPoint.**
  Até 31/08/2026 ele era gerado por roteiro; desde a revisão daquele dia a
  apresentação passou a ser trabalhada em cima do próprio arquivo, e os
  geradores saíram do repositório para não sobrescrever a edição manual.
- **`capturar_produto.mjs`** — refaz as capturas do produto publicado.
- **`capturar_flowia.mjs`** — faz uma pergunta real à FlowIA no site publicado e
  captura a resposta. **Cada execução gasta uma pergunta da cota diária** do
  Select AI, que é de 50.
- **`capturas/`** — as imagens usadas no deck.

Os scripts precisam do Playwright e do `python-pptx`, que vêm de
`make web-install` e do `.venv` na raiz do repositório.

## As três travas da entrega

O ZIP **recusa fechar** enquanto qualquer uma destas não estiver resolvida.
Elas existem porque cada uma já falhou uma vez.

1. **URL do vídeo.** `montar_zip_entrega.sh` procura um link do YouTube
   **dentro do `.pptx` entregue**, abrindo os XML dos slides. Não adianta
   preencher a URL em outro lugar.
2. **Tag atrás de `main`.** O ZIP empacota o código por tag. Se a tag estiver
   atrás, o script diz quantos commits e para. Já aconteceu de o pacote levar a
   `v0.3.1` enquanto o produto no ar era a `v1.0.1`.
3. **Arquivos obrigatórios.** O `.pptx` e a planilha precisam existir com os
   nomes oficiais.

### Onde a URL do vídeo entra

No slide final, e ela precisa **acabar dentro do `.pptx`**. Escreva a URL no
slide de conclusão pelo PowerPoint e salve: o `.pptx` é a fonte da verdade,
e não há mais roteiro que sobrescreva a edição.

Depois de salvar, replique o arquivo na outra árvore — a regra enquanto durar
a duplicação é *mexeu numa, copia na outra* — e rode o
`montar_zip_entrega.sh`, que confere a URL abrindo os XML dos slides.

Até 29/08/2026 a trava conferia a URL dentro de `gerar_apresentacao.py`, um
gerador que já não produzia o deck — dava para passar na trava sem o link
aparecer em slide nenhum. Hoje a conferência é no arquivo que vai ser
entregue.

## Sobre a duplicação

Estes arquivos também existem no repositório acadêmico privado, em
`02_oracle_medflow/entregues/sprint_2/`. **As duas cópias são idênticas**, e os
scripts foram feitos para funcionar nas duas árvores sem alteração.

Enquanto a duplicação existir, **mexa numa e replique na outra**, ou as duas
divergem em silêncio. A consolidação num lugar só ficou para depois da entrega.

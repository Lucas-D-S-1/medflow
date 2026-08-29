# MedFlow: roteiro narrativo da apresentação

O arco final organiza a entrega em 21 slides: problema, jornada, confiança,
diferencial e valor. O original do time e a revisão intermediária de 22 slides continuam
preservados em `99_arquivo/02_oracle_medflow/apresentacao/`.

## Assinatura do produto

**Slogan:** Onde investigar primeiro.

**Linha de apoio:** Do sinal territorial à hipótese: com fonte, amostra e
limite à vista.

O nome combina `Med`, de saúde, e `Flow`, do fluxo do dado e do fluxo
assistencial.

## Sequência final de 21 slides

1. **Uma nova competência chegou. Onde investigar primeiro?** Slogan, linha de
   apoio e significado do nome.
2. **Quem prioriza. E quem ganha quando ele acerta.** Gestor ou analista
   regional como persona; população atendida como beneficiária final.
3. **A pergunta é simples. O caminho até ela, não.** SIH relacional, CNES em
   JSON e dados CSV/External Table de território e população.
4. **A jornada em quatro passos.** Localizar, contextualizar, aprofundar e
   formular.
5. **O produto.** Interface pública e link para a raiz do WebApp.
6. **Localizar: Jundiaí, 06/2026.** IPH como sinal, não diagnóstico.
7. **Contextualizar: residência e destino.** Fluxo territorial do mesmo caso.
8. **Aprofundar: o hospital dentro daquela região.** HU Hospital Universitário
   dentro de Jundiaí, com benchmark comparável.
9. **Formular: a hipótese e a tese.** Próxima pergunta rastreável, sem alegar
   causalidade.
10. **Confiança é dizer o que o dado não sustenta.** Fórmula, amostra e limite
    na interface.
11. **Arquitetura: o que roda, o que demonstra e o que é horizonte.** Gold,
    ORDS e WebApp em produção; Select AI e APEX como demonstração controlada;
    validação com gestores como horizonte.
12. **Técnicas e a decisão sobre previsão.** Modelo dimensional, sazonalidade,
    benchmark, matriz origem-destino, 19 grupos ICSAP, distribuição do IPR e
    IPCA. A ausência de ML preditivo é uma decisão metodológica explícita.
13. **Oracle vivo e contingência.** ORDS live como entrega principal; dez
    snapshots rotulados se o serviço estiver indisponível, sem misturar modos.
14. **Validação.** Cada número fecha com a Gold antes de apresentar o extra.
15. **Select AI de apresentação.** Pergunta em português, SQL e cinco rótulos
    conferidos.
16. **Select AI técnico.** Fluxo `showsql → comparação → narrate`, três limites
    medidos, captura real do APEX, duas respostas válidas no rastro e export
    versionado.
17. **Resultado e fronteira.** MVP público e rastreável, sem inventar impacto.
18. **Da Sprint 1 até aqui.** O feedback para aprofundar diferenciais e mostrar
    protótipo funcional ligado às evidências entregues.
19. **Próximos passos.** Vídeo, planilha, ZIP, ensaio e manutenção do Oracle;
    depois, evidência de uso com gestores.
20. **Equipe.** Responsabilidade por camada e critério de pronto comum.
21. **Conclusão.** Produto, repositório e vídeo; fechamento com o slogan.

## Fio de fala recomendado

A apresentação inteira pode ser conduzida por uma frase:

> Uma nova competência chegou. O gestor não precisa de outro dashboard; precisa
> saber onde aprofundar sem confundir um sinal administrativo com uma conclusão
> clínica.

Nos slides 6 a 9, manter Jundiaí como o mesmo caso. No slide 9, dizer
explicitamente “hipótese de investigação”. Não afirmar que o MedFlow encontrou
a causa.

No slide 15, usar a pergunta autossuficiente do bloco A. Não encadear turnos e
não usar “taxa de ocupação” no roteiro principal. No slide 16, explicar os três
limites antes que a banca precise descobri-los.

## O que ficou fora do corpo principal

As tabelas completas de marts, catálogo de indicadores, lista de endpoints e
inventário de entregáveis continuam no repositório. Podem virar apêndice se a
banca pedir; foram retirados do fluxo principal porque interrompiam a jornada.

## Regeneração

1. Atualizar as capturas públicas, se necessário:

   ```bash
   node capturar_produto.mjs
   ```

2. Gerar o PowerPoint usando o ambiente Python do repositório `medflow`:

   ```bash
   ../../../medflow/.venv/bin/python gerar_apresentacao.py
   ```

3. Conferir o arquivo
   `EC_Sprint_2_1TSCO_EvidenciasConstrucao_MedFlow_OmegaUrbanTech.pptx` no
   PowerPoint e exportar um PDF com o mesmo nome.

4. Antes da entrega, preencher `VIDEO_URL` no gerador com a URL pública
   definitiva do YouTube. Enquanto ela estiver vazia, o slide 21 exibe
   deliberadamente `link pendente do time`.

# Q&A transversal para a banca

Este material prepara os cinco integrantes para explicar o mesmo produto com
os mesmos limites. As respostas são curtas; o contexto completo e as fontes
permanecem em [`CONTEXTO_TIME.md`](CONTEXTO_TIME.md).

## 1. O que significa MedFlow?

MedFlow é uma marca, não uma sigla. **Med** remete à saúde; **Flow** representa
tanto o fluxo do dado pelas camadas quanto o fluxo assistencial entre
territórios.

## 2. Que problema o produto resolve e para quem?

O gestor ou analista regional de saúde de São Paulo precisa cruzar bases feitas
para finalidades diferentes antes de saber onde aprofundar uma análise. O
MedFlow integra esses sinais e organiza uma triagem mensal auditável.

## 3. Que decisão o MedFlow apoia?

Ele ajuda a decidir onde investigar primeiro, qual recorte aprofundar e quais
evidências levar para a equipe local. Não prescreve condutas, regula leitos nem
substitui decisão clínica, administrativa ou conhecimento do território.

## 4. Qual é o recorte validado?

O produto cobre hospitais de São Paulo entre janeiro de 2024 e junho de 2026,
em 30 competências mensais. O ano de 2026 é parcial, e o recorte não observa
residentes paulistas internados fora do estado.

## 5. Onde entram os três formatos de dados exigidos pela FIAP?

O SIH e as marts usam dados relacionais; o cadastro atual do CNES chega em
JSON; regiões de saúde e população IBGE usam CSV compatível com External Table.
Cada formato tem papel próprio na integração e na publicação pelo Oracle.

## 6. O que Bronze, Silver e Gold fazem?

A Bronze preserva origem, linhagem e integridade; a Silver conforma tipos,
chaves e conceitos; a Gold calcula indicadores e materializa os marts. Oracle,
ORDS e React apenas carregam, expõem ou formatam o resultado da Gold.

## 7. Por que usar Oracle Autonomous AI Database e ORDS?

O Oracle concentra as tabelas analíticas, as views de publicação, a API e o
Select AI no mesmo ambiente governado. O ORDS expõe dez `GET` analíticos e o
`POST` governado do assistente, sobre
views de projeção, sem publicar as tabelas Gold diretamente por AutoREST.

## 8. Como as quatro visões formam uma jornada?

A visão regional localiza o sinal. Fluxos explica deslocamentos e ICSAP.
Hospital aprofunda série, especialidade e diagnóstico. Metodologia apresenta
fórmulas, cobertura e limites. O percurso vai do território à hipótese.

## 9. Quais técnicas analíticas foram implementadas?

O MVP combina modelagem dimensional, séries mensais, comparação sazonal,
benchmarking, matriz origem-destino, ICSAP, permanência, mortalidade, custo e
pressão hospitalar estimada. São técnicas descritivas e comparativas.

## 10. Por que o IPH não é taxa de ocupação real?

O IPH divide pacientes-dia reconstruídos por leitos-dia SUS declarados no CNES.
Não existe censo diário de leitos operacionais ou ocupados; por isso o valor é
pressão estimada sobre capacidade declarada, inclusive quando supera 100%.

## 11. Como o produto evita misturar demanda, produção e deslocamento?

Demanda usa a residência da pessoa; produção usa o hospital do atendimento;
fluxo relaciona origem e destino. Essa separação impede que uma internação fora
da região seja atribuída ao mesmo tempo à oferta e à demanda locais.

## 12. O que provam as 8.403.103 comparações sem divergência?

Elas provam que, no método executado, os campos servidos pelo produto coincidem
com os marts Gold de forma posicional e campo a campo. Não provam impacto,
causalidade, completude clínica, ausência de qualquer defeito ou adoção real.

## 13. Como a equipe sabe que os números não foram digitados na tela?

Os valores nascem das fontes, passam por contratos e manifestos e são
persistidos na Gold antes de chegar ao Oracle e ao WebApp. Testes derivam os
valores esperados de fixtures e metadados, e o frontend não recalcula métricas.

## 14. Qual é o papel do Select AI?

Ele demonstra perguntas em linguagem natural sobre os nove objetos Gold e
expõe o SQL gerado como evidência. É uma demonstração controlada no Oracle,
separada do WebApp público e subordinada ao SQL convencional de referência.

## 15. Como o Select AI foi medido e quais limites apareceram?

O roteiro tem 13 perguntas em cinco blocos; oito possuem referência executável
e seis coincidiram exatamente. Os limites medidos envolvem ranking sem agregar
antes, vocabulário incorreto na narrativa e perda de contexto entre turnos.

## 16. Por que o projeto não usa machine learning nem previsão?

A decisão foi priorizar uma base mensal reconciliada e uma triagem explicável
antes de prometer comportamento futuro. Previsão exigiria objetivo, horizonte,
validação temporal e avaliação com usuários; o IS atual é comparação histórica.

## 17. Como segurança e privacidade são tratadas?

Somente dados públicos e agregados chegam ao navegador; AIHs individuais não
são publicados. A API é somente leitura, o CORS é restrito, e wallet, `.env`,
senhas e tokens ficam fora do Git e do frontend.

## 18. O que acontece se o Oracle hibernar?

O heartbeat diário executa SQL e ajuda a impedir a hibernação, mas não acorda
um banco já parado. Nesse caso, inicia-se o Autonomous Database no console,
espera-se o ORDS subir e roda-se `make preflight` novamente.

## 19. O produto continua funcionando sem o Oracle?

As quatro visões usam dez snapshots de contingência, um por endpoint, e mostram
o selo **Snapshot de contingência**. O cliente preserva o recorte do snapshot e
não mistura silenciosamente respostas locais com dados Oracle ao vivo.

## 20. Qual é a principal fronteira de evidência do MVP?

A viabilidade técnica, a rastreabilidade e a consistência do recorte estão
medidas. Utilidade cotidiana, compreensão autônoma dos indicadores, redução de
esforço, adoção e impacto ainda precisam de validação com usuários reais.

## Fontes para aprofundar

O dossiê liga cada afirmação à fonte técnica. Para revisão dirigida, consulte
também [`README.md`](../../README.md), [`ARQUITETURA.md`](../../ARQUITETURA.md),
[`docs/flowia/`](../flowia/README.md), que reúne a IA do produto e a prova de
que ela acerta.

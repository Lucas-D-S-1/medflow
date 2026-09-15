# Relatório reproduzível — jornada do gestor MedFlow

Data da execução: 15/09/2026
Base preservada: `a3f1a342154f764f4fb154e42b95b30113c7ade2`

## Resultado por fase

1. Os filtros compactos de competência, rede regional e região de saúde ficam acima do mapa. O recorte continua na URL; mapa, cartão territorial e CTA usam o mesmo estado, sem o antigo bloco redundante de contexto.
2. A evolução regional abre na página com somente IPH estimado e internações novas. Competência atual, mês-calendário anterior, referência histórica e lacunas são selecionados por funções puras. Cards e gráfico agora usam a mesma validação finita; denominador explicitamente inválido não vira fallback. A copy `Estimativa mensal` fica restrita ao IPH.
3. A tabela hospitalar preserva o universo canônico e ganhou busca normalizada por nome ou CNES, sem alterar cálculo, ordenação ou seleção.
4. A comparação com pares aparece após a seleção do hospital, sempre por faixa de leitos SUS, com fallback geográfico explícito. O histórico mensal começa recolhido e permanece acessível por teclado.
5. Especialidades mostram volume, participação hospitalar e regional e permanência comparada sem causalidade. Cobertura parcial usa, no cabeçalho, nas células e no resumo, `Participação nas especialidades disponíveis`; cobertura completa conserva `Participação no hospital`. Diagnósticos ficam em disclosure separado e agregado. As duas sugestões locais da FlowIA não fazem POST.
6. A FlowIA invalida pedidos locais cujo CNES, competência ou especialidade ficaram obsoletos. A identidade de cada requisição remota inclui rota, região, competência, hospital e especialidade ativa; qualquer troca aborta e ignora a resposta tardia. Respostas já concluídas preservam o rótulo histórico do contexto usado. A permanência só é narrada contra benchmark quando o estado IPE é `suficiente` e todos os valores comparáveis são válidos.
7. A página inteira foi revista em navegador real nos quatro viewports exigidos. O grid hospitalar foi corrigido para não herdar a largura mínima da tabela em 768 px. Os destinos `#hospital-detail` e `#hospital-list` agora usam `scroll-margin-top` responsivo de 84 px no desktop e 148 px até 760 px, preservando o título abaixo do cabeçalho sticky ao abrir ou trocar o hospital.

## Fonte real validada e valores exibidos

A validação pré-publicação consumiu a API ORDS pública, somente leitura, pelo proxy de desenvolvimento do Vite e conferiu `source: oracle-live` nos quatro viewports. O GitHub Pages recebe a base pública pela variável de repositório `ORDS_BASE_URL`; nenhuma credencial é embutida no código. Toda a captura usou endpoints `GET`; não houve Oracle SelectAI, POST, escrita ou mutação.

No fluxo `06/2026 → Jundiaí 35073 → HU 3012212 → Pediatria`, a interface ao vivo exibiu:

- Jundiaí: IPH estimado **67,2%**; **−9,1 p.p.** contra maio/2026, cuja referência é **76,3%**; **−15,1 p.p.** contra a média de junho dos dois anos anteriores, **82,3%**.
- HU Hospital Universitário, CNES 3012212: **885 internações**; **165 pares elegíveis** de 60 a 149 leitos no estado, com o hospital selecionado excluído. Medianas dos pares: IPH **42,7%**, permanência **4,09 dias** e internações novas **388**. Os valores do HU são, respectivamente, 66,4%, 3,53 dias e 885.
- Pediatria: **339 internações**; benchmark de **109** e total regional de **448**. A resposta `oracle-live`, contrato 0.5.0, trouxe quatro itens, `has_more=false`, somando 885 internações. A participação no hospital é 339/885 = **38,3051%**, exibida como **38,3%**; a participação regional é 339/448 = **75,6696%**, exibida como **75,7%**. A permanência é **5,109145 dias**, contra referência de **3,091743 dias**, exibidas como **5,11** e **3,09 dias**, em **7 outros hospitais**.
- Rótulos exatos das sugestões locais para a demonstração: `Como interpretar?` e `O que verificar?`.

Esses valores foram lidos da fonte e do DOM do preview ao vivo; não foram inseridos como constantes na implementação. A conferência do DOM validou separadamente os rótulos `Participação no hospital` e `Participação regional`, com 38,3% e 75,7% derivados dos respectivos denominadores. O CNES 2786435 continua identificado como HCSVP Hospital São Vicente e não recebe os valores do HU.

## Endereço público

O workflow `.github/workflows/pages.yml` publica a aplicação após atualizações de `web/` na branch `main`. O endereço permanente da jornada é:

```text
https://lucas-d-s-1.github.io/medflow/?competencia=2026-06&regiao=35073&hospital=3012212#regional
```

## Testes e QA

Comandos finais:

```bash
cd web
npm run build

ORDS_BASE_URL=http://127.0.0.1:9 \
  npx playwright test e2e/hospital.spec.ts \
    --grep "mantém detalhe e lista abaixo" --workers=2

ORDS_BASE_URL=http://127.0.0.1:9 \
  npx playwright test --grep-invert @live --workers=2

cd ..
git diff --check
```

Resultados finais:

- Build TypeScript/Vite aprovado após o gate regional final: **112 módulos** transformados; bundle principal 1.063,63 kB, 306,14 kB gzip. Permanece o aviso informativo de chunk acima de 500 kB.
- Seletores regionais: **8/8 testes focais aprovados**, incluindo denominador ausente e valores explicitamente inválidos (`null`, `undefined`, zero, negativo, NaN e infinito).
- Regressão focal nova dos destinos hospitalares: **2/2 aprovada**, em 1366×768 e 390×844, com margem computada exata, foco e posição estabilizada abaixo do cabeçalho para detalhe e lista.
- Teste focal de troca de especialidade com requisição pendente: **1/1 aprovado**.
- Suíte hermética integral anterior ao ajuste CSS: **95/95 testes aprovados** em 54,6 s, dois workers, ORDS inválido e `@live` excluído. Conforme a validação solicitada, ela não foi repetida para esta mudança visual isolada; os dois casos novos foram executados focalmente.
- `git diff --check`: aprovado.
- Regressões específicas cobrem pedido local obsoleto, resposta remota tardia por rota/território/hospital e por especialidade, preservação do rótulo histórico concluído, `amostra_insuficiente`, `benchmark_zero`, cobertura parcial/completa, IPH com denominador ausente ou inválido, IPH negativo, copy de internações e overflow em 390/768 px.
- QA ao vivo em **390×844, 768×1024, 1366×768 e 1920×1080**: overflow global 0 em todos; nenhum `console.error`, `pageerror` ou POST; fonte `oracle-live`; nenhum spinner de pares remanescente.
- QA live específico de âncoras: em 1366×768, cabeçalho de 72 px, detalhe em y=83,97 e lista em y=84,42, com folgas de 11,97 e 12,42 px. Em 390×844, cabeçalho expandido de 133,75 px e detalhe em y=210,03; ao voltar, cabeçalho de 72 px e lista em y=86,27, com folgas finais de 76,28 e 14,27 px. Margens computadas: 84 e 148 px.
- Teclado/foco: histórico abriu e fechou com Enter; a FlowIA abriu por teclado e devolveu o foco ao launcher ao fechar em todos os viewports.
- Reduced motion em 768×1024: transição do launcher 0 s e animação do painel `none`.
- Auditoria estrutural em todos os viewports: `lang=pt-BR`, um `main`, um `h1`, nenhum ID duplicado e nenhum controle interativo sem nome acessível.
- Contingência em 390×844: estado `Pares estaduais fora do snapshot` explícito, sem `peer-loading`, sem faixa/mediana inventada e sem overflow global.

## Arquivos da implementação

- Fluxo e estado: `web/src/App.tsx`, `web/src/features/analise/AnalisePage.tsx`, `web/src/shared/SourceContext.tsx`, `web/src/shared/analysisNavigation.ts`, `web/src/shared/GlobalContextBar.tsx`, `web/src/shared/GlobalContextBar.css`, `web/src/shared/PositionBar.tsx`, `web/src/shared/format.ts`, `web/src/styles.css`, `web/src/vite-env.d.ts`.
- Regional: `web/src/features/regional/RegionalView.tsx`, `RegionalView.css`, `RegionalMap.tsx`, `RegionalSeries.tsx`, `StateTotals.tsx`, `StateTotals.css`, `regionalInsights.ts`.
- Hospital: `web/src/features/hospital/HospitalView.tsx`, `HospitalView.css`, `HospitalTable.tsx`, `HospitalPeers.tsx`, `HospitalPeers.css`, `SpecialtyTable.tsx`, `hospitais.ts`, `pares.ts`, `hospitalSearch.ts`, `specialtyMetrics.ts`, `specialtySummary.ts`.
- Assistente: `web/src/features/assistant/AssistantWidget.tsx`, `AssistantWidget.css`, `assistantContext.ts`, `web/src/lib/api/assistente.ts`.
- Testes: `web/e2e/assistente.spec.ts`, `contexto-global.spec.ts`, `contrato.spec.ts`, `hospital.spec.ts`, `pagina-continua.spec.ts`, `regional.spec.ts`, `hospital-search.spec.ts`, `regional-insights.spec.ts`, `specialty-summary.spec.ts`.
- Relatório: `docs/RELATORIO_JORNADA_GESTOR_20260915.md`.

## Limitações reais

- A experiência ao vivo depende da disponibilidade do ORDS read-only. Se ele falhar, o produto usa snapshots versionados e identifica a contingência; como o snapshot não contém o universo estadual completo, não declara pares estaduais.
- Perguntas livres da FlowIA dependem do endpoint governado do SelectAI. Elas não foram usadas nesta execução; as duas sugestões locais registradas acima funcionam sem POST.
- O contrato de diagnósticos é agregado e não publica competência inicial por linha. A interface informa as 30 competências cobertas e o fim em 06/2026 sem inventar início.
- O bundle inicial ainda é monolítico e supera o limiar informativo de 500 kB do Vite.

Esta entrega não altera Oracle, dados, pipeline, notebook, deck, tags ou pacotes acadêmicos. Nenhuma chamada paga foi necessária para a implementação e a validação.

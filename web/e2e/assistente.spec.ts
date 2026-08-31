/**
 * Assistente contextual.
 *
 * Os atalhos importantes precisam continuar úteis sem GenAI. A chamada ao
 * Select AI fica reservada à pergunta livre e tem contrato próprio.
 */

import { expect, test, type Page } from '@playwright/test'
import { mockLiveSource, pt, regiaoDestacada, snapshotCompetencia } from './apoio'

test.beforeEach(async ({ page }) => {
  await mockLiveSource(page)
})

test('responde o conceito de IPH com o recorte exibido sem chamar a IA', async ({ page }) => {
  let calls = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    calls += 1
    await route.abort()
  })

  await page.goto('/regional?regiao=35073')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByRole('button', { name: 'O que é IPH?' }).click()

  const panel = page.locator('#medflow-assistant-panel')
  await expect(panel).toContainText('FlowIA')
  await expect(panel).toContainText(regiaoDestacada.region_name as string)
  await expect(panel).toContainText(`${pt(regiaoDestacada.iph_percent as number, 1)}%`)
  await expect(panel).toContainText('não uma taxa de ocupação real')
  expect(calls).toBe(0)
})

test('explica a rede regional com o alias e sem confundir com território municipal', async ({ page }) => {
  let calls = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    calls += 1
    await route.abort()
  })

  await page.goto('/regional?regiao=35073')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByRole('button', { name: 'O que é uma rede regional?' }).click()

  const panel = page.locator('#medflow-assistant-panel')
  await expect(panel).toContainText('Rede Regional de Atenção à Saúde')
  await expect(panel).toContainText('Rede regional 16 — Bragança e Jundiaí')
  await expect(panel).toContainText('Não é uma zona da cidade')
  expect(calls).toBe(0)
})

test('explica TMH, CMI e IS localmente sem chamar a IA', async ({ page }) => {
  let calls = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    calls += 1
    await route.abort()
  })

  await page.goto('/regional')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()

  const casos = [
    ['O que é TMH?', 'Taxa de Mortalidade Hospitalar'],
    ['O que é CMI?', 'Custo Médio da Internação'],
    ['O que é IS?', 'Índice Sazonal'],
  ] as const

  for (const [pergunta, explicacao] of casos) {
    await page.getByLabel('Faça outra pergunta').fill(pergunta)
    await page.getByRole('button', { name: 'Enviar pergunta' }).click()
    await expect(page.locator('#medflow-assistant-panel')).toContainText(explicacao)
  }

  expect(calls).toBe(0)
})

test('troca as sugestões junto com a etapa visível', async ({ page }) => {
  await page.goto('/regional')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await expect(page.getByRole('button', { name: 'O que é IPH?' })).toBeVisible()

  await page.getByRole('link', { name: 'Hospital' }).click()
  await page.getByRole('button', { name: 'Qual a diferença entre IPE e IPR?' }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText('grãos diferentes')
})

test('envia somente pergunta livre ao Oracle Select AI e mostra SQL auditável', async ({ page }) => {
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    expect(route.request().method()).toBe('POST')
    expect(route.request().postDataJSON()).toEqual({
      question: 'Quais sinais merecem uma análise conjunta?',
      context: {
        route: 'regional',
        competence: snapshotCompetencia,
        region_code: '35073',
        region_name: 'JUNDIAI',
        macroregion_code: '3527',
        macroregion_name: 'RRAS16',
        macroregion_label: 'Rede regional 16 — Bragança e Jundiaí',
        hospital_cnes: null,
        active_analysis: 'pressão hospitalar regional e tendência',
        history: [],
      },
    })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-select-ai',
        response_id: 42,
        narrative: 'Pressão e evasão devem ser lidas com volume e tendência.',
        sql: 'select nm_regiao_saude from vw_api_regioes_resumo',
        warning: null,
      }),
    })
  })

  await page.goto('/regional?regiao=35073')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByLabel('Faça outra pergunta').fill(
    'Quais sinais merecem uma análise conjunta?',
  )
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()

  const panel = page.locator('#medflow-assistant-panel')
  await expect(panel).toContainText('FlowIA')
  await expect(panel).toContainText('Pressão e evasão devem ser lidas')
  await panel.getByText('Ver SQL gerado e validado').click()
  await expect(panel.locator('pre')).toContainText('select nm_regiao_saude')
  await expect(panel).toContainText('assistente da análise')
})

test('não confunde pergunta analítica sobre pressão com pedido de definição', async ({ page }) => {
  let calls = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    calls += 1
    expect(route.request().postDataJSON().question).toBe(
      'onde a pressão hospitalar cresceu mais?',
    )
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-select-ai',
        response_id: 43,
        narrative: 'Vale das Cachoeiras teve a maior variação no recorte.',
        sql: 'select nm_regiao_saude from mart_indicador_regiao_mensal',
        warning: null,
      }),
    })
  })

  await page.goto('/regional')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByLabel('Faça outra pergunta').fill(
    'onde a pressão hospitalar cresceu mais?',
  )
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()

  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Vale das Cachoeiras',
  )
  expect(calls).toBe(1)
})

test('mantém os atalhos úteis quando o Select AI está indisponível', async ({ page }) => {
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto('/regional')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByLabel('Faça outra pergunta').fill('Existe correlação entre os sinais?')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()

  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Tente uma das sugestões',
  )
  await page.getByRole('button', { name: 'O que é IPH?' }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'não uma taxa de ocupação real',
  )
})

test('explica as regras de comparação sem consultar o modelo', async ({ page }) => {
  let calls = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    calls += 1
    await route.abort()
  })

  await page.goto('/?regiao=35073#hospital')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  const panel = page.locator('#medflow-assistant-panel')
  const perguntar = async (texto: string) => {
    await page.getByLabel('Faça outra pergunta').fill(texto)
    await page.getByLabel('Faça outra pergunta').press('Enter')
  }

  // Critério de pares é regra de produto: ele vive no front e não existe como
  // coluna na Gold, então mandar o modelo procurar no banco seria mandá-lo
  // procurar o que o banco não tem.
  await perguntar('Qual o critério para dois hospitais serem pares?')
  // O porte não sai do critério: é ele que torna os números comparáveis. Se
  // este texto voltar a falar de tipo de unidade sem porte, a FlowIA estará
  // descrevendo um produto que não existe mais.
  await expect(panel).toContainText('mesma faixa de leitos SUS')
  await expect(panel).toContainText('na mesma região, que é o padrão')
  await expect(panel).toContainText('a régua sobe para o estado')

  await perguntar('Por que o IPH do hospital dia passa de 100%?')
  await expect(panel).toContainText('giro sobre capacidade')

  await perguntar('O que significa a faixa da barra de posição?')
  await expect(panel).toContainText('metade central')

  await perguntar('Como funciona o placar de sinais acesos?')
  await expect(panel).toContainText('quintil mais alto')

  expect(calls).toBe(0)
})

test('recusa inventar grupo de pares em vez de perguntar ao modelo', async ({ page }) => {
  let calls = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    calls += 1
    await route.abort()
  })

  await page.goto('/?regiao=35073#hospital')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  const panel = page.locator('#medflow-assistant-panel')

  // Perguntado ao modelo, "quais hospitais são comparáveis ao CNES 2027240"
  // devolvia um hospital de outra região com confiança total, porque o
  // agrupamento de pares não existe no banco e o modelo preenche o vazio.
  for (const pergunta of [
    'Quais hospitais são comparáveis ao CNES 2027240?',
    'Com quais outros hospitais eu comparo esse?',
    'Quais hospitais parecidos com o meu?',
  ]) {
    await page.getByLabel('Faça outra pergunta').fill(pergunta)
    await page.getByLabel('Faça outra pergunta').press('Enter')
    await expect(panel).toContainText('mesma faixa de leitos SUS')
  }

  expect(calls).toBe(0)
})

test('a conversa fica na tela e a pergunta seguinte leva a anterior', async ({ page }) => {
  // O caso é o do usuário: "qual o IPH de São Paulo?" e depois "e o TMH?".
  // A segunda pergunta não nomeia a região, então ou o histórico vai junto ou
  // o modelo responde sobre coisa nenhuma.
  const enviados: unknown[] = []
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    const corpo = route.request().postDataJSON() as { question: string }
    enviados.push(corpo)
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-select-ai',
        response_id: enviados.length,
        narrative:
          corpo.question === 'e o TMH?'
            ? 'O TMH de SAO PAULO é 4,82% em junho de 2026.'
            : 'O IPH de SAO PAULO é 32,3% em junho de 2026.',
        sql: null,
        warning: null,
      }),
    })
  })

  await page.goto('/regional?regiao=35073')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()

  await page.getByLabel('Faça outra pergunta').fill('qual o IPH de São Paulo?')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  await expect(page.getByTestId('assistant-thread')).toContainText('O IPH de SAO PAULO')

  await page.getByLabel('Faça outra pergunta').fill('e o TMH?')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  await expect(page.getByTestId('assistant-thread')).toContainText('O TMH de SAO PAULO')

  // A primeira rodada continua na tela: era ela que sumia.
  const thread = page.getByTestId('assistant-thread')
  await expect(thread).toContainText('qual o IPH de São Paulo?')
  await expect(thread).toContainText('O IPH de SAO PAULO')
  await expect(thread).toContainText('e o TMH?')

  const segunda = enviados[1] as { context: { history: { question: string; answer: string }[] } }
  expect(segunda.context.history).toHaveLength(1)
  expect(segunda.context.history[0].question).toBe('qual o IPH de São Paulo?')
  expect(segunda.context.history[0].answer).toContain('O IPH de SAO PAULO')
})

test('a conversa sobrevive à troca de etapa', async ({ page }) => {
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-select-ai',
        response_id: 7,
        narrative: 'Resposta que precisa continuar visível.',
        sql: null,
        warning: null,
      }),
    })
  })

  await page.goto('/regional?regiao=35073')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByLabel('Faça outra pergunta').fill('uma pergunta qualquer')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  await expect(page.getByTestId('assistant-thread')).toContainText('precisa continuar visível')

  await page.getByRole('link', { name: 'Hospital' }).click()
  // Quem estava investigando território e desce para hospital continua a mesma
  // investigação; perder o fio ali era a queixa.
  await expect(page.getByTestId('assistant-thread')).toContainText('precisa continuar visível')
  await expect(page.locator('#medflow-assistant-panel')).toContainText('Contexto: visão hospitalar')
})

test('perguntas sobre a leitura da tela nao vao ao modelo', async ({ page }) => {
  let chamadas = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    chamadas += 1
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-select-ai',
        response_id: 1,
        narrative: 'resposta do modelo que não deveria aparecer',
        sql: null,
        warning: null,
      }),
    })
  })
  await mockLiveSource(page)
  await page.goto('/regional?regiao=35073')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()

  const casos: [string, string][] = [
    // O modelo leu "97 de 237 acima dos pares" como posição num ranking de 237
    // regiões. É contagem, não posição, e ranking é o que ele sabe fazer.
    ['no mapa, o que significa são paulo estar 97 de 237 acima dos pares', 'Não é posição num ranking'],
    // "o que há" não casava com nenhum gatilho e ia parar no modelo, que
    // devolvia a definição seguida de um ranking que ninguém pediu.
    ['o que há no índice sazonal?', 'Índice Sazonal'],
    // O critério mudou quando os pares passaram a fixar o porte; o texto
    // precisa mudar junto, senão a FlowIA descreve um produto que não existe.
    ['qual o critério para dois hospitais serem pares', 'mesma faixa de leitos SUS'],
  ]
  for (const [pergunta, esperado] of casos) {
    await page.getByLabel('Faça outra pergunta').fill(pergunta)
    await page.getByRole('button', { name: 'Enviar pergunta' }).click()
    await expect(page.getByTestId('assistant-thread')).toContainText(esperado)
  }

  expect(chamadas).toBe(0)
})

/**
 * A pergunta que a região selecionada habilita. Escrita aqui como o usuário a
 * vê: se o texto do produto mudar, o teste precisa falhar, porque é o texto
 * que o Select AI recebe.
 */
const PERGUNTA_CONCENTRACAO =
  'Quais hospitais concentram internações em cirurgia nesta região?'
const PERGUNTA_TRIAGEM = 'Quais regiões devo investigar?'
const sugestoes = (page: Page) => page.locator('.assistant-suggestions button')

test('oferece a pergunta de concentração quando já existe região selecionada', async ({ page }) => {
  await page.goto('/regional?regiao=35073')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()

  // Quatro continuam sendo quatro: a pergunta de triagem territorial sai
  // porque o clique do usuário já a respondeu.
  await expect(sugestoes(page)).toHaveCount(4)
  await expect(sugestoes(page).first()).toHaveText(PERGUNTA_CONCENTRACAO)
  await expect(page.getByRole('button', { name: PERGUNTA_TRIAGEM })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'O que é IPH?' })).toBeVisible()
})

test('sem região selecionada as sugestões regionais continuam as mesmas', async ({ page }) => {
  await page.goto('/regional')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()

  await expect(sugestoes(page)).toHaveCount(4)
  await expect(page.getByRole('button', { name: PERGUNTA_TRIAGEM })).toBeVisible()
  await expect(page.getByRole('button', { name: PERGUNTA_CONCENTRACAO })).toHaveCount(0)
})

test('a concentração por especialidade vai ao Select AI com a região no contexto', async ({ page }) => {
  // O SQL da resposta é o da mart que o profile já enxerga. Ele aparece na
  // asserção porque é o que a banca vai abrir: a pergunta só vale se o rastro
  // mostrar de onde veio o número.
  const sqlEsperado =
    'select nm_hospital_atual from mart_indicador_hospital_especialidade_mensal'
  let chamadas = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    chamadas += 1
    expect(route.request().method()).toBe('POST')
    expect(route.request().postDataJSON()).toEqual({
      question: PERGUNTA_CONCENTRACAO,
      context: {
        route: 'regional',
        competence: snapshotCompetencia,
        region_code: '35073',
        region_name: 'JUNDIAI',
        macroregion_code: '3527',
        macroregion_name: 'RRAS16',
        macroregion_label: 'Rede regional 16 — Bragança e Jundiaí',
        hospital_cnes: null,
        active_analysis: 'pressão hospitalar regional e tendência',
        history: [],
      },
    })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-select-ai',
        response_id: 51,
        narrative:
          'Em JUNDIAI, a cirurgia se concentra em poucos hospitais na competência.',
        sql: sqlEsperado,
        warning: 'Volume administrativo; não descreve fila nem agenda cirúrgica.',
      }),
    })
  })

  await page.goto('/regional?regiao=35073')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByRole('button', { name: PERGUNTA_CONCENTRACAO }).click()

  const panel = page.locator('#medflow-assistant-panel')
  await expect(panel).toContainText('a cirurgia se concentra em poucos hospitais')
  await expect(panel).toContainText('não descreve fila nem agenda cirúrgica')
  await panel.getByText('Ver SQL gerado e validado').click()
  await expect(panel.locator('pre')).toContainText(
    'mart_indicador_hospital_especialidade_mensal',
  )
  // A pergunta é ranking sobre a Gold: se uma regra local passar a respondê-la,
  // o produto devolve definição no lugar de lista e ninguém percebe.
  expect(chamadas).toBe(1)
})

test('a etapa hospitalar não herda a pergunta de concentração', async ({ page }) => {
  await page.goto('/?regiao=35073#regional')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await expect(page.getByRole('button', { name: PERGUNTA_CONCENTRACAO })).toBeVisible()

  await page.getByRole('link', { name: 'Hospital' }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Contexto: visão hospitalar',
  )
  await expect(page.getByRole('button', { name: PERGUNTA_CONCENTRACAO })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'O que é IPE?' })).toBeVisible()
  await expect(sugestoes(page)).toHaveCount(4)
})

/**
 * Assistente contextual.
 *
 * Os atalhos importantes precisam continuar úteis sem GenAI. A chamada ao
 * Select AI fica reservada à pergunta livre e tem contrato próprio.
 */

import { expect, test } from '@playwright/test'
import {
  escolherCompetencia,
  especialidadePediatria,
  itens,
  mockLiveSource,
  pt,
  regiaoDestacada,
  snapshotCompetencia,
  snapshotCompetenciaBR,
  specialtySnapshot,
} from './apoio'

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
  await page
    .getByLabel('Perguntas sugeridas')
    .getByRole('button', { name: 'O que é IPH?' })
    .click()

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
  await page.getByLabel('Faça outra pergunta').fill('O que é uma rede regional?')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()

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
    ['O que é CMI?', 'valor médio aprovado pelo SUS'],
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
  await expect(page.locator('.assistant-suggestions button')).toHaveCount(2)

  await page.getByRole('link', { name: 'Hospital' }).click()
  await expect(page.getByRole('button', { name: 'Como interpretar?' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'O que verificar?' })).toBeVisible()
  await expect(page.locator('.assistant-suggestions button')).toHaveCount(2)
})

test('oculta o launcher enquanto aberto e devolve o foco ao fechar', async ({ page }) => {
  await page.goto('/regional?regiao=35073')
  const launcher = page.getByRole('button', { name: /Posso ajudar/ })
  await launcher.focus()
  await launcher.click()
  await expect(launcher).toHaveCount(0)

  await page.getByRole('button', { name: 'Fechar assistente' }).click()
  const restored = page.getByRole('button', { name: /Posso ajudar/ })
  await expect(restored).toBeFocused()
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
  await expect(panel).toContainText(`Contexto usado: JUNDIAI · ${snapshotCompetenciaBR}`)
  await panel.getByText('Ver SQL gerado e validado').click()
  await expect(panel.locator('pre')).toContainText('select nm_regiao_saude')
  await expect(panel).toContainText('assistente da análise')
})

test('envia a competência compartilhada, não data_through do status, ao Select AI', async ({ page }) => {
  const competenciaSelecionada = '2025-05'
  let competenciaEnviada: string | null = null

  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    competenciaEnviada = (route.request().postDataJSON() as { context: { competence: string | null } }).context.competence
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-select-ai',
        response_id: 44,
        narrative: 'Resposta do recorte selecionado.',
        sql: null,
        warning: null,
      }),
    })
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073`)
  await escolherCompetencia(page, competenciaSelecionada)
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByLabel('Faça outra pergunta').fill('Quais sinais merecem uma análise conjunta?')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()

  await expect(page.getByTestId('assistant-thread')).toContainText('Resposta do recorte selecionado.')
  expect(competenciaEnviada).toBe(competenciaSelecionada)
  expect(competenciaEnviada).not.toBe(snapshotCompetencia)
})

test('perguntas sobre publicação usam data_through do status, mesmo com outra competência selecionada', async ({ page }) => {
  let chamadas = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    chamadas += 1
    await route.abort()
  })

  const competenciaSelecionada = '2025-05'
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073`)
  await escolherCompetencia(page, competenciaSelecionada)
  await page.getByRole('button', { name: /Posso ajudar/ }).click()

  const enviar = async (pergunta: string) => {
    await page.getByLabel('Faça outra pergunta').fill(pergunta)
    await page.getByRole('button', { name: 'Enviar pergunta' }).click()
    return page.locator('.assistant-answer').last()
  }

  const ultimaPublicacao = await enviar('Até quando vão os dados publicados?')
  await expect(ultimaPublicacao).toContainText(snapshotCompetenciaBR)
  await expect(ultimaPublicacao.locator(':scope > p').first()).not.toContainText('05/2025')

  const defasagem = await enviar('Por que existe a defasagem M-2?')
  await expect(defasagem).toContainText(snapshotCompetenciaBR)
  await expect(defasagem.locator(':scope > p').first()).not.toContainText('05/2025')
  expect(chamadas).toBe(0)
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
  await expect(panel).toContainText('grupo de valores mais altos')
  await expect(panel).toContainText('triagem comparativa para investigar')

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

test('ignora resposta remota tardia quando o contexto muda durante a requisição', async ({ page }) => {
  let releaseResponse!: () => void
  let markStarted!: () => void
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve
  })
  const started = new Promise<void>((resolve) => {
    markStarted = resolve
  })

  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    markStarted()
    await responseGate
    try {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          source: 'oracle-select-ai',
          response_id: 808,
          narrative: 'RESPOSTA TARDIA DO CONTEXTO ANTIGO',
          sql: null,
          warning: null,
        }),
      })
    } catch {
      // O cancelamento do fetch pode encerrar a rota antes do mock responder.
    }
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073#regional`)
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByLabel('Faça outra pergunta').fill('pergunta remota demorada')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  await started

  await page.getByRole('link', { name: 'Hospital' }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Contexto: visão hospitalar',
  )
  releaseResponse()

  await expect(page.getByTestId('assistant-thread')).toHaveCount(0)
  await expect(page.locator('#medflow-assistant-panel')).not.toContainText(
    'RESPOSTA TARDIA DO CONTEXTO ANTIGO',
  )
  await expect(page.locator('#medflow-assistant-panel')).not.toContainText(
    'não respondeu agora',
  )
})

test('trocar especialidade invalida resposta remota pendente e preserva respostas concluídas', async ({ page }) => {
  let releasePending!: () => void
  let markPendingStarted!: () => void
  const pendingGate = new Promise<void>((resolve) => {
    releasePending = resolve
  })
  const pendingStarted = new Promise<void>((resolve) => {
    markPendingStarted = resolve
  })
  let calls = 0

  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    calls += 1
    const question = (route.request().postDataJSON() as { question: string }).question
    if (question === 'PERGUNTA CONCLUÍDA NA ESPECIALIDADE A') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          source: 'oracle-select-ai',
          response_id: 901,
          narrative: 'RESPOSTA CONCLUÍDA NA ESPECIALIDADE A',
          sql: null,
          warning: null,
        }),
      })
      return
    }

    markPendingStarted()
    await pendingGate
    try {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          source: 'oracle-select-ai',
          response_id: 902,
          narrative: 'RESPOSTA TARDIA DA ESPECIALIDADE A',
          sql: null,
          warning: null,
        }),
      })
    } catch {
      // A troca de especialidade aborta o fetch antes da liberação do mock.
    }
  })

  await page.goto(
    `/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`,
  )
  const summary = page.getByTestId('specialty-summary')
  await expect(summary).toContainText(/Pediatria/i)
  await page.getByRole('button', { name: /Posso ajudar/ }).click()

  const input = page.getByLabel('Faça outra pergunta')
  await input.fill('PERGUNTA CONCLUÍDA NA ESPECIALIDADE A')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  const thread = page.getByTestId('assistant-thread')
  await expect(thread).toContainText('RESPOSTA CONCLUÍDA NA ESPECIALIDADE A')
  const completedLabel = await thread.locator('.assistant-answer-context').first().innerText()

  await input.fill('PERGUNTA PENDENTE NA ESPECIALIDADE A')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  await pendingStarted

  await page.evaluate(`document.querySelector('[data-testid="especialidade-row-02"]')?.click()`)
  await expect(summary).toContainText(/Obstetrícia/i)
  releasePending()

  await expect(thread).toContainText('RESPOSTA CONCLUÍDA NA ESPECIALIDADE A')
  await expect(thread.locator('.assistant-answer-context').first()).toHaveText(completedLabel)
  await expect(thread).not.toContainText('PERGUNTA PENDENTE NA ESPECIALIDADE A')
  await expect(thread).not.toContainText('RESPOSTA TARDIA DA ESPECIALIDADE A')
  expect(calls).toBe(2)
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

test('pedido de ranking escrito de outras formas também vai ao Select AI', async ({ page }) => {
  // A regra local de participação existe para explicar a fatia do hospital
  // aberto na tela, e casa pelo verbo "concentra". Reconhecer só
  // "quais hospitais" deixava passar as formas abaixo: medido no site
  // publicado, "onde se concentram as internações cirúrgicas desta região?"
  // respondia localmente com a definição da coluna, texto correto para outra
  // pergunta. Cada formulação aqui é uma que já falhou.
  const formulacoes = [
    'Onde se concentram as internações cirúrgicas desta região?',
    'Quais os cinco hospitais com mais internações em cirurgia?',
    'Ranking de hospitais por internações em cirurgia na região',
  ]

  for (const pergunta of formulacoes) {
    let chamadas = 0
    await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
      chamadas += 1
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          source: 'oracle-select-ai',
          response_id: 77,
          narrative: 'Lista de hospitais vinda da Gold.',
          sql: 'select nm_hospital_atual from mart_indicador_hospital_especialidade_mensal',
          warning: null,
        }),
      })
    })

    await page.goto('/regional?regiao=35073')
    await page.getByRole('button', { name: /Posso ajudar/ }).click()
    const panel = page.locator('#medflow-assistant-panel')
    await panel.getByRole('textbox').fill(pergunta)
    await panel.getByRole('textbox').press('Enter')

    await expect(panel).toContainText('Lista de hospitais vinda da Gold.')
    // Zero significa que uma regra local engoliu o ranking e devolveu
    // definição no lugar da lista.
    expect(chamadas, `"${pergunta}" não chegou ao Select AI`).toBe(1)
    await page.unroute('**/api/dev/v1/assistente/perguntar')
  }
})

test('mantém somente os dois atalhos locais de cada etapa', async ({ page }) => {
  await page.goto('/?regiao=35073#regional')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  const suggestions = page.getByLabel('Perguntas sugeridas')
  await expect(suggestions.getByRole('button', { name: 'O que são os sinais?' })).toBeVisible()
  await expect(suggestions.getByRole('button', { name: 'O que é IPH?' })).toBeVisible()
  await expect(suggestions.getByRole('button')).toHaveCount(2)

  await page.getByRole('link', { name: 'Hospital' }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Contexto: visão hospitalar',
  )
  await expect(suggestions.getByRole('button', { name: 'Como interpretar?' })).toBeVisible()
  await expect(suggestions.getByRole('button', { name: 'O que verificar?' })).toBeVisible()
  await expect(suggestions.getByRole('button')).toHaveCount(2)
})

test('os dois botões do resumo são locais, contextuais e nunca fazem POST', async ({ page }) => {
  let chamadas = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    chamadas += 1
    await route.abort()
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  const resumo = page.getByTestId('specialty-summary')
  await expect(resumo).toBeVisible()

  const perguntas = [
    ['Como interpretar?', 'comparação é descritiva'],
    ['O que verificar?', 'perfil e gravidade dos casos'],
  ] as const
  for (const [pergunta, resposta] of perguntas) {
    await resumo.getByRole('button', { name: pergunta }).click()
    await expect(page.getByTestId('assistant-thread')).toContainText(resposta)
    await expect(page.getByTestId('assistant-thread')).toContainText(
      `Contexto usado: HU HOSPITAL UNIVERSITARIO · Pediatria · ${snapshotCompetenciaBR}`,
    )
  }

  const hospitalTotal = itens(specialtySnapshot).reduce(
    (total, item) => total + (item.new_admissions as number),
    0,
  )
  const regionalTotal =
    (especialidadePediatria.new_admissions as number) +
    (especialidadePediatria.benchmark_admissions as number)
  const thread = page.getByTestId('assistant-thread')
  await expect(thread).toContainText(
    `${pt(((especialidadePediatria.new_admissions as number) / hospitalTotal) * 100, 1)}% das internações do hospital`,
  )
  await expect(thread).toContainText(
    `${pt(((especialidadePediatria.new_admissions as number) / regionalTotal) * 100, 1)}% das internações regionais`,
  )
  await expect(thread).toContainText(
    `${pt(especialidadePediatria.benchmark_hospitals as number)} outros hospitais`,
  )

  expect(chamadas).toBe(0)
})

test('invalida atalho local pendente quando hospital, competência ou especialidade deixam de coincidir', async ({ page }) => {
  let chamadas = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    chamadas += 1
    await route.abort()
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  await expect(page.getByTestId('specialty-summary')).toContainText('HU HOSPITAL UNIVERSITARIO')

  await page.evaluate(`(() => {
    const shortcut = document.querySelector(
      '[data-testid="specialty-summary"] .specialty-summary-actions button'
    )
    if (!shortcut) throw new Error('atalho local não encontrado')
    shortcut.click()

    const url = new URL(window.location.href)
    url.searchParams.set('hospital', '2786435')
    window.history.pushState({}, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })()`)

  await expect(page).toHaveURL(/hospital=2786435/)
  await expect(page.getByTestId('specialty-summary')).not.toContainText(
    'HU HOSPITAL UNIVERSITARIO',
  )
  await expect(page.getByTestId('assistant-thread')).toHaveCount(0)
  expect(chamadas).toBe(0)
})

test('Como interpretar só narra permanência quando a amostra comparável é suficiente', async ({ page }) => {
  let status: 'amostra_insuficiente' | 'benchmark_zero' = 'amostra_insuficiente'
  let chamadas = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    chamadas += 1
    await route.abort()
  })
  await page.route('**/api/dev/v1/hospitais/*/especialidades**', async (route) => {
    const url = new URL(route.request().url())
    const cnes = url.pathname.match(/hospitais\/(\d{7})\/especialidades$/)?.[1] ?? ''
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    const items = (specialtySnapshot.items as Record<string, unknown>[]).map((item) =>
      item.specialty_code === '07'
        ? {
            ...item,
            cnes,
            ipe: null,
            ipe_sample_status: status,
            average_stay_benchmark: status === 'benchmark_zero'
              ? 0
              : item.average_stay_benchmark,
          }
        : { ...item, cnes },
    )
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...specialtySnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { cnes, year, month },
        hospital: { ...(specialtySnapshot.hospital as object), cnes },
        items,
      }),
    })
  })

  const url = `/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`
  await page.goto(url)
  await page.getByTestId('specialty-summary').getByRole('button', { name: 'Como interpretar?' }).click()
  let answer = page.locator('.assistant-answer').last()
  await expect(answer).toContainText('amostra é insuficiente para comparação')
  await expect(answer).not.toContainText(/dias, ante .* outros hospitais/)

  status = 'benchmark_zero'
  await page.goto(url.replace('#hospital', '&cenario=benchmark-zero#hospital'))
  const zeroSummary = page.getByTestId('specialty-summary')
  await expect(zeroSummary).toContainText(
    'Os demais hospitais não têm permanência registrada para formar a referência',
  )
  await zeroSummary.getByRole('button', { name: 'Como interpretar?' }).click()
  answer = page.locator('.assistant-answer').last()
  await expect(answer).toContainText(
    'os demais hospitais não têm permanência registrada para formar a referência',
  )
  await expect(answer).not.toContainText(/dias, ante .* outros hospitais/)
  expect(chamadas).toBe(0)
})

test('preserva o resumo ao repetir a competência e selecionar a RRAS da região', async ({ page }) => {
  let chamadas = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    chamadas += 1
    await route.abort()
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  const resumo = page.getByTestId('specialty-summary')
  await expect(resumo).toContainText('HU HOSPITAL UNIVERSITARIO')
  await expect(resumo).toContainText(/Pediatria/i)

  // Repetir o mês selecionado não muda a identidade do resumo.
  await escolherCompetencia(page, snapshotCompetencia)
  await expect(resumo).toContainText('HU HOSPITAL UNIVERSITARIO')
  await expect(resumo).toContainText(/Pediatria/i)

  // A RRAS16 preserva Jundiaí e o hospital aberto; o seletor começa sem
  // macrorregião porque a URL compartilha a região diretamente.
  await page.getByTestId('global-macroregion').selectOption('3527')
  await expect(page).toHaveURL(/macrorregiao=3527/)
  await expect(page).toHaveURL(/regiao=35073/)
  await expect(page).toHaveURL(/hospital=3012212/)
  await expect(resumo).toContainText('HU HOSPITAL UNIVERSITARIO')
  await expect(resumo).toContainText(/Pediatria/i)

  await page.getByTestId('global-macroregion').selectOption('')
  await expect(page).not.toHaveURL(/macrorregiao=/)
  await expect(page).toHaveURL(/regiao=35073/)
  await expect(page).toHaveURL(/hospital=3012212/)
  await expect(resumo).toContainText('HU HOSPITAL UNIVERSITARIO')
  await expect(resumo).toContainText(/Pediatria/i)

  await resumo
    .getByRole('button', { name: 'Como interpretar?' })
    .click()
  await expect(page.getByTestId('assistant-thread')).toContainText(
    'Pediatria teve',
  )
  expect(chamadas).toBe(0)
})

test('snapshot mantém perguntas locais identificadas e recusa pergunta livre sem POST', async ({ page }) => {
  let chamadas = 0
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.abort('connectionfailed')
  })
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    chamadas += 1
    await route.abort()
  })

  await page.goto('/?regiao=35073&hospital=3012212#hospital')
  const resumo = page.getByTestId('specialty-summary')
  await expect(resumo).toBeVisible()
  await resumo
    .getByRole('button', { name: 'Como interpretar?' })
    .click()
  await expect(page.getByTestId('assistant-thread')).toContainText('snapshot de contingência')
  await expect(page.getByTestId('assistant-thread')).toContainText('não consultou o Oracle')

  await page.getByLabel('Faça outra pergunta').fill('uma pergunta livre sem fixture')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  await expect(page.getByTestId('assistant-thread')).toContainText('Perguntas livres ficam desabilitadas')
  expect(chamadas).toBe(0)
})

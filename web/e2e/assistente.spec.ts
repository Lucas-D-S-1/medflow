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
  specialtyDiagnosisSnapshot,
  specialtySnapshot,
} from './apoio'

const Q1_SAO_VICENTE = 'No São Vicente (2786435), em junho/2026, mostre todas as especialidades: internações, total de dias de permanência, permanência média e referência dos demais hospitais de Jundiaí. Ordene pelo total de dias de permanência; destaque diferenças com amostra suficiente.'
const Q2_SAO_VICENTE = 'dentro dessas 3 especilidades, me mostre os principais diagnósticos? gere os números igual gerou anteriormente'

const saoVicenteSpecialties = [
  { code: '03', name: 'Clínica médica', admissions: 730, days: 5666, average: 7.761644, peerAdmissions: 776, peerDays: 2846, peerHospitals: 10, peerAverage: 3.667526, ipe: 2.116316, comparison: 'suficiente' },
  { code: '01', name: 'Cirurgia', admissions: 592, days: 2939, average: 4.964527, peerAdmissions: 1272, peerDays: 2066, peerHospitals: 7, peerAverage: 1.624214, ipe: 3.056572, comparison: 'suficiente' },
  { code: '87', name: 'Saúde mental - clínico', admissions: 50, days: 328, average: 6.56, peerAdmissions: 0, peerDays: 0, peerHospitals: 0, peerAverage: null, ipe: null, comparison: 'amostra_insuficiente' },
] as const

const saoVicenteTop = {
  '03': [
    ['J448', 'Outras formas especificadas de doença pulmonar obstrutiva crônica', 53, 1010, 19.056604, 7.260274, 17.825627, 0, 0, 0, null],
    ['I64', 'Acidente vascular cerebral, não especificado como hemorrágico ou isquêmico', 49, 406, 8.285714, 6.712329, 7.165549, 22, 99, 5, 4.5],
    ['A419', 'Septicemia não especificada', 29, 274, 9.448276, 3.972603, 4.835863, 23, 234, 5, 10.173913],
    ['I500', 'Insuficiência cardíaca congestiva', 18, 220, 12.222222, 2.465753, 3.88281, 12, 71, 3, 5.916667],
    ['J180', 'Broncopneumonia não especificada', 31, 190, 6.129032, 4.246575, 3.353336, 14, 81, 5, 5.785714],
  ],
  '01': [
    ['I219', 'Infarto agudo do miocárdio não especificado', 58, 254, 4.37931, 9.797297, 8.642395, 0, 0, 0, null],
    ['S065', 'Hemorragia subdural devida a traumatismo', 18, 164, 9.111111, 3.040541, 5.580129, 0, 0, 0, null],
    ['K566', 'Outras formas de obstrução intestinal', 11, 106, 9.636364, 1.858108, 3.606669, 1, 8, 1, 8],
    ['S721', 'Fratura pertrocantérica', 14, 93, 6.642857, 2.364865, 3.164342, 0, 0, 0, null],
    ['J448', 'Outras formas especificadas de doença pulmonar obstrutiva crônica', 4, 85, 21.25, 0.675676, 2.89214, 0, 0, 0, null],
  ],
  '87': [
    ['F609', 'Transtorno não especificado da personalidade', 7, 83, 11.857143, 14, 25.304878, 0, 0, 0, null],
    ['F312', 'Transtorno afetivo bipolar', 3, 47, 15.666667, 6, 14.329268, 0, 0, 0, null],
    ['F603', 'Transtorno de personalidade com instabilidade emocional', 6, 34, 5.666667, 12, 10.365854, 0, 0, 0, null],
    ['F192', 'Transtornos pelo uso de múltiplas drogas', 2, 19, 9.5, 4, 5.792683, 0, 0, 0, null],
    ['F239', 'Transtorno psicótico agudo e transitório', 1, 17, 17, 2, 5.182927, 0, 0, 0, null],
  ],
} as const

async function mockSaoVicenteQ1Q2(page: import('@playwright/test').Page) {
  await page.route('**/api/dev/v1/hospitais/2786435/especialidades**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/diagnosticos')) return route.fallback()
    const baseItems = specialtySnapshot.items as Record<string, unknown>[]
    const items = saoVicenteSpecialties.map((item, index) => ({
      ...baseItems[index],
      cnes: '2786435',
      specialty_code: item.code,
      specialty_name: item.name,
      new_admissions: item.admissions,
      stay_days_total: item.days,
      average_stay_days: item.average,
      benchmark_admissions: item.peerAdmissions,
      benchmark_stay_days_total: item.peerDays,
      benchmark_hospitals: item.peerHospitals,
      average_stay_benchmark: item.peerAverage,
      ipe: item.ipe,
      ipe_sample_status: item.comparison,
      sample_status: 'suficiente',
    }))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...specialtySnapshot,
        source: 'oracle-live',
        database_time: '2026-09-17T12:00:00-03:00',
        filters: { cnes: '2786435', year: 2026, month: 6 },
        hospital: { ...(specialtySnapshot.hospital as object), cnes: '2786435', new_admissions_total: 1372 },
        pagination: { limit: 200, offset: 0, count: 3, has_more: false, order: 'new_admissions_desc' },
        items,
      }),
    })
  })
  await page.route(
    '**/api/dev/v1/hospitais/2786435/especialidades/*/diagnosticos**',
    async (route) => {
      const url = new URL(route.request().url())
      const code = url.pathname.match(/especialidades\/(\d{2})\/diagnosticos$/)?.[1] as keyof typeof saoVicenteTop
      const specialty = saoVicenteSpecialties.find((item) => item.code === code)!
      const limit = Number(url.searchParams.get('limit'))
      const rows = saoVicenteTop[code]
      const items = rows.map((row) => ({
        cnes: '2786435', specialty_code: code, specialty_name: specialty.name,
        cid_code: row[0], cid_description: row[1], chapter_code: 'X', chapter_description: 'Capítulo CID-10',
        new_admissions: row[2], stay_days_total: row[3], average_stay_days: row[4],
        admission_share_percent: row[5], stay_day_share_percent: row[6],
        benchmark_admissions: row[7], benchmark_stay_days_total: row[8], benchmark_hospitals: row[9],
        average_stay_benchmark: row[10], ipr: null, sample_status: 'amostra_insuficiente',
      }))
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ...specialtyDiagnosisSnapshot,
          source: 'oracle-live', database_time: '2026-09-17T12:00:00-03:00', data_through: '2026-06',
          filters: { cnes: '2786435', year: 2026, month: 6, specialty_code: code, order_by: 'dias' },
          hospital: { ...(specialtyDiagnosisSnapshot.hospital as object), cnes: '2786435', specialty_code: code, specialty_name: specialty.name, specialty_new_admissions_total: specialty.admissions, specialty_stay_days_total: specialty.days },
          pagination: { limit, offset: 0, count: 5, has_more: false, order: 'stay_days_desc' },
          items,
        }),
      })
    },
  )
}

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
        intent: 'pergunta_livre',
        specialties: [],
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

test('bloqueia ORA devolvido dentro da narrativa em vez de mostrá-lo como sucesso', async ({
  page,
}) => {
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-select-ai',
        response_id: 502,
        narrative: 'ORA-00904: c.CD_CID: invalid identifier',
        sql: null,
        warning: null,
      }),
    })
  })

  await page.goto('/regional?regiao=35073')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByLabel('Faça outra pergunta').fill('Pergunta livre de teste')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()

  const answer = page.locator('.assistant-answer').last()
  await expect(answer).toContainText('resposta do assistente veio incompleta ou insegura')
  await expect(answer).not.toContainText('ORA-00904')
})

test('executa Q1 e Q2 canônicos no São Vicente com conjunto estruturado e zero Select AI', async ({
  page,
}) => {
  await mockSaoVicenteQ1Q2(page)
  let selectAiCalls = 0
  let diagnosticRankingCalls = 0
  const diagnosticSpecialties: string[] = []
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    selectAiCalls += 1
    await route.abort()
  })
  await page.route(
    '**/api/dev/v1/hospitais/*/especialidades/*/diagnosticos**',
    async (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('limit') === '5') {
        diagnosticRankingCalls += 1
        diagnosticSpecialties.push(
          url.pathname.match(/especialidades\/(\d{2}|--)\/diagnosticos$/)?.[1] ?? '',
        )
      }
      await route.fallback()
    },
  )

  await page.goto('/?competencia=2026-06&regiao=35073&hospital=2786435#hospital')
  await expect(page.getByTestId('especialidade-count')).toHaveText('3 de 3 especialidades')
  await expect(page.getByTestId('specialty-summary')).toContainText(/Clínica médica/i)
  await page.getByRole('link', { name: 'Hospital' }).click()
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Contexto: visão hospitalar',
  )
  const input = page.getByLabel('Faça outra pergunta')

  await input.fill(Q1_SAO_VICENTE)
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  const first = page.locator('.assistant-answer').last()
  await expect(first).toContainText('Clínica médica (03): 730 internações, 5.666 dias')
  await expect(first).toContainText('Cirurgia (01): 592 internações, 2.939 dias')
  await expect(first).toContainText('Saúde mental - clínico (87): 50 internações, 328 dias')
  expect(await first.innerText()).toMatch(/Clínica médica[\s\S]*Cirurgia[\s\S]*Saúde mental/)
  await expect(first).toContainText('Ordenação: total de dias de permanência')
  await expect(first).toContainText('Fonte: dados do MedFlow consultados diretamente, junho/2026')

  await input.fill(Q2_SAO_VICENTE)
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  const followUp = page.locator('.assistant-answer').last()
  await expect(followUp).toContainText('Clínica médica (03) — top 3 por total de dias')
  await expect(followUp).toContainText('J448 — Outras formas especificadas de doença pulmonar obstrutiva crônica: 53 internações, 1.010 dias')
  await expect(followUp).toContainText('I64 — Acidente vascular cerebral')
  await expect(followUp).toContainText('Cirurgia (01)')
  await expect(followUp).toContainText('I219 — Infarto agudo do miocárdio não especificado: 58 internações, 254 dias')
  await expect(followUp).toContainText('Saúde mental - clínico (87)')
  await expect(followUp).toContainText('F609 — Transtorno não especificado da personalidade: 7 internações, 83 dias')
  await expect(followUp).toContainText('Sem outros hospitais neste recorte')
  await expect(followUp).toContainText(
    'Fonte: dados do MedFlow consultados diretamente, junho/2026',
  )
  expect(await followUp.innerText()).toMatch(/Clínica médica[\s\S]*Cirurgia[\s\S]*Saúde mental/)
  expect(diagnosticRankingCalls).toBe(3)
  expect(diagnosticSpecialties).toEqual(['03', '01', '87'])
  expect(selectAiCalls).toBe(0)
})

test('não responde top 5 de diagnósticos mais frequentes com ranking por dias', async ({
  page,
}) => {
  await mockSaoVicenteQ1Q2(page)
  const requests: { context: Record<string, unknown> }[] = []
  let diagnosticRankingCalls = 0
  await page.route(
    '**/api/dev/v1/hospitais/*/especialidades/*/diagnosticos**',
    async (route) => {
      if (new URL(route.request().url()).searchParams.get('limit') === '5') {
        diagnosticRankingCalls += 1
      }
      await route.fallback()
    },
  )
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    requests.push(route.request().postDataJSON() as { context: Record<string, unknown> })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-select-ai',
        response_id: 950 + requests.length,
        narrative: 'O critério explícito de frequência foi preservado.',
        sql: null,
        warning: null,
      }),
    })
  })

  await page.goto('/?competencia=2026-06&regiao=35073&hospital=2786435#hospital')
  await expect(page.getByTestId('especialidade-count')).toHaveText('3 de 3 especialidades')
  await expect(page.getByTestId('specialty-summary')).toContainText(/Clínica médica/i)
  await page.getByRole('link', { name: 'Hospital' }).click()
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Contexto: visão hospitalar',
  )
  const input = page.getByLabel('Faça outra pergunta')

  await input.fill(Q1_SAO_VICENTE)
  await input.press('Enter')
  await expect(page.locator('.assistant-answer').last()).toContainText('Clínica médica (03)')

  await input.fill(
    'dentro dessas 3 especialidades, mostre o top 5 de diagnósticos mais frequentes',
  )
  await input.press('Enter')
  await expect(page.locator('.assistant-answer').last()).toContainText(
    'O critério explícito de frequência foi preservado.',
  )

  expect(diagnosticRankingCalls).toBe(0)
  expect(requests).toHaveLength(1)
  for (const request of requests) {
    expect(request.context.specialties).toEqual([
      { code: '03', name: 'Clínica médica' },
      { code: '01', name: 'Cirurgia' },
      { code: '87', name: 'Saúde mental - clínico' },
    ])
  }
})

test('Q1 entrega a pergunta livre quando hospital, competência ou região explícitos divergem', async ({
  page,
}) => {
  await mockSaoVicenteQ1Q2(page)
  const contexts: Record<string, unknown>[] = []
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    contexts.push(
      (route.request().postDataJSON() as { context: Record<string, unknown> }).context,
    )
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok', source: 'oracle-select-ai', response_id: 901 + contexts.length,
        narrative: 'O recorte explícito foi preservado.', sql: null, warning: null,
      }),
    })
  })

  await page.goto('/?competencia=2026-06&regiao=35073&hospital=2786435#hospital')
  await expect(page.getByTestId('especialidade-count')).toHaveText('3 de 3 especialidades')
  await expect(page.getByTestId('specialty-summary')).toContainText(/Clínica médica/i)
  await page.getByRole('link', { name: 'Hospital' }).click()
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Contexto: visão hospitalar',
  )
  const input = page.getByLabel('Faça outra pergunta')
  const questions = [
    'No Hospital Universitário (3012212), em junho/2026, mostre todas as especialidades por dias.',
    'No Hospital Universitário, em junho/2026, mostre todas as especialidades por dias.',
    'No São Vicente (2786435), em maio/2026, mostre todas as especialidades por dias.',
    'No São Vicente (2786435), em junho/2026, mostre todas as especialidades e compare com os hospitais de Campinas.',
  ]
  for (const question of questions) {
    await input.fill(question)
    await input.press('Enter')
    await expect(page.locator('.assistant-answer').last()).toContainText(
      'O recorte explícito foi preservado.',
    )
  }

  expect(contexts).toHaveLength(4)
  for (const context of contexts) {
    expect(context.hospital_cnes).toBeNull()
    expect(context.competence).toBeNull()
    expect(context.region_code).toBeNull()
    expect(context.specialties).toEqual([])
  }
})

test('Q2 não reutiliza o conjunto anterior diante de recorte explícito divergente', async ({
  page,
}) => {
  await mockSaoVicenteQ1Q2(page)
  const requests: { question: string; context: Record<string, unknown> }[] = []
  let diagnosisRankingCalls = 0
  await page.route('**/api/dev/v1/hospitais/*/especialidades/*/diagnosticos**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('limit') === '5') {
      diagnosisRankingCalls += 1
    }
    await route.fallback()
  })
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    const body = route.request().postDataJSON() as {
      question: string
      context: Record<string, unknown>
    }
    requests.push(body)
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok', source: 'oracle-select-ai', response_id: 920 + requests.length,
        narrative: 'A pergunta explícita teve precedência.', sql: null, warning: null,
      }),
    })
  })

  await page.goto('/?competencia=2026-06&regiao=35073&hospital=2786435#hospital')
  await expect(page.getByTestId('especialidade-count')).toHaveText('3 de 3 especialidades')
  await expect(page.getByTestId('specialty-summary')).toContainText(/Clínica médica/i)
  await page.getByRole('link', { name: 'Hospital' }).click()
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Contexto: visão hospitalar',
  )
  const input = page.getByLabel('Faça outra pergunta')
  await input.fill(Q1_SAO_VICENTE)
  await input.press('Enter')
  await expect(page.locator('.assistant-answer').last()).toContainText('Clínica médica (03)')

  const questions = [
    `${Q2_SAO_VICENTE} no Hospital Universitário (3012212)`,
    `${Q2_SAO_VICENTE} em maio/2026`,
    `${Q2_SAO_VICENTE} para os hospitais de Campinas`,
    `${Q2_SAO_VICENTE} na especialidade Cirurgia`,
  ]
  for (const question of questions) {
    await input.fill(question)
    await input.press('Enter')
    await expect(page.locator('.assistant-answer').last()).toContainText(
      'A pergunta explícita teve precedência.',
    )
  }

  expect(diagnosisRankingCalls).toBe(0)
  expect(requests).toHaveLength(4)
  for (const request of requests) expect(request.context.specialties).toEqual([])
  for (const request of requests.slice(0, 3)) {
    expect(request.context.hospital_cnes).toBeNull()
    expect(request.context.competence).toBeNull()
    expect(request.context.region_code).toBeNull()
  }
  expect(requests[3].context.hospital_cnes).toBe('2786435')
  expect(requests[3].context.competence).toBe('2026-06')
})

test('não absorve mortalidade, todos os diagnósticos nem outro mês no top 5 anafórico', async ({
  page,
}) => {
  await mockSaoVicenteQ1Q2(page)
  let selectAiCalls = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    selectAiCalls += 1
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', source: 'oracle-select-ai', response_id: 700 + selectAiCalls, narrative: 'Pergunta explícita preservada.', sql: null, warning: null }),
    })
  })
  await page.goto('/?competencia=2026-06&regiao=35073&hospital=2786435#hospital')
  await page.getByRole('link', { name: 'Hospital' }).click()
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Contexto: visão hospitalar',
  )
  const input = page.getByLabel('Faça outra pergunta')
  await input.fill(Q1_SAO_VICENTE)
  await input.press('Enter')
  await expect(page.locator('.assistant-answer').last()).toContainText('Clínica médica (03)')

  for (const pergunta of [
    'dentro dessas 3 especialidades, qual a mortalidade por CID?',
    'dentro dessas 3 especialidades, mostre todos os diagnósticos',
    'dentro dessas 3 especialidades, mostre os principais diagnósticos em maio de 2026',
    'dentro dessas 3 especialidades, principais diagnósticos da especialidade cirurgia',
  ]) {
    await input.fill(pergunta)
    await input.press('Enter')
    await expect(page.locator('.assistant-answer').last()).toContainText('Pergunta explícita preservada.')
  }
  expect(selectAiCalls).toBe(4)
})

test('envia ao backend no máximo cinco especialidades estruturadas do conjunto anterior', async ({
  page,
}) => {
  let sentContext: Record<string, unknown> | null = null
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    sentContext = (route.request().postDataJSON() as { context: Record<string, unknown> }).context
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-select-ai',
        response_id: 503,
        narrative: 'Resposta livre auditada.',
        sql: null,
        warning: null,
      }),
    })
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  await expect(page.getByTestId('especialidade-count')).toHaveText('4 de 4 especialidades')
  await page.getByRole('link', { name: 'Hospital' }).click()
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Contexto: visão hospitalar',
  )
  const input = page.getByLabel('Faça outra pergunta')
  await input.fill('Quais as 3 especialidades com mais internações?')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  await expect(page.locator('.assistant-answer').last()).toContainText('Cirurgia (01)')

  await input.fill('Cruze esse conjunto com outra dimensão disponível.')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  await expect(page.locator('.assistant-answer').last()).toContainText('Resposta livre auditada')

  expect(sentContext).not.toBeNull()
  expect(sentContext!.hospital_cnes).toBe('3012212')
  expect(sentContext!.competence).toBe(snapshotCompetencia)
  expect(sentContext!.intent).toBe('pergunta_livre')
  expect(sentContext!.specialties).toEqual([
    { code: '07', name: 'Pediatria' },
    { code: '02', name: 'Obstetrícia' },
    { code: '01', name: 'Cirurgia' },
  ])
})

test('todas as especialidades mantém mais de cinco no conjunto local e não ressuscita conjunto antigo', async ({
  page,
}) => {
  await page.route('**/api/dev/v1/hospitais/3012212/especialidades**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/diagnosticos')) return route.fallback()
    const atuais = specialtySnapshot.items as Record<string, unknown>[]
    const extras = ['08', '09'].map((code, index) => ({
      ...atuais[3],
      specialty_code: code,
      specialty_name: `Especialidade extra ${index + 1}`,
      new_admissions: 10 - index,
      stay_days_total: 20 - index,
      benchmark_admissions: 0,
      benchmark_stay_days_total: 0,
      benchmark_hospitals: 0,
      average_stay_benchmark: null,
      ipe: null,
      ipe_sample_status: 'amostra_insuficiente',
    }))
    const items = [...atuais, ...extras].sort(
      (left, right) => Number(right.new_admissions) - Number(left.new_admissions),
    )
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...specialtySnapshot,
        source: 'oracle-live',
        filters: { cnes: '3012212', year: 2026, month: 6 },
        pagination: { limit: 200, offset: 0, count: 6, has_more: false, order: 'new_admissions_desc' },
        items,
      }),
    })
  })
  let selectAiCalls = 0
  let sentSpecialties: unknown[] = []
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    selectAiCalls += 1
    sentSpecialties = (route.request().postDataJSON() as { context: { specialties: unknown[] } }).context.specialties
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', source: 'oracle-select-ai', response_id: 810, narrative: 'Novo assunto respondido.', sql: null, warning: null }),
    })
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  await expect(page.getByTestId('especialidade-count')).toHaveText('6 de 6 especialidades')
  await page.getByRole('link', { name: 'Hospital' }).click()
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Contexto: visão hospitalar',
  )
  const input = page.getByLabel('Faça outra pergunta')
  await input.fill('Mostre todas as especialidades ordenadas pelo total de dias')
  await input.press('Enter')
  const resposta = page.locator('.assistant-answer').last()
  await expect(resposta).toContainText('Especialidade extra 2 (09)')

  await input.fill('Cruze com uma dimensão nova')
  await input.press('Enter')
  await expect(page.locator('.assistant-answer').last()).toContainText('Novo assunto respondido.')
  await input.fill(Q2_SAO_VICENTE)
  await input.press('Enter')
  await expect(page.locator('.assistant-answer').last()).toContainText(
    'Peça primeiro o ranking de especialidades',
  )
  expect(selectAiCalls).toBe(1)
  expect(sentSpecialties).toHaveLength(5)
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
  // O hash pode chegar antes de o observador da página contínua promover a
  // seção hospitalar. Se o teste preencher durante essa transição, o efeito
  // que limpa a pergunta ao trocar de etapa vence a digitação e desabilita o
  // envio. Espere o mesmo contexto que o usuário vê antes de interagir.
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Contexto: visão hospitalar',
  )

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

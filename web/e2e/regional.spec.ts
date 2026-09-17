/**
 * Visão regional.
 *
 * Onde está o sinal e como ele evolui: mapa por percentis, série mensal
 * e sazonalidade.
 */

import { expect, test } from '@playwright/test'
import {
  coberturaMetodologia,
  iphDaMacro3529,
  methodologySnapshot,
  competenciaVisivel,
  escolherCompetencia,
  mockLiveSource,
  pt,
  regiaoDestacada,
  regionalSeriesSnapshot,
  regionalSnapshot,
  serieRegionalAtual,
  snapshotCompetencia,
  snapshotCompetenciaBR,
  statusSnapshot,
} from './apoio'

test('renderiza a competência e a versão do contrato recebidas do Oracle', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...statusSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })
  await page.route('**/api/dev/v1/metodologia', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...methodologySnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto('/?regiao=35073')

  // Contrato e origem prestam contas apenas em Metodologia.
  await expect(page.getByTestId('source-badge')).toHaveCount(0)
  await expect(page.getByTestId('data-through')).toHaveCount(0)
  await expect(page.getByTestId('contract-version')).toHaveCount(0)
  await expect(page.getByText('CONTEXTO DA ANÁLISE')).toHaveCount(0)
  await expect(page.getByTestId('global-search')).toHaveCount(0)
  await expect.poll(() => competenciaVisivel(page)).toBe(snapshotCompetencia)
  await expect(page.getByTestId('regional-map-svg')).toHaveCount(1)
  await expect(page.locator('.regional-map-shape')).toHaveCount(62)
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
  await expect(page.getByLabel('Rede regional')).toContainText(
    'Rede regional 16 — Bragança e Jundiaí',
  )
  // Os números da região selecionada moram no cartão do mapa. Eles também
  // apareciam num quadro logo abaixo, repetidos, que saiu por isso.
  const cartao = page.getByTestId('regional-map-tooltip')
  await expect(cartao).toContainText(pt(regiaoDestacada.new_admissions as number))
  await expect(cartao).toContainText(`${pt(regiaoDestacada.iph_percent as number, 1)}%`)
  await expect(cartao).toContainText(`${pt(regiaoDestacada.tmh_percent as number, 1)}%`)
  await expect(cartao).toContainText(
    `${pt(regiaoDestacada.ipe_above_reference as number)} de ${pt(regiaoDestacada.ipe_eligible_pairs as number)}`,
  )


  await page.getByRole('link', { name: 'Metodologia' }).click()
  await expect(page.getByTestId('methodology-data-through')).toContainText(`Gold publicada até ${snapshotCompetenciaBR}`)
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-competencies')).toHaveText(
    String(coberturaMetodologia.competencies),
  )
  await expect(page.getByTestId('coverage-admissions')).toHaveText(
    pt(coberturaMetodologia.new_admissions),
  )
  await expect(page.getByTestId('coverage-patient-days')).toHaveText(
    pt(coberturaMetodologia.estimated_patient_days),
  )
  await expect(page.getByTestId('coverage-stay-days')).toHaveText(
    pt(coberturaMetodologia.stay_days),
  )
  await expect(
    page.getByRole('heading', { name: 'Por que Oracle neste MVP?' }),
  ).toBeVisible()
  await expect(page.locator('.database-decision')).toContainText('25 / 25')
  await expect(page.getByTestId('gold-updated-at')).toContainText('2026')
  await expect(page.getByTestId('formula-cmi')).toContainText('fator de correção IPCA')
  await expect(page.getByTestId('formula-iph')).toContainText('Pressão estimada sobre capacidade declarada, não ocupação física real.')
  await expect(page.getByTestId('cut-ipr')).toContainText('20 casos hospital/CID')
  await expect(page.getByTestId('reconciliation-new_admissions_cross_mart')).toContainText('diferença: 0')
  await expect(page.getByTestId('definition-billed_daily')).toContainText('QT_DIARIAS')
  await expect(page.getByTestId('state-benchmark_zero')).toContainText('IPR fica nulo')
  await expect(page.getByTestId('state-iph_denominator_zero')).toContainText('não imputa capacidade')
  await expect(page.getByTestId('territorial-hierarchy')).toContainText(
    'Rede Regional de Atenção à Saúde (RRAS)',
  )
})
test('filtra a competência sem abandonar o mapa espacial e o tamanho da amostra', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...statusSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })
  await page.route('**/api/dev/v1/metodologia', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...methodologySnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  let requestedCompetence = ''
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const year = Number(requestUrl.searchParams.get('ano') ?? '2026')
    const month = Number(requestUrl.searchParams.get('mes') ?? '5')
    const competence = `${year}-${String(month).padStart(2, '0')}`
    // MoM e YoY pedem a competência anterior e o mesmo mês do ano anterior no
    // mesmo endpoint. O que este teste observa é a competência escolhida.
    if (competence >= '2025-05') requestedCompetence = competence
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: requestedCompetence,
        filters: {
          year,
          month,
          macroregion_code: null,
          region_code: null,
        },
      }),
    })
  })

  await page.goto('/?regiao=35073')
  await expect.poll(() => competenciaVisivel(page)).toBe(snapshotCompetencia)
  await escolherCompetencia(page, '2025-05')

  await expect.poll(() => requestedCompetence).toBe('2025-05')
  await expect.poll(() => competenciaVisivel(page)).toBe('2025-05')
  await expect(page.locator('.regional-map-shape')).toHaveCount(62)
  // A amostra da região continua visível no cartão do mapa, que é onde os
  // números da região selecionada passaram a viver.
  await expect(page.getByTestId('regional-map-tooltip')).toContainText(
    pt(regiaoDestacada.new_admissions as number),
  )
})
test('expõe o mapa com percentis, seleção textual e uma única parada de tabulação', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto('/regional?regiao=35073')

  // O mapa abre colorido pelo placar de sinais. Este teste é sobre a escala por
  // percentis do IPH, então ele declara o indicador que exercita.
  await page.getByTestId('map-metric-iph').click()

  const map = page.getByTestId('regional-map-svg')
  await expect(map).not.toHaveAttribute('role', 'img')
  await expect(map.locator('[role="button"]')).toHaveCount(62)
  await expect(map.locator('[tabindex="0"]')).toHaveCount(1)
  await expect(page.getByTestId('regional-map-legend')).toContainText('mínimo real')
  await expect(page.getByTestId('regional-map-legend')).toContainText('máximo real')
  await expect(page.getByTestId('regional-map-legend')).toContainText('Escala visual relativa por percentis')
  await expect(page.getByTestId('regional-map-selection')).toContainText('Selecionada: JUNDIAI')

  const initialButton = map.locator('[tabindex="0"]')
  await initialButton.focus()
  await initialButton.press('ArrowRight')
  await expect(map.locator('[tabindex="0"]')).toHaveCount(1)
  await expect(page.getByTestId('regional-map-selection')).not.toContainText('JUNDIAI')

  await page.goto('/regional?macrorregiao=3529&regiao=35102')
  // Navegar recomeça no placar de sinais, que é o padrão do mapa.
  await page.getByTestId('map-metric-iph').click()
  await expect(page.getByTestId('regional-map-svg').locator('[role="button"]')).toHaveCount(4)
  await expect(page.getByTestId('regional-map-legend')).toContainText(
    `mínimo real ${pt(Math.min(...iphDaMacro3529), 1)}%`,
  )
  await expect(page.getByTestId('regional-map-legend')).toContainText(
    `máximo real ${pt(Math.max(...iphDaMacro3529), 1)}%`,
  )
})
test('renderiza a série regional persistida com competência, amostra e denominador', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto(`/regional?competencia=${snapshotCompetencia}&regiao=35073`)

  await expect(page.getByRole('heading', { name: 'Evolução regional' })).toBeVisible()
  await expect(page.locator('.regional-series-panel')).toContainText('JUNDIAI')
  await expect(page.getByTestId('regional-series-chart')).toBeVisible()
  await expect(page.getByTestId('regional-series-current')).toContainText('IPH estimado atual')
  await expect(page.getByTestId('regional-series-current')).toContainText(snapshotCompetenciaBR)
  await expect(page.getByTestId('regional-series-current')).toContainText(
    `${pt(serieRegionalAtual.iph_percent as number, 1)}%`,
  )
  const iphItems = (regionalSeriesSnapshot.items as Array<Record<string, number | string>>)
    .filter((item) => String(item.competence) <= snapshotCompetencia)
  const iphAverage = iphItems.reduce(
    (sum, item) => sum + (item.iph_percent as number),
    0,
  ) / iphItems.length
  let iphSum = 0
  const iphCumulative = [...iphItems]
    .sort((left, right) => String(left.competence).localeCompare(String(right.competence)))
    .map((item, index) => {
      iphSum += item.iph_percent as number
      return { competence: item.competence as string, average: iphSum / (index + 1) }
    })
  const compactStart = [...iphItems]
    .map((item) => String(item.competence))
    .sort()
    .slice(-12)[0]
  const chartMaximum = Math.max(
    ...iphItems
      .filter((item) => String(item.competence) >= compactStart)
      .map((item) => item.iph_percent as number),
    ...iphCumulative
      .filter((item) => item.competence >= compactStart)
      .map((item) => item.average),
  )
  const iphHistorical = page.getByTestId('regional-series-historical')
  await expect(iphHistorical).toContainText('Média acumulada')
  await expect(iphHistorical).toContainText(
    `−${pt(Math.abs((serieRegionalAtual.iph_percent as number) - iphAverage), 1)} p.p.`,
  )
  await expect(iphHistorical).toContainText(`Média acumulada até junho/2026: ${pt(iphAverage, 1)}%`)
  await expect(iphHistorical).toContainText(
    `${pt(iphItems.length)} competências desde janeiro/2024`,
  )
  await expect(page.locator('.regional-series-panel')).not.toContainText('média sazonal')
  const iphChart = page.getByTestId('regional-series-chart')
  await expect(iphChart.locator('path.series-baseline')).toHaveCount(1)
  await expect(iphChart.locator('desc')).toContainText(`máximo ${pt(chartMaximum, 1)}%`)

  const iphCurrentPoint = page.getByTestId(`regional-series-point-${snapshotCompetencia}`)
  await expect(iphCurrentPoint).toHaveAttribute(
    'aria-label',
    new RegExp(`Média acumulada até junho/2026: ${pt(iphAverage, 1)}%; ${iphItems.length} competências desde janeiro/2024`),
  )
  await iphCurrentPoint.hover()
  const iphTooltip = page.getByRole('tooltip')
  await expect(iphTooltip).toContainText(`${snapshotCompetenciaBR} · IPH estimado`)
  await expect(iphTooltip).toContainText(
    `${pt(serieRegionalAtual.estimated_patient_days as number)} pacientes-dia / ${pt(serieRegionalAtual.declared_capacity_bed_days as number)} leitos-dia declarados`,
  )
  await expect(iphTooltip).toContainText(
    `Média acumulada até junho/2026: ${pt(iphAverage, 1)}% · ${pt(iphItems.length)} competências`,
  )
  await iphCurrentPoint.focus()
  await iphCurrentPoint.press('Escape')
  await expect(iphTooltip).not.toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'Indicador da evolução regional' }).getByRole('radio')).toHaveCount(2)
  await expect(page.getByRole('radio', { name: 'TMH observado' })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Ante os pares (IPE)' })).toHaveCount(0)

  await page.getByRole('radio', { name: 'Internações novas' }).click()
  await expect(page.locator('.regional-series-panel')).toContainText(
    'Produção mensal · histórico publicado',
  )
  await expect(page.locator('.regional-series-panel')).not.toContainText(
    'Estimativa mensal · histórico publicado',
  )
  await expect(page.getByTestId('regional-series-current')).toContainText(
    pt(serieRegionalAtual.new_admissions as number),
  )

  const currentPoint = page.getByTestId(`regional-series-point-${snapshotCompetencia}`)
  await currentPoint.hover()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toContainText(`${snapshotCompetenciaBR} · Internações novas`)
  await expect(tooltip).toContainText(pt(serieRegionalAtual.new_admissions as number))
  await expect(tooltip).toContainText(
    `${pt(serieRegionalAtual.hospitals_with_admissions as number)} hospitais com produção`,
  )
  await currentPoint.focus()
  await currentPoint.press('Escape')
  await expect(tooltip).not.toBeVisible()

  const details = page.locator('.series-values-details')
  await expect(details.locator('summary')).toContainText('12 meses')
  await details.locator('summary').click()
  await expect(details.locator('tbody tr')).toHaveCount(12)
  await expect(details.locator('tbody tr').first()).toContainText(
    `${pt(serieRegionalAtual.hospitals_with_admissions as number)} hospitais com produção`,
  )
  await page.getByRole('button', { name: 'Todo o histórico' }).click()
  await expect(details.locator('tbody tr')).toHaveCount(
    (regionalSeriesSnapshot.items as unknown[]).length,
  )
})

test('o gráfico rejeita IPH com denominador publicado igual a zero', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/*/serie**', async (route) => {
    const items = (regionalSeriesSnapshot.items as Record<string, unknown>[]).map((item) =>
      item.competence === snapshotCompetencia
        ? { ...item, declared_capacity_bed_days: 0 }
        : item,
    )
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSeriesSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        items,
      }),
    })
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073`)
  await expect(page.getByTestId('regional-series-current')).toContainText('indisponível')
  await expect(page.getByTestId(`regional-series-point-${snapshotCompetencia}`)).toHaveCount(0)
  await page.locator('.series-values-details summary').click()
  await expect(page.locator('.series-values-details tbody tr').first()).toContainText('não publicado')
})
test('explica pelo contrato quando a sazonalidade não é calculada', async ({ page }) => {
  await mockLiveSource(page)
  const items = regionalSnapshot.items as Array<Record<string, unknown>>
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: '2024-03',
        filters: {
          year: 2024,
          month: 3,
          macroregion_code: null,
          region_code: null,
        },
        items: items.map((item, index) =>
          index === 0
            ? {
                ...item,
                seasonality_index: null,
                seasonal_variation_percent: null,
                seasonality_status: 'fora_periodo_alvo',
                historical_years: 2,
              }
            : item,
        ),
      }),
    })
  })

  await page.goto('/regional?competencia=2024-03&regiao=35073')

  // A explicação mudou de lugar, não de exigência: ela vive na série mensal,
  // ao lado da curva que qualifica. Dizer só "não calculado" trataria fora do
  // período-alvo e histórico insuficiente como a mesma coisa.
  await page.getByRole('radio', { name: 'Internações novas' }).click()
  await expect(page.getByTestId('regional-series-historical')).toContainText(
    'Fora do período-alvo da sazonalidade publicada',
  )
})
test('mantém a metodologia colapsável', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto('/regional?regiao=35073')

  await page.getByRole('link', { name: 'Metodologia' }).click()
  await expect(page).toHaveURL(/\/metodologia(\?|$)/)

  // O IPE presta contas da própria cobertura no mesmo lugar que os demais: os
  // elegíveis sobre o total de linhas hospital/especialidade, e a fórmula e o
  // corte declarados ao lado dos do IPR.
  await expect(page.getByTestId('coverage-eligible-ipe')).toContainText(
    pt((methodologySnapshot.coverage as Record<string, number>).eligible_ipe_rows),
  )
  // A fórmula mora num bloco colapsado: conferimos que ela existe, não que
  // esteja aberta.
  await expect(
    page.getByText('permanência média hospital/especialidade', { exact: false }),
  ).toHaveCount(1)

  // Cinco, não seis: reconciliação e limites subiram para blocos visíveis, e
  // cortes absorveu os estados de ausência, que são o mesmo assunto visto dos
  // dois lados.
  const details = page.locator('.methodology-details details')
  await expect(details).toHaveCount(5)
  await expect(details.first()).not.toHaveAttribute('open', '')
  await details.first().locator('summary').click()
  const detailHeight = await details.first().locator('.detail-scroll').evaluate(
    (element) =>
      (element as unknown as { getBoundingClientRect: () => { height: number } })
        .getBoundingClientRect().height,
  )
  expect(detailHeight).toBeLessThanOrEqual(0.45 * 720 + 1)
})

test('a escala do placar usa a rampa inteira, do melhor ao pior do recorte', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}`)
  await expect(page.locator('.regional-map-shape')).toHaveCount(62)

  // Os cortes eram fixos em 0, 1, 2 e 3. Como o recorte publicado chega no
  // máximo a 3 dos 6 sinais, os dois tons escuros nunca apareciam: o mapa
  // inteiro ficava na metade clara, e a legenda exibia um tom que região
  // nenhuma tinha. Sem o tom mais escuro em uso, "quem é o pior" não se vê.
  await expect(page.locator('.regional-map-shape.tone-1').first()).toBeVisible()
  await expect(page.locator('.regional-map-shape.tone-5').first()).toBeVisible()
})

test('o mapa pode colorir pelo placar que consome os seis indicadores', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}`)

  // O padrão é o placar: ele é o que responde "onde olhar primeiro", enquanto
  // o IPH sozinho é um dos seis sinais que ele conta.
  await expect(page.locator('#map-title')).toContainText('Sinais por região')
  await expect(page.getByTestId('regional-map-legend')).toContainText('sinais')
  await expect(page.getByTestId('regional-map-legend')).toContainText(
    'não nota de qualidade',
  )

  await page.getByTestId('map-metric-iph').click()
  await expect(page.locator('#map-title')).toContainText('IPH estimado')
  await expect(page.getByTestId('regional-map-legend')).toContainText('mínimo real')

  await page.getByTestId('map-metric-sinais').click()
  await expect(page.locator('#map-title')).toContainText('Sinais por região')
})

test('hierarquiza a região selecionada, expõe os seis sinais e isola ações do hover', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35071`)

  const cartao = page.getByTestId('regional-map-tooltip')
  await expect(cartao).toContainText('SINAIS DE ATENÇÃO')
  await expect(cartao).toContainText('Competência junho/2026')
  await expect(cartao).toContainText('Estimativa mensal')
  await expect(cartao).toContainText('Internações novas')
  await expect(cartao).toContainText('Permanência média')
  await expect(cartao.getByRole('button', { name: 'O que são os sinais?' })).toBeVisible()
  await expect(cartao.getByRole('button', { name: 'O que é IPH?' })).toBeVisible()
  await expect(cartao.getByRole('button', { name: 'Ver hospitais da região ↓' })).toBeVisible()

  const comparacoes = page.getByTestId('map-card-admissions-comparisons')
  await expect(comparacoes).toContainText('Em relação a maio/2026')
  await expect(comparacoes).toContainText('Em relação a junho/2025')
  await expect(comparacoes).not.toContainText('MoM')
  await expect(comparacoes).not.toContainText('YoY')

  const disclosure = page.getByTestId('map-card-other-indicators')
  const summary = disclosure.locator('summary')
  await summary.focus()
  await summary.press('Enter')
  await expect(disclosure).toHaveAttribute('open', '')
  await expect(disclosure.locator('[data-signal]')).toHaveCount(4)
  await expect(disclosure.locator('[data-signal="iph"]')).toHaveCount(0)
  await expect(disclosure.locator('[data-signal="stay"]')).toHaveCount(0)
  await expect(disclosure).not.toContainText('P80')
  await expect(disclosure).not.toContainText('percentil 80')
  await expect(disclosure).toContainText('Acima dos pares (IPE)')
  await expect(disclosure.locator('[data-signal="tmh"]')).toContainText('sinal aceso')
  for (const signal of ['cmi', 'evasion', 'icsap']) {
    await expect(disclosure.locator(`[data-signal="${signal}"]`)).not.toContainText('sinal aceso')
  }

  // JUNDIAI é só a prévia sob o ponteiro. Nenhuma ação pode herdar BRAGANCA,
  // a seleção que continua na URL e no filtro compartilhado.
  await page.getByTestId('regional-map-35073').hover()
  await expect(cartao).toContainText('JUNDIAI')
  await expect(cartao.getByRole('button')).toHaveCount(0)
  await expect(cartao.locator('details')).toHaveCount(0)
  await expect(page.getByTestId('global-region')).toHaveValue('35071')

  await page.mouse.move(2, 2)
  await expect(cartao).toContainText('BRAGANCA')
  await expect(cartao.getByRole('button', { name: 'Ver hospitais da região ↓' })).toBeVisible()
})

test('não transforma comparação ausente de internações novas em zero', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    const competence = `${year}-${String(month).padStart(2, '0')}`
    const isComparison = competence === '2026-05' || competence === '2025-06'
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: competence,
        filters: { year, month, macroregion_code: null, region_code: null },
        items: isComparison ? [] : regionalSnapshot.items,
        pagination: isComparison
          ? { ...(regionalSnapshot.pagination as Record<string, unknown>), count: 0 }
          : regionalSnapshot.pagination,
      }),
    })
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073`)
  const comparacoes = page.getByTestId('map-card-admissions-comparisons')
  await expect(comparacoes).toContainText('sem comparação disponível')
  await expect(comparacoes).not.toContainText('0,0%')
})

test('explicações locais de sinais e IPH usam a FlowIA sem POST e preservam o robô', async ({ page }) => {
  await mockLiveSource(page)
  const posts: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST') posts.push(request.url())
  })
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073`)

  await expect(page.locator('.assistant-launcher .assistant-robot')).toHaveCount(1)
  await page.getByRole('button', { name: 'O que são os sinais?' }).click()
  await expect(page.locator('.assistant-header .assistant-robot.compact')).toHaveCount(1)
  await expect(page.getByTestId('assistant-thread')).toContainText(
    'triagem comparativa para investigar, não ranking ou nota de qualidade',
  )
  expect(posts).toEqual([])

  await page.getByRole('button', { name: 'Fechar assistente' }).click()
  await page.getByRole('button', { name: 'O que é IPH?' }).click()
  await expect(page.getByTestId('assistant-thread')).toContainText(
    'não uma taxa de ocupação real',
  )
  expect(posts).toEqual([])
})

test('a metodologia responde as duas metades do proprio titulo', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto('/metodologia')

  // "Posso confiar no número e quais são seus limites?" — a reconciliação e as
  // limitações respondem uma metade cada, e estavam as duas colapsadas, uma
  // delas a dois cliques. O que ficou colapsado é material de consulta.
  await expect(page.getByTestId('reconciliation-patient_days_cross_mart')).toBeVisible()
  await expect(page.getByTestId('reconciliation-patient_days_cross_mart')).toContainText(
    'diferença: 0',
  )
  await expect(page.getByTestId('methodology-limits')).toBeVisible()
  await expect(page.getByTestId('methodology-limits')).toContainText('sem ajuste de risco')

  // O texto da metodologia vem do banco, e chegava inteiro sem acento.
  const prosa = await page.getByTestId('methodology-limits').innerText()
  expect(prosa).toContain('clínico')
  expect(prosa).not.toContain('clinico')
})

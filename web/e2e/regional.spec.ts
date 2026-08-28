/**
 * Visão regional.
 *
 * Onde está o sinal e como ele evolui: mapa por percentis, ranking
 * com amostra, série mensal e sazonalidade.
 */

import { expect, test } from '@playwright/test'
import {
  coberturaMetodologia,
  iphDaMacro3529,
  methodologySnapshot,
  mockLiveSource,
  paginacao,
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
  await expect(page.getByTestId('regional-context-note')).toContainText(snapshotCompetenciaBR)
  await expect(page.getByTestId('regional-count')).toHaveText('62 de 62 regiões')
  await expect(page.getByTestId('global-competence')).toHaveValue(snapshotCompetencia)
  await expect(page.getByTestId('regional-map-svg')).toHaveCount(1)
  await expect(page.locator('.regional-map-shape')).toHaveCount(62)
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
  await expect(page.getByLabel('Rede Regional de Atenção à Saúde')).toContainText(
    'Rede regional 16 — Bragança e Jundiaí',
  )
  await expect(page.getByTestId('regional-admissions')).toHaveText(
    pt(regiaoDestacada.new_admissions as number),
  )
  await expect(page.getByTestId('regional-ranking-sample-35073')).toContainText(
    pt(regiaoDestacada.new_admissions as number),
  )
  await expect(page.getByTestId('regional-iph')).toHaveText(
    `${pt(regiaoDestacada.iph_percent as number, 1)}%`,
  )
  await expect(page.getByTestId('regional-tmh')).toHaveText(
    `${pt(regiaoDestacada.tmh_percent as number, 1)}%`,
  )
  await expect(page.getByTestId('regional-cmi')).toContainText(
    pt(regiaoDestacada.cmi_real as number, 2),
  )
  await expect(page.getByTestId('regional-seasonality')).toHaveText(
    pt(regiaoDestacada.seasonality_index as number, 2),
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
  await expect(page.getByTestId('formula-cmi')).toContainText('fator de correcao IPCA')
  await expect(page.getByTestId('formula-iph')).toContainText('Pressao estimada sobre capacidade declarada, nao ocupacao fisica real.')
  await expect(page.getByTestId('cut-ipr')).toContainText('20 casos hospital/CID')
  await expect(page.getByTestId('reconciliation-new_admissions_cross_mart')).toContainText('diferença: 0')
  await expect(page.getByTestId('definition-billed_daily')).toContainText('QT_DIARIAS')
  await expect(page.getByTestId('state-benchmark_zero')).toContainText('IPR fica nulo')
  await expect(page.getByTestId('state-iph_denominator_zero')).toContainText('nao imputa capacidade')
  await expect(page.getByTestId('territorial-hierarchy')).toContainText(
    'Rede Regional de Atenção à Saúde (RRAS)',
  )
})
test('filtra a competência sem abandonar o mapa espacial e o tamanho da amostra', async ({ page }) => {
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
    requestedCompetence = `${year}-${String(month).padStart(2, '0')}`
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
  await expect(page.getByTestId('global-competence')).toHaveValue(snapshotCompetencia)
  await page.getByTestId('global-competence').fill('2025-05')

  await expect.poll(() => requestedCompetence).toBe('2025-05')
  await expect(page.getByTestId('regional-context-note')).toContainText('05/2025')
  await expect(page.locator('.regional-map-shape')).toHaveCount(62)
  await expect(page.getByTestId('regional-ranking-sample-35073')).toContainText(
    `amostra: ${pt(regiaoDestacada.new_admissions as number)} internações novas`,
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
  await expect(page.getByTestId('regional-count')).toHaveText('4 de 62 regiões')
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

  await expect(page.getByRole('heading', { name: 'Série de JUNDIAI' })).toBeVisible()
  await expect(page.getByTestId('regional-series-chart')).toBeVisible()
  await expect(page.getByTestId('regional-series-current')).toContainText(`${snapshotCompetenciaBR} · IPH estimado`)
  await expect(page.getByTestId('regional-series-current')).toContainText(
    `${pt(serieRegionalAtual.iph_percent as number, 1)}%`,
  )
  await expect(page.getByTestId('regional-series-current')).toContainText(
    `${pt(serieRegionalAtual.estimated_patient_days as number)} pacientes-dia / ` +
      `${pt(serieRegionalAtual.declared_capacity_bed_days as number)} leitos-dia declarados`,
  )

  await page.getByRole('radio', { name: 'TMH observado' }).click()
  await expect(page.getByTestId('regional-series-current')).toContainText(
    `${pt(serieRegionalAtual.tmh_percent as number, 1)}%`,
  )
  await expect(page.getByTestId('regional-series-current')).toContainText(
    `${pt(serieRegionalAtual.deaths as number)} óbitos · ` +
      `${pt(serieRegionalAtual.new_admissions as number)} internações`,
  )

  const currentPoint = page.getByTestId(`regional-series-point-${snapshotCompetencia}`)
  await currentPoint.hover()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toContainText(`${snapshotCompetenciaBR} · TMH observado`)
  await expect(tooltip).toContainText(`${pt(serieRegionalAtual.tmh_percent as number, 1)}%`)
  await expect(tooltip).toContainText(
    `${pt(serieRegionalAtual.deaths as number)} óbitos · ` +
      `${pt(serieRegionalAtual.new_admissions as number)} internações`,
  )
  await currentPoint.focus()
  await currentPoint.press('Escape')
  await expect(tooltip).not.toBeVisible()

  const details = page.locator('.series-values-details')
  await expect(details.locator('summary')).toContainText(
    `6 de ${paginacao(regionalSeriesSnapshot).count}`,
  )
  await details.locator('summary').click()
  await expect(details.locator('tbody tr')).toHaveCount(6)
  await details
    .getByRole('button', {
      name: `Ver todas as ${paginacao(regionalSeriesSnapshot).count} competências`,
    })
    .click()
  await expect(details.locator('tbody tr')).toHaveCount(paginacao(regionalSeriesSnapshot).count)
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

  const seasonalityValue = page.getByTestId('regional-seasonality')
  await expect(seasonalityValue).toHaveText('não calculado')
  await expect(seasonalityValue.locator('..').locator('small')).toHaveText(
    'Competência fora do período-alvo definido para sazonalidade',
  )
})
test('declara o ranking truncado, permite ver tudo e mantém metodologia colapsável', async ({ page }) => {
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
  await expect(page.getByTestId('regional-ranking-count')).toHaveText('8 de 62')
  await page.getByRole('button', { name: 'Ver todas as 62 regiões' }).click()
  await expect(page.getByTestId('regional-ranking-count')).toHaveText('62 de 62')
  await expect(page.locator('.ranking-list li')).toHaveCount(62)

  await page.getByRole('link', { name: 'Metodologia' }).click()
  await expect(page).toHaveURL(/\/metodologia(\?|$)/)
  const details = page.locator('.methodology-details details')
  await expect(details).toHaveCount(6)
  await expect(details.first()).not.toHaveAttribute('open', '')
  await details.first().locator('summary').click()
  const detailHeight = await details.first().locator('.detail-scroll').evaluate(
    (element) =>
      (element as unknown as { getBoundingClientRect: () => { height: number } })
        .getBoundingClientRect().height,
  )
  expect(detailHeight).toBeLessThanOrEqual(0.45 * 720 + 1)
})

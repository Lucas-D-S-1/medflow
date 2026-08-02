import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const statusSnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/status.json', import.meta.url), 'utf8'),
) as Record<string, string>
const methodologySnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/metodologia.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
const regionalSnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/regioes-resumo.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
const regionalSeriesSnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/regiao-serie-35073.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
const goldMetadata = JSON.parse(
  readFileSync(
    new URL('../../dados/gold/qualidade/METADADOS.json', import.meta.url),
    'utf8',
  ),
) as { gerado_em_utc: string }

async function mockLiveSource(page: Page) {
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
  await page.route('**/api/dev/v1/regioes/*/serie**', async (route) => {
    const match = new URL(route.request().url()).pathname.match(/regioes\/(\d{5})\/serie$/)
    const regionCode = match?.[1] ?? ''
    const fixtureRegion = regionalSeriesSnapshot.region as Record<string, unknown>
    const payload = regionCode === fixtureRegion.region_code
      ? {
          ...regionalSeriesSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
        }
      : {
          ...regionalSeriesSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: null,
          region: {
            region_code: regionCode,
            region_name: null,
            macroregion_code: null,
            macroregion_name: null,
          },
          filters: { region_code: regionCode },
          pagination: {
            limit: 100,
            offset: 0,
            count: 0,
            has_more: false,
            order: 'competence_desc',
          },
          items: [],
        }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) })
  })
}

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

  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toHaveText('Oracle ao vivo')
  await expect(page.getByTestId('data-through')).toHaveText('05/2026')
  await expect(page.getByTestId('contract-version')).toHaveText('v0.3.0')
  await expect(page.getByTestId('regional-data-through')).toContainText('05/2026')
  await expect(page.getByTestId('regional-source')).toHaveText('Oracle ao vivo')
  await expect(page.getByTestId('regional-count')).toHaveText('62 de 62 regiões')
  await expect(page.getByTestId('regional-competence')).toHaveValue('2026-05')
  await expect(page.getByTestId('regional-map-svg')).toHaveCount(1)
  await expect(page.locator('.regional-map-shape')).toHaveCount(62)
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
  await expect(page.getByTestId('regional-admissions')).toHaveText('4.797')
  await expect(page.getByTestId('regional-ranking-sample-35073')).toContainText('4.797')
  await expect(page.getByTestId('regional-iph')).toHaveText('65,0%')
  await expect(page.getByTestId('regional-tmh')).toHaveText('3,5%')
  await expect(page.getByTestId('regional-cmi')).toContainText('1.237')
  await expect(page.getByTestId('regional-seasonality')).toHaveText('0,98')

  await page.getByRole('link', { name: 'Metodologia' }).click()
  await expect(page.getByTestId('methodology-data-through')).toContainText('Gold publicada até 05/2026')
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-competencies')).toHaveText('29')
  await expect(page.getByTestId('coverage-admissions')).toHaveText('6.905.441')
  await expect(page.getByTestId('coverage-patient-days')).toHaveText('32.425.897')
  await expect(page.getByTestId('coverage-stay-days')).toHaveText('32.029.295')
  await expect(page.getByTestId('gold-updated-at')).toContainText('2026')
  await expect(page.getByTestId('formula-cmi')).toContainText('fator de correcao IPCA')
  await expect(page.getByTestId('formula-iph')).toContainText('Pressao estimada sobre capacidade declarada, nao ocupacao fisica real.')
  await expect(page.getByTestId('cut-ipr')).toContainText('20 casos hospital/CID')
  await expect(page.getByTestId('reconciliation-new_admissions_cross_mart')).toContainText('diferença: 0')
  await expect(page.getByTestId('definition-billed_daily')).toContainText('QT_DIARIAS')
  await expect(page.getByTestId('state-benchmark_zero')).toContainText('IPR fica nulo')
  await expect(page.getByTestId('state-iph_denominator_zero')).toContainText('nao imputa capacidade')
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

  await page.goto('/')
  await expect(page.getByTestId('regional-competence')).toHaveValue('2026-05')
  await page.getByTestId('regional-competence').fill('2025-05')

  await expect.poll(() => requestedCompetence).toBe('2025-05')
  await expect(page.getByTestId('regional-data-through')).toHaveText(/05\/2025/)
  await expect(page.locator('.regional-map-shape')).toHaveCount(62)
  await expect(page.getByTestId('regional-ranking-sample-35073')).toContainText(
    'amostra: 4.797 internações novas',
  )
})

test('renderiza os números reais do Oracle pelo proxy relativo', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toHaveText('Oracle ao vivo', { timeout: 15_000 })
  await expect(page.getByTestId('data-through')).toHaveText('05/2026')
  await expect(page.getByTestId('regional-count')).toHaveText('62 de 62 regiões')
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
  await expect(page.getByTestId('regional-admissions')).toHaveText('4.797')
  await expect(page.getByTestId('fallback-note')).toHaveCount(0)
  await page.getByRole('link', { name: 'Metodologia' }).click()
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-admissions')).toHaveText('6.905.441')
  await expect(page.getByTestId('coverage-benchmark-zero')).toHaveText('6.680')
  await expect(page.getByTestId('reconciliation-patient_days_cross_mart')).toContainText('diferença: 0')
})

test('usa somente o snapshot quando o Oracle falha', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toContainText(
    'Contingência — snapshot até 2026-05',
  )
  await expect(page.getByTestId('data-through')).toHaveText('05/2026')
  await expect(page.getByTestId('contract-version')).toHaveText('v0.3.0')
  await expect(page.getByTestId('fallback-note')).toContainText('nenhuma fonte foi misturada')
  await expect(page.getByTestId('regional-competence')).toBeDisabled()
  await expect(page.getByTestId('regional-series-source')).toHaveText(
    'Snapshot de contingência',
  )
  await expect(page.getByTestId('regional-series-current')).toContainText('65,0%')
  await page.getByRole('link', { name: 'Metodologia' }).click()
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-admissions')).toHaveText('6.905.441')
})

test('distingue ausência legítima de indisponibilidade do Oracle', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: null,
        contract_version: '0.3.0',
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByTestId('empty-state')).toContainText(
    'Nenhuma competência publicada',
  )
  await expect(page.getByTestId('empty-state')).toContainText(
    'A fonte respondeu normalmente',
  )
  await expect(page.getByTestId('source-badge')).toHaveCount(0)
  await expect(page.getByTestId('fallback-note')).toHaveCount(0)
})

test('não descreve contrato inválido como indisponibilidade do Oracle', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...statusSnapshot,
        source: 'oracle-live',
        data_through: '-',
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toContainText('Contingência')
  await expect(page.getByTestId('fallback-note')).toContainText(
    'O Oracle respondeu, mas o conteúdo não corresponde ao contrato da API',
  )
  await expect(page.getByTestId('fallback-note')).not.toContainText(
    'Oracle não respondeu',
  )
})

test('não mistura metodologia snapshot com status Oracle ao vivo', async ({ page }) => {
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
        formulas: [],
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toContainText(
    'Contingência — snapshot até 2026-05',
  )
  await expect(page.getByTestId('fallback-note')).toContainText(
    'O Oracle respondeu, mas o conteúdo não corresponde ao contrato da API',
  )
  await page.getByRole('link', { name: 'Metodologia' }).click()
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-admissions')).toHaveText('6.905.441')
})

test('rejeita snapshot, competência, versão e horário inválidos na resposta live', async ({ page }) => {
  let responsePayload: Record<string, unknown> = {
    ...statusSnapshot,
    source: 'oracle-live',
  }

  await page.route('**/api/dev/v1/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(responsePayload),
    })
  })

  for (const invalidField of [
    { source: 'snapshot' },
    { data_through: '2026-99' },
    { contract_version: '9.9.9' },
    { database_time: 'horário desconhecido' },
  ]) {
    responsePayload = {
      ...statusSnapshot,
      source: 'oracle-live',
      ...invalidField,
    }

    await page.goto('/')

    await expect(page.getByTestId('source-badge')).toContainText('Contingência')
    await expect(page.getByTestId('fallback-note')).toContainText(
      'O Oracle respondeu, mas o conteúdo não corresponde ao contrato da API',
    )
    await expect(page.getByTestId('data-through')).toHaveText('05/2026')
  }
})

test('mantém a geração do snapshot verificável na metadata da Gold', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.abort('connectionfailed')
  })

  expect(statusSnapshot.database_time).toBe(goldMetadata.gerado_em_utc)

  await page.goto('/')

  await expect(page.getByTestId('data-through')).toHaveText('05/2026')
  await expect(page.getByTestId('contract-version')).toHaveText('v0.3.0')
})

test('preserva filtros na URL e ignora resposta atrasada de outra competência', async ({ page }) => {
  await mockLiveSource(page)

  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    const competence = `${year}-${String(month).padStart(2, '0')}`
    if (competence === '2025-04') {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    try {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ...regionalSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: competence,
          filters: { year, month, macroregion_code: null, region_code: null },
        }),
      })
    } catch {
      // A primeira requisição pode já ter sido cancelada pelo AbortController.
    }
  })

  await page.goto('/regional?competencia=2026-05&macrorregiao=3527&regiao=35073')
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')

  await page.getByTestId('regional-competence').fill('2025-04')
  await page.getByTestId('regional-competence').fill('2025-05')

  await expect(page.getByTestId('regional-data-through')).toContainText('05/2025')
  await expect(page).toHaveURL(/competencia=2025-05/)
  await expect(page).toHaveURL(/macrorregiao=3527/)
  await expect(page).toHaveURL(/regiao=35073/)
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
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

  await page.goto('/regional')

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

  await page.goto('/regional?macrorregiao=3529')
  await expect(page.getByTestId('regional-count')).toHaveText('4 de 62 regiões')
  await expect(page.getByTestId('regional-map-svg').locator('[role="button"]')).toHaveCount(4)
  await expect(page.getByTestId('regional-map-legend')).toContainText('mínimo real 37,9%')
  await expect(page.getByTestId('regional-map-legend')).toContainText('máximo real 61,9%')
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

  await page.goto('/regional?competencia=2026-05&regiao=35073')

  await expect(page.getByRole('heading', { name: 'Série de JUNDIAI' })).toBeVisible()
  await expect(page.getByTestId('regional-series-source')).toHaveText('Oracle ao vivo')
  await expect(page.getByTestId('regional-series-chart')).toBeVisible()
  await expect(page.getByTestId('regional-series-current')).toContainText('05/2026 · IPH estimado')
  await expect(page.getByTestId('regional-series-current')).toContainText('65,0%')
  await expect(page.getByTestId('regional-series-current')).toContainText(
    '15.028 pacientes-dia / 23.126 leitos-dia declarados',
  )

  await page.getByRole('radio', { name: 'TMH observado' }).click()
  await expect(page.getByTestId('regional-series-current')).toContainText('3,5%')
  await expect(page.getByTestId('regional-series-current')).toContainText(
    '168 óbitos · 4.797 internações',
  )

  const details = page.locator('.series-values-details')
  await expect(details.locator('summary')).toContainText('6 de 29')
  await details.locator('summary').click()
  await expect(details.locator('tbody tr')).toHaveCount(6)
  await details.getByRole('button', { name: 'Ver todas as 29 competências' }).click()
  await expect(details.locator('tbody tr')).toHaveCount(29)
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

  await page.goto('/regional?competencia=2024-03')

  const seasonalityValue = page.getByTestId('regional-seasonality')
  await expect(seasonalityValue).toHaveText('não calculado')
  await expect(seasonalityValue.locator('..').locator('small')).toHaveText(
    'Competência fora do período-alvo definido para sazonalidade',
  )
})

test('mostra ausência legítima no recorte e não trata o workspace como seção', async ({ page }) => {
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

  await page.goto('/regional?macrorregiao=9999')

  await expect(page.locator('.regional-workspace')).toHaveJSProperty('tagName', 'DIV')
  await expect(page.getByTestId('regional-count')).toHaveText('0 de 62 regiões')
  await expect(page.getByTestId('regional-no-items')).toContainText('Nenhuma região no recorte')
  await expect(page.getByTestId('regional-no-items')).toContainText(
    'Isso é ausência legítima, não erro da fonte.',
  )
  await expect(page.getByTestId('regional-map')).toHaveCount(0)
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

  await page.goto('/regional')
  await expect(page.getByTestId('regional-ranking-count')).toHaveText('8 de 62')
  await page.getByRole('button', { name: 'Ver todas as 62 regiões' }).click()
  await expect(page.getByTestId('regional-ranking-count')).toHaveText('62 de 62')
  await expect(page.locator('.ranking-list li')).toHaveCount(62)

  await page.getByRole('link', { name: 'Metodologia' }).click()
  await expect(page).toHaveURL(/\/metodologia$/)
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

test('não cria rolagem horizontal em notebook ou tela estreita', async ({ page }) => {
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

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 800 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/regional')
    await expect(page.getByTestId('regional-map-svg')).toBeVisible()
    const horizontalOverflow = await page.evaluate<number>(
      'document.documentElement.scrollWidth - window.innerWidth',
    )
    expect(horizontalOverflow).toBeLessThanOrEqual(0)
  }
})

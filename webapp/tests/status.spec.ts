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
const flowSnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/fluxos-35073-2026-05.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
const icsapSnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/icsap-35073-2026-05.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
const hospitalListSnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/hospitais-35073-2026-05.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
const hospitalSeriesSnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/hospital-serie-3012212.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
const specialtySnapshot = JSON.parse(
  readFileSync(
    new URL('../src/fixtures/hospital-especialidades-3012212-2026-05.json', import.meta.url),
    'utf8',
  ),
) as Record<string, unknown>
const cidSnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/hospital-cids-3012212.json', import.meta.url), 'utf8'),
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
  await page.route('**/api/dev/v1/hospitais**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    const regionCode = url.searchParams.get('regiao') ?? ''
    const fixtureRegion = hospitalListSnapshot.region as Record<string, unknown>
    const payload = regionCode === fixtureRegion.region_code
      ? {
          ...hospitalListSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: `${year}-${String(month).padStart(2, '0')}`,
          filters: { year, month, region_code: regionCode },
        }
      : {
          ...hospitalListSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: `${year}-${String(month).padStart(2, '0')}`,
          filters: { year, month, region_code: regionCode },
          region: {
            region_code: regionCode,
            region_name: null,
            macroregion_code: null,
            macroregion_name: null,
          },
          pagination: {
            limit: 200,
            offset: 0,
            count: 0,
            has_more: false,
            order: 'new_admissions_desc',
          },
          items: [],
        }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) })
  })
  // Registrado depois de `hospitais**` de propósito: o Playwright confere as
  // rotas na ordem inversa do registro, então a mais específica precisa vir
  // por último para não ser engolida pelo glob geral.
  await page.route('**/api/dev/v1/hospitais/*/serie**', async (route) => {
    const cnes = new URL(route.request().url()).pathname.match(/hospitais\/(\d{7})\/serie$/)?.[1] ?? ''
    const fixtureHospital = hospitalSeriesSnapshot.hospital as Record<string, unknown>
    const payload = cnes === fixtureHospital.cnes
      ? {
          ...hospitalSeriesSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
        }
      : {
          ...hospitalSeriesSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: null,
          filters: { cnes },
          hospital: {
            cnes,
            hospital_name: null,
            unit_type_code: null,
            unit_type_name: null,
            municipality_code: null,
            region_code: null,
            region_name: null,
            macroregion_code: null,
            macroregion_name: null,
          },
          pagination: {
            limit: 200,
            offset: 0,
            count: 0,
            has_more: false,
            order: 'competence_desc',
          },
          items: [],
        }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) })
  })
  await page.route('**/api/dev/v1/hospitais/*/especialidades**', async (route) => {
    const url = new URL(route.request().url())
    const cnes = url.pathname.match(/hospitais\/(\d{7})\/especialidades$/)?.[1] ?? ''
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...specialtySnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { cnes, year, month },
        hospital: { ...(specialtySnapshot.hospital as object), cnes },
        items: (specialtySnapshot.items as Record<string, unknown>[]).map((item) => ({
          ...item,
          cnes,
        })),
      }),
    })
  })
  await page.route('**/api/dev/v1/hospitais/*/cids**', async (route) => {
    const url = new URL(route.request().url())
    const cnes = url.pathname.match(/hospitais\/(\d{7})\/cids$/)?.[1] ?? ''
    const eligibleOnly = url.searchParams.get('elegivel') === '1'
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...cidSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        filters: { cnes, eligible_only: eligibleOnly },
        hospital: { ...(cidSnapshot.hospital as object), cnes },
        items: (cidSnapshot.items as Record<string, unknown>[]).map((item) => ({
          ...item,
          cnes,
        })),
      }),
    })
  })
  await page.route('**/api/dev/v1/icsap**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    const regionCode = url.searchParams.get('regiao') ?? ''
    const fixtureRegion = icsapSnapshot.region as Record<string, unknown>
    const payload = regionCode === fixtureRegion.region_code
      ? {
          ...icsapSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: `${year}-${String(month).padStart(2, '0')}`,
          filters: { year, month, region_code: regionCode },
        }
      : {
          ...icsapSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: `${year}-${String(month).padStart(2, '0')}`,
          filters: { year, month, region_code: regionCode },
          region: {
            region_code: regionCode,
            region_name: null,
            macroregion_code: null,
            macroregion_name: null,
            population: null,
            resident_admissions_observed: null,
            icsap_admissions: null,
            icsap_share_of_resident_percent: null,
            icsap_rate_per_10k: null,
          },
          pagination: {
            limit: 200,
            offset: 0,
            count: 0,
            has_more: false,
            order: 'icsap_admissions_desc',
          },
          items: [],
        }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) })
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

test('renderiza fluxos persistidos, expande todos os destinos e preserva filtros na URL', async ({ page }) => {
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

  let requestedCompetence = ''
  await page.route('**/api/dev/v1/fluxos**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    requestedCompetence = `${year}-${String(month).padStart(2, '0')}`
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...flowSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: requestedCompetence,
        filters: {
          year,
          month,
          origin_region_code: '35073',
          destination_region_code: null,
        },
      }),
    })
  })

  await page.goto(
    '/fluxos?competencia=2026-05&macrorregiao=3527&regiao=35073&hospital=0008028',
  )

  await expect(page.getByTestId('flow-source')).toHaveText('Oracle ao vivo')
  await expect(page.getByTestId('flow-region-name')).toHaveText('JUNDIAI')
  await expect(page.getByTestId('flow-own-care')).toHaveText('94,3%')
  await expect(page.getByTestId('flow-evasion')).toHaveText('5,7%')
  await expect(page.getByTestId('flow-attraction')).toHaveText('13,5%')
  await expect(page.getByTestId('flow-resident-rate')).toHaveText('521,44')
  await expect(page.getByTestId('flow-count')).toHaveText('8 de 23 destinos')
  await expect(page.getByTestId('flow-row-35073')).toContainText('4.148')
  await expect(page.getByTestId('flow-row-35073')).toContainText('94,3%')
  await expect(page.getByTestId('flow-row-35072')).toContainText('117')
  await expect(page.getByText('Saídas de residentes de São Paulo')).toBeVisible()

  await page.getByRole('button', { name: 'Ver todos os 23 destinos' }).click()
  await expect(page.getByTestId('flow-count')).toHaveText('23 de 23 destinos')
  await expect(page.getByTestId('flow-row-35173')).toContainText('LITORAL NORTE')

  await page.getByTestId('flow-competence').fill('2025-05')
  await expect.poll(() => requestedCompetence).toBe('2025-05')
  await expect(page).toHaveURL(/competencia=2025-05/)
  await expect(page).toHaveURL(/macrorregiao=3527/)
  await expect(page).toHaveURL(/regiao=35073/)
  await expect(page).toHaveURL(/hospital=0008028/)
})

test('mantém a visão de fluxos no snapshot sem misturar fontes', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto('/fluxos?competencia=2025-04&regiao=35011')

  await expect(page.getByTestId('flow-source')).toHaveText('Snapshot de contingência')
  await expect(page.getByTestId('flow-region-name')).toHaveText('JUNDIAI')
  await expect(page.getByTestId('flow-own-care')).toHaveText('94,3%')
  await expect(page.getByTestId('flow-competence')).toHaveValue('2026-05')
  await expect(page.getByTestId('flow-competence')).toBeDisabled()
  await expect(page.getByTestId('flow-origin')).toBeDisabled()
  await expect(page.getByTestId('flow-destination')).toBeDisabled()
  await expect(page.getByText('O snapshot preserva JUNDIAI em 05/2026')).toBeVisible()
})

test('lista hospitais da região, marca amostra e capacidade, e seleciona pela URL', async ({
  page,
}) => {
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

  await page.goto('/hospital?competencia=2026-05&regiao=35073')

  await expect(page.getByTestId('hospital-count')).toHaveText('8 de 13 hospitais')
  await expect(page.getByTestId('hospital-row-2786435')).toContainText('HCSVP HOSPITAL SAO VICENTE')
  await expect(page.getByTestId('hospital-row-2786435')).toContainText('1.456')
  await expect(page.getByTestId('hospital-row-2786435')).toContainText('102,0%')
  await expect(page.getByTestId('hospital-row-2786435')).toContainText('7,8%')
  await expect(page.getByTestId('hospital-row-2786435')).toContainText('6,28')

  // IPH acima de 100% precisa vir com a ressalva, nunca como ocupação real.
  await expect(page.getByTestId('hospital-capacity-2786435')).toContainText(
    'acima da capacidade declarada',
  )
  await expect(page.getByText('não ocupação real acima do teto físico')).toBeVisible()

  await page.getByRole('button', { name: 'Ver todos os 13 hospitais' }).click()
  await expect(page.getByTestId('hospital-count')).toHaveText('13 de 13 hospitais')

  // Hospital sem internação nova não pode exibir TMH, permanência nem CMI.
  await expect(page.getByTestId('hospital-row-2078538')).toContainText(
    'sem internação nova na competência',
  )
  await expect(page.getByTestId('hospital-sample-2716801')).toContainText(
    'amostra insuficiente para comparação',
  )

  // Selecionar grava o CNES na URL sem perder o recorte.
  await page.getByTestId('hospital-select-3012212').click()
  await expect(page).toHaveURL(/hospital=3012212/)
  await expect(page).toHaveURL(/competencia=2026-05/)
  await expect(page).toHaveURL(/regiao=35073/)
  await expect(page.getByTestId('hospital-select-3012212')).toHaveText('Selecionado')
})

test('abre a série mensal do hospital selecionado com denominadores e CMI nominal', async ({
  page,
}) => {
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

  await page.goto('/hospital?competencia=2026-05&regiao=35073&hospital=3012212')

  await expect(page.getByTestId('serie-count')).toHaveText('6 de 29 competências')
  await expect(page.getByTestId('serie-row-2026-05')).toContainText('05/2026')
  await expect(page.getByTestId('serie-row-2026-05')).toContainText('903')
  await expect(page.getByTestId('serie-row-2026-05')).toContainText('67,8%')
  await expect(page.getByTestId('serie-row-2026-05')).toContainText('2.690 / 3.968 leito-dia')
  await expect(page.getByTestId('serie-row-2026-05')).toContainText('3,56')

  // CMI real e nominal divergem quando há correção de IPCA; ambos aparecem.
  await expect(page.getByTestId('serie-row-2026-04')).toContainText('941,39')
  await expect(page.getByTestId('serie-row-2026-04')).toContainText('nominal')
  await expect(page.getByTestId('serie-row-2026-04')).toContainText('935,96')

  await page.getByRole('button', { name: 'Ver todas as 29 competências' }).click()
  await expect(page.getByTestId('serie-count')).toHaveText('29 de 29 competências')
  await expect(page.getByTestId('serie-row-2024-01')).toBeVisible()
})

test('mostra o perfil por especialidade somando as internações do hospital', async ({ page }) => {
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

  await page.goto('/hospital?competencia=2026-05&regiao=35073&hospital=3012212')

  await expect(page.getByTestId('especialidade-count')).toHaveText('4 de 4 especialidades')
  await expect(page.getByTestId('especialidade-row-02')).toContainText('Obstetrícia')
  await expect(page.getByTestId('especialidade-row-02')).toContainText('322')
  await expect(page.getByTestId('especialidade-row-02')).toContainText('2,89')
  await expect(page.getByTestId('especialidade-row-07')).toContainText('Pediatria')
  await expect(page.getByTestId('especialidade-row-07')).toContainText('5,98')
  await expect(page.getByTestId('especialidade-sample-03')).toContainText(
    'amostra insuficiente para comparação',
  )
  // 322 + 300 + 258 + 23 = 903, o total do hospital na competência.
  await expect(page.getByText('somam as 903 internações do hospital')).toBeVisible()
})

test('compara diagnósticos com pares elegíveis e explica quem não é elegível', async ({ page }) => {
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

  await page.goto('/hospital?competencia=2026-05&regiao=35073&hospital=3012212')

  // Referência regional visível junto da comparação.
  await expect(page.getByTestId('cid-reference')).toContainText('42')
  await expect(page.getByTestId('cid-reference')).toContainText('0,94')
  await expect(page.getByTestId('cid-reference')).toContainText('43,5%')

  await expect(page.getByTestId('cid-row-O820')).toContainText('Parto por cesariana eletiva')
  await expect(page.getByTestId('cid-row-O820')).toContainText('3.387')
  await expect(page.getByTestId('cid-row-O820')).toContainText('2,59')
  await expect(page.getByTestId('cid-row-O820')).toContainText('2,23')
  await expect(page.getByTestId('cid-ipr-O820')).toHaveText('1,16')
  await expect(page.getByTestId('cid-row-J459')).toContainText('188 internações em 8 hospitais')
  await expect(page.getByTestId('cid-ipr-J459')).toHaveText('0,82')

  // A lista é truncada e diz isso.
  await expect(page.getByTestId('cid-truncado')).toContainText('10 diagnósticos de maior volume')
  await expect(page.getByTestId('cid-truncado')).toContainText('42')

  // O recorte de elegíveis vive na URL.
  await expect(page.getByTestId('cid-eligible-toggle')).toBeChecked()
  // `click` em vez de `uncheck`: o input é controlado pela URL, e o `uncheck`
  // do Playwright lê o estado antes de o React reprocessar a navegação.
  await page.getByTestId('cid-eligible-toggle').click()
  await expect(page).toHaveURL(/elegiveis=0/)
  await expect(page.getByTestId('cid-eligible-toggle')).not.toBeChecked()
})

test('isola falha dos diagnósticos sem derrubar especialidades nem série', async ({ page }) => {
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
  await page.route('**/api/dev/v1/hospitais/*/cids**', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto('/hospital?competencia=2026-05&regiao=35073&hospital=3012212')

  await expect(page.getByTestId('cid-error')).toContainText('Diagnósticos indisponíveis')
  await expect(page.getByTestId('especialidade-count')).toHaveText('4 de 4 especialidades')
  await expect(page.getByTestId('serie-count')).toHaveText('6 de 29 competências')
  await expect(page.getByTestId('hospital-count')).toHaveText('8 de 13 hospitais')
})

test('isola falha da série sem derrubar a lista de hospitais', async ({ page }) => {
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
  await page.route('**/api/dev/v1/hospitais/*/serie**', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto('/hospital?competencia=2026-05&regiao=35073&hospital=3012212')

  await expect(page.getByTestId('serie-error')).toContainText('Série do hospital indisponível')
  await expect(page.getByTestId('hospital-count')).toHaveText('8 de 13 hospitais')
  await expect(page.getByTestId('source-badge')).toHaveText('Oracle ao vivo')
})

test('trocar a região limpa o hospital selecionado da URL', async ({ page }) => {
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

  await page.goto('/hospital?competencia=2026-05&regiao=35073&hospital=3012212')
  await expect(page.getByTestId('hospital-select-3012212')).toHaveText('Selecionado')

  await page.getByTestId('hospital-region').selectOption('35011')
  await expect(page).not.toHaveURL(/hospital=/)
  await expect(page).toHaveURL(/regiao=35011/)
  await expect(page).toHaveURL(/competencia=2026-05/)
})

test('distingue competência sem hospital publicado de falha do endpoint', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { year, month, macroregion_code: null, region_code: null },
      }),
    })
  })
  await page.route('**/api/dev/v1/hospitais**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...hospitalListSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { year, month, region_code: '35073' },
        region: {
          region_code: '35073',
          region_name: null,
          macroregion_code: null,
          macroregion_name: null,
        },
        pagination: {
          limit: 200,
          offset: 0,
          count: 0,
          has_more: false,
          order: 'new_admissions_desc',
        },
        items: [],
      }),
    })
  })

  await page.goto('/hospital?competencia=2023-12&regiao=35073')

  await expect(page.getByTestId('hospital-absent-competence')).toContainText(
    'Competência sem hospitais publicados',
  )
  await expect(page.getByTestId('hospital-absent-competence')).toContainText('12/2023')
  await expect(page.getByTestId('hospital-list-error')).toHaveCount(0)
})

test('renderiza a composição ICSAP persistida, expande os 19 grupos e mantém a nota populacional', async ({
  page,
}) => {
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
  await page.route('**/api/dev/v1/fluxos**', async (route) => {
    const url = new URL(route.request().url())
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...flowSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${url.searchParams.get('ano')}-${String(url.searchParams.get('mes')).padStart(2, '0')}`,
        filters: {
          year: Number(url.searchParams.get('ano')),
          month: Number(url.searchParams.get('mes')),
          origin_region_code: '35073',
          destination_region_code: null,
        },
      }),
    })
  })

  await page.goto('/fluxos?competencia=2026-05&regiao=35073')

  await expect(page.getByTestId('icsap-rate')).toHaveText('5,93')
  await expect(page.getByTestId('icsap-share')).toHaveText('11,4%')
  await expect(page.getByTestId('icsap-groups')).toHaveText('19')
  await expect(page.getByTestId('icsap-count')).toHaveText('8 de 19 grupos')

  // O grupo mais frequente vem primeiro porque o contrato declara a ordem.
  await expect(page.getByTestId('icsap-row-12')).toContainText('Doenças cerebrovasculares')
  await expect(page.getByTestId('icsap-row-12')).toContainText('101')
  await expect(page.getByTestId('icsap-row-12')).toContainText('20,2%')
  await expect(page.getByTestId('icsap-row-08')).toContainText('85')

  await expect(page.getByText('não prova que a internação era evitável')).toBeVisible()

  await page.getByRole('button', { name: 'Ver todos os 19 grupos' }).click()
  await expect(page.getByTestId('icsap-count')).toHaveText('19 de 19 grupos')

  // A matriz de fluxos continua na mesma tela, sem ser afetada.
  await expect(page.getByTestId('flow-count')).toHaveText('8 de 23 destinos')
})

test('isola falha da ICSAP sem derrubar a matriz de fluxos', async ({ page }) => {
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
  await page.route('**/api/dev/v1/fluxos**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...flowSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })
  await page.route('**/api/dev/v1/icsap**', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto('/fluxos?competencia=2026-05&regiao=35073')

  await expect(page.getByTestId('icsap-error')).toContainText('ICSAP indisponível')
  await expect(page.getByTestId('flow-count')).toHaveText('8 de 23 destinos')
  await expect(page.getByTestId('flow-own-care')).toHaveText('94,3%')
  await expect(page.getByTestId('source-badge')).toHaveText('Oracle ao vivo')
  await expect(page.getByText('Snapshot de contingência')).toHaveCount(0)
})

test('distingue competência sem ICSAP publicada de falha do endpoint', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { year, month, macroregion_code: null, region_code: null },
      }),
    })
  })
  await page.route('**/api/dev/v1/icsap**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...icsapSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { year, month, region_code: '35073' },
        region: {
          region_code: '35073',
          region_name: null,
          macroregion_code: null,
          macroregion_name: null,
          population: null,
          resident_admissions_observed: null,
          icsap_admissions: null,
          icsap_share_of_resident_percent: null,
          icsap_rate_per_10k: null,
        },
        pagination: {
          limit: 200,
          offset: 0,
          count: 0,
          has_more: false,
          order: 'icsap_admissions_desc',
        },
        items: [],
      }),
    })
  })

  await page.goto('/fluxos?competencia=2023-12&regiao=35073')

  await expect(page.getByTestId('icsap-absent-competence')).toContainText(
    'Competência sem ICSAP publicada',
  )
  await expect(page.getByTestId('icsap-absent-competence')).toContainText('12/2023')
  await expect(page.getByTestId('icsap-error')).toHaveCount(0)
})

test('distingue competência sem fluxo publicado de falha do endpoint', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { year, month, macroregion_code: null, region_code: null },
      }),
    })
  })
  // O endpoint responde normalmente: 200, count 0 e território não preenchido,
  // que é como o Oracle devolve uma competência anterior à janela de dados.
  await page.route('**/api/dev/v1/fluxos**', async (route) => {
    const url = new URL(route.request().url())
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        contract_version: '0.3.0',
        data_through: '2023-12',
        filters: {
          year: Number(url.searchParams.get('ano')),
          month: Number(url.searchParams.get('mes')),
          origin_region_code: '35073',
          destination_region_code: null,
        },
        territory: {
          region_code: '35073',
          region_name: null,
          macroregion_code: null,
          macroregion_name: null,
          population: null,
          production_admissions: null,
          resident_admissions_observed: null,
          resident_admissions_in_own_region: null,
          observed_intrastate_evasion_admissions: null,
          admissions_received_from_other_sp_regions: null,
          admissions_received_from_other_states: null,
          resident_admission_rate_per_100k: null,
          observed_evasion_percent: null,
          attraction_percent: null,
          own_care_percent: null,
        },
        pagination: {
          limit: 200,
          offset: 0,
          count: 0,
          has_more: false,
          order: 'new_admissions_desc',
        },
        items: [],
      }),
    })
  })

  await page.goto('/fluxos?competencia=2023-12&regiao=35073')

  await expect(page.getByTestId('flow-absent-competence')).toContainText(
    'Competência sem fluxos publicados',
  )
  await expect(page.getByTestId('flow-absent-competence')).toContainText('12/2023')
  await expect(page.getByTestId('flow-absent-competence')).toContainText('05/2026')
  await expect(page.getByTestId('flow-error')).toHaveCount(0)
  await expect(page.getByTestId('source-badge')).toHaveText('Oracle ao vivo')
})

test('isola erro do endpoint de fluxos sem substituir por snapshot', async ({ page }) => {
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
  await page.route('**/api/dev/v1/fluxos**', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto('/fluxos?competencia=2026-05&regiao=35073')

  await expect(page.getByTestId('source-badge')).toHaveText('Oracle ao vivo')
  await expect(page.getByTestId('flow-error')).toContainText('Fluxos indisponíveis')
  await expect(page.getByTestId('flow-source')).toHaveCount(0)
  await expect(page.getByText('Snapshot de contingência')).toHaveCount(0)
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

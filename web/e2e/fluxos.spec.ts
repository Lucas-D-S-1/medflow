/**
 * Visão de fluxos e APS.
 *
 * A população é atendida no próprio território, e quais condições
 * sensíveis puxam a demanda.
 */

import { expect, test } from '@playwright/test'
import {
  flowSnapshot,
  fluxoIntrarregional,
  fluxoParaCampinas,
  icsapSnapshot,
  itens,
  mockLiveSource,
  paginacao,
  pt,
  regiaoIcsap,
  regionalSnapshot,
  snapshotCompetencia,
  snapshotCompetenciaBR,
  territorioFluxo,
} from './apoio'

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
    `/fluxos?competencia=${snapshotCompetencia}&macrorregiao=3527&regiao=35073&hospital=0008028`,
  )

  await expect(page.getByTestId('flow-region-name')).toHaveText('JUNDIAI')
  await expect(page.getByTestId('flow-own-care')).toHaveText(`${pt(territorioFluxo.own_care_percent, 1)}%`)
  await expect(page.getByTestId('flow-evasion')).toHaveText(`${pt(territorioFluxo.observed_evasion_percent, 1)}%`)
  await expect(page.getByTestId('flow-attraction')).toHaveText(`${pt(territorioFluxo.attraction_percent, 1)}%`)
  await expect(page.getByTestId('flow-resident-rate')).toHaveText(
    pt(territorioFluxo.resident_admission_rate_per_100k, 2),
  )
  await expect(page.getByTestId('flow-count')).toHaveText(
    `8 de ${paginacao(flowSnapshot).count} destinos`,
  )
  await expect(page.getByTestId('flow-row-35073')).toContainText(
    pt(fluxoIntrarregional.new_admissions as number),
  )
  await expect(page.getByTestId('flow-row-35073')).toContainText(
    `${pt(fluxoIntrarregional.destination_share_of_observed_origin_percent as number, 1)}%`,
  )
  await expect(page.getByTestId('flow-row-35072')).toContainText(
    pt(fluxoParaCampinas.new_admissions as number),
  )
  await expect(page.getByText('Saídas de residentes de São Paulo')).toBeVisible()

  await page
    .getByRole('button', { name: `Ver todos os ${paginacao(flowSnapshot).count} destinos` })
    .click()
  await expect(page.getByTestId('flow-count')).toHaveText(
    `${paginacao(flowSnapshot).count} de ${paginacao(flowSnapshot).count} destinos`,
  )
  await expect(page.getByTestId('flow-row-35173')).toContainText('LITORAL NORTE')

  await page.getByTestId('global-competence').fill('2025-05')
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

  await expect(page.getByTestId('flow-region-name')).toHaveText('JUNDIAI')
  await expect(page.getByTestId('flow-own-care')).toHaveText(`${pt(territorioFluxo.own_care_percent, 1)}%`)
  await expect(page.getByTestId('global-competence')).toHaveValue(snapshotCompetencia)
  await expect(page.getByTestId('global-competence')).toBeDisabled()
  await expect(page.getByTestId('global-region')).toBeDisabled()
  await expect(page.getByTestId('flow-destination')).toBeDisabled()
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

  await page.goto(`/fluxos?competencia=${snapshotCompetencia}&regiao=35073`)

  await expect(page.getByTestId('icsap-rate')).toHaveText(pt(regiaoIcsap.icsap_rate_per_10k, 2))
  await expect(page.getByTestId('icsap-share')).toHaveText(
    `${pt(regiaoIcsap.icsap_share_of_resident_percent, 1)}%`,
  )
  await expect(page.getByTestId('icsap-groups')).toHaveText('19')
  await expect(page.getByTestId('icsap-count')).toHaveText('8 de 19 grupos')

  // O grupo mais frequente vem primeiro porque o contrato declara a ordem.
  // Qual grupo é o primeiro depende do recorte, então o teste pergunta ao
  // snapshot em vez de fixar `12`: o que ele prova é a ordenação, não o
  // ranking de uma competência.
  const [primeiroGrupo, segundoGrupo] = itens(icsapSnapshot)
  const primeiraLinha = page.getByTestId(`icsap-row-${primeiroGrupo.group_code}`)
  await expect(primeiraLinha).toContainText(primeiroGrupo.group_name as string)
  await expect(primeiraLinha).toContainText(pt(primeiroGrupo.icsap_admissions as number))
  await expect(primeiraLinha).toContainText(
    `${pt(primeiroGrupo.group_share_of_icsap_percent as number, 1)}%`,
  )
  await expect(page.getByTestId(`icsap-row-${segundoGrupo.group_code}`)).toContainText(
    pt(segundoGrupo.icsap_admissions as number),
  )
  expect(primeiroGrupo.icsap_admissions as number).toBeGreaterThanOrEqual(
    segundoGrupo.icsap_admissions as number,
  )

  await expect(page.getByText('não prova que a internação era evitável')).toBeVisible()

  await page.getByRole('button', { name: 'Ver todos os 19 grupos' }).click()
  await expect(page.getByTestId('icsap-count')).toHaveText('19 de 19 grupos')

  // A matriz de fluxos continua na mesma tela, sem ser afetada.
  await expect(page.getByTestId('flow-count')).toHaveText(
    `8 de ${paginacao(flowSnapshot).count} destinos`,
  )
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

  await page.goto(`/fluxos?competencia=${snapshotCompetencia}&regiao=35073`)

  await expect(page.getByTestId('icsap-error')).toContainText('ICSAP indisponível')
  await expect(page.getByTestId('flow-count')).toHaveText(
    `8 de ${paginacao(flowSnapshot).count} destinos`,
  )
  await expect(page.getByTestId('flow-own-care')).toHaveText(`${pt(territorioFluxo.own_care_percent, 1)}%`)
  await expect(page.getByTestId('source-badge')).toHaveCount(0)
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
  await expect(page.getByTestId('flow-absent-competence')).toContainText(snapshotCompetenciaBR)
  await expect(page.getByTestId('flow-error')).toHaveCount(0)
  await expect(page.getByTestId('source-badge')).toHaveCount(0)
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

  await page.goto(`/fluxos?competencia=${snapshotCompetencia}&regiao=35073`)

  await expect(page.getByTestId('source-badge')).toHaveCount(0)
  await expect(page.getByTestId('flow-error')).toContainText('Fluxos indisponíveis')
  await expect(page.getByText('Snapshot de contingência')).toHaveCount(0)
})

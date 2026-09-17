/**
 * Visão hospital e pares.
 *
 * O que explica o sinal e onde ele se concentra: lista, série,
 * especialidades e IPR por diagnóstico.
 */

import { expect, test, type Page } from '@playwright/test'
import {
  cidAsma,
  cidMaisFrequente,
  competenciaAnterior,
  contextoCid,
  escolherCompetencia,
  especialidadeObstetricia,
  especialidadePediatria,
  hospitalDestacado,
  hospitalListSnapshot,
  hospitalSemAmostra,
  hospitalSeriesSnapshot,
  itens,
  acharItem,
  linhaSerieHospital,
  mockLiveSource,
  paginacao,
  pt,
  regionalSnapshot,
  snapshotCompetencia,
  snapshotCompetenciaBR,
  specialtyDiagnosisSnapshot,
  specialtySnapshot,
  totalInternacoesDoHospital,
} from './apoio'

/** O mesmo recorte que `HospitalSeries` mostra antes de expandir. */
const PREVIEW_SERIE = 6

test('abre diagnósticos na especialidade, reordena o conjunto e permite expandir', async ({
  page,
}) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)

  await expect(page.getByTestId('specialty-diagnosis-meta')).toContainText(
    'ordenados por total de dias',
  )
  await expect(page.locator('[data-testid^="specialty-diagnosis-row-"]')).toHaveCount(10)
  await expect(page.getByTestId('specialty-diagnosis-row-J219')).toContainText(
    'Bronquite aguda não especificada',
  )
  await expect(page.getByTestId('specialty-diagnosis-row-J219')).toContainText(
    'Amostra insuficiente para comparar',
  )
  await expect(page.getByTestId('specialty-diagnosis-row-J219')).toContainText(
    '11 internações, 43 dias e 4 outros hospitais',
  )
  await expect(page.getByTestId('specialty-diagnosis-row-P228')).toContainText(
    'Sem outros hospitais neste recorte',
  )

  for (let pageNumber = 0; pageNumber < 8; pageNumber += 1) {
    await page.getByTestId('specialty-diagnosis-more').click()
  }
  await expect(page.locator('[data-testid^="specialty-diagnosis-row-"]')).toHaveCount(
    (specialtyDiagnosisSnapshot.items as unknown[]).length,
  )
  await expect(page.getByTestId('specialty-diagnosis-row-K219')).toBeVisible()

  await page.getByTestId('specialty-diagnosis-order').selectOption('media')
  await expect(page.getByTestId('specialty-diagnosis-meta')).toContainText(
    'ordenados por média de permanência',
  )
  await expect(page.locator('.specialty-diagnosis-table tbody tr').first()).toHaveAttribute(
    'data-testid',
    'specialty-diagnosis-row-D649',
  )
  await page.getByTestId('specialty-diagnosis-order').selectOption('internacoes')
  await expect(page.getByTestId('specialty-diagnosis-meta')).toContainText(
    'ordenados por volume de internações',
  )
  await expect(page.locator('.specialty-diagnosis-table tbody tr').first()).toHaveAttribute(
    'data-testid',
    'specialty-diagnosis-row-J219',
  )
})

test('explica benchmark zero, identificador desconhecido e participação sem dias', async ({
  page,
}) => {
  await mockLiveSource(page)
  await page.route(
    '**/api/dev/v1/hospitais/*/especialidades/*/diagnosticos**',
    async (route) => {
      const original = (specialtyDiagnosisSnapshot.items as Record<string, unknown>[])[0]
      const items = [
        {
          ...original,
          cid_code: '--',
          cid_description: 'Sem CID principal informado',
          stay_days_total: 2,
          benchmark_admissions: 60,
          benchmark_stay_days_total: 120,
          benchmark_hospitals: 3,
          average_stay_benchmark: 2,
          sample_status: 'amostra_insuficiente',
        },
        {
          ...original,
          cid_code: 'Z999',
          cid_description: 'Diagnóstico sem dias nos pares',
          stay_days_total: 0,
          stay_day_share_percent: null,
          benchmark_admissions: 60,
          benchmark_stay_days_total: 0,
          benchmark_hospitals: 3,
          average_stay_benchmark: 0,
          sample_status: 'benchmark_zero',
        },
      ]
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ...specialtyDiagnosisSnapshot,
          source: 'oracle-live',
          pagination: { limit: 2000, offset: 0, count: 2, has_more: false, order: 'stay_days_desc' },
          items,
        }),
      })
    },
  )
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  await expect(page.getByTestId('specialty-diagnosis-row---')).toContainText(
    'Identificador desconhecido; não comparável',
  )
  await expect(page.getByTestId('specialty-diagnosis-row-Z999')).toContainText(
    'Pares sem dias de permanência registrados',
  )
  await expect(page.getByTestId('specialty-diagnosis-row-Z999')).toContainText(
    'Sem dias registrados para calcular participação',
  )
})

test('snapshot de contingência cobre os 85 CIDs e distingue recorte não coberto', async ({
  page,
}) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.abort('connectionfailed')
  })
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  await expect(page.getByTestId('specialty-diagnosis-meta')).toContainText('85 diagnósticos')
  await expect(page.locator('[data-testid^="specialty-diagnosis-row-"]')).toHaveCount(10)
  await page.getByTestId('especialidade-row-02').click()
  await expect(page.getByTestId('specialty-diagnosis-snapshot-unavailable')).toHaveText(
    'Este recorte não está disponível no snapshot de contingência.',
  )
  await expect(page.getByTestId('specialty-diagnosis-absent')).toHaveCount(0)
})

test('paginação além do fim mantém count global e has_more falso', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto('/')
  const envelope = await page.evaluate(async () => {
    const response = await fetch(
      '/api/dev/v1/hospitais/3012212/especialidades/07/diagnosticos?ano=2026&mes=6&ordenar=dias&limit=10&offset=999',
    )
    return response.json()
  }) as { items: unknown[]; pagination: { count: number; has_more: boolean } }

  expect(envelope.items).toEqual([])
  expect(envelope.pagination.count).toBe(85)
  expect(envelope.pagination.has_more).toBe(false)
})

test('resposta vazia de outro recorte é inválida, não ausência real', async ({ page }) => {
  await mockLiveSource(page)
  await page.route(
    '**/api/dev/v1/hospitais/*/especialidades/*/diagnosticos**',
    async (route) => {
      const url = new URL(route.request().url())
      const limit = Number(url.searchParams.get('limit'))
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ...specialtyDiagnosisSnapshot,
          source: 'oracle-live',
          filters: { cnes: '9999999', year: 2026, month: 6, specialty_code: '07', order_by: 'dias' },
          hospital: {
            cnes: '9999999', region_code: null, region_name: null,
            macroregion_code: null, macroregion_name: null,
            specialty_code: '07', specialty_name: null,
            specialty_new_admissions_total: null, specialty_stay_days_total: null,
          },
          pagination: { limit, offset: 0, count: 0, has_more: false, order: 'stay_days_desc' },
          items: [],
        }),
      })
    },
  )
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  await expect(page.getByTestId('specialty-diagnosis-error')).toBeVisible()
  await expect(page.getByTestId('specialty-diagnosis-absent')).toHaveCount(0)
})

test('ignora diagnóstico atrasado depois da troca de especialidade', async ({ page }) => {
  await mockLiveSource(page)
  await page.route(
    '**/api/dev/v1/hospitais/*/especialidades/*/diagnosticos**',
    async (route) => {
      const url = new URL(route.request().url())
      const specialtyCode =
        url.pathname.match(/especialidades\/(\d{2}|--)\/diagnosticos$/)?.[1] ?? ''
      const specialtyName = specialtyCode === '02' ? 'Obstetrícia' : 'Pediatria'
      const original = (specialtyDiagnosisSnapshot.items as Record<string, unknown>[])[0]
      const item = {
        ...original,
        specialty_code: specialtyCode,
        specialty_name: specialtyName,
        cid_code: specialtyCode === '02' ? 'O820' : 'J219',
        cid_description:
          specialtyCode === '02' ? 'Parto por cesariana eletiva' : 'Bronquite atrasada',
      }
      if (specialtyCode === '07') {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
      try {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            ...specialtyDiagnosisSnapshot,
            source: 'oracle-live',
            data_through: snapshotCompetencia,
            filters: {
              cnes: '3012212',
              year: Number(snapshotCompetencia.slice(0, 4)),
              month: Number(snapshotCompetencia.slice(5, 7)),
              specialty_code: specialtyCode,
              order_by: 'dias',
            },
            hospital: {
              ...(specialtyDiagnosisSnapshot.hospital as object),
              specialty_code: specialtyCode,
              specialty_name: specialtyName,
            },
            pagination: {
              limit: 2000,
              offset: 0,
              count: 1,
              has_more: false,
              order: 'stay_days_desc',
            },
            items: [item],
          }),
        })
      } catch {
        // A resposta de Pediatria é cancelada quando Obstetrícia vira o recorte.
      }
    },
  )

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  await expect(page.getByTestId('especialidade-count')).toHaveText('4 de 4 especialidades')
  await page.getByTestId('especialidade-row-02').click()

  await expect(page.getByTestId('specialty-diagnosis-row-O820')).toContainText(
    'Parto por cesariana eletiva',
  )
  await page.waitForTimeout(350)
  await expect(page.getByTestId('specialty-diagnosis-row-O820')).toBeVisible()
  await expect(page.getByTestId('specialty-diagnosis-row-J219')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /Principais diagnósticos · Obstetrícia/ })).toBeVisible()
})

test('ignora diagnóstico atrasado depois da troca de competência', async ({ page }) => {
  await mockLiveSource(page)
  await page.route(
    '**/api/dev/v1/hospitais/*/especialidades/*/diagnosticos**',
    async (route) => {
      const url = new URL(route.request().url())
      const year = Number(url.searchParams.get('ano'))
      const month = Number(url.searchParams.get('mes'))
      const competence = `${year}-${String(month).padStart(2, '0')}`
      const antigo = competence === snapshotCompetencia
      const original = (specialtyDiagnosisSnapshot.items as Record<string, unknown>[])[0]
      if (antigo) await new Promise((resolve) => setTimeout(resolve, 300))
      try {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            ...specialtyDiagnosisSnapshot,
            source: 'oracle-live',
            data_through: competence,
            filters: { cnes: '3012212', year, month, specialty_code: '07', order_by: 'dias' },
            pagination: { limit: 2000, offset: 0, count: 1, has_more: false, order: 'stay_days_desc' },
            items: [{
              ...original,
              cid_code: antigo ? 'J219' : 'A090',
              cid_description: antigo ? 'Resposta atrasada da competência antiga' : 'Resposta da nova competência',
            }],
          }),
        })
      } catch {
        // A requisição antiga é abortada assim que a competência muda.
      }
    },
  )

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  await escolherCompetencia(page, '2025-05')
  await expect(page.getByTestId('specialty-diagnosis-row-A090')).toContainText(
    'Resposta da nova competência',
  )
  await page.waitForTimeout(350)
  await expect(page.getByTestId('specialty-diagnosis-row-A090')).toBeVisible()
  await expect(page.getByText('Resposta atrasada da competência antiga')).toHaveCount(0)
})

async function expectAnchorBelowHeader(page: Page, selector: '#hospital-detail' | '#hospital-list') {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Viewport indisponível para validar a âncora hospitalar.')
  const expectedMargin = viewport.width <= 760 ? 148 : 84
  await expect
    .poll(() =>
      page.locator(selector).evaluate((element) =>
        Number.parseFloat(
          (globalThis as unknown as {
            getComputedStyle: (target: unknown) => { scrollMarginTop: string }
          }).getComputedStyle(element).scrollMarginTop,
        ),
      ),
    )
    .toBe(expectedMargin)

  let previousY: number | null = null
  let stableSamples = 0
  await expect
    .poll(async () => {
      const target = await page.locator(selector).boundingBox()
      if (!target) return 0
      stableSamples = previousY !== null && Math.abs(target.y - previousY) <= 0.5
        ? stableSamples + 1
        : 0
      previousY = target.y
      return stableSamples
    }, { intervals: [100] })
    .toBeGreaterThanOrEqual(3)

  const header = await page.locator('.topbar').boundingBox()
  const target = await page.locator(selector).boundingBox()
  expect(header).not.toBeNull()
  expect(target).not.toBeNull()
  expect(target!.y - (header!.y + header!.height)).toBeGreaterThanOrEqual(8)
  expect(target!.y).toBeLessThanOrEqual(viewport.height / 3)
}

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

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073`)

  await expect(page.getByTestId('hospital-count')).toHaveText(
    `${paginacao(hospitalListSnapshot).count} de ${paginacao(hospitalListSnapshot).count} hospitais`,
  )
  await expect(page.getByTestId('hospital-row-2786435')).toContainText('HCSVP HOSPITAL SAO VICENTE')
  await expect(page.getByTestId('hospital-row-2786435')).toContainText(pt(hospitalDestacado.new_admissions as number))
  await expect(page.getByTestId('hospital-row-2786435')).toContainText(`${pt(hospitalDestacado.iph_percent as number, 1)}%`)
  await expect(page.getByTestId('hospital-row-2786435')).toContainText(`${pt(hospitalDestacado.tmh_percent as number, 1)}%`)
  await expect(page.getByTestId('hospital-row-2786435')).toContainText(pt(hospitalDestacado.average_stay_days as number, 2))

  // IPH acima de 100% precisa vir com a ressalva, nunca como ocupação real.
  await expect(page.getByTestId('hospital-capacity-2786435')).toContainText(
    'acima da capacidade declarada',
  )

  const totalHospitais = paginacao(hospitalListSnapshot).count
  await expect(page.getByTestId('hospital-count')).toHaveText(
    `${totalHospitais} de ${totalHospitais} hospitais`,
  )

  await expect(page.getByTestId(`hospital-sample-${hospitalSemAmostra.cnes}`)).toContainText(
    'amostra insuficiente para comparação',
  )

  // Selecionar grava o CNES na URL sem perder o recorte.
  await page.getByTestId('hospital-select-3012212').click()
  await expect(page).toHaveURL(/hospital=3012212/)
  await expect(page).toHaveURL(new RegExp(`competencia=${snapshotCompetencia}`))
  await expect(page).toHaveURL(/regiao=35073/)
  await expect(page.getByTestId('hospital-select-3012212')).toHaveText('Selecionado')
})
test('busca canônica por nome/CNES sem alterar seleção, universo ou ordenação', async ({ page }) => {
  await mockLiveSource(page)
  const hospitalRequests: string[] = []
  page.on('request', (request) => {
    if (/\/hospitais\?/.test(request.url())) hospitalRequests.push(request.url())
  })

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)
  await page.getByTestId('hospital-sort-hospital').click()
  await expect(page.getByTestId('hospital-sort-hospital').locator('..')).toHaveAttribute('aria-sort', 'ascending')

  const search = page.getByTestId('hospital-search')
  await search.fill('hospital universitario')
  await expect(page).toHaveURL(/busca=hospital(\+|%20)universitario/)
  await expect(page).toHaveURL(/hospital=3012212/)
  await expect(page.getByTestId('hospital-count')).toHaveText(
    `1 de ${paginacao(hospitalListSnapshot).count} hospitais`,
  )
  await expect(page.getByTestId('hospital-row-3012212')).toBeVisible()
  await expect(page.getByTestId('peer-value-admissions')).toContainText('885')

  await search.fill('1221')
  await expect(page.getByTestId('hospital-row-3012212')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar busca de hospital' }).click()
  await expect(page.getByTestId('hospital-count')).toHaveText(
    `${paginacao(hospitalListSnapshot).count} de ${paginacao(hospitalListSnapshot).count} hospitais`,
  )
  await expect(page.getByTestId('hospital-sort-hospital').locator('..')).toHaveAttribute('aria-sort', 'ascending')
  expect(hospitalRequests.every((url) => !new URL(url).searchParams.has('busca'))).toBe(true)
})
test('hospital sem internação nova não exibe TMH, permanência nem CMI', async ({ page }) => {
  // Regra de produto, não fato do recorte. O teste antigo dependia de existir
  // um hospital com zero internações na competência da fixture; quando o
  // recorte avançou para 2026-06, JUNDIAI deixou de ter um e a regra ficaria
  // sem cobertura em silêncio. O caso agora é construído, então vale sempre.
  const vazio = {
    ...hospitalDestacado,
    cnes: '9999999',
    hospital_name: 'HOSPITAL SEM MOVIMENTO',
    new_admissions: 0,
    deaths: 0,
    patient_days_estimated: 0,
    tmh_percent: null,
    cmi_real: null,
    average_stay_days: null,
    iph_percent: null,
    sample_status: 'amostra_insuficiente',
    capacity_status: 'sem_leito_sus_declarado',
    above_declared_capacity: 0,
  }

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
  await page.route('**/api/dev/v1/hospitais?**', async (route) => {
    const itensComVazio = [...itens(hospitalListSnapshot), vazio]
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...hospitalListSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        pagination: {
          ...paginacao(hospitalListSnapshot),
          count: itensComVazio.length,
          has_more: false,
        },
        items: itensComVazio,
      }),
    })
  })

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073`)
  await expect(page.getByTestId('hospital-row-9999999')).toContainText(
    'sem internação nova na competência',
  )
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

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)

  const history = page.getByRole('button', { name: /Evolução mensal do hospital/ })
  await expect(history).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByTestId('serie-count')).toHaveCount(0)
  await history.focus()
  await history.press('Enter')
  await expect(history).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByTestId('serie-count')).toHaveText(
    `6 de ${paginacao(hospitalSeriesSnapshot).count} competências`,
  )
  await expect(page.getByTestId(`serie-row-${snapshotCompetencia}`)).toContainText(snapshotCompetenciaBR)
  await expect(page.getByTestId(`serie-row-${snapshotCompetencia}`)).toContainText(pt(linhaSerieHospital.new_admissions as number))
  await expect(page.getByTestId(`serie-row-${snapshotCompetencia}`)).toContainText(`${pt(linhaSerieHospital.iph_percent as number, 1)}%`)
  await expect(page.getByTestId(`serie-row-${snapshotCompetencia}`)).toContainText(
    `${pt(linhaSerieHospital.patient_days_estimated as number)} / ` +
      `${pt(linhaSerieHospital.declared_bed_days as number)} leito-dia`,
  )
  await expect(page.getByTestId(`serie-row-${snapshotCompetencia}`)).toContainText(pt(linhaSerieHospital.average_stay_days as number, 2))

  // CMI real e nominal divergem quando há correção de IPCA; ambos aparecem.
  await expect(page.getByTestId(`serie-row-${competenciaAnterior.competence}`)).toContainText(
    pt(competenciaAnterior.cmi_real as number, 2),
  )
  await expect(page.getByTestId('serie-row-2026-04')).toContainText('nominal')
  await expect(page.getByTestId(`serie-row-${competenciaAnterior.competence}`)).toContainText(
    pt(competenciaAnterior.cmi_nominal as number, 2),
  )

  await page
    .getByRole('button', {
      name: `Ver todas as ${paginacao(hospitalSeriesSnapshot).count} competências`,
    })
    .click()
  await expect(page.getByTestId('serie-count')).toHaveText(
    `${paginacao(hospitalSeriesSnapshot).count} de ${paginacao(hospitalSeriesSnapshot).count} competências`,
  )
  await expect(page.getByTestId('serie-row-2024-01')).toBeVisible()

  // A série inteira fica numa tabela só, que rola dentro de si. Antes as
  // competências além das seis primeiras iam para um segundo painel abaixo, e
  // a lista ficava partida em dois lugares.
  await expect(page.locator('.hospital-series-table')).toHaveCount(1)
  const rolagem = await page
    .locator('#hospital-series-rows')
    .evaluate((el) => {
      // O tsconfig das specs não carrega a lib DOM; o resto do arquivo também
      // descreve estruturalmente o que usa.
      const caixa = el as unknown as { clientHeight: number; scrollHeight: number }
      return { visivel: caixa.clientHeight, total: caixa.scrollHeight }
    })
  expect(rolagem.total).toBeGreaterThan(rolagem.visivel)

  // O IPE também na evolução mensal: a série responde "isso é de agora ou vem
  // de antes?", e sem ele o indicador novo só existia na foto do mês.
  await expect(page.getByTestId(`serie-ipe-${snapshotCompetencia}`)).toHaveText(
    pt(linhaSerieHospital.ipe_median as number, 2),
  )

  // Chegar no fim da lista não pode prender a página. O quadro tinha
  // `overscroll-behavior: contain`, e a rolagem parava ali: quem descia a
  // página ficava travado num quadro que nem parecia rolável.
  const caixa = page.locator('#hospital-series-rows')
  await caixa.scrollIntoViewIfNeeded()
  const quadro = await caixa.boundingBox()
  await page.mouse.move(quadro!.x + quadro!.width / 2, quadro!.y + 80)
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(50)
  }
  const interno = await caixa.evaluate((el) => {
    const c = el as unknown as { scrollTop: number; scrollHeight: number; clientHeight: number }
    return { fim: c.scrollTop >= c.scrollHeight - c.clientHeight - 2 }
  })
  expect(interno.fim).toBe(true)
  const paginaAntes = await page.evaluate(() => (globalThis as unknown as { scrollY: number }).scrollY)
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(50)
  }
  const paginaDepois = await page.evaluate(() => (globalThis as unknown as { scrollY: number }).scrollY)
  expect(paginaDepois).toBeGreaterThan(paginaAntes)

  // Ordenar vale para a série inteira, não só para a metade visível.
  await page.getByTestId('serie-sort-iph').click()
  const iphs = await page
    .locator('.hospital-series-table tbody tr td:nth-child(3) strong')
    .evaluateAll((celulas) =>
      (celulas as unknown as { textContent: string | null }[]).map((celula) =>
        Number((celula.textContent || '').replace('%', '').replace(',', '.')),
      ),
    )
  expect(iphs.length).toBeGreaterThan(PREVIEW_SERIE)
  expect([...iphs].sort((a, b) => b - a)).toEqual(iphs)
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

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)

  // O IPE também sobe de grão: a lista hospitalar mostra a mediana entre as
  // especialidades comparáveis do hospital, o mesmo índice um degrau acima.
  // Sem isso ele só existia dentro da tabela de especialidades.
  await expect(page.getByTestId(`hospital-ipe-${hospitalDestacado.cnes}`)).toHaveText(
    pt(hospitalDestacado.ipe_median as number, 2),
  )

  await expect(page.getByTestId('especialidade-count')).toHaveText('4 de 4 especialidades')
  await expect(page.getByTestId('especialidade-row-02')).toContainText('Obstetrícia')
  await expect(page.getByTestId('especialidade-row-02')).toContainText(
    pt(especialidadeObstetricia.new_admissions as number),
  )
  await expect(page.getByTestId('especialidade-row-02')).toContainText(
    pt(especialidadeObstetricia.average_stay_days as number, 2),
  )
  await expect(page.getByTestId('especialidade-row-07')).toContainText('Pediatria')
  await expect(page.getByTestId('especialidade-row-07')).toContainText(
    pt(especialidadePediatria.average_stay_days as number, 2),
  )
  // A tabela responde às quatro perguntas da jornada e deixa a comparação
  // técnica no detalhe: permanência local, referência e universo comparável.
  await expect(page.getByTestId('especialidade-row-07')).toContainText(
    `referência ${pt(especialidadePediatria.average_stay_benchmark as number, 2)} dias`,
  )
  await expect(page.getByTestId('especialidade-row-07')).toContainText(
    `${pt(especialidadePediatria.benchmark_hospitals as number)} outros hospitais`,
  )
  const totalPublicado = itens(specialtySnapshot).reduce(
    (total, item) => total + (item.new_admissions as number),
    0,
  )
  await expect(page.getByTestId('especialidade-participacao-07')).toContainText(
    `${pt(((especialidadePediatria.new_admissions as number) / totalPublicado) * 100, 1)}%`,
  )
  await expect(page.getByTestId('specialty-summary')).toContainText(
    `de ${pt(totalInternacoesDoHospital)} internações do hospital`,
  )
  expect((specialtySnapshot.hospital as { cnes: string }).cnes).toBe('3012212')
  expect((specialtySnapshot.hospital as { cnes: string }).cnes).not.toBe('2786435')
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

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)
  await page.getByTestId('diagnostics-toggle').click()

  // Referência regional visível junto da comparação.
  await expect(page.getByTestId('cid-reference')).toContainText(
    pt(contextoCid.hospital_eligible_combinations),
  )
  await expect(page.getByTestId('cid-reference')).toContainText(
    pt(contextoCid.region_ipr_median, 2),
  )
  await expect(page.getByTestId('cid-reference')).toContainText(
    `${pt(contextoCid.region_percent_above_reference, 1)}%`,
  )

  await expect(page.getByTestId('cid-row-O820')).toContainText('Parto por cesariana eletiva')
  await expect(page.getByTestId(`cid-row-${cidMaisFrequente.cid_code}`)).toContainText(
    pt(cidMaisFrequente.new_admissions as number),
  )
  await expect(page.getByTestId(`cid-row-${cidMaisFrequente.cid_code}`)).toContainText(
    pt(cidMaisFrequente.average_stay_hospital as number, 2),
  )
  await expect(page.getByTestId(`cid-row-${cidMaisFrequente.cid_code}`)).toContainText(
    pt(cidMaisFrequente.average_stay_benchmark as number, 2),
  )
  await expect(page.getByTestId(`cid-ipr-${cidMaisFrequente.cid_code}`)).toHaveText(
    pt(cidMaisFrequente.ipr as number, 2),
  )
  await expect(page.getByTestId(`cid-row-${cidAsma.cid_code}`)).toContainText(
    `${pt(cidAsma.benchmark_admissions as number)} internações em ` +
      `${pt(cidAsma.benchmark_hospitals as number)} hospitais`,
  )
  await expect(page.getByTestId(`cid-ipr-${cidAsma.cid_code}`)).toHaveText(
    pt(cidAsma.ipr as number, 2),
  )

  // A lista é truncada e diz isso.
  await expect(page.getByTestId('cid-truncado')).toContainText('10 diagnósticos de maior volume')
  await expect(page.getByTestId('cid-truncado')).toContainText(
    pt(contextoCid.hospital_eligible_combinations),
  )

  // O recorte de elegíveis continua na URL para links já compartilhados, mas
  // perdeu o controle próprio: a tabela já marca quem não tem IPR calculável.
  await expect(page.getByTestId('cid-eligible-toggle')).toHaveCount(0)
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

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)

  await page.getByTestId('diagnostics-toggle').click()
  await expect(page.getByTestId('cid-error')).toContainText('Diagnósticos indisponíveis')
  await expect(page.getByTestId('especialidade-count')).toHaveText('4 de 4 especialidades')
  await expect(page.getByRole('button', { name: /Evolução mensal do hospital/ })).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByTestId('serie-count')).toHaveCount(0)
  await expect(page.getByTestId('hospital-count')).toHaveText(
    `${paginacao(hospitalListSnapshot).count} de ${paginacao(hospitalListSnapshot).count} hospitais`,
  )
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

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)

  await page.getByRole('button', { name: /Evolução mensal do hospital/ }).click()
  await expect(page.getByTestId('serie-error')).toContainText('Série do hospital indisponível')
  await expect(page.getByTestId('hospital-count')).toHaveText(
    `${paginacao(hospitalListSnapshot).count} de ${paginacao(hospitalListSnapshot).count} hospitais`,
  )
  await expect(page.getByTestId('source-badge')).toHaveCount(0)
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

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)
  await expect(page.getByTestId('hospital-select-3012212')).toHaveText('Selecionado')

  await page.getByTestId('global-region').selectOption('35011')
  await expect(page).not.toHaveURL(/hospital=/)
  await expect(page).toHaveURL(/regiao=35011/)
  await expect(page).toHaveURL(new RegExp(`competencia=${snapshotCompetencia}`))
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

test('busca sem resultado preserva o campo para o usuário voltar atrás', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073#hospital`)

  const campo = page.getByTestId('hospital-search')
  await expect(campo).toBeVisible()
  await campo.fill('zzzznaoexiste')

  // O campo carrega a própria saída: escondê-lo junto com a tabela deixava o
  // usuário sem como apagar o que digitou.
  await expect(page.getByTestId('hospital-empty')).toContainText('Nenhum hospital com esse termo')
  await expect(campo).toBeVisible()
  await expect(campo).toHaveValue('zzzznaoexiste')

  await campo.fill('')
  await expect(page.getByTestId('hospital-count')).toBeVisible()
})

test('abre pares primeiro, mantém histórico recolhido e troca hospital com foco correto', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073#hospital`)

  await page.getByTestId('hospital-select-3012212').click()
  await expect(page.locator('#hospital-detail')).toBeFocused()
  await expect(page.getByTestId('peer-value-iph')).toBeVisible()
  await expect(page.getByTestId('peer-value-stay')).toBeVisible()
  await expect(page.getByTestId('peer-value-admissions')).toContainText('885')
  await expect(page.getByTestId('peer-more')).not.toHaveAttribute('open', '')
  await expect(page.locator('.hospital-specialty-table')).toBeVisible()

  const history = page.getByRole('button', { name: /Evolução mensal do hospital/ })
  await expect(history).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.hospital-series-table')).toHaveCount(0)

  const peersY = (await page.locator('.hospital-peers').boundingBox())?.y ?? 0
  const historyY = (await page.locator('.hospital-history:not(.hospital-diagnostics)').boundingBox())?.y ?? 0
  const specialtyY = (await page.locator('.hospital-specialty-table').boundingBox())?.y ?? 0
  expect(peersY).toBeLessThan(historyY)
  expect(historyY).toBeLessThan(specialtyY)

  await history.click()
  await expect(history).toHaveAttribute('aria-expanded', 'true')
  await escolherCompetencia(page, '2025-05')
  await expect(page.getByRole('button', { name: /Evolução mensal do hospital/ })).toHaveAttribute('aria-expanded', 'true')

  await page.getByRole('button', { name: 'Trocar hospital' }).click()
  await expect(page).not.toHaveURL(/hospital=/)
  await expect(page.locator('#hospital-list')).toBeFocused()
})

for (const viewport of [
  { label: 'desktop', width: 1366, height: 768 },
  { label: 'móvel', width: 390, height: 844 },
] as const) {
  test(`mantém detalhe e lista abaixo do cabeçalho sticky em ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await mockLiveSource(page)
    await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073#hospital`)

    const search = page.getByTestId('hospital-search')
    await search.fill('3012212')
    await page.getByTestId('hospital-select-3012212').click()

    await expect(page.locator('#hospital-detail')).toBeFocused()
    await expectAnchorBelowHeader(page, '#hospital-detail')

    // Devolve a lista ao universo completo para haver conteúdo suficiente
    // abaixo da âncora também no viewport alto do desktop.
    await search.fill('')
    await page.getByRole('button', { name: 'Trocar hospital' }).click()

    await expect(page.locator('#hospital-list')).toBeFocused()
    await expectAnchorBelowHeader(page, '#hospital-list')
  })
}

test('a comparacao com pares diz o criterio, o porte e quem sao os pares', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(
    `/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=2701561`,
  )

  // O porte é a régua, e ela fica escrita. Antes um dos modos comparava por
  // região sem controlar porte, e isso punha um hospital de 876 leitos contra
  // um de 9 — o caso do Hospital de Base de São José do Rio Preto.
  const criterio = page.getByTestId('peer-criterio')
  await expect(criterio).toContainText('de até 24 leitos')
  await expect(criterio).toContainText('em JUNDIAI')
  await expect(page.getByTestId('peer-rebaixado')).toHaveCount(0)

  // Sem os nomes, a faixa é um número sobre um grupo invisível.
  await page.getByTestId('peer-lista').locator('summary').click()
  await expect(page.getByTestId('peer-lista').locator('li')).toHaveCount(5)
  await expect(page.getByTestId('peer-lista')).toContainText('HOSPITAL DA CRIANCA GRENDACC')
})

test('sem pares do mesmo porte na regiao, a regua sobe e a tela avisa', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(
    `/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`,
  )

  // Cair calado num grupo diferente do anunciado seria pior do que não
  // comparar: o número mudaria de significado sem avisar.
  await expect(page.getByTestId('peer-rebaixado')).toContainText('não há 3 hospitais')
  await expect(page.getByTestId('peer-criterio')).toContainText('no estado')
})

test('a participacao do hospital na regiao fica visivel', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(
    `/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=2786435`,
  )

  // A participação descreve concentração observada; não é um rótulo de papel
  // assistencial nem uma conclusão sobre gravidade ou permanência.
  const total = itens(hospitalListSnapshot).reduce(
    (soma, item) => soma + (item.new_admissions as number),
    0,
  )
  const destaque = itens(hospitalListSnapshot).find(
    (item) => item.cnes === '2786435',
  ) as Record<string, number>
  const participacao = (destaque.new_admissions / total) * 100
  await expect(page.getByTestId('peer-participacao')).toContainText(
    `${pt(participacao, 1)}%`,
  )
})

test('snapshot não declara pares estaduais sem o universo completo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)

  await expect(page.getByTestId('peer-snapshot-limited')).toContainText(
    'não é declarada neste preview',
  )
  await expect(page.getByTestId('peer-criterio')).toHaveCount(0)
  await expect(page.locator('[data-testid^="peer-bar-"]')).toHaveCount(0)
  await expect(page.getByTestId('peer-loading')).toHaveCount(0)
  const horizontalOverflow = await page.evaluate<number>(
    'document.documentElement.scrollWidth - window.innerWidth',
  )
  expect(horizontalOverflow).toBeLessThanOrEqual(0)
})

test('separa participação no hospital da participação regional da especialidade', async ({
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

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)

  const totalPublicado = itens(specialtySnapshot).reduce(
    (total, item) => total + (item.new_admissions as number),
    0,
  )
  const participacaoHospital =
    ((especialidadePediatria.new_admissions as number) / totalPublicado) * 100
  const participacaoRegional =
    ((especialidadePediatria.new_admissions as number) /
      ((especialidadePediatria.new_admissions as number) +
        (especialidadePediatria.benchmark_admissions as number))) *
    100

  // A linha usa o hospital como denominador; o detalhe nomeia separadamente o
  // denominador regional publicado pela Gold.
  const pediatria = page.getByTestId('especialidade-participacao-07')
  await expect(pediatria).toContainText(`${pt(participacaoHospital, 1)}%`)
  await expect(page.getByTestId('specialty-summary-hospital-share')).toHaveText(
    `${pt(participacaoHospital, 1)}%`,
  )
  await expect(page.getByTestId('specialty-summary-share')).toContainText(
    `${pt(participacaoRegional, 1)}%`,
  )
  expect(participacaoHospital).not.toBe(participacaoRegional)
  await expect(page.getByTestId('specialty-summary')).toContainText(
    `${pt(especialidadePediatria.new_admissions as number)} de ${pt(
      (especialidadePediatria.new_admissions as number) +
        (especialidadePediatria.benchmark_admissions as number),
    )} internações na especialidade`,
  )

  await expect(
    page.getByRole('columnheader', { name: /Participação no hospital/ }),
  ).toBeVisible()
  await expect(pediatria).toHaveAttribute('data-label', 'Participação no hospital')
  await expect(page.getByTestId('specialty-summary').locator('dt').first()).toHaveText(
    'Participação no hospital',
  )
})

test('rotula explicitamente a participação quando a cobertura de especialidades é parcial', async ({
  page,
}) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/hospitais/*/especialidades**', async (route) => {
    const url = new URL(route.request().url())
    const cnes = url.pathname.match(/hospitais\/(\d{7})\/especialidades$/)?.[1] ?? ''
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    const partialItems = (specialtySnapshot.items as Record<string, unknown>[]).slice(0, -1)
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...specialtySnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { cnes, year, month },
        hospital: { ...(specialtySnapshot.hospital as object), cnes },
        items: partialItems.map((item) => ({ ...item, cnes })),
        pagination: {
          limit: 200,
          offset: 0,
          count: partialItems.length,
          has_more: false,
          order: 'new_admissions_desc',
        },
      }),
    })
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  const label = 'Participação nas especialidades disponíveis'
  await expect(page.getByRole('columnheader', { name: new RegExp(label) })).toBeVisible()
  await expect(page.getByTestId('especialidade-participacao-07')).toHaveAttribute(
    'data-label',
    label,
  )
  const summary = page.getByTestId('specialty-summary')
  await expect(summary.locator('dt').first()).toHaveText(label)
  await expect(summary).toContainText('o total hospitalar publicado é')
})

test('o resumo invalida hospital e competência anteriores antes de mostrar a nova linha', async ({
  page,
}) => {
  await mockLiveSource(page)
  const hospitalInicial = acharItem(hospitalListSnapshot, 'cnes', '3012212')

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  const resumo = page.getByTestId('specialty-summary')
  await expect(resumo).toContainText(hospitalInicial.hospital_name as string)

  const competenciaNova = '2025-05'
  await escolherCompetencia(page, competenciaNova)
  await expect(resumo).toContainText('05/2025')
  await expect(resumo).not.toContainText(snapshotCompetenciaBR)

  const outroHospital = acharItem(hospitalListSnapshot, 'cnes', '2786435')
  await page.getByTestId('hospital-select-2786435').click()
  await expect(resumo).toContainText(outroHospital.hospital_name as string)
  await expect(resumo).not.toContainText(hospitalInicial.hospital_name as string)
})

test('o helper e a tela explicam zero, nulo e amostra insuficiente no resumo', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/hospitais/*/especialidades**', async (route) => {
    const url = new URL(route.request().url())
    const cnes = url.pathname.match(/hospitais\/(\d{7})\/especialidades$/)?.[1] ?? ''
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    const base = specialtySnapshot.items as Record<string, unknown>[]
    const edgeItems = [
      {
        ...base[0],
        specialty_code: '98',
        specialty_name: 'Amostra insuficiente',
        new_admissions: 10,
        benchmark_admissions: 20,
        average_stay_days: 4,
        average_stay_benchmark: 5,
        benchmark_hospitals: 2,
        ipe: null,
        ipe_sample_status: 'amostra_insuficiente',
        sample_status: 'amostra_insuficiente',
      },
      {
        ...base[1],
        specialty_code: '99',
        specialty_name: 'Permanência nula',
        new_admissions: 5,
        benchmark_admissions: 0,
        average_stay_days: null,
        average_stay_benchmark: 0,
        benchmark_hospitals: 1,
        ipe: null,
        ipe_sample_status: 'benchmark_zero',
        sample_status: 'amostra_insuficiente',
      },
      {
        ...base[2],
        specialty_code: '00',
        specialty_name: 'Sem internação',
        new_admissions: 0,
        benchmark_admissions: 0,
        average_stay_days: null,
        average_stay_benchmark: null,
        benchmark_hospitals: 0,
        ipe: null,
        ipe_sample_status: 'amostra_insuficiente',
        sample_status: 'amostra_insuficiente',
      },
    ]
    edgeItems.sort((left, right) =>
      Number(right.new_admissions) - Number(left.new_admissions),
    )
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...specialtySnapshot,
        source: 'oracle-live',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { cnes, year, month },
        hospital: { ...(specialtySnapshot.hospital as object), cnes },
        items: edgeItems.map((item) => ({ ...item, cnes })),
        pagination: { limit: 200, offset: 0, count: edgeItems.length, has_more: false, order: 'new_admissions_desc' },
      }),
    })
  })

  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital`)
  const resumo = page.getByTestId('specialty-summary')
  await expect(resumo).toContainText('Amostra insuficiente para comparar')

  await page.getByTestId('especialidade-row-00').click()
  await expect(resumo.getByTestId('specialty-summary-share')).toContainText('sem comparação')
  await expect(resumo.getByTestId('specialty-summary-local-stay')).toContainText(
    'não calculada',
  )
  await expect(resumo.getByTestId('specialty-summary-reference')).toContainText('sem comparação')
  await expect(resumo).toContainText('Sem internação nova')

  await page.getByTestId('especialidade-row-99').click()
  await expect(resumo.getByTestId('specialty-summary-local-stay')).toContainText('não calculada')
  await expect(resumo.getByTestId('specialty-summary-reference')).toContainText('sem comparação')
  await expect(resumo.getByTestId('specialty-summary-reference')).not.toContainText('0 dias')

  await page.getByTestId('especialidade-row-98').click()
  await expect(resumo).toContainText(
    'não há posição ou conclusão',
  )
})

/**
 * Contexto compartilhado entre as quatro rotas.
 *
 * A fonte é hermética: a competência trocada no topo precisa ser a mesma
 * competência observada pela rota seguinte, sem apagar filtros locais.
 */

import { expect, test } from '@playwright/test'
import {
  itens,
  mockLiveSource,
  regionalSnapshot,
  snapshotCompetencia,
} from './apoio'

test('sincroniza competência e território entre URL, barra global e rotas', async ({ page }) => {
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
  await page.route('**/api/dev/v1/fluxos**', (route) => route.abort())
  await page.route('**/api/dev/v1/icsap**', (route) => route.abort())

  await page.goto(
    `/regional?competencia=${snapshotCompetencia}&macrorregiao=3527&regiao=35073` +
      '&destino=35072&hospital=3012212&busca=teste&elegiveis=0',
  )

  await expect(page.getByTestId('global-competence')).toHaveValue(snapshotCompetencia)
  await expect(page.getByTestId('global-macroregion')).toHaveValue('3527')
  await expect(page.getByTestId('global-region')).toHaveValue('35073')

  await page.getByTestId('global-competence').fill('2025-05')
  await expect(page).toHaveURL(/competencia=2025-05/)
  await expect(page).toHaveURL(/macrorregiao=3527/)
  await expect(page).toHaveURL(/regiao=35073/)
  await expect(page).toHaveURL(/destino=35072/)
  await expect(page).toHaveURL(/hospital=3012212/)
  await expect(page).toHaveURL(/busca=teste/)
  await expect(page).toHaveURL(/elegiveis=0/)

  await page.getByRole('link', { name: 'Fluxos' }).click()
  await expect(page.getByTestId('global-competence')).toHaveValue('2025-05')
  await expect(page.getByTestId('global-region')).toHaveValue('35073')
  await expect(page).toHaveURL(/destino=35072/)
  await expect(page).toHaveURL(/hospital=3012212/)

  await page.getByRole('link', { name: 'Hospital' }).click()
  await expect(page.getByTestId('global-competence')).toHaveValue('2025-05')
  await expect(page.getByTestId('global-region')).toHaveValue('35073')
  await expect(page.getByTestId('hospital-search')).toHaveValue('teste')

  // A RRAS que contém a região atual preserva a seleção e os filtros locais.
  await page.getByTestId('global-macroregion').selectOption('3527')
  await expect(page.getByTestId('global-region')).toHaveValue('35073')
  await expect(page).toHaveURL(/destino=35072/)
  await expect(page).toHaveURL(/hospital=3012212/)

  // Ao sair da RRAS atual, a primeira região realmente publicada na nova rede
  // vira o território global; dependências territoriais incompatíveis saem.
  const firstRegionInOtherMacroregion = itens(regionalSnapshot).find(
    (item) => item.macroregion_code === '3529',
  )?.region_code as string
  expect(firstRegionInOtherMacroregion).toBeTruthy()
  await page.getByTestId('global-macroregion').selectOption('3529')
  await expect(page.getByTestId('global-region')).toHaveValue(firstRegionInOtherMacroregion)
  await expect(page).not.toHaveURL(/destino=35072/)
  await expect(page).not.toHaveURL(/hospital=3012212/)
  await expect(page).toHaveURL(/competencia=2025-05/)
  await expect(page).toHaveURL(/busca=teste/)
  await expect(page).toHaveURL(/elegiveis=0/)

  await page.getByTestId('global-search').fill('Ermelino Matarazzo')
  await page.getByTestId('global-search').press('Enter')
  await expect(page).toHaveURL(/\/hospital\?/)
  await expect(page).toHaveURL(/busca=Ermelino\+Matarazzo|busca=Ermelino%20Matarazzo/)
  await expect(page).not.toHaveURL(/hospital=3012212/)
})

test('trava o contexto global inteiro no fallback de snapshot', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto('/regional?macrorregiao=3529&regiao=35073&busca=local&elegiveis=0')

  await expect(page.getByTestId('source-badge')).toHaveCount(0)
  await expect(page.getByTestId('global-competence')).toBeDisabled()
  await expect(page.getByTestId('global-macroregion')).toBeDisabled()
  await expect(page.getByTestId('global-region')).toBeDisabled()
  await expect(page.getByTestId('global-macroregion')).toHaveValue('3529')
  await expect(page).toHaveURL(/busca=local/)
  await expect(page).toHaveURL(/elegiveis=0/)
})

test('normaliza URL territorial incoerente sem perder parâmetros locais', async ({ page }) => {
  await mockLiveSource(page)
  let regionalRequests = 0
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    regionalRequests += 1
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

  const firstRegionInMacroregion = itens(regionalSnapshot).find(
    (item) => item.macroregion_code === '3529',
  )?.region_code as string
  expect(firstRegionInMacroregion).toBeTruthy()

  await page.goto(
    `/regional?competencia=${snapshotCompetencia}&macrorregiao=3529&regiao=35073` +
      '&destino=35072&hospital=3012212&busca=local&elegiveis=0',
  )

  await expect(page.getByTestId('global-macroregion')).toHaveValue('3529')
  await expect(page.getByTestId('global-region')).toHaveValue(firstRegionInMacroregion)
  const normalizedUrl = new URL(page.url())
  expect(normalizedUrl.searchParams.get('competencia')).toBe(snapshotCompetencia)
  expect(normalizedUrl.searchParams.get('macrorregiao')).toBe('3529')
  expect(normalizedUrl.searchParams.get('regiao')).toBe(firstRegionInMacroregion)
  expect(normalizedUrl.searchParams.get('destino')).toBeNull()
  expect(normalizedUrl.searchParams.get('hospital')).toBeNull()
  expect(normalizedUrl.searchParams.get('busca')).toBe('local')
  expect(normalizedUrl.searchParams.get('elegiveis')).toBe('0')
  await expect.poll(() => regionalRequests).toBe(1)
  await page.waitForTimeout(100)
  expect(regionalRequests).toBe(1)

  await page.goto(
    `/regional?competencia=${snapshotCompetencia}&macrorregiao=9999&regiao=35073` +
      '&busca=local&elegiveis=0',
  )
  await expect(page.getByTestId('global-region')).toHaveValue('35073')
  const safeUrl = new URL(page.url())
  expect(safeUrl.searchParams.get('macrorregiao')).toBeNull()
  expect(safeUrl.searchParams.get('regiao')).toBe('35073')
  expect(safeUrl.searchParams.get('busca')).toBe('local')
  expect(safeUrl.searchParams.get('elegiveis')).toBe('0')
})

import { expect, test, type Page } from '@playwright/test'
import { escolherCompetencia, mockLiveSource, snapshotCompetencia } from './apoio'

const huUrl = `/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital-detail`
async function capture(page: Page, name: string) {
  if (process.env.MEDFLOW_QA_DIR) await page.screenshot({ path: `${process.env.MEDFLOW_QA_DIR}/${name}.png`, fullPage: true })
}

test('P01: pares do mês anterior somem enquanto a nova competência carrega', async ({ page }) => {
  await mockLiveSource(page)
  let release!: () => void
  const pending = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/dev/v1/hospitais?**', async (route) => {
    const url = new URL(route.request().url())
    if (!url.searchParams.has('regiao') && url.searchParams.get('mes') === '5') await pending
    await route.fallback()
  })
  await page.goto(huUrl)
  await expect(page.getByTestId('peer-criterio')).toBeVisible()
  await escolherCompetencia(page, '2026-05')
  await expect(page.getByTestId('specialty-summary')).toContainText('05/2026')
  await capture(page, 'p01-pares-em-espera')
  try {
    await expect(page.getByTestId('peer-loading')).toBeVisible()
    await expect(page.getByTestId('peer-criterio')).toHaveCount(0)
    await expect(page.getByTestId('peer-value-iph')).toHaveCount(0)
  } finally { release() }
  await expect(page.getByTestId('peer-loading')).toHaveCount(0)
  await expect(page.getByTestId('peer-criterio')).toBeVisible()
  await escolherCompetencia(page, snapshotCompetencia)
  await expect(page.getByTestId('specialty-summary')).toContainText('06/2026')
  await expect(page.getByTestId('peer-criterio')).toBeVisible()
})

import { expect, test } from '@playwright/test'
import { itens, linhaSerieHospital, mockLiveSource, pt, snapshotCompetencia, snapshotCompetenciaBR, specialtySnapshot } from './apoio'
import { hospitalShare, regionalShare, selectInitialSpecialty, type SpecialtyMetricItem } from '../src/features/hospital/specialtyMetrics'

const specialties = itens(specialtySnapshot) as unknown as SpecialtyMetricItem[]
const selectedSpecialty = selectInitialSpecialty(specialties)!
const publishedAdmissions = specialties.reduce((total, item) => total + item.new_admissions, 0)

for (const width of [1440, 820, 390]) {
  test(`redesenho preserva ordenação, referências e leitura em ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockLiveSource(page)
    let posts = 0
    page.on('request', (request) => {
      if (request.method() === 'POST') posts++
    })
    await page.goto(`/?inicio=0&competencia=${snapshotCompetencia}&regiao=35073#hospital`)
    if (width > 680) {
      await expect(page.locator('#hospital-list .mobile-sort')).not.toBeVisible()
      const admissions = page.getByTestId('hospital-sort-admissions')
      await admissions.click()
      await expect(admissions.locator('..')).toHaveAttribute('aria-sort', 'ascending')
      await admissions.click()
      await expect(admissions.locator('..')).toHaveAttribute('aria-sort', 'descending')
    } else {
      await page.locator('#hospital-list .mobile-sort select').selectOption('iph')
      await page.getByRole('button', { name: 'Inverter direção da ordenação' }).click()
    }
    await page.getByTestId('hospital-select-3012212').click()
    await expect(page.getByTestId('peer-mode-porte')).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByTestId('peer-mode-regiao-porte')).toBeDisabled()
    // The hermetic statewide fixture has fewer than three hospitals of this size.
    await expect(page.getByTestId('peer-insufficient-iph')).toContainText('Menos de 3')
    await expect(page.getByTestId('hospital-series-chart')).toBeVisible()
    await page.getByRole('radio', { name: 'Internações novas', exact: true }).last().click()
    await page.getByTestId('peer-more').locator('summary').click()
    await expect(page.getByTestId('peer-value-ipe')).toBeVisible()
    await expect(page.getByTestId('specialty-summary-hospital-share')).toHaveText(`${pt(hospitalShare(selectedSpecialty, publishedAdmissions)!, 1)}%`)
    await expect(page.getByTestId('specialty-summary-share')).toHaveText(`${pt(regionalShare(selectedSpecialty)!, 1)}%`)
    await expect(page.locator('[data-testid^="specialty-diagnosis-row-"]')).toHaveCount(5)
    if (width > 680) {
      const days = page.locator('.specialty-diagnosis-table').getByRole('button', { name: /^Dias/ })
      await days.click()
      await expect(days.locator('..')).toHaveAttribute('aria-sort', 'ascending')
      await days.click()
      await expect(days.locator('..')).toHaveAttribute('aria-sort', 'descending')
    }
    await page
      .getByRole('navigation', { name: 'Principal', exact: true })
      .getByRole('link', { name: 'Fontes e indicadores' })
      .click()
    await page.getByRole('link', { name: /Retomar análise/ }).click()
    await expect(page.getByTestId('peer-more')).toHaveAttribute('open', '')
    await expect(
      page.getByRole('radio', { name: 'Internações novas', exact: true }).last(),
    ).toHaveAttribute('aria-checked', 'true')
    await expect
      .poll(() => page.evaluate<number>('document.documentElement.scrollWidth - innerWidth'))
      .toBe(0)
    expect(posts).toBe(0)
  })
}

test('gráfico mensal hospitalar preserva lacunas, competência e unidades', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(
    `/?inicio=0&competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital-detail`,
  )
  const points = page.locator('[data-testid^="hospital-series-point-"]')
  await expect(points).toHaveCount(12)
  await points.last().focus()
  await expect(page.locator('.monthly-readout')).toContainText(snapshotCompetenciaBR)
  await expect(page.locator('.monthly-readout')).toContainText('leitos-dia')
  await page.getByRole('radio', { name: 'Internações novas', exact: true }).last().click()
  await expect(page.getByTestId(`hospital-series-point-${snapshotCompetencia}`)).toHaveAttribute(
    'aria-label',
    new RegExp(`Internações novas: ${pt(linhaSerieHospital.new_admissions as number)}`),
  )
})

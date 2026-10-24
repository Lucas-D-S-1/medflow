import { expect, test } from '@playwright/test'
import { mockLiveSource, regionalSnapshot, snapshotCompetencia } from './apoio'

const rows = regionalSnapshot.items as Record<string, number | string>[]
const region = rows.find((row) => row.region_code === '35073')!
const sum = (field: string) => rows.reduce((total, row) => total + Number(row[field]), 0)
const number = (value: number, digits: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const iph = `${number(Number(region.iph_percent), 1)}%`
const rank = [...rows].sort((a, b) => Number(b.iph_percent) - Number(a.iph_percent)).findIndex((row) => row.region_code === '35073') + 1
const ranking = `${rank}ª de ${rows.length}`

for (const width of [1440, 390]) {
  test(`painel regional ${width}: ranking, URL, histórico, indicadores e recorte estadual`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockLiveSource(page)
    await page.goto(`/?competencia=${snapshotCompetencia}&inicio=0`)
    const panel = page.getByTestId('regional-overview')
    await expect(panel.getByRole('heading', { name: `São Paulo em ${new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${snapshotCompetencia}-01T12:00:00Z`))}` })).toBeVisible()
    await expect(panel.locator('.metric-card')).toHaveCount(4)
    await expect(panel.locator('.pressure-ranking li')).toHaveCount(5)
    await expect(page.getByTestId('more-indicators')).not.toHaveAttribute('open', '')
    await expect(page.locator('.more-indicators-preview li')).toHaveCount(6)
    const items = [...regionalSnapshot.items as { region_code: string; region_name: string; iph_percent: number }[]].sort((a, b) => b.iph_percent - a.iph_percent || a.region_code.localeCompare(b.region_code))
    await expect(panel.locator('.pressure-ranking li').first()).toContainText(items[0].region_name)
    await expect(panel.getByTestId('overview-admissions')).toHaveText(number(sum('new_admissions'), 0))
    const noOverflow = () => page.evaluate<boolean>('document.documentElement.scrollWidth <= innerWidth')
    expect(await noOverflow()).toBe(true)
    await page.getByTestId('pressure-region-35073').click()
    await expect(page).toHaveURL(/regiao=35073/)
    await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
    await expect(page.getByTestId('overview-iph')).toHaveText(iph)
    await expect(page.getByTestId('regional-rank')).toContainText(ranking)
    await page.reload()
    await expect(page.getByTestId('global-region')).toHaveValue('35073')
    await expect(page.getByTestId('overview-evasion')).toHaveText(`${number(Number(region.observed_evasion_percent), 1)}%`)
    await page.getByTestId('more-indicators').locator('summary').click()
    await expect(page.getByTestId('state-total-tmh')).toBeVisible()
    expect(await noOverflow()).toBe(true)
    await page.getByRole('button', { name: '✕ Voltar ao estado', exact: true }).click()
    await expect(page.getByTestId('global-region')).toHaveValue('')
    expect(new URL(page.url()).searchParams.get('regiao')).toBeNull()
    await expect(page.getByTestId('more-indicators')).not.toHaveAttribute('open', '')
    await page.goBack()
    await expect(page.getByTestId('global-region')).toHaveValue('35073')
    await expect(page.getByTestId('overview-iph')).toHaveText(iph)
    await page.goForward()
    await expect(page.getByTestId('global-region')).toHaveValue('')
    if (width === 1440) {
      const map = await page.locator('.overview-map').boundingBox()
      const aside = await panel.boundingBox()
      expect(map!.x).toBeLessThan(aside!.x)
      expect(Math.abs(map!.y - aside!.y)).toBeLessThan(2)
    } else {
      const map = await page.locator('.overview-map').boundingBox()
      const aside = await panel.boundingBox()
      expect(aside!.y).toBeGreaterThan(map!.y + map!.height)
    }
  })
}

test('comparação com o estado e ranking mantêm o universo quando a rede está filtrada', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&macrorregiao=3527`)
  await expect(page.getByTestId('regional-rank')).toContainText(ranking)
  await expect(page.getByTestId('overview-iph').locator('..')).toContainText(`estado: ${number(sum('estimated_patient_days') / sum('declared_capacity_bed_days') * 100, 1)}%`)
  await expect(page.getByTestId('overview-stay').locator('..')).toContainText(`estado: ${number(sum('stay_days') / sum('new_admissions'), 2)} dias`)
})

test('contingência de uma região não se apresenta como comparação ou ranking estadual', async ({ page }) => {
  await page.route('**/api/dev/v1/**', (route) => route.abort())
  await page.goto(`/?competencia=${snapshotCompetencia}&inicio=0`)
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
  await expect(page.getByTestId('regional-overview')).toContainText('comparação estadual não incluída na cópia local')
  await expect(page.getByTestId('regional-rank')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '✕ Voltar ao estado', exact: true })).toBeDisabled()
})

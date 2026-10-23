import { expect, test, type Page } from '@playwright/test'
import { escolherCompetencia, mockLiveSource } from './apoio'

const routes = [
  { path: '/?inicio=1', active: 'Início', analysis: false },
  { path: '/?inicio=0', active: 'Dados', analysis: true },
  { path: '/?competencia=2026-06&regiao=35073&hospital=3012212', active: 'Dados', analysis: true },
  { path: '/metodologia', active: 'Fontes e indicadores', analysis: false },
  { path: '/metodologia/tecnico', active: 'Fontes e indicadores', analysis: false },
]
const menu = (page: Page) => page.getByRole('navigation', { name: 'Principal', exact: true })

for (const width of [1440, 390]) {
  test.describe(`navegação global em ${width}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await mockLiveSource(page)
    })

    test('cabeçalho mantém itens, posições e alvos de toque em todas as rotas', async ({ page }) => {
      let baseline: unknown
      for (const route of routes) {
        await page.goto(route.path)
        await expect(page.locator('main')).toBeVisible()
        await expect(page.locator('[data-testid="regional-loading"], [data-testid="loading-state"]')).toHaveCount(0)
        await page.evaluate('document.fonts.ready')
        const header = page.getByRole('banner')
        await expect(header).toHaveCount(1)
        await expect(menu(page).getByRole('link')).toHaveText(['Início', 'Dados', 'Fontes e indicadores'])
        await expect(menu(page).locator('[aria-current]')).toHaveCount(1)
        await expect(menu(page).getByRole('link', { name: route.active, exact: true })).toHaveAttribute('aria-current', 'page')
        const geometry = {
          header: (await header.boundingBox())!,
          items: await Promise.all((await header.getByRole('link').all()).map(async (link) => (await link.boundingBox())!)),
        }
        if (baseline) expect(geometry).toEqual(baseline)
        else baseline = geometry
        for (const item of geometry.items) {
          expect(item.height).toBeGreaterThanOrEqual(44)
          expect(item.width).toBeGreaterThanOrEqual(44)
          expect(item.x).toBeGreaterThanOrEqual(0)
          expect(item.x + item.width).toBeLessThanOrEqual(width)
        }
        await expect(header.locator('.analysis-nav, .global-context-bar, .position-bar')).toHaveCount(0)
        await expect(page.locator('.regional-levels')).toHaveCount(route.analysis ? 1 : 0)
        await expect(page.locator('.global-context-bar')).toHaveCount(route.analysis ? 1 : 0)
        if (route.analysis) {
          const filters = await page.locator('.global-context-bar').boundingBox()
          expect(filters!.y).toBeGreaterThanOrEqual(geometry.header.y + geometry.header.height)
        }
        await expect(page.locator('html')).toHaveJSProperty('scrollWidth', width)
      }
    })

    test('menu e marca voltam ao início de qualquer rota, com F5 e histórico', async ({ page }) => {
      for (const route of routes) {
        for (const via of ['menu', 'marca']) {
          await page.goto(route.path)
          await expect(page.locator('[data-testid="regional-loading"], [data-testid="loading-state"]')).toHaveCount(0)
          const before = new URL(page.url())
          await (via === 'menu'
            ? menu(page).getByRole('link', { name: 'Início', exact: true })
            : page.getByRole('link', { name: 'MedFlow, início', exact: true })).click()
          await expect(page.locator('.entry-page')).toBeVisible()
          expect(new URL(page.url()).searchParams.get('inicio')).toBe('1')
          await expect(menu(page).getByRole('link', { name: 'Início', exact: true })).toHaveAttribute('aria-current', 'page')
          await page.reload()
          await expect(page.locator('.entry-page')).toBeVisible()
          if (route.active !== 'Início') {
            await page.goBack()
            await expect(menu(page).getByRole('link', { name: route.active, exact: true })).toHaveAttribute('aria-current', 'page')
            expect(new URL(page.url()).pathname).toBe(before.pathname)
            await page.goForward()
            await expect(page.locator('.entry-page')).toBeVisible()
          }
        }
      }
    })

    test('demo e recorte sobrevivem a Fontes, técnico, entrada e histórico', async ({ page }) => {
      let posts = 0
      const errors: string[] = []
      page.on('request', (request) => { if (request.method() === 'POST') posts++ })
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto('/?inicio=1&competencia=2026-05')
      await menu(page).getByRole('link', { name: 'Dados', exact: true }).click()
      await expect(page.getByTestId('global-competence')).toBeEnabled()
      await escolherCompetencia(page, '2026-06')
      await expect(page.getByTestId('global-competence')).toHaveAttribute('data-value', '2026-06')
      await expect(page.getByTestId('regional-filter-loading')).toHaveCount(0)
      await page.getByTestId('global-region').selectOption('35073')
      await page.getByRole('button', { name: /Ver os .* hospitais da região ↓/ }).click()
      await page.getByTestId('hospital-select-3012212').click()
      await page.getByTestId('especialidade-row-07').click()
      await expect(page.getByTestId('specialty-summary')).toContainText(/Pediatria/i)
      await page.getByTestId('specialty-summary').getByRole('button', { name: 'Como interpretar?', exact: true }).click()
      await expect(page.getByTestId('assistant-thread')).toContainText(/Pediatria/i)
      await page.getByRole('button', { name: 'Fechar assistente' }).click()
      const slice = Object.fromEntries(new URL(page.url()).searchParams)
      expect(slice).toMatchObject({ inicio: '0', competencia: '2026-06', regiao: '35073', hospital: '3012212', especialidade: '07' })
      const assertSlice = async () => {
        expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual(slice)
        await expect(page.getByTestId('global-competence')).toHaveAttribute('data-value', '2026-06')
        await expect(page.getByTestId('global-region')).toHaveValue('35073')
        await expect(page.getByTestId('global-macroregion')).toHaveValue(slice.macrorregiao ?? '')
        await expect(page.getByTestId('specialty-summary')).toContainText(/Pediatria/i)
        await expect(page.locator('[data-testid="regional-loading"], [data-testid="loading-state"]')).toHaveCount(0)
      }
      await menu(page).getByRole('link', { name: 'Fontes e indicadores', exact: true }).click()
      await expect(page.locator('.global-context-bar, .analysis-nav')).toHaveCount(0)
      await page.reload()
      await page.getByRole('link', { name: 'Detalhes técnicos ›' }).click()
      await page.reload()
      await expect(page.getByTestId('source-badge')).toHaveText('Oracle ao vivo')
      await expect(menu(page).getByRole('link', { name: 'Fontes e indicadores', exact: true })).toHaveAttribute('aria-current', 'page')
      await menu(page).getByRole('link', { name: 'Dados', exact: true }).click()
      await assertSlice()
      await page.reload()
      await assertSlice()
      await menu(page).getByRole('link', { name: 'Fontes e indicadores', exact: true }).click()
      await page.goBack()
      await assertSlice()
      await page.goForward()
      await expect(menu(page).getByRole('link', { name: 'Fontes e indicadores', exact: true })).toHaveAttribute('aria-current', 'page')
      await menu(page).getByRole('link', { name: 'Início', exact: true }).click()
      await page.reload()
      await expect(page.locator('.entry-page')).toBeVisible()
      await menu(page).getByRole('link', { name: 'Dados', exact: true }).click()
      await assertSlice()
      expect(posts).toBe(0)
      expect(errors).toEqual([])
    })
  })
}

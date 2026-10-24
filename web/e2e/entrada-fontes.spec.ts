import { expect, test } from '@playwright/test'
import { mockLiveSource, snapshotCompetencia, especialidadePediatria, coberturaMetodologia, decimal, pt } from './apoio'

for (const viewport of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]) {
  test(`entrada, investigação e fontes em ${viewport.width}`, async ({ page }) => {
    test.setTimeout(60000)
    const capture = async (name: string) => {
      if (process.env.MEDFLOW_QA_DIR) await page.screenshot({ path: `${process.env.MEDFLOW_QA_DIR}/${name}-${viewport.width}.png`, fullPage: true })
    }
    await page.setViewportSize(viewport)
    await mockLiveSource(page)
    let paidRequests = 0
    page.on('request', (request) => { if (request.method() === 'POST') paidRequests++ })
    await page.goto('/')
    const title = page.getByRole('heading', { name: 'Muitos dados públicos. Um caminho claro até o problema.' })
    await expect(title).toBeVisible()
    await expect(page.getByTestId('global-region')).toHaveCount(0)
    await page.reload()
    await expect(title).toBeVisible()
    await expect(page.locator('html')).toHaveJSProperty('scrollWidth', viewport.width)
    await capture('entrada')
    await expect(page.getByRole('region', { name: 'Sugestão do FlowIA' })).toHaveCount(0)
    await page.getByRole('button', { name: /Abrir FlowIA/ }).click()
    await expect(page.getByLabel('Faça outra pergunta')).toHaveValue('')
    await expect(page.getByLabel('Faça outra pergunta')).toBeFocused()
    await expect(page.getByTestId('assistant-thread')).toHaveCount(0)
    expect(paidRequests).toBe(0)
    await capture('entrada-flowia')
    await page.getByRole('button', { name: 'Fechar assistente' }).click()
    await page.getByRole('link', { name: 'Explorar os dados' }).click()
    await expect(page.getByTestId('global-region')).toBeEnabled()
    await page.getByTestId('global-region').selectOption('35073')
    await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
    await page.getByRole('button', { name: /Ver os .* hospitais da região ↓/ }).click()
    await page.getByTestId('hospital-select-3012212').click()
    await page.getByTestId('especialidade-row-07').click()
    await expect(page.getByTestId('specialty-summary')).toContainText(/Pediatria/i)
    await expect(page.getByTestId('specialty-summary-local-stay')).toContainText(decimal(especialidadePediatria.average_stay_days as number))
    await capture('dados-pediatria')
    await page.reload()
    await expect(page.locator('#hospital-detail')).toBeVisible()
    await page.getByRole('link', { name: 'Fontes e indicadores', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Fontes e indicadores', exact: true })).toBeVisible()
    await expect(page.getByTestId('sources-coverage')).toHaveText(`${pt(coberturaMetodologia.regions)} regiões · ${pt(coberturaMetodologia.hospitals)} hospitais`)
    await expect(page.getByTestId('sources-update')).toHaveText('Mensal')
    await capture('fontes')
    await expect(page.locator('main')).not.toContainText(/Gold|\/v1|manifesto|relógio do banco|versão|2024 e 2025/i)
    for (const hash of ['fontes', 'atualizacao', 'leitura', 'iph']) {
      await page.getByRole('navigation', { name: 'Nesta página' }).locator(`a[href$="#${hash}"]`).click()
      await expect(page.locator(`#${hash}`)).toBeFocused()
      await expect(page).toHaveURL(new RegExp(`#${hash}$`))
      await page.reload()
      await expect(page.locator(`#${hash}`)).toBeFocused()
    }
    await page.getByText('Como o IPH é calculado?', { exact: true }).click()
    await expect(page.getByRole('heading', { name: /IPH \(%\) = pacientes-dia/ })).toBeVisible()
    await expect(page.locator('html')).toHaveJSProperty('scrollWidth', viewport.width)
    await capture('fontes-formula')
    await page.goBack()
    await expect(page).toHaveURL(/#leitura$/)
    await page.goForward()
    await expect(page).toHaveURL(/#iph$/)
    await page.getByRole('link', { name: 'Dados', exact: true }).click()
    await expect(page.getByTestId('global-region')).toHaveValue('35073')
    await expect(page).toHaveURL(/hospital=3012212/)
    expect(paidRequests).toBe(0)
  })
}

test('links antigos, intenção explícita e parâmetros isolados', async ({ page }) => {
  await mockLiveSource(page)
  for (const query of [`competencia=${snapshotCompetencia}`, 'regiao=35073', 'hospital=3012212', 'busca=HU', 'elegiveis=0', 'macrorregiao=3527', 'destino=35073']) {
    await page.goto(`/?${query}`)
    await expect(page.locator('#regional')).toBeVisible()
    await expect(page.locator('.entry-page')).toHaveCount(0)
  }
  for (const path of ['/regional', '/hospital', '/fluxos', '/#regional', '/#hospital-detail']) {
    await page.goto(path)
    await expect(page.locator('#regional')).toBeVisible()
  }
  await page.goto('/?inicio=1&regiao=35073#hospital')
  await expect(page.locator('.entry-page')).toBeVisible()
  await page.getByRole('link', { name: 'Explorar os dados' }).click()
  await expect(page.getByTestId('global-region')).toHaveValue('35073')
  await page.goBack()
  await expect(page.locator('.entry-page')).toBeVisible()
  await page.goForward()
  await expect(page.locator('#regional')).toBeVisible()
})

test('FAQ leva às quatro âncoras e movimento reduzido desliga animação', async ({ page }) => {
  await mockLiveSource(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const hash of ['fontes', 'atualizacao', 'leitura', 'iph']) {
    await page.goto('/')
    await expect(page.locator('.entry-step').first()).toHaveCSS('animation-name', 'none')
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto')
    await page.locator(`.entry-faq a[href$="#${hash}"]`).click()
    await expect(page.locator(`#${hash}`)).toBeFocused()
    await page.goBack()
    await expect(page.locator('.entry-page')).toBeVisible()
  }
})

test('fontes mantém carregamento, ausência e contingência identificados', async ({ page }) => {
  await mockLiveSource(page)
  let release!: () => void
  const pending = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/dev/v1/status', async (route) => { await pending; await route.abort() })
  await page.goto('/metodologia')
  await expect(page.getByTestId('loading-state')).toBeVisible()
  release()
  await expect(page.getByTestId('fallback-note')).toContainText('cópia local')
  await expect(page.getByTestId('sources-coverage')).toHaveText(`${pt(coberturaMetodologia.regions)} regiões · ${pt(coberturaMetodologia.hospitals)} hospitais`)
  await expect(page.getByTestId('fallback-note').getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Nesta página' }).locator('a[href$="#iph"]').click()
  await page.reload()
  await expect(page).toHaveURL(/#iph$/)
  await expect(page.locator('#iph')).toBeFocused()
})

test('fontes distingue ausência de dados e formato inválido', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.fulfill({ json: { status: 'ok', source: 'oracle-live', contract_version: '0.5.0', database_time: '2026-08-28T12:00:00Z', data_through: null } })
  })
  await page.goto('/metodologia')
  await expect(page.getByTestId('empty-state')).toContainText('Nenhuma competência publicada')
  await expect(page.getByTestId('sources-coverage')).toHaveCount(0)
  await page.unroute('**/api/dev/v1/status')
  await page.route('**/api/dev/v1/status', async (route) => { await route.fulfill({ json: {} }) })
  await page.reload()
  await expect(page.getByTestId('fallback-note')).toContainText('formato inesperado')
})

test('fontes oferece nova tentativa quando a fonte e a cópia local falham', async ({ page }) => {
  await mockLiveSource(page)
  let attempts = 0
  await page.route('**/api/dev/v1/status', async (route) => { attempts++; await route.abort() })
  // Simula o arquivo local inválido sem alterar as fixtures do projeto.
  await page.route('**/src/mocks/status.json*', async (route) => {
    await route.fulfill({ contentType: 'text/javascript', body: 'export default {}' })
  })
  await page.goto('/metodologia')
  await expect(page.getByTestId('error-state')).toBeVisible()
  await expect(page.getByTestId('sources-coverage')).toHaveCount(0)
  const before = attempts
  await page.getByTestId('error-state').getByRole('button', { name: 'Tentar novamente' }).click()
  await expect.poll(() => attempts).toBeGreaterThan(before)
  await expect(page.getByTestId('error-state')).toBeVisible()
})

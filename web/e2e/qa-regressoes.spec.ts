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

for (const width of [1440, 390]) {
  test(`P02: contingência explica Campinas/maio e permite recuperar o pedido em ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockLiveSource(page)
    let unavailable = true
    await page.route('**/api/dev/v1/status', (route) => unavailable ? route.abort() : route.fallback())
    await page.goto('/?competencia=2026-05&regiao=35072#regional')
    await expect(page.getByTestId('global-region')).toBeDisabled()
    await capture(page, `p02-contingencia-${width}`)
    const notice = page.getByRole('alert').filter({ hasText: 'Contingência' })
    await expect(notice).toContainText('Oracle')
    await expect(notice).toContainText('05/2026')
    await expect(notice).toContainText('35072')
    await expect(notice).toContainText(/JUNDIA[IÍ]/i)
    await expect(notice).toContainText('06/2026')
    await expect(notice).toContainText(/substitu[ií]do/i)
    unavailable = false
    await notice.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('global-region')).toBeEnabled()
    await expect(page.getByTestId('global-region')).toHaveValue('35072')
    await expect(page).toHaveURL(/competencia=2026-05/)
    await expect(notice).toHaveCount(0)
  })
}

test('P03: mapa permite troca direta e limpeza completa mesmo com rede explícita', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}#regional`)
  const jundiai = page.getByTestId('regional-map-35073')
  const campinas = page.getByTestId('regional-map-35072')
  await jundiai.click()
  await capture(page, 'p03-selecao')
  await expect(page.getByRole('button', { name: 'Limpar seleção', exact: true })).toBeVisible()
  await expect(page.getByTestId('global-macroregion')).toHaveValue('')
  await campinas.click()
  await expect(page.getByTestId('global-region')).toHaveValue('35072')
  await campinas.click()
  await expect(page.getByTestId('global-region')).toHaveValue('')
  await expect(page.getByTestId('global-macroregion')).toHaveValue('')
  await page.getByTestId('global-macroregion').selectOption('3527')
  // Seleção explícita de rede continua filtrando a cor e o total, mas nunca bloqueia o mapa.
  await campinas.click()
  await expect(page.getByTestId('global-region')).toHaveValue('35072')
  await expect(page.getByTestId('global-macroregion')).toHaveValue('')
  await page.getByRole('button', { name: 'Limpar seleção', exact: true }).click()
  await expect(page).not.toHaveURL(/regiao=|macrorregiao=|hospital=|destino=/)
  await jundiai.click()
  await jundiai.click()
  await expect(page.getByTestId('global-region')).toHaveValue('')
})

test('P04: sinais mantêm referência estadual ao selecionar região ou filtrar rede', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}#regional`)
  await page.getByTestId('regional-map-35073').hover()
  const score = page.getByTestId('regional-map-signals')
  const statewideScore = await score.innerText()
  await page.getByTestId('regional-map-35073').click()
  await expect(score).toHaveText(statewideScore)
  await page.getByTestId('global-macroregion').selectOption('3527')
  await page.mouse.move(0, 0)
  await capture(page, 'p04-sinais-rede')
  await expect(score).toHaveText(statewideScore)
  await expect(page.getByTestId('signals-reference')).toContainText('62 regiões de São Paulo')
  await page.getByRole('button', { name: 'O que são os sinais?', exact: true }).click()
  await expect(page.getByTestId('assistant-thread')).toContainText(/referência estadual/)
  await expect(page.getByTestId('assistant-thread')).not.toContainText('muda os limiares')
})

test('P05: Tab no celular não entra nos cabeçalhos recortados das tabelas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockLiveSource(page)
  await page.goto(huUrl)
  await expect(page.getByTestId('specialty-summary')).toBeVisible()
  await page.getByTestId('hospital-search').focus()
  let hiddenSortFocused = false
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    if (await page.locator('.hospital-table thead :focus').count()) {
      hiddenSortFocused = true
      await capture(page, 'p05-foco-mobile')
      break
    }
  }
  expect(hiddenSortFocused).toBe(false)
  for (const button of await page.locator('.hospital-table thead button').all()) await expect(button).toBeHidden()
  await capture(page, 'p05-foco-mobile')
  // Redimensionar preserva a ordenação visível por teclado no desktop.
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator('.hospital-table thead button').first()).toBeVisible()
  await page.locator('.hospital-table thead button').first().focus()
  await expect(page.locator('.hospital-table thead button').first()).toBeFocused()
})

test('P06: especialidade sobrevive a F5, link compartilhado e histórico sem quebrar link antigo', async ({ page, context }) => {
  await mockLiveSource(page)
  await page.goto(huUrl)
  await expect(page.getByTestId('especialidade-row-07').getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('especialidade-row-07').getByRole('button').click()
  await expect(page).toHaveURL(/especialidade=07/)
  await page.getByTestId('especialidade-row-03').getByRole('button').click()
  await expect(page.getByTestId('specialty-summary')).toContainText(/Clínica médica/i)
  await capture(page, 'p06-clinica-url')
  await expect(page).toHaveURL(/especialidade=03/)
  await expect(page).toHaveURL(/#hospital-detail$/)
  const sharedUrl = page.url()
  await page.reload()
  await expect(page.getByTestId('especialidade-row-03').getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('especialidade-row-07').getByRole('button').click()
  await page.goBack()
  await expect(page.getByTestId('especialidade-row-03').getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  await page.goForward()
  await expect(page.getByTestId('especialidade-row-07').getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  const shared = await context.newPage()
  await mockLiveSource(shared)
  await shared.goto(sharedUrl)
  await expect(shared.getByTestId('especialidade-row-03').getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  await shared.close()
  await page.goto(huUrl.replace('#hospital-detail', '&especialidade=99#hospital-detail'))
  await expect(page.getByTestId('especialidade-row-07').getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  await page.goto(huUrl)
  await expect(page.getByTestId('especialidade-row-07').getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('especialidade-row-03').getByRole('button').click()
  await page.getByRole('button', { name: 'Trocar hospital', exact: true }).click()
  await expect(page).not.toHaveURL(/especialidade=/)
})

test('P02: contingência tolera competência malformada em links antigos', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/dev/v1/status', route => route.abort())
  await page.goto('/?competencia=2026-13&regiao=35072#regional')
  await expect(page.getByRole('alert').filter({ hasText: 'Contingência' })).toContainText('competência inválida')
  await expect(page.getByTestId('global-region')).toBeDisabled()
  expect(errors).toEqual([])
})

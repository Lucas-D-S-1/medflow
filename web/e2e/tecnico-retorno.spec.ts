import { expect, test } from '@playwright/test'
import { mockLiveSource, snapshotCompetencia, snapshotCompetenciaBR } from './apoio'

for (const width of [1440, 390]) {
  test(`técnico abre no topo e retorna com query, posição e filtros em ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    await mockLiveSource(page)
    let posts = 0
    page.on('request', request => { if (request.method() === 'POST') posts++ })
    await page.goto(`/?inicio=0&competencia=${snapshotCompetencia}&regiao=35073&macrorregiao=3527&hospital=3012212&especialidade=07&busca=HU&elegiveis=0#hospital-detail`)
    await expect(page.getByTestId('hospital-search')).toHaveValue('HU')
    await expect(page.getByTestId('specialty-summary')).toContainText(/Pediatria/i)
    await page.getByRole('navigation', { name: 'Principal', exact: true }).getByRole('link', { name: 'Fontes e indicadores', exact: true }).click()
    const sourcesUrl = page.url()
    const technicalLink = page.getByRole('link', { name: 'Detalhes técnicos ›' })
    for (const via of ['button', 'browser']) {
      await technicalLink.scrollIntoViewIfNeeded()
      const sourceY = await page.evaluate<number>('window.scrollY')
      await technicalLink.click()
      await expect(page.getByRole('button', { name: '← Voltar a Fontes e indicadores', exact: true }).first()).toBeInViewport()
      await expect(page.locator('h1')).toBeFocused()
      await expect.poll(() => page.evaluate<number>('window.scrollY')).toBe(0)
      await expect(page.getByTestId('source-badge')).toHaveText(`Base mensal · dados até ${snapshotCompetenciaBR}`)
      if (via === 'button') await page.getByRole('button', { name: '← Voltar a Fontes e indicadores', exact: true }).first().click()
      else await page.goBack()
      await expect(page).toHaveURL(sourcesUrl)
      await expect(technicalLink).toBeFocused()
      await expect.poll(async () => Math.abs(await page.evaluate<number>('window.scrollY') - sourceY)).toBeLessThan(5)
    }
    await page.goBack()
    await expect(page.getByTestId('global-region')).toHaveValue('35073')
    await expect(page.getByTestId('global-macroregion')).toHaveValue('3527')
    await expect(page.getByTestId('global-competence')).toHaveAttribute('data-value', snapshotCompetencia)
    await expect(page.getByTestId('hospital-search')).toHaveValue('HU')
    await expect(page.getByTestId('specialty-summary')).toContainText(/Pediatria/i)
    expect(new URL(page.url()).search).toBe(new URL(sourcesUrl).search)
    expect(posts).toBe(0)
  })

  test(`técnico direto e F5 usam retorno seguro em ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await mockLiveSource(page)
    await page.goto('/metodologia?regiao=35073&busca=vicente&elegiveis=0')
    await page.getByRole('link', { name: 'Detalhes técnicos ›' }).click()
    const search = new URL(page.url()).search
    await page.reload()
    await page.getByRole('button', { name: '← Voltar a Fontes e indicadores', exact: true }).first().click()
    await expect(page).toHaveURL(`/metodologia${search}`)
    await page.goto(`/metodologia/tecnico${search}`)
    await page.getByRole('button', { name: '← Voltar a Fontes e indicadores', exact: true }).first().click()
    await expect(page).toHaveURL(`/metodologia${search}`)
  })
}

test('origem externa não é usada como destino de retorno', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('https://external.invalid/', route => route.fulfill({ contentType: 'text/html', body: '<p>Origem externa</p>' }))
  await page.goto('https://external.invalid/')
  await page.goto('/metodologia/tecnico?busca=vicente')
  await page.getByRole('button', { name: '← Voltar a Fontes e indicadores', exact: true }).first().click()
  await expect(page).toHaveURL('/metodologia?busca=vicente')
})

test('cópia parcial não declara ausência na base para hospital sem pacote', async ({ page }) => {
  await page.route('**/api/dev/v1/status', route => route.abort())
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=2786435#hospital-detail`)
  await expect(page.getByTestId('especialidade-absent')).toContainText('não estão incluídas na cópia local parcial')
  await expect(page.getByTestId('serie-absent')).toContainText('não está incluído na cópia local parcial')
  await page.getByTestId('diagnostics-toggle').click()
  await expect(page.getByTestId('cid-absent')).toContainText('não estão incluídos na cópia local parcial')
  await expect(page.getByTestId('peer-snapshot-limited')).toContainText('cópia local parcial')
})

test('falha dos pares não declara comparação estadual nem sucesso de outros blocos', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/hospitais?*', route => {
    const url = new URL(route.request().url())
    return url.searchParams.has('regiao') ? route.fallback() : route.abort()
  })
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital-detail`)
  await expect(page.getByTestId('peer-error')).toContainText('A comparação está indisponível')
  await expect(page.getByTestId('peer-rebaixado')).toHaveCount(0)
  await expect(page.getByTestId('peer-criterio')).toHaveCount(0)
  await expect(page.getByTestId('peer-error')).not.toContainText('continuam disponíveis')
})

import { test, expect } from '@playwright/test'
import { mockLiveSource, snapshotCompetencia } from './apoio'

test.skip(process.env.FLOWIA_HAIKU_E2E !== '1', 'Contrato Haiku publicado')
const answer = (text: string) => ({
  status: 'ok', source: 'oracle-approved-query', intent: 'regioes_iph', narrative: text, sql: null,
  provenance: { dataset: 'Fixture local', competence: snapshotCompetencia, limit: 5, limitations: 'Teste sem modelo.' },
})
for (const width of [1440, 1280, 1100, 390]) {
  test.describe(`FlowIA sem recorte e layout ${width}`, () => {
    test.use({ viewport: { width, height: 844 } })
    test.beforeEach(async ({ page }) => { await mockLiveSource(page) })
    for (const entry of [true, false]) {
      test(`${entry ? 'entrada' : 'Dados'} explica e consulta sem exigir hospital`, async ({ page }) => {
        const payloads: { context: Record<string, unknown> }[] = []
        await page.route('**/api/flowia-haiku-live/v1/reserva', route => route.fulfill({ json: { status: 'unavailable' } }))
        await page.route('**/api/flowia-haiku-live/v1/perguntar', route => {
          payloads.push(route.request().postDataJSON())
          return route.fulfill({ json: answer('Ranking estadual da competência selecionada.') })
        })
        await page.goto(`/?inicio=${entry ? '1' : '0'}`)
        await page.getByRole('button', { name: /Abrir FlowIA/ }).click()
        for (const [question, definition] of [['O que é o IPH?', 'Índice de Pressão Hospitalar'], ['O que é o IPE?', 'Índice de Permanência por Especialidade']]) {
          await page.getByLabel('Faça outra pergunta').fill(question)
          await page.getByRole('button', { name: 'Enviar pergunta' }).click()
          await expect(page.locator('.assistant-answer').last()).toContainText(definition)
        }
        expect(payloads).toHaveLength(0)
        await page.getByLabel('Faça outra pergunta').fill('Quais regiões têm maior IPH neste mês?')
        await page.getByRole('button', { name: 'Enviar pergunta' }).click()
        await expect(page.locator('.assistant-answer').last()).toContainText('Ranking estadual')
        expect(payloads).toHaveLength(1)
        expect(payloads[0].context).toMatchObject({ competence: snapshotCompetencia, hospital_cnes: null, region_code: null })
        expect(new URL(page.url()).searchParams.has('hospital')).toBe(false)
        expect(new URL(page.url()).searchParams.has('regiao')).toBe(false)
      })
    }
    test('abertura preserva leitura; painel e composer cabem na viewport', async ({ page }) => {
      await page.goto('/?inicio=0')
      const main = page.locator('main')
      const closed = await main.boundingBox()
      const launcher = page.getByRole('button', { name: /Abrir FlowIA/ })
      await launcher.scrollIntoViewIfNeeded()
      const before = await page.evaluate<number>('window.scrollY')
      await launcher.click()
      if (width >= 1280) {
        await expect(page.locator('.assistant-header p')).toHaveText('Contexto: visão regional')
        await expect.poll(() => page.evaluate<number>('window.scrollY')).toBe(before)
      }
      const panel = page.locator('.assistant-panel')
      const rect = (await panel.boundingBox())!
      const content = (await main.boundingBox())!
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.width).toBeLessThanOrEqual(width)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      if (width >= 1280) {
        expect(content.width).toBeGreaterThanOrEqual(800)
        expect(content.x + content.width).toBeLessThanOrEqual(rect.x - 8)
      } else expect(content.width).toBe(closed!.width)
      const form = (await page.locator('.assistant-form').boundingBox())!
      expect(form.y + form.height).toBeLessThanOrEqual(844)
      await page.getByLabel('Faça outra pergunta').fill('O que é o IPE?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await page.getByRole('link', { name: 'Fontes e indicadores', exact: true }).click()
      await expect(panel).toBeVisible()
      await expect(panel).toContainText('Índice de Permanência por Especialidade')
      await page.getByRole('link', { name: 'Dados', exact: true }).click()
      await expect(panel).toBeVisible()
      await page.getByRole('button', { name: 'Fechar assistente' }).click()
      await expect(panel).toHaveCount(0)
      await expect.poll(async () => (await main.boundingBox())!.width).toBe(closed!.width)
      await expect(page.locator('html')).toHaveJSProperty('scrollWidth', width)
    })
  })
}
test('atalhos hospitalares sem hospital selecionado oferecem explicação útil', async ({ page }) => {
  await mockLiveSource(page)
  let posts = 0
  await page.route('**/api/flowia-haiku-live/v1/*', route => { posts++; return route.abort() })
  await page.goto('/?inicio=0#hospital')
  await page.locator('#hospital').scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: /Abrir FlowIA/ }).click()
  await page.getByRole('button', { name: 'O que é o IPE?', exact: true }).click()
  await expect(page.locator('.assistant-answer').last()).toContainText('Índice de Permanência por Especialidade')
  await expect(page.locator('.assistant-answer').last()).not.toContainText('Selecione um hospital')
  expect(posts).toBe(0)
})
test('seleção UI continua acompanhando requisição Haiku', async ({ page }) => {
  await mockLiveSource(page)
  let context: Record<string, unknown> | undefined
  await page.route('**/api/flowia-haiku-live/v1/reserva', route => route.fulfill({ json: { status: 'unavailable' } }))
  await page.route('**/api/flowia-haiku-live/v1/perguntar', route => {
    context = route.request().postDataJSON().context
    return route.fulfill({ json: answer('Comparação do hospital selecionado.') })
  })
  await page.goto(`/?inicio=0&competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212#hospital-detail`)
  await page.getByRole('button', { name: /Abrir FlowIA/ }).click()
  await expect(page.locator('.assistant-header p')).toHaveText('Contexto: visão hospitalar')
  await page.getByLabel('Faça outra pergunta').fill('Quais especialidades concentram internações neste mês?')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()
  await expect(page.locator('.assistant-answer').last()).toContainText('hospital selecionado')
  expect(context).toMatchObject({ competence: snapshotCompetencia, region_code: '35073', hospital_cnes: '3012212' })
})

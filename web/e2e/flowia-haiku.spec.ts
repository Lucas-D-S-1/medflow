import { test, expect } from '@playwright/test'
import { mockLiveSource } from './apoio'

const pilot = process.env.FLOWIA_HAIKU_E2E === '1'
test.skip(!pilot, 'Piloto opt-in; nao altera o caminho publicado')

const response = (status = 'ok', narrative = 'Regiões ordenadas por IPH estimado.') => ({
  status, source: 'oracle-approved-query', intent: status === 'refused' ? 'recusar_tempo_real' : 'regioes_iph',
  narrative, sql: null, warning: null, data: [],
  provenance: { dataset: 'SIH/SUS e CNES; Gold MedFlow', competence: '2026-06', limit: 5,
    limitations: 'Base mensal. IPH é estimativa, não ocupação real.' },
})

for (const width of [1440, 390]) {
  test.describe(`FlowIA ${width}`, () => {
    test.use({ viewport: { width, height: 900 } })
    test.beforeEach(async ({ page }) => { await mockLiveSource(page) })

    test('balao e sugestoes nao enviam uma pergunta paga', async ({ page }) => {
      let calls = 0
      await page.route('**/api/flowia-haiku/v1/perguntar', async route => {
        calls++; await route.fulfill({ json: response() })
      })
      await page.goto('/')
      await page.getByRole('button', { name: 'Outra pergunta', exact: true }).click()
      await page.getByRole('button', { name: 'Perguntar', exact: true }).click()
      await expect(page.locator('#medflow-assistant-panel')).toBeVisible()
      expect(calls).toBe(0)
    })

    test('pergunta livre usa nova rota e mostra fonte mes e limite', async ({ page }) => {
      let received: Record<string, unknown> | null = null
      await page.route('**/api/flowia-haiku/v1/perguntar', async route => {
        received = route.request().postDataJSON()
        await route.fulfill({ json: response() })
      })
      await page.goto('/regional?regiao=35073')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Quais regiões têm maior IPH nesta competência?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      const panel = page.locator('#medflow-assistant-panel')
      await expect(panel).toContainText('Regiões ordenadas')
      await expect(panel).toContainText('Fonte: SIH/SUS e CNES')
      await expect(panel).toContainText('Competência: 2026-06')
      await expect(panel).toContainText('Limite: até 5 resultados')
      expect(received).toBeTruthy()
      expect(Object.keys(received!.context as object).sort()).toEqual(['competence', 'hospital_cnes', 'region_code', 'specialty_code'])
      await expect(page.locator('html')).toHaveJSProperty('scrollWidth', width)
      await page.screenshot({ path: `/home/lucas/orquestracao/20261023/medflow-haiku/qa-${width}.png`, fullPage: true })
    })

    test('recusa leitos agora sem qualquer chamada paga', async ({ page }) => {
      let calls = 0
      await page.route('**/api/flowia-haiku/v1/perguntar', async route => { calls++; await route.abort() })
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Quantos leitos estão disponíveis agora?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('Não tenho disponibilidade de leitos em tempo real')
      expect(calls).toBe(0)
    })

    test('ambiguidade pede esclarecimento', async ({ page }) => {
      await page.route('**/api/flowia-haiku/v1/perguntar', async route => {
        await route.fulfill({ json: { ...response('clarify', 'Qual indicador e recorte deseja analisar?'), intent: 'esclarecer' } })
      })
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Como está?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('Qual indicador e recorte')
    })

    test('API indisponivel preserva explicacoes locais sem Select AI automatico', async ({ page }) => {
      let legacyCalls = 0
      await page.route('**/api/flowia-haiku/v1/perguntar', async route => { await route.fulfill({ status: 503, json: {} }) })
      await page.route('**/assistente/perguntar', async route => { legacyCalls++; await route.abort() })
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Quais hospitais concentram a pressão?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('classificação não respondeu')
      await page.getByLabel('Perguntas sugeridas').getByRole('button', { name: 'O que é IPH?' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('Índice de Pressão Hospitalar')
      expect(legacyCalls).toBe(0)
    })

    test('ranking regional continua pelos dados carregados quando API falha', async ({ page }) => {
      await page.route('**/api/flowia-haiku/v1/perguntar', async route => { await route.fulfill({ status: 503, json: {} }) })
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Quais regiões têm maior IPH nesta competência?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('Regiões com maior IPH estimado nos dados carregados')
      await expect(page.locator('#medflow-assistant-panel')).toContainText('Limite: até 5 regiões')
    })

    test('prazo de 5,5s e resposta insegura nao mostram SQL', async ({ page }) => {
      await page.route('**/api/flowia-haiku/v1/perguntar', async route => {
        await new Promise(resolve => setTimeout(resolve, 6500))
        await route.fulfill({ json: response('ok', 'SELECT * FROM user_credentials') }).catch(() => {})
      })
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Quais hospitais concentram a pressão?')
      const start = Date.now()
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('classificação não respondeu', { timeout: 6200 })
      expect(Date.now() - start).toBeLessThan(6100)
      await expect(page.locator('#medflow-assistant-panel')).not.toContainText('user_credentials')
    })
  })
}

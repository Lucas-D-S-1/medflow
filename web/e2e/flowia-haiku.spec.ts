import { test, expect, type Route } from '@playwright/test'
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
    test.beforeEach(async ({ page }) => {
      await mockLiveSource(page)
      await page.route('**/api/flowia-haiku-live/v1/reserva', route => route.fulfill({ json: { status: 'unavailable' } }))
    })

    test('balao e sugestoes nao enviam uma pergunta paga', async ({ page }) => {
      let calls = 0
      await page.route('**/api/flowia-haiku-live/v1/perguntar', async route => {
        calls++; await route.fulfill({ json: response() })
      })
      await page.goto('/')
      await page.getByRole('button', { name: 'Outra pergunta', exact: true }).click()
      await page.getByRole('button', { name: 'Perguntar', exact: true }).click()
      await expect(page.locator('#medflow-assistant-panel')).toBeVisible()
      expect(calls).toBe(0)
    })

    test('pergunta livre mostra SQL recolhido e formatado sem rodape', async ({ page }) => {
      let received: Record<string, unknown> | null = null
      await page.route('**/api/flowia-haiku-live/v1/perguntar', async route => {
        received = route.request().postDataJSON()
        await route.fulfill({ json: { ...response(), sql: "SELECT * FROM (SELECT NM_REGIAO_SAUDE, PC_IPH_ESTIMADO FROM MART_INDICADOR_REGIAO_MENSAL WHERE CD_COMPETENCIA = '202606') WHERE ROWNUM<=5" } })
      })
      await page.goto('/regional?regiao=35073')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Quais regiões têm maior IPH nesta competência?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      const panel = page.locator('#medflow-assistant-panel')
      await expect(panel).toContainText('Regiões ordenadas')
      await expect(panel).not.toContainText(/Fonte:|Origem:|Comparação descritiva/i)
      const disclosure = panel.locator('details')
      await expect(disclosure).not.toHaveAttribute('open', '')
      await panel.getByText('Ver query', { exact: true }).click()
      await expect(disclosure.locator('pre')).toContainText('MART_INDICADOR_REGIAO_MENSAL')
      await expect(disclosure.locator('pre')).toContainText(/SELECT\s*\n/)
      expect(received).toBeTruthy()
      expect(Object.keys(received!.context as object).sort()).toEqual(['competence', 'history', 'hospital_cnes', 'region_code', 'region_name', 'specialty_code', 'specialty_name'])
      await expect(page.locator('html')).toHaveJSProperty('scrollWidth', width)

    })

    test('mostra quase lá aos 10s e aceita Haiku aos 19s', async ({ page }) => {
      let paidRoute: Route | undefined
      await page.route('**/api/flowia-haiku-live/v1/perguntar', route => { paidRoute = route })
      await page.route('**/api/flowia-haiku-live/v1/reserva', route => route.fulfill({ json: {
        ...response('ok', 'Resposta de reserva'), intent: 'reserva',
      } }))
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.clock.install({ time: new Date('2026-10-23T12:00:00Z') })
      await page.clock.pauseAt(new Date('2026-10-23T12:00:01Z'))
      await page.getByLabel('Faça outra pergunta').fill('Qual o IPH da região de Jundiaí?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      const panel = page.locator('#medflow-assistant-panel')
      await expect(panel.getByRole('status')).toContainText('Entendendo a pergunta…')
      await expect.poll(() => Boolean(paidRoute)).toBe(true)
      await page.clock.fastForward(2_500)
      await expect(panel.getByRole('status')).toHaveText('Consultando o Oracle…')
      await page.clock.fastForward(7_500)
      await expect(panel.getByRole('status')).toContainText('Consultando o Oracle… quase lá')
      await page.clock.fastForward(9_000)
      await expect(panel).not.toContainText('Resposta de reserva')
      await paidRoute!.fulfill({ json: response('ok', 'IPH da região: 67,2%.') })
      await expect(panel).toContainText('IPH da região: 67,2%.', { timeout: 8_000 })
      await expect(panel).not.toContainText('Origem:')
      await expect(panel).not.toContainText('Resposta de reserva')
    })

    test('recusa leitos agora sem qualquer chamada paga', async ({ page }) => {
      let calls = 0
      await page.route('**/api/flowia-haiku-live/v1/perguntar', async route => { calls++; await route.abort() })
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Quantos leitos estão disponíveis agora?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('Não tenho disponibilidade de leitos em tempo real')
      expect(calls).toBe(0)
    })

    test('ambiguidade pede esclarecimento', async ({ page }) => {
      await page.route('**/api/flowia-haiku-live/v1/perguntar', async route => {
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
      await page.route('**/api/flowia-haiku-live/v1/perguntar', async route => { await route.fulfill({ status: 503, json: {} }) })
      await page.route('**/assistente/perguntar', async route => { legacyCalls++; await route.abort() })
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Quais hospitais concentram a pressão?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('consulta não respondeu')
      await page.getByLabel('Perguntas sugeridas').getByRole('button', { name: 'O que é IPH?' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('Índice de Pressão Hospitalar')
      expect(legacyCalls).toBe(0)
    })

    test('ranking regional continua pelos dados carregados quando API falha', async ({ page }) => {
      await page.route('**/api/flowia-haiku-live/v1/perguntar', async route => { await route.fulfill({ status: 503, json: {} }) })
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Quais regiões têm maior IPH nesta competência?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('Regiões com maior IPH estimado nos dados carregados')
      await expect(page.locator('#medflow-assistant-panel')).not.toContainText('Fonte:')
    })

    test('prazo de 25s encerra chamada pendente', async ({ page }) => {
      await page.route('**/api/flowia-haiku-live/v1/perguntar', async () => {})
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.clock.install({ time: new Date('2026-10-23T12:00:00Z') })
      await page.clock.pauseAt(new Date('2026-10-23T12:00:01Z'))
      await page.getByLabel('Faça outra pergunta').fill('Quais hospitais concentram a pressão?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await page.clock.fastForward(25_001)
      await expect(page.locator('#medflow-assistant-panel')).toContainText('consulta não respondeu')
    })

    test('reserva Oracle mantém o seguimento quando chamada paga demora', async ({ page }) => {
      await page.route('**/api/flowia-haiku-live/v1/perguntar', async () => {})
      await page.route('**/api/flowia-haiku-live/v1/reserva', route => route.fulfill({ json: {
        ...response('ok', 'AME (CNES 6992560): IPH 117,619%.'), intent: 'reserva',
      } }))
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.clock.install({ time: new Date('2026-10-23T12:00:00Z') })
      await page.clock.pauseAt(new Date('2026-10-23T12:00:01Z'))
      await page.getByLabel('Faça outra pergunta').fill('Qual o hospital com maior pressão?')
      const reserveReady = page.waitForResponse('**/api/flowia-haiku-live/v1/reserva')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await (await reserveReady).finished()
      await page.clock.fastForward(24_999)
      await expect(page.locator('#medflow-assistant-panel')).not.toContainText('CNES 6992560')
      await expect(page.locator('#medflow-assistant-panel').getByRole('status')).toContainText('quase lá')
      await page.clock.fastForward(2)
      await expect(page.locator('#medflow-assistant-panel')).toContainText('CNES 6992560')
      await expect(page.getByLabel('Faça outra pergunta')).toBeEnabled()
    })

    test('resposta insegura nao mostra SQL', async ({ page }) => {
      await page.route('**/api/flowia-haiku-live/v1/perguntar', async route => {
        await route.fulfill({ json: response('ok', 'SELECT * FROM user_credentials') })
      })
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Quais hospitais concentram a pressão?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('consulta não respondeu')
      await expect(page.locator('#medflow-assistant-panel')).not.toContainText('user_credentials')
    })

    test('seguimento curto envia pergunta e resposta anteriores como dados', async ({ page }) => {
      const requests: Array<{context: {history: Array<{question: string; answer: string}>}}> = []
      await page.route('**/api/flowia-haiku-live/v1/perguntar', async route => {
        requests.push(route.request().postDataJSON())
        await route.fulfill({ json: response('ok', 'JUNDIAI: IPH 67,1662% na competência 06/2026.') })
      })
      await page.goto('/regional')
      await page.getByRole('button', { name: /Posso ajudar/ }).click()
      await page.getByLabel('Faça outra pergunta').fill('Quais regiões têm maior IPH nesta competência?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await expect(page.locator('#medflow-assistant-panel')).toContainText('JUNDIAI: IPH')
      await page.getByLabel('Faça outra pergunta').fill('E quanto foi no trimestre?')
      await page.getByRole('button', { name: 'Enviar pergunta' }).click()
      await expect.poll(() => requests.length).toBe(2)
      expect(requests[1].context.history.at(-1)?.question).toContain('Quais regiões')
      expect(requests[1].context.history.at(-1)?.answer).toContain('JUNDIAI')
    })
  })
}

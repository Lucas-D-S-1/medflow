/**
 * Assistente contextual.
 *
 * Os atalhos importantes precisam continuar úteis sem GenAI. A chamada ao
 * Select AI fica reservada à pergunta livre e tem contrato próprio.
 */

import { expect, test } from '@playwright/test'
import { mockLiveSource, pt, regiaoDestacada } from './apoio'

test.beforeEach(async ({ page }) => {
  await mockLiveSource(page)
})

test('responde o conceito de IPH com o recorte exibido sem chamar a IA', async ({ page }) => {
  let calls = 0
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    calls += 1
    await route.abort()
  })

  await page.goto('/regional?regiao=35073')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByRole('button', { name: 'O que é IPH?' }).click()

  const panel = page.locator('#medflow-assistant-panel')
  await expect(panel).toContainText('Consulta MedFlow')
  await expect(panel).toContainText(regiaoDestacada.region_name as string)
  await expect(panel).toContainText(`${pt(regiaoDestacada.iph_percent as number, 1)}%`)
  await expect(panel).toContainText('não uma taxa de ocupação real')
  expect(calls).toBe(0)
})

test('troca as sugestões junto com a rota', async ({ page }) => {
  await page.goto('/regional')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await expect(page.getByRole('button', { name: 'O que é IPH?' })).toBeVisible()

  await page.getByRole('link', { name: 'Fluxos' }).click()
  await expect(page.getByText('Contexto: fluxos assistenciais')).toBeVisible()
  await expect(page.getByRole('button', { name: 'O que é ICSAP?' })).toBeVisible()

  await page.getByRole('link', { name: 'Hospital' }).click()
  await page.getByRole('button', { name: 'Por que o IPR pode ficar indisponível?' }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText('cortes mínimos')
})

test('envia somente pergunta livre ao Oracle Select AI e mostra SQL auditável', async ({ page }) => {
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    expect(route.request().method()).toBe('POST')
    expect(route.request().postDataJSON()).toEqual({
      question: 'Quais sinais merecem uma análise conjunta?',
    })
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-select-ai',
        response_id: 42,
        narrative: 'Pressão e evasão devem ser lidas com volume e tendência.',
        sql: 'select nm_regiao_saude from vw_api_regioes_resumo',
        warning: null,
      }),
    })
  })

  await page.goto('/regional')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByLabel('Faça outra pergunta').fill(
    'Quais sinais merecem uma análise conjunta?',
  )
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()

  const panel = page.locator('#medflow-assistant-panel')
  await expect(panel).toContainText('Oracle Select AI')
  await expect(panel).toContainText('Pressão e evasão devem ser lidas')
  await panel.getByText('Ver SQL gerado e validado').click()
  await expect(panel.locator('pre')).toContainText('select nm_regiao_saude')
  await expect(panel).toContainText('perguntas livres: 1/5')
})

test('mantém os atalhos úteis quando o Select AI está indisponível', async ({ page }) => {
  await page.route('**/api/dev/v1/assistente/perguntar', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto('/regional')
  await page.getByRole('button', { name: /Posso ajudar/ }).click()
  await page.getByLabel('Faça outra pergunta').fill('Existe correlação entre os sinais?')
  await page.getByRole('button', { name: 'Enviar pergunta' }).click()

  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'Você ainda pode usar as perguntas sugeridas',
  )
  await page.getByRole('button', { name: 'O que é IPH?' }).click()
  await expect(page.locator('#medflow-assistant-panel')).toContainText(
    'não uma taxa de ocupação real',
  )
})

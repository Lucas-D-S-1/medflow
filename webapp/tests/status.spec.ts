import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const statusSnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/status.json', import.meta.url), 'utf8'),
) as Record<string, string>

test('renderiza a competência e a versão do contrato recebidas do Oracle', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...statusSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toHaveText('Oracle ao vivo')
  await expect(page.getByTestId('data-through')).toHaveText('05/2026')
  await expect(page.getByTestId('contract-version')).toHaveText('v0.3.0')
  await expect(page.getByText('Este endpoint não calcula IPH, IPR, TMH, CMI ou permanência.')).toBeVisible()
})

test('usa somente o snapshot quando o Oracle falha', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toContainText(
    'Contingência — snapshot até 2026-05',
  )
  await expect(page.getByTestId('data-through')).toHaveText('05/2026')
  await expect(page.getByTestId('contract-version')).toHaveText('v0.3.0')
  await expect(page.getByTestId('fallback-note')).toContainText('nenhuma fonte foi misturada')
})

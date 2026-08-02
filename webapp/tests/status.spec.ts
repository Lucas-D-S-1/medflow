import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const statusSnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/status.json', import.meta.url), 'utf8'),
) as Record<string, string>
const goldMetadata = JSON.parse(
  readFileSync(
    new URL('../../dados/gold/qualidade/METADADOS.json', import.meta.url),
    'utf8',
  ),
) as { gerado_em_utc: string }

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

test('distingue ausência legítima de indisponibilidade do Oracle', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: null,
        contract_version: '0.3.0',
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByTestId('empty-state')).toContainText(
    'Nenhuma competência publicada',
  )
  await expect(page.getByTestId('empty-state')).toContainText(
    'A fonte respondeu normalmente',
  )
  await expect(page.getByTestId('source-badge')).toHaveCount(0)
  await expect(page.getByTestId('fallback-note')).toHaveCount(0)
})

test('não descreve contrato inválido como indisponibilidade do Oracle', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...statusSnapshot,
        source: 'oracle-live',
        data_through: '-',
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toContainText('Contingência')
  await expect(page.getByTestId('fallback-note')).toContainText(
    'O Oracle respondeu, mas o conteúdo não corresponde ao contrato da API',
  )
  await expect(page.getByTestId('fallback-note')).not.toContainText(
    'Oracle não respondeu',
  )
})

test('rejeita snapshot, competência, versão e horário inválidos na resposta live', async ({ page }) => {
  let responsePayload: Record<string, unknown> = {
    ...statusSnapshot,
    source: 'oracle-live',
  }

  await page.route('**/api/dev/v1/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(responsePayload),
    })
  })

  for (const invalidField of [
    { source: 'snapshot' },
    { data_through: '2026-99' },
    { contract_version: '9.9.9' },
    { database_time: 'horário desconhecido' },
  ]) {
    responsePayload = {
      ...statusSnapshot,
      source: 'oracle-live',
      ...invalidField,
    }

    await page.goto('/')

    await expect(page.getByTestId('source-badge')).toContainText('Contingência')
    await expect(page.getByTestId('fallback-note')).toContainText(
      'O Oracle respondeu, mas o conteúdo não corresponde ao contrato da API',
    )
    await expect(page.getByTestId('data-through')).toHaveText('05/2026')
  }
})

test('mantém a geração do snapshot verificável na metadata da Gold', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.abort('connectionfailed')
  })

  expect(statusSnapshot.database_time).toBe(goldMetadata.gerado_em_utc)

  await page.goto('/')

  await expect(page.getByTestId('data-through')).toHaveText('05/2026')
  await expect(page.getByTestId('contract-version')).toHaveText('v0.3.0')
})

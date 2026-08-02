import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const statusSnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/status.json', import.meta.url), 'utf8'),
) as Record<string, string>
const methodologySnapshot = JSON.parse(
  readFileSync(new URL('../src/fixtures/metodologia.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
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
  await page.route('**/api/dev/v1/metodologia', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...methodologySnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toHaveText('Oracle ao vivo')
  await expect(page.getByTestId('data-through')).toHaveText('05/2026')
  await expect(page.getByTestId('contract-version')).toHaveText('v0.3.0')
  await expect(page.getByTestId('methodology-data-through')).toContainText('Gold publicada até 05/2026')
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-competencies')).toHaveText('29')
  await expect(page.getByTestId('coverage-admissions')).toHaveText('6.905.441')
  await expect(page.getByTestId('coverage-patient-days')).toHaveText('32.425.897')
  await expect(page.getByTestId('coverage-stay-days')).toHaveText('32.029.295')
  await expect(page.getByTestId('gold-updated-at')).toContainText('2026')
  await expect(page.getByTestId('formula-cmi')).toContainText('fator de correcao IPCA')
  await expect(page.getByTestId('formula-iph')).toContainText('Pressao estimada sobre capacidade declarada, nao ocupacao fisica real.')
  await expect(page.getByTestId('cut-ipr')).toContainText('20 casos hospital/CID')
  await expect(page.getByTestId('reconciliation-new_admissions_cross_mart')).toContainText('diferença: 0')
  await expect(page.getByTestId('definition-billed_daily')).toContainText('QT_DIARIAS')
  await expect(page.getByTestId('state-benchmark_zero')).toContainText('IPR fica nulo')
  await expect(page.getByTestId('state-iph_denominator_zero')).toContainText('nao imputa capacidade')
})

test('renderiza os números reais do Oracle pelo proxy relativo', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toHaveText('Oracle ao vivo', { timeout: 15_000 })
  await expect(page.getByTestId('data-through')).toHaveText('05/2026')
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-admissions')).toHaveText('6.905.441')
  await expect(page.getByTestId('coverage-benchmark-zero')).toHaveText('6.680')
  await expect(page.getByTestId('reconciliation-patient_days_cross_mart')).toContainText('diferença: 0')
  await expect(page.getByTestId('fallback-note')).toHaveCount(0)
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
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-admissions')).toHaveText('6.905.441')
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

test('não mistura metodologia snapshot com status Oracle ao vivo', async ({ page }) => {
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
  await page.route('**/api/dev/v1/metodologia', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...methodologySnapshot,
        source: 'oracle-live',
        formulas: [],
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toContainText(
    'Contingência — snapshot até 2026-05',
  )
  await expect(page.getByTestId('fallback-note')).toContainText(
    'O Oracle respondeu, mas o conteúdo não corresponde ao contrato da API',
  )
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-admissions')).toHaveText('6.905.441')
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

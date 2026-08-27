/**
 * Contrato operacional e transversais.
 *
 * Origem do dado, contingência, ausência legítima, recusa de
 * resposta fora do contrato e layout.
 */

import { expect, test } from '@playwright/test'
import {
  coberturaMetodologia,
  goldMetadata,
  internacoesNovasBR,
  methodologySnapshot,
  mockLiveSource,
  pt,
  regionalSnapshot,
  serieRegionalAtual,
  snapshotCompetencia,
  snapshotCompetenciaBR,
  statusSnapshot,
  ultimaCompetenciaBR,
} from './apoio'

test('@live renderiza os números reais do Oracle pelo proxy relativo', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toHaveText('Oracle ao vivo', { timeout: 15_000 })
  // Derivado do manifesto da Bronze, não memorizado: quando o DATASUS publica
  // uma competência nova e o pipeline avança, este teste tem de acompanhar a
  // realidade em vez de falhar por estar velho.
  await expect(page.getByTestId('data-through')).toHaveText(ultimaCompetenciaBR)
  await expect(page.getByTestId('regional-count')).toHaveText('62 de 62 regiões')
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
  // Estruturais e invariantes: o total de internações novas na Metodologia
  // tem de bater com o que a Silver reconciliou, e a checagem cruzada de
  // pacientes-dia entre marts tem de fechar em zero, em qualquer recorte.
  await expect(page.getByTestId('fallback-note')).toHaveCount(0)
  await page.getByRole('link', { name: 'Metodologia' }).click()
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-admissions')).toHaveText(internacoesNovasBR)
  await expect(page.getByTestId('reconciliation-patient_days_cross_mart')).toContainText('diferença: 0')
})
test('usa somente o snapshot quando o Oracle falha', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto('/')

  await expect(page.getByTestId('source-badge')).toContainText(
    `Contingência — snapshot até ${snapshotCompetencia}`,
  )
  await expect(page.getByTestId('data-through')).toHaveText(snapshotCompetenciaBR)
  await expect(page.getByTestId('contract-version')).toHaveText('v0.3.0')
  await expect(page.getByTestId('fallback-note')).toContainText('nenhuma fonte foi misturada')
  await expect(page.getByTestId('global-competence')).toBeDisabled()
  await expect(page.getByTestId('global-macroregion')).toBeDisabled()
  await expect(page.getByTestId('global-region')).toBeDisabled()
  await expect(page.getByTestId('regional-series-source')).toHaveText(
    'Snapshot de contingência',
  )
  await expect(page.getByTestId('regional-series-current')).toContainText(
    `${pt(serieRegionalAtual.iph_percent as number, 1)}%`,
  )
  await page.getByRole('link', { name: 'Metodologia' }).click()
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-admissions')).toHaveText(
    pt(coberturaMetodologia.new_admissions),
  )
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
test('@live não mistura metodologia snapshot com status Oracle ao vivo', async ({ page }) => {
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
    `Contingência — snapshot até ${snapshotCompetencia}`,
  )
  await expect(page.getByTestId('fallback-note')).toContainText(
    'O Oracle respondeu, mas o conteúdo não corresponde ao contrato da API',
  )
  await page.getByRole('link', { name: 'Metodologia' }).click()
  await expect(page.getByTestId('coverage-regions')).toHaveText('62')
  await expect(page.getByTestId('coverage-admissions')).toHaveText(
    pt(coberturaMetodologia.new_admissions),
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
    await expect(page.getByTestId('data-through')).toHaveText(snapshotCompetenciaBR)
  }
})
test('mantém a geração do snapshot verificável na metadata da Gold', async ({ page }) => {
  await page.route('**/api/dev/v1/status', async (route) => {
    await route.abort('connectionfailed')
  })

  expect(statusSnapshot.database_time).toBe(goldMetadata.gerado_em_utc)

  await page.goto('/')

  await expect(page.getByTestId('data-through')).toHaveText(snapshotCompetenciaBR)
  await expect(page.getByTestId('contract-version')).toHaveText('v0.3.0')
})
test('preserva filtros na URL e ignora resposta atrasada de outra competência', async ({ page }) => {
  await mockLiveSource(page)

  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    const competence = `${year}-${String(month).padStart(2, '0')}`
    if (competence === '2025-04') {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    try {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ...regionalSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: competence,
          filters: { year, month, macroregion_code: null, region_code: null },
        }),
      })
    } catch {
      // A primeira requisição pode já ter sido cancelada pelo AbortController.
    }
  })

  await page.goto(`/regional?competencia=${snapshotCompetencia}&macrorregiao=3527&regiao=35073`)
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')

  await page.getByTestId('global-competence').fill('2025-04')
  await page.getByTestId('global-competence').fill('2025-05')

  await expect(page.getByTestId('regional-data-through')).toContainText('05/2025')
  await expect(page).toHaveURL(/competencia=2025-05/)
  await expect(page).toHaveURL(/macrorregiao=3527/)
  await expect(page).toHaveURL(/regiao=35073/)
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
})
test('mostra ausência legítima no recorte e não trata o workspace como seção', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto('/regional?macrorregiao=9999')

  await expect(page.locator('.regional-workspace')).toHaveJSProperty('tagName', 'DIV')
  await expect(page.getByTestId('regional-count')).toHaveText('0 de 62 regiões')
  await expect(page.getByTestId('regional-no-items')).toContainText('Nenhuma região no recorte')
  await expect(page.getByTestId('regional-no-items')).toContainText(
    'Isso é ausência legítima, não erro da fonte.',
  )
  await expect(page.getByTestId('regional-map')).toHaveCount(0)
})
test('não cria rolagem horizontal em notebook ou tela estreita', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 800 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/regional')
    await expect(page.getByTestId('regional-map-svg')).toBeVisible()
    const horizontalOverflow = await page.evaluate<number>(
      'document.documentElement.scrollWidth - window.innerWidth',
    )
    expect(horizontalOverflow).toBeLessThanOrEqual(0)
  }
})

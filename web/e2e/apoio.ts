/**
 * Apoio compartilhado das suítes por visão.
 *
 * Aqui moram os dez snapshots, os valores derivados deles e o `mockLiveSource`
 * que faz a página acreditar que o Oracle respondeu. Nada disto é específico
 * de uma visão, e duplicá-lo em quatro arquivos garantiria que um deles
 * envelhecesse sozinho.
 *
 * **Nenhum número esperado é digitado.** Todos saem das fixtures ou do
 * manifesto da Bronze — foi assim que 24 asserções passaram a descrever um
 * recorte extinto sem que nada acusasse.
 */

import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Verdade corrente do pipeline, para os testes @live não guardarem número de
// um recorte que já passou. Os herméticos continuam usando as fixtures.
export const bronzeManifest = JSON.parse(
  readFileSync(new URL('../../data/bronze/MANIFESTO.json', import.meta.url), 'utf8'),
) as { recorte: { ultima_competencia_comum: string } }
export const silverMetadata = JSON.parse(
  readFileSync(new URL('../../data/silver/qualidade/METADADOS.json', import.meta.url), 'utf8'),
) as { metricas: Record<string, number> }

export const ultimaCompetencia = bronzeManifest.recorte.ultima_competencia_comum
export const ultimaCompetenciaBR = `${ultimaCompetencia.slice(4)}/${ultimaCompetencia.slice(0, 4)}`
export const internacoesNovasBR = silverMetadata.metricas.internacoes_novas.toLocaleString('pt-BR')

export const statusSnapshot = JSON.parse(
  readFileSync(new URL('../src/mocks/status.json', import.meta.url), 'utf8'),
) as Record<string, string>
export const methodologySnapshot = JSON.parse(
  readFileSync(new URL('../src/mocks/metodologia.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
export const regionalSnapshot = JSON.parse(
  readFileSync(new URL('../src/mocks/regioes-resumo.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
export const regionalSeriesSnapshot = JSON.parse(
  readFileSync(new URL('../src/mocks/regiao-serie-35073.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
export const flowSnapshot = JSON.parse(
  readFileSync(new URL('../src/mocks/fluxos-35073.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
export const icsapSnapshot = JSON.parse(
  readFileSync(new URL('../src/mocks/icsap-35073.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
export const hospitalListSnapshot = JSON.parse(
  readFileSync(new URL('../src/mocks/hospitais-35073.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
export const hospitalSeriesSnapshot = JSON.parse(
  readFileSync(new URL('../src/mocks/hospital-serie-3012212.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
export const specialtySnapshot = JSON.parse(
  readFileSync(
    new URL('../src/mocks/hospital-especialidades-3012212.json', import.meta.url),
    'utf8',
  ),
) as Record<string, unknown>
export const cidSnapshot = JSON.parse(
  readFileSync(new URL('../src/mocks/hospital-cids-3012212.json', import.meta.url), 'utf8'),
) as Record<string, unknown>
export const goldMetadata = JSON.parse(
  readFileSync(
    new URL('../../data/gold/qualidade/METADADOS.json', import.meta.url),
    'utf8',
  ),
) as { gerado_em_utc: string }

// A competência que os snapshots retratam, lida deles. Os testes herméticos
// costumavam cravar `2026-05` em 34 lugares: quando a fatia 5b avançou o
// recorte, eles continuaram passando — internamente consistentes e falando de
// um recorte que não existia mais. Snapshot é a fonte; o teste pergunta a ele.
export const snapshotCompetencia = statusSnapshot.data_through
export const snapshotCompetenciaBR = `${snapshotCompetencia.slice(5)}/${snapshotCompetencia.slice(0, 4)}`

/** Número no formato que o produto usa, a partir do próprio snapshot. */
export function pt(valor: number, casas = 0): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

export function itens(snapshot: Record<string, unknown>): Record<string, number | string>[] {
  return snapshot.items as Record<string, number | string>[]
}

export function paginacao(snapshot: Record<string, unknown>): { count: number } {
  return snapshot.pagination as { count: number }
}

export function acharItem(
  snapshot: Record<string, unknown>,
  campo: string,
  valor: string,
): Record<string, number | string> {
  const achado = itens(snapshot).find((item) => item[campo] === valor)
  if (!achado) throw new Error(`fixture sem item onde ${campo} = ${valor}`)
  return achado
}

// Os valores esperados saem das fixtures, não de números digitados. Um teste
// que memoriza `1.456` continua verde quando a fixture muda para `1.372` e o
// produto passa a mostrar outra coisa — foi assim que 24 asserções ficaram
// descrevendo um recorte extinto.
export const linhaSerieHospital = acharItem(
  hospitalSeriesSnapshot,
  'competence',
  snapshotCompetencia,
)
export const hospitalDestacado = acharItem(hospitalListSnapshot, 'cnes', '2786435')
export const hospitalSemAmostra = acharItem(
  hospitalListSnapshot,
  'sample_status',
  'amostra_insuficiente',
)
export const territorioFluxo = flowSnapshot.territory as Record<string, number>
export const regiaoIcsap = icsapSnapshot.region as Record<string, number>
export const contextoCid = cidSnapshot.hospital as Record<string, number>
export const cidMaisFrequente = itens(cidSnapshot)[0]
export const cidAsma = acharItem(cidSnapshot, 'cid_code', 'J459')
export const coberturaMetodologia = methodologySnapshot.coverage as Record<string, number>
/** O fluxo da região para ela mesma: quem foi atendido no próprio território. */
export const fluxoIntrarregional = acharItem(flowSnapshot, 'destination_region_code', '35073')
export const fluxoParaCampinas = acharItem(flowSnapshot, 'destination_region_code', '35072')
export const totalInternacoesDoHospital = (specialtySnapshot.hospital as Record<string, number>)
  .new_admissions_total
export const regiaoDestacada = acharItem(regionalSnapshot, 'region_code', '35073')
export const serieRegionalAtual = acharItem(
  regionalSeriesSnapshot,
  'competence',
  snapshotCompetencia,
)
export const especialidadeObstetricia = acharItem(specialtySnapshot, 'specialty_code', '02')
export const especialidadePediatria = acharItem(specialtySnapshot, 'specialty_code', '07')
/** A competência imediatamente anterior na série do hospital; a ordem é decrescente. */
export const competenciaAnterior = itens(hospitalSeriesSnapshot)[1]
/** IPH das regiões da macrorregião 3529, para a legenda do mapa filtrado. */
export const iphDaMacro3529 = itens(regionalSnapshot)
  .filter((item) => item.macroregion_code === '3529')
  .map((item) => item.iph_percent as number)

export async function mockLiveSource(page: Page) {
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
  // Sem esta rota o resumo regional vaza para o proxy. Em uma máquina com
  // acesso ao Oracle a suíte passa contra dados reais sem ninguém perceber; no
  // CI, sem rede, a mesma chamada falha e o app cai em contingência — e o teste
  // mede o produto travado em vez do produto ao vivo. Um teste registrado
  // depois deste continua vencendo, porque o Playwright confere as rotas na
  // ordem inversa do registro.
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { year, month, macroregion_code: null, region_code: null },
      }),
    })
  })
  await page.route('**/api/dev/v1/hospitais**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    const regionCode = url.searchParams.get('regiao') ?? ''
    const fixtureRegion = hospitalListSnapshot.region as Record<string, unknown>
    const payload = regionCode === fixtureRegion.region_code
      ? {
          ...hospitalListSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: `${year}-${String(month).padStart(2, '0')}`,
          filters: { year, month, region_code: regionCode },
        }
      : {
          ...hospitalListSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: `${year}-${String(month).padStart(2, '0')}`,
          filters: { year, month, region_code: regionCode },
          region: {
            region_code: regionCode,
            region_name: null,
            macroregion_code: null,
            macroregion_name: null,
          },
          pagination: {
            limit: 200,
            offset: 0,
            count: 0,
            has_more: false,
            order: 'new_admissions_desc',
          },
          items: [],
        }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) })
  })
  // Registrado depois de `hospitais**` de propósito: o Playwright confere as
  // rotas na ordem inversa do registro, então a mais específica precisa vir
  // por último para não ser engolida pelo glob geral.
  await page.route('**/api/dev/v1/hospitais/*/serie**', async (route) => {
    const cnes = new URL(route.request().url()).pathname.match(/hospitais\/(\d{7})\/serie$/)?.[1] ?? ''
    const fixtureHospital = hospitalSeriesSnapshot.hospital as Record<string, unknown>
    const payload = cnes === fixtureHospital.cnes
      ? {
          ...hospitalSeriesSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
        }
      : {
          ...hospitalSeriesSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: null,
          filters: { cnes },
          hospital: {
            cnes,
            hospital_name: null,
            unit_type_code: null,
            unit_type_name: null,
            municipality_code: null,
            region_code: null,
            region_name: null,
            macroregion_code: null,
            macroregion_name: null,
          },
          pagination: {
            limit: 200,
            offset: 0,
            count: 0,
            has_more: false,
            order: 'competence_desc',
          },
          items: [],
        }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) })
  })
  await page.route('**/api/dev/v1/hospitais/*/especialidades**', async (route) => {
    const url = new URL(route.request().url())
    const cnes = url.pathname.match(/hospitais\/(\d{7})\/especialidades$/)?.[1] ?? ''
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...specialtySnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { cnes, year, month },
        hospital: { ...(specialtySnapshot.hospital as object), cnes },
        items: (specialtySnapshot.items as Record<string, unknown>[]).map((item) => ({
          ...item,
          cnes,
        })),
      }),
    })
  })
  await page.route('**/api/dev/v1/hospitais/*/cids**', async (route) => {
    const url = new URL(route.request().url())
    const cnes = url.pathname.match(/hospitais\/(\d{7})\/cids$/)?.[1] ?? ''
    const eligibleOnly = url.searchParams.get('elegivel') === '1'
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...cidSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        filters: { cnes, eligible_only: eligibleOnly },
        hospital: { ...(cidSnapshot.hospital as object), cnes },
        items: (cidSnapshot.items as Record<string, unknown>[]).map((item) => ({
          ...item,
          cnes,
        })),
      }),
    })
  })
  await page.route('**/api/dev/v1/icsap**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    const regionCode = url.searchParams.get('regiao') ?? ''
    const fixtureRegion = icsapSnapshot.region as Record<string, unknown>
    const payload = regionCode === fixtureRegion.region_code
      ? {
          ...icsapSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: `${year}-${String(month).padStart(2, '0')}`,
          filters: { year, month, region_code: regionCode },
        }
      : {
          ...icsapSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: `${year}-${String(month).padStart(2, '0')}`,
          filters: { year, month, region_code: regionCode },
          region: {
            region_code: regionCode,
            region_name: null,
            macroregion_code: null,
            macroregion_name: null,
            population: null,
            resident_admissions_observed: null,
            icsap_admissions: null,
            icsap_share_of_resident_percent: null,
            icsap_rate_per_10k: null,
          },
          pagination: {
            limit: 200,
            offset: 0,
            count: 0,
            has_more: false,
            order: 'icsap_admissions_desc',
          },
          items: [],
        }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) })
  })
  await page.route('**/api/dev/v1/regioes/*/serie**', async (route) => {
    const match = new URL(route.request().url()).pathname.match(/regioes\/(\d{5})\/serie$/)
    const regionCode = match?.[1] ?? ''
    const fixtureRegion = regionalSeriesSnapshot.region as Record<string, unknown>
    const payload = regionCode === fixtureRegion.region_code
      ? {
          ...regionalSeriesSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
        }
      : {
          ...regionalSeriesSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: null,
          region: {
            region_code: regionCode,
            region_name: null,
            macroregion_code: null,
            macroregion_name: null,
          },
          filters: { region_code: regionCode },
          pagination: {
            limit: 100,
            offset: 0,
            count: 0,
            has_more: false,
            order: 'competence_desc',
          },
          items: [],
        }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) })
  })
}


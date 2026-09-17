import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import {
  regionalIphCumulativeAverages,
  regionalInsight,
  regionalMetricValue,
  regionalSeriesWindow,
  shiftRegionalCompetence,
  type RegionalInsightPoint,
} from '../src/features/regional/regionalInsights'

function point(
  competence: string,
  values: Partial<RegionalInsightPoint> = {},
): RegionalInsightPoint {
  return {
    competence,
    iph_percent: 50,
    declared_capacity_bed_days: 100,
    new_admissions: 100,
    historical_admissions_average: 80,
    historical_years: 2,
    seasonality_status: 'calculado',
    ...values,
  }
}

test('calcula IPH contra a média acumulada inclusiva em ordem cronológica', () => {
  const insight = regionalInsight([
    point('2026-06', { iph_percent: 70 }),
    point('2025-12', { iph_percent: 30 }),
    point('2026-05', { iph_percent: 50 }),
    point('2026-07', { iph_percent: 99 }),
  ], '2026-06', 'iph')

  expect(insight.status).toBe('ready')
  expect(insight.current).toBe(70)
  expect(insight.previousComparison).toMatchObject({
    reference: 50,
    difference: 20,
    referenceCompetence: '2026-05',
  })
  expect(insight.historicalComparison).toMatchObject({
    reference: 50,
    difference: 20,
    competences: 3,
    startCompetence: '2025-12',
  })
  expect(insight.summary).toContain('ante a média acumulada até o mês')
})

test('ordena entrada decrescente, exclui futuro e usa meses diferentes', () => {
  const cumulative = regionalIphCumulativeAverages([
    point('2027-01', { iph_percent: 500 }),
    point('2026-03', { iph_percent: 90 }),
    point('2026-02', { iph_percent: 60 }),
    point('2026-01', { iph_percent: 30 }),
  ], '2026-03')

  expect(cumulative.map(({ competence, average, competences }) => ({
    competence,
    average,
    competences,
  }))).toEqual([
    { competence: '2026-01', average: 30, competences: 1 },
    { competence: '2026-02', average: 45, competences: 2 },
    { competence: '2026-03', average: 60, competences: 3 },
  ])
})

test('inclui zero válido uma vez e ignora valores ou denominadores inválidos', () => {
  const cumulative = regionalIphCumulativeAverages([
    point('2026-01', { iph_percent: 0 }),
    point('2026-01', { iph_percent: 0 }),
    point('2026-02', { iph_percent: 100, declared_capacity_bed_days: 0 }),
    point('2026-03', { iph_percent: Number.NaN }),
    point('2026-04', { iph_percent: 80 }),
  ], '2026-04')

  expect(cumulative).toEqual([
    {
      competence: '2026-01',
      average: 0,
      competences: 1,
      startCompetence: '2026-01',
    },
    {
      competence: '2026-04',
      average: 40,
      competences: 2,
      startCompetence: '2026-01',
    },
  ])
})

test('o primeiro mês válido usa o próprio IPH como média acumulada', () => {
  const insight = regionalInsight([
    point('2026-06', { iph_percent: 67.5 }),
  ], '2026-06', 'iph')

  expect(insight.status).toBe('ready')
  expect(insight.historicalComparison).toMatchObject({
    reference: 67.5,
    difference: 0,
    competences: 1,
    startCompetence: '2026-06',
  })
})

test('reproduz a média real de Jundiaí a partir da fixture pública preservada', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL('../src/mocks/regiao-serie-35073.json', import.meta.url),
      'utf8',
    ),
  ) as { items: RegionalInsightPoint[] }
  const cumulative = regionalIphCumulativeAverages(fixture.items, '2026-06')
  const current = cumulative.at(-1)

  expect(current?.competence).toBe('2026-06')
  expect(current?.competences).toBe(30)
  expect(current?.startCompetence).toBe('2024-01')
  expect(current?.average).toBeCloseTo(81.37068, 5)
  const comparison = regionalInsight(fixture.items, '2026-06', 'iph')
    .historicalComparison
  expect(comparison).toMatchObject({
    competences: 30,
    startCompetence: '2024-01',
  })
  expect(comparison?.reference).toBeCloseTo(81.37068, 5)
  expect(comparison?.difference).toBeCloseTo(-14.20448, 5)
})

test('calcula internações em percentual apenas com referências positivas', () => {
  const ready = regionalInsight([
    point('2026-05', { new_admissions: 100 }),
    point('2026-06', {
      new_admissions: 120,
      historical_admissions_average: 80,
      historical_years: 3,
    }),
  ], '2026-06', 'admissions')
  expect(ready.previousComparison?.difference).toBe(20)
  expect(ready.historicalComparison?.difference).toBe(50)

  const zeroBaseline = regionalInsight([
    point('2026-05', { new_admissions: 0 }),
    point('2026-06', {
      new_admissions: 0,
      historical_admissions_average: 0,
    }),
  ], '2026-06', 'admissions')
  expect(zeroBaseline.current).toBe(0)
  expect(zeroBaseline.previousComparison).toBeNull()
  expect(zeroBaseline.historicalComparison).toBeNull()
  expect(zeroBaseline.historicalReason).toBe('referencia-zero')
})

test('usa o mês-calendário anterior inclusive na virada do ano', () => {
  expect(shiftRegionalCompetence('2026-01', -1)).toBe('2025-12')
  const insight = regionalInsight([
    point('2025-12', { iph_percent: 60 }),
    point('2026-01', { iph_percent: 65 }),
  ], '2026-01', 'iph')
  expect(insight.previousComparison).toMatchObject({
    referenceCompetence: '2025-12',
    difference: 5,
  })
})

test('não substitui competência ou mês anterior ausentes pelo último ponto', () => {
  const missingCurrent = regionalInsight([
    point('2026-04', { iph_percent: 55 }),
    point('2026-05', { iph_percent: 60 }),
  ], '2026-06', 'iph')
  expect(missingCurrent.status).toBe('missing-current')
  expect(missingCurrent.current).toBeNull()

  const missingPrevious = regionalInsight([
    point('2024-06', { iph_percent: 50 }),
    point('2025-06', { iph_percent: 60 }),
    point('2026-04', { iph_percent: 65 }),
    point('2026-06', { iph_percent: 70 }),
  ], '2026-06', 'iph')
  expect(missingPrevious.previousComparison).toBeNull()
  expect(missingPrevious.historicalComparison?.reference).toBe(61.25)
})

test('IPH rejeita denominador ou valor explicitamente inválidos', () => {
  for (const invalid of [
    point('2026-06', { iph_percent: 70, declared_capacity_bed_days: 0 }),
    point('2026-06', { iph_percent: 70, declared_capacity_bed_days: -1 }),
    point('2026-06', { iph_percent: 70, declared_capacity_bed_days: null }),
    point('2026-06', { iph_percent: 70, declared_capacity_bed_days: undefined }),
    point('2026-06', { iph_percent: 70, declared_capacity_bed_days: Number.NaN }),
    point('2026-06', { iph_percent: 70, declared_capacity_bed_days: Number.POSITIVE_INFINITY }),
    point('2026-06', { iph_percent: -1, declared_capacity_bed_days: 100 }),
    point('2026-06', { iph_percent: Number.NaN, declared_capacity_bed_days: 100 }),
  ]) {
    expect(regionalMetricValue(invalid, 'iph')).toBeNull()
    expect(regionalInsight([invalid], '2026-06', 'iph').status).toBe('missing-current')
  }

  expect(regionalMetricValue({ competence: '2026-06', iph_percent: 70 }, 'iph')).toBe(70)
  expect(regionalMetricValue(point('2026-06', { new_admissions: -1 }), 'admissions')).toBeNull()
  expect(regionalMetricValue(point('2026-06', { new_admissions: Number.POSITIVE_INFINITY }), 'admissions')).toBeNull()
})

test('preserva o status sazonal publicado fora do período-alvo', () => {
  const insight = regionalInsight([
    point('2026-05', { new_admissions: 100 }),
    point('2026-06', {
      new_admissions: 120,
      seasonality_status: 'fora_periodo_alvo',
    }),
  ], '2026-06', 'admissions')
  expect(insight.previousComparison?.difference).toBe(20)
  expect(insight.historicalComparison).toBeNull()
  expect(insight.historicalReason).toBe('fora-periodo-alvo')
})

test('a janela explicita meses ausentes e nunca inclui competências futuras', () => {
  const window = regionalSeriesWindow([
    point('2025-06'),
    point('2026-04'),
    point('2026-06'),
    point('2026-07'),
  ], '2026-06', false, 3)

  expect(window.map((slot) => slot.competence)).toEqual([
    '2026-04',
    '2026-05',
    '2026-06',
  ])
  expect(window[1].item).toBeNull()
  expect(window.some((slot) => slot.competence === '2026-07')).toBe(false)
})

test('a média acumulada preserva lacunas e usa histórico anterior à janela visual', () => {
  const items = [
    point('2024-01', { iph_percent: 20 }),
    point('2026-04', { iph_percent: 40 }),
    point('2026-06', { iph_percent: 60 }),
  ]
  const compact = regionalSeriesWindow(items, '2026-06', false, 3)
  expect(compact.map((slot) => slot.competence)).toEqual([
    '2026-04',
    '2026-05',
    '2026-06',
  ])
  expect(compact[1].item).toBeNull()
  expect(compact.some((slot) => slot.competence === '2024-01')).toBe(false)
  expect(regionalIphCumulativeAverages(items, '2026-06')).toEqual([
    { competence: '2024-01', average: 20, competences: 1, startCompetence: '2024-01' },
    { competence: '2026-04', average: 30, competences: 2, startCompetence: '2024-01' },
    { competence: '2026-06', average: 40, competences: 3, startCompetence: '2024-01' },
  ])
  expect(regionalInsight(items, '2026-06', 'iph').historicalComparison?.reference).toBe(40)
})

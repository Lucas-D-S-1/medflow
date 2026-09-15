import { expect, test } from '@playwright/test'
import {
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

test('calcula IPH em pontos percentuais e usa somente o mesmo mês de anos anteriores', () => {
  const insight = regionalInsight([
    point('2024-06', { iph_percent: 68 }),
    point('2025-06', { iph_percent: 72 }),
    point('2026-05', { iph_percent: 78 }),
    point('2026-06', { iph_percent: 72 }),
    point('2026-07', { iph_percent: 99 }),
    point('2027-06', { iph_percent: 100 }),
  ], '2026-06', 'iph')

  expect(insight.status).toBe('ready')
  expect(insight.current).toBe(72)
  expect(insight.previousComparison).toMatchObject({
    reference: 78,
    difference: -6,
    referenceCompetence: '2026-05',
  })
  expect(insight.historicalComparison).toMatchObject({
    reference: 70,
    difference: 2,
    years: 2,
  })
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
  expect(missingPrevious.historicalComparison?.reference).toBe(55)
})

test('IPH exige dois anos distintos e rejeita denominador ou valor explicitamente inválidos', () => {
  const insufficient = regionalInsight([
    point('2025-06', { iph_percent: 60 }),
    point('2026-06', { iph_percent: 70 }),
  ], '2026-06', 'iph')
  expect(insufficient.status).toBe('insufficient-history')
  expect(insufficient.historicalComparison).toBeNull()

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

test('o baseline considera todo o histórico mesmo quando a janela visual é compacta', () => {
  const items = [
    point('2024-06', { iph_percent: 60 }),
    point('2025-06', { iph_percent: 80 }),
    point('2026-06', { iph_percent: 75 }),
  ]
  const compact = regionalSeriesWindow(items, '2026-06', false, 12)
  expect(compact.some((slot) => slot.competence === '2024-06')).toBe(false)
  expect(regionalInsight(items, '2026-06', 'iph').historicalComparison?.reference).toBe(70)
})

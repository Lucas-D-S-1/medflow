import { expect, test } from '@playwright/test'
import {
  comparisonAbsence,
  hospitalShare,
  isComparableStay,
  regionalShare,
  selectInitialSpecialty,
  type SpecialtyMetricItem,
} from '../src/features/hospital/specialtyMetrics'
import {
  assistantContextKey,
  isCurrentSpecialtySummary,
} from '../src/features/assistant/assistantContext'

function specialty(overrides: Partial<SpecialtyMetricItem> = {}): SpecialtyMetricItem {
  return {
    specialty_code: '07',
    new_admissions: 480,
    average_stay_days: 5.2,
    benchmark_admissions: 320,
    benchmark_hospitals: 5,
    average_stay_benchmark: 3.4,
    ipe_sample_status: 'suficiente',
    ...overrides,
  }
}

test('calcula participações hospitalar e regional com denominadores distintos', () => {
  const item = specialty()
  expect(hospitalShare(item, 1_200)).toBe(40)
  expect(regionalShare(item)).toBe(60)
  expect(hospitalShare(item, 0)).toBeNull()
  expect(regionalShare(specialty({ new_admissions: 0, benchmark_admissions: 0 }))).toBeNull()
})

test('seleciona maior volume e usa código como desempate determinístico', () => {
  const selected = selectInitialSpecialty([
    specialty({ specialty_code: '09', new_admissions: 20 }),
    specialty({ specialty_code: '02', new_admissions: 30 }),
    specialty({ specialty_code: '01', new_admissions: 30 }),
  ])
  expect(selected?.specialty_code).toBe('01')
  expect(selectInitialSpecialty([])).toBeNull()
})

test('identifica troca de contexto remoto e resumo local obsoleto', () => {
  const base = {
    route: 'hospital',
    competence: '2026-06',
    regionCode: '35073',
    hospitalCnes: '3012212',
    specialtyCode: '07',
  }
  expect(assistantContextKey(base)).not.toBe(
    assistantContextKey({ ...base, competence: '2026-05' }),
  )
  expect(assistantContextKey(base)).not.toBe(
    assistantContextKey({ ...base, regionCode: '35071' }),
  )
  expect(assistantContextKey(base)).not.toBe(
    assistantContextKey({ ...base, hospitalCnes: '2786435' }),
  )
  expect(assistantContextKey(base)).not.toBe(
    assistantContextKey({ ...base, route: 'regional' }),
  )
  expect(assistantContextKey(base)).not.toBe(
    assistantContextKey({ ...base, specialtyCode: '02' }),
  )

  const summary = { cnes: '3012212', competence: '2026-06', specialtyCode: '07' }
  expect(isCurrentSpecialtySummary(summary, { ...summary })).toBe(true)
  expect(isCurrentSpecialtySummary(summary, { ...summary, cnes: '2786435' })).toBe(false)
  expect(isCurrentSpecialtySummary(summary, { ...summary, competence: '2026-05' })).toBe(false)
  expect(isCurrentSpecialtySummary(summary, { ...summary, specialtyCode: '02' })).toBe(false)
  expect(isCurrentSpecialtySummary(summary, null)).toBe(false)
})

test('trata ausência de internação, média, amostra e referência como estados, não zero', () => {
  expect(
    comparisonAbsence(
      specialty({
        new_admissions: 0,
        average_stay_days: null,
        benchmark_hospitals: 0,
        average_stay_benchmark: null,
        ipe_sample_status: 'amostra_insuficiente',
      }),
    ),
  ).toContain('Sem internação nova')
  expect(comparisonAbsence(specialty({ average_stay_days: null }))).toContain(
    'não foi calculada',
  )
  expect(
    comparisonAbsence(
      specialty({ ipe_sample_status: 'amostra_insuficiente' }),
    ),
  ).toContain('Amostra insuficiente')
  expect(
    comparisonAbsence(
      specialty({
        ipe_sample_status: 'benchmark_zero',
        average_stay_benchmark: 0,
      }),
    ),
  ).toContain('não têm permanência registrada')
  expect(isComparableStay('suficiente', 5.1, 3.1, 7)).toBe(true)
  expect(isComparableStay('amostra_insuficiente', 5.1, 3.1, 7)).toBe(false)
  expect(isComparableStay('benchmark_zero', 5.1, 3.1, 7)).toBe(false)
  expect(isComparableStay('suficiente', 5.1, 0, 7)).toBe(false)
  expect(isComparableStay('suficiente', 5.1, 3.1, 0)).toBe(false)
})

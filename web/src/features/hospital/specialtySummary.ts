import type { HospitalSpecialtySummary } from '../../shared/SourceContext'
import type { SpecialtyItem } from './hospitalEspecialidades'

export const SUMMARY_QUESTIONS = [
  'Qual é o papel deste hospital no atendimento da região?',
  'O que preciso verificar antes de interpretar essa permanência?',
  'Que informações faltam para avaliar uma mudança na rede?',
] as const

export type SummaryQuestion = (typeof SUMMARY_QUESTIONS)[number]

/** A primeira linha do resumo é volume, com código como desempate estável. */
export function selectInitialSpecialty(items: readonly SpecialtyItem[]): SpecialtyItem | null {
  return items.reduce<SpecialtyItem | null>((selected, candidate) => {
    if (!selected) return candidate
    if (candidate.new_admissions !== selected.new_admissions) {
      return candidate.new_admissions > selected.new_admissions ? candidate : selected
    }
    return candidate.specialty_code.localeCompare(selected.specialty_code) < 0
      ? candidate
      : selected
  }, null)
}

/** O denominador publicado já exclui este hospital do benchmark. */
export function regionalShare(
  item: Pick<SpecialtyItem, 'new_admissions' | 'benchmark_admissions'>,
): number | null {
  const total = item.new_admissions + item.benchmark_admissions
  return total > 0 ? (item.new_admissions / total) * 100 : null
}

/**
 * Explica por que a comparação de permanência não deve ser exibida.
 * Ausência é um estado do contrato, não zero, posição ou conclusão.
 */
export function comparisonAbsence(item: SpecialtyItem): string | null {
  if (item.new_admissions === 0) {
    return 'Sem internação nova: não há permanência local para comparar.'
  }
  if (item.average_stay_days === null) {
    return 'A permanência local não foi calculada nesta linha; não há comparação publicada.'
  }
  if (item.ipe_sample_status === 'amostra_insuficiente') {
    return 'Amostra insuficiente para comparar a permanência; não há posição ou conclusão.'
  }
  if (item.ipe_sample_status === 'benchmark_zero') {
    return 'Os demais hospitais não têm permanência registrada para formar a referência.'
  }
  if (item.benchmark_hospitals === 0 || item.average_stay_benchmark === null) {
    return 'Não há referência de permanência publicada nos demais hospitais.'
  }
  return null
}

export function toHospitalSpecialtySummary(
  item: SpecialtyItem,
  hospitalName: string,
  competence: string,
): HospitalSpecialtySummary {
  return {
    cnes: item.cnes,
    hospitalName,
    specialtyCode: item.specialty_code,
    specialtyName: item.specialty_name,
    competence,
    newAdmissions: item.new_admissions,
    benchmarkAdmissions: item.benchmark_admissions,
    regionalSharePercent: regionalShare(item),
    averageStayDays: item.average_stay_days,
    averageStayBenchmark: item.average_stay_benchmark,
    benchmarkHospitals: item.benchmark_hospitals,
    sampleStatus: item.sample_status,
    ipeSampleStatus: item.ipe_sample_status,
  }
}

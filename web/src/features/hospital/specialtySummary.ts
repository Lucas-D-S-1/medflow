import type { HospitalSpecialtySummary } from '../../shared/SourceContext'
import type { SpecialtyItem } from './hospitalEspecialidades'
import { hospitalShare, regionalShare } from './specialtyMetrics'
export {
  comparisonAbsence,
  hospitalShare,
  isComparableStay,
  regionalShare,
  selectInitialSpecialty,
} from './specialtyMetrics'

export const SUMMARY_QUESTIONS = [
  'Como interpretar?',
  'O que verificar?',
] as const

export type SummaryQuestion = (typeof SUMMARY_QUESTIONS)[number]

export function toHospitalSpecialtySummary(
  item: SpecialtyItem,
  hospitalName: string,
  competence: string,
  publishedSpecialtyAdmissions: number,
  hospitalAdmissionsTotal: number,
): HospitalSpecialtySummary {
  const completeCoverage = publishedSpecialtyAdmissions === hospitalAdmissionsTotal
  return {
    cnes: item.cnes,
    hospitalName,
    specialtyCode: item.specialty_code,
    specialtyName: item.specialty_name,
    competence,
    newAdmissions: item.new_admissions,
    hospitalSharePercent: hospitalShare(item, publishedSpecialtyAdmissions),
    hospitalSpecialtyAdmissionsTotal: publishedSpecialtyAdmissions,
    hospitalShareCoverage: completeCoverage ? 'complete' : 'available-specialties',
    benchmarkAdmissions: item.benchmark_admissions,
    regionalSharePercent: regionalShare(item),
    averageStayDays: item.average_stay_days,
    averageStayBenchmark: item.average_stay_benchmark,
    benchmarkHospitals: item.benchmark_hospitals,
    sampleStatus: item.sample_status,
    ipeSampleStatus: item.ipe_sample_status,
  }
}

export type SpecialtyMetricItem = {
  specialty_code: string
  new_admissions: number
  benchmark_admissions: number
  benchmark_hospitals: number
  average_stay_days: number | null
  average_stay_benchmark: number | null
  ipe_sample_status: 'suficiente' | 'amostra_insuficiente' | 'benchmark_zero'
}

/** A primeira linha do resumo é volume, com código como desempate estável. */
export function selectInitialSpecialty<T extends SpecialtyMetricItem>(
  items: readonly T[],
): T | null {
  return items.reduce<T | null>((selected, candidate) => {
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
  item: Pick<SpecialtyMetricItem, 'new_admissions' | 'benchmark_admissions'>,
): number | null {
  const total = item.new_admissions + item.benchmark_admissions
  return total > 0 ? (item.new_admissions / total) * 100 : null
}

export function hospitalShare(
  item: Pick<SpecialtyMetricItem, 'new_admissions'>,
  publishedSpecialtyAdmissions: number,
): number | null {
  return publishedSpecialtyAdmissions > 0
    ? (item.new_admissions / publishedSpecialtyAdmissions) * 100
    : null
}

/** A narrativa comparativa so existe quando o estado do contrato a autoriza. */
export function isComparableStay(
  ipeSampleStatus: SpecialtyMetricItem['ipe_sample_status'],
  averageStayDays: number | null,
  averageStayBenchmark: number | null,
  benchmarkHospitals: number,
): boolean {
  return ipeSampleStatus === 'suficiente' &&
    typeof averageStayDays === 'number' &&
    Number.isFinite(averageStayDays) &&
    averageStayDays >= 0 &&
    typeof averageStayBenchmark === 'number' &&
    Number.isFinite(averageStayBenchmark) &&
    averageStayBenchmark > 0 &&
    Number.isInteger(benchmarkHospitals) &&
    benchmarkHospitals > 0
}

/** Ausência é um estado do contrato, não zero, posição ou conclusão. */
export function comparisonAbsence(item: SpecialtyMetricItem): string | null {
  if (item.new_admissions === 0) {
    return 'Sem internação nova: não há permanência local para comparar.'
  }
  if (
    item.average_stay_days === null ||
    !Number.isFinite(item.average_stay_days) ||
    item.average_stay_days < 0
  ) {
    return 'A permanência local não foi calculada nesta linha; não há comparação publicada.'
  }
  if (item.ipe_sample_status === 'amostra_insuficiente') {
    return 'Amostra insuficiente para comparar a permanência; não há posição ou conclusão.'
  }
  if (item.ipe_sample_status === 'benchmark_zero') {
    return 'Os demais hospitais não têm permanência registrada para formar a referência.'
  }
  if (!isComparableStay(
    item.ipe_sample_status,
    item.average_stay_days,
    item.average_stay_benchmark,
    item.benchmark_hospitals,
  )) {
    return 'Não há referência de permanência publicada nos demais hospitais.'
  }
  return null
}

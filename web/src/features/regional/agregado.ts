import type { RegionalSummaryItem } from '../../lib/api/regioes'

/**
 * Totais do recorte inteiro, para o panorama sem território escolhido.
 *
 * **Toda razão aqui é total sobre total, nunca média de médias.** Somar os
 * `iph_percent` das 62 regiões e dividir por 62 daria um número diferente e
 * errado: cada região tem porte diferente, e a média simples trataria uma
 * região de 4 mil internações como igual a uma de 80 mil. O resumo publica
 * numerador e denominador de cada indicador justamente para que a agregação
 * seja exata, e é deles que estes totais saem.
 *
 * Nada é estimado: se a Gold reconcilia por região, isto reconcilia por
 * construção. Ainda assim, o lugar durável destes números é a própria Gold —
 * enquanto o contrato não publicar o agregado estadual, ele é montado aqui a
 * partir dos componentes publicados.
 */
export type RegionalAggregate = {
  regions: number
  municipalities: number
  population: number
  newAdmissions: number
  hospitalsWithAdmissions: number
  iphPercent: number | null
  tmhPercent: number | null
  averageStayDays: number | null
  cmiNominal: number | null
  residentAdmissions: number
  ownRegionPercent: number | null
  evasionPercent: number | null
  receivedFromOtherRegions: number
  receivedFromOtherStates: number
  icsapAdmissions: number
  icsapSharePercent: number | null
  icsapRatePer10k: number | null
  seasonalDeviation: number | null
  seasonalRegionsCompared: number
  ipeEligiblePairs: number
  ipeAboveReference: number
  ipeAbovePercent: number | null
}

function sum(items: RegionalSummaryItem[], pick: (item: RegionalSummaryItem) => number) {
  return items.reduce((total, item) => total + pick(item), 0)
}

/** Divide só quando o denominador existe: zero não vira 0%, vira "sem base". */
function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null
}

export function aggregateRegions(items: RegionalSummaryItem[]): RegionalAggregate {
  const newAdmissions = sum(items, (item) => item.new_admissions)
  const patientDays = sum(items, (item) => item.estimated_patient_days)
  const capacityBedDays = sum(items, (item) => item.declared_capacity_bed_days)
  const deaths = sum(items, (item) => item.deaths)
  const stayDays = sum(items, (item) => item.stay_days)
  const approvedAmount = sum(items, (item) => item.approved_amount_nominal)
  const residentAdmissions = sum(items, (item) => item.resident_admissions_observed)
  const ownRegion = sum(items, (item) => item.resident_admissions_in_own_region)
  const evasion = sum(items, (item) => item.observed_intrastate_evasion_admissions)
  const icsapAdmissions = sum(items, (item) => item.icsap_resident_admissions_observed)
  const population = sum(items, (item) => item.population)

  // A sazonalidade estadual compara o total do mês com o total das médias
  // históricas do mesmo mês — e só entre as regiões que têm comparação
  // calculada, para não misturar quem tem histórico com quem não tem.
  const comparable = items.filter((item) => item.seasonality_status === 'calculado')
  const comparableAdmissions = sum(comparable, (item) => item.new_admissions)
  const comparableHistory = sum(comparable, (item) => item.historical_admissions_average)
  const seasonalRatio = ratio(comparableAdmissions, comparableHistory)

  const iph = ratio(patientDays, capacityBedDays)
  const tmh = ratio(deaths, newAdmissions)
  const stay = ratio(stayDays, newAdmissions)
  const cmi = ratio(approvedAmount, newAdmissions)
  const ownShare = ratio(ownRegion, residentAdmissions)
  const evasionShare = ratio(evasion, residentAdmissions)
  const icsapShare = ratio(icsapAdmissions, residentAdmissions)
  const icsapRate = ratio(icsapAdmissions, population)

  // O IPE agrega por contagem, não por média de medianas: somar as combinações
  // elegíveis e as que ficam acima de 1 responde "em que fração das
  // comparações possíveis a permanência excede a dos pares". Uma média das
  // medianas regionais daria peso igual a uma região com 4 comparações e a
  // outra com 243.
  const ipeEligiblePairs = sum(items, (item) => item.ipe_eligible_pairs)
  const ipeAboveReference = sum(items, (item) => item.ipe_above_reference)
  const ipeAbove = ratio(ipeAboveReference, ipeEligiblePairs)

  return {
    regions: items.length,
    municipalities: sum(items, (item) => item.municipality_count),
    population,
    newAdmissions,
    hospitalsWithAdmissions: sum(items, (item) => item.hospitals_with_admissions),
    iphPercent: iph === null ? null : iph * 100,
    tmhPercent: tmh === null ? null : tmh * 100,
    averageStayDays: stay,
    cmiNominal: cmi,
    residentAdmissions,
    ownRegionPercent: ownShare === null ? null : ownShare * 100,
    evasionPercent: evasionShare === null ? null : evasionShare * 100,
    receivedFromOtherRegions: sum(items, (item) => item.admissions_received_from_other_sp_regions),
    receivedFromOtherStates: sum(items, (item) => item.admissions_received_from_other_states),
    icsapAdmissions,
    icsapSharePercent: icsapShare === null ? null : icsapShare * 100,
    icsapRatePer10k: icsapRate === null ? null : icsapRate * 10_000,
    seasonalDeviation: seasonalRatio === null ? null : seasonalRatio - 1,
    seasonalRegionsCompared: comparable.length,
    ipeEligiblePairs,
    ipeAboveReference,
    ipeAbovePercent: ipeAbove === null ? null : ipeAbove * 100,
  }
}

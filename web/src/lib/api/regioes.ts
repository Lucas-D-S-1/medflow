import regionalSnapshot from '../../mocks/regioes-resumo.json'
import { apiUrl } from './base'

export const REGIONAL_CONTRACT_VERSION = '0.5.0' as const

type PublishedSource = 'oracle-live' | 'snapshot'

export type RegionalSummaryItem = {
  region_code: string
  region_name: string
  macroregion_code: string
  macroregion_name: string
  municipality_count: number
  new_admissions: number
  deaths: number
  stay_days: number
  approved_amount_nominal: number
  hospitals_with_admissions: number
  estimated_patient_days: number
  declared_sus_beds: number
  declared_capacity_bed_days: number
  population: number
  resident_admissions_observed: number
  resident_admissions_in_own_region: number
  observed_intrastate_evasion_admissions: number
  icsap_resident_admissions_observed: number
  admissions_received_from_other_sp_regions: number
  admissions_received_from_other_states: number
  resident_admission_rate_per_100k: number
  observed_evasion_percent: number
  attraction_percent: number
  icsap_share_of_observed_resident_admissions_percent: number
  icsap_rate_per_10k: number
  tmh_percent: number
  cmi_nominal: number
  average_stay_days: number
  iph_ratio: number
  iph_percent: number
  historical_admissions_average: number
  historical_years: number
  seasonality_index: number | null
  seasonal_variation_percent: number | null
  seasonality_status: 'calculado' | 'fora_periodo_alvo' | 'historico_insuficiente'
  ipca_index: number
  ipca_factor: number
  price_reference_competence: string
  approved_amount_real: number
  cmi_real: number
  /**
   * Resumo do IPE da região: mediana e quantas combinações
   * hospital-especialidade ficam acima da permanência dos pares. Nulo quando
   * nenhuma é elegível — que não é o mesmo que estar em dia com os pares.
   */
  ipe_median: number | null
  ipe_eligible_pairs: number
  ipe_above_reference: number
  ipe_above_reference_percent: number | null
}

export type RegionalSummaryResponse = {
  status: 'ok'
  source: PublishedSource
  database_time: string
  contract_version: typeof REGIONAL_CONTRACT_VERSION
  data_through: string
  filters: {
    year: number
    month: number
    macroregion_code: string | null
    region_code: string | null
  }
  pagination: {
    limit: number
    offset: number
    has_more: boolean
    count: number
  }
  items: RegionalSummaryItem[]
}

const REGIONAL_PATH = apiUrl('/regioes/resumo')
const DATA_THROUGH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const DATABASE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const ITEM_STRING_FIELDS = [
  'region_code',
  'region_name',
  'macroregion_code',
  'macroregion_name',
  'price_reference_competence',
] as const
const ITEM_INTEGER_FIELDS = [
  'municipality_count',
  'new_admissions',
  'deaths',
  'stay_days',
  'hospitals_with_admissions',
  'estimated_patient_days',
  'declared_sus_beds',
  'declared_capacity_bed_days',
  'population',
  'resident_admissions_observed',
  'resident_admissions_in_own_region',
  'observed_intrastate_evasion_admissions',
  'icsap_resident_admissions_observed',
  'admissions_received_from_other_sp_regions',
  'admissions_received_from_other_states',
  'historical_years',
  'ipe_eligible_pairs',
  'ipe_above_reference',
] as const
const ITEM_NUMBER_FIELDS = [
  'approved_amount_nominal',
  'resident_admission_rate_per_100k',
  'observed_evasion_percent',
  'attraction_percent',
  'icsap_share_of_observed_resident_admissions_percent',
  'icsap_rate_per_10k',
  'tmh_percent',
  'cmi_nominal',
  'average_stay_days',
  'iph_ratio',
  'iph_percent',
  'historical_admissions_average',
  'ipca_index',
  'ipca_factor',
  'approved_amount_real',
  'cmi_real',
] as const

export class RegionalContractError extends Error {
  constructor() {
    super('contrato de resumo regional inválido')
    this.name = 'RegionalContractError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidDatabaseTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    DATABASE_TIME_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}

function isValidItem(value: unknown): value is RegionalSummaryItem {
  if (!isRecord(value)) return false

  return (
    ITEM_STRING_FIELDS.every(
      (key) => typeof value[key] === 'string' && value[key].length > 0,
    ) &&
    ITEM_INTEGER_FIELDS.every((key) => isNonNegativeInteger(value[key])) &&
    ITEM_NUMBER_FIELDS.every((key) => isFiniteNumber(value[key])) &&
    (value.ipe_median === null || isFiniteNumber(value.ipe_median)) &&
    (value.ipe_above_reference_percent === null ||
      isFiniteNumber(value.ipe_above_reference_percent)) &&
    // Mediana e percentual são nulos exatamente quando nada é elegível: um
    // deles preenchido sem o outro seria resumo de conjunto vazio.
    (value.ipe_median === null) === (value.ipe_eligible_pairs === 0) &&
    (value.ipe_above_reference_percent === null) === (value.ipe_eligible_pairs === 0) &&
    (value.seasonality_index === null || isFiniteNumber(value.seasonality_index)) &&
    (value.seasonal_variation_percent === null ||
      isFiniteNumber(value.seasonal_variation_percent)) &&
    (value.seasonality_status === 'calculado' ||
      value.seasonality_status === 'fora_periodo_alvo' ||
      value.seasonality_status === 'historico_insuficiente')
  )
}

function isValidResponse(
  value: unknown,
  expectedSource: PublishedSource,
  expectedRequest?: { year: number; month: number; limit: number; offset: number },
): value is RegionalSummaryResponse {
  if (
    !isRecord(value) ||
    !isRecord(value.filters) ||
    !isRecord(value.pagination) ||
    !Array.isArray(value.items)
  ) {
    return false
  }

  const filters = value.filters
  const pagination = value.pagination
  const expectedDataThrough = `${filters.year}-${String(filters.month).padStart(2, '0')}`
  return (
    value.status === 'ok' &&
    value.source === expectedSource &&
    isValidDatabaseTime(value.database_time) &&
    typeof value.data_through === 'string' &&
    DATA_THROUGH_PATTERN.test(value.data_through) &&
    value.data_through === expectedDataThrough &&
    value.contract_version === REGIONAL_CONTRACT_VERSION &&
    isNonNegativeInteger(filters.year) &&
    isNonNegativeInteger(filters.month) &&
    filters.month >= 1 &&
    filters.month <= 12 &&
    (filters.macroregion_code === null || typeof filters.macroregion_code === 'string') &&
    (filters.region_code === null || typeof filters.region_code === 'string') &&
    isNonNegativeInteger(pagination.limit) &&
    pagination.limit >= 1 &&
    pagination.limit <= 200 &&
    isNonNegativeInteger(pagination.offset) &&
    typeof pagination.has_more === 'boolean' &&
    isNonNegativeInteger(pagination.count) &&
    value.items.length <= pagination.limit &&
    pagination.has_more === pagination.offset + value.items.length < pagination.count &&
    (!expectedRequest ||
      (filters.year === expectedRequest.year &&
        filters.month === expectedRequest.month &&
        pagination.limit === expectedRequest.limit &&
        pagination.offset === expectedRequest.offset)) &&
    value.items.every(isValidItem)
  )
}

type FetchRegionalOptions = {
  limit?: number
  offset?: number
  timeoutMs?: number
  signal?: AbortSignal
}

export async function fetchRegioesResumo(
  year?: number,
  month?: number,
  options: FetchRegionalOptions = {},
): Promise<RegionalSummaryResponse> {
  const limit = options.limit ?? 62
  const offset = options.offset ?? 0
  const timeoutMs = options.timeoutMs ?? 3_000
  const params = new URLSearchParams()
  if (year !== undefined) params.set('ano', String(year))
  if (month !== undefined) params.set('mes', String(month))
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  const query = params.toString()
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  options.signal?.addEventListener('abort', abortFromCaller, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(query ? `${REGIONAL_PATH}?${query}` : REGIONAL_PATH, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`resumo regional HTTP ${response.status}`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new RegionalContractError()
    }

    if (
      !isValidResponse(payload, 'oracle-live', {
        year: year!,
        month: month!,
        limit,
        offset,
      })
    ) {
      throw new RegionalContractError()
    }
    return payload
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

export function getRegioesResumoSnapshot(): RegionalSummaryResponse {
  if (!isValidResponse(regionalSnapshot, 'snapshot')) {
    throw new Error('fixture de resumo regional inválida')
  }
  return regionalSnapshot
}

import regionSeriesSnapshot from '../../mocks/regiao-serie-35073.json'
import { apiUrl } from '../../lib/api/base'

export const REGIONAL_SERIES_CONTRACT_VERSION = '0.3.0' as const

type PublishedSource = 'oracle-live' | 'snapshot'

export type RegionalSeriesItem = {
  competence: string
  year: number
  month: number
  new_admissions: number
  deaths: number
  stay_days: number
  approved_amount_nominal: number
  hospitals_with_admissions: number
  estimated_patient_days: number
  declared_sus_beds: number
  declared_capacity_bed_days: number
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
  price_reference_competence: string
  approved_amount_real: number
  cmi_real: number
}

export type RegionalSeriesResponse = {
  status: 'ok'
  source: PublishedSource
  database_time: string
  contract_version: typeof REGIONAL_SERIES_CONTRACT_VERSION
  data_through: string | null
  region: {
    region_code: string
    region_name: string | null
    macroregion_code: string | null
    macroregion_name: string | null
  }
  filters: { region_code: string }
  pagination: {
    limit: number
    offset: number
    count: number
    has_more: boolean
    order: 'competence_desc'
  }
  items: RegionalSeriesItem[]
}

const REGION_CODE_PATTERN = /^\d{5}$/
const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const DATABASE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const INTEGER_FIELDS = [
  'year',
  'month',
  'new_admissions',
  'deaths',
  'stay_days',
  'hospitals_with_admissions',
  'estimated_patient_days',
  'declared_sus_beds',
  'declared_capacity_bed_days',
  'historical_years',
] as const
const NUMBER_FIELDS = [
  'approved_amount_nominal',
  'tmh_percent',
  'cmi_nominal',
  'average_stay_days',
  'iph_ratio',
  'iph_percent',
  'historical_admissions_average',
  'approved_amount_real',
  'cmi_real',
] as const

export class RegionalSeriesContractError extends Error {
  constructor() {
    super('contrato de série regional inválido')
    this.name = 'RegionalSeriesContractError'
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

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isValidItem(value: unknown): value is RegionalSeriesItem {
  if (!isRecord(value)) return false
  const match = typeof value.competence === 'string'
    ? COMPETENCE_PATTERN.exec(value.competence)
    : null

  return Boolean(
    match &&
      INTEGER_FIELDS.every((key) => isNonNegativeInteger(value[key])) &&
      NUMBER_FIELDS.every((key) => isFiniteNumber(value[key])) &&
      value.year === Number(match[1]) &&
      value.month === Number(match[2]) &&
      (value.seasonality_index === null || isFiniteNumber(value.seasonality_index)) &&
      (value.seasonal_variation_percent === null ||
        isFiniteNumber(value.seasonal_variation_percent)) &&
      (value.seasonality_status === 'calculado' ||
        value.seasonality_status === 'fora_periodo_alvo' ||
        value.seasonality_status === 'historico_insuficiente') &&
      typeof value.price_reference_competence === 'string',
  )
}

function isValidResponse(
  value: unknown,
  expectedSource: PublishedSource,
  expected?: { regionCode: string; limit: number; offset: number },
): value is RegionalSeriesResponse {
  if (
    !isRecord(value) ||
    !isRecord(value.region) ||
    !isRecord(value.filters) ||
    !isRecord(value.pagination) ||
    !Array.isArray(value.items)
  ) {
    return false
  }

  const { region, filters, pagination, items } = value
  const competencies = items
    .filter(isRecord)
    .map((item) => item.competence)
    .filter((competence): competence is string => typeof competence === 'string')

  return (
    value.status === 'ok' &&
    value.source === expectedSource &&
    typeof value.database_time === 'string' &&
    DATABASE_TIME_PATTERN.test(value.database_time) &&
    Number.isFinite(Date.parse(value.database_time)) &&
    value.contract_version === REGIONAL_SERIES_CONTRACT_VERSION &&
    (value.data_through === null ||
      (typeof value.data_through === 'string' &&
        COMPETENCE_PATTERN.test(value.data_through) &&
        (competencies.length === 0 || value.data_through >= competencies[0]))) &&
    typeof region.region_code === 'string' &&
    REGION_CODE_PATTERN.test(region.region_code) &&
    isNullableString(region.region_name) &&
    isNullableString(region.macroregion_code) &&
    isNullableString(region.macroregion_name) &&
    filters.region_code === region.region_code &&
    isNonNegativeInteger(pagination.limit) &&
    pagination.limit >= 1 &&
    pagination.limit <= 120 &&
    isNonNegativeInteger(pagination.offset) &&
    isNonNegativeInteger(pagination.count) &&
    typeof pagination.has_more === 'boolean' &&
    pagination.order === 'competence_desc' &&
    items.length <= pagination.limit &&
    pagination.has_more === pagination.offset + items.length < pagination.count &&
    items.every(isValidItem) &&
    competencies.every(
      (competence, index) => index === 0 || competencies[index - 1] > competence,
    ) &&
    (!expected ||
      (region.region_code === expected.regionCode &&
        pagination.limit === expected.limit &&
        pagination.offset === expected.offset))
  )
}

type FetchSeriesOptions = {
  limit?: number
  offset?: number
  timeoutMs?: number
  signal?: AbortSignal
}

export async function fetchRegiaoSerie(
  regionCode: string,
  options: FetchSeriesOptions = {},
): Promise<RegionalSeriesResponse> {
  if (!REGION_CODE_PATTERN.test(regionCode)) throw new RegionalSeriesContractError()
  const limit = options.limit ?? 100
  const offset = options.offset ?? 0
  const timeoutMs = options.timeoutMs ?? 3_000
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  options.signal?.addEventListener('abort', abortFromCaller, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(
      apiUrl(`/regioes/${regionCode}/serie?${params.toString()}`),
      { headers: { Accept: 'application/json' }, signal: controller.signal },
    )
    if (!response.ok) throw new Error(`série regional HTTP ${response.status}`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new RegionalSeriesContractError()
    }

    if (!isValidResponse(payload, 'oracle-live', { regionCode, limit, offset })) {
      throw new RegionalSeriesContractError()
    }
    return payload
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

export function getRegiaoSerieSnapshot(regionCode: string) {
  if (!isValidResponse(regionSeriesSnapshot, 'snapshot')) {
    throw new Error('fixture de série regional inválida')
  }
  return regionSeriesSnapshot.region.region_code === regionCode
    ? regionSeriesSnapshot
    : null
}

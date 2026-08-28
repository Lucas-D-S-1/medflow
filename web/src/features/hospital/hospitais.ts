import hospitalSnapshot from '../../mocks/hospitais-35073.json'
import { apiUrl } from '../../lib/api/base'

export const HOSPITAL_CONTRACT_VERSION = '0.4.0' as const

type PublishedSource = 'oracle-live' | 'snapshot'

export type SampleStatus = 'suficiente' | 'amostra_insuficiente'
export type CapacityStatus = 'disponivel' | 'sem_leito_sus_declarado'

/**
 * `suficiente` é o único estado em que um índice comparativo existe. Os outros
 * dois são motivos distintos e precisam ser ditos com palavras diferentes na
 * tela:
 * - `amostra_insuficiente`: não há casos bastantes no hospital e/ou nos pares.
 *   O benchmark pode nem existir (nenhum hospital par, média nula).
 * - `benchmark_zero`: existem pares, mas a permanência média deles é zero,
 *   então a razão seria divisão por zero. Não é "sem par".
 *
 * IPR e IPE compartilham este vocabulário porque são a mesma construção em
 * graos diferentes; separá-los daria dois nomes para o mesmo estado.
 */
export type ComparisonSampleStatus = SampleStatus | 'benchmark_zero'

export type HospitalItem = {
  cnes: string
  hospital_name: string
  unit_type_code: string
  unit_type_name: string
  municipality_code: string
  region_code: string
  district_code?: string | null
  subprefecture_code?: string | null
  health_coordinator_code?: string | null
  health_technical_supervision_code?: string | null
  neighborhood?: string | null
  territory_assignment_method?: string | null
  territory_assignment_ambiguous?: 0 | 1 | null
  sus_beds: number
  new_admissions: number
  deaths: number
  patient_days_estimated: number
  declared_bed_days: number
  // Indicadores derivados são nulos quando o denominador não existe: sem leito
  // SUS declarado não há IPH, sem internação não há TMH, CMI nem permanência.
  // Nulo aqui é informação publicada, não campo faltando.
  iph_percent: number | null
  tmh_percent: number | null
  cmi_real: number | null
  average_stay_days: number | null
  sample_status: SampleStatus
  capacity_status: CapacityStatus
  above_declared_capacity: number
}

export type HospitalRegion = {
  region_code: string
  region_name: string
  macroregion_code: string
  macroregion_name: string
}

export type HospitalListResponse = {
  status: 'ok'
  source: PublishedSource
  database_time: string
  contract_version: typeof HOSPITAL_CONTRACT_VERSION
  data_through: string
  filters: {
    year: number
    month: number
    region_code: string
  }
  region: HospitalRegion
  pagination: {
    limit: number
    offset: number
    count: number
    has_more: boolean
    order: 'new_admissions_desc'
  }
  items: HospitalItem[]
}

type HospitalListRequest = {
  year: number
  month: number
  regionCode: string
  search?: string
}

type FetchOptions = {
  limit?: number
  offset?: number
  timeoutMs?: number
  signal?: AbortSignal
}

export const REGION_CODE_PATTERN = /^\d{5}$/
export const CNES_PATTERN = /^\d{7}$/
const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const DATABASE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

const REGION_TEXT_FIELDS = [
  'region_name',
  'macroregion_code',
  'macroregion_name',
] as const

export class HospitalContractError extends Error {
  constructor() {
    super('contrato de hospitais inválido')
    this.name = 'HospitalContractError'
  }
}

export class HospitalAbsentCompetenceError extends Error {
  constructor() {
    super('competência sem hospitais publicados')
    this.name = 'HospitalAbsentCompetenceError'
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

export function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function isSampleStatus(value: unknown): value is SampleStatus {
  return value === 'suficiente' || value === 'amostra_insuficiente'
}

export function isComparisonSampleStatus(value: unknown): value is ComparisonSampleStatus {
  return isSampleStatus(value) || value === 'benchmark_zero'
}

type BlockKind = 'complete' | 'absent' | 'invalid'

function regionKind(value: unknown): BlockKind {
  if (!isRecord(value)) return 'invalid'
  if (
    typeof value.region_code !== 'string' ||
    !REGION_CODE_PATTERN.test(value.region_code)
  ) {
    return 'invalid'
  }
  if (REGION_TEXT_FIELDS.every((key) => value[key] === null)) return 'absent'
  return REGION_TEXT_FIELDS.every((key) => isNonEmptyText(value[key]))
    ? 'complete'
    : 'invalid'
}

function isValidItem(value: unknown): value is HospitalItem {
  if (!isRecord(value)) return false
  const territoryFieldsValid = [
    'district_code',
    'subprefecture_code',
    'health_coordinator_code',
    'health_technical_supervision_code',
    'neighborhood',
    'territory_assignment_method',
  ].every((key) => value[key] === undefined || value[key] === null || isNonEmptyText(value[key]))
  return (
    typeof value.cnes === 'string' &&
    CNES_PATTERN.test(value.cnes) &&
    isNonEmptyText(value.hospital_name) &&
    isNonEmptyText(value.unit_type_code) &&
    isNonEmptyText(value.unit_type_name) &&
    isNonEmptyText(value.municipality_code) &&
    typeof value.region_code === 'string' &&
    REGION_CODE_PATTERN.test(value.region_code) &&
    territoryFieldsValid &&
    (value.territory_assignment_ambiguous === undefined ||
      value.territory_assignment_ambiguous === null ||
      value.territory_assignment_ambiguous === 0 ||
      value.territory_assignment_ambiguous === 1) &&
    isNonNegativeInteger(value.sus_beds) &&
    isNonNegativeInteger(value.new_admissions) &&
    isNonNegativeInteger(value.deaths) &&
    isNonNegativeInteger(value.patient_days_estimated) &&
    isNonNegativeInteger(value.declared_bed_days) &&
    isNullableNumber(value.iph_percent) &&
    isNullableNumber(value.tmh_percent) &&
    isNullableNumber(value.cmi_real) &&
    isNullableNumber(value.average_stay_days) &&
    isSampleStatus(value.sample_status) &&
    (value.capacity_status === 'disponivel' ||
      value.capacity_status === 'sem_leito_sus_declarado') &&
    (value.above_declared_capacity === 0 || value.above_declared_capacity === 1) &&
    // Sem leito SUS declarado não existe denominador de IPH. Publicar um número
    // aqui seria inventar ocupação.
    (value.capacity_status !== 'sem_leito_sus_declarado' || value.iph_percent === null)
  )
}

function isValidEnvelope(
  value: Record<string, unknown>,
  expectedSource: PublishedSource,
  expected?: HospitalListRequest & { limit: number; offset: number },
): boolean {
  if (
    !isRecord(value.filters) ||
    !isRecord(value.pagination) ||
    !isRecord(value.region) ||
    !Array.isArray(value.items)
  ) {
    return false
  }

  const { filters, pagination, items, region } = value
  const competence = `${filters.year}-${String(filters.month).padStart(2, '0')}`
  return (
    value.status === 'ok' &&
    value.source === expectedSource &&
    typeof value.database_time === 'string' &&
    DATABASE_TIME_PATTERN.test(value.database_time) &&
    Number.isFinite(Date.parse(value.database_time)) &&
    value.contract_version === HOSPITAL_CONTRACT_VERSION &&
    typeof value.data_through === 'string' &&
    COMPETENCE_PATTERN.test(value.data_through) &&
    value.data_through === competence &&
    isNonNegativeInteger(filters.year) &&
    isNonNegativeInteger(filters.month) &&
    filters.month >= 1 &&
    filters.month <= 12 &&
    typeof filters.region_code === 'string' &&
    REGION_CODE_PATTERN.test(filters.region_code) &&
    region.region_code === filters.region_code &&
    isNonNegativeInteger(pagination.limit) &&
    pagination.limit >= 1 &&
    pagination.limit <= 2000 &&
    isNonNegativeInteger(pagination.offset) &&
    isNonNegativeInteger(pagination.count) &&
    typeof pagination.has_more === 'boolean' &&
    pagination.order === 'new_admissions_desc' &&
    items.length <= pagination.limit &&
    pagination.has_more === (pagination.offset + items.length < pagination.count) &&
    items.every(isValidItem) &&
    items.every((item) => item.region_code === filters.region_code) &&
    items.every(
      (item, index) => index === 0 || items[index - 1].new_admissions >= item.new_admissions,
    ) &&
    new Set(items.map((item) => item.cnes)).size === items.length &&
    (!expected ||
      (filters.year === expected.year &&
        filters.month === expected.month &&
        filters.region_code === expected.regionCode &&
        pagination.limit === expected.limit &&
        pagination.offset === expected.offset))
  )
}

type ValidationResult =
  | { kind: 'valid'; data: HospitalListResponse }
  | { kind: 'absent' }
  | { kind: 'invalid' }

function validateResponse(
  value: unknown,
  expectedSource: PublishedSource,
  expected?: HospitalListRequest & { limit: number; offset: number },
): ValidationResult {
  if (!isRecord(value)) return { kind: 'invalid' }

  const regiao = regionKind(value.region)
  if (regiao === 'invalid') return { kind: 'invalid' }
  if (!isValidEnvelope(value, expectedSource, expected)) return { kind: 'invalid' }

  if (regiao === 'absent') {
    const { pagination, items } = value as {
      pagination: { count: number }
      items: unknown[]
    }
    return pagination.count === 0 && items.length === 0
      ? { kind: 'absent' }
      : { kind: 'invalid' }
  }

  return { kind: 'valid', data: value as unknown as HospitalListResponse }
}

export async function fetchHospitals(
  request: HospitalListRequest,
  options: FetchOptions = {},
): Promise<HospitalListResponse> {
  if (
    !Number.isInteger(request.year) ||
    !Number.isInteger(request.month) ||
    request.month < 1 ||
    request.month > 12 ||
    !REGION_CODE_PATTERN.test(request.regionCode)
  ) {
    throw new HospitalContractError()
  }

  const limit = options.limit ?? 200
  const offset = options.offset ?? 0
  const timeoutMs = options.timeoutMs ?? 3_000
  const params = new URLSearchParams({
    ano: String(request.year),
    mes: String(request.month),
    regiao: request.regionCode,
    limit: String(limit),
    offset: String(offset),
  })
  if (request.search !== undefined) {
    const search = request.search.trim()
    if (search.length < 2 || search.length > 120) {
      throw new HospitalContractError()
    }
    params.set('busca', search)
  }

  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  options.signal?.addEventListener('abort', abortFromCaller, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(apiUrl(`/hospitais?${params.toString()}`), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`hospitais HTTP ${response.status}`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new HospitalContractError()
    }

    const resultado = validateResponse(payload, 'oracle-live', {
      ...request,
      limit,
      offset,
    })
    if (resultado.kind === 'absent') throw new HospitalAbsentCompetenceError()
    if (resultado.kind === 'invalid') throw new HospitalContractError()
    return resultado.data
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

export function getHospitalListSnapshot() {
  const resultado = validateResponse(hospitalSnapshot, 'snapshot')
  if (resultado.kind !== 'valid') {
    throw new Error('fixture de hospitais inválida')
  }
  return resultado.data
}

import cidsSnapshot from '../../mocks/hospital-cids-3012212.json'
import {
  CNES_PATTERN,
  isFiniteNumber,
  isNonEmptyText,
  isNonNegativeInteger,
  isNullableNumber,
  isRecord,
  REGION_CODE_PATTERN,
  type ComparisonSampleStatus,
} from './hospitais'
import { apiUrl } from '../../lib/api/base'

export const CID_CONTRACT_VERSION = '0.5.0' as const

type PublishedSource = 'oracle-live' | 'snapshot'

/** O vocabulário é o mesmo do IPE; ver `ComparisonSampleStatus`. */
export type CidSampleStatus = ComparisonSampleStatus

export type CidItem = {
  cnes: string
  cid_code: string
  cid_description: string
  chapter_code: string
  chapter_description: string
  new_admissions: number
  stay_days_total: number
  benchmark_admissions: number
  benchmark_stay_days_total: number
  benchmark_hospitals: number
  average_stay_hospital: number
  // Nula exatamente quando não há hospital par (`benchmark_hospitals` zero).
  average_stay_benchmark: number | null
  ipr: number | null
  sample_status: CidSampleStatus
}

export type CidHospital = {
  cnes: string
  region_code: string
  region_name: string
  macroregion_code: string
  macroregion_name: string
  region_ipr_median: number
  region_eligible_combinations: number
  region_percent_above_reference: number
  hospital_eligible_combinations: number
}

export type CidResponse = {
  status: 'ok'
  source: PublishedSource
  database_time: string
  contract_version: typeof CID_CONTRACT_VERSION
  filters: { cnes: string; eligible_only: boolean }
  hospital: CidHospital
  pagination: {
    limit: number
    offset: number
    count: number
    has_more: boolean
    order: 'new_admissions_desc'
  }
  items: CidItem[]
}

type CidRequest = { cnes: string; eligibleOnly: boolean }
type FetchOptions = { limit?: number; offset?: number; timeoutMs?: number; signal?: AbortSignal }

const CID_CODE_PATTERN = /^[A-Z]\d{2,4}$/
const CHAPTER_PATTERN = /^[IVXLC]+$/
const DATABASE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

const HOSPITAL_TEXT_FIELDS = ['region_name', 'macroregion_code', 'macroregion_name'] as const
const HOSPITAL_NUMBER_FIELDS = [
  'region_ipr_median',
  'region_eligible_combinations',
  'region_percent_above_reference',
  'hospital_eligible_combinations',
] as const

export class CidContractError extends Error {
  constructor() {
    super('contrato de diagnósticos inválido')
    this.name = 'CidContractError'
  }
}

/** Hospital sem diagnóstico publicado no período. Não é falha. */
export class CidAbsentError extends Error {
  constructor() {
    super('hospital sem diagnósticos publicados')
    this.name = 'CidAbsentError'
  }
}

type BlockKind = 'complete' | 'absent' | 'invalid'

function hospitalKind(value: unknown): BlockKind {
  if (!isRecord(value)) return 'invalid'
  if (typeof value.cnes !== 'string' || !CNES_PATTERN.test(value.cnes)) return 'invalid'
  if (
    HOSPITAL_TEXT_FIELDS.every((key) => value[key] === null) &&
    HOSPITAL_NUMBER_FIELDS.every((key) => value[key] === null) &&
    value.region_code === null
  ) {
    return 'absent'
  }
  return HOSPITAL_TEXT_FIELDS.every((key) => isNonEmptyText(value[key])) &&
    typeof value.region_code === 'string' &&
    REGION_CODE_PATTERN.test(value.region_code) &&
    HOSPITAL_NUMBER_FIELDS.every((key) => isFiniteNumber(value[key]))
    ? 'complete'
    : 'invalid'
}

function isValidItem(value: unknown): value is CidItem {
  if (!isRecord(value)) return false
  const elegivel = value.sample_status === 'suficiente'
  return (
    typeof value.cnes === 'string' &&
    CNES_PATTERN.test(value.cnes) &&
    typeof value.cid_code === 'string' &&
    CID_CODE_PATTERN.test(value.cid_code) &&
    isNonEmptyText(value.cid_description) &&
    typeof value.chapter_code === 'string' &&
    CHAPTER_PATTERN.test(value.chapter_code) &&
    isNonEmptyText(value.chapter_description) &&
    isNonNegativeInteger(value.new_admissions) &&
    isNonNegativeInteger(value.stay_days_total) &&
    isNonNegativeInteger(value.benchmark_admissions) &&
    isNonNegativeInteger(value.benchmark_stay_days_total) &&
    isNonNegativeInteger(value.benchmark_hospitals) &&
    isFiniteNumber(value.average_stay_hospital) &&
    isNullableNumber(value.average_stay_benchmark) &&
    isNullableNumber(value.ipr) &&
    (value.sample_status === 'suficiente' ||
      value.sample_status === 'amostra_insuficiente' ||
      value.sample_status === 'benchmark_zero') &&
    // O IPR existe se, e somente se, a combinação é elegível. Um IPR publicado
    // fora disso seria comparação que a Gold não autorizou.
    (elegivel ? isFiniteNumber(value.ipr) : value.ipr === null) &&
    // A média do benchmark é nula exatamente quando não há hospital par.
    (value.average_stay_benchmark === null) === (value.benchmark_hospitals === 0) &&
    // Elegível exige par com permanência positiva; senão o IPR seria divisão
    // por zero, que é justamente o estado `benchmark_zero`.
    (!elegivel ||
      (isFiniteNumber(value.average_stay_benchmark) && value.average_stay_benchmark > 0)) &&
    (value.sample_status !== 'benchmark_zero' ||
      (value.average_stay_benchmark === 0 && value.benchmark_hospitals >= 1))
  )
}

function isValidEnvelope(
  value: Record<string, unknown>,
  expectedSource: PublishedSource,
  expected?: CidRequest & { limit: number; offset: number },
): boolean {
  if (
    !isRecord(value.filters) ||
    !isRecord(value.pagination) ||
    !isRecord(value.hospital) ||
    !Array.isArray(value.items)
  ) {
    return false
  }

  const { filters, pagination, items, hospital } = value
  return (
    value.status === 'ok' &&
    value.source === expectedSource &&
    typeof value.database_time === 'string' &&
    DATABASE_TIME_PATTERN.test(value.database_time) &&
    Number.isFinite(Date.parse(value.database_time)) &&
    value.contract_version === CID_CONTRACT_VERSION &&
    typeof filters.cnes === 'string' &&
    CNES_PATTERN.test(filters.cnes) &&
    typeof filters.eligible_only === 'boolean' &&
    hospital.cnes === filters.cnes &&
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
    items.every((item) => item.cnes === filters.cnes) &&
    items.every(
      (item, index) => index === 0 || items[index - 1].new_admissions >= item.new_admissions,
    ) &&
    new Set(items.map((item) => item.cid_code)).size === items.length &&
    // Com o recorte de elegíveis ligado, nenhuma linha não-elegível pode passar.
    (filters.eligible_only === false ||
      items.every((item) => item.sample_status === 'suficiente')) &&
    (!expected ||
      (filters.cnes === expected.cnes &&
        filters.eligible_only === expected.eligibleOnly &&
        pagination.limit === expected.limit &&
        pagination.offset === expected.offset))
  )
}

type ValidationResult =
  | { kind: 'valid'; data: CidResponse }
  | { kind: 'absent' }
  | { kind: 'invalid' }

function validateResponse(
  value: unknown,
  expectedSource: PublishedSource,
  expected?: CidRequest & { limit: number; offset: number },
): ValidationResult {
  if (!isRecord(value)) return { kind: 'invalid' }

  const hosp = hospitalKind(value.hospital)
  if (hosp === 'invalid') return { kind: 'invalid' }
  if (!isValidEnvelope(value, expectedSource, expected)) return { kind: 'invalid' }

  if (hosp === 'absent') {
    const { pagination, items } = value as { pagination: { count: number }; items: unknown[] }
    return pagination.count === 0 && items.length === 0
      ? { kind: 'absent' }
      : { kind: 'invalid' }
  }

  return { kind: 'valid', data: value as unknown as CidResponse }
}

export async function fetchHospitalCids(
  request: CidRequest,
  options: FetchOptions = {},
): Promise<CidResponse> {
  if (!CNES_PATTERN.test(request.cnes)) throw new CidContractError()

  const limit = options.limit ?? 200
  const offset = options.offset ?? 0
  const timeoutMs = options.timeoutMs ?? 5_000
  const params = new URLSearchParams({
    elegivel: request.eligibleOnly ? '1' : '0',
    limit: String(limit),
    offset: String(offset),
  })

  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  options.signal?.addEventListener('abort', abortFromCaller, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(
      apiUrl(`/hospitais/${request.cnes}/cids?${params.toString()}`),
      { headers: { Accept: 'application/json' }, signal: controller.signal },
    )
    if (!response.ok) throw new Error(`cids HTTP ${response.status}`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new CidContractError()
    }

    const resultado = validateResponse(payload, 'oracle-live', { ...request, limit, offset })
    if (resultado.kind === 'absent') throw new CidAbsentError()
    if (resultado.kind === 'invalid') throw new CidContractError()
    return resultado.data
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

export function getHospitalCidsSnapshot() {
  const resultado = validateResponse(cidsSnapshot, 'snapshot')
  if (resultado.kind !== 'valid') {
    throw new Error('fixture de diagnósticos inválida')
  }
  return resultado.data
}

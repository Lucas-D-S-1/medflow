import especialidadesSnapshot from '../../mocks/hospital-especialidades-3012212.json'
import {
  CNES_PATTERN,
  isFiniteNumber,
  isNonEmptyText,
  isNonNegativeInteger,
  isNullableNumber,
  isComparisonSampleStatus,
  isRecord,
  isSampleStatus,
  REGION_CODE_PATTERN,
  type ComparisonSampleStatus,
  type SampleStatus,
} from './hospitais'
import { apiUrl } from '../../lib/api/base'

export const SPECIALTY_CONTRACT_VERSION = '0.4.0' as const

type PublishedSource = 'oracle-live' | 'snapshot'

export type SpecialtyItem = {
  cnes: string
  specialty_code: string
  specialty_name: string
  new_admissions: number
  deaths: number
  stay_days_total: number
  tmh_percent: number | null
  cmi_nominal: number | null
  cmi_real: number | null
  average_stay_days: number | null
  price_reference_competence: string
  sample_status: SampleStatus
  benchmark_admissions: number
  benchmark_hospitals: number
  /** Nula exatamente quando não há hospital par na região e especialidade. */
  average_stay_benchmark: number | null
  ipe: number | null
  /**
   * Elegibilidade do IPE, separada de `sample_status`. Os dois cortes são
   * diferentes — TMH e CMI exigem 30 internações; o IPE exige 20 no hospital,
   * 50 no benchmark e 3 hospitais pares — então divergem na mesma linha.
   */
  ipe_sample_status: ComparisonSampleStatus
}

export type SpecialtyHospital = {
  cnes: string
  region_code: string
  region_name: string
  macroregion_code: string
  macroregion_name: string
  new_admissions_total: number
}

export type SpecialtyResponse = {
  status: 'ok'
  source: PublishedSource
  database_time: string
  contract_version: typeof SPECIALTY_CONTRACT_VERSION
  data_through: string
  filters: { cnes: string; year: number; month: number }
  hospital: SpecialtyHospital
  pagination: {
    limit: number
    offset: number
    count: number
    has_more: boolean
    order: 'new_admissions_desc'
  }
  items: SpecialtyItem[]
}

type SpecialtyRequest = { cnes: string; year: number; month: number }
type FetchOptions = { limit?: number; offset?: number; timeoutMs?: number; signal?: AbortSignal }

const SPECIALTY_CODE_PATTERN = /^\d{2}$/
const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const PRICE_COMPETENCE_PATTERN = /^\d{6}$/
const DATABASE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

const HOSPITAL_TEXT_FIELDS = ['region_name', 'macroregion_code', 'macroregion_name'] as const

export class SpecialtyContractError extends Error {
  constructor() {
    super('contrato de especialidades inválido')
    this.name = 'SpecialtyContractError'
  }
}

/** Hospital sem especialidade publicada na competência. Não é falha. */
export class SpecialtyAbsentError extends Error {
  constructor() {
    super('hospital sem especialidades publicadas')
    this.name = 'SpecialtyAbsentError'
  }
}

type BlockKind = 'complete' | 'absent' | 'invalid'

function hospitalKind(value: unknown): BlockKind {
  if (!isRecord(value)) return 'invalid'
  if (typeof value.cnes !== 'string' || !CNES_PATTERN.test(value.cnes)) return 'invalid'
  if (
    HOSPITAL_TEXT_FIELDS.every((key) => value[key] === null) &&
    value.region_code === null &&
    value.new_admissions_total === null
  ) {
    return 'absent'
  }
  return HOSPITAL_TEXT_FIELDS.every((key) => isNonEmptyText(value[key])) &&
    typeof value.region_code === 'string' &&
    REGION_CODE_PATTERN.test(value.region_code) &&
    isNonNegativeInteger(value.new_admissions_total)
    ? 'complete'
    : 'invalid'
}

function isValidItem(value: unknown): value is SpecialtyItem {
  if (!isRecord(value)) return false
  const ipeElegivel = value.ipe_sample_status === 'suficiente'
  return (
    typeof value.cnes === 'string' &&
    CNES_PATTERN.test(value.cnes) &&
    typeof value.specialty_code === 'string' &&
    SPECIALTY_CODE_PATTERN.test(value.specialty_code) &&
    isNonEmptyText(value.specialty_name) &&
    isNonNegativeInteger(value.new_admissions) &&
    isNonNegativeInteger(value.deaths) &&
    isNonNegativeInteger(value.stay_days_total) &&
    isNullableNumber(value.tmh_percent) &&
    isNullableNumber(value.cmi_nominal) &&
    isNullableNumber(value.cmi_real) &&
    isNullableNumber(value.average_stay_days) &&
    typeof value.price_reference_competence === 'string' &&
    PRICE_COMPETENCE_PATTERN.test(value.price_reference_competence) &&
    isSampleStatus(value.sample_status) &&
    isNonNegativeInteger(value.benchmark_admissions) &&
    isNonNegativeInteger(value.benchmark_hospitals) &&
    isNullableNumber(value.average_stay_benchmark) &&
    isNullableNumber(value.ipe) &&
    isComparisonSampleStatus(value.ipe_sample_status) &&
    // As mesmas invariantes que o IPR sustenta, pela mesma razão: um índice
    // publicado fora do estado que o autoriza seria comparação que a Gold não
    // fez. Ver `hospitalCids.ts`.
    (ipeElegivel ? isFiniteNumber(value.ipe) : value.ipe === null) &&
    (value.average_stay_benchmark === null) === (value.benchmark_hospitals === 0) &&
    (!ipeElegivel ||
      (isFiniteNumber(value.average_stay_benchmark) && value.average_stay_benchmark > 0)) &&
    (value.ipe_sample_status !== 'benchmark_zero' ||
      (value.average_stay_benchmark === 0 && value.benchmark_hospitals >= 1))
  )
}

function isValidEnvelope(
  value: Record<string, unknown>,
  expectedSource: PublishedSource,
  expected?: SpecialtyRequest & { limit: number; offset: number },
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
  const competence = `${filters.year}-${String(filters.month).padStart(2, '0')}`
  return (
    value.status === 'ok' &&
    value.source === expectedSource &&
    typeof value.database_time === 'string' &&
    DATABASE_TIME_PATTERN.test(value.database_time) &&
    Number.isFinite(Date.parse(value.database_time)) &&
    value.contract_version === SPECIALTY_CONTRACT_VERSION &&
    typeof value.data_through === 'string' &&
    COMPETENCE_PATTERN.test(value.data_through) &&
    value.data_through === competence &&
    typeof filters.cnes === 'string' &&
    CNES_PATTERN.test(filters.cnes) &&
    isNonNegativeInteger(filters.year) &&
    isNonNegativeInteger(filters.month) &&
    filters.month >= 1 &&
    filters.month <= 12 &&
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
    new Set(items.map((item) => item.specialty_code)).size === items.length &&
    (!expected ||
      (filters.cnes === expected.cnes &&
        filters.year === expected.year &&
        filters.month === expected.month &&
        pagination.limit === expected.limit &&
        pagination.offset === expected.offset))
  )
}

type ValidationResult =
  | { kind: 'valid'; data: SpecialtyResponse }
  | { kind: 'absent' }
  | { kind: 'invalid' }

function validateResponse(
  value: unknown,
  expectedSource: PublishedSource,
  expected?: SpecialtyRequest & { limit: number; offset: number },
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

  return { kind: 'valid', data: value as unknown as SpecialtyResponse }
}

export async function fetchSpecialties(
  request: SpecialtyRequest,
  options: FetchOptions = {},
): Promise<SpecialtyResponse> {
  if (
    !CNES_PATTERN.test(request.cnes) ||
    !Number.isInteger(request.year) ||
    !Number.isInteger(request.month) ||
    request.month < 1 ||
    request.month > 12
  ) {
    throw new SpecialtyContractError()
  }

  const limit = options.limit ?? 200
  const offset = options.offset ?? 0
  const timeoutMs = options.timeoutMs ?? 3_000
  const params = new URLSearchParams({
    ano: String(request.year),
    mes: String(request.month),
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
      apiUrl(`/hospitais/${request.cnes}/especialidades?${params.toString()}`),
      { headers: { Accept: 'application/json' }, signal: controller.signal },
    )
    if (!response.ok) throw new Error(`especialidades HTTP ${response.status}`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new SpecialtyContractError()
    }

    const resultado = validateResponse(payload, 'oracle-live', { ...request, limit, offset })
    if (resultado.kind === 'absent') throw new SpecialtyAbsentError()
    if (resultado.kind === 'invalid') throw new SpecialtyContractError()
    return resultado.data
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

export function getSpecialtySnapshot() {
  const resultado = validateResponse(especialidadesSnapshot, 'snapshot')
  if (resultado.kind !== 'valid') {
    throw new Error('fixture de especialidades inválida')
  }
  return resultado.data
}

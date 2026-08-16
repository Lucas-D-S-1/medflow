import serieSnapshot from '../../mocks/hospital-serie-3012212.json'
import {
  CNES_PATTERN,
  isFiniteNumber,
  isNonEmptyText,
  isNonNegativeInteger,
  isNullableNumber,
  isRecord,
  isSampleStatus,
  REGION_CODE_PATTERN,
  type CapacityStatus,
  type SampleStatus,
} from './hospitais'
import { apiUrl } from '../../lib/api/base'

export const HOSPITAL_SERIES_CONTRACT_VERSION = '0.3.0' as const

type PublishedSource = 'oracle-live' | 'snapshot'

export type HospitalSeriesPoint = {
  competence: string
  year: number
  month: number
  sus_beds: number
  new_admissions: number
  deaths: number
  patient_days_estimated: number
  declared_bed_days: number
  iph_percent: number | null
  tmh_percent: number | null
  cmi_nominal: number | null
  cmi_real: number | null
  average_stay_days: number | null
  price_reference_competence: string
  sample_status: SampleStatus
  capacity_status: CapacityStatus
  above_declared_capacity: number
}

export type HospitalIdentity = {
  cnes: string
  hospital_name: string
  unit_type_code: string
  unit_type_name: string
  municipality_code: string
  region_code: string
  region_name: string
  macroregion_code: string
  macroregion_name: string
}

export type HospitalSeriesResponse = {
  status: 'ok'
  source: PublishedSource
  database_time: string
  contract_version: typeof HOSPITAL_SERIES_CONTRACT_VERSION
  data_through: string
  filters: { cnes: string }
  hospital: HospitalIdentity
  pagination: {
    limit: number
    offset: number
    count: number
    has_more: boolean
    order: 'competence_desc'
  }
  items: HospitalSeriesPoint[]
}

type FetchOptions = {
  limit?: number
  offset?: number
  timeoutMs?: number
  signal?: AbortSignal
}

const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const PRICE_COMPETENCE_PATTERN = /^\d{6}$/
const DATABASE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

const IDENTITY_TEXT_FIELDS = [
  'hospital_name',
  'unit_type_code',
  'unit_type_name',
  'municipality_code',
  'region_name',
  'macroregion_code',
  'macroregion_name',
] as const

export class HospitalSeriesContractError extends Error {
  constructor() {
    super('contrato da série do hospital inválido')
    this.name = 'HospitalSeriesContractError'
  }
}

/** O CNES pedido não tem série publicada. Não é falha do endpoint. */
export class HospitalSeriesAbsentError extends Error {
  constructor() {
    super('hospital sem série publicada')
    this.name = 'HospitalSeriesAbsentError'
  }
}

type BlockKind = 'complete' | 'absent' | 'invalid'

function identityKind(value: unknown): BlockKind {
  if (!isRecord(value)) return 'invalid'
  if (typeof value.cnes !== 'string' || !CNES_PATTERN.test(value.cnes)) return 'invalid'
  if (
    IDENTITY_TEXT_FIELDS.every((key) => value[key] === null) &&
    value.region_code === null
  ) {
    return 'absent'
  }
  return IDENTITY_TEXT_FIELDS.every((key) => isNonEmptyText(value[key])) &&
    typeof value.region_code === 'string' &&
    REGION_CODE_PATTERN.test(value.region_code)
    ? 'complete'
    : 'invalid'
}

function isValidPoint(value: unknown): value is HospitalSeriesPoint {
  if (!isRecord(value)) return false
  const match =
    typeof value.competence === 'string' ? COMPETENCE_PATTERN.exec(value.competence) : null
  return (
    match !== null &&
    isNonNegativeInteger(value.year) &&
    isNonNegativeInteger(value.month) &&
    Number(match[1]) === value.year &&
    Number(match[2]) === value.month &&
    isNonNegativeInteger(value.sus_beds) &&
    isNonNegativeInteger(value.new_admissions) &&
    isNonNegativeInteger(value.deaths) &&
    isNonNegativeInteger(value.patient_days_estimated) &&
    isNonNegativeInteger(value.declared_bed_days) &&
    isNullableNumber(value.iph_percent) &&
    isNullableNumber(value.tmh_percent) &&
    isNullableNumber(value.cmi_nominal) &&
    isNullableNumber(value.cmi_real) &&
    isNullableNumber(value.average_stay_days) &&
    typeof value.price_reference_competence === 'string' &&
    PRICE_COMPETENCE_PATTERN.test(value.price_reference_competence) &&
    isSampleStatus(value.sample_status) &&
    (value.capacity_status === 'disponivel' ||
      value.capacity_status === 'sem_leito_sus_declarado') &&
    (value.above_declared_capacity === 0 || value.above_declared_capacity === 1) &&
    (value.capacity_status !== 'sem_leito_sus_declarado' || value.iph_percent === null)
  )
}

function isValidEnvelope(
  value: Record<string, unknown>,
  expectedSource: PublishedSource,
  expected?: { cnes: string; limit: number; offset: number },
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
    value.contract_version === HOSPITAL_SERIES_CONTRACT_VERSION &&
    typeof filters.cnes === 'string' &&
    CNES_PATTERN.test(filters.cnes) &&
    hospital.cnes === filters.cnes &&
    isNonNegativeInteger(pagination.limit) &&
    pagination.limit >= 1 &&
    pagination.limit <= 2000 &&
    isNonNegativeInteger(pagination.offset) &&
    isNonNegativeInteger(pagination.count) &&
    typeof pagination.has_more === 'boolean' &&
    pagination.order === 'competence_desc' &&
    items.length <= pagination.limit &&
    pagination.has_more === (pagination.offset + items.length < pagination.count) &&
    items.every(isValidPoint) &&
    // A ordem é declarada no contrato; sem isso "competência mais recente"
    // dependeria de ordenação que ninguém prometeu.
    items.every(
      (item, index) => index === 0 || items[index - 1].competence > item.competence,
    ) &&
    (items.length === 0
      ? value.data_through === null
      : typeof value.data_through === 'string' &&
        COMPETENCE_PATTERN.test(value.data_through)) &&
    (!expected ||
      (filters.cnes === expected.cnes &&
        pagination.limit === expected.limit &&
        pagination.offset === expected.offset))
  )
}

type ValidationResult =
  | { kind: 'valid'; data: HospitalSeriesResponse }
  | { kind: 'absent' }
  | { kind: 'invalid' }

function validateResponse(
  value: unknown,
  expectedSource: PublishedSource,
  expected?: { cnes: string; limit: number; offset: number },
): ValidationResult {
  if (!isRecord(value)) return { kind: 'invalid' }

  const identidade = identityKind(value.hospital)
  if (identidade === 'invalid') return { kind: 'invalid' }
  if (!isValidEnvelope(value, expectedSource, expected)) return { kind: 'invalid' }

  if (identidade === 'absent') {
    const { pagination, items } = value as {
      pagination: { count: number }
      items: unknown[]
    }
    return pagination.count === 0 && items.length === 0
      ? { kind: 'absent' }
      : { kind: 'invalid' }
  }

  return { kind: 'valid', data: value as unknown as HospitalSeriesResponse }
}

export async function fetchHospitalSeries(
  cnes: string,
  options: FetchOptions = {},
): Promise<HospitalSeriesResponse> {
  if (!CNES_PATTERN.test(cnes)) throw new HospitalSeriesContractError()

  const limit = options.limit ?? 200
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
      apiUrl(`/hospitais/${cnes}/serie?${params.toString()}`),
      { headers: { Accept: 'application/json' }, signal: controller.signal },
    )
    if (!response.ok) throw new Error(`serie do hospital HTTP ${response.status}`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new HospitalSeriesContractError()
    }

    const resultado = validateResponse(payload, 'oracle-live', { cnes, limit, offset })
    if (resultado.kind === 'absent') throw new HospitalSeriesAbsentError()
    if (resultado.kind === 'invalid') throw new HospitalSeriesContractError()
    return resultado.data
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

export function getHospitalSeriesSnapshot() {
  const resultado = validateResponse(serieSnapshot, 'snapshot')
  if (resultado.kind !== 'valid') {
    throw new Error('fixture da série do hospital inválida')
  }
  return resultado.data
}

export { isFiniteNumber }

import diagnosticosSnapshot from '../../mocks/hospital-diagnosticos-especialidade-3012212-07.json'
import { apiUrl } from '../../lib/api/base'
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

export const SPECIALTY_DIAGNOSIS_CONTRACT_VERSION = '0.5.0' as const

type PublishedSource = 'oracle-live' | 'snapshot'
export type SpecialtyDiagnosisOrder = 'dias' | 'internacoes' | 'media'
type PublishedOrder = 'stay_days_desc' | 'new_admissions_desc' | 'average_stay_desc'

export type SpecialtyDiagnosisItem = {
  cnes: string
  specialty_code: string
  specialty_name: string
  cid_code: string
  cid_description: string
  chapter_code: string
  chapter_description: string
  new_admissions: number
  stay_days_total: number
  average_stay_days: number
  admission_share_percent: number
  stay_day_share_percent: number | null
  benchmark_admissions: number
  benchmark_stay_days_total: number
  benchmark_hospitals: number
  average_stay_benchmark: number | null
  ipr: number | null
  sample_status: ComparisonSampleStatus
}

export type SpecialtyDiagnosisResponse = {
  status: 'ok'
  source: PublishedSource
  database_time: string
  contract_version: typeof SPECIALTY_DIAGNOSIS_CONTRACT_VERSION
  data_through: string
  filters: {
    cnes: string
    year: number
    month: number
    specialty_code: string
    order_by: SpecialtyDiagnosisOrder
  }
  hospital: {
    cnes: string
    region_code: string
    region_name: string
    macroregion_code: string
    macroregion_name: string
    specialty_code: string
    specialty_name: string
    specialty_new_admissions_total: number
    specialty_stay_days_total: number
  }
  pagination: {
    limit: number
    offset: number
    count: number
    has_more: boolean
    order: PublishedOrder
  }
  items: SpecialtyDiagnosisItem[]
}

export type SpecialtyDiagnosisRequest = {
  cnes: string
  year: number
  month: number
  specialtyCode: string
  orderBy?: SpecialtyDiagnosisOrder
}

type FetchOptions = {
  limit?: number
  offset?: number
  timeoutMs?: number
  signal?: AbortSignal
}

const SPECIALTY_CODE_PATTERN = /^(?:\d{2}|--)$/
const CID_CODE_PATTERN = /^(?:[A-Z]\d{2,4}|--)$/
const CHAPTER_PATTERN = /^(?:[IVXLC]+|--)$/
const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const DATABASE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const ORDER_NAMES: Record<SpecialtyDiagnosisOrder, PublishedOrder> = {
  dias: 'stay_days_desc',
  internacoes: 'new_admissions_desc',
  media: 'average_stay_desc',
}

export class SpecialtyDiagnosisContractError extends Error {
  constructor() {
    super('contrato de diagnósticos por especialidade inválido')
    this.name = 'SpecialtyDiagnosisContractError'
  }
}

export class SpecialtyDiagnosisAbsentError extends Error {
  constructor() {
    super('especialidade sem diagnósticos publicados nesta competência')
    this.name = 'SpecialtyDiagnosisAbsentError'
  }
}

function isPercent(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100.000001
}

function isValidItem(value: unknown): value is SpecialtyDiagnosisItem {
  if (!isRecord(value)) return false
  const comparable = value.sample_status === 'suficiente'
  return (
    typeof value.cnes === 'string' &&
    CNES_PATTERN.test(value.cnes) &&
    typeof value.specialty_code === 'string' &&
    SPECIALTY_CODE_PATTERN.test(value.specialty_code) &&
    isNonEmptyText(value.specialty_name) &&
    typeof value.cid_code === 'string' &&
    CID_CODE_PATTERN.test(value.cid_code) &&
    isNonEmptyText(value.cid_description) &&
    typeof value.chapter_code === 'string' &&
    CHAPTER_PATTERN.test(value.chapter_code) &&
    isNonEmptyText(value.chapter_description) &&
    isNonNegativeInteger(value.new_admissions) &&
    value.new_admissions > 0 &&
    isNonNegativeInteger(value.stay_days_total) &&
    isFiniteNumber(value.average_stay_days) &&
    value.average_stay_days >= 0 &&
    isPercent(value.admission_share_percent) &&
    (value.stay_day_share_percent === null || isPercent(value.stay_day_share_percent)) &&
    isNonNegativeInteger(value.benchmark_admissions) &&
    isNonNegativeInteger(value.benchmark_stay_days_total) &&
    isNonNegativeInteger(value.benchmark_hospitals) &&
    isNullableNumber(value.average_stay_benchmark) &&
    isNullableNumber(value.ipr) &&
    (value.sample_status === 'suficiente' ||
      value.sample_status === 'amostra_insuficiente' ||
      value.sample_status === 'benchmark_zero') &&
    (comparable ? isFiniteNumber(value.ipr) : value.ipr === null) &&
    (value.benchmark_admissions === 0
      ? value.average_stay_benchmark === null
      : isFiniteNumber(value.average_stay_benchmark)) &&
    (!comparable ||
      (value.new_admissions >= 20 &&
        value.benchmark_admissions >= 50 &&
        value.benchmark_hospitals >= 3 &&
        isFiniteNumber(value.average_stay_benchmark) &&
        value.average_stay_benchmark > 0))
  )
}

function metric(item: SpecialtyDiagnosisItem, order: SpecialtyDiagnosisOrder) {
  if (order === 'internacoes') return item.new_admissions
  if (order === 'media') return item.average_stay_days
  return item.stay_days_total
}

function isOrdered(items: SpecialtyDiagnosisItem[], order: SpecialtyDiagnosisOrder) {
  return items.every((item, index) => {
    if (index === 0) return true
    const previous = items[index - 1]
    const metricDifference = metric(previous, order) - metric(item, order)
    if (metricDifference !== 0) return metricDifference > 0
    if (previous.stay_days_total !== item.stay_days_total) {
      return previous.stay_days_total > item.stay_days_total
    }
    return previous.cid_code.localeCompare(item.cid_code) <= 0
  })
}

type ValidationResult =
  | { kind: 'valid'; data: SpecialtyDiagnosisResponse }
  | { kind: 'absent' }
  | { kind: 'invalid' }

function validateResponse(
  value: unknown,
  expectedSource: PublishedSource,
  expected?: SpecialtyDiagnosisRequest & { orderBy: SpecialtyDiagnosisOrder; limit: number; offset: number },
): ValidationResult {
  if (
    !isRecord(value) ||
    !isRecord(value.filters) ||
    !isRecord(value.pagination) ||
    !isRecord(value.hospital) ||
    !Array.isArray(value.items)
  ) {
    return { kind: 'invalid' }
  }

  const { filters, pagination, hospital } = value
  const items = value.items as unknown[]
  const competence = `${filters.year}-${String(filters.month).padStart(2, '0')}`
  const absentHospital =
    hospital.region_code === null &&
    hospital.region_name === null &&
    hospital.macroregion_code === null &&
    hospital.macroregion_name === null &&
    hospital.specialty_name === null &&
    hospital.specialty_new_admissions_total === null &&
    hospital.specialty_stay_days_total === null

  const baseValid =
    value.status === 'ok' &&
    value.source === expectedSource &&
    typeof value.database_time === 'string' &&
    DATABASE_TIME_PATTERN.test(value.database_time) &&
    Number.isFinite(Date.parse(value.database_time)) &&
    value.contract_version === SPECIALTY_DIAGNOSIS_CONTRACT_VERSION &&
    value.data_through === competence &&
    typeof filters.cnes === 'string' &&
    CNES_PATTERN.test(filters.cnes) &&
    isNonNegativeInteger(filters.year) &&
    isNonNegativeInteger(filters.month) &&
    filters.month >= 1 &&
    filters.month <= 12 &&
    typeof filters.specialty_code === 'string' &&
    SPECIALTY_CODE_PATTERN.test(filters.specialty_code) &&
    (filters.order_by === 'dias' ||
      filters.order_by === 'internacoes' ||
      filters.order_by === 'media') &&
    hospital.cnes === filters.cnes &&
    hospital.specialty_code === filters.specialty_code &&
    isNonNegativeInteger(pagination.limit) &&
    pagination.limit >= 1 &&
    pagination.limit <= 2000 &&
    isNonNegativeInteger(pagination.offset) &&
    isNonNegativeInteger(pagination.count) &&
    typeof pagination.has_more === 'boolean' &&
    pagination.order === ORDER_NAMES[filters.order_by] &&
    items.length <= pagination.limit &&
    pagination.has_more === (pagination.offset + items.length < pagination.count) &&
    (!expected ||
      (filters.cnes === expected.cnes &&
        filters.year === expected.year &&
        filters.month === expected.month &&
        filters.specialty_code === expected.specialtyCode &&
        filters.order_by === expected.orderBy &&
        pagination.limit === expected.limit &&
        pagination.offset === expected.offset))

  if (!baseValid) return { kind: 'invalid' }
  if (absentHospital) {
    return pagination.count === 0 && items.length === 0
      ? { kind: 'absent' }
      : { kind: 'invalid' }
  }

  const typedItems = items.filter(isValidItem)
  const completeHospital =
    typeof hospital.region_code === 'string' &&
    REGION_CODE_PATTERN.test(hospital.region_code) &&
    isNonEmptyText(hospital.region_name) &&
    isNonEmptyText(hospital.macroregion_code) &&
    isNonEmptyText(hospital.macroregion_name) &&
    isNonEmptyText(hospital.specialty_name) &&
    isNonNegativeInteger(hospital.specialty_new_admissions_total) &&
    isNonNegativeInteger(hospital.specialty_stay_days_total)
  const valid =
    completeHospital &&
    typedItems.length === items.length &&
    typedItems.every(
      (item) =>
        item.cnes === filters.cnes && item.specialty_code === filters.specialty_code,
    ) &&
    isOrdered(typedItems, filters.order_by as SpecialtyDiagnosisOrder) &&
    new Set(typedItems.map((item) => item.cid_code)).size === typedItems.length

  return valid
    ? { kind: 'valid', data: value as unknown as SpecialtyDiagnosisResponse }
    : { kind: 'invalid' }
}

export async function fetchSpecialtyDiagnoses(
  request: SpecialtyDiagnosisRequest,
  options: FetchOptions = {},
): Promise<SpecialtyDiagnosisResponse> {
  const orderBy = request.orderBy ?? 'dias'
  if (
    !CNES_PATTERN.test(request.cnes) ||
    !SPECIALTY_CODE_PATTERN.test(request.specialtyCode) ||
    !Number.isInteger(request.year) ||
    !Number.isInteger(request.month) ||
    request.month < 1 ||
    request.month > 12 ||
    !(orderBy in ORDER_NAMES)
  ) {
    throw new SpecialtyDiagnosisContractError()
  }

  const limit = options.limit ?? 100
  const offset = options.offset ?? 0
  const timeoutMs = options.timeoutMs ?? 5_000
  const params = new URLSearchParams({
    ano: String(request.year),
    mes: String(request.month),
    ordenar: orderBy,
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
      apiUrl(
        `/hospitais/${request.cnes}/especialidades/${request.specialtyCode}/diagnosticos?${params.toString()}`,
      ),
      { headers: { Accept: 'application/json' }, signal: controller.signal },
    )
    if (!response.ok) throw new Error(`diagnósticos por especialidade HTTP ${response.status}`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new SpecialtyDiagnosisContractError()
    }

    const result = validateResponse(payload, 'oracle-live', {
      ...request,
      orderBy,
      limit,
      offset,
    })
    if (result.kind === 'absent') throw new SpecialtyDiagnosisAbsentError()
    if (result.kind === 'invalid') throw new SpecialtyDiagnosisContractError()
    return result.data
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

export async function fetchAllSpecialtyDiagnoses(
  request: SpecialtyDiagnosisRequest,
  options: Omit<FetchOptions, 'limit' | 'offset'> = {},
): Promise<SpecialtyDiagnosisResponse> {
  const pageSize = 2000
  let offset = 0
  let first: SpecialtyDiagnosisResponse | null = null
  const items: SpecialtyDiagnosisItem[] = []

  while (first === null || offset < first.pagination.count) {
    if (offset >= 100_000) throw new SpecialtyDiagnosisContractError()
    const response = await fetchSpecialtyDiagnoses(request, {
      ...options,
      limit: pageSize,
      offset,
    })
    if (!first) first = response
    else if (
      response.data_through !== first.data_through ||
      response.filters.cnes !== first.filters.cnes ||
      response.filters.specialty_code !== first.filters.specialty_code ||
      response.filters.order_by !== first.filters.order_by ||
      response.pagination.count !== first.pagination.count
    ) {
      throw new SpecialtyDiagnosisContractError()
    }
    items.push(...response.items)
    offset += response.items.length
    if (!response.pagination.has_more) break
    if (response.items.length === 0) throw new SpecialtyDiagnosisContractError()
  }

  if (
    !first ||
    items.length !== first.pagination.count ||
    new Set(items.map((item) => item.cid_code)).size !== items.length ||
    !isOrdered(items, first.filters.order_by)
  ) {
    throw new SpecialtyDiagnosisContractError()
  }

  return {
    ...first,
    pagination: {
      ...first.pagination,
      limit: Math.max(items.length, 1),
      offset: 0,
      count: items.length,
      has_more: false,
    },
    items,
  }
}

export function getSpecialtyDiagnosesSnapshot(orderBy: SpecialtyDiagnosisOrder = 'dias') {
  const result = validateResponse(diagnosticosSnapshot, 'snapshot')
  if (result.kind !== 'valid') {
    throw new Error('fixture de diagnósticos por especialidade inválida')
  }
  const items = [...result.data.items].sort((left, right) => {
    const difference = metric(right, orderBy) - metric(left, orderBy)
    if (difference !== 0) return difference
    if (right.stay_days_total !== left.stay_days_total) {
      return right.stay_days_total - left.stay_days_total
    }
    return left.cid_code.localeCompare(right.cid_code)
  })
  return {
    ...result.data,
    filters: { ...result.data.filters, order_by: orderBy },
    pagination: { ...result.data.pagination, order: ORDER_NAMES[orderBy] },
    items,
  }
}

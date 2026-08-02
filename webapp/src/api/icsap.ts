import icsapSnapshot from '../fixtures/icsap-35073-2026-05.json'

export const ICSAP_CONTRACT_VERSION = '0.3.0' as const

type PublishedSource = 'oracle-live' | 'snapshot'

export type IcsapGroup = {
  region_code: string
  group_code: string
  group_name: string
  icsap_admissions: number
  group_share_of_icsap_percent: number
  group_rate_per_10k: number
}

export type IcsapRegion = {
  region_code: string
  region_name: string
  macroregion_code: string
  macroregion_name: string
  population: number
  resident_admissions_observed: number
  icsap_admissions: number
  icsap_share_of_resident_percent: number
  icsap_rate_per_10k: number
}

export type IcsapResponse = {
  status: 'ok'
  source: PublishedSource
  database_time: string
  contract_version: typeof ICSAP_CONTRACT_VERSION
  data_through: string
  filters: {
    year: number
    month: number
    region_code: string
  }
  region: IcsapRegion
  pagination: {
    limit: number
    offset: number
    count: number
    has_more: boolean
    order: 'icsap_admissions_desc'
  }
  items: IcsapGroup[]
}

type IcsapRequest = {
  year: number
  month: number
  regionCode: string
}

type FetchIcsapOptions = {
  limit?: number
  offset?: number
  timeoutMs?: number
  signal?: AbortSignal
}

const REGION_CODE_PATTERN = /^\d{5}$/
const GROUP_CODE_PATTERN = /^\d{2}$/
const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const DATABASE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const REGION_INTEGER_FIELDS = [
  'population',
  'resident_admissions_observed',
  'icsap_admissions',
] as const
const REGION_NUMBER_FIELDS = [
  'icsap_share_of_resident_percent',
  'icsap_rate_per_10k',
] as const
const REGION_TEXT_FIELDS = [
  'region_name',
  'macroregion_code',
  'macroregion_name',
] as const
// Campos que o endpoint devolve nulos quando a região não tem linha publicada
// na competência pedida. `region_code` fica de fora: ele vem do filtro, não da
// Gold, e é o que permite distinguir ausência de payload quebrado.
const REGION_OPTIONAL_FIELDS = [
  ...REGION_TEXT_FIELDS,
  ...REGION_INTEGER_FIELDS,
  ...REGION_NUMBER_FIELDS,
] as const

export class IcsapContractError extends Error {
  constructor() {
    super('contrato de ICSAP inválido')
    this.name = 'IcsapContractError'
  }
}

/**
 * A competência pedida não tem ICSAP publicada: o endpoint respondeu 200 com
 * `count: 0` e região não preenchida. É ausência legítima, não falha — quem
 * trata precisa dizer isso na tela em vez de acusar o endpoint.
 */
export class IcsapAbsentCompetenceError extends Error {
  constructor() {
    super('competência sem ICSAP publicada')
    this.name = 'IcsapAbsentCompetenceError'
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

type RegionKind = 'complete' | 'absent' | 'invalid'

function regionKind(value: unknown): RegionKind {
  if (!isRecord(value)) return 'invalid'
  if (
    typeof value.region_code !== 'string' ||
    !REGION_CODE_PATTERN.test(value.region_code)
  ) {
    return 'invalid'
  }
  if (REGION_OPTIONAL_FIELDS.every((key) => value[key] === null)) return 'absent'
  const completo =
    REGION_TEXT_FIELDS.every(
      (key) => typeof value[key] === 'string' && (value[key] as string).length > 0,
    ) &&
    REGION_INTEGER_FIELDS.every((key) => isNonNegativeInteger(value[key])) &&
    REGION_NUMBER_FIELDS.every((key) => isFiniteNumber(value[key]))
  return completo ? 'complete' : 'invalid'
}

function isValidGroup(value: unknown): value is IcsapGroup {
  if (!isRecord(value)) return false
  return (
    typeof value.region_code === 'string' &&
    REGION_CODE_PATTERN.test(value.region_code) &&
    typeof value.group_code === 'string' &&
    GROUP_CODE_PATTERN.test(value.group_code) &&
    typeof value.group_name === 'string' &&
    value.group_name.length > 0 &&
    isNonNegativeInteger(value.icsap_admissions) &&
    isFiniteNumber(value.group_share_of_icsap_percent) &&
    isFiniteNumber(value.group_rate_per_10k)
  )
}

function isValidEnvelope(
  value: Record<string, unknown>,
  expectedSource: PublishedSource,
  expected?: IcsapRequest & { limit: number; offset: number },
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
    value.contract_version === ICSAP_CONTRACT_VERSION &&
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
    pagination.order === 'icsap_admissions_desc' &&
    items.length <= pagination.limit &&
    pagination.has_more === (pagination.offset + items.length < pagination.count) &&
    items.every(isValidGroup) &&
    items.every((item) => item.region_code === filters.region_code) &&
    // O contrato declara ordem por internações decrescentes. Sem isso, um
    // rótulo de "grupo que mais contribui" dependeria de ordenação ausente.
    items.every(
      (item, index) => index === 0 || items[index - 1].icsap_admissions >= item.icsap_admissions,
    ) &&
    new Set(items.map((item) => item.group_code)).size === items.length &&
    (!expected ||
      (filters.year === expected.year &&
        filters.month === expected.month &&
        filters.region_code === expected.regionCode &&
        pagination.limit === expected.limit &&
        pagination.offset === expected.offset))
  )
}

type ValidationResult =
  | { kind: 'valid'; data: IcsapResponse }
  | { kind: 'absent' }
  | { kind: 'invalid' }

function validateResponse(
  value: unknown,
  expectedSource: PublishedSource,
  expected?: IcsapRequest & { limit: number; offset: number },
): ValidationResult {
  if (!isRecord(value)) return { kind: 'invalid' }

  const regiao = regionKind(value.region)
  if (regiao === 'invalid') return { kind: 'invalid' }
  if (!isValidEnvelope(value, expectedSource, expected)) return { kind: 'invalid' }

  if (regiao === 'absent') {
    // Ausência só é legítima se o endpoint também não devolveu nenhum grupo:
    // região vazia com itens seria contradição, e aí é contrato quebrado.
    const { pagination, items } = value as {
      pagination: { count: number }
      items: unknown[]
    }
    return pagination.count === 0 && items.length === 0
      ? { kind: 'absent' }
      : { kind: 'invalid' }
  }

  return { kind: 'valid', data: value as unknown as IcsapResponse }
}

export async function fetchIcsap(
  request: IcsapRequest,
  options: FetchIcsapOptions = {},
): Promise<IcsapResponse> {
  if (
    !Number.isInteger(request.year) ||
    !Number.isInteger(request.month) ||
    request.month < 1 ||
    request.month > 12 ||
    !REGION_CODE_PATTERN.test(request.regionCode)
  ) {
    throw new IcsapContractError()
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

  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  options.signal?.addEventListener('abort', abortFromCaller, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`/api/dev/v1/icsap?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`icsap HTTP ${response.status}`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new IcsapContractError()
    }

    const resultado = validateResponse(payload, 'oracle-live', {
      ...request,
      limit,
      offset,
    })
    if (resultado.kind === 'absent') throw new IcsapAbsentCompetenceError()
    if (resultado.kind === 'invalid') throw new IcsapContractError()
    return resultado.data
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

export function getIcsapSnapshot() {
  const resultado = validateResponse(icsapSnapshot, 'snapshot')
  if (resultado.kind !== 'valid') {
    throw new Error('fixture de ICSAP inválida')
  }
  return resultado.data
}

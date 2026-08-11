import flowSnapshot from '../../mocks/fluxos-35073.json'

export const FLOW_CONTRACT_VERSION = '0.3.0' as const

type PublishedSource = 'oracle-live' | 'snapshot'

export type FlowType =
  | 'intrarregional'
  | 'interregional_sp'
  | 'entrada_outro_estado'

export type FlowItem = {
  origin_region_code: string
  origin_region_name: string
  origin_macroregion_code: string
  origin_macroregion_name: string
  destination_region_code: string
  destination_region_name: string
  destination_macroregion_code: string
  destination_macroregion_name: string
  flow_type: FlowType
  new_admissions: number
  origin_share_of_destination_percent: number
  destination_share_of_observed_origin_percent: number
}

export type FlowTerritory = {
  region_code: string
  region_name: string
  macroregion_code: string
  macroregion_name: string
  population: number
  production_admissions: number
  resident_admissions_observed: number
  resident_admissions_in_own_region: number
  observed_intrastate_evasion_admissions: number
  admissions_received_from_other_sp_regions: number
  admissions_received_from_other_states: number
  resident_admission_rate_per_100k: number
  observed_evasion_percent: number
  attraction_percent: number
  own_care_percent: number
}

export type FlowResponse = {
  status: 'ok'
  source: PublishedSource
  database_time: string
  contract_version: typeof FLOW_CONTRACT_VERSION
  data_through: string
  filters: {
    year: number
    month: number
    origin_region_code: string
    destination_region_code: string | null
  }
  territory: FlowTerritory
  pagination: {
    limit: number
    offset: number
    count: number
    has_more: boolean
    order: 'new_admissions_desc'
  }
  items: FlowItem[]
}

type FlowRequest = {
  year: number
  month: number
  originRegionCode: string
  destinationRegionCode?: string
}

type FetchFlowOptions = {
  limit?: number
  offset?: number
  timeoutMs?: number
  signal?: AbortSignal
}

const REGION_CODE_PATTERN = /^\d{5}$/
const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const DATABASE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const TERRITORY_INTEGER_FIELDS = [
  'population',
  'production_admissions',
  'resident_admissions_observed',
  'resident_admissions_in_own_region',
  'observed_intrastate_evasion_admissions',
  'admissions_received_from_other_sp_regions',
  'admissions_received_from_other_states',
] as const
const TERRITORY_NUMBER_FIELDS = [
  'resident_admission_rate_per_100k',
  'observed_evasion_percent',
  'attraction_percent',
  'own_care_percent',
] as const
const TERRITORY_TEXT_FIELDS = [
  'region_name',
  'macroregion_code',
  'macroregion_name',
] as const
// Campos que o endpoint devolve nulos quando a região não tem linha publicada
// na competência pedida. `region_code` fica de fora: ele vem do filtro, não da
// Gold, e é o que permite distinguir ausência de payload quebrado.
const TERRITORY_OPTIONAL_FIELDS = [
  ...TERRITORY_TEXT_FIELDS,
  ...TERRITORY_INTEGER_FIELDS,
  ...TERRITORY_NUMBER_FIELDS,
] as const

export class FlowContractError extends Error {
  constructor() {
    super('contrato de fluxos inválido')
    this.name = 'FlowContractError'
  }
}

/**
 * A competência pedida não tem fluxo publicado: o endpoint respondeu 200 com
 * `count: 0` e território não preenchido. É ausência legítima, não falha —
 * quem trata precisa dizer isso na tela em vez de acusar o endpoint.
 */
export class FlowAbsentCompetenceError extends Error {
  constructor() {
    super('competência sem fluxos publicados')
    this.name = 'FlowAbsentCompetenceError'
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

type TerritoryKind = 'complete' | 'absent' | 'invalid'

function territoryKind(value: unknown): TerritoryKind {
  if (!isRecord(value)) return 'invalid'
  if (
    typeof value.region_code !== 'string' ||
    !REGION_CODE_PATTERN.test(value.region_code)
  ) {
    return 'invalid'
  }
  if (TERRITORY_OPTIONAL_FIELDS.every((key) => value[key] === null)) return 'absent'
  const completo =
    TERRITORY_TEXT_FIELDS.every(
      (key) => typeof value[key] === 'string' && (value[key] as string).length > 0,
    ) &&
    TERRITORY_INTEGER_FIELDS.every((key) => isNonNegativeInteger(value[key])) &&
    TERRITORY_NUMBER_FIELDS.every((key) => isFiniteNumber(value[key]))
  return completo ? 'complete' : 'invalid'
}

function isValidItem(value: unknown): value is FlowItem {
  if (!isRecord(value)) return false
  return (
    typeof value.origin_region_code === 'string' &&
    REGION_CODE_PATTERN.test(value.origin_region_code) &&
    typeof value.origin_region_name === 'string' &&
    value.origin_region_name.length > 0 &&
    typeof value.origin_macroregion_code === 'string' &&
    value.origin_macroregion_code.length > 0 &&
    typeof value.origin_macroregion_name === 'string' &&
    value.origin_macroregion_name.length > 0 &&
    typeof value.destination_region_code === 'string' &&
    REGION_CODE_PATTERN.test(value.destination_region_code) &&
    typeof value.destination_region_name === 'string' &&
    value.destination_region_name.length > 0 &&
    typeof value.destination_macroregion_code === 'string' &&
    value.destination_macroregion_code.length > 0 &&
    typeof value.destination_macroregion_name === 'string' &&
    value.destination_macroregion_name.length > 0 &&
    (value.flow_type === 'intrarregional' ||
      value.flow_type === 'interregional_sp' ||
      value.flow_type === 'entrada_outro_estado') &&
    isNonNegativeInteger(value.new_admissions) &&
    isFiniteNumber(value.origin_share_of_destination_percent) &&
    isFiniteNumber(value.destination_share_of_observed_origin_percent)
  )
}

function isValidEnvelope(
  value: Record<string, unknown>,
  expectedSource: PublishedSource,
  expected?: FlowRequest & { limit: number; offset: number },
): boolean {
  if (
    !isRecord(value.filters) ||
    !isRecord(value.pagination) ||
    !isRecord(value.territory) ||
    !Array.isArray(value.items)
  ) {
    return false
  }

  const { filters, pagination, items, territory } = value
  const competence = `${filters.year}-${String(filters.month).padStart(2, '0')}`
  const destination = filters.destination_region_code
  return (
    value.status === 'ok' &&
    value.source === expectedSource &&
    typeof value.database_time === 'string' &&
    DATABASE_TIME_PATTERN.test(value.database_time) &&
    Number.isFinite(Date.parse(value.database_time)) &&
    value.contract_version === FLOW_CONTRACT_VERSION &&
    typeof value.data_through === 'string' &&
    COMPETENCE_PATTERN.test(value.data_through) &&
    value.data_through === competence &&
    isNonNegativeInteger(filters.year) &&
    isNonNegativeInteger(filters.month) &&
    filters.month >= 1 &&
    filters.month <= 12 &&
    typeof filters.origin_region_code === 'string' &&
    REGION_CODE_PATTERN.test(filters.origin_region_code) &&
    (destination === null ||
      (typeof destination === 'string' && REGION_CODE_PATTERN.test(destination))) &&
    territory.region_code === filters.origin_region_code &&
    isNonNegativeInteger(pagination.limit) &&
    pagination.limit >= 1 &&
    pagination.limit <= 2000 &&
    isNonNegativeInteger(pagination.offset) &&
    isNonNegativeInteger(pagination.count) &&
    typeof pagination.has_more === 'boolean' &&
    pagination.order === 'new_admissions_desc' &&
    items.length <= pagination.limit &&
    pagination.has_more === pagination.offset + items.length < pagination.count &&
    items.every(isValidItem) &&
    items.every((item) =>
      item.origin_region_code === filters.origin_region_code &&
      (destination === null || item.destination_region_code === destination),
    ) &&
    items.every(
      (item, index) => index === 0 || items[index - 1].new_admissions >= item.new_admissions,
    ) &&
    (!expected ||
      (filters.year === expected.year &&
        filters.month === expected.month &&
        filters.origin_region_code === expected.originRegionCode &&
        destination === (expected.destinationRegionCode ?? null) &&
        pagination.limit === expected.limit &&
        pagination.offset === expected.offset))
  )
}

type ValidationResult =
  | { kind: 'valid'; data: FlowResponse }
  | { kind: 'absent' }
  | { kind: 'invalid' }

function validateResponse(
  value: unknown,
  expectedSource: PublishedSource,
  expected?: FlowRequest & { limit: number; offset: number },
): ValidationResult {
  if (!isRecord(value)) return { kind: 'invalid' }

  const terreno = territoryKind(value.territory)
  if (terreno === 'invalid') return { kind: 'invalid' }
  if (!isValidEnvelope(value, expectedSource, expected)) return { kind: 'invalid' }

  if (terreno === 'absent') {
    // Ausência só é legítima se o endpoint também não devolveu nenhum par:
    // território vazio com itens seria contradição, e aí é contrato quebrado.
    const { pagination, items } = value as {
      pagination: { count: number }
      items: unknown[]
    }
    return pagination.count === 0 && items.length === 0
      ? { kind: 'absent' }
      : { kind: 'invalid' }
  }

  return { kind: 'valid', data: value as unknown as FlowResponse }
}

export async function fetchFlows(
  request: FlowRequest,
  options: FetchFlowOptions = {},
): Promise<FlowResponse> {
  if (
    !Number.isInteger(request.year) ||
    !Number.isInteger(request.month) ||
    request.month < 1 ||
    request.month > 12 ||
    !REGION_CODE_PATTERN.test(request.originRegionCode) ||
    (request.destinationRegionCode !== undefined &&
      !REGION_CODE_PATTERN.test(request.destinationRegionCode))
  ) {
    throw new FlowContractError()
  }

  const limit = options.limit ?? 200
  const offset = options.offset ?? 0
  const timeoutMs = options.timeoutMs ?? 3_000
  const params = new URLSearchParams({
    ano: String(request.year),
    mes: String(request.month),
    origem: request.originRegionCode,
    limit: String(limit),
    offset: String(offset),
  })
  if (request.destinationRegionCode) {
    params.set('destino', request.destinationRegionCode)
  }

  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  options.signal?.addEventListener('abort', abortFromCaller, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`/api/dev/v1/fluxos?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`fluxos HTTP ${response.status}`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new FlowContractError()
    }

    const resultado = validateResponse(payload, 'oracle-live', {
      ...request,
      limit,
      offset,
    })
    if (resultado.kind === 'absent') throw new FlowAbsentCompetenceError()
    if (resultado.kind === 'invalid') throw new FlowContractError()
    return resultado.data
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

export function getFlowSnapshot() {
  const resultado = validateResponse(flowSnapshot, 'snapshot')
  if (resultado.kind !== 'valid') {
    throw new Error('fixture de fluxos inválida')
  }
  return resultado.data
}

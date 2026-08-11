import statusSnapshot from '../../mocks/status.json'

export type StatusResponse = {
  status: 'ok'
  source: 'oracle-live' | 'snapshot'
  database_time: string
  data_through: string | null
  contract_version: typeof STATUS_CONTRACT_VERSION
}

export type PublishedStatusResponse = StatusResponse & {
  data_through: string
}

const STATUS_PATH = '/api/dev/v1/status'
export const STATUS_CONTRACT_VERSION = '0.3.0' as const

const DATA_THROUGH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const DATABASE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

export class StatusContractError extends Error {
  constructor() {
    super('contrato de status inválido')
    this.name = 'StatusContractError'
  }
}

function isValidDataThrough(value: unknown): value is string {
  return typeof value === 'string' && DATA_THROUGH_PATTERN.test(value)
}

function isValidDatabaseTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    DATABASE_TIME_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}

function isStatusResponse(
  value: unknown,
  expectedSource: StatusResponse['source'],
): value is StatusResponse {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    candidate.status === 'ok' &&
    candidate.source === expectedSource &&
    isValidDatabaseTime(candidate.database_time) &&
    (candidate.data_through === null || isValidDataThrough(candidate.data_through)) &&
    candidate.contract_version === STATUS_CONTRACT_VERSION
  )
}

function hasPublishedData(
  status: StatusResponse,
): status is PublishedStatusResponse {
  return status.data_through !== null
}

export async function fetchStatus(
  timeoutMs = 3_000,
): Promise<PublishedStatusResponse | null> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(STATUS_PATH, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (response.status === 204) return null
    if (!response.ok) throw new Error(`status HTTP ${response.status}`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new StatusContractError()
    }

    if (!isStatusResponse(payload, 'oracle-live')) throw new StatusContractError()
    return hasPublishedData(payload) ? payload : null
  } finally {
    window.clearTimeout(timeout)
  }
}

export function getStatusSnapshot(): PublishedStatusResponse {
  if (!isStatusResponse(statusSnapshot, 'snapshot') || !hasPublishedData(statusSnapshot)) {
    throw new Error('fixture de status inválida')
  }
  return statusSnapshot
}

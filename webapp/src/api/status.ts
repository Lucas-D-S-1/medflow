import statusSnapshot from '../fixtures/status.json'

export type StatusResponse = {
  status: 'ok'
  source: 'oracle-live' | 'snapshot'
  database_time: string
  data_through: string | null
  contract_version: string
}

export type PublishedStatusResponse = StatusResponse & {
  data_through: string
}

const STATUS_PATH = '/api/dev/v1/status'

function isStatusResponse(value: unknown): value is StatusResponse {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    candidate.status === 'ok' &&
    (candidate.source === 'oracle-live' || candidate.source === 'snapshot') &&
    typeof candidate.database_time === 'string' &&
    (candidate.data_through === null ||
      (typeof candidate.data_through === 'string' &&
        /^\d{4}-\d{2}$/.test(candidate.data_through))) &&
    typeof candidate.contract_version === 'string'
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

    const payload: unknown = await response.json()
    if (!isStatusResponse(payload)) throw new Error('contrato de status inválido')
    return hasPublishedData(payload) ? payload : null
  } finally {
    window.clearTimeout(timeout)
  }
}

export function getStatusSnapshot(): PublishedStatusResponse {
  if (!isStatusResponse(statusSnapshot) || !hasPublishedData(statusSnapshot)) {
    throw new Error('fixture de status inválida')
  }
  return statusSnapshot
}

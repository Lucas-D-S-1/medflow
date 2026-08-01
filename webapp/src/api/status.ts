import statusSnapshot from '../fixtures/status.json'

export type StatusResponse = {
  status: 'ok'
  source: 'oracle-live' | 'snapshot'
  database_time: string
  data_through: string
  contract_version: string
}

const STATUS_PATH = '/api/dev/v1/status'

function isStatusResponse(value: unknown): value is StatusResponse {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    candidate.status === 'ok' &&
    (candidate.source === 'oracle-live' || candidate.source === 'snapshot') &&
    typeof candidate.database_time === 'string' &&
    /^\d{4}-\d{2}$/.test(String(candidate.data_through)) &&
    typeof candidate.contract_version === 'string'
  )
}

export async function fetchStatus(timeoutMs = 3_000): Promise<StatusResponse | null> {
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
    return payload
  } finally {
    window.clearTimeout(timeout)
  }
}

export function getStatusSnapshot(): StatusResponse {
  if (!isStatusResponse(statusSnapshot)) {
    throw new Error('fixture de status inválida')
  }
  return statusSnapshot
}


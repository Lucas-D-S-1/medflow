import { API_BASE } from './base'
import { AssistantRequestError, containsOracleOrRawSql, type AssistantContext } from './assistente'

export const HAIKU_PILOT = import.meta.env.VITE_FLOWIA_HAIKU === '1'
const PATH = API_BASE.replace(/\/api\/(?:dev\/)?v1$/, '/api/flowia-haiku/v1') + '/perguntar'
const INTENTS = new Set(['regioes_iph', 'tendencia_regional', 'hospitais_pressao', 'hospital_pares',
  'especialidades', 'diagnosticos_dias', 'mortalidade_valor', 'fluxos_saida', 'conceito_fonte',
  'recusar_tempo_real', 'esclarecer', 'explorar'])

type Provenance = { dataset: string; competence: string | null; limit: number; limitations: string }
export type HaikuAnswer = { narrative: string; sql: string | null; warning: string | null; provenance?: Provenance }

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function validateHaikuAnswer(value: unknown): HaikuAnswer {
  if (!record(value) || !['ok', 'refused', 'clarify', 'no_data'].includes(String(value.status)) ||
      !INTENTS.has(String(value.intent)) || value.source !== 'oracle-approved-query' ||
      typeof value.narrative !== 'string' || !value.narrative.trim() ||
      containsOracleOrRawSql(value.narrative) || !record(value.provenance)) {
    throw new AssistantRequestError('A resposta veio incompleta. Use uma das sugestões ou os painéis.')
  }
  const p = value.provenance
  if (typeof p.dataset !== 'string' || !p.dataset.trim() ||
      !(p.competence === null || (typeof p.competence === 'string' && /^20\d{2}-(0[1-9]|1[0-2])$/.test(p.competence))) ||
      p.limit !== 5 || typeof p.limitations !== 'string' || !p.limitations.trim()) {
    throw new AssistantRequestError('A resposta não trouxe fonte e limites completos.')
  }
  return { narrative: value.narrative, sql: null, warning: null, provenance: p as Provenance }
}

export async function askFlowiaHaiku(question: string, context: AssistantContext, callerSignal?: AbortSignal): Promise<HaikuAnswer> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (callerSignal?.aborted) abort()
  callerSignal?.addEventListener('abort', abort, { once: true })
  const timer = window.setTimeout(abort, 5_500)
  try {
    const response = await fetch(PATH, {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ question, context: {
        competence: context.competence, region_code: context.region_code, hospital_cnes: context.hospital_cnes,
        specialty_code: context.specialties.length === 1 ? context.specialties[0].code : null,
      } }),
    })
    if (!response.ok) throw new Error('http')
    const value: unknown = await response.json()
    if (record(value) && value.status === 'unavailable') throw new Error('unavailable')
    // Exploracao continua no fluxo OCI existente, acionado explicitamente no servidor.
    if (record(value) && value.source === 'oracle-select-ai' && value.status === 'ok' &&
        typeof value.narrative === 'string' && !containsOracleOrRawSql(value.narrative)) {
      return { narrative: value.narrative, sql: null, warning: 'Análise exploratória. Confira competência, fonte e limites nos painéis.' }
    }
    return validateHaikuAnswer(value)
  } catch {
    throw new AssistantRequestError('A classificação não respondeu a tempo ou está indisponível. As explicações e os painéis continuam disponíveis.')
  } finally {
    window.clearTimeout(timer)
    callerSignal?.removeEventListener('abort', abort)
  }
}

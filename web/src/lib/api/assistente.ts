import { apiUrl } from './base'

export type AssistantResponse = {
  status: 'ok'
  source: 'oracle-select-ai'
  response_id: number
  narrative: string
  sql: string | null
  warning: string | null
}

/**
 * Uma rodada anterior da conversa, enviada para o modelo resolver pergunta
 * elíptica: "qual o IPH de São Paulo?" seguido de "e o TMH?" só faz sentido
 * com a anterior à vista.
 *
 * Vão as duas pontas, pergunta e resposta, porque o assunto pode estar em
 * qualquer uma delas: o usuário diz "e o TMH?" sobre a região que **a
 * resposta** citou, não a que ele digitou.
 */
export type AssistantTurn = {
  question: string
  answer: string
}

export type AssistantContext = {
  route: 'regional' | 'hospital' | 'metodologia'
  competence: string | null
  region_code: string | null
  region_name: string | null
  macroregion_code: string | null
  macroregion_name: string | null
  macroregion_label: string | null
  hospital_cnes: string | null
  active_analysis: string
  history: AssistantTurn[]
}

const ASSISTANT_PATH = apiUrl('/assistente/perguntar')

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isAssistantResponse(value: unknown): value is AssistantResponse {
  if (!isRecord(value)) return false

  return (
    value.status === 'ok' &&
    value.source === 'oracle-select-ai' &&
    typeof value.response_id === 'number' &&
    Number.isInteger(value.response_id) &&
    value.response_id > 0 &&
    typeof value.narrative === 'string' &&
    value.narrative.trim().length > 0 &&
    (value.sql === null || typeof value.sql === 'string') &&
    (value.warning === null || typeof value.warning === 'string')
  )
}

export class AssistantRequestError extends Error {
  constructor(message = 'O Oracle Select AI não respondeu agora.') {
    super(message)
    this.name = 'AssistantRequestError'
  }
}

/**
 * O prazo é medido, não arbitrado.
 *
 * Uma pergunta livre são duas gerações do Select AI (`showsql` e `narrate`)
 * sobre um modelo semântico de 22 mil caracteres, e isso não cabe nos 3s dos
 * endpoints determinísticos. Medindo dez perguntas contra o Oracle em
 * 02/09/2026, com `meta.llama-3.3-70b-instruct`, as respostas corretas se
 * distribuíram assim:
 *
 *     18,1s  20,2s  20,6s  21,9s  22,9s  23,3s  24,8s        36,3s
 *
 * Sete se agrupam entre 18 e 25s, e uma — justamente a pergunta sugerida da
 * tela regional, sobre concentração por especialidade — fica isolada em 36s.
 * Com o teto anterior de 20s, o Oracle respondia certo e o navegador desistia
 * antes: a tela exibia "não respondeu agora" para 8 das 10. Um teto de 35s
 * ainda cortaria a de 36,3s.
 *
 * 45s cobre a distribuição inteira com margem. É muita espera, e por isso o
 * widget mostra estado de carregamento; o que não se pode é desistir de uma
 * resposta que estava a caminho.
 */
const ASSISTANT_TIMEOUT_MS = 45_000

export async function askOracleSelectAi(
  question: string,
  context: AssistantContext,
  timeoutMs = ASSISTANT_TIMEOUT_MS,
): Promise<AssistantResponse> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(ASSISTANT_PATH, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, context }),
      signal: controller.signal,
    })

    if (!response.ok) {
      let message = response.status === 429
        ? 'O limite diário da demonstração foi atingido.'
        : 'O Oracle Select AI não respondeu agora.'
      try {
        const payload: unknown = await response.json()
        if (isRecord(payload) && typeof payload.message === 'string') {
          message = payload.message
        }
      } catch {
        // A mensagem estável acima é suficiente quando o ORDS não devolve JSON.
      }
      throw new AssistantRequestError(message)
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new AssistantRequestError('O Oracle Select AI devolveu uma resposta inválida.')
    }

    if (!isAssistantResponse(payload)) {
      throw new AssistantRequestError('O contrato do assistente veio diferente do esperado.')
    }
    return payload
  } catch (error) {
    if (error instanceof AssistantRequestError) throw error
    throw new AssistantRequestError()
  } finally {
    window.clearTimeout(timeout)
  }
}

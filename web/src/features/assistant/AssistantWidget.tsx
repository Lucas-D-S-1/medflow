import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { askOracleSelectAi, AssistantRequestError } from '../../lib/api/assistente'
import { useSource } from '../../shared/SourceContext'
import './AssistantWidget.css'

type RouteKey = 'regional' | 'fluxos' | 'hospital' | 'metodologia'
type Answer = {
  text: string
  source: 'Consulta MedFlow' | 'Oracle Select AI'
  sql?: string | null
  warning?: string | null
}

const SESSION_LIMIT = 5
const SESSION_KEY = 'medflow-select-ai-questions'

const quickQuestions: Record<RouteKey, string[]> = {
  regional: [
    'O que é IPH?',
    'Quais regiões devo investigar?',
    'Como interpretar o mapa?',
  ],
  fluxos: [
    'O que significa evasão observada?',
    'O que é ICSAP?',
    'Por que pacientes saem da região?',
  ],
  hospital: [
    'O que é IPR?',
    'Por que o IPR pode ficar indisponível?',
    'Como comparar hospitais corretamente?',
  ],
  metodologia: [
    'De onde vêm os dados?',
    'Por que os dados são M-2?',
    'Por que usar Oracle Autonomous Database?',
  ],
}

const routeNames: Record<RouteKey, string> = {
  regional: 'visão regional',
  fluxos: 'fluxos assistenciais',
  hospital: 'visão hospitalar',
  metodologia: 'metodologia',
}

function routeKey(pathname: string): RouteKey {
  if (pathname.startsWith('/fluxos')) return 'fluxos'
  if (pathname.startsWith('/hospital')) return 'hospital'
  if (pathname.startsWith('/metodologia')) return 'metodologia'
  return 'regional'
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function sessionUsage() {
  const value = Number(window.sessionStorage.getItem(SESSION_KEY) ?? '0')
  return Number.isInteger(value) && value >= 0 ? value : 0
}

function AssistantRobot({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`assistant-robot${compact ? ' compact' : ''}`} aria-hidden="true">
      <span className="assistant-robot-antenna" />
      <span className="assistant-robot-face">
        <span className="assistant-robot-eye" />
        <span className="assistant-robot-eye" />
        <span className="assistant-oracle-mark">O</span>
      </span>
    </span>
  )
}

export default function AssistantWidget() {
  const location = useLocation()
  const { sourceState } = useSource()
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [usage, setUsage] = useState(sessionUsage)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentRoute = routeKey(location.pathname)
  const sourceData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data
      : null

  const selectedRegion = useMemo(() => {
    if (!sourceData) return null
    const params = new URLSearchParams(location.search)
    const code = params.get('regiao')
    return sourceData.regions.items.find((item) => item.region_code === code)
      ?? sourceData.regions.items[0]
      ?? null
  }, [location.search, sourceData])

  useEffect(() => {
    if (isOpen) window.setTimeout(() => inputRef.current?.focus(), 80)
  }, [isOpen])

  useEffect(() => {
    setAskedQuestion(null)
    setAnswer(null)
    setQuestion('')
  }, [location.pathname])

  function localAnswer(rawQuestion: string): Answer | null {
    const normalized = normalize(rawQuestion)
    const methodology = sourceData?.methodology

    if (/\biph\b|pressao hospitalar/.test(normalized)) {
      const regionalContext = selectedRegion
        ? ` Na competência selecionada, ${selectedRegion.region_name} apresenta IPH estimado de ${selectedRegion.iph_percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%.`
        : ''
      return {
        source: 'Consulta MedFlow',
        text: `IPH é o Índice de Pressão Hospitalar: pacientes-dia estimados divididos pela capacidade mensal de leitos SUS declarados no CNES.${regionalContext} É um sinal para priorizar investigação, não uma taxa de ocupação real.`,
      }
    }

    if (/investigar|priorizar|maiores regioes|ranking/.test(normalized)) {
      const leaders = sourceData?.regions.items
        .slice()
        .sort((left, right) => right.iph_percent - left.iph_percent)
        .slice(0, 3)
      return {
        source: 'Consulta MedFlow',
        text: leaders?.length
          ? `Comece por ${leaders.map((item) => `${item.region_name} (${item.iph_percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`).join(', ')}. O ranking aponta sinais mais altos de IPH na competência; ele serve para triagem, não para concluir causa ou qualidade.`
          : 'Comece pelas regiões com maior IPH, confirme tamanho da amostra e tendência mensal e só então aprofunde fluxos e hospitais.',
      }
    }

    if (/interpretar.*mapa|mapa.*interpretar|cores.*mapa/.test(normalized)) {
      return {
        source: 'Consulta MedFlow',
        text: 'Os tons mais escuros indicam IPH estimado mais alto na competência escolhida. Selecione uma região para ver valor, amostra e tendência; compare também internações e leitos declarados antes de priorizar uma análise.',
      }
    }

    if (/evasao|saem da regiao|fora da regiao/.test(normalized)) {
      return {
        source: 'Consulta MedFlow',
        text: 'Evasão observada é a parcela de internações de residentes atendida em outra região de saúde de São Paulo. Ela mostra deslocamento assistencial intrastadual observado; não prova falta de oferta e não mede saídas para outros estados.',
      }
    }

    if (/\bicsap\b|atencao primaria/.test(normalized)) {
      return {
        source: 'Consulta MedFlow',
        text: 'ICSAP são Internações por Condições Sensíveis à Atenção Primária, conforme a Portaria SAS/MS 221/2008. O indicador ajuda a examinar acesso e efetividade territorial da atenção básica, mas não classifica um caso individual como evitável.',
      }
    }

    if (/ipr.*indisponivel|amostra insuficiente|benchmark.*zero/.test(normalized)) {
      return {
        source: 'Consulta MedFlow',
        text: 'O IPR fica indisponível quando a combinação não alcança os cortes mínimos de volume, hospitais comparáveis ou meses observados, ou quando o benchmark é zero. O MedFlow prefere mostrar “amostra insuficiente” a publicar uma comparação instável.',
      }
    }

    if (/\bipr\b|performance relativa/.test(normalized)) {
      return {
        source: 'Consulta MedFlow',
        text: 'IPR é o Índice de Performance Relativa: compara a permanência observada do hospital com um benchmark de pares no mesmo recorte clínico. Valor acima de 1 sugere permanência maior que a referência; não é nota de qualidade nem medida de desfecho.',
      }
    }

    if (/comparar hospitais|comparacao.*hospital|hospital.*comparar/.test(normalized)) {
      return {
        source: 'Consulta MedFlow',
        text: 'Compare hospitais na mesma competência e região, confirme volume de internações e use IPR, permanência e perfil clínico em conjunto. Diferenças de complexidade e amostras pequenas impedem tratar um único indicador como ranking de qualidade.',
      }
    }

    if (/fonte|de onde.*dados|datasus|ibge|cnes|sih/.test(normalized)) {
      const sources = methodology?.sources.map((item) => item.label).join(', ')
      return {
        source: 'Consulta MedFlow',
        text: `Os indicadores combinam ${sources || 'SIH/SUS, CNES, IBGE e referências oficiais do Ministério da Saúde'}. A Bronze preserva a origem, a Silver padroniza os fatos e a Gold no Oracle publica somente métricas reconciliadas para o site.`,
      }
    }

    if (/m 2|defasagem|atraso|por que.*competencia|atualizacao dos dados/.test(normalized)) {
      const competence = sourceData?.status.data_through
      const suffix = competence
        ? ` A competência publicada agora é ${competence.slice(5, 7)}/${competence.slice(0, 4)}.`
        : ''
      return {
        source: 'Consulta MedFlow',
        text: `Os arquivos mensais do DATASUS passam por fechamento, disponibilização e validação antes da carga. Por isso o produto adota M-2 como corte operacional seguro e exibe explicitamente a competência, sem chamar o dado de tempo real.${suffix}`,
      }
    }

    if (/oracle|autonomous|banco|arquitetura/.test(normalized)) {
      return {
        source: 'Consulta MedFlow',
        text: 'O Oracle Autonomous Database concentra a Gold, as views de contrato, a API ORDS e o Select AI. A escolha reduz componentes operacionais, mantém cálculo e auditoria perto dos dados e cabe no Always Free para o volume atual da demonstração.',
      }
    }

    return null
  }

  async function ask(rawQuestion: string) {
    const cleanQuestion = rawQuestion.trim().slice(0, 300)
    if (!cleanQuestion || isLoading) return

    setAskedQuestion(cleanQuestion)
    setQuestion('')
    setAnswer(null)

    const deterministic = localAnswer(cleanQuestion)
    if (deterministic) {
      setAnswer(deterministic)
      return
    }

    if (usage >= SESSION_LIMIT) {
      setAnswer({
        source: 'Consulta MedFlow',
        text: 'O limite de 5 perguntas livres nesta sessão foi atingido. As sugestões continuam disponíveis e não consomem Select AI.',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await askOracleSelectAi(cleanQuestion)
      const nextUsage = usage + 1
      window.sessionStorage.setItem(SESSION_KEY, String(nextUsage))
      setUsage(nextUsage)
      setAnswer({
        source: 'Oracle Select AI',
        text: response.narrative,
        sql: response.sql,
        warning: response.warning,
      })
    } catch (error) {
      setAnswer({
        source: 'Consulta MedFlow',
        text: error instanceof AssistantRequestError
          ? `${error.message} Você ainda pode usar as perguntas sugeridas.`
          : 'O assistente não respondeu agora. Você ainda pode usar as perguntas sugeridas.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void ask(question)
  }

  return (
    <aside className="assistant-widget" aria-label="Assistente MedFlow">
      {isOpen ? (
        <section className="assistant-panel" id="medflow-assistant-panel" aria-live="polite">
          <header className="assistant-header">
            <AssistantRobot compact />
            <div>
              <span className="assistant-eyebrow">ORACLE SELECT AI</span>
              <h2>Posso ajudar?</h2>
              <p>Contexto: {routeNames[currentRoute]}</p>
            </div>
            <button
              className="assistant-close"
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar assistente"
            >
              ×
            </button>
          </header>

          <div className="assistant-body">
            {!askedQuestion && (
              <p className="assistant-intro">
                Pergunte sobre os indicadores ou escolha um atalho desta tela.
              </p>
            )}

            <div className="assistant-suggestions" aria-label="Perguntas sugeridas">
              {quickQuestions[currentRoute].map((suggestion) => (
                <button type="button" key={suggestion} onClick={() => void ask(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>

            {askedQuestion && (
              <div className="assistant-conversation">
                <p className="assistant-question">{askedQuestion}</p>
                {isLoading ? (
                  <div className="assistant-thinking" role="status">
                    <span /> Consultando a Gold com Select AI…
                  </div>
                ) : answer ? (
                  <article className="assistant-answer">
                    <span className={answer.source === 'Oracle Select AI' ? 'ai-source' : ''}>
                      {answer.source}
                    </span>
                    <p>{answer.text}</p>
                    {answer.warning && <p className="assistant-warning">{answer.warning}</p>}
                    {answer.sql && (
                      <details>
                        <summary>Ver SQL gerado e validado</summary>
                        <pre>{answer.sql}</pre>
                      </details>
                    )}
                  </article>
                ) : null}
              </div>
            )}
          </div>

          <form className="assistant-form" onSubmit={submit}>
            <label htmlFor="assistant-question">Faça outra pergunta</label>
            <div>
              <input
                ref={inputRef}
                id="assistant-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={300}
                placeholder="Ex.: compare pressão e evasão"
                disabled={isLoading}
              />
              <button type="submit" disabled={!question.trim() || isLoading} aria-label="Enviar pergunta">
                →
              </button>
            </div>
            <small>
              Sugestões não usam IA · perguntas livres: {usage}/{SESSION_LIMIT}
            </small>
          </form>
        </section>
      ) : null}

      {!isOpen && (
        <button
          className="assistant-launcher"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded="false"
          aria-controls="medflow-assistant-panel"
        >
          <AssistantRobot />
          <span>
            <small>Assistente MedFlow</small>
            <strong>Posso ajudar?</strong>
          </span>
        </button>
      )}
    </aside>
  )
}

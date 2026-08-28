import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useActiveSection } from '../../shared/useActiveSection'
import { AssistantRequestError, askOracleSelectAi, type AssistantContext } from '../../lib/api/assistente'
import { useSource } from '../../shared/SourceContext'
import { formatRegionalNetwork } from '../../shared/territory'
import './AssistantWidget.css'

type RouteKey = 'regional' | 'hospital' | 'metodologia'
type Answer = {
  text: string
  sql?: string | null
  warning?: string | null
}


const quickQuestions: Record<RouteKey, string[]> = {
  regional: [
    'O que é IPH?',
    'O que é uma rede regional?',
    'Quais regiões devo investigar?',
    'Como interpretar o mapa?',
  ],
  hospital: [
    'Qual o critério para dois hospitais serem pares?',
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
  hospital: 'visão hospitalar',
  metodologia: 'metodologia',
}

const routeAnalysis: Record<RouteKey, string> = {
  regional: 'pressão hospitalar regional e tendência',
  hospital: 'hospitais, permanência, perfil clínico e IPR',
  metodologia: 'fontes, fórmulas, cobertura e limitações',
}

const ANALYSIS_SECTIONS = ['regional', 'hospital']

function isRouteKey(value: string): value is RouteKey {
  return value === 'regional' || value === 'hospital'
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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
  const inputRef = useRef<HTMLInputElement>(null)
  // A FlowIA acompanha a etapa visível, não a rota: na página contínua as
  // três seções dividem o mesmo endereço.
  const activeSection = useActiveSection(
    ANALYSIS_SECTIONS,
    location.pathname === '/',
    location.hash,
  )
  const currentRoute: RouteKey = location.pathname.startsWith('/metodologia')
    ? 'metodologia'
    : isRouteKey(activeSection)
      ? activeSection
      : 'regional'
  const sourceData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data
      : null

  const selectedRegion = useMemo(() => {
    if (!sourceData) return null
    const params = new URLSearchParams(location.search)
    const code = params.get('regiao')
    // Sem região na URL o contexto é o panorama. Cair na primeira região da
    // lista fazia a FlowIA responder sobre um território que o usuário não
    // escolheu, e afirmar isso com a mesma confiança de uma escolha real.
    return sourceData.regions.items.find((item) => item.region_code === code) ?? null
  }, [location.search, sourceData])

  useEffect(() => {
    if (isOpen) window.setTimeout(() => inputRef.current?.focus(), 80)
  }, [isOpen])

  useEffect(() => {
    setAskedQuestion(null)
    setAnswer(null)
    setQuestion('')
  }, [currentRoute])

  function localAnswer(rawQuestion: string): Answer | null {
    const normalized = normalize(rawQuestion)
    const methodology = sourceData?.methodology
    const pedidoExplicacao =
      /o que (e|é)|que significa|explique|defina|como interpretar|pra que serve/.test(
        normalized,
      )

    if (pedidoExplicacao && /(\biph\b|pressao hospitalar)/.test(normalized)) {
      const regionalContext = selectedRegion
        ? ` Na competência selecionada, ${selectedRegion.region_name} apresenta IPH estimado de ${selectedRegion.iph_percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%.`
        : ''
      return {
        text: `IPH é o Índice de Pressão Hospitalar: pacientes-dia estimados divididos pela capacidade mensal de leitos SUS declarados no CNES.${regionalContext} É um sinal para priorizar investigação, não uma taxa de ocupação real.`,
      }
    }

    if (pedidoExplicacao && /(\btmh\b|mortalidade hospitalar)/.test(normalized)) {
      return {
        text: 'TMH é a Taxa de Mortalidade Hospitalar: óbitos divididos por internações novas, multiplicados por 100. É mortalidade observada, sem ajuste de risco clínico; serve para triagem de variação e não mede causalmente a qualidade do hospital.',
      }
    }

    if (pedidoExplicacao && /(\bcmi\b|custo medio|valor medio)/.test(normalized)) {
      return {
        text: 'CMI é o Custo Médio da Internação. O CMI nominal divide o valor SIH aprovado das internações novas pelo número de internações; o CMI real aplica o fator de correção IPCA da competência. São valores administrativos aprovados, não o custo econômico total do atendimento.',
      }
    }

    if (
      pedidoExplicacao &&
      /(\bis\b|indice sazonal|comparacao sazonal|sazonalidade)/.test(normalized)
    ) {
      return {
        text: 'IS é o Índice Sazonal: compara as internações novas de 2026 com a média do mesmo mês em 2024 e 2025. É uma comparação histórica de sazonalidade, não uma previsão definitiva.',
      }
    }

    if (
      pedidoExplicacao &&
      /(\brras\b|rede regional|macrorregiao|macro regiao)/.test(normalized)
    ) {
      const network = selectedRegion
        ? ` A região selecionada pertence à ${formatRegionalNetwork(selectedRegion.macroregion_name)}.`
        : ''
      return {
        text: `Rede Regional de Atenção à Saúde (RRAS) é um agrupamento de uma ou mais Regiões de Saúde criado para articular serviços e fluxos assistenciais de diferentes complexidades.${network} Não é uma zona da cidade nem uma coordenadoria municipal.`,
      }
    }

    if (/investigar|priorizar|maiores regioes|ranking/.test(normalized)) {
      const leaders = sourceData?.regions.items
        .slice()
        .sort((left, right) => right.iph_percent - left.iph_percent)
        .slice(0, 3)
      return {
        text: leaders?.length
          ? `Comece por ${leaders.map((item) => `${item.region_name} (${item.iph_percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`).join(', ')}. O ranking aponta sinais mais altos de IPH na competência; ele serve para triagem, não para concluir causa ou qualidade.`
          : 'Comece pelas regiões com maior IPH, confirme tamanho da amostra e tendência mensal e só então aprofunde fluxos e hospitais.',
      }
    }

    if (/interpretar.*mapa|mapa.*interpretar|cores.*mapa/.test(normalized)) {
      return {
        text: 'Os tons mais escuros indicam IPH estimado mais alto na competência escolhida. Selecione uma região para ver valor, amostra e tendência; compare também internações e leitos declarados antes de priorizar uma análise.',
      }
    }

    if (/evasao|saem da regiao|fora da regiao/.test(normalized)) {
      return {
        text: 'Evasão observada é a parcela de internações de residentes atendida em outra região de saúde de São Paulo. Ela mostra deslocamento assistencial intrastadual observado; não prova falta de oferta e não mede saídas para outros estados.',
      }
    }

    if (pedidoExplicacao && /(\bicsap\b|atencao primaria)/.test(normalized)) {
      return {
        text: 'ICSAP são Internações por Condições Sensíveis à Atenção Primária, conforme a Portaria SAS/MS 221/2008. O indicador ajuda a examinar acesso e efetividade territorial da atenção básica, mas não classifica um caso individual como evitável.',
      }
    }

    if (/ipr.*indisponivel|amostra insuficiente|benchmark.*zero/.test(normalized)) {
      return {
        text: 'O IPR fica indisponível quando a combinação não alcança os cortes mínimos de volume, hospitais comparáveis ou meses observados, ou quando o benchmark é zero. O MedFlow prefere mostrar “amostra insuficiente” a publicar uma comparação instável.',
      }
    }

    if (
      (pedidoExplicacao && /(\bipr\b|performance relativa)/.test(normalized)) ||
      (/\bipr\b/.test(normalized) && /acima de 1|ruim|bom|qualidade/.test(normalized))
    ) {
      return {
        text: 'IPR é o Índice de Performance Relativa: compara a permanência observada do hospital com um benchmark de pares no mesmo recorte clínico. Valor acima de 1 sugere permanência maior que a referência; não é nota de qualidade nem medida de desfecho.',
      }
    }

    if (/comparar hospitais|comparacao.*hospital|hospital.*comparar/.test(normalized)) {
      return {
        text: 'Compare hospitais na mesma competência e região, confirme volume de internações e use IPR, permanência e perfil clínico em conjunto. Diferenças de complexidade e amostras pequenas impedem tratar um único indicador como ranking de qualidade.',
      }
    }

    // Critérios de comparação são regra de produto, não pergunta de dado: eles
    // vivem no front e não existem como coluna na Gold. Responder aqui é mais
    // correto — e mais barato — do que mandar o modelo procurar no banco o que
    // o banco não tem.
    if (/criterio.*par|pares.*criterio|como.*(escolhe|define|monta).*par|quem.*e.*par|grupo de par|hospitais? (sao|são) (comparados|pares)|comparad. com quem/.test(normalized)) {
      return {
        text: 'Há dois grupos de comparação, e você escolhe qual usar. "Mesmo tipo e porte" reúne hospitais com o mesmo tipo de unidade no CNES e a mesma faixa de leitos SUS (até 24, 25 a 59, 60 a 149, 150 a 299, 300 ou mais), em todo o estado. "Mesma região" reúne os hospitais do mesmo território. Em qualquer um deles o próprio hospital sai do grupo, pela mesma razão que o IPR exclui o hospital do benchmark regional: comparar alguém consigo mesmo puxa a mediana na direção dele. O grupo precisa de pelo menos três pares com valor calculado; abaixo disso a faixa não é publicada.',
      }
    }

    if (/faixa|mediana.*par|quartil|barra de posicao|o que e tipico|percentil/.test(normalized)) {
      return {
        text: 'A barra sob cada indicador mostra como os pares se distribuem: a área destacada é a metade central do grupo, entre o primeiro e o terceiro quartil, e o traço é a mediana. O ponto é este hospital. Ela responde o que é típico entre semelhantes, não o que é bom: se estar acima é bom ou ruim depende do indicador e do contexto clínico, e essa leitura continua com quem analisa. Não há ajuste de risco.',
      }
    }

    if (/hospital.?dia|permanencia.*menos de um dia|giro|396|iph.*acima de 100/.test(normalized)) {
      return {
        text: 'Em unidades com permanência média abaixo de um dia o IPH deixa de medir ocupação. Ele divide pacientes-dia por leitos-dia declarados, e a reconstrução do SIH atribui ao menos um dia por internação — num hospital-dia o paciente não passa a noite, então o índice passa a medir giro sobre capacidade. O Hospital Dia Butantã aparece com 396,7% tendo usado 20 dos 60 leitos-dia disponíveis. Comparar com unidades do mesmo tipo mantém a comparação justa, mas não transforma o número em taxa de ocupação, e a tela avisa isso.',
      }
    }

    if (/sinais? acesos|quintil|placar|quantos sinais|indice de priorizacao/.test(normalized)) {
      return {
        text: 'O placar conta em quantos dos seis indicadores a região está no quintil mais alto do recorte visível: pressão sobre leitos, mortalidade observada, permanência média, custo médio, atendidos fora da região e ICSAP. É contagem de sinais, não nota de qualidade — IPH, TMH e CMI são declarados no próprio produto como não sendo medidas de qualidade, e somá-los numa nota afirmaria o que cada um deles nega. Os cortes saem do recorte que está na tela: filtrar uma rede regional muda os limiares.',
      }
    }

    if (/fonte|de onde.*dados|datasus|ibge|cnes|sih/.test(normalized)) {
      const sources = methodology?.sources.map((item) => item.label).join(', ')
      return {
        text: `Os indicadores combinam ${sources || 'SIH/SUS, CNES, IBGE e referências oficiais do Ministério da Saúde'}. A Bronze preserva a origem, a Silver padroniza os fatos e a Gold no Oracle publica somente métricas reconciliadas para o site.`,
      }
    }

    if (/mes.*mais recente|ultimo mes|ate quando.*dados|dados.*ate quando|competencia.*mais recente/.test(normalized)) {
      const competence = sourceData?.status.data_through
      return {
        text: competence
          ? `Os dados publicados vão até ${competence.slice(5, 7)}/${competence.slice(0, 4)}, considerando a competência de processamento mais recente disponível na Gold.`
          : 'A competência mais recente aparece na barra de contexto assim que os dados terminam de carregar.',
      }
    }

    if (/m 2|defasagem|atraso|por que.*competencia|atualizacao dos dados/.test(normalized)) {
      const competence = sourceData?.status.data_through
      const suffix = competence
        ? ` A competência publicada agora é ${competence.slice(5, 7)}/${competence.slice(0, 4)}.`
        : ''
      return {
        text: `Os arquivos mensais do DATASUS passam por fechamento, disponibilização e validação antes da carga. Por isso o produto adota M-2 como corte operacional seguro e exibe explicitamente a competência, sem chamar o dado de tempo real.${suffix}`,
      }
    }

    if (/oracle|autonomous|banco|arquitetura/.test(normalized)) {
      return {
        text: 'O Oracle Autonomous Database concentra a Gold, as views de contrato, a API ORDS e o Select AI. Na matriz de decisão deste MVP, ele evita uma API própria, mantém auditoria perto dos dados e acomoda o volume atual no ambiente Always Free já provisionado.',
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

    setIsLoading(true)
    try {
      const params = new URLSearchParams(location.search)
      const context: AssistantContext = {
        route: currentRoute,
        competence: sourceData?.status.data_through ?? null,
        region_code: selectedRegion?.region_code ?? params.get('regiao'),
        region_name: selectedRegion?.region_name ?? null,
        macroregion_code: selectedRegion?.macroregion_code ?? null,
        macroregion_name: selectedRegion?.macroregion_name ?? null,
        macroregion_label: selectedRegion
          ? formatRegionalNetwork(selectedRegion.macroregion_name)
          : null,
        hospital_cnes: params.get('hospital'),
        active_analysis: routeAnalysis[currentRoute],
      }
      const response = await askOracleSelectAi(cleanQuestion, context)
      setAnswer({
        text: response.narrative,
        sql: response.sql,
        warning: response.warning,
      })
    } catch (error) {
      // O cliente já distingue cota estourada, contrato inválido e tempo
      // esgotado. Trocar tudo por uma frase única fazia o produto parecer
      // incapaz quando o problema era outro, e apagava a pista do diagnóstico.
      setAnswer({
        text:
          error instanceof AssistantRequestError
            ? `${error.message} Tente uma das sugestões abaixo.`
            : 'Não consegui responder essa pergunta agora. Tente uma das sugestões.',
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
    <aside className="assistant-widget" aria-label="FlowIA, assistente do MedFlow">
      {isOpen ? (
        <section className="assistant-panel" id="medflow-assistant-panel" aria-live="polite">
          <header className="assistant-header">
            <AssistantRobot compact />
            <div>
              <span className="assistant-eyebrow">FLOWIA · ORACLE SELECT AI</span>
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
                <button
                  type="button"
                  key={suggestion}
                  disabled={!sourceData || isLoading}
                  onClick={() => void ask(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {askedQuestion && (
              <div className="assistant-conversation">
                <p className="assistant-question">{askedQuestion}</p>
                {isLoading ? (
                  <div className="assistant-thinking" role="status">
                    <span /> Consultando os dados…
                  </div>
                ) : answer ? (
                  <article className="assistant-answer">
                    <span>FlowIA</span>
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
            <small>FlowIA · assistente da análise</small>
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
            <small>FlowIA</small>
            <strong>Posso ajudar?</strong>
          </span>
        </button>
      )}
    </aside>
  )
}

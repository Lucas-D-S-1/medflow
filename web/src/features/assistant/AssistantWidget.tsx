import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useActiveSection } from '../../shared/useActiveSection'
import {
  AssistantRequestError,
  askOracleSelectAi,
  type AssistantContext,
  type AssistantTurn,
} from '../../lib/api/assistente'
import { useSource } from '../../shared/SourceContext'
import { formatRegionalNetwork } from '../../shared/territory'
import './AssistantWidget.css'

type RouteKey = 'regional' | 'hospital' | 'metodologia'
type Answer = {
  text: string
  sql?: string | null
  warning?: string | null
}

/** Uma rodada completa da conversa, já respondida. */
type Exchange = {
  id: number
  question: string
  answer: Answer
}

/**
 * Quantas rodadas anteriores acompanham a próxima pergunta.
 *
 * Duas, não a conversa inteira: o contexto tem teto de caracteres no banco, e
 * o que resolve "e o TMH?" é a rodada imediatamente anterior. Arrastar dez
 * rodadas gastaria o teto com assunto velho e empurraria o recente para fora.
 */
const HISTORY_TURNS = 2


const quickQuestions: Record<RouteKey, string[]> = {
  regional: [
    'O que é IPH?',
    'O que é uma rede regional?',
    'Quais regiões devo investigar?',
    'Como interpretar o mapa?',
  ],
  hospital: [
    'Qual o critério para dois hospitais serem pares?',
    'O que é IPE?',
    'Qual a diferença entre IPE e IPR?',
    'Como comparar hospitais corretamente?',
  ],
  metodologia: [
    'De onde vêm os dados?',
    'Por que os dados são M-2?',
    'Por que usar Oracle Autonomous Database?',
  ],
}

/**
 * A pergunta que só existe depois que o usuário escolhe o território.
 *
 * Escolhida a região, "quais regiões devo investigar?" já foi respondida pelo
 * próprio clique, e a pergunta seguinte da jornada deixa de ser onde e passa a
 * ser quem: qual hospital concentra o atendimento que motivou a investigação.
 * A resposta é ranking sobre a Gold, então ela vai ao Select AI — não há regra
 * de produto local que a responda.
 *
 * **O vocabulário é o da base, de propósito.** `dim_especialidade` publica as
 * especialidades do SIH — Cirurgia, Clínica médica, Obstetrícia, Pediatria e
 * mais onze —, e ortopedia não é uma delas. Pedir uma especialidade que a base
 * não tem convida o modelo a responder pela mais próxima e a narrá-la com o
 * rótulo da pergunta, que é exatamente o segundo limite medido em 23/08/2026.
 * Cirurgia é o grão que a Gold tem e é o que a espera por avaliação
 * pré-cirúrgica atravessa.
 */
const PERGUNTA_CONCENTRACAO =
  'Quais hospitais concentram internações em cirurgia nesta região?'

/** A pergunta que a escolha da região torna obsoleta. */
const PERGUNTA_TRIAGEM_REGIONAL = 'Quais regiões devo investigar?'

/**
 * Quatro continuam sendo quatro: a pergunta nova entra no lugar da que o
 * clique do usuário já respondeu, e não empilhada sobre ela.
 */
function sugestoesPara(route: RouteKey, comRegiao: boolean): string[] {
  if (route !== 'regional' || !comRegiao) return quickQuestions[route]
  return [
    PERGUNTA_CONCENTRACAO,
    ...quickQuestions.regional.filter((item) => item !== PERGUNTA_TRIAGEM_REGIONAL),
  ]
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
  // O fio inteiro, não a última rodada. Guardar só uma fazia a pergunta
  // seguinte apagar a anterior da tela e da memória do modelo.
  const [thread, setThread] = useState<Exchange[]>([])
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
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

  const suggestedQuestions = useMemo(
    () => sugestoesPara(currentRoute, selectedRegion !== null),
    [currentRoute, selectedRegion],
  )

  useEffect(() => {
    if (isOpen) window.setTimeout(() => inputRef.current?.focus(), 80)
  }, [isOpen])

  // Mudar de etapa não apaga a conversa: quem estava investigando território e
  // desce para hospital continua a mesma investigação, e perder o fio ali era
  // justamente a queixa. O contexto enviado ao modelo acompanha a etapa nova;
  // o que já foi dito continua na tela.
  useEffect(() => {
    setQuestion('')
  }, [currentRoute])

  // Rola o corpo do painel, não a página: `scrollIntoView` levaria a janela
  // junto e tiraria a análise da vista para mostrar o chat.
  useEffect(() => {
    if (!isOpen) return
    const body = bodyRef.current
    if (body) body.scrollTop = body.scrollHeight
  }, [isOpen, isLoading, thread.length, pendingQuestion])

  function localAnswer(rawQuestion: string): Answer | null {
    const normalized = normalize(rawQuestion)
    const methodology = sourceData?.methodology
    // "o que há no índice sazonal?" não casava com nada e ia parar no modelo,
    // que devolvia a definição seguida de um ranking que ninguém pediu — o
    // modo narrate do Select AI sempre consulta.
    const pedidoExplicacao =
      /o que (e|é|ha|tem|quer dizer)|que significa|explique|explica|defina|como (interpretar|funciona|ler|leio)|(pra|para) que serve|me diga o que/.test(
        normalized,
      )

    // "quais hospitais concentram internações em cirurgia nesta região?" é
    // ranking, e ranking mora no banco. A regra de participação abaixo foi
    // escrita para explicar a fatia do hospital que está aberto na tela, e sem
    // esta ressalva ela engolia a pergunta pelo verbo "concentra" — devolvendo
    // a definição de uma coluna no lugar da lista de hospitais.
    //
    // Reconhecer só "quais hospitais" não bastava: pedir o mesmo ranking com
    // outra sintaxe caía de novo na definição. Medido no site publicado,
    // "onde se concentram as internações cirúrgicas desta região?" respondia
    // localmente em 0,8s com a fatia de um hospital — texto correto para outra
    // pergunta. As três formas que faltavam:
    //
    //   "quais os cinco hospitais com mais..."  contagem entre o pronome e o
    //                                           substantivo
    //   "onde se concentram as internações..."  sujeito implícito
    //   "ranking de hospitais por..."           sem verbo interrogativo
    //
    // O limite de caracteres entre o pronome e "hospitais" existe para não
    // capturar frase longa em que as duas palavras só coincidem.
    const pedidoRanking =
      /(quais|que|quantos)\b[a-z0-9 ]{0,24}\bhospitais\b/.test(normalized) ||
      /\bonde\b[a-z0-9 ]{0,30}\b(concentra|interna)/.test(normalized) ||
      /\branking\b[a-z0-9 ]{0,20}\bhospita/.test(normalized)

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

    // `ranking` sozinho tambem trazia para ca o pedido de ranking de
    // hospitais, que e outra pergunta: esta regra ordena REGIOES por IPH.
    // "ranking de regioes" continua caindo aqui; "ranking de hospitais" vai
    // ao modelo, que e quem tem o grao hospitalar.
    if (!pedidoRanking && /investigar|priorizar|maiores regioes|ranking/.test(normalized)) {
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

    // O IPE tem resposta local pela mesma razão que o IPR: a definição é regra
    // de produto, é sempre a mesma, e mandá-la ao modelo gastava cota para
    // devolver a definição seguida de um ranking que ninguém pediu.
    if (
      (pedidoExplicacao && /(\bipe\b|permanencia por especialidade)/.test(normalized)) ||
      (/\bipe\b/.test(normalized) && /acima de 1|ruim|bom|qualidade|como ler/.test(normalized))
    ) {
      return {
        text: 'IPE é o Índice de Permanência por Especialidade: a permanência média do hospital naquela especialidade dividida pela dos demais hospitais da mesma região, na mesma especialidade e competência, com o próprio hospital fora do benchmark. Acima de 1 é permanência maior que a dos pares. Não é nota de qualidade: compara permanência observada, sem ajuste de risco.',
      }
    }

    if (/\bipe\b/.test(normalized) && /(indisponivel|nao calculado|sem valor|vazio|amostra)/.test(normalized)) {
      return {
        text: 'O IPE exige 20 internações no hospital, 50 no benchmark e 3 hospitais pares na mesma especialidade e região. Fora disso ele fica nulo e o estado diz o motivo: amostra insuficiente ou benchmark sem permanência registrada. Com esses cortes ele cobre 63,9% das linhas hospital-especialidade, contra 6,9% do IPR por CID.',
      }
    }

    if (/(\bipe\b|\bipr\b).*(diferenca|diferente|versus|ou ipr|em vez)|diferenca entre ipe e ipr/.test(normalized)) {
      return {
        text: 'São a mesma construção em grãos diferentes. O IPR compara por CID, é mais específico clinicamente e fica calculável em 6,9% dos pares hospital/CID. O IPE compara por especialidade e cobre 63,9%, com os mesmos cortes: o ganho veio do grão, não de afrouxar a exigência.',
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
    if (
      /criterio.*par|pares.*criterio|como.*(escolhe|define|monta).*par|quem.*e.*par|grupo de par|hospitais? (sao|são) (comparados|pares)|comparave|compar\w*( com)? (quais|quem|outros|os outros)|(quais|que) (outros )?hospitais.*compar|hospitais? (parecidos|similares|semelhantes)/.test(
        normalized,
      )
    ) {
      return {
        text: 'Pares são hospitais da mesma faixa de leitos SUS — até 24, 25 a 59, 60 a 149, 150 a 299, 300 ou mais. O porte nunca sai do critério: é ele que torna os números comparáveis. O que você escolhe é o alcance: na mesma região, que é o padrão, ou no estado. Quando a região não tem três hospitais daquele porte, a régua sobe para o estado e a tela avisa. O próprio hospital fica sempre fora do grupo, pela mesma razão que o IPR o exclui do benchmark: comparar alguém consigo mesmo puxa a mediana na direção dele.',
      }
    }

    // Perguntas sobre como ler um número que está na tela. O modelo leu
    // "97 de 237 acima dos pares" como posição num ranking de 237 regiões, que
    // não é o que está escrito — e ranking é justamente o que ele sabe fazer.
    if (
      /acima dos pares|de \d+ acima|\d+ de \d+/.test(normalized) &&
      /(mapa|regiao|significa|quer dizer|como ler|o que e|entender)/.test(normalized)
    ) {
      return {
        text: 'Não é posição num ranking: é uma contagem. O primeiro número são as comparações hospital-especialidade da região em que a permanência do hospital ficou acima da dos pares na mesma especialidade; o segundo são todas as comparações elegíveis da região naquela competência. "97 de 237" significa que, das 237 comparações possíveis ali, 97 ficaram acima. Quanto maior a proporção, mais frequente é a permanência acima dos pares dentro da própria região — e ela não é medida de qualidade, porque não há ajuste de risco.',
      }
    }

    if (
      !pedidoRanking &&
      /participacao|concentra|percentual das internacoes da regiao|quanto.*regiao passa/.test(normalized)
    ) {
      return {
        text: 'É a fatia das internações da região que passa por este hospital, na competência aberta. Ela importa para ler os demais números: um hospital que concentra a maior parte das internações costuma ser a referência da região, recebe o caso que os outros não resolvem, e permanência maior é o esperado nesse papel — não um desvio dele.',
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

  function historyForRequest(): AssistantTurn[] {
    // A resposta vai truncada: o que o modelo precisa dali é o assunto — a
    // região, o hospital, o indicador citado —, e ele aparece nas primeiras
    // linhas. O teto de contexto do banco é pequeno e disputado.
    return thread.slice(-HISTORY_TURNS).map((turn) => ({
      question: turn.question.slice(0, 200),
      answer: turn.answer.text.slice(0, 300),
    }))
  }

  function registrar(pergunta: string, resposta: Answer) {
    setThread((atual) => [...atual, { id: Date.now() + atual.length, question: pergunta, answer: resposta }])
    setPendingQuestion(null)
  }

  async function ask(rawQuestion: string) {
    const cleanQuestion = rawQuestion.trim().slice(0, 300)
    if (!cleanQuestion || isLoading) return

    setPendingQuestion(cleanQuestion)
    setQuestion('')

    const deterministic = localAnswer(cleanQuestion)
    if (deterministic) {
      registrar(cleanQuestion, deterministic)
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
        history: historyForRequest(),
      }
      const response = await askOracleSelectAi(cleanQuestion, context)
      registrar(cleanQuestion, {
        text: response.narrative,
        sql: response.sql,
        warning: response.warning,
      })
    } catch (error) {
      // O cliente já distingue cota estourada, contrato inválido e tempo
      // esgotado. Trocar tudo por uma frase única fazia o produto parecer
      // incapaz quando o problema era outro, e apagava a pista do diagnóstico.
      registrar(cleanQuestion, {
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

          <div className="assistant-body" ref={bodyRef}>
            {thread.length === 0 && !pendingQuestion && (
              <p className="assistant-intro">
                Pergunte sobre os indicadores ou escolha um atalho desta tela. A
                conversa fica aqui, e a pergunta seguinte entende a anterior.
              </p>
            )}

            <div className="assistant-suggestions" aria-label="Perguntas sugeridas">
              {suggestedQuestions.map((suggestion) => (
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

            {(thread.length > 0 || pendingQuestion) && (
              <div className="assistant-conversation" data-testid="assistant-thread">
                {thread.map((turn) => (
                  <div key={turn.id} className="assistant-exchange">
                    <p className="assistant-question">{turn.question}</p>
                    <article className="assistant-answer">
                      <span>FlowIA</span>
                      <p>{turn.answer.text}</p>
                      {turn.answer.warning && (
                        <p className="assistant-warning">{turn.answer.warning}</p>
                      )}
                      {turn.answer.sql && (
                        <details>
                          <summary>Ver SQL gerado e validado</summary>
                          <pre>{turn.answer.sql}</pre>
                        </details>
                      )}
                    </article>
                  </div>
                ))}
                {pendingQuestion && (
                  <div className="assistant-exchange">
                    <p className="assistant-question">{pendingQuestion}</p>
                    {isLoading && (
                      <div className="assistant-thinking" role="status">
                        <span /> Consultando os dados…
                      </div>
                    )}
                  </div>
                )}
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

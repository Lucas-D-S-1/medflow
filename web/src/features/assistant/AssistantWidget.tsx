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
import {
  formatDecimal,
  formatInteger,
  formatPercent,
  formatPeriod,
  formatPeriodLong,
} from '../../shared/format'
import { SUMMARY_QUESTIONS } from '../hospital/specialtySummary'
import { isComparableStay } from '../hospital/specialtyMetrics'
import type {
  HospitalSpecialtyContext,
  HospitalSpecialtyOption,
  HospitalSpecialtySummary,
} from '../../shared/SourceContext'
import {
  fetchSpecialtyDiagnoses,
  type SpecialtyDiagnosisResponse,
} from '../hospital/hospitalDiagnosticosEspecialidade'
import {
  assistantContextKey,
  isCurrentSpecialtySummary,
} from './assistantContext'
import './AssistantWidget.css'

type RouteKey = 'regional' | 'hospital' | 'metodologia'
type Answer = {
  text: string
  contextLabel?: string
  sql?: string | null
  warning?: string | null
  specialtySet?: {
    cnes: string
    competence: string
    items: HospitalSpecialtyOption[]
  }
}

/** Uma rodada completa da conversa, já respondida. */
type Exchange = {
  id: number
  question: string
  answer: Answer
}

type ActiveRemoteRequest = {
  generation: number
  contextKey: string
  controller: AbortController
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
  regional: ['O que são os sinais?', 'O que é IPH?'],
  hospital: [...SUMMARY_QUESTIONS],
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

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

function mentionsExplicitSpecialty(normalized: string) {
  return /\bespecialidade\s+(?!(?:atual|selecionada|sih|e\b|ou\b|do\b|da\b|no\b|na\b|com\b|por\b))(?:codigo\s+)?(?:\d{2}|--|[a-z])/.test(
    normalized,
  )
}

function matchesHospitalName(question: string, hospitalName: string | null) {
  if (!hospitalName) return false
  const ignored = new Set(['hospital', 'hosp', 'hu', 'de', 'da', 'do', 'das', 'dos', 'e'])
  const tokens = normalize(hospitalName)
    .split(' ')
    .filter((token) => token.length > 1 && !ignored.has(token))
  if (tokens.length === 0) return false
  const matches = tokens.filter((token) => new RegExp(`\\b${token}\\b`).test(question)).length
  return matches >= Math.min(2, tokens.length)
}

function hasDivergentExplicitScope(
  normalized: string,
  current: {
    cnes: string | null
    competence: string
    hospitalName: string | null
    regionCode: string | null
    regionName: string | null
  },
) {
  const cnesCodes: string[] = normalized.match(/\b\d{7}\b/g) ?? []
  if (cnesCodes.some((code) => code !== current.cnes)) return true

  const competence = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(current.competence)
  if (competence) {
    const currentYear = Number(competence[1])
    const currentMonth = Number(competence[2])
    const numericCompetences = [
      ...normalized.matchAll(/\b(20\d{2})\s*(0[1-9]|1[0-2])\b/g),
    ]
    if (
      numericCompetences.some(
        (match) => Number(match[1]) !== currentYear || Number(match[2]) !== currentMonth,
      )
    ) {
      return true
    }
    const monthFirst = [...normalized.matchAll(/\b(0?[1-9]|1[0-2])\s+(20\d{2})\b/g)]
    if (
      monthFirst.some(
        (match) => Number(match[2]) !== currentYear || Number(match[1]) !== currentMonth,
      )
    ) {
      return true
    }
    const years = normalized.match(/\b20\d{2}\b/g) ?? []
    if (years.some((year) => Number(year) !== currentYear)) return true
    if (
      MONTH_NAMES.some(
        (month, index) =>
          new RegExp(`\\b${month}\\b`).test(normalized) && index + 1 !== currentMonth,
      )
    ) {
      return true
    }
  }

  const regionCodes = [
    ...normalized.matchAll(/\bregiao(?:\s+de|\s+da)?\s+(\d{5})\b/g),
  ].map((match) => match[1])
  if (regionCodes.some((code) => code !== current.regionCode)) return true
  const explicitRegion = /\b(?:regiao(?:\s+de|\s+da)?|hospitais\s+de)\s+(?!(?:saude|mesma|esta|essa|nesta|nessa|desta|dessa|atual)\b)[a-z]/.test(
    normalized,
  )
  if (
    explicitRegion &&
    (!current.regionName || !normalized.includes(normalize(current.regionName)))
  ) {
    return true
  }

  const explicitHospital =
    /\b(?:outro|outra)\s+hospital\b/.test(normalized) ||
    /\bhospital\s+(?!(?:selecionado|atual|aberto|deste|desse|neste|nesse)\b)[a-z0-9]/.test(
      normalized,
    )
  return (
    explicitHospital &&
    !cnesCodes.includes(current.cnes ?? '') &&
    !matchesHospitalName(normalized, current.hospitalName)
  )
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
  const {
    sourceState,
    sharedCompetence,
    hospitalSummary,
    hospitalSpecialties,
    selectedHospitalName,
    pendingAssistantQuestion,
    clearAssistantQuestion,
  } = useSource()
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  // O fio inteiro, não a última rodada. Guardar só uma fazia a pergunta
  // seguinte apagar a anterior da tela e da memória do modelo.
  const [thread, setThread] = useState<Exchange[]>([])
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const requestGeneration = useRef(0)
  const activeRemoteRequest = useRef<ActiveRemoteRequest | null>(null)
  // A FlowIA acompanha a etapa visível, não a rota: na página contínua as
  // três seções dividem o mesmo endereço.
  const activeSection = useActiveSection(
    ANALYSIS_SECTIONS,
    location.pathname === '/',
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

  const activeHospitalSummary = useMemo(() => {
    if (
      !hospitalSummary ||
      (sourceState.kind !== 'live' && sourceState.kind !== 'fallback') ||
      hospitalSummary.competence !== sharedCompetence
    ) {
      return null
    }
    const params = new URLSearchParams(location.search)
    return params.get('hospital') === hospitalSummary.cnes ? hospitalSummary : null
  }, [hospitalSummary, location.search, sharedCompetence, sourceState.kind])
  const activeHospitalSummaryRef = useRef(activeHospitalSummary)
  activeHospitalSummaryRef.current = activeHospitalSummary
  const sharedCompetenceRef = useRef(sharedCompetence)
  sharedCompetenceRef.current = sharedCompetence

  const currentContextKey = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return assistantContextKey({
      route: currentRoute,
      competence: sharedCompetence,
      regionCode: selectedRegion?.region_code ?? params.get('regiao') ?? '',
      hospitalCnes: params.get('hospital') ?? '',
      specialtyCode: activeHospitalSummary?.specialtyCode ?? '',
    })
  }, [
    activeHospitalSummary?.specialtyCode,
    currentRoute,
    location.search,
    selectedRegion?.region_code,
    sharedCompetence,
  ])
  const currentContextKeyRef = useRef(currentContextKey)
  currentContextKeyRef.current = currentContextKey

  const suggestedQuestions = quickQuestions[currentRoute]

  const activeHospitalSpecialties = useMemo<HospitalSpecialtyContext | null>(() => {
    const params = new URLSearchParams(location.search)
    if (
      !hospitalSpecialties ||
      hospitalSpecialties.cnes !== params.get('hospital') ||
      hospitalSpecialties.competence !== sharedCompetence
    ) {
      return null
    }
    return hospitalSpecialties
  }, [hospitalSpecialties, location.search, sharedCompetence])

  useEffect(() => {
    if (isOpen) window.setTimeout(() => inputRef.current?.focus(), 80)
  }, [isOpen])

  useEffect(() => {
    if (!pendingAssistantQuestion) return
    if (
      pendingAssistantQuestion.specialtySummary &&
      !isCurrentSpecialtySummary(
        pendingAssistantQuestion.specialtySummary,
        activeHospitalSummary,
      )
    ) {
      clearAssistantQuestion()
      return
    }
    // Consome no proximo frame para que uma troca de recorte no mesmo gesto
    // invalide o pedido antes de produzir texto com o snapshot anterior. A
    // limpeza do efeito cancela este frame quando o resumo ativo muda.
    const frame = window.requestAnimationFrame(() => {
      const requestedSummary = pendingAssistantQuestion.specialtySummary
      if (requestedSummary) {
        const params = new URLSearchParams(window.location.search)
        const urlCompetence = params.get('competencia') ?? sharedCompetenceRef.current
        if (
          params.get('hospital') !== requestedSummary.cnes ||
          urlCompetence !== requestedSummary.competence ||
          !isCurrentSpecialtySummary(
            requestedSummary,
            activeHospitalSummaryRef.current,
          )
        ) {
          clearAssistantQuestion()
          return
        }
      }
      setIsOpen(true)
      void ask(
        pendingAssistantQuestion.question,
        pendingAssistantQuestion.specialtySummary,
      )
      clearAssistantQuestion()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeHospitalSummary, clearAssistantQuestion, pendingAssistantQuestion])

  useEffect(() => {
    const active = activeRemoteRequest.current
    if (!active || active.contextKey === currentContextKey) return
    activeRemoteRequest.current = null
    active.controller.abort()
    setIsLoading(false)
    setPendingQuestion(null)
  }, [currentContextKey])

  useEffect(() => () => {
    const active = activeRemoteRequest.current
    activeRemoteRequest.current = null
    active?.controller.abort()
  }, [])

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

  function contextLabel(summary?: HospitalSpecialtySummary) {
    if (summary) {
      return `${summary.hospitalName} · ${summary.specialtyName} · ${formatPeriod(summary.competence)}`
    }
    const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(sharedCompetence)
      ? formatPeriod(sharedCompetence)
      : 'período ainda não carregado'
    if (currentRoute === 'hospital' && selectedHospitalName) {
      return `${selectedHospitalName} · ${period}`
    }
    if (selectedRegion) {
      return `${selectedRegion.region_name} · ${period}`
    }
    return `${routeNames[currentRoute]} · ${period}`
  }

  function latestSpecialtySet() {
    const params = new URLSearchParams(location.search)
    const cnes = params.get('hospital')
    const set = thread.at(-1)?.answer.specialtySet
    return set?.cnes === cnes && set.competence === sharedCompetence ? set : null
  }

  function explicitScopeDiverges(normalized: string) {
    const params = new URLSearchParams(location.search)
    return hasDivergentExplicitScope(normalized, {
      cnes: params.get('hospital'),
      competence: sharedCompetence,
      hospitalName: selectedHospitalName,
      regionCode: selectedRegion?.region_code ?? params.get('regiao'),
      regionName: selectedRegion?.region_name ?? null,
    })
  }

  function requestedSpecialtyCount(normalized: string) {
    const digit = /\b([1-5])\b/.exec(normalized)
    if (digit) return Number(digit[1])
    const words: [RegExp, number][] = [
      [/\bcinco\b/, 5],
      [/\bquatro\b/, 4],
      [/\btres\b/, 3],
      [/\bduas?\b/, 2],
      [/\buma?\b/, 1],
    ]
    return words.find(([pattern]) => pattern.test(normalized))?.[1] ?? 3
  }

  function isDiagnosisFollowUp(normalized: string) {
    const anaforico = /(dessas?|nessas?|dentro dessas?|dentro das).{0,30}(?:especialidad|especilidad)/.test(
      normalized,
    )
    const ranking = /(principais|top\s*\d*|ranking)/.test(normalized)
    const diagnostico = /(diagnostic|\bcid\b|doenc)/.test(normalized)
    const quantidadeExplicita = /(?:dessas?|nessas?)\s+(\d+)\s+(?:especialidad|especilidad)/.exec(
      normalized,
    )
    const conjuntoAtual = latestSpecialtySet()
    const outroRecorte =
      explicitScopeDiverges(normalized) ||
      mentionsExplicitSpecialty(normalized) ||
      /(mais frequentes|mais comuns)/.test(normalized) ||
      /\b(?:todos|todas)\s+(?:os\s+)?diagnosticos\b/.test(normalized) ||
      /(mortalidade|obito|letalidade|custo|valor|intervalo|serie|evolucao)/.test(normalized) ||
      (quantidadeExplicita !== null &&
        conjuntoAtual !== null &&
        Number(quantidadeExplicita[1]) !== conjuntoAtual.items.length)
    return anaforico && ranking && diagnostico && !outroRecorte
  }

  function comparisonReason(
    specialtyCode: string,
    cidCode: string,
    benchmarkAdmissions: number,
    benchmarkStayDays: number,
    benchmarkHospitals: number,
    status: 'suficiente' | 'amostra_insuficiente' | 'benchmark_zero',
  ) {
    if (specialtyCode === '--' || cidCode === '--') return 'Identificador desconhecido; não comparável'
    if (benchmarkHospitals === 0 || benchmarkAdmissions === 0) {
      return 'Sem outros hospitais neste recorte'
    }
    if (status === 'benchmark_zero' || benchmarkStayDays === 0) {
      return 'Pares sem dias de permanência registrados'
    }
    return 'Amostra insuficiente para comparar'
  }

  function specialtyReference(item: HospitalSpecialtyOption) {
    const raw = `${formatInteger(item.benchmarkAdmissions)} internações, ${formatInteger(item.benchmarkStayDaysTotal)} dias e ${formatInteger(item.benchmarkHospitals)} hospitais pares`
    if (
      item.comparisonStatus === 'suficiente' &&
      item.ipe !== null &&
      item.averageStayBenchmark !== null
    ) {
      return `referência ${formatDecimal(item.averageStayBenchmark)} dias (${raw}); IPE ${formatDecimal(item.ipe)}`
    }
    const reason = comparisonReason(
      item.code,
      'categoria',
      item.benchmarkAdmissions,
      item.benchmarkStayDaysTotal,
      item.benchmarkHospitals,
      item.comparisonStatus,
    )
    const peerMean = item.averageStayBenchmark === null
      ? ''
      : `, média dos pares ${formatDecimal(item.averageStayBenchmark)} dias`
    return `${reason} (${raw}${peerMean}); não comparável`
  }

  function diagnosisRankingText(
    specialties: HospitalSpecialtyOption[],
    responses: SpecialtyDiagnosisResponse[],
  ) {
    return specialties
      .map((specialty, index) => {
        const diagnoses = responses[index].items
        if (diagnoses.length === 0) {
          return `${specialty.name} (${specialty.code}): sem diagnóstico publicado nesta competência.`
        }
        const ranking = diagnoses
          .map(
            (item, position) => {
              const raw = `${formatInteger(item.benchmark_admissions)} internações, ${formatInteger(item.benchmark_stay_days_total)} dias e ${formatInteger(item.benchmark_hospitals)} hospitais pares`
              const reference = item.sample_status === 'suficiente'
                ? `referência ${formatDecimal(item.average_stay_benchmark!)} dias (${raw}); IPR ${formatDecimal(item.ipr!)}`
                : `${comparisonReason(specialty.code, item.cid_code, item.benchmark_admissions, item.benchmark_stay_days_total, item.benchmark_hospitals, item.sample_status)} (${raw}${item.average_stay_benchmark === null ? '' : `, média dos pares ${formatDecimal(item.average_stay_benchmark)} dias`}); não comparável`
              return `${position + 1}. ${item.cid_code} — ${item.cid_description}: ${formatInteger(item.new_admissions)} internações, ${formatInteger(item.stay_days_total)} dias, média ${formatDecimal(item.average_stay_days)} dias (${formatPercent(item.admission_share_percent)} do volume; ${item.stay_day_share_percent === null ? 'Sem dias registrados para calcular participação' : `${formatPercent(item.stay_day_share_percent)} dos dias`}); ${reference}.`
            },
          )
          .join(' ')
        return `${specialty.name} (${specialty.code}) — top 5 por total de dias: ${ranking}`
      })
      .join('\n')
  }

  function localAnswer(
    rawQuestion: string,
    requestedSummary?: HospitalSpecialtySummary,
  ): Answer | null {
    const answer = localAnswerBody(rawQuestion, requestedSummary)
    if (!answer) return null
    const contextualAnswer = {
      ...answer,
      contextLabel: answer.contextLabel ?? contextLabel(requestedSummary),
    }
    if (sourceState.kind !== 'fallback') return contextualAnswer
    const competence = sharedCompetence && formatPeriod(sharedCompetence)
    return {
      ...contextualAnswer,
      text: `${contextualAnswer.text} Fonte: snapshot de contingência${competence ? ` até ${competence}` : ''}; esta resposta local não consultou o Oracle.`,
    }
  }

  function localAnswerBody(
    rawQuestion: string,
    requestedSummary?: HospitalSpecialtySummary,
  ): Answer | null {
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

    if (
      currentRoute === 'hospital' &&
      activeHospitalSpecialties &&
      !explicitScopeDiverges(normalized) &&
      !mentionsExplicitSpecialty(normalized) &&
      !/(diagnostic|\bcid\b|doenc)/.test(normalized) &&
      /(especialidad).*(principais|mais|maior|ranking)|(?:principais|quais|ranking|mais).*(especialidad)|(?:mostre|liste).*(?:todas as )?especialidad/.test(
        normalized,
      )
    ) {
      const todas = /todas as especialidad|todas especialidad/.test(normalized)
      const count = todas
        ? activeHospitalSpecialties.items.length
        : requestedSpecialtyCount(normalized)
      const ordenarPorDias = /(dias|permanencia)/.test(normalized)
      const leaders = activeHospitalSpecialties.items
        .slice()
        .sort(
          (left, right) =>
            (ordenarPorDias
              ? right.stayDaysTotal - left.stayDaysTotal
              : right.newAdmissions - left.newAdmissions) ||
            left.code.localeCompare(right.code),
        )
        .slice(0, count)
      if (leaders.length > 0) {
        return {
          text: `${leaders
            .map(
              (item, index) =>
                `${index + 1}. ${item.name} (${item.code}): ${formatInteger(item.newAdmissions)} internações, ${formatInteger(item.stayDaysTotal)} dias, média ${item.averageStayDays === null ? 'não calculada' : `${formatDecimal(item.averageStayDays)} dias`}; ${specialtyReference(item)}.`,
            )
            .join('\n')}\nOrdenação: ${ordenarPorDias ? 'total de dias de permanência' : 'volume de internações'}. Referência regional: mesmo mês e especialidade; hospital excluído; comparação sem ajuste de risco. Diferenças são descritivas e não demonstram causa ou qualidade.\nFonte: dados do MedFlow consultados diretamente, ${formatPeriodLong(activeHospitalSpecialties.competence)}.`,
          specialtySet: {
            cnes: activeHospitalSpecialties.cnes,
            competence: activeHospitalSpecialties.competence,
            items: leaders,
          },
        }
      }
    }

    const perguntaResumo = SUMMARY_QUESTIONS.find(
      (question) => normalized === normalize(question),
    )
    if (perguntaResumo) {
      const summary = requestedSummary
        ? isCurrentSpecialtySummary(requestedSummary, activeHospitalSummary)
          ? requestedSummary
          : null
        : activeHospitalSummary
      if (!summary) {
        return {
          text: 'Selecione um hospital para abrir o resumo da especialidade e responder a esta pergunta.',
          contextLabel: contextLabel(),
        }
      }

      if (perguntaResumo === SUMMARY_QUESTIONS[0]) {
        const hospitalShare = summary.hospitalSharePercent === null
          ? 'sem participação hospitalar calculável'
          : `${formatPercent(summary.hospitalSharePercent)} das internações ${summary.hospitalShareCoverage === 'complete' ? 'do hospital' : 'nas especialidades disponíveis'}`
        const regionShare = summary.regionalSharePercent === null
          ? 'sem participação regional calculável'
          : `${formatPercent(summary.regionalSharePercent)} das internações regionais da especialidade`
        const stay = summary.averageStayDays === null ||
          !Number.isFinite(summary.averageStayDays) ||
          summary.averageStayDays < 0
          ? 'A permanência local não foi calculada.'
          : isComparableStay(
              summary.ipeSampleStatus,
              summary.averageStayDays,
              summary.averageStayBenchmark,
              summary.benchmarkHospitals,
            )
            ? `A permanência foi ${formatDecimal(summary.averageStayDays)} dias, ante ${formatDecimal(summary.averageStayBenchmark!)} em ${formatInteger(summary.benchmarkHospitals)} outros hospitais.`
            : summary.ipeSampleStatus === 'amostra_insuficiente'
              ? `A permanência local foi ${formatDecimal(summary.averageStayDays)} dias; a amostra é insuficiente para comparação.`
              : summary.ipeSampleStatus === 'benchmark_zero'
                ? `A permanência local foi ${formatDecimal(summary.averageStayDays)} dias; os demais hospitais não têm permanência registrada para formar a referência.`
                : `A permanência local foi ${formatDecimal(summary.averageStayDays)} dias, sem referência válida publicada.`
        return {
          text: `${summary.specialtyName} teve ${formatInteger(summary.newAdmissions)} internações: ${hospitalShare} e ${regionShare}. ${stay} A comparação é descritiva, sem ajuste de risco, e não demonstra causa ou qualidade.`,
          contextLabel: contextLabel(summary),
        }
      }

      return {
        text: `Verifique perfil e gravidade dos casos, comorbidades, transferências, fluxo de altas e capacidade operacional em ${summary.specialtyName}. Confirme também cobertura e qualidade do registro com a equipe local. Estes dados não provam falta de profissionais nem sustentam, sozinhos, contratação ou mudança assistencial.`,
        contextLabel: contextLabel(summary),
      }
    }

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
        text: 'CMI é o valor médio aprovado pelo SUS por internação. O CMI nominal divide o valor SIH aprovado das internações novas pelo número de internações; o CMI real aplica o fator de correção IPCA da competência. São valores administrativos aprovados, não o gasto total do atendimento.',
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

    if (
      /interpretar.*mapa|mapa.*interpretar|cor(?:es)? .*mapa|mapa.*cor|escuro.*mapa|mapa.*sinais|sinais.*mapa/.test(
        normalized,
      )
    ) {
      return {
        text: 'O mapa tem dois modos. No placar de sinais, que é o padrão, cada região acende um sinal quando fica no quintil mais alto do recorte visível: pressão sobre leitos (IPH estimado), mortalidade observada (TMH), permanência média, valor médio aprovado pelo SUS (CMI), atendidos fora da região e ICSAP. Tons mais escuros nesse modo significam mais sinais acesos, não IPH por si só. No modo IPH estimado, a cor mostra a escala relativa por percentis do IPH. Nenhum modo é nota de qualidade ou ocupação real; selecione a região para ver os valores e limites.',
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
        text: 'É a fatia das internações observadas da região que passa por este hospital, na competência aberta. Ela evidencia concentração de volume e ajuda a discutir a capacidade de resposta da rede, mas não identifica papel de referência, gravidade, complexidade, qualidade ou causa, nem autoriza concluir sobre a permanência.',
      }
    }

    if (/faixa|mediana.*par|quartil|barra de posicao|o que e tipico|percentil/.test(normalized)) {
      return {
        text: 'A barra sob cada indicador mostra como os pares se distribuem: a área destacada é a metade central do grupo, entre o primeiro e o terceiro quartil, e o traço é a mediana. O ponto é este hospital. Ela responde o que é típico entre semelhantes, não o que é bom: se estar acima é bom ou ruim depende do indicador e do contexto clínico, e essa leitura continua com quem analisa. Não há ajuste de risco.',
      }
    }

    if (/hospital.?dia|permanencia.*menos de um dia|giro|396|iph.*acima de 100/.test(normalized)) {
      return {
        text: 'Em unidades com permanência média abaixo de um dia o IPH deixa de medir ocupação. Ele divide pacientes-dia por leitos-dia declarados, e a reconstrução do SIH atribui ao menos um dia por internação — num hospital-dia o paciente não passa a noite, então o índice passa a medir giro sobre capacidade. O Hospital Dia Butantã aparece com 396,7% tendo usado 20 dos 60 leitos-dia disponíveis. Comparar com hospitais da mesma faixa de leitos SUS mantém o critério de porte, mas não transforma o número em taxa de ocupação, e a tela avisa isso.',
      }
    }

    if (/o que sao os sinais|sinais? acesos|quintil|placar|quantos sinais|indice de priorizacao/.test(normalized)) {
      return {
        text: 'Os sinais indicam quais dos seis indicadores estão no grupo de valores mais altos do recorte visível, a partir do percentil 80: pressão sobre leitos (IPH estimado), mortalidade observada (TMH), permanência média, valor médio aprovado pelo SUS (CMI), atendidos fora da região e ICSAP. São uma triagem comparativa para investigar, não ranking ou nota de qualidade. Filtrar uma rede regional muda os limiares.',
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
        text: 'O Oracle Autonomous Database concentra a Gold, as views de leitura, a API ORDS e o Select AI. Na matriz de decisão deste MVP, ele evita uma API própria, mantém a rastreabilidade perto dos dados e acomoda o volume atual no ambiente Always Free já provisionado.',
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

  async function ask(
    rawQuestion: string,
    requestedSummary?: HospitalSpecialtySummary,
  ) {
    const cleanQuestion = rawQuestion.trim().slice(0, 300)
    if (!cleanQuestion || isLoading) return
    if (
      requestedSummary &&
      !isCurrentSpecialtySummary(requestedSummary, activeHospitalSummary)
    ) {
      return
    }
    const usedContextLabel = contextLabel(requestedSummary)

    setPendingQuestion(cleanQuestion)
    setQuestion('')

    const normalizedQuestion = normalize(cleanQuestion)
    if (currentRoute === 'hospital' && isDiagnosisFollowUp(normalizedQuestion)) {
      const specialtySet = latestSpecialtySet()
      if (!specialtySet) {
        registrar(cleanQuestion, {
          text: 'Peça primeiro o ranking de especialidades do hospital. Assim eu preservo os códigos exatos do conjunto antes de detalhar os diagnósticos.',
          contextLabel: usedContextLabel,
        })
        return
      }
      if (sourceState.kind !== 'live') {
        registrar(cleanQuestion, {
          text: `O ranking por diagnóstico exige o recorte completo da Gold. No snapshot de contingência eu preservei as ${formatInteger(specialtySet.items.length)} especialidades anteriores, mas não vou completar as demais com dados parciais nem chamar o Select AI.`,
          contextLabel: usedContextLabel,
          specialtySet,
        })
        return
      }

      const generation = requestGeneration.current + 1
      requestGeneration.current = generation
      const controller = new AbortController()
      const diagnosisRequest: ActiveRemoteRequest = {
        generation,
        contextKey: currentContextKey,
        controller,
      }
      activeRemoteRequest.current?.controller.abort()
      activeRemoteRequest.current = diagnosisRequest
      setIsLoading(true)
      try {
        const year = Number(specialtySet.competence.slice(0, 4))
        const month = Number(specialtySet.competence.slice(5, 7))
        const responses = await Promise.all(
          specialtySet.items.map((specialty) =>
            fetchSpecialtyDiagnoses(
              {
                cnes: specialtySet.cnes,
                year,
                month,
                specialtyCode: specialty.code,
                orderBy: 'dias',
              },
              { limit: 5, signal: controller.signal },
            ),
          ),
        )
        if (
          activeRemoteRequest.current !== diagnosisRequest ||
          currentContextKeyRef.current !== diagnosisRequest.contextKey
        ) {
          return
        }
        registrar(cleanQuestion, {
          text: `${diagnosisRankingText(specialtySet.items, responses)}\nReferência regional: mesmo mês, especialidade e CID; hospital excluído; comparação sem ajuste de risco. Os estados não comparáveis não sustentam causalidade.\nFonte: dados do MedFlow consultados diretamente, ${formatPeriodLong(specialtySet.competence)}.`,
          contextLabel: `${selectedHospitalName ?? specialtySet.cnes} · ${formatInteger(specialtySet.items.length)} especialidades · ${formatPeriod(specialtySet.competence)}`,
          specialtySet,
        })
      } catch {
        if (
          activeRemoteRequest.current !== diagnosisRequest ||
          currentContextKeyRef.current !== diagnosisRequest.contextKey
        ) {
          return
        }
        registrar(cleanQuestion, {
          text: 'Não consegui carregar os diagnósticos desse conjunto agora. Nenhuma chamada ao Select AI foi feita e nenhum resultado parcial foi apresentado.',
          contextLabel: usedContextLabel,
          specialtySet,
        })
      } finally {
        if (activeRemoteRequest.current === diagnosisRequest) {
          activeRemoteRequest.current = null
          setIsLoading(false)
        }
      }
      return
    }

    const deterministic = localAnswer(cleanQuestion, requestedSummary)
    if (deterministic) {
      registrar(cleanQuestion, deterministic)
      return
    }

    if (sourceState.kind !== 'live') {
      registrar(cleanQuestion, {
        text:
          sourceState.kind === 'fallback'
            ? `A FlowIA está usando o snapshot de contingência até ${formatPeriod(sharedCompetence)}. Perguntas livres ficam desabilitadas sem Oracle; use as explicações locais. Esta resposta não consultou o Oracle.`
            : 'A fonte ainda está carregando. Selecione uma explicação local depois que o recorte estiver pronto; nenhuma pergunta livre foi enviada.',
        contextLabel: usedContextLabel,
      })
      return
    }

    const generation = requestGeneration.current + 1
    requestGeneration.current = generation
    const controller = new AbortController()
    const remoteRequest: ActiveRemoteRequest = {
      generation,
      contextKey: currentContextKey,
      controller,
    }
    activeRemoteRequest.current?.controller.abort()
    activeRemoteRequest.current = remoteRequest
    setIsLoading(true)
    try {
      const params = new URLSearchParams(location.search)
      const divergentScope = explicitScopeDiverges(normalizedQuestion)
      const explicitSpecialty = mentionsExplicitSpecialty(normalizedQuestion)
      const structuredSet = divergentScope || explicitSpecialty ? null : latestSpecialtySet()
      const context: AssistantContext = {
        route: currentRoute,
        competence: divergentScope ? null : sharedCompetence || null,
        region_code: divergentScope ? null : selectedRegion?.region_code ?? params.get('regiao'),
        region_name: divergentScope ? null : selectedRegion?.region_name ?? null,
        macroregion_code: divergentScope ? null : selectedRegion?.macroregion_code ?? null,
        macroregion_name: divergentScope ? null : selectedRegion?.macroregion_name ?? null,
        macroregion_label: !divergentScope && selectedRegion
          ? formatRegionalNetwork(selectedRegion.macroregion_name)
          : null,
        hospital_cnes: divergentScope ? null : params.get('hospital'),
        active_analysis: routeAnalysis[currentRoute],
        intent:
          structuredSet && /(diagnostic|\bcid\b|doenc)/.test(normalizedQuestion)
            ? 'diagnosticos_por_especialidade'
            : 'pergunta_livre',
        specialties: (
          structuredSet?.items ??
          (!explicitSpecialty && !divergentScope && activeHospitalSummary
            ? [{ code: activeHospitalSummary.specialtyCode, name: activeHospitalSummary.specialtyName }]
            : [])
        ).slice(0, 5).map(({ code, name }) => ({ code, name })),
        history: historyForRequest(),
      }
      const response = await askOracleSelectAi(
        cleanQuestion,
        context,
        undefined,
        controller.signal,
      )
      if (
        activeRemoteRequest.current !== remoteRequest ||
        currentContextKeyRef.current !== remoteRequest.contextKey
      ) {
        return
      }
      registrar(cleanQuestion, {
        text: response.narrative,
        contextLabel: usedContextLabel,
        sql: response.sql,
        warning: response.warning,
      })
    } catch (error) {
      if (
        activeRemoteRequest.current !== remoteRequest ||
        currentContextKeyRef.current !== remoteRequest.contextKey
      ) {
        return
      }
      // O cliente já distingue cota estourada, contrato inválido e tempo
      // esgotado. Trocar tudo por uma frase única fazia o produto parecer
      // incapaz quando o problema era outro, e apagava a pista do diagnóstico.
      registrar(cleanQuestion, {
        text:
          error instanceof AssistantRequestError
            ? `${error.message} Tente uma das sugestões abaixo.`
            : 'Não consegui responder essa pergunta agora. Tente uma das sugestões.',
        contextLabel: usedContextLabel,
      })
    } finally {
      if (activeRemoteRequest.current === remoteRequest) {
        activeRemoteRequest.current = null
        setIsLoading(false)
      }
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void ask(question)
  }

  function closeAssistant() {
    setIsOpen(false)
    window.requestAnimationFrame(() => launcherRef.current?.focus())
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
              onClick={closeAssistant}
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
                      <small className="assistant-answer-context">
                        Contexto usado: {turn.answer.contextLabel}
                      </small>
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
          ref={launcherRef}
          className="assistant-launcher"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded="false"
          aria-controls="medflow-assistant-panel"
          aria-label="Abrir FlowIA — Posso ajudar?"
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

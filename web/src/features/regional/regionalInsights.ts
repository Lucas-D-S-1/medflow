export type RegionalInsightMetric = 'iph' | 'admissions'

export type RegionalInsightPoint = {
  competence: string
  iph_percent?: number | null
  declared_capacity_bed_days?: number | null
  new_admissions?: number | null
  historical_admissions_average?: number | null
  historical_years?: number | null
  seasonality_status?:
    | 'calculado'
    | 'fora_periodo_alvo'
    | 'historico_insuficiente'
    | null
}

export type RegionalComparison = {
  reference: number
  difference: number
  referenceCompetence?: string
  years?: number
}

export type RegionalInsight = {
  status: 'ready' | 'missing-current' | 'insufficient-history'
  metric: RegionalInsightMetric
  current: number | null
  previousComparison: RegionalComparison | null
  historicalComparison: RegionalComparison | null
  historicalReason:
    | null
    | 'fora-periodo-alvo'
    | 'historico-insuficiente'
    | 'referencia-zero'
  summary: string
}

export type RegionalSeriesSlot<T extends RegionalInsightPoint> = {
  competence: string
  item: T | null
}

const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function shiftRegionalCompetence(competence: string, months: number) {
  const match = COMPETENCE_PATTERN.exec(competence)
  if (!match) return ''
  const total = Number(match[1]) * 12 + Number(match[2]) - 1 + months
  const year = Math.floor(total / 12)
  const month = ((total % 12) + 12) % 12
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/**
 * Um valor explicitamente publicado como invalido nunca vira fallback.
 * Somente a ausencia real do denominador preserva compatibilidade com
 * contratos antigos que publicavam apenas o IPH calculado.
 */
export function regionalMetricValue(
  item: RegionalInsightPoint | null | undefined,
  metric: RegionalInsightMetric,
): number | null {
  if (!item) return null
  if (metric === 'admissions') {
    return finite(item.new_admissions) && item.new_admissions >= 0
      ? item.new_admissions
      : null
  }

  const denominator = item.declared_capacity_bed_days
  const hasDenominator = Object.prototype.hasOwnProperty.call(
    item,
    'declared_capacity_bed_days',
  )
  return finite(item.iph_percent) &&
    item.iph_percent >= 0 &&
    (!hasDenominator || (finite(denominator) && denominator > 0))
    ? item.iph_percent
    : null
}

function signed(value: number, suffix: string) {
  const displayed = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  if (Math.abs(value) < 0.05) return `0,0 ${suffix}`
  return `${value > 0 ? '+' : '−'}${displayed} ${suffix}`
}

function buildSummary(
  metric: RegionalInsightMetric,
  current: number | null,
  previous: RegionalComparison | null,
  historical: RegionalComparison | null,
) {
  if (current === null) return 'A competência selecionada não tem valor publicado para este indicador.'

  const parts: string[] = []
  if (previous) {
    parts.push(
      metric === 'iph'
        ? `${signed(previous.difference, 'p.p.')} ante o mês anterior`
        : `${signed(previous.difference, '%')} ante o mês anterior`,
    )
  } else {
    parts.push('sem comparação válida com o mês anterior')
  }
  if (historical) {
    parts.push(
      metric === 'iph'
        ? `${signed(historical.difference, 'p.p.')} ante a referência histórica disponível`
        : `${signed(historical.difference, '%')} ante a referência histórica disponível`,
    )
  } else {
    parts.push('sem referência histórica suficiente')
  }
  return `${parts.join('; ')}.`
}

/**
 * Seleciona as três leituras da evolução sem substituir meses ausentes nem
 * transformar ausência em zero. A regra sazonal de internações vem do
 * contrato; a de IPH usa somente o mesmo mês em anos anteriores.
 */
export function regionalInsight(
  items: RegionalInsightPoint[],
  selectedCompetence: string,
  metric: RegionalInsightMetric,
): RegionalInsight {
  const currentItem = items.find((item) => item.competence === selectedCompetence)
  const current = regionalMetricValue(currentItem, metric)
  if (current === null) {
    return {
      status: 'missing-current',
      metric,
      current: null,
      previousComparison: null,
      historicalComparison: null,
      historicalReason: null,
      summary: buildSummary(metric, null, null, null),
    }
  }

  const previousCompetence = shiftRegionalCompetence(selectedCompetence, -1)
  const previousValue = regionalMetricValue(
    items.find((item) => item.competence === previousCompetence),
    metric,
  )
  const previousComparison = previousValue === null || (metric === 'admissions' && previousValue <= 0)
    ? null
    : {
        reference: previousValue,
        difference:
          metric === 'iph'
            ? current - previousValue
            : ((current - previousValue) / previousValue) * 100,
        referenceCompetence: previousCompetence,
      }

  let historicalComparison: RegionalComparison | null = null
  let historicalReason: RegionalInsight['historicalReason'] = null

  if (metric === 'iph') {
    const selectedYear = Number(selectedCompetence.slice(0, 4))
    const selectedMonth = selectedCompetence.slice(5, 7)
    const valuesByYear = new Map<number, number>()
    for (const item of items) {
      if (
        !COMPETENCE_PATTERN.test(item.competence) ||
        item.competence >= selectedCompetence ||
        item.competence.slice(5, 7) !== selectedMonth
      ) {
        continue
      }
      const year = Number(item.competence.slice(0, 4))
      const value = regionalMetricValue(item, 'iph')
      if (year < selectedYear && value !== null && !valuesByYear.has(year)) {
        valuesByYear.set(year, value)
      }
    }
    if (valuesByYear.size >= 2) {
      const reference = [...valuesByYear.values()].reduce((sum, value) => sum + value, 0) /
        valuesByYear.size
      historicalComparison = {
        reference,
        difference: current - reference,
        years: valuesByYear.size,
      }
    } else {
      historicalReason = 'historico-insuficiente'
    }
  } else if (currentItem?.seasonality_status === 'calculado') {
    const reference = currentItem.historical_admissions_average
    const years = currentItem.historical_years
    if (finite(reference) && reference > 0 && finite(years) && years >= 1) {
      historicalComparison = {
        reference,
        difference: ((current - reference) / reference) * 100,
        years,
      }
    } else {
      historicalReason = finite(reference) && reference === 0
        ? 'referencia-zero'
        : 'historico-insuficiente'
    }
  } else {
    historicalReason = currentItem?.seasonality_status === 'fora_periodo_alvo'
      ? 'fora-periodo-alvo'
      : 'historico-insuficiente'
  }

  return {
    status: historicalComparison ? 'ready' : 'insufficient-history',
    metric,
    current,
    previousComparison,
    historicalComparison,
    historicalReason,
    summary: buildSummary(metric, current, previousComparison, historicalComparison),
  }
}

/**
 * Cria uma janela mensal explícita até a competência selecionada. Lacunas
 * viram slots nulos, portanto o gráfico não liga meses que não existem.
 */
export function regionalSeriesWindow<T extends RegionalInsightPoint>(
  items: T[],
  selectedCompetence: string,
  showAll: boolean,
  compactMonths = 12,
): RegionalSeriesSlot<T>[] {
  if (!COMPETENCE_PATTERN.test(selectedCompetence)) return []
  const byCompetence = new Map(
    items
      .filter(
        (item) =>
          COMPETENCE_PATTERN.test(item.competence) &&
          item.competence <= selectedCompetence,
      )
      .map((item) => [item.competence, item]),
  )
  const firstPublished = [...byCompetence.keys()].sort()[0]
  if (!firstPublished) return []
  const compactStart = shiftRegionalCompetence(selectedCompetence, -(compactMonths - 1))
  const start = showAll || firstPublished > compactStart ? firstPublished : compactStart
  const slots: RegionalSeriesSlot<T>[] = []
  for (
    let competence = start;
    competence && competence <= selectedCompetence;
    competence = shiftRegionalCompetence(competence, 1)
  ) {
    slots.push({ competence, item: byCompetence.get(competence) ?? null })
  }
  return slots
}

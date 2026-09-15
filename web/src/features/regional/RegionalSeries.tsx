import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  RegionalSeriesItem,
  RegionalSeriesResponse,
} from './regioesSerie'
import {
  regionalInsight,
  regionalMetricValue,
  regionalSeriesWindow,
  type RegionalInsightMetric,
} from './regionalInsights'
import {
  formatInteger,
  formatPercent,
  formatPeriod,
  formatPeriodLong,
} from '../../shared/format'

type IndicatorConfig = {
  label: string
  value: (item: RegionalSeriesItem) => number | null
  format: (value: number) => string
  detail: (item: RegionalSeriesItem) => string
  note: string
}

const INDICATORS: Record<RegionalInsightMetric, IndicatorConfig> = {
  iph: {
    label: 'IPH estimado',
    value: (item) => regionalMetricValue(item, 'iph'),
    format: formatPercent,
    detail: (item) =>
      `${formatInteger(item.estimated_patient_days)} pacientes-dia / ${formatInteger(item.declared_capacity_bed_days)} leitos-dia declarados`,
    note: 'Estimativa de pressão sobre a capacidade SUS declarada; não representa ocupação física real.',
  },
  admissions: {
    label: 'Internações novas',
    value: (item) => regionalMetricValue(item, 'admissions'),
    format: formatInteger,
    detail: (item) =>
      `${formatInteger(item.hospitals_with_admissions)} hospitais com produção`,
    note: 'Volume mensal publicado; variações não indicam melhora ou piora por si sós.',
  },
}

const INDICATOR_IDS = Object.keys(INDICATORS) as RegionalInsightMetric[]
const CHART_WIDTH = 760
const CHART_HEIGHT = 250
const CHART_LEFT = 58
const CHART_RIGHT = 22
const CHART_TOP = 30
const CHART_BOTTOM = 44

function chartPath(values: Array<number | null>, minimum: number, maximum: number) {
  const range = maximum - minimum || 1
  const usableWidth = CHART_WIDTH - CHART_LEFT - CHART_RIGHT
  const usableHeight = CHART_HEIGHT - CHART_TOP - CHART_BOTTOM
  return values
    .map((value, index) => {
      if (value === null) return null
      const x = CHART_LEFT + (index / Math.max(values.length - 1, 1)) * usableWidth
      const y = CHART_TOP + (1 - (value - minimum) / range) * usableHeight
      const previousIsValue = index > 0 && values[index - 1] !== null
      return `${previousIsValue ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .filter(Boolean)
    .join(' ')
}

function formatDifference(metric: RegionalInsightMetric, value: number) {
  const formatted = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const sign = Math.abs(value) < 0.05 ? '' : value > 0 ? '+' : '−'
  return `${sign}${Math.abs(value) < 0.05 ? '0,0' : formatted}${metric === 'iph' ? ' p.p.' : '%'}`
}

export default function RegionalSeries({
  data,
  selectedCompetence,
}: {
  data: RegionalSeriesResponse
  selectedCompetence: string
}) {
  const [indicatorId, setIndicatorId] = useState<RegionalInsightMetric>('iph')
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [tooltipCompetence, setTooltipCompetence] = useState<string | null>(null)
  const tooltipCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indicator = INDICATORS[indicatorId]
  const insight = useMemo(
    () => regionalInsight(data.items, selectedCompetence, indicatorId),
    [data.items, indicatorId, selectedCompetence],
  )
  const slots = useMemo(
    () => regionalSeriesWindow(data.items, selectedCompetence, showAllHistory),
    [data.items, selectedCompetence, showAllHistory],
  )
  const values = slots.map(({ item }) => (item ? indicator.value(item) : null))
  const baseline = insight.historicalComparison?.reference ?? null
  const numericValues = [
    ...values.filter((value): value is number => value !== null),
    ...(baseline === null ? [] : [baseline]),
  ]
  const minimum = numericValues.length ? Math.min(...numericValues) : 0
  const maximum = numericValues.length ? Math.max(...numericValues) : 0
  const range = maximum - minimum || 1
  const path = chartPath(values, minimum, maximum)
  const chartPoints = slots
    .map(({ competence, item }, index) => {
      const value = values[index]
      if (!item || value === null) return null
      const x = CHART_LEFT +
        (index / Math.max(values.length - 1, 1)) *
        (CHART_WIDTH - CHART_LEFT - CHART_RIGHT)
      const y = CHART_TOP +
        (1 - (value - minimum) / range) *
        (CHART_HEIGHT - CHART_TOP - CHART_BOTTOM)
      return { competence, item, value, x, y }
    })
    .filter((point): point is {
      competence: string
      item: RegionalSeriesItem
      value: number
      x: number
      y: number
    } => point !== null)
  const baselineY = baseline === null
    ? null
    : CHART_TOP +
      (1 - (baseline - minimum) / range) *
      (CHART_HEIGHT - CHART_TOP - CHART_BOTTOM)
  const tooltipPoint = chartPoints.find(
    (point) => point.competence === tooltipCompetence,
  )
  const firstCompetence = slots[0]?.competence
  const lastCompetence = slots.at(-1)?.competence
  const selectedMonth = formatPeriodLong(selectedCompetence).split('/')[0]
  const historicalLabel = insight.historicalComparison
    ? `Média de ${selectedMonth} nos ${insight.historicalComparison.years} anos anteriores`
    : null

  useEffect(() => {
    setShowAllHistory(false)
    setTooltipCompetence(null)
  }, [data.region.region_code, selectedCompetence])

  useEffect(() => () => {
    if (tooltipCloseTimer.current !== null) clearTimeout(tooltipCloseTimer.current)
  }, [])

  function cancelTooltipClose() {
    if (tooltipCloseTimer.current === null) return
    clearTimeout(tooltipCloseTimer.current)
    tooltipCloseTimer.current = null
  }

  function showTooltip(competence: string) {
    cancelTooltipClose()
    setTooltipCompetence(competence)
  }

  function hideTooltip() {
    cancelTooltipClose()
    setTooltipCompetence(null)
  }

  function scheduleTooltipClose() {
    cancelTooltipClose()
    tooltipCloseTimer.current = setTimeout(() => {
      setTooltipCompetence(null)
      tooltipCloseTimer.current = null
    }, 160)
  }

  return (
    <section className="regional-series-panel" aria-labelledby="regional-series-title">
      <div className="block-heading regional-series-heading">
        <div>
          <p className="section-kicker">EVOLUÇÃO</p>
          <h3 id="regional-series-title">Evolução regional</h3>
          <p>{data.region.region_name} · {formatPeriod(selectedCompetence)}</p>
        </div>
        <small>
          {indicatorId === 'iph'
            ? 'Estimativa mensal · histórico publicado'
            : 'Produção mensal · histórico publicado'}
        </small>
      </div>

      <div className="series-indicator-selector" role="radiogroup" aria-label="Indicador da evolução regional">
        {INDICATOR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={indicatorId === id}
            onClick={() => setIndicatorId(id)}
          >
            {INDICATORS[id].label}
          </button>
        ))}
      </div>

      <div className="series-insights" aria-live="polite">
        <article data-testid="regional-series-current">
          <span>{indicator.label} atual</span>
          <strong>
            {insight.current === null ? 'indisponível' : indicator.format(insight.current)}
          </strong>
          <small>{formatPeriod(selectedCompetence)}</small>
        </article>
        <article data-testid="regional-series-previous">
          <span>Mês anterior</span>
          <strong>
            {insight.previousComparison
              ? formatDifference(indicatorId, insight.previousComparison.difference)
              : 'indisponível'}
          </strong>
          <small>
            {insight.previousComparison
              ? `vs. ${formatPeriod(insight.previousComparison.referenceCompetence!)} · referência ${indicator.format(insight.previousComparison.reference)}`
              : 'Mês-calendário sem base válida'}
          </small>
        </article>
        <article data-testid="regional-series-historical">
          <span>Mesmo mês em anos anteriores</span>
          <strong>
            {insight.historicalComparison
              ? formatDifference(indicatorId, insight.historicalComparison.difference)
              : 'indisponível'}
          </strong>
          <small>
            {insight.historicalComparison
              ? `${historicalLabel}: ${indicator.format(insight.historicalComparison.reference)}`
              : insight.historicalReason === 'fora-periodo-alvo'
                ? 'Fora do período-alvo da sazonalidade publicada'
                : insight.historicalReason === 'referencia-zero'
                  ? 'Referência publicada igual a zero; variação não calculada'
                  : indicatorId === 'iph'
                    ? 'São necessários ao menos 2 anos comparáveis para IPH'
                    : 'Histórico publicado insuficiente'}
          </small>
        </article>
      </div>

      <p className="series-summary" data-testid="regional-series-summary">
        {insight.summary}
      </p>

      <div className="series-window-control">
        <span>
          {showAllHistory ? 'Todo o histórico até a competência' : 'Últimos 12 meses até a competência'}
        </span>
        {(showAllHistory || data.items.some((item) => item.competence < (slots[0]?.competence ?? selectedCompetence))) && (
          <button type="button" onClick={() => setShowAllHistory((current) => !current)}>
            {showAllHistory ? 'Ver 12 meses' : 'Todo o histórico'}
          </button>
        )}
      </div>

      {numericValues.length > 0 && firstCompetence && lastCompetence ? (
        <div className="series-chart" data-testid="regional-series-chart">
          <div className="series-chart-canvas">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              aria-labelledby="regional-series-chart-title regional-series-chart-description"
            >
              <title id="regional-series-chart-title">{indicator.label} ao longo do tempo</title>
              <desc id="regional-series-chart-description">
                Série de {formatPeriod(firstCompetence)} a {formatPeriod(lastCompetence)}; meses não publicados aparecem como lacunas. Mínimo {indicator.format(minimum)} e máximo {indicator.format(maximum)}.
                {historicalLabel && baseline !== null ? ` Linha pontilhada: ${historicalLabel}, ${indicator.format(baseline)}.` : ''}
              </desc>
              <line className="series-grid-line" x1={CHART_LEFT} x2={CHART_WIDTH - CHART_RIGHT} y1={CHART_TOP} y2={CHART_TOP} />
              <line className="series-grid-line" x1={CHART_LEFT} x2={CHART_WIDTH - CHART_RIGHT} y1={CHART_HEIGHT - CHART_BOTTOM} y2={CHART_HEIGHT - CHART_BOTTOM} />
              {baselineY !== null && (
                <line
                  className="series-baseline"
                  x1={CHART_LEFT}
                  x2={CHART_WIDTH - CHART_RIGHT}
                  y1={baselineY}
                  y2={baselineY}
                />
              )}
              <text className="series-axis-label" x={CHART_LEFT - 8} y={CHART_TOP + 4} textAnchor="end">{indicator.format(maximum)}</text>
              <text className="series-axis-label" x={CHART_LEFT - 8} y={CHART_HEIGHT - CHART_BOTTOM + 4} textAnchor="end">{indicator.format(minimum)}</text>
              <path className="series-line" d={path} />
              {chartPoints.map(({ competence, item, value, x, y }) => (
                <g
                  key={competence}
                  className="series-data-point"
                  data-testid={`regional-series-point-${competence}`}
                  role="img"
                  tabIndex={0}
                  aria-label={`${formatPeriod(competence)} · ${indicator.label}: ${indicator.format(value)}. ${indicator.detail(item)}`}
                  aria-describedby={tooltipCompetence === competence ? 'regional-series-tooltip' : undefined}
                  onMouseEnter={() => showTooltip(competence)}
                  onMouseLeave={scheduleTooltipClose}
                  onFocus={() => showTooltip(competence)}
                  onBlur={scheduleTooltipClose}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') hideTooltip()
                  }}
                >
                  <circle className="series-point-hit" cx={x} cy={y} r={13} />
                  <circle
                    className={competence === selectedCompetence ? 'series-point selected' : 'series-point'}
                    cx={x}
                    cy={y}
                    r={competence === selectedCompetence ? 6 : 3.5}
                  />
                </g>
              ))}
              <text className="series-axis-label" x={CHART_LEFT} y={CHART_HEIGHT - 12}>{formatPeriod(firstCompetence)}</text>
              <text className="series-axis-label" x={CHART_WIDTH - CHART_RIGHT} y={CHART_HEIGHT - 12} textAnchor="end">{formatPeriod(lastCompetence)}</text>
            </svg>
            {tooltipPoint && (
              <div
                id="regional-series-tooltip"
                role="tooltip"
                className={[
                  'series-tooltip',
                  tooltipPoint.x < 150 ? 'align-start' : tooltipPoint.x > 610 ? 'align-end' : '',
                  tooltipPoint.y < 95 ? 'place-below' : 'place-above',
                ].filter(Boolean).join(' ')}
                style={{
                  left: `${(tooltipPoint.x / CHART_WIDTH) * 100}%`,
                  top: `${(tooltipPoint.y / CHART_HEIGHT) * 100}%`,
                }}
                onMouseEnter={cancelTooltipClose}
                onMouseLeave={hideTooltip}
                data-testid="regional-series-tooltip"
              >
                <span>{formatPeriod(tooltipPoint.competence)} · {indicator.label}</span>
                <strong>{indicator.format(tooltipPoint.value)}</strong>
                <small>{indicator.detail(tooltipPoint.item)}</small>
              </div>
            )}
          </div>
          {historicalLabel && baseline !== null && (
            <p className="series-baseline-label">
              <span aria-hidden="true" /> {historicalLabel}: {indicator.format(baseline)}
            </p>
          )}
          <p>{indicator.note}</p>
        </div>
      ) : (
        <p className="series-no-values">Não há valores publicados nesta janela.</p>
      )}

      <details className="series-values-details">
        <summary>
          Valores, amostras e denominadores ({formatInteger(slots.length)} meses)
        </summary>
        <div className="series-table-scroll">
          <table>
            <thead>
              <tr><th>Competência</th><th>{indicator.label}</th><th>Amostra ou denominador</th></tr>
            </thead>
            <tbody>
              {[...slots].reverse().map(({ competence, item }) => {
                const value = item ? indicator.value(item) : null
                return (
                  <tr key={competence} className={competence === selectedCompetence ? 'selected' : undefined}>
                    <th scope="row">{formatPeriod(competence)}</th>
                    <td>{value === null ? 'não publicado' : indicator.format(value)}</td>
                    <td>{item ? indicator.detail(item) : 'Competência ausente na série publicada'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

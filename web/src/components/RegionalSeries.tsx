import { useMemo, useState } from 'react'
import type {
  RegionalSeriesItem,
  RegionalSeriesResponse,
} from '../api/regioesSerie'
import {
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatPercent,
  formatPeriod,
} from '../utils/format'

type IndicatorId = 'iph' | 'admissions' | 'tmh' | 'cmi' | 'seasonality'

type IndicatorConfig = {
  label: string
  value: (item: RegionalSeriesItem) => number | null
  format: (value: number) => string
  detail: (item: RegionalSeriesItem) => string
  note: string
}

const INDICATORS: Record<IndicatorId, IndicatorConfig> = {
  iph: {
    label: 'IPH estimado',
    value: (item) => item.iph_percent,
    format: formatPercent,
    detail: (item) =>
      `${formatInteger(item.estimated_patient_days)} pacientes-dia / ${formatInteger(item.declared_capacity_bed_days)} leitos-dia declarados`,
    note: 'Pressão estimada sobre capacidade SUS declarada; não representa ocupação física real.',
  },
  admissions: {
    label: 'Internações novas',
    value: (item) => item.new_admissions,
    format: formatInteger,
    detail: (item) =>
      `${formatInteger(item.hospitals_with_admissions)} hospitais com produção`,
    note: 'Amostra mensal de internações novas persistida na Gold.',
  },
  tmh: {
    label: 'TMH observado',
    value: (item) => item.tmh_percent,
    format: formatPercent,
    detail: (item) =>
      `${formatInteger(item.deaths)} óbitos · ${formatInteger(item.new_admissions)} internações`,
    note: 'Mortalidade observada sem ajuste de risco; não mede causalmente qualidade.',
  },
  cmi: {
    label: 'CMI nominal',
    value: (item) => item.cmi_nominal,
    format: formatCurrency,
    detail: (item) => `${formatInteger(item.new_admissions)} internações novas`,
    note: 'Valor SIH aprovado médio nominal; não representa custo contábil completo.',
  },
  seasonality: {
    label: 'Índice sazonal',
    value: (item) => item.seasonality_index,
    format: formatDecimal,
    detail: (item) =>
      item.seasonality_status === 'calculado'
        ? `${formatInteger(item.historical_years)} anos comparáveis · média histórica ${formatDecimal(item.historical_admissions_average)}`
        : 'Não calculado para esta competência',
    note: 'Comparação com a média do mesmo mês histórico; não é previsão definitiva.',
  },
}

const INDICATOR_IDS = Object.keys(INDICATORS) as IndicatorId[]
const TABLE_PREVIEW_SIZE = 6
const CHART_WIDTH = 760
const CHART_HEIGHT = 250
const CHART_LEFT = 58
const CHART_RIGHT = 22
const CHART_TOP = 22
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

export default function RegionalSeries({
  data,
  selectedCompetence,
}: {
  data: RegionalSeriesResponse
  selectedCompetence: string
}) {
  const [indicatorId, setIndicatorId] = useState<IndicatorId>('iph')
  const [showAllRows, setShowAllRows] = useState(false)
  const indicator = INDICATORS[indicatorId]
  const chronologicalItems = useMemo(
    () => [...data.items].sort((left, right) => left.competence.localeCompare(right.competence)),
    [data.items],
  )
  const selectedItem =
    chronologicalItems.find((item) => item.competence === selectedCompetence) ??
    chronologicalItems.at(-1) ??
    null
  const values = chronologicalItems.map(indicator.value)
  const numericValues = values.filter((value): value is number => value !== null)
  const minimum = numericValues.length ? Math.min(...numericValues) : 0
  const maximum = numericValues.length ? Math.max(...numericValues) : 0
  const path = chartPath(values, minimum, maximum)
  const descendingItems = [...chronologicalItems].reverse()
  const tableItems = showAllRows
    ? descendingItems
    : descendingItems.slice(0, TABLE_PREVIEW_SIZE)
  const firstCompetence = chronologicalItems[0]?.competence
  const lastCompetence = chronologicalItems.at(-1)?.competence

  return (
    <section className="regional-series-panel" aria-labelledby="regional-series-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">EVOLUÇÃO MENSAL</p>
          <h3 id="regional-series-title">Série de {data.region.region_name}</h3>
          <p>
            {formatInteger(data.pagination.count)} competências · ordem cronológica explícita na visualização
          </p>
        </div>
        <strong data-testid="regional-series-source">
          {data.source === 'oracle-live' ? 'Oracle ao vivo' : 'Snapshot de contingência'}
        </strong>
      </div>

      <div className="series-indicator-selector" role="radiogroup" aria-label="Indicador da série">
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

      {selectedItem && (
        <div className="series-current-value" data-testid="regional-series-current">
          <span>{formatPeriod(selectedItem.competence)} · {indicator.label}</span>
          <strong>
            {indicator.value(selectedItem) === null
              ? 'não calculado'
              : indicator.format(indicator.value(selectedItem)!)}
          </strong>
          <small>{indicator.detail(selectedItem)}</small>
        </div>
      )}

      {numericValues.length > 0 ? (
        <div className="series-chart" data-testid="regional-series-chart">
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            aria-labelledby="regional-series-chart-title regional-series-chart-description"
          >
            <title id="regional-series-chart-title">{indicator.label} ao longo do tempo</title>
            <desc id="regional-series-chart-description">
              Série de {formatPeriod(firstCompetence!)} a {formatPeriod(lastCompetence!)}; mínimo {indicator.format(minimum)} e máximo {indicator.format(maximum)}.
            </desc>
            <line className="series-grid-line" x1={CHART_LEFT} x2={CHART_WIDTH - CHART_RIGHT} y1={CHART_TOP} y2={CHART_TOP} />
            <line className="series-grid-line" x1={CHART_LEFT} x2={CHART_WIDTH - CHART_RIGHT} y1={CHART_HEIGHT - CHART_BOTTOM} y2={CHART_HEIGHT - CHART_BOTTOM} />
            <text className="series-axis-label" x={CHART_LEFT - 8} y={CHART_TOP + 4} textAnchor="end">{indicator.format(maximum)}</text>
            <text className="series-axis-label" x={CHART_LEFT - 8} y={CHART_HEIGHT - CHART_BOTTOM + 4} textAnchor="end">{indicator.format(minimum)}</text>
            <path className="series-line" d={path} />
            {chronologicalItems.map((item, index) => {
              const value = values[index]
              if (value === null) return null
              const range = maximum - minimum || 1
              const x = CHART_LEFT + (index / Math.max(values.length - 1, 1)) * (CHART_WIDTH - CHART_LEFT - CHART_RIGHT)
              const y = CHART_TOP + (1 - (value - minimum) / range) * (CHART_HEIGHT - CHART_TOP - CHART_BOTTOM)
              return (
                <circle
                  key={item.competence}
                  className={item.competence === selectedItem?.competence ? 'series-point selected' : 'series-point'}
                  cx={x}
                  cy={y}
                  r={item.competence === selectedItem?.competence ? 6 : 3.5}
                />
              )
            })}
            <text className="series-axis-label" x={CHART_LEFT} y={CHART_HEIGHT - 12}>{formatPeriod(firstCompetence!)}</text>
            <text className="series-axis-label" x={CHART_WIDTH - CHART_RIGHT} y={CHART_HEIGHT - 12} textAnchor="end">{formatPeriod(lastCompetence!)}</text>
          </svg>
          <p>{indicator.note}</p>
        </div>
      ) : (
        <p className="series-no-values">O indicador não foi calculado em nenhuma competência deste recorte.</p>
      )}

      <details className="series-values-details">
        <summary>
          Valores, amostras e denominadores ({formatInteger(tableItems.length)} de {formatInteger(descendingItems.length)})
        </summary>
        <div className="series-table-scroll">
          <table>
            <thead>
              <tr><th>Competência</th><th>{indicator.label}</th><th>Amostra ou denominador</th></tr>
            </thead>
            <tbody>
              {tableItems.map((item) => {
                const value = indicator.value(item)
                return (
                  <tr key={item.competence} className={item.competence === selectedItem?.competence ? 'selected' : undefined}>
                    <th scope="row">{formatPeriod(item.competence)}</th>
                    <td>{value === null ? 'não calculado' : indicator.format(value)}</td>
                    <td>{indicator.detail(item)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {descendingItems.length > TABLE_PREVIEW_SIZE && (
          <button type="button" onClick={() => setShowAllRows((current) => !current)}>
            {showAllRows ? 'Mostrar as 6 competências mais recentes' : `Ver todas as ${descendingItems.length} competências`}
          </button>
        )}
      </details>
    </section>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import { formatPeriod } from './format'
import './MonthlyChart.css'

export type MonthlyPoint = { competence: string; value: number | null; detail: string }

/** Real layout width keeps labels readable at 390 px instead of shrinking an SVG. */
export function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(760)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, entry.contentRect.width)),
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

export default function MonthlyChart({
  points,
  label,
  format,
}: {
  points: MonthlyPoint[]
  label: string
  format: (value: number) => string
}) {
  const { ref, width } = useChartWidth()
  const id = useId()
  const [active, setActive] = useState<string | null>(null)
  const values = points.flatMap((point) => (point.value === null ? [] : [point.value]))
  const lo = values.length ? Math.min(...values) : 0
  const hi = values.length ? Math.max(...values) : 0
  const margin = Math.max((hi - lo) * 0.2, hi * 0.04, 1)
  const minimum = Math.max(0, lo - margin)
  const maximum = hi + margin
  const left = 64,
    right = width - 18,
    top = 24,
    bottom = 220
  const x = (index: number) => left + (index / Math.max(points.length - 1, 1)) * (right - left)
  const y = (value: number) =>
    bottom - ((value - minimum) / (maximum - minimum || 1)) * (bottom - top)
  const path = points
    .map((p, i) =>
      p.value === null
        ? ''
        : `${i > 0 && points[i - 1].value !== null ? 'L' : 'M'}${x(i)},${y(p.value)}`,
    )
    .join(' ')
  const selected = points.find((p) => p.competence === active)
  const labels = Math.max(2, Math.floor(width / 140))

  return (
    <div ref={ref} className="monthly-chart" data-testid="hospital-series-chart">
      {values.length === 0 ? (
        <p>Não há valores publicados nesta janela.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} 264`} role="group" aria-labelledby={`${id}-title ${id}-desc`}>
            <title id={`${id}-title`}>{label} ao longo do tempo</title>
            <desc id={`${id}-desc`}>
              Meses ausentes aparecem como lacunas. Toque ou use Tab para consultar cada
              competência. Escala de {format(minimum)} a {format(maximum)}.
            </desc>
            {[minimum, (minimum + maximum) / 2, maximum].map((value) => (
              <g key={value}>
                <line x1={left} x2={right} y1={y(value)} y2={y(value)} className="monthly-grid" />
                <text x={left - 9} y={y(value) + 4} textAnchor="end">
                  {format(value)}
                </text>
              </g>
            ))}
            <path d={path} className="monthly-line" />
            {points.map((point, i) =>
              point.value === null ? null : (
                <g
                  key={point.competence}
                  role="button"
                  tabIndex={0}
                  className="monthly-point"
                  data-testid={`hospital-series-point-${point.competence}`}
                  aria-label={`${formatPeriod(point.competence)} · ${label}: ${format(point.value)}. ${point.detail}`}
                  aria-pressed={active === point.competence}
                  onFocus={() => setActive(point.competence)}
                  onClick={() => setActive(point.competence)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setActive(point.competence)
                    }
                    if (event.key === 'Escape') setActive(null)
                  }}
                >
                  <circle cx={x(i)} cy={y(point.value)} r={22} className="monthly-hit" />
                  <circle
                    cx={x(i)}
                    cy={y(point.value)}
                    r={i === points.length - 1 ? 6 : 4}
                    className="monthly-dot"
                  />
                </g>
              ),
            )}
            {points.map((point, i) =>
              i === 0 || i === points.length - 1 || i % Math.ceil(points.length / labels) === 0 ? (
                <text
                  key={point.competence}
                  x={x(i)}
                  y={252}
                  textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
                >
                  {formatPeriod(point.competence)}
                </text>
              ) : null,
            )}
          </svg>
          <p className="monthly-readout" aria-live="polite">
            {selected?.value != null ? (
              <>
                <strong>
                  {formatPeriod(selected.competence)} · {format(selected.value)}
                </strong>{' '}
                · {selected.detail}
              </>
            ) : (
              'Toque em um ponto ou use Tab para consultar os valores.'
            )}
          </p>
        </>
      )}
    </div>
  )
}

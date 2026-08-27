import { useMemo } from 'react'
import type { RegionalSummaryItem } from '../../lib/api/regioes'
import { formatInteger, formatPercent, formatPeriod } from '../../shared/format'
import './SeasonalSignal.css'

type SeasonalSignalProps = {
  items: RegionalSummaryItem[]
  selected: RegionalSummaryItem
  competence: string
  onSelect: (regionCode: string) => void
}

const HIGHLIGHT_SIZE = 4
/* Abaixo disso a diferença é ruído do próprio volume mensal, não sinal. */
const NOISE_BAND = 0.05

function deviation(item: RegionalSummaryItem) {
  return item.seasonality_index === null ? null : item.seasonality_index - 1
}

function formatDeviation(value: number) {
  const percent = formatPercent(Math.abs(value) * 100)
  if (Math.abs(value) < NOISE_BAND) return percent
  return `${value > 0 ? '+' : '−'}${percent}`
}

/**
 * A leitura sazonal abre a etapa territorial: em vez de perguntar por onde
 * começar, a seção mostra o que está fora do que costuma ser neste mês.
 *
 * Nada aqui é previsão. A comparação é com a média observada do mesmo mês em
 * anos anteriores, e o número de anos comparáveis fica à vista justamente
 * porque dois anos sustentam bem menos que cinco.
 */
export default function SeasonalSignal({
  items,
  selected,
  competence,
  onSelect,
}: SeasonalSignalProps) {
  const above = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.seasonality_status === 'calculado' &&
            (deviation(item) ?? 0) > NOISE_BAND,
        )
        .sort((left, right) => (deviation(right) ?? 0) - (deviation(left) ?? 0)),
    [items],
  )
  const highlights = above.slice(0, HIGHLIGHT_SIZE)
  const selectedDeviation = deviation(selected)
  const monthLabel = formatPeriod(competence)

  if (selected.seasonality_status !== 'calculado' || selectedDeviation === null) {
    return (
      <section className="seasonal-signal" aria-labelledby="seasonal-title">
        <p className="section-kicker">COMPORTAMENTO SAZONAL</p>
        <h3 id="seasonal-title">
          Sem comparação sazonal para {selected.region_name} em {monthLabel}
        </h3>
        <p className="seasonal-reason" data-testid="seasonal-unavailable">
          {selected.seasonality_status === 'fora_periodo_alvo'
            ? 'Esta competência está fora do período-alvo definido para a comparação sazonal.'
            : `Há ${formatInteger(selected.historical_years)} ${
                selected.historical_years === 1 ? 'ano comparável' : 'anos comparáveis'
              } para este mês, insuficiente para comparar.`}
        </p>
      </section>
    )
  }

  const withinNoise = Math.abs(selectedDeviation) < NOISE_BAND
  const direction = selectedDeviation > 0 ? 'acima' : 'abaixo'

  return (
    <section className="seasonal-signal" aria-labelledby="seasonal-title">
      <p className="section-kicker">COMPORTAMENTO SAZONAL</p>
      <h3 id="seasonal-title">
        {selected.region_name} em {monthLabel}
      </h3>

      <p
        className={`seasonal-headline ${withinNoise ? 'neutral' : selectedDeviation > 0 ? 'up' : 'down'}`}
        data-testid="seasonal-headline"
      >
        <strong>{formatDeviation(selectedDeviation)}</strong>{' '}
        {withinNoise
          ? 'de diferença: o mês está dentro do que costuma ser.'
          : `${direction} do que este mês costuma ser.`}
      </p>

      <p className="seasonal-basis" data-testid="seasonal-basis">
        {formatInteger(selected.new_admissions)} internações novas contra{' '}
        {formatInteger(Math.round(selected.historical_admissions_average))} na média do
        mesmo mês em {formatInteger(selected.historical_years)}{' '}
        {selected.historical_years === 1 ? 'ano anterior' : 'anos anteriores'}.
      </p>

      {highlights.length > 0 && (
        <div className="seasonal-highlights">
          <p className="seasonal-highlights-label">
            Acima do próprio padrão neste mês
            <span data-testid="seasonal-above-count">
              {formatInteger(above.length)} de {formatInteger(items.length)} regiões
            </span>
          </p>
          <ul>
            {highlights.map((item) => (
              <li key={item.region_code}>
                <button
                  type="button"
                  onClick={() => onSelect(item.region_code)}
                  aria-current={item.region_code === selected.region_code ? 'true' : undefined}
                >
                  <span>{item.region_name}</span>
                  <strong>{formatDeviation(deviation(item) as number)}</strong>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

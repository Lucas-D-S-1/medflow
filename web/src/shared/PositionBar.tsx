import type { Distribution } from '../features/hospital/pares'
import './PositionBar.css'

type PositionBarProps = {
  value: number
  distribution: Distribution
  percentile: number
  /** Como o número é escrito: percentual, dias, moeda. */
  format: (value: number) => string
  peerLabel: string
  testId?: string
}

/**
 * Onde o valor cai entre os pares. A faixa escura é o intervalo interquartil —
 * a metade central do grupo — e o traço é a mediana.
 *
 * A barra não pinta bom e ruim. Ela responde "o que é típico aqui", que é a
 * pergunta que o número sozinho nunca respondeu; concluir se estar acima é
 * bom depende do indicador e do contexto, e isso continua com quem lê.
 */
export default function PositionBar({
  value,
  distribution,
  percentile,
  format,
  peerLabel,
  testId,
}: PositionBarProps) {
  // A escala vai de p10 a p90 para que a metade central ocupe espaço legível;
  // valores fora disso ancoram nas pontas e são anunciados no texto.
  const floor = Math.min(distribution.p10, value)
  const ceiling = Math.max(distribution.p90, value)
  const span = ceiling - floor
  const at = (candidate: number) => (span <= 0 ? 50 : ((candidate - floor) / span) * 100)

  return (
    <div className="position-bar" data-testid={testId}>
      <div className="position-track" aria-hidden="true">
        <span
          className="position-box"
          style={{ left: `${at(distribution.p25)}%`, right: `${100 - at(distribution.p75)}%` }}
        />
        <span className="position-median" style={{ left: `${at(distribution.median)}%` }} />
        <span className="position-marker" style={{ left: `${at(value)}%` }} />
      </div>
      <p className="position-legend">
        <strong>
          {percentile >= 50
            ? `acima de ${Math.round(percentile)}% dos pares`
            : `abaixo de ${Math.round(100 - percentile)}% dos pares`}
        </strong>
        <span>
          mediana {format(distribution.median)} · metade central entre{' '}
          {format(distribution.p25)} e {format(distribution.p75)}
        </span>
        <small>
          {distribution.count} {peerLabel}
        </small>
      </p>
    </div>
  )
}

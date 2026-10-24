import { formatPeriod } from './format'

type SourceBadgeProps = {
  kind: 'live' | 'fallback'
  dataThrough: string
}

export default function SourceBadge({ kind, dataThrough }: SourceBadgeProps) {
  return (
    <span className={`source-badge ${kind}`} data-testid="source-badge">
      <span aria-hidden="true" />
      {kind === 'live'
        ? `Base mensal · dados até ${formatPeriod(dataThrough)}`
        : `Cópia local parcial · dados até ${formatPeriod(dataThrough)}`}
    </span>
  )
}

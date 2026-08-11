type SourceBadgeProps = {
  kind: 'live' | 'fallback'
  dataThrough: string
}

export default function SourceBadge({ kind, dataThrough }: SourceBadgeProps) {
  return (
    <span className={`source-badge ${kind}`} data-testid="source-badge">
      <span aria-hidden="true" />
      {kind === 'live' ? 'Oracle ao vivo' : `Contingência — snapshot até ${dataThrough}`}
    </span>
  )
}

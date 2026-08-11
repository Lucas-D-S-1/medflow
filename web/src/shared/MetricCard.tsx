import type { ReactNode } from 'react'

type MetricCardProps = {
  label: string
  value: ReactNode
  detail: ReactNode
  testId?: string
}

export default function MetricCard({ label, value, detail, testId }: MetricCardProps) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong data-testid={testId}>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

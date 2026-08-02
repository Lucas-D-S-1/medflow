import type { ReactNode } from 'react'

type StatePanelProps = {
  kind: 'loading' | 'empty' | 'error'
  title: string
  children: ReactNode
  testId: string
  action?: ReactNode
}

export default function StatePanel({ kind, title, children, testId, action }: StatePanelProps) {
  return (
    <div className={`state-message ${kind}`} data-testid={testId} role={kind === 'error' ? 'alert' : 'status'}>
      <span className={kind === 'loading' ? 'loader' : `state-icon ${kind}`} aria-hidden="true">
        {kind === 'error' ? '!' : kind === 'empty' ? '—' : ''}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
        {action}
      </div>
    </div>
  )
}

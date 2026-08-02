import type { ReactNode } from 'react'

export default function MethodNote({ children }: { children: ReactNode }) {
  return <p className="method-note">{children}</p>
}

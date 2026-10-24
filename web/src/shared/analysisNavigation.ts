export const ANCHOR_REQUEST_EVENT = 'medflow-anchor-request'

let recentAnchor: { id: string; at: number } | null = null

export function recentAnalysisSection() {
  if (!recentAnchor || performance.now() - recentAnchor.at > 2000) return null
  return recentAnchor.id.startsWith('hospital') || recentAnchor.id.startsWith('specialty')
    ? 'hospital'
    : recentAnchor.id === 'regional'
      ? 'regional'
      : null
}

export function rememberAnalysisAnchor(id: string) {
  recentAnchor = { id, at: performance.now() }
}

export function requestAnalysisAnchor(id: string) {
  rememberAnalysisAnchor(id)
  window.dispatchEvent(new CustomEvent<string>(ANCHOR_REQUEST_EVENT, { detail: id }))
}

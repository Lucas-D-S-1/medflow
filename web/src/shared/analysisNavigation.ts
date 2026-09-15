export const ANCHOR_REQUEST_EVENT = 'medflow-anchor-request'

export function requestAnalysisAnchor(id: string) {
  window.dispatchEvent(new CustomEvent<string>(ANCHOR_REQUEST_EVENT, { detail: id }))
}

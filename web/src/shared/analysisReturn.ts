type ReadingOrigin = {
  key: string
  pathname: string
  search: string
  hash: string
  scrollY: number
  focusId: string | null
  hospitalLabel: string | null
  specialtyLabel: string | null
}
const origins = new Map<string, ReadingOrigin>()
let latest: ReadingOrigin | null = null

/** Only analysis entries actually visited in this tab can be resumed. */
export function rememberAnalysisReading(location: {
  key: string
  pathname: string
  search: string
  hash: string
}) {
  const active = document.activeElement
  const record = {
    ...location,
    hospitalLabel: document.querySelector('.hospital-identity h2')?.textContent ?? null,
    specialtyLabel:
      document.querySelector('.specialty-choice[aria-pressed="true"] strong')?.textContent ?? null,
    scrollY: window.scrollY,
    focusId: active instanceof HTMLElement ? active.id || null : null,
  }
  origins.set(location.key, record)
  latest = record
}
export function analysisReading(key: string) {
  return origins.get(key)
}
export function resumableAnalysis(search: string) {
  return latest?.search === search ? latest : null
}

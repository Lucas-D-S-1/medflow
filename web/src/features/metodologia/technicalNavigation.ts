// Only origins recorded by an ordinary click in this tab may use history back.
// A reload or a new tab starts without this record and uses the safe route.
type Origin = { key: string; pathname: string; search: string; hash: string }
const origins = new Map<string, { origin: Origin; scrollY: number }>()

export function rememberTechnicalOrigin(origin: Origin) {
  origins.set(origin.key, { origin, scrollY: window.scrollY })
}

export function technicalOrigin(state: unknown, search: string) {
  const key = (state as { technicalOriginKey?: unknown } | null)?.technicalOriginKey
  const record = typeof key === 'string' ? origins.get(key) : undefined
  return record?.origin.pathname === '/metodologia' && record.origin.search === search
    ? record
    : undefined
}

export function sourcesReturnPosition(key: string) {
  return origins.get(key)?.scrollY
}

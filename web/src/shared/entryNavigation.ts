const ANALYSIS_PARAMS = ['competencia', 'regiao', 'macrorregiao', 'hospital', 'busca', 'elegiveis', 'destino']
const ANALYSIS_ANCHORS = ['#regional', '#hospital', '#hospital-detail', '#fluxos']

export function isEntryLocation(location: { pathname: string; search: string; hash: string }) {
  if (location.pathname !== '/') return false
  const params = new URLSearchParams(location.search)
  if (params.get('inicio') === '1') return true
  if (params.get('inicio') === '0') return false
  return !ANALYSIS_PARAMS.some((key) => params.has(key)) && !ANALYSIS_ANCHORS.includes(location.hash)
}

export function withEntryIntent(search: string, entry: boolean) {
  const params = new URLSearchParams(search)
  params.set('inicio', entry ? '1' : '0')
  return `?${params}`
}

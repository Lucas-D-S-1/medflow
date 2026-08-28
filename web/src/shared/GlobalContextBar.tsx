import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSource } from './SourceContext'
import { formatPeriod } from './format'
import { formatRegionalNetwork } from './territory'
import './GlobalContextBar.css'

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export default function GlobalContextBar() {
  const {
    sourceState,
    regionalLoadState,
    sharedCompetence,
    sharedRegionCode,
    sharedMacroregionCode,
    setSharedCompetence,
    setSharedRegion,
    setSharedMacroregion,
  } = useSource()
  const navigate = useNavigate()
  const [lookup, setLookup] = useState('')
  const [lookupMessage, setLookupMessage] = useState('')
  const sourceData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data
      : null
  const isFallback = sourceState.kind === 'fallback'
  const isReady = Boolean(sourceData)

  const macroregions = useMemo(() => {
    if (!sourceData) return []
    return sourceData.regions.items
      .filter(
        (item, index, items) =>
          items.findIndex(
            (candidate) => candidate.macroregion_code === item.macroregion_code,
          ) === index,
      )
      .sort((left, right) =>
        formatRegionalNetwork(left.macroregion_name).localeCompare(
          formatRegionalNetwork(right.macroregion_name),
          'pt-BR',
        ),
      )
  }, [sourceData])

  const regions = useMemo(
    () =>
      sourceData
        ? [...sourceData.regions.items].sort((left, right) =>
            left.region_name.localeCompare(right.region_name, 'pt-BR'),
          )
        : [],
    [sourceData],
  )
  const selectedMacroregionCode = macroregions.some(
    (item) => item.macroregion_code === sharedMacroregionCode,
  )
    ? sharedMacroregionCode
    : ''

  function submitLookup(event: FormEvent) {
    event.preventDefault()
    const clean = lookup.trim().slice(0, 120)
    if (!clean) {
      setLookupMessage('Digite uma região, RRAS ou hospital para buscar.')
      return
    }

    const normalized = normalize(clean)
    const region = regions.find(
      (item) =>
        item.region_code === clean || normalize(item.region_name) === normalized,
    )
    if (region) {
      setSharedRegion(region.region_code)
      setLookupMessage(`Região selecionada: ${region.region_name}.`)
      return
    }

    const macroregion = macroregions.find(
      (item) =>
        item.macroregion_code === clean ||
        normalize(item.macroregion_name) === normalized ||
        normalize(formatRegionalNetwork(item.macroregion_name)) === normalized,
    )
    if (macroregion) {
      setSharedMacroregion(macroregion.macroregion_code)
      setLookupMessage(
        `Rede regional selecionada: ${formatRegionalNetwork(macroregion.macroregion_name)}.`,
      )
      return
    }

    // The public contract accepts hospital name/alias in `busca`. Keep this
    // as a local hospital filter in the URL; municipality/coordinator/zone
    // lookup is deliberately not guessed from fields the response does not
    // publish.
    const params = new URLSearchParams(window.location.search)
    params.set('busca', clean)
    params.delete('hospital')
    // A busca hospitalar leva à etapa de hospitais da mesma página, não a uma
    // tela separada.
    navigate({ pathname: '/', search: `?${params.toString()}`, hash: '#hospital' })
    setLookupMessage('Busca encaminhada para hospitais por nome ou alias publicado.')
  }

  return (
    <section className="global-context-bar" aria-label="Contexto global da análise">
      <div className="global-context-inner">
        <div className="global-context-heading">
          <p className="section-kicker">CONTEXTO DA ANÁLISE</p>
          <strong>Competência e território</strong>
        </div>
        <div className="global-context-fields">
          <label>
            Competência
            <input
              type="month"
              value={sharedCompetence}
              max={sourceData?.status.data_through}
              disabled={!isReady || isFallback}
              data-testid="global-competence"
              onChange={(event) => setSharedCompetence(event.target.value)}
              aria-describedby="global-context-help"
            />
          </label>
          <label>
            Rede Regional de Atenção à Saúde
            <select
              value={selectedMacroregionCode}
              disabled={!isReady || isFallback}
              data-testid="global-macroregion"
              onChange={(event) => setSharedMacroregion(event.target.value)}
            >
              <option value="">Todas as redes regionais</option>
              {macroregions.map((item) => (
                <option key={item.macroregion_code} value={item.macroregion_code}>
                  {formatRegionalNetwork(item.macroregion_name)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Região de saúde
            <select
              value={sharedRegionCode}
              disabled={!isReady || isFallback}
              data-testid="global-region"
              onChange={(event) => setSharedRegion(event.target.value)}
            >
              {/* O vazio não é ausência de opção: é o panorama, com as 62
                  regiões comparáveis no mapa. */}
              <option value="">Nenhuma — comparar no mapa</option>
              {regions.map((item) => (
                <option key={item.region_code} value={item.region_code}>
                  {item.region_name}
                </option>
              ))}
            </select>
          </label>
          <form className="global-context-search" role="search" onSubmit={submitLookup}>
            <label htmlFor="global-lookup">Busca rápida</label>
            <div>
              <input
                id="global-lookup"
                type="search"
                value={lookup}
                maxLength={120}
                placeholder="Região, RRAS ou hospital"
                disabled={!isReady}
                data-testid="global-search"
                onChange={(event) => {
                  setLookup(event.target.value)
                  setLookupMessage('')
                }}
                aria-describedby="global-search-help global-search-status"
              />
              <button type="submit" disabled={!isReady}>
                Buscar
              </button>
            </div>
          </form>
        </div>
        <small id="global-context-help" className="global-context-help">
          {isFallback
            ? `Recorte fixo em ${formatPeriod(sharedCompetence)}; tente novamente para consultar outro período.`
            : regionalLoadState === 'loading'
              ? 'Carregando a competência compartilhada; os filtros locais permanecem na URL.'
              : 'A troca preserva filtros locais. A busca rápida aceita região, rede regional e hospital por nome ou alias.'}
        </small>
        <small id="global-search-help" className="global-context-help">
          Município, coordenadoria e zona não são inventados: ficam fora da busca rápida enquanto o contrato público não fornecer esses nomes.
        </small>
        <small id="global-search-status" className="global-context-status" role="status">
          {lookupMessage}
        </small>
      </div>
    </section>
  )
}

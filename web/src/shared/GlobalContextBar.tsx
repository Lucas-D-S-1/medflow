import { useMemo } from 'react'
import { useSource } from './SourceContext'
import CompetencePicker from './CompetencePicker'
import { shiftCompetence } from './SourceContext'
import { formatPeriod } from './format'
import { formatRegionalNetwork } from './territory'
import './GlobalContextBar.css'

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
  const sourceData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data
      : null
  const isFallback = sourceState.kind === 'fallback'
  const isReady = Boolean(sourceData)
  // O recorte publicado sai da própria cobertura: a última competência menos o
  // número de competências publicadas. Cravar 2024-01 aqui daria uma faixa que
  // deixaria de ser verdade no próximo avanço do pipeline.
  const lastCompetence = sourceData?.status.data_through ?? ''
  const firstCompetence = lastCompetence
    ? shiftCompetence(lastCompetence, -(sourceData?.methodology.coverage.competencies ?? 1) + 1)
    : ''

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
  const selectableRegions = selectedMacroregionCode
    ? regions.filter((item) => item.macroregion_code === selectedMacroregionCode)
    : regions

  return (
    <section className="global-context-bar" aria-label="Filtros regionais">
      <div className="global-context-inner">
        <div className="global-context-fields">
          <label>
            Competência
            <CompetencePicker
              value={sharedCompetence}
              min={firstCompetence}
              max={lastCompetence}
              disabled={!isReady || isFallback}
              onChange={setSharedCompetence}
            />
          </label>
          <label>
            Rede regional
            <select
              value={selectedMacroregionCode}
              disabled={!isReady || isFallback}
              data-testid="global-macroregion"
              onChange={(event) => setSharedMacroregion(event.target.value)}
            >
              <option value="">Todas</option>
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
              {/* O vazio mantém o panorama do recorte, sem eleger uma região. */}
              <option value="">Todas as regiões</option>
              {selectableRegions.map((item) => (
                <option key={item.region_code} value={item.region_code}>
                  {item.region_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {(isFallback || regionalLoadState === 'loading') && (
          <small id="global-context-help" className="global-context-help" role="status">
            {isFallback
              ? `Recorte local fixo em ${formatPeriod(sharedCompetence)}.`
              : 'Carregando a competência selecionada.'}
          </small>
        )}
      </div>
    </section>
  )
}

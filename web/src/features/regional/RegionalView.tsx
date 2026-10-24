import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchRegiaoSerie,
  getRegiaoSerieSnapshot,
  type RegionalSeriesResponse,
} from './regioesSerie'
import RegionalMap from './RegionalMap'
import RegionalSeries from './RegionalSeries'
import GlobalContextBar from '../../shared/GlobalContextBar'
import { MoreRegionalIndicators, RegionalLimitNote, RegionalOverview } from './RegionalOverview'
import { Link, useLocation } from 'react-router-dom'
import { requestAnalysisAnchor } from '../../shared/analysisNavigation'
import { useActiveSection } from '../../shared/useActiveSection'
import { aggregateRegions } from './agregado'
import { aggregateVariation, computeSignals, variation } from './sinais'
import StatePanel from '../../shared/StatePanel'
import { shiftCompetence, useSource } from '../../shared/SourceContext'
import {
  formatInteger,
  formatPercent,
  formatPeriodLong,
} from '../../shared/format'
import { formatRegionalNetwork } from '../../shared/territory'
import './RegionalView.css'

type SeriesState =
  | { kind: 'idle' | 'loading' | 'empty' | 'error' | 'snapshot-missing' }
  | { kind: 'ready'; data: RegionalSeriesResponse }

type RegionalViewProps = {
  onViewHospitals: () => void
}
const SECTION_IDS = ['regional', 'hospital']

export default function RegionalView({ onViewHospitals }: RegionalViewProps) {
  const {
    sourceState,
    regionalLoadState,
    sharedCompetence,
    sharedRegionCode,
    sharedRegionParam,
    sharedMacroregionCode,
    setSharedRegion,
    regionalComparison,
    requestAssistantQuestion,
    selectedHospitalName,
    hospitalSummary,
  } = useSource()
  const location = useLocation()
  const activeSection = useActiveSection(SECTION_IDS, true)
  const [seriesState, setSeriesState] = useState<SeriesState>({ kind: 'idle' })
  const seriesRequest = useRef<AbortController | null>(null)
  const sourceData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data
      : null
  const regionalData =
    sourceData && (regionalLoadState === 'ready' || regionalLoadState === 'empty')
      ? sourceData.regions
      : null
  const selectedMacroregion = sharedMacroregionCode
  const selectedRegionFromUrl = sharedRegionParam
  const selectedCompetence = sharedCompetence

  const visibleItems = useMemo(() => {
    if (!regionalData) return []
    return regionalData.items.filter(
      (item) =>
        !selectedMacroregion || item.macroregion_code === selectedMacroregion,
    )
  }, [regionalData, selectedMacroregion])

  const rankedItems = useMemo(
    () =>
      [...visibleItems].sort(
        (left, right) =>
          right.iph_percent - left.iph_percent ||
          left.region_code.localeCompare(right.region_code),
      ),
    [visibleItems],
  )
  // Sem região no contexto o panorama é o estado: o mapa mostra as 62 lado a
  // lado e ninguém é eleito por padrão. Cair no primeiro item faria a tela
  // abrir filtrada em um território que o usuário não escolheu.
  const selectedItem = sharedRegionCode
    ? rankedItems.find((item) => item.region_code === sharedRegionCode) ?? null
    : null
  const aggregate = useMemo(() => aggregateRegions(visibleItems), [visibleItems])
  const signals = useMemo(
    () => computeSignals(regionalData?.items ?? []),
    [regionalData],
  )
  const variations = useMemo(
    () =>
      new Map(
        visibleItems.map((item) => [
          item.region_code,
          {
            mom: variation(item, regionalComparison.previous),
            yoy: variation(item, regionalComparison.yearAgo),
          },
        ]),
      ),
    [regionalComparison, visibleItems],
  )
  const aggregateMom = aggregateVariation(visibleItems, regionalComparison.previous)
  const aggregateYoy = aggregateVariation(visibleItems, regionalComparison.yearAgo)
  const comparisonPeriods = {
    previous: formatPeriodLong(shiftCompetence(selectedCompetence, -1)),
    yearAgo: formatPeriodLong(shiftCompetence(selectedCompetence, -12)),
  }
  const scopeLabel = selectedMacroregion
    ? formatRegionalNetwork(
        visibleItems[0]?.macroregion_name ?? '',
      )
    : 'São Paulo'

  useEffect(() => {
    seriesRequest.current?.abort()
    if (!selectedItem) {
      setSeriesState({ kind: 'idle' })
      return
    }

    if (sourceState.kind === 'fallback') {
      try {
        const snapshot = getRegiaoSerieSnapshot(selectedItem.region_code)
        setSeriesState(snapshot ? { kind: 'ready', data: snapshot } : { kind: 'snapshot-missing' })
      } catch {
        setSeriesState({ kind: 'error' })
      }
      return
    }

    if (sourceState.kind !== 'live') {
      setSeriesState({ kind: 'idle' })
      return
    }

    const controller = new AbortController()
    seriesRequest.current = controller
    setSeriesState({ kind: 'loading' })
    void fetchRegiaoSerie(selectedItem.region_code, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setSeriesState(data.items.length > 0 ? { kind: 'ready', data } : { kind: 'empty' })
      })
      .catch(() => {
        if (!controller.signal.aborted) setSeriesState({ kind: 'error' })
      })

    return () => controller.abort()
  }, [selectedItem?.region_code, sourceState.kind])

  return (
    <section
      id="regional"
      className="analysis-section regional-page"
      aria-labelledby="regional-title"
    >
      <div className="regional-workspace">
        <header className="regional-topline">
          <div className="regional-title-group">
            <h1 id="regional-title">Pressão sobre leitos (IPH) por região</h1>
            <nav className="regional-levels" aria-label="Etapas da análise">
              <button type="button" onClick={() => setSharedRegion('')} aria-current={!selectedItem ? 'step' : undefined}>São Paulo</button>
              <span aria-hidden="true">›</span>
              <Link to={{ search: location.search, hash: '#regional' }} data-testid="anchor-regional" aria-current={activeSection === 'regional' ? 'true' : undefined} onClick={() => requestAnalysisAnchor('regional')}>
                {selectedItem ? <span data-testid="anchor-context-regional">{selectedItem.region_name}</span> : 'Região'}
              </Link>
              <span aria-hidden="true">›</span>
              <Link to={{ search: location.search, hash: '#hospital' }} data-testid="anchor-hospital" aria-current={activeSection === 'hospital' ? 'true' : undefined} onClick={() => requestAnalysisAnchor('hospital')}>
                {selectedHospitalName ? <span data-testid="anchor-context-hospital">{selectedHospitalName}</span> : 'Hospital'}
              </Link>
              <span aria-hidden="true">›</span>
              <span className={hospitalSummary ? 'level-selected' : 'level-pending'}>{hospitalSummary?.specialtyName ?? 'Especialidade'}</span>
            </nav>
          </div>
          <GlobalContextBar />
        </header>

        {sourceState.kind === 'loading' && (
          <StatePanel kind="loading" title="Carregando visão regional" testId="regional-loading">
            Buscando mapa, denominadores e indicadores agregados.
          </StatePanel>
        )}
        {sourceState.kind !== 'loading' && regionalLoadState === 'loading' && (
          <StatePanel kind="loading" title="Carregando competência" testId="regional-filter-loading">
            A resposta anterior não será reapresentada como se fosse deste período.
          </StatePanel>
        )}
        {regionalLoadState === 'error' && (
          <StatePanel kind="error" title="Competência indisponível" testId="regional-filter-error">
            A resposta não chegou ou não corresponde ao ano e mês solicitados.
          </StatePanel>
        )}
        {sourceState.kind === 'empty' && (
          <StatePanel kind="empty" title="Sem competência publicada" testId="regional-empty">
            A fonte respondeu, mas ainda não há dados para a visão regional.
          </StatePanel>
        )}
        {sourceState.kind === 'error' && (
          <StatePanel kind="error" title="Visão regional indisponível" testId="regional-error">
            Não foi possível carregar esta tela. Tente novamente.
          </StatePanel>
        )}

        {regionalData && (
          <>
            {visibleItems.length === 0 && (
              <StatePanel kind="empty" title="Nenhuma região no recorte" testId="regional-no-items">
                Isso é ausência legítima, não erro da fonte.
              </StatePanel>
            )}

            {visibleItems.length > 0 && (
              <>
                <div className="regional-dashboard">
                  <section className="map-panel overview-map" aria-labelledby="map-title">
                    <h3 id="map-title" className="visually-hidden">IPH estimado por percentis</h3>
                    <div className="overview-map-toolbar">
                      <p>Clique numa região para abrir os detalhes</p>
                    </div>
                    <p className="visually-hidden" data-testid="regional-map-selection">{selectedItem ? `Selecionada: ${selectedItem.region_name}` : 'Nenhuma região selecionada'}</p>
                    <RegionalMap
                      compact
                      items={regionalData.items}
                      selectedRegionCode={selectedItem?.region_code ?? ''}
                      selectedMacroregionCode={selectedMacroregion}
                      onSelect={setSharedRegion}
                      formatInteger={formatInteger}
                      formatPercent={formatPercent}
                      signals={signals}
                      variations={variations}
                      competence={formatPeriodLong(selectedCompetence)}
                      comparisonPeriods={comparisonPeriods}
                      onAskLocal={requestAssistantQuestion}
                      onViewHospitals={onViewHospitals}
                    />
                    <details className="map-reference"><summary>Como ler o mapa</summary>
                      <p data-testid="iph-reference">Referência do IPH: {regionalData.items.length} regiões de São Paulo na competência selecionada. As cores usam percentis do IPH no recorte visível; não indicam ocupação em tempo real.</p>
                    </details>
                  </section>
                  <RegionalOverview
                    items={rankedItems} stateItems={regionalData.items} selected={selectedItem}
                    aggregate={aggregate} competence={selectedCompetence} scopeLabel={scopeLabel}
                    mom={aggregateMom} yoy={aggregateYoy} signals={signals} onViewHospitals={onViewHospitals}
                  />
                </div>
                <MoreRegionalIndicators
                  items={rankedItems} stateItems={regionalData.items} selected={selectedItem}
                  aggregate={aggregate} competence={selectedCompetence} scopeLabel={scopeLabel}
                  mom={selectedItem ? variations.get(selectedItem.region_code)?.mom ?? null : aggregateMom}
                  yoy={selectedItem ? variations.get(selectedItem.region_code)?.yoy ?? null : aggregateYoy}
                  signals={signals} onViewHospitals={onViewHospitals}
                />
                <RegionalLimitNote />

                {selectedRegionFromUrl && selectedItem && selectedRegionFromUrl !== selectedItem.region_code && (
                  <p className="selection-warning" role="status">
                    A região preservada na URL não existe neste recorte; exibindo {selectedItem.region_name} sem apagar o filtro compartilhável.
                  </p>
                )}
              </>
            )}

            {selectedItem && visibleItems.length > 0 && (
              <>
                {seriesState.kind === 'loading' && (
                  <StatePanel kind="loading" title="Carregando série regional" testId="regional-series-loading">
                    Buscando as competências da região selecionada.
                  </StatePanel>
                )}
                {seriesState.kind === 'empty' && (
                  <StatePanel kind="empty" title="Série regional sem competências" testId="regional-series-empty">
                    A fonte respondeu normalmente, mas não há meses publicados para esta região.
                  </StatePanel>
                )}
                {seriesState.kind === 'snapshot-missing' && (
                  <StatePanel kind="empty" title="Série indisponível para esta região" testId="regional-series-snapshot-missing">
                    Não foi possível carregar a série histórica agora. Tente novamente.
                  </StatePanel>
                )}
                {seriesState.kind === 'error' && (
                  <StatePanel kind="error" title="Série regional indisponível" testId="regional-series-error">
                    O resumo continua válido, mas a série não será substituída silenciosamente por outra fonte.
                  </StatePanel>
                )}
                {seriesState.kind === 'ready' && (
                  <RegionalSeries data={seriesState.data} selectedCompetence={selectedCompetence} />
                )}

              </>
            )}
          </>
        )}
      </div>
      <div id="regional-flowia" className="analysis-flowia" />
    </section>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchRegiaoSerie,
  getRegiaoSerieSnapshot,
  type RegionalSeriesResponse,
} from './regioesSerie'
import MetricCard from '../../shared/MetricCard'
import RegionalMap from './RegionalMap'
import RegionalSeries from './RegionalSeries'
import GlobalContextBar from '../../shared/GlobalContextBar'
import SeasonalSignal from './SeasonalSignal'
import StateTotals from './StateTotals'
import { aggregateRegions } from './agregado'
import { aggregateVariation, computeSignals, variation } from './sinais'
import StatePanel from '../../shared/StatePanel'
import { useSource } from '../../shared/SourceContext'
import {
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatPercent,
  formatPeriod,
} from '../../shared/format'
import { formatRegionalNetwork } from '../../shared/territory'
import './RegionalView.css'

type SeriesState =
  | { kind: 'idle' | 'loading' | 'empty' | 'error' | 'snapshot-missing' }
  | { kind: 'ready'; data: RegionalSeriesResponse }

export default function RegionalView() {
  const {
    sourceState,
    regionalLoadState,
    sharedCompetence,
    sharedRegionCode,
    sharedRegionParam,
    sharedMacroregionCode,
    setSharedRegion,
    regionalComparison,
  } = useSource()
  const [seriesState, setSeriesState] = useState<SeriesState>({ kind: 'idle' })
  // O mapa pode colorir por um indicador isolado ou pelo placar que consome os
  // seis. O padrão é o placar: ele é o que responde "onde olhar primeiro".
  const [mapMetric, setMapMetric] = useState<'sinais' | 'iph'>('sinais')
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
  const signals = useMemo(() => computeSignals(visibleItems), [visibleItems])
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
        <div className="view-intro">
          <div>
            <p className="section-kicker">TERRITÓRIO</p>
            <h2 id="regional-title">Sinais regionais</h2>
          </div>
        </div>

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
            <p
              className="regional-context-note"
              data-testid="regional-context-note"
              data-competence={regionalData.data_through}
            >
              {formatPeriod(selectedCompetence)} ·{' '}
              <span data-testid="regional-count">
                {formatInteger(visibleItems.length)} de {formatInteger(regionalData.pagination.count)} regiões
              </span>{' '}
              no território compartilhado.
            </p>

            {visibleItems.length === 0 && (
              <StatePanel kind="empty" title="Nenhuma região no recorte" testId="regional-no-items">
                Isso é ausência legítima, não erro da fonte.
              </StatePanel>
            )}

            {visibleItems.length > 0 && (
              <>
                {/*
                  O mapa vem primeiro e ocupa a largura: é dele que sai a
                  escolha do território. Os controles vêm logo abaixo, para
                  quem prefere escolher pelo nome depois de ver o panorama, e
                  só então os números do recorte.
                */}
                <section className="map-panel wide" aria-labelledby="map-title">
                  <div className="block-heading">
                    <div>
                      <p className="section-kicker">MAPA DE SINAIS</p>
                      <h3 id="map-title">
                        {mapMetric === 'sinais'
                          ? 'Sinais acesos por região'
                          : 'IPH estimado por percentis'}
                      </h3>
                      <div className="map-metric" role="radiogroup" aria-label="O que a cor mostra">
                        {(['sinais', 'iph'] as const).map((candidate) => (
                          <button
                            key={candidate}
                            type="button"
                            role="radio"
                            aria-checked={mapMetric === candidate}
                            onClick={() => setMapMetric(candidate)}
                            data-testid={`map-metric-${candidate}`}
                          >
                            {candidate === 'sinais' ? 'Placar de sinais' : 'IPH estimado'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <strong data-testid="regional-map-selection">
                      {selectedItem
                        ? `Selecionada: ${selectedItem.region_name}`
                        : 'Nenhuma região selecionada'}
                    </strong>
                  </div>
                  <RegionalMap
                    items={regionalData.items}
                    selectedRegionCode={selectedItem?.region_code ?? ''}
                    selectedMacroregionCode={selectedMacroregion}
                    onSelect={setSharedRegion}
                    formatInteger={formatInteger}
                    formatPercent={formatPercent}
                    signals={signals}
                    variations={variations}
                    colorBy={mapMetric}
                  />
                </section>

                <GlobalContextBar />

                {!selectedItem && (
                  <StateTotals
                    aggregate={aggregate}
                    competence={selectedCompetence}
                    scopeLabel={scopeLabel}
                    mom={aggregateMom}
                    yoy={aggregateYoy}
                    signals={signals}
                  />
                )}

                {selectedRegionFromUrl && selectedItem && selectedRegionFromUrl !== selectedItem.region_code && (
                  <p className="selection-warning" role="status">
                    A região preservada na URL não existe neste recorte; exibindo {selectedItem.region_name} sem apagar o filtro compartilhável.
                  </p>
                )}
              </>
            )}

            {selectedItem && visibleItems.length > 0 && (
              <>
                <SeasonalSignal
                  items={visibleItems}
                  selected={selectedItem}
                  competence={selectedCompetence}
                  locked={sourceState.kind === 'fallback'}
                  onSelect={setSharedRegion}
                />

                <div className="regional-layout focused">
                  <section className="selected-region" aria-labelledby="selected-region-title">
                    <p className="section-kicker">REGIÃO SELECIONADA</p>
                    <h3 id="selected-region-title" data-testid="regional-selected-name">
                      {selectedItem.region_name}
                    </h3>
                    <p>
                      {formatRegionalNetwork(selectedItem.macroregion_name)} · {formatInteger(selectedItem.municipality_count)} municípios
                    </p>
                    <div className="selected-metrics">
                      <MetricCard
                        label="Internações novas"
                        value={formatInteger(selectedItem.new_admissions)}
                        detail={`${formatInteger(selectedItem.hospitals_with_admissions)} hospitais com produção`}
                        testId="regional-admissions"
                      />
                      <MetricCard
                        label="IPH estimado"
                        value={formatPercent(selectedItem.iph_percent)}
                        detail={`${formatInteger(selectedItem.estimated_patient_days)} pacientes-dia / ${formatInteger(selectedItem.declared_capacity_bed_days)} leitos-dia declarados`}
                        testId="regional-iph"
                      />
                      <MetricCard
                        label="TMH observado"
                        value={formatPercent(selectedItem.tmh_percent)}
                        detail={`${formatInteger(selectedItem.deaths)} óbitos · ${formatInteger(selectedItem.new_admissions)} internações`}
                        testId="regional-tmh"
                      />
                      <MetricCard
                        label="CMI nominal"
                        value={formatCurrency(selectedItem.cmi_nominal)}
                        detail={`${formatInteger(selectedItem.new_admissions)} internações novas`}
                        testId="regional-cmi"
                      />
                      <MetricCard
                        label="Permanência média"
                        value={`${formatDecimal(selectedItem.average_stay_days)} dias`}
                        detail={`${formatInteger(selectedItem.stay_days)} dias na amostra`}
                      />
                      <MetricCard
                        label="Índice sazonal"
                        value={
                          selectedItem.seasonality_status !== 'calculado' ||
                          selectedItem.seasonality_index === null
                            ? 'não calculado'
                            : formatDecimal(selectedItem.seasonality_index)
                        }
                        detail={
                          selectedItem.seasonality_status === 'fora_periodo_alvo'
                            ? 'Competência fora do período-alvo definido para sazonalidade'
                            : selectedItem.seasonality_status === 'historico_insuficiente'
                              ? `Histórico insuficiente: ${formatInteger(selectedItem.historical_years)} ${selectedItem.historical_years === 1 ? 'ano comparável' : 'anos comparáveis'}`
                              : `${formatInteger(selectedItem.historical_years)} ${selectedItem.historical_years === 1 ? 'ano comparável' : 'anos comparáveis'}`
                        }
                        testId="regional-seasonality"
                      />
                    </div>
                  </section>
                </div>

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
    </section>
  )
}

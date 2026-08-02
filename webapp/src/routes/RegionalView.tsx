import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MethodNote from '../components/MethodNote'
import MetricCard from '../components/MetricCard'
import RegionalMap from '../components/RegionalMap'
import SourcePanel from '../components/SourcePanel'
import StatePanel from '../components/StatePanel'
import { useSource } from '../source/SourceContext'
import {
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatPercent,
  formatPeriod,
} from '../utils/format'
import './RegionalView.css'

const RANKING_PREVIEW_SIZE = 8

export default function RegionalView() {
  const { sourceState, regionalLoadState, loadRegionalCompetence } = useSource()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showAllRanking, setShowAllRanking] = useState(false)
  const sourceData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data
      : null
  const regionalData =
    sourceData && (regionalLoadState === 'ready' || regionalLoadState === 'empty')
      ? sourceData.regions
      : null
  const isFallback = sourceState.kind === 'fallback'
  const selectedMacroregion = searchParams.get('macrorregiao') ?? ''
  const selectedRegionFromUrl = searchParams.get('regiao') ?? ''
  const selectedCompetence = isFallback
    ? regionalData?.data_through ?? ''
    : searchParams.get('competencia') ?? regionalData?.data_through ?? ''

  const macroregions = useMemo(() => {
    if (!regionalData) return []
    return regionalData.items
      .filter(
        (item, index, items) =>
          items.findIndex(
            (candidate) => candidate.macroregion_code === item.macroregion_code,
          ) === index,
      )
      .sort((a, b) => a.macroregion_name.localeCompare(b.macroregion_name, 'pt-BR'))
  }, [regionalData])

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
  const selectedItem =
    rankedItems.find((item) => item.region_code === selectedRegionFromUrl) ??
    rankedItems[0] ??
    null
  const rankingItems = showAllRanking
    ? rankedItems
    : rankedItems.slice(0, RANKING_PREVIEW_SIZE)

  function updateParam(name: string, value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(name, value)
      else next.delete(name)
      return next
    })
  }

  function selectCompetence(competence: string) {
    if (!competence || isFallback) return
    updateParam('competencia', competence)
    void loadRegionalCompetence(competence)
  }

  return (
    <main className="page-main regional-page">
      <header className="view-header">
        <p className="section-kicker">VISÃO EXECUTIVA REGIONAL</p>
        <h1>Onde devo investigar primeiro?</h1>
        <p>
          Compare sinais agregados, veja a amostra e aprofunde uma região sem perder o
          contexto temporal da URL.
        </p>
      </header>

      <SourcePanel />

      <div className="regional-workspace">
        <div className="view-intro">
          <div>
            <p className="section-kicker">MAPA E RESUMO</p>
            <h2 id="regional-title">Sinais regionais persistidos na Gold</h2>
            {regionalData && (
              <p data-testid="regional-data-through">
                Competência {formatPeriod(regionalData.data_through)} · sem recálculo no cliente
              </p>
            )}
          </div>
          <strong className="regional-source" data-testid="regional-source">
            {regionalData?.source === 'oracle-live'
              ? 'Oracle ao vivo'
              : regionalData?.source === 'snapshot'
                ? 'Snapshot de contingência'
                : 'Aguardando fonte'}
          </strong>
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
            Nem a API nem o snapshot local puderam sustentar esta tela.
          </StatePanel>
        )}

        {regionalData && (
          <>
            <div className="regional-toolbar">
              <label>
                Competência
                <input
                  type="month"
                  data-testid="regional-competence"
                  value={selectedCompetence}
                  max={sourceData?.status.data_through}
                  disabled={isFallback}
                  onChange={(event) => selectCompetence(event.target.value)}
                  aria-describedby="regional-competence-help"
                />
              </label>
              <label>
                Macrorregião
                <select
                  value={selectedMacroregion}
                  onChange={(event) => updateParam('macrorregiao', event.target.value)}
                >
                  <option value="">Todas as macrorregiões</option>
                  {macroregions.map((item) => (
                    <option key={item.macroregion_code} value={item.macroregion_code}>
                      {item.macroregion_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Região de saúde
                <select
                  value={selectedItem?.region_code ?? ''}
                  onChange={(event) => updateParam('regiao', event.target.value)}
                >
                  {rankedItems.map((item) => (
                    <option key={item.region_code} value={item.region_code}>
                      {item.region_name}
                    </option>
                  ))}
                </select>
              </label>
              <strong className="regional-count" data-testid="regional-count">
                {formatInteger(visibleItems.length)} de {formatInteger(regionalData.pagination.count)} regiões
              </strong>
              <small id="regional-competence-help">
                {isFallback
                  ? 'O snapshot é uma fotografia única; tente novamente para consultar outra competência sem misturar fontes.'
                  : `Máximo publicado: ${formatPeriod(sourceData?.status.data_through ?? regionalData.data_through)}. Trocar o período preserva macrorregião e região na URL.`}
              </small>
            </div>

            {visibleItems.length === 0 && (
              <StatePanel kind="empty" title="Nenhuma região no recorte" testId="regional-no-items">
                Isso é ausência legítima, não erro da fonte.
              </StatePanel>
            )}

            {selectedItem && visibleItems.length > 0 && (
              <>
                {selectedRegionFromUrl && selectedRegionFromUrl !== selectedItem.region_code && (
                  <p className="selection-warning" role="status">
                    A região preservada na URL não existe neste recorte; exibindo {selectedItem.region_name} sem apagar o filtro compartilhável.
                  </p>
                )}
                <div className="regional-layout">
                  <section className="map-panel" aria-labelledby="map-title">
                    <div className="block-heading">
                      <div>
                        <p className="section-kicker">MAPA DE SINAIS</p>
                        <h3 id="map-title">IPH estimado por percentis</h3>
                      </div>
                      <strong data-testid="regional-map-selection">
                        Selecionada: {selectedItem.region_name}
                      </strong>
                    </div>
                    <RegionalMap
                      items={regionalData.items}
                      selectedRegionCode={selectedItem.region_code}
                      selectedMacroregionCode={selectedMacroregion}
                      onSelect={(code) => updateParam('regiao', code)}
                      formatInteger={formatInteger}
                      formatPercent={formatPercent}
                    />
                  </section>

                  <section className="selected-region" aria-labelledby="selected-region-title">
                    <p className="section-kicker">REGIÃO SELECIONADA</p>
                    <h3 id="selected-region-title" data-testid="regional-selected-name">
                      {selectedItem.region_name}
                    </h3>
                    <p>
                      {selectedItem.macroregion_name} · {formatInteger(selectedItem.municipality_count)} municípios
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

                <MethodNote>
                  IPH é pressão estimada sobre capacidade SUS declarada, não ocupação física real.
                  O numerador e o denominador exibidos foram lidos da Gold; nenhum indicador é
                  recalculado no navegador.
                </MethodNote>

                <section className="ranking-panel" aria-labelledby="ranking-title">
                  <div className="block-heading">
                    <div>
                      <p className="section-kicker">PRIORIZAR INVESTIGAÇÃO</p>
                      <h3 id="ranking-title">Maiores valores observados de IPH estimado</h3>
                    </div>
                    <strong data-testid="regional-ranking-count">
                      {formatInteger(rankingItems.length)} de {formatInteger(rankedItems.length)}
                    </strong>
                  </div>
                  <ol className={showAllRanking ? 'ranking-list expanded' : 'ranking-list'}>
                    {rankingItems.map((item) => (
                      <li key={item.region_code}>
                        <button type="button" onClick={() => updateParam('regiao', item.region_code)}>
                          <span>{item.region_name}</span>
                          <strong>{formatPercent(item.iph_percent)}</strong>
                          <small data-testid={`regional-ranking-sample-${item.region_code}`}>
                            amostra: {formatInteger(item.new_admissions)} internações novas
                          </small>
                        </button>
                      </li>
                    ))}
                  </ol>
                  {rankedItems.length > RANKING_PREVIEW_SIZE && (
                    <button
                      className="ranking-toggle"
                      type="button"
                      aria-expanded={showAllRanking}
                      onClick={() => setShowAllRanking((current) => !current)}
                    >
                      {showAllRanking ? 'Mostrar somente o resumo' : `Ver todas as ${rankedItems.length} regiões`}
                    </button>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}

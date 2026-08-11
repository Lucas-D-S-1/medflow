import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  fetchFlows,
  FlowAbsentCompetenceError,
  getFlowSnapshot,
  type FlowResponse,
} from './fluxos'
import {
  fetchIcsap,
  getIcsapSnapshot,
  IcsapAbsentCompetenceError,
  type IcsapResponse,
} from './icsap'
import FlowMatrix from './FlowMatrix'
import IcsapPanel from './IcsapPanel'
import MethodNote from '../../shared/MethodNote'
import MetricCard from '../../shared/MetricCard'
import SourcePanel from '../../shared/SourcePanel'
import StatePanel from '../../shared/StatePanel'
import { useSource } from '../../shared/SourceContext'
import {
  formatDecimal,
  formatInteger,
  formatPercent,
  formatPeriod,
} from '../../shared/format'
import './FluxosView.css'

type FlowState =
  | { kind: 'idle' | 'loading' | 'error' | 'absent' }
  | { kind: 'ready'; data: FlowResponse }

type IcsapState =
  | { kind: 'idle' | 'loading' | 'error' | 'absent' }
  | { kind: 'ready'; data: IcsapResponse }

const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const REGION_CODE_PATTERN = /^\d{5}$/

export default function FluxosView() {
  const { sourceState } = useSource()
  const [searchParams, setSearchParams] = useSearchParams()
  const [flowState, setFlowState] = useState<FlowState>({ kind: 'idle' })
  const [icsapState, setIcsapState] = useState<IcsapState>({ kind: 'idle' })
  const flowRequest = useRef<AbortController | null>(null)
  const icsapRequest = useRef<AbortController | null>(null)
  const sourceData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data
      : null
  const isFallback = sourceState.kind === 'fallback'
  const regions = useMemo(
    () =>
      sourceData
        ? [...sourceData.regions.items].sort((left, right) =>
            left.region_name.localeCompare(right.region_name, 'pt-BR'),
          )
        : [],
    [sourceData],
  )

  const urlCompetence = searchParams.get('competencia') ?? ''
  const urlOrigin = searchParams.get('regiao') ?? ''
  const urlDestination = searchParams.get('destino') ?? ''
  const defaultOrigin =
    regions.find((region) => region.region_code === '35073')?.region_code ??
    regions[0]?.region_code ??
    ''
  const selectedCompetence = isFallback
    ? flowState.kind === 'ready'
      ? flowState.data.data_through
      : sourceData?.status.data_through ?? ''
    : COMPETENCE_PATTERN.test(urlCompetence)
      ? urlCompetence
      : sourceData?.status.data_through ?? ''
  const selectedOrigin = isFallback
    ? flowState.kind === 'ready'
      ? flowState.data.territory.region_code
      : defaultOrigin
    : REGION_CODE_PATTERN.test(urlOrigin) &&
        regions.some((region) => region.region_code === urlOrigin)
      ? urlOrigin
      : defaultOrigin
  const selectedDestination =
    !isFallback &&
    REGION_CODE_PATTERN.test(urlDestination) &&
    regions.some((region) => region.region_code === urlDestination)
      ? urlDestination
      : ''

  useEffect(() => {
    flowRequest.current?.abort()

    if (sourceState.kind === 'fallback') {
      try {
        setFlowState({ kind: 'ready', data: getFlowSnapshot() })
      } catch {
        setFlowState({ kind: 'error' })
      }
      return
    }
    if (
      sourceState.kind !== 'live' ||
      !selectedOrigin ||
      !COMPETENCE_PATTERN.test(selectedCompetence)
    ) {
      setFlowState({ kind: 'idle' })
      return
    }

    const match = COMPETENCE_PATTERN.exec(selectedCompetence)!
    const controller = new AbortController()
    flowRequest.current = controller
    setFlowState({ kind: 'loading' })
    void fetchFlows(
      {
        year: Number(match[1]),
        month: Number(match[2]),
        originRegionCode: selectedOrigin,
        destinationRegionCode: selectedDestination || undefined,
      },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setFlowState({ kind: 'ready', data })
      })
      .catch((erro: unknown) => {
        if (controller.signal.aborted) return
        setFlowState({
          kind: erro instanceof FlowAbsentCompetenceError ? 'absent' : 'error',
        })
      })

    return () => controller.abort()
  }, [
    selectedCompetence,
    selectedDestination,
    selectedOrigin,
    sourceState.kind,
  ])

  // A composição das ICSAP não depende do destino: ela é da região de
  // residência na competência. Pedir de novo ao trocar o destino mostraria o
  // mesmo número com outra requisição.
  useEffect(() => {
    icsapRequest.current?.abort()

    if (sourceState.kind === 'fallback') {
      try {
        setIcsapState({ kind: 'ready', data: getIcsapSnapshot() })
      } catch {
        setIcsapState({ kind: 'error' })
      }
      return
    }
    if (
      sourceState.kind !== 'live' ||
      !selectedOrigin ||
      !COMPETENCE_PATTERN.test(selectedCompetence)
    ) {
      setIcsapState({ kind: 'idle' })
      return
    }

    const match = COMPETENCE_PATTERN.exec(selectedCompetence)!
    const controller = new AbortController()
    icsapRequest.current = controller
    setIcsapState({ kind: 'loading' })
    void fetchIcsap(
      {
        year: Number(match[1]),
        month: Number(match[2]),
        regionCode: selectedOrigin,
      },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setIcsapState({ kind: 'ready', data })
      })
      .catch((erro: unknown) => {
        if (controller.signal.aborted) return
        setIcsapState({
          kind: erro instanceof IcsapAbsentCompetenceError ? 'absent' : 'error',
        })
      })

    return () => controller.abort()
  }, [selectedCompetence, selectedOrigin, sourceState.kind])

  function updateParam(name: string, value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(name, value)
      else next.delete(name)
      return next
    })
  }

  function selectOrigin(value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('regiao', value)
      next.delete('destino')
      return next
    })
  }

  const data = flowState.kind === 'ready' ? flowState.data : null
  const icsap = icsapState.kind === 'ready' ? icsapState.data : null

  return (
    <main className="page-main flows-page">
      <header className="view-header">
        <p className="section-kicker">VISÃO FLUXOS E ATENÇÃO PRIMÁRIA</p>
        <h1>A população é atendida no próprio território?</h1>
        <p>
          Acompanhe o deslocamento entre regiões de residência e atendimento sem
          confundir fluxo observado com acesso fora do estado.
        </p>
      </header>

      <SourcePanel />

      {sourceState.kind === 'loading' && (
        <StatePanel kind="loading" title="Carregando fluxos" testId="flows-loading">
          Buscando competência, regiões e pares origem–destino agregados.
        </StatePanel>
      )}
      {sourceState.kind === 'empty' && (
        <StatePanel kind="empty" title="Sem competência publicada" testId="flows-source-empty">
          A fonte respondeu normalmente, mas ainda não há período para consultar.
        </StatePanel>
      )}
      {sourceState.kind === 'error' && (
        <StatePanel kind="error" title="Visão de fluxos indisponível" testId="flows-source-error">
          Nem a API nem o snapshot local puderam sustentar esta tela.
        </StatePanel>
      )}

      {sourceData && (
        <>
          <section className="flow-controls" aria-labelledby="flow-controls-title">
            <div>
              <p className="section-kicker">RECORTE TERRITORIAL</p>
              <h2 id="flow-controls-title">Residência e destino do atendimento</h2>
            </div>
            <div className="flow-toolbar">
              <label>
                Competência
                <input
                  type="month"
                  value={selectedCompetence}
                  max={sourceData.status.data_through}
                  disabled={isFallback}
                  data-testid="flow-competence"
                  onChange={(event) => updateParam('competencia', event.target.value)}
                />
              </label>
              <label>
                Região de residência
                <select
                  value={selectedOrigin}
                  disabled={isFallback}
                  data-testid="flow-origin"
                  onChange={(event) => selectOrigin(event.target.value)}
                >
                  {regions.map((region) => (
                    <option key={region.region_code} value={region.region_code}>
                      {region.region_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Destino
                <select
                  value={selectedDestination}
                  disabled={isFallback}
                  data-testid="flow-destination"
                  onChange={(event) => updateParam('destino', event.target.value)}
                >
                  <option value="">Todos os destinos observados</option>
                  {regions.map((region) => (
                    <option key={region.region_code} value={region.region_code}>
                      {region.region_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <small>
              {isFallback
                ? // Região e competência saem do próprio snapshot. Cravá-las
                  // aqui fazia a tela anunciar um recorte que o snapshot já
                  // não continha: o texto dizia 05/2026 enquanto os números
                  // eram de 06/2026.
                  `O snapshot preserva ${data?.territory.region_name ?? 'a região'} em ` +
                  `${formatPeriod(selectedCompetence)}; tente novamente para consultar ` +
                  'outro recorte sem misturar fontes.'
                : 'Competência e região permanecem na URL; trocar o período não apaga macrorregião, região ou hospital.'}
            </small>
          </section>

          {flowState.kind === 'loading' && (
            <StatePanel kind="loading" title="Carregando matriz" testId="flow-filter-loading">
              A resposta anterior não será exibida como se fosse deste recorte.
            </StatePanel>
          )}
          {flowState.kind === 'absent' && (
            <StatePanel
              kind="empty"
              title="Competência sem fluxos publicados"
              testId="flow-absent-competence"
            >
              A fonte respondeu normalmente, mas não há fluxo publicado para{' '}
              {formatPeriod(selectedCompetence)}. O período disponível vai até{' '}
              {formatPeriod(sourceData.status.data_through)}.
            </StatePanel>
          )}
          {flowState.kind === 'error' && (
            <StatePanel kind="error" title="Fluxos indisponíveis" testId="flow-error">
              O endpoint não respondeu ou devolveu conteúdo fora do contrato. A fonte
              regional continua identificada acima.
            </StatePanel>
          )}

          {data && (
            <>
              <div className="flow-heading">
                <div>
                  <p className="section-kicker">TERRITÓRIO SELECIONADO</p>
                  <h2 data-testid="flow-region-name">{data.territory.region_name}</h2>
                  <p>
                    {data.territory.macroregion_name} · competência{' '}
                    {formatPeriod(data.data_through)}
                  </p>
                </div>
                <strong className="regional-source" data-testid="flow-source">
                  {data.source === 'oracle-live'
                    ? 'Oracle ao vivo'
                    : 'Snapshot de contingência'}
                </strong>
              </div>

              <section className="flow-metrics" aria-label="Indicadores territoriais de fluxo">
                <MetricCard
                  label="Atendimento no próprio território"
                  value={formatPercent(data.territory.own_care_percent)}
                  detail={`${formatInteger(data.territory.resident_admissions_in_own_region)} de ${formatInteger(data.territory.resident_admissions_observed)} internações residentes observadas`}
                  testId="flow-own-care"
                />
                <MetricCard
                  label="Evasão intrastadual observada"
                  value={formatPercent(data.territory.observed_evasion_percent)}
                  detail={`${formatInteger(data.territory.observed_intrastate_evasion_admissions)} residentes atendidos em outra região paulista`}
                  testId="flow-evasion"
                />
                <MetricCard
                  label="Atração assistencial"
                  value={formatPercent(data.territory.attraction_percent)}
                  detail={`${formatInteger(data.territory.admissions_received_from_other_sp_regions)} de outra região de SP + ${formatInteger(data.territory.admissions_received_from_other_states)} de outra UF; ${formatInteger(data.territory.production_admissions)} internações produzidas`}
                  testId="flow-attraction"
                />
                <MetricCard
                  label="Taxa de internação residente"
                  value={formatDecimal(data.territory.resident_admission_rate_per_100k)}
                  detail={`por 100 mil habitantes · população ${formatInteger(data.territory.population)}`}
                  testId="flow-resident-rate"
                />
              </section>

              <MethodNote>
                Saídas de residentes de São Paulo para hospitais de outras UFs não são
                observadas no RD-SP. A evasão exibida é apenas intrastadual; atração não
                prova insuficiência nem qualidade da rede.
              </MethodNote>

              {data.items.length === 0 ? (
                <StatePanel kind="empty" title="Nenhum par no recorte" testId="flow-empty">
                  A fonte respondeu normalmente, mas não observou internações para essa
                  combinação de origem, destino e competência.
                </StatePanel>
              ) : (
                <FlowMatrix data={data} />
              )}
            </>
          )}

          {icsapState.kind === 'loading' && (
            <StatePanel kind="loading" title="Carregando ICSAP" testId="icsap-loading">
              Buscando a composição dos 19 grupos de condições sensíveis.
            </StatePanel>
          )}
          {icsapState.kind === 'absent' && (
            <StatePanel
              kind="empty"
              title="Competência sem ICSAP publicada"
              testId="icsap-absent-competence"
            >
              A fonte respondeu normalmente, mas não há ICSAP publicada para{' '}
              {formatPeriod(selectedCompetence)}. O período disponível vai até{' '}
              {formatPeriod(sourceData.status.data_through)}.
            </StatePanel>
          )}
          {icsapState.kind === 'error' && (
            <StatePanel kind="error" title="ICSAP indisponível" testId="icsap-error">
              O endpoint de condições sensíveis não respondeu ou devolveu conteúdo
              fora do contrato. A matriz de fluxos acima não foi afetada.
            </StatePanel>
          )}

          {icsap && (
            <>
              <section
                className="icsap-metrics"
                aria-label="Indicadores de condições sensíveis à atenção primária"
              >
                <MetricCard
                  label="Taxa ICSAP por 10 mil habitantes"
                  value={formatDecimal(icsap.region.icsap_rate_per_10k)}
                  detail={`${formatInteger(icsap.region.icsap_admissions)} internações ICSAP · população ${formatInteger(icsap.region.population)}`}
                  testId="icsap-rate"
                />
                <MetricCard
                  label="ICSAP no total de internações residentes"
                  value={formatPercent(icsap.region.icsap_share_of_resident_percent)}
                  detail={`${formatInteger(icsap.region.icsap_admissions)} de ${formatInteger(icsap.region.resident_admissions_observed)} internações residentes observadas`}
                  testId="icsap-share"
                />
                <MetricCard
                  label="Grupos oficiais observados"
                  value={formatInteger(icsap.pagination.count)}
                  detail="grupos da Portaria 221/2008 com linha publicada na competência"
                  testId="icsap-groups"
                />
              </section>

              <MethodNote>
                ICSAP é medida populacional por região de residência: indica pressão
                sobre a atenção primária, não prova que a internação era evitável nem
                mede qualidade do hospital que atendeu. A proporção oficial da
                Portaria 221/2008 usa outro denominador.
              </MethodNote>

              {icsap.items.length === 0 ? (
                <StatePanel kind="empty" title="Nenhum grupo no recorte" testId="icsap-empty">
                  A fonte respondeu normalmente, mas não observou internações por
                  condições sensíveis nessa região e competência.
                </StatePanel>
              ) : (
                <IcsapPanel data={icsap} />
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  fetchAllHospitals,
  getHospitalListSnapshot,
  HospitalAbsentCompetenceError,
  type HospitalListResponse,
} from './hospitais'
import {
  fetchHospitalSeries,
  getHospitalSeriesSnapshot,
  HospitalSeriesAbsentError,
  type HospitalSeriesResponse,
} from './hospitalSerie'
import {
  fetchSpecialties,
  getSpecialtySnapshot,
  SpecialtyAbsentError,
  type SpecialtyResponse,
} from './hospitalEspecialidades'
import {
  CidAbsentError,
  fetchHospitalCids,
  getHospitalCidsSnapshot,
  type CidResponse,
} from './hospitalCids'
import CidTable from './CidTable'
import HospitalPeers from './HospitalPeers'
import { fetchStatewideHospitals, type PeerHospital } from './pares'
import HospitalSeries from './HospitalSeries'
import HospitalTable from './HospitalTable'
import SpecialtyTable from './SpecialtyTable'
import StatePanel from '../../shared/StatePanel'
import { COMPETENCE_PATTERN, useSource } from '../../shared/SourceContext'
import { requestAnalysisAnchor } from '../../shared/analysisNavigation'
import { formatInteger, formatPeriod } from '../../shared/format'
import './HospitalView.css'

type ListState =
  | { kind: 'idle' | 'loading' | 'error' | 'absent' }
  | { kind: 'ready'; data: HospitalListResponse }

type SeriesState =
  | { kind: 'idle' | 'loading' | 'error' | 'absent' }
  | { kind: 'ready'; data: HospitalSeriesResponse }

type SpecialtyState =
  | { kind: 'idle' | 'loading' | 'error' | 'absent' }
  | { kind: 'ready'; data: SpecialtyResponse }

type CidState =
  | { kind: 'idle' | 'loading' | 'error' | 'absent' }
  | { kind: 'ready'; data: CidResponse }

const CNES_PATTERN = /^\d{7}$/

export default function HospitalView() {
  const { sourceState, sharedCompetence, sharedRegionCode, reportHospitalName } = useSource()
  const [searchParams, setSearchParams] = useSearchParams()
  const [listState, setListState] = useState<ListState>({ kind: 'idle' })
  const [statewide, setStatewide] = useState<PeerHospital[] | null>(null)
  const [statewideFailed, setStatewideFailed] = useState(false)
  const statewideRequest = useRef<AbortController | null>(null)
  const [seriesState, setSeriesState] = useState<SeriesState>({ kind: 'idle' })
  const [specialtyState, setSpecialtyState] = useState<SpecialtyState>({ kind: 'idle' })
  const [cidState, setCidState] = useState<CidState>({ kind: 'idle' })
  const [historyOpen, setHistoryOpen] = useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const listRequest = useRef<AbortController | null>(null)
  const seriesRequest = useRef<AbortController | null>(null)
  const specialtyRequest = useRef<AbortController | null>(null)
  const cidRequest = useRef<AbortController | null>(null)

  const sourceData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data
      : null
  const urlHospital = searchParams.get('hospital') ?? ''
  const urlSearch = searchParams.get('busca') ?? ''
  // O recorte de elegíveis vive na URL como os demais filtros, e vem ligado por
  // padrão: sem ele a lista abre em diagnósticos que não têm IPR calculável.
  // O recorte de elegíveis continua na URL para links já compartilhados, mas
  // perdeu o controle próprio: a tabela já marca quem não tem IPR calculável,
  // e o botão pedia que o usuário soubesse o que "elegível" significa antes de
  // ver a lista.
  const eligibleOnly = (searchParams.get('elegiveis') ?? '1') !== '0'
  const selectedCompetence = sharedCompetence
  const selectedRegion = sharedRegionCode

  const list = listState.kind === 'ready' ? listState.data : null
  const listMatchesSelection =
    list !== null &&
    list.data_through === selectedCompetence &&
    list.filters.region_code === selectedRegion
  // Um CNES só vale como selecionado se estiver na lista carregada. Assim a URL
  // nunca faz a tela abrir o detalhe de um hospital que não é deste recorte.
  const selectedCnes =
    listMatchesSelection &&
    CNES_PATTERN.test(urlHospital) &&
    list?.items.some((item) => item.cnes === urlHospital)
      ? urlHospital
      : ''
  const selectedHospital = list?.items.find((item) => item.cnes === selectedCnes) ?? null
  const specialtyData =
    specialtyState.kind === 'ready' &&
    specialtyState.data.filters.cnes === selectedCnes &&
    specialtyState.data.data_through === selectedCompetence
      ? specialtyState.data
      : null
  const hospitalAnchorReady =
    sourceState.kind === 'empty' ||
    sourceState.kind === 'error' ||
    (sourceData !== null && (!selectedRegion || listMatchesSelection))

  // Trocar hospital fecha o histórico. Recarregar o mesmo CNES por mudança de
  // competência desmonta o detalhe por instantes, mas preserva a escolha.
  useEffect(() => {
    setHistoryOpen(false)
    setDiagnosticsOpen(false)
  }, [urlHospital])

  // A lista estadual só é buscada quando há um hospital aberto: ela existe
  // para montar o grupo de pares por tipo e porte, e ninguém paga por ela
  // enquanto está apenas olhando a região.
  useEffect(() => {
    statewideRequest.current?.abort()
    if (!selectedCnes || sourceState.kind !== 'live' || !COMPETENCE_PATTERN.test(selectedCompetence)) {
      return
    }

    const controller = new AbortController()
    statewideRequest.current = controller
    setStatewideFailed(false)
    const [year, month] = selectedCompetence.split('-')
    void fetchStatewideHospitals(Number(year), Number(month), { signal: controller.signal })
      .then((items) => {
        if (!controller.signal.aborted) setStatewide(items)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatewide(null)
          setStatewideFailed(true)
        }
      })

    return () => controller.abort()
  }, [selectedCnes, selectedCompetence, sourceState.kind])

  // O direcionador precisa saber qual estabelecimento está aberto, e só esta
  // view resolve o nome a partir da lista carregada.
  useEffect(() => {
    reportHospitalName(
      list?.items.find((item) => item.cnes === selectedCnes)?.hospital_name ?? null,
    )
  }, [list, reportHospitalName, selectedCnes])

  useEffect(() => {
    listRequest.current?.abort()

    if (sourceState.kind === 'fallback') {
      try {
        setListState({ kind: 'ready', data: getHospitalListSnapshot() })
      } catch {
        setListState({ kind: 'error' })
      }
      return
    }
    if (
      sourceState.kind !== 'live' ||
      !selectedRegion ||
      !COMPETENCE_PATTERN.test(selectedCompetence)
    ) {
      setListState({ kind: 'idle' })
      return
    }

    const match = COMPETENCE_PATTERN.exec(selectedCompetence)!
    const controller = new AbortController()
    listRequest.current = controller
    setListState({ kind: 'loading' })
    void fetchAllHospitals(
      {
        year: Number(match[1]),
        month: Number(match[2]),
        regionCode: selectedRegion,
      },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setListState({ kind: 'ready', data })
      })
      .catch((erro: unknown) => {
        if (controller.signal.aborted) return
        setListState({
          kind: erro instanceof HospitalAbsentCompetenceError ? 'absent' : 'error',
        })
      })

    return () => controller.abort()
  }, [selectedCompetence, selectedRegion, sourceState.kind])

  // A série é do hospital inteiro, não da competência: trocar o mês não a
  // refaz. Ela só depende do CNES selecionado.
  useEffect(() => {
    seriesRequest.current?.abort()

    if (!selectedCnes) {
      setSeriesState({ kind: 'idle' })
      return
    }
    if (sourceState.kind === 'fallback') {
      try {
        const snapshot = getHospitalSeriesSnapshot()
        setSeriesState(
          snapshot.hospital.cnes === selectedCnes
            ? { kind: 'ready', data: snapshot }
            : { kind: 'absent' },
        )
      } catch {
        setSeriesState({ kind: 'error' })
      }
      return
    }

    const controller = new AbortController()
    seriesRequest.current = controller
    setSeriesState({ kind: 'loading' })
    void fetchHospitalSeries(selectedCnes, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setSeriesState({ kind: 'ready', data })
      })
      .catch((erro: unknown) => {
        if (controller.signal.aborted) return
        setSeriesState({
          kind: erro instanceof HospitalSeriesAbsentError ? 'absent' : 'error',
        })
      })

    return () => controller.abort()
  }, [selectedCnes, sourceState.kind])

  // O perfil por especialidade é do hospital NA competência: depende dos dois.
  useEffect(() => {
    specialtyRequest.current?.abort()

    if (!selectedCnes || !COMPETENCE_PATTERN.test(selectedCompetence)) {
      setSpecialtyState({ kind: 'idle' })
      return
    }
    if (sourceState.kind === 'fallback') {
      try {
        const snapshot = getSpecialtySnapshot()
        setSpecialtyState(
          snapshot.hospital.cnes === selectedCnes &&
            snapshot.data_through === selectedCompetence
            ? { kind: 'ready', data: snapshot }
            : { kind: 'absent' },
        )
      } catch {
        setSpecialtyState({ kind: 'error' })
      }
      return
    }

    const match = COMPETENCE_PATTERN.exec(selectedCompetence)!
    const controller = new AbortController()
    specialtyRequest.current = controller
    setSpecialtyState({ kind: 'loading' })
    void fetchSpecialties(
      { cnes: selectedCnes, year: Number(match[1]), month: Number(match[2]) },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setSpecialtyState({ kind: 'ready', data })
      })
      .catch((erro: unknown) => {
        if (controller.signal.aborted) return
        setSpecialtyState({
          kind: erro instanceof SpecialtyAbsentError ? 'absent' : 'error',
        })
      })

    return () => controller.abort()
  }, [selectedCnes, selectedCompetence, sourceState.kind])

  // Os diagnósticos são do período agregado inteiro, não de uma competência:
  // trocar o mês não muda o IPR. Dependem do CNES e do recorte de elegíveis.
  useEffect(() => {
    cidRequest.current?.abort()

    if (!selectedCnes) {
      setCidState({ kind: 'idle' })
      return
    }
    if (sourceState.kind === 'fallback') {
      try {
        const snapshot = getHospitalCidsSnapshot()
        setCidState(
          snapshot.hospital.cnes === selectedCnes &&
            snapshot.filters.eligible_only === eligibleOnly
            ? { kind: 'ready', data: snapshot }
            : { kind: 'absent' },
        )
      } catch {
        setCidState({ kind: 'error' })
      }
      return
    }

    const controller = new AbortController()
    cidRequest.current = controller
    setCidState({ kind: 'loading' })
    void fetchHospitalCids(
      { cnes: selectedCnes, eligibleOnly },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setCidState({ kind: 'ready', data })
      })
      .catch((erro: unknown) => {
        if (controller.signal.aborted) return
        setCidState({ kind: erro instanceof CidAbsentError ? 'absent' : 'error' })
      })

    return () => controller.abort()
  }, [selectedCnes, eligibleOnly, sourceState.kind])

  function updateParam(name: string, value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(name, value)
      else next.delete(name)
      return next
    })
  }

  const updateHospitalSearch = useCallback((value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set('busca', value)
      else next.delete('busca')
      return next
    })
  }, [setSearchParams])

  function selectHospital(cnes: string) {
    updateParam('hospital', cnes)
    requestAnalysisAnchor('hospital-detail')
  }

  function clearHospital() {
    updateParam('hospital', '')
    setHistoryOpen(false)
    setDiagnosticsOpen(false)
    requestAnalysisAnchor('hospital-list')
  }

  return (
    <section
      id="hospital"
      className="analysis-section hospital-page"
      aria-labelledby="hospital-section-title"
      data-anchor-ready={hospitalAnchorReady ? 'true' : undefined}
      tabIndex={-1}
    >
      <div className="view-intro">
        <div>
          <p className="section-kicker">HOSPITAL</p>
          <h2 id="hospital-section-title">Hospitais da região</h2>
        </div>
      </div>

      {sourceState.kind === 'loading' && (
        <StatePanel kind="loading" title="Carregando hospitais" testId="hospital-loading">
          Buscando competência, regiões e hospitais com produção.
        </StatePanel>
      )}
      {sourceState.kind === 'empty' && (
        <StatePanel kind="empty" title="Sem competência publicada" testId="hospital-source-empty">
          A fonte respondeu normalmente, mas ainda não há período para consultar.
        </StatePanel>
      )}
      {sourceState.kind === 'error' && (
        <StatePanel
          kind="error"
          title="Visão hospitalar indisponível"
          testId="hospital-source-error"
        >
          Não foi possível carregar esta tela. Tente novamente.
        </StatePanel>
      )}

      {sourceData && (
        <>
          {listState.kind === 'loading' && (
            <StatePanel kind="loading" title="Carregando lista" testId="hospital-list-loading">
              A resposta anterior não será exibida como se fosse deste recorte.
            </StatePanel>
          )}
          {listState.kind === 'absent' && (
            <StatePanel
              kind="empty"
              title="Competência sem hospitais publicados"
              testId="hospital-absent-competence"
            >
              A fonte respondeu normalmente, mas não há hospital publicado para{' '}
              {formatPeriod(selectedCompetence)}. O período disponível vai até{' '}
              {formatPeriod(sourceData.status.data_through)}.
            </StatePanel>
          )}
          {listState.kind === 'error' && (
            <StatePanel kind="error" title="Hospitais indisponíveis" testId="hospital-list-error">
              A consulta não respondeu ou devolveu conteúdo inesperado. A fonte
              regional continua identificada acima.
            </StatePanel>
          )}

          {list && (
            /* A tabela usa sempre a lista canônica completa; busca e
               ordenação são apenas projeções locais desse mesmo universo. */
            <HospitalTable
              search={urlSearch}
              onSearchChange={updateHospitalSearch}
              searchDisabled={false}
              data={list}
              selectedCnes={selectedCnes}
              onSelect={selectHospital}
            />
          )}

          {selectedHospital && list && (
            <div
              id="hospital-detail"
              className="hospital-detail"
              data-anchor-ready="true"
              tabIndex={-1}
            >
              <HospitalPeers
                hospital={selectedHospital}
                competence={selectedCompetence}
                regionName={list.region.region_name ?? 'esta região'}
                regionHospitals={list.items}
                statewide={statewide}
                statewideFailed={statewideFailed}
                snapshotLimited={sourceState.kind === 'fallback'}
                onChangeHospital={clearHospital}
              />

              <section className="hospital-history" aria-labelledby="hospital-history-title">
                <button
                  type="button"
                  aria-expanded={historyOpen}
                  aria-controls="hospital-history-content"
                  onClick={() => setHistoryOpen((current) => !current)}
                >
                  <span>
                    <small>EVOLUÇÃO</small>
                    <strong id="hospital-history-title">Evolução mensal do hospital</strong>
                  </span>
                  <span aria-hidden="true">{historyOpen ? '−' : '+'}</span>
                </button>
                {historyOpen && (
                  <div id="hospital-history-content" className="hospital-history-content">
                    {seriesState.kind === 'loading' && (
                      <StatePanel kind="loading" title="Carregando série" testId="serie-loading">
                        Buscando o histórico mensal do hospital selecionado.
                      </StatePanel>
                    )}
                    {seriesState.kind === 'absent' && (
                      <StatePanel kind="empty" title="Hospital sem série publicada" testId="serie-absent">
                        Não há série publicada para o CNES selecionado.
                      </StatePanel>
                    )}
                    {seriesState.kind === 'error' && (
                      <StatePanel kind="error" title="Série do hospital indisponível" testId="serie-error">
                        O histórico não respondeu; a comparação com pares permanece válida.
                      </StatePanel>
                    )}
                    {seriesState.kind === 'ready' && <HospitalSeries data={seriesState.data} />}
                  </div>
                )}
              </section>
            </div>
          )}

          {(specialtyState.kind === 'loading' ||
            (specialtyState.kind === 'ready' && !specialtyData && selectedCnes)) && (
            <StatePanel kind="loading" title="Carregando especialidades" testId="especialidade-loading">
              Buscando o perfil por especialidade do hospital na competência.
            </StatePanel>
          )}
          {specialtyState.kind === 'absent' && (
            <StatePanel
              kind="empty"
              title="Sem especialidade publicada"
              testId="especialidade-absent"
            >
              A fonte respondeu normalmente, mas não há especialidade publicada para esse
              hospital em {formatPeriod(selectedCompetence)}.
            </StatePanel>
          )}
          {specialtyState.kind === 'error' && (
            <StatePanel
              kind="error"
              title="Especialidades indisponíveis"
              testId="especialidade-error"
            >
              A consulta de especialidades não respondeu ou devolveu conteúdo inesperado.
              A série e a lista acima não foram afetadas.
            </StatePanel>
          )}
          {specialtyData && selectedHospital && (
            <SpecialtyTable
              data={specialtyData}
              hospitalName={selectedHospital.hospital_name}
            />
          )}

          {selectedHospital && (
            <section className="hospital-history hospital-diagnostics" aria-labelledby="hospital-diagnostics-title">
              <button
                type="button"
                aria-expanded={diagnosticsOpen}
                aria-controls="hospital-diagnostics-content"
                data-testid="diagnostics-toggle"
                onClick={() => setDiagnosticsOpen((current) => !current)}
              >
                <span>
                  <small>DIAGNÓSTICOS</small>
                  <strong id="hospital-diagnostics-title">
                    Diagnósticos · período agregado
                  </strong>
                  <span className="diagnostics-period">
                    {formatInteger(sourceData.methodology.coverage.competencies)} competências
                    até {formatPeriod(sourceData.status.data_through)}
                  </span>
                </span>
                <span aria-hidden="true">{diagnosticsOpen ? '−' : '+'}</span>
              </button>
              {diagnosticsOpen && (
                <div id="hospital-diagnostics-content" className="hospital-history-content">
                  {cidState.kind === 'loading' && (
                    <StatePanel kind="loading" title="Carregando diagnósticos" testId="cid-loading">
                      Buscando o índice de permanência relativa por diagnóstico.
                    </StatePanel>
                  )}
                  {cidState.kind === 'absent' && (
                    <StatePanel kind="empty" title="Sem diagnóstico publicado" testId="cid-absent">
                      A fonte respondeu normalmente, mas não há diagnóstico publicado para esse
                      hospital no período agregado.
                    </StatePanel>
                  )}
                  {cidState.kind === 'error' && (
                    <StatePanel kind="error" title="Diagnósticos indisponíveis" testId="cid-error">
                      A consulta de diagnósticos não respondeu ou devolveu conteúdo inesperado.
                      Os blocos acima não foram afetados.
                    </StatePanel>
                  )}
                  {cidState.kind === 'ready' &&
                    (cidState.data.items.length === 0 ? (
                      <StatePanel kind="empty" title="Nenhum diagnóstico no recorte" testId="cid-empty">
                        A fonte respondeu normalmente, mas não observou diagnóstico para esse
                        hospital neste recorte.
                      </StatePanel>
                    ) : (
                      <CidTable data={cidState.data} eligibleOnly={eligibleOnly} />
                    ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </section>
  )
}

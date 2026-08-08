import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  fetchHospitals,
  getHospitalListSnapshot,
  HospitalAbsentCompetenceError,
  type HospitalListResponse,
} from '../api/hospitais'
import {
  fetchHospitalSeries,
  getHospitalSeriesSnapshot,
  HospitalSeriesAbsentError,
  type HospitalSeriesResponse,
} from '../api/hospitalSerie'
import {
  fetchSpecialties,
  getSpecialtySnapshot,
  SpecialtyAbsentError,
  type SpecialtyResponse,
} from '../api/hospitalEspecialidades'
import {
  CidAbsentError,
  fetchHospitalCids,
  getHospitalCidsSnapshot,
  type CidResponse,
} from '../api/hospitalCids'
import CidTable from '../components/CidTable'
import HospitalSeries from '../components/HospitalSeries'
import HospitalTable from '../components/HospitalTable'
import SpecialtyTable from '../components/SpecialtyTable'
import MethodNote from '../components/MethodNote'
import SourcePanel from '../components/SourcePanel'
import StatePanel from '../components/StatePanel'
import { useSource } from '../source/SourceContext'
import { formatPeriod } from '../utils/format'
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

const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const REGION_CODE_PATTERN = /^\d{5}$/
const CNES_PATTERN = /^\d{7}$/

export default function HospitalView() {
  const { sourceState } = useSource()
  const [searchParams, setSearchParams] = useSearchParams()
  const [listState, setListState] = useState<ListState>({ kind: 'idle' })
  const [seriesState, setSeriesState] = useState<SeriesState>({ kind: 'idle' })
  const [specialtyState, setSpecialtyState] = useState<SpecialtyState>({ kind: 'idle' })
  const [cidState, setCidState] = useState<CidState>({ kind: 'idle' })
  const listRequest = useRef<AbortController | null>(null)
  const seriesRequest = useRef<AbortController | null>(null)
  const specialtyRequest = useRef<AbortController | null>(null)
  const cidRequest = useRef<AbortController | null>(null)

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
  const urlRegion = searchParams.get('regiao') ?? ''
  const urlHospital = searchParams.get('hospital') ?? ''
  // O recorte de elegíveis vive na URL como os demais filtros, e vem ligado por
  // padrão: sem ele a lista abre em diagnósticos que não têm IPR calculável.
  const eligibleOnly = (searchParams.get('elegiveis') ?? '1') !== '0'
  const defaultRegion =
    regions.find((region) => region.region_code === '35073')?.region_code ??
    regions[0]?.region_code ??
    ''

  const selectedCompetence = isFallback
    ? listState.kind === 'ready'
      ? listState.data.data_through
      : sourceData?.status.data_through ?? ''
    : COMPETENCE_PATTERN.test(urlCompetence)
      ? urlCompetence
      : sourceData?.status.data_through ?? ''
  const selectedRegion = isFallback
    ? listState.kind === 'ready'
      ? listState.data.region.region_code
      : defaultRegion
    : REGION_CODE_PATTERN.test(urlRegion) &&
        regions.some((region) => region.region_code === urlRegion)
      ? urlRegion
      : defaultRegion

  const list = listState.kind === 'ready' ? listState.data : null
  // Um CNES só vale como selecionado se estiver na lista carregada. Assim a URL
  // nunca faz a tela abrir o detalhe de um hospital que não é deste recorte.
  const selectedCnes =
    CNES_PATTERN.test(urlHospital) && list?.items.some((item) => item.cnes === urlHospital)
      ? urlHospital
      : ''

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
    void fetchHospitals(
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

  function selectRegion(value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('regiao', value)
      // O hospital anterior é de outra região: mantê-lo na URL faria a tela
      // prometer um detalhe que não pertence a este recorte.
      next.delete('hospital')
      return next
    })
  }

  return (
    <main className="page-main hospital-page">
      <header className="view-header">
        <p className="section-kicker">VISÃO HOSPITAL E PARES</p>
        <h1>O que explica o sinal da região e onde ele se concentra?</h1>
        <p>
          Abra os hospitais da região, veja a evolução de cada um e compare com pares
          elegíveis sem confundir volume com desempenho.
        </p>
      </header>

      <SourcePanel />

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
          Nem a API nem o snapshot local puderam sustentar esta tela.
        </StatePanel>
      )}

      {sourceData && (
        <>
          <section className="hospital-controls" aria-labelledby="hospital-controls-title">
            <div>
              <p className="section-kicker">RECORTE</p>
              <h2 id="hospital-controls-title">Competência e região</h2>
            </div>
            <div className="hospital-toolbar">
              <label>
                Competência
                <input
                  type="month"
                  value={selectedCompetence}
                  max={sourceData.status.data_through}
                  disabled={isFallback}
                  data-testid="hospital-competence"
                  onChange={(event) => updateParam('competencia', event.target.value)}
                />
              </label>
              <label>
                Região de saúde
                <select
                  value={selectedRegion}
                  disabled={isFallback}
                  data-testid="hospital-region"
                  onChange={(event) => selectRegion(event.target.value)}
                >
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
                ? 'O snapshot preserva os hospitais de JUNDIAI em 05/2026; tente novamente para consultar outro recorte sem misturar fontes.'
                : 'Competência, região e hospital permanecem na URL; trocar a região limpa o hospital, que era de outro recorte.'}
            </small>
          </section>

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
              O endpoint não respondeu ou devolveu conteúdo fora do contrato. A fonte
              regional continua identificada acima.
            </StatePanel>
          )}

          {list && (
            <>
              <MethodNote>
                O IPH estimado usa paciente-dia estimado sobre leito-dia declarado no
                CNES: acima de 100% indica divergência entre produção e capacidade
                declarada, não ocupação real acima do teto físico. Hospital com amostra
                insuficiente não é comparável.
              </MethodNote>

              {list.items.length === 0 ? (
                <StatePanel kind="empty" title="Nenhum hospital no recorte" testId="hospital-empty">
                  A fonte respondeu normalmente, mas não observou hospital com produção
                  nessa região e competência.
                </StatePanel>
              ) : (
                <HospitalTable
                  data={list}
                  selectedCnes={selectedCnes}
                  onSelect={(cnes) => updateParam('hospital', cnes)}
                />
              )}
            </>
          )}

          {seriesState.kind === 'loading' && (
            <StatePanel kind="loading" title="Carregando série" testId="serie-loading">
              Buscando o histórico mensal do hospital selecionado.
            </StatePanel>
          )}
          {seriesState.kind === 'absent' && (
            <StatePanel kind="empty" title="Hospital sem série publicada" testId="serie-absent">
              A fonte respondeu normalmente, mas não há série publicada para o CNES
              selecionado.
            </StatePanel>
          )}
          {seriesState.kind === 'error' && (
            <StatePanel kind="error" title="Série do hospital indisponível" testId="serie-error">
              O endpoint da série não respondeu ou devolveu conteúdo fora do contrato. A
              lista de hospitais acima não foi afetada.
            </StatePanel>
          )}
          {seriesState.kind === 'ready' && <HospitalSeries data={seriesState.data} />}

          {specialtyState.kind === 'loading' && (
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
              O endpoint de especialidades não respondeu ou devolveu conteúdo fora do
              contrato. A série e a lista acima não foram afetadas.
            </StatePanel>
          )}
          {specialtyState.kind === 'ready' && <SpecialtyTable data={specialtyState.data} />}

          {/* O recorte de elegíveis é controle, não conteúdo: fica fora do
              painel de dados para não sumir enquanto a resposta é refeita. */}
          {selectedCnes && cidState.kind !== 'idle' && (
            <label className="cid-toggle">
              <input
                type="checkbox"
                checked={eligibleOnly}
                data-testid="cid-eligible-toggle"
                onChange={(event) =>
                  updateParam('elegiveis', event.target.checked ? '' : '0')
                }
              />
              Mostrar apenas diagnósticos elegíveis para IPR
            </label>
          )}

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
              O endpoint de diagnósticos não respondeu ou devolveu conteúdo fora do
              contrato. Os blocos acima não foram afetados.
            </StatePanel>
          )}
          {cidState.kind === 'ready' &&
            (cidState.data.items.length === 0 ? (
              <StatePanel kind="empty" title="Nenhum diagnóstico no recorte" testId="cid-empty">
                {eligibleOnly
                  ? 'Nenhum diagnóstico deste hospital tem amostra e par regional suficientes para calcular o IPR. Desmarque o recorte para ver os demais.'
                  : 'A fonte respondeu normalmente, mas não observou diagnóstico para esse hospital.'}
              </StatePanel>
            ) : (
              <CidTable data={cidState.data} eligibleOnly={eligibleOnly} />
            ))}
        </>
      )}
    </main>
  )
}

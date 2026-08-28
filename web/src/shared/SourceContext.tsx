import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  fetchMethodology,
  getMethodologySnapshot,
  MethodologyContractError,
  type MethodologyResponse,
} from '../lib/api/metodologia'
import {
  fetchRegioesResumo,
  getRegioesResumoSnapshot,
  RegionalContractError,
  type RegionalSummaryResponse,
} from '../lib/api/regioes'
import {
  fetchStatus,
  getStatusSnapshot,
  StatusContractError,
  type PublishedStatusResponse,
} from '../lib/api/status'

type SourceData = {
  status: PublishedStatusResponse
  methodology: MethodologyResponse
  regions: RegionalSummaryResponse
}

export type SourceState =
  | { kind: 'loading' }
  | { kind: 'live'; data: SourceData }
  | {
      kind: 'fallback'
      data: SourceData
      reason: 'oracle-unavailable' | 'invalid-contract'
    }
  | { kind: 'empty' }
  | { kind: 'error' }

type RegionalLoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

type SourceContextValue = {
  sourceState: SourceState
  regionalLoadState: RegionalLoadState
  reload: () => Promise<void>
  loadRegionalCompetence: (competence: string) => Promise<void>
  sharedCompetence: string
  sharedRegionCode: string
  sharedRegionParam: string
  sharedMacroregionCode: string
  setSharedCompetence: (competence: string) => void
  setSharedRegion: (regionCode: string) => void
  setSharedMacroregion: (macroregionCode: string) => void
  /** Mesmas regiões na competência anterior e no mesmo mês do ano anterior,
   *  para MoM e YoY. Nulo enquanto carrega, ou quando o período não existe. */
  regionalComparison: RegionalComparison
  /** Nome do hospital aberto, para o direcionador acompanhar o recorte. */
  selectedHospitalName: string | null
  reportHospitalName: (name: string | null) => void
}

export type RegionalComparison = {
  previous: RegionalSummaryResponse | null
  yearAgo: RegionalSummaryResponse | null
}

const EMPTY_COMPARISON: RegionalComparison = { previous: null, yearAgo: null }

/** Desloca uma competência `AAAA-MM` em meses, sem depender de fuso. */
export function shiftCompetence(competence: string, months: number) {
  const match = COMPETENCE_PATTERN.exec(competence)
  if (!match) return ''
  const total = Number(match[1]) * 12 + (Number(match[2]) - 1) + months
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

const SourceContext = createContext<SourceContextValue | null>(null)
export const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const REGION_CODE_PATTERN = /^\d{5}$/

function isContractError(error: unknown) {
  return (
    error instanceof StatusContractError ||
    error instanceof MethodologyContractError ||
    error instanceof RegionalContractError
  )
}

export function SourceProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { pathname } = useLocation()
  // Endereços fora das duas páginas reais são transitórios: a rede de
  // segurança do roteador ainda vai reescrevê-los. Normalizar a URL nesse
  // intervalo faz a escrita ser desfeita pelo redirecionamento seguinte.
  const onCanonicalRoute = pathname === '/' || pathname === '/metodologia'
  const setSearchParamsRef = useRef(setSearchParams)
  setSearchParamsRef.current = setSearchParams
  const [sourceState, setSourceState] = useState<SourceState>({ kind: 'loading' })
  const [regionalLoadState, setRegionalLoadState] =
    useState<RegionalLoadState>('idle')
  const regionalRequest = useRef<{ id: number; controller: AbortController } | null>(null)
  const [regionalComparison, setRegionalComparison] =
    useState<RegionalComparison>(EMPTY_COMPARISON)
  const comparisonRequest = useRef<AbortController | null>(null)
  const [selectedHospitalName, setSelectedHospitalName] = useState<string | null>(null)
  const reloadGeneration = useRef(0)

  const sourceData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data
      : null
  const isFallback = sourceState.kind === 'fallback'
  const requestedCompetence = searchParams.get('competencia') ?? ''
  const sharedRegionParam = searchParams.get('regiao') ?? ''
  const sharedMacroregionCode = searchParams.get('macrorregiao') ?? ''
  // Em contingência o recorte é uma publicação travada: o território sai do
  // próprio snapshot e não há panorama a oferecer.
  const fallbackRegionCode =
    sourceData?.regions.items.find((item) => item.region_code === '35073')?.region_code ??
    sourceData?.regions.items[0]?.region_code ??
    ''
  // Ao vivo, "nenhuma região" é um estado legítimo: é o panorama, onde as 62
  // regiões são comparáveis entre si. Escolher um território é um ato do
  // usuário, não um padrão herdado.
  const sharedRegionCode = isFallback
    ? fallbackRegionCode
    : REGION_CODE_PATTERN.test(sharedRegionParam) &&
        Boolean(sourceData?.regions.items.some((item) => item.region_code === sharedRegionParam))
      ? sharedRegionParam
      : ''
  const sharedCompetence = isFallback
    ? sourceData?.regions.data_through ?? sourceData?.status.data_through ?? ''
    : COMPETENCE_PATTERN.test(requestedCompetence)
      ? requestedCompetence
      : sourceData?.status.data_through ?? ''

  const reload = useCallback(async () => {
    const generation = reloadGeneration.current + 1
    reloadGeneration.current = generation
    regionalRequest.current?.controller.abort()
    regionalRequest.current = {
      id: (regionalRequest.current?.id ?? 0) + 1,
      controller: new AbortController(),
    }
    setSourceState({ kind: 'loading' })
    setRegionalLoadState('loading')

    try {
      const requested = new URLSearchParams(window.location.search).get('competencia')
      const status = await fetchStatus()
      if (reloadGeneration.current !== generation) return
      if (!status) {
        setSourceState({ kind: 'empty' })
        setRegionalLoadState('empty')
        return
      }

      const match = requested ? COMPETENCE_PATTERN.exec(requested) : null
      const competence = match ? requested! : status.data_through
      const [methodology, regions] = await Promise.all([
        fetchMethodology(),
        fetchRegioesResumo(Number(competence.slice(0, 4)), Number(competence.slice(5, 7))),
      ])
      if (reloadGeneration.current !== generation) return
      setSourceState({ kind: 'live', data: { status, methodology, regions } })
      setRegionalLoadState(regions.items.length === 0 ? 'empty' : 'ready')
    } catch (error) {
      if (reloadGeneration.current !== generation) return
      try {
        const status = getStatusSnapshot()
        const methodology = getMethodologySnapshot()
        const regions = getRegioesResumoSnapshot()
        const fallbackRegion =
          regions.items.find((item) => item.region_code === '35073')?.region_code ??
          regions.items[0]?.region_code ??
          ''
        setSourceState({
          kind: 'fallback',
          data: { status, methodology, regions },
          reason: isContractError(error) ? 'invalid-contract' : 'oracle-unavailable',
        })
        // Snapshot fixtures form one locked publication. Normalize the two
        // shared parameters together so every route and the URL describe the
        // same fallback context, while all local parameters survive.
        setSearchParamsRef.current((current) => {
          const next = new URLSearchParams(current)
          next.set('competencia', regions.data_through)
          if (fallbackRegion) next.set('regiao', fallbackRegion)
          return next
        }, { replace: true })
        setRegionalLoadState(regions.items.length === 0 ? 'empty' : 'ready')
      } catch {
        setSourceState({ kind: 'error' })
        setRegionalLoadState('error')
      }
    }
  }, [])

  const loadRegionalCompetence = useCallback(
    async (competence: string) => {
      const match = COMPETENCE_PATTERN.exec(competence)
      if (!match) return

      if (sourceState.kind !== 'live') return

      regionalRequest.current?.controller.abort()
      const controller = new AbortController()
      const id = (regionalRequest.current?.id ?? 0) + 1
      regionalRequest.current = { id, controller }
      setRegionalLoadState('loading')

      try {
        const regions = await fetchRegioesResumo(Number(match[1]), Number(match[2]), {
          signal: controller.signal,
        })
        if (regionalRequest.current?.id !== id) return
        setSourceState((current) =>
          current.kind === 'live'
            ? { ...current, data: { ...current.data, regions } }
            : current,
        )
        setRegionalLoadState(regions.items.length === 0 ? 'empty' : 'ready')
      } catch (error) {
        if (controller.signal.aborted || regionalRequest.current?.id !== id) return
        setRegionalLoadState('error')
      }
    },
    [sourceState.kind],
  )

  useEffect(() => {
    void reload()
    return () => regionalRequest.current?.controller.abort()
  }, [reload])

  // A competência pode mudar por link, back/forward ou colagem de URL. O
  // provider reage ao parâmetro, não apenas aos controles visuais.
  useEffect(() => {
    if (
      sourceState.kind !== 'live' ||
      !COMPETENCE_PATTERN.test(requestedCompetence) ||
      !sourceData ||
      sourceData.regions.data_through === requestedCompetence
    ) {
      return
    }

    void loadRegionalCompetence(requestedCompetence)
  }, [
    loadRegionalCompetence,
    requestedCompetence,
    sourceData,
    sourceState.kind,
  ])

  // A URL colada ou restaurada pelo histórico pode combinar uma RRAS válida
  // com uma região publicada em outra RRAS. Espera a competência pedida estar
  // carregada e só então reconcilia o território, para não usar uma lista
  // antiga nem disparar uma nova carga por causa da própria normalização.
  useEffect(() => {
    if (
      !onCanonicalRoute ||
      sourceState.kind !== 'live' ||
      !sourceData ||
      (COMPETENCE_PATTERN.test(requestedCompetence) &&
        sourceData.regions.data_through !== requestedCompetence) ||
      !sharedMacroregionCode
    ) {
      return
    }

    const regions = sourceData.regions.items
    const regionsInMacroregion = regions.filter(
      (item) => item.macroregion_code === sharedMacroregionCode,
    )
    const urlRegion = regions.find((item) => item.region_code === sharedRegionParam)
    if (regionsInMacroregion.length === 0) {
      // A RRAS inválida não oferece uma base confiável para inventar outra
      // seleção territorial. Remove somente a RRAS; uma região válida, se
      // houver, continua sendo o território compartilhado.
      if (!urlRegion) return
      setSearchParams(
        (current) => {
          if (current.get('macrorregiao') !== sharedMacroregionCode) return current
          const next = new URLSearchParams(current)
          next.delete('macrorregiao')
          return next
        },
        { replace: true },
      )
      return
    }

    // No panorama a RRAS é só um recorte do mapa e da tabela: escolher uma
    // rede não deve eleger um território por conta própria. A reconciliação
    // existe para resolver conflito entre região e RRAS, e sem região
    // escolhida não há conflito.
    if (!sharedRegionParam) return

    const currentRegion = urlRegion
    if (currentRegion?.macroregion_code === sharedMacroregionCode) return

    const nextRegion = regionsInMacroregion[0]
    setSearchParams(
      (current) => {
        // A URL pode ter mudado entre o render e o efeito. Reconfere os
        // parâmetros antes de escrever para manter a operação idempotente.
        if (
          current.get('macrorregiao') !== sharedMacroregionCode ||
          current.get('regiao') === nextRegion.region_code
        ) {
          return current
        }
        const next = new URLSearchParams(current)
        next.set('regiao', nextRegion.region_code)
        next.delete('destino')
        next.delete('hospital')
        return next
      },
      { replace: true },
    )
  }, [
    onCanonicalRoute,
    requestedCompetence,
    setSearchParams,
    sharedMacroregionCode,
    sharedRegionCode,
    sharedRegionParam,
    sourceData,
    sourceState.kind,
  ])

  // MoM e YoY exigem as mesmas 62 regiões em outras duas competências. As
  // buscas são de melhor esforço e nunca bloqueiam a tela: se o período não
  // existe — e no começo do recorte ele não existe — a comparação some em vez
  // de virar zero.
  useEffect(() => {
    comparisonRequest.current?.abort()
    if (sourceState.kind !== 'live' || !COMPETENCE_PATTERN.test(sharedCompetence)) {
      setRegionalComparison(EMPTY_COMPARISON)
      return
    }

    const controller = new AbortController()
    comparisonRequest.current = controller
    setRegionalComparison(EMPTY_COMPARISON)

    const load = async (competence: string) => {
      const match = COMPETENCE_PATTERN.exec(competence)
      if (!match) return null
      try {
        return await fetchRegioesResumo(Number(match[1]), Number(match[2]), {
          signal: controller.signal,
        })
      } catch {
        return null
      }
    }

    void (async () => {
      const [previous, yearAgo] = await Promise.all([
        load(shiftCompetence(sharedCompetence, -1)),
        load(shiftCompetence(sharedCompetence, -12)),
      ])
      if (controller.signal.aborted) return
      setRegionalComparison({ previous, yearAgo })
    })()

    return () => controller.abort()
  }, [sharedCompetence, sourceState.kind])

  const setSharedCompetence = useCallback(
    (competence: string) => {
      if (isFallback || !COMPETENCE_PATTERN.test(competence)) return
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('competencia', competence)
        return next
      })
    },
    [isFallback, setSearchParams],
  )

  const setSharedRegion = useCallback(
    (regionCode: string) => {
      if (isFallback) return
      if (regionCode === '') {
        // Voltar ao panorama larga o território e tudo que dependia dele.
        setSearchParams((current) => {
          const next = new URLSearchParams(current)
          next.delete('regiao')
          next.delete('macrorregiao')
          next.delete('destino')
          next.delete('hospital')
          return next
        })
        return
      }
      if (!REGION_CODE_PATTERN.test(regionCode)) return
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('regiao', regionCode)
        const selected = sourceData?.regions.items.find(
          (item) => item.region_code === regionCode,
        )
        if (selected) next.set('macrorregiao', selected.macroregion_code)
        // These local selections depend on the shared region. Competence and
        // unrelated URL parameters remain intact.
        next.delete('destino')
        next.delete('hospital')
        return next
      })
    },
    [isFallback, setSearchParams, sourceData],
  )

  const setSharedMacroregion = useCallback(
    (macroregionCode: string) => {
      if (isFallback) return
      if (!macroregionCode) {
        setSearchParams((current) => {
          const next = new URLSearchParams(current)
          next.delete('macrorregiao')
          return next
        })
        return
      }
      if (!sourceData) return

      const regionsInMacroregion = sourceData.regions.items.filter(
        (item) => item.macroregion_code === macroregionCode,
      )
      if (regionsInMacroregion.length === 0) return

      const currentRegion = sourceData.regions.items.find(
        (item) => item.region_code === sharedRegionCode,
      )
      const nextRegion = regionsInMacroregion[0]
      const regionToUse =
        currentRegion?.macroregion_code === macroregionCode
          ? currentRegion
          : nextRegion
      const preservesCurrentRegion = regionToUse === currentRegion
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('macrorregiao', macroregionCode)
        next.set('regiao', regionToUse.region_code)
        if (!preservesCurrentRegion) {
          // Destino e hospital dependem da região compartilhada. Não
          // preservar seleções de outro território evita uma combinação
          // incoerente na URL e nas requisições seguintes.
          next.delete('destino')
          next.delete('hospital')
        }
        return next
      })
    },
    [isFallback, setSearchParams, sharedRegionCode, sourceData],
  )

  return (
    <SourceContext.Provider
      value={{
        sourceState,
        regionalLoadState,
        reload,
        loadRegionalCompetence,
        sharedCompetence,
        sharedRegionCode,
        sharedRegionParam,
        sharedMacroregionCode,
        setSharedCompetence,
        setSharedRegion,
        setSharedMacroregion,
        regionalComparison,
        selectedHospitalName,
        reportHospitalName: setSelectedHospitalName,
      }}
    >
      {children}
    </SourceContext.Provider>
  )
}

export function useSource() {
  const context = useContext(SourceContext)
  if (!context) throw new Error('useSource deve ser usado dentro de SourceProvider')
  return context
}

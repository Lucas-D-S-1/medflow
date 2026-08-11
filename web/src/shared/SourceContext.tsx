import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
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
}

const SourceContext = createContext<SourceContextValue | null>(null)
const COMPETENCE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

function isContractError(error: unknown) {
  return (
    error instanceof StatusContractError ||
    error instanceof MethodologyContractError ||
    error instanceof RegionalContractError
  )
}

export function SourceProvider({ children }: { children: ReactNode }) {
  const [sourceState, setSourceState] = useState<SourceState>({ kind: 'loading' })
  const [regionalLoadState, setRegionalLoadState] =
    useState<RegionalLoadState>('idle')
  const regionalRequest = useRef<{ id: number; controller: AbortController } | null>(null)

  const reload = useCallback(async () => {
    regionalRequest.current?.controller.abort()
    setSourceState({ kind: 'loading' })
    setRegionalLoadState('loading')

    try {
      const status = await fetchStatus()
      if (!status) {
        setSourceState({ kind: 'empty' })
        setRegionalLoadState('empty')
        return
      }

      const requested = new URLSearchParams(window.location.search).get('competencia')
      const match = requested ? COMPETENCE_PATTERN.exec(requested) : null
      const competence = match ? requested! : status.data_through
      const [methodology, regions] = await Promise.all([
        fetchMethodology(),
        fetchRegioesResumo(Number(competence.slice(0, 4)), Number(competence.slice(5, 7))),
      ])
      setSourceState({ kind: 'live', data: { status, methodology, regions } })
      setRegionalLoadState(regions.items.length === 0 ? 'empty' : 'ready')
    } catch (error) {
      try {
        const status = getStatusSnapshot()
        const methodology = getMethodologySnapshot()
        const regions = getRegioesResumoSnapshot()
        setSourceState({
          kind: 'fallback',
          data: { status, methodology, regions },
          reason: isContractError(error) ? 'invalid-contract' : 'oracle-unavailable',
        })
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

  return (
    <SourceContext.Provider
      value={{ sourceState, regionalLoadState, reload, loadRegionalCompetence }}
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

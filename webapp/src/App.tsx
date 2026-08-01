import { useCallback, useEffect, useState } from 'react'
import {
  fetchStatus,
  getStatusSnapshot,
  type StatusResponse,
} from './api/status'

type SourceState =
  | { kind: 'loading' }
  | { kind: 'live'; data: StatusResponse }
  | { kind: 'fallback'; data: StatusResponse }
  | { kind: 'empty' }
  | { kind: 'error' }

const periodFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatPeriod(period: string) {
  return periodFormatter.format(new Date(`${period}-01T00:00:00Z`))
}

function formatDatabaseTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) return 'horário indisponível'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(parsed)
}

export default function App() {
  const [sourceState, setSourceState] = useState<SourceState>({ kind: 'loading' })

  const loadStatus = useCallback(async () => {
    setSourceState({ kind: 'loading' })

    try {
      const liveStatus = await fetchStatus()
      setSourceState(liveStatus ? { kind: 'live', data: liveStatus } : { kind: 'empty' })
    } catch {
      try {
        setSourceState({ kind: 'fallback', data: getStatusSnapshot() })
      } catch {
        setSourceState({ kind: 'error' })
      }
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const statusData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data
      : null

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="MedFlow, início">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>MedFlow</span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#visoes">Visões</a>
          <a className="active" href="#metodologia">Metodologia</a>
        </nav>
      </header>

      <main id="inicio">
        <section className="hero" aria-labelledby="page-title">
          <div className="eyebrow"><span /> TRANSPARÊNCIA DOS DADOS</div>
          <h1 id="page-title">A fonte antes do indicador.</h1>
          <p>
            Consulte a disponibilidade do Oracle, a competência mais recente da Gold
            e a versão do contrato que sustenta cada leitura do MedFlow.
          </p>
        </section>

        <section className="status-panel" aria-live="polite" aria-busy={sourceState.kind === 'loading'}>
          {sourceState.kind === 'loading' && (
            <div className="state-message" data-testid="loading-state">
              <span className="loader" aria-hidden="true" />
              <div>
                <strong>Consultando a fonte</strong>
                <p>Validando o contrato e a competência publicada.</p>
              </div>
            </div>
          )}

          {sourceState.kind === 'empty' && (
            <div className="state-message" data-testid="empty-state">
              <span className="state-icon neutral" aria-hidden="true">—</span>
              <div>
                <strong>Nenhuma competência publicada</strong>
                <p>A fonte respondeu normalmente, mas ainda não possui dados Gold disponíveis.</p>
              </div>
            </div>
          )}

          {sourceState.kind === 'error' && (
            <div className="state-message" data-testid="error-state">
              <span className="state-icon error" aria-hidden="true">!</span>
              <div>
                <strong>Fonte e contingência indisponíveis</strong>
                <p>Não foi possível carregar o Oracle nem o snapshot local.</p>
                <button type="button" onClick={() => void loadStatus()}>Tentar novamente</button>
              </div>
            </div>
          )}

          {statusData && (
            <>
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">ESTADO DA FONTE</p>
                  <h2>Contrato operacional</h2>
                </div>
                <span
                  className={`source-badge ${sourceState.kind}`}
                  data-testid="source-badge"
                >
                  <span aria-hidden="true" />
                  {sourceState.kind === 'live'
                    ? 'Oracle ao vivo'
                    : `Contingência — snapshot até ${statusData.data_through}`}
                </span>
              </div>

              <div className="metric-grid">
                <article>
                  <span className="metric-label">Dados disponíveis até</span>
                  <strong data-testid="data-through">{formatPeriod(statusData.data_through)}</strong>
                  <small>competência de processamento</small>
                </article>
                <article>
                  <span className="metric-label">Contrato da API</span>
                  <strong data-testid="contract-version">v{statusData.contract_version}</strong>
                  <small>caminho versionado /v1</small>
                </article>
                <article>
                  <span className="metric-label">Última verificação</span>
                  <strong className="date-value">{formatDatabaseTime(statusData.database_time)}</strong>
                  <small>{sourceState.kind === 'live' ? 'relógio do banco' : 'geração do snapshot'}</small>
                </article>
              </div>

              {sourceState.kind === 'fallback' && (
                <div className="fallback-note" data-testid="fallback-note">
                  <span aria-hidden="true">i</span>
                  <p>
                    O Oracle não respondeu. Esta sessão usa somente o snapshot local;
                    nenhuma fonte foi misturada. Você pode{' '}
                    <button type="button" onClick={() => void loadStatus()}>tentar novamente</button>.
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        <section className="methodology" id="metodologia" aria-labelledby="method-title">
          <div>
            <p className="section-kicker">NOTA METODOLÓGICA</p>
            <h2 id="method-title">O que este selo afirma</h2>
          </div>
          <div className="method-copy">
            <p>
              A competência exibida é lida diretamente da coluna persistida na Gold.
              Este endpoint não calcula IPH, IPR, TMH, CMI ou permanência.
            </p>
            <p>
              O estado da fonte indica disponibilidade técnica e versão do contrato;
              não é uma avaliação da qualidade clínica dos hospitais.
            </p>
          </div>
        </section>
      </main>

      <footer>
        <span>MedFlow · dados hospitalares agregados</span>
        <span>Leitura responsável para investigação em saúde</span>
      </footer>
    </div>
  )
}


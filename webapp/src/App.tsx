import { useCallback, useEffect, useState } from 'react'
import {
  fetchStatus,
  getStatusSnapshot,
  StatusContractError,
  type PublishedStatusResponse,
} from './api/status'
import {
  fetchMethodology,
  getMethodologySnapshot,
  MethodologyContractError,
  type MethodologyResponse,
} from './api/metodologia'

type SourceState =
  | { kind: 'loading' }
  | {
      kind: 'live'
      data: { status: PublishedStatusResponse; methodology: MethodologyResponse }
    }
  | {
      kind: 'fallback'
      data: { status: PublishedStatusResponse; methodology: MethodologyResponse }
      reason: 'oracle-unavailable' | 'invalid-contract'
    }
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

const integerFormatter = new Intl.NumberFormat('pt-BR')

function formatInteger(value: number) {
  return integerFormatter.format(value)
}

export default function App() {
  const [sourceState, setSourceState] = useState<SourceState>({ kind: 'loading' })

  const loadSourceData = useCallback(async () => {
    setSourceState({ kind: 'loading' })

    try {
      const liveStatus = await fetchStatus()
      if (!liveStatus) {
        setSourceState({ kind: 'empty' })
        return
      }

      const liveMethodology = await fetchMethodology()
      setSourceState({
        kind: 'live',
        data: { status: liveStatus, methodology: liveMethodology },
      })
    } catch (error) {
      try {
        setSourceState({
          kind: 'fallback',
          data: {
            status: getStatusSnapshot(),
            methodology: getMethodologySnapshot(),
          },
          reason:
            error instanceof StatusContractError || error instanceof MethodologyContractError
              ? 'invalid-contract'
              : 'oracle-unavailable',
        })
      } catch {
        setSourceState({ kind: 'error' })
      }
    }
  }, [])

  useEffect(() => {
    void loadSourceData()
  }, [loadSourceData])

  const statusData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data.status
      : null
  const methodologyData =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data.methodology
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
                <button type="button" onClick={() => void loadSourceData()}>Tentar novamente</button>
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
                  <span className="metric-label">Gold atualizada em</span>
                  <strong className="date-value" data-testid="gold-updated-at">
                    {methodologyData
                      ? formatDatabaseTime(methodologyData.gold_updated_at)
                      : 'data indisponível'}
                  </strong>
                  <small>manifesto da Gold publicada</small>
                </article>
                <article>
                  <span className="metric-label">Última verificação</span>
                  <strong className="date-value" data-testid="last-checked-at">
                    {formatDatabaseTime(statusData.database_time)}
                  </strong>
                  <small>{sourceState.kind === 'live' ? 'relógio do banco' : 'geração do snapshot'}</small>
                </article>
              </div>

              {sourceState.kind === 'fallback' && (
                <div className="fallback-note" data-testid="fallback-note">
                  <span aria-hidden="true">i</span>
                  <p>
                    {sourceState.reason === 'invalid-contract'
                      ? 'O Oracle respondeu, mas o conteúdo não corresponde ao contrato da API. '
                      : 'A consulta ao Oracle falhou ou excedeu o tempo limite. '}
                    Esta sessão usa somente o snapshot local;
                    nenhuma fonte foi misturada. Você pode{' '}
                    <button type="button" onClick={() => void loadSourceData()}>tentar novamente</button>.
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        <section className="methodology" id="metodologia" aria-labelledby="method-title">
          <div>
            <p className="section-kicker">NOTA METODOLÓGICA</p>
            <h2 id="method-title">Como ler cada número</h2>
            {methodologyData && (
              <p className="methodology-through" data-testid="methodology-data-through">
                Gold publicada até {formatPeriod(methodologyData.data_through)} · atualizada em{' '}
                {formatDatabaseTime(methodologyData.gold_updated_at)}
              </p>
            )}
          </div>
          <div className="methodology-content">
            {sourceState.kind === 'loading' && (
              <p className="methodology-state" data-testid="methodology-loading">
                Carregando cobertura, fórmulas e limites do contrato…
              </p>
            )}

            {sourceState.kind === 'empty' && (
              <p className="methodology-state" data-testid="methodology-empty">
                A fonte respondeu, mas não há uma competência Gold publicada para documentar.
              </p>
            )}

            {sourceState.kind === 'error' && (
              <p className="methodology-state" data-testid="methodology-error">
                A nota metodológica não está disponível nesta tentativa.
              </p>
            )}

            {methodologyData && (
              <>
                <div className="coverage-grid" aria-label="Cobertura publicada">
                  <article>
                    <span>Regiões de saúde</span>
                    <strong data-testid="coverage-regions">
                      {formatInteger(methodologyData.coverage.regions)}
                    </strong>
                  </article>
                  <article>
                    <span>Competências</span>
                    <strong data-testid="coverage-competencies">
                      {formatInteger(methodologyData.coverage.competencies)}
                    </strong>
                  </article>
                  <article>
                    <span>Internações novas</span>
                    <strong data-testid="coverage-admissions">
                      {formatInteger(methodologyData.coverage.new_admissions)}
                    </strong>
                  </article>
                  <article>
                    <span>Pacientes-dia estimados</span>
                    <strong data-testid="coverage-patient-days">
                      {formatInteger(methodologyData.coverage.estimated_patient_days)}
                    </strong>
                  </article>
                  <article>
                    <span>Dias de permanência</span>
                    <strong data-testid="coverage-stay-days">
                      {formatInteger(methodologyData.coverage.stay_days)}
                    </strong>
                  </article>
                  <article>
                    <span>Meses sem leito SUS</span>
                    <strong data-testid="coverage-no-sus-bed">
                      {formatInteger(methodologyData.coverage.hospital_months_without_declared_sus_bed)}
                    </strong>
                  </article>
                  <article>
                    <span>Benchmark zerado</span>
                    <strong data-testid="coverage-benchmark-zero">
                      {formatInteger(methodologyData.coverage.benchmark_zero_rows)}
                    </strong>
                  </article>
                </div>

                <div className="methodology-block">
                  <h3>Fórmulas publicadas na Gold</h3>
                  <div className="formula-list">
                    {methodologyData.formulas.map((formula) => (
                      <article key={formula.id} data-testid={`formula-${formula.id}`}>
                        <strong>{formula.label}</strong>
                        <code>{formula.expression}</code>
                        {formula.reference_competence && (
                          <small className="formula-reference">
                            Competência de referência do CMI real: {formatPeriod(formula.reference_competence)}
                          </small>
                        )}
                        <p>{formula.interpretation}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="methodology-block">
                  <h3>Cortes que preservam a amostra</h3>
                  <div className="cut-list">
                    {methodologyData.cuts.map((cut) => (
                      <article key={cut.id} data-testid={`cut-${cut.id}`}>
                        <strong>{cut.label}</strong>
                        <p>{cut.description}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="methodology-block">
                  <h3>Reconciliações publicadas</h3>
                  <div className="reconciliation-list">
                    {methodologyData.reconciliations.map((reconciliation) => (
                      <article
                        key={reconciliation.id}
                        data-testid={`reconciliation-${reconciliation.id}`}
                      >
                        <div className="reconciliation-heading">
                          <strong>{reconciliation.label}</strong>
                          <span className="reconciliation-status">{reconciliation.status}</span>
                        </div>
                        <div className="reconciliation-values">
                          <span>{reconciliation.left_label}: <b>{formatInteger(reconciliation.left_value)}</b></span>
                          <span>{reconciliation.right_label}: <b>{formatInteger(reconciliation.right_value)}</b></span>
                          <span>diferença: <b>{formatInteger(reconciliation.difference)}</b></span>
                        </div>
                        <p>{reconciliation.note}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="methodology-block">
                  <h3>Unidades que não são intercambiáveis</h3>
                  <div className="definition-list">
                    {methodologyData.definitions.map((definition) => (
                      <article key={definition.id} data-testid={`definition-${definition.id}`}>
                        <div className="definition-heading">
                          <strong>{definition.label}</strong>
                          {definition.published_value !== undefined ? (
                            <span>{formatInteger(definition.published_value)}</span>
                          ) : (
                            <span>Não publicado nesta Gold</span>
                          )}
                        </div>
                        <p>{definition.definition}</p>
                        <small>Campo: {definition.gold_field}</small>
                        <small>{definition.value_note}</small>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="methodology-block">
                  <h3>Estados sem imputação</h3>
                  <div className="state-list">
                    {methodologyData.states.map((state) => (
                      <article key={state.id} data-testid={`state-${state.id}`}>
                        <div className="state-heading">
                          <strong>{state.label}</strong>
                          <span>{formatInteger(state.count)} {state.count_label}</span>
                        </div>
                        <p>{state.description}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="methodology-block source-limit-grid">
                  <div>
                    <h3>Fontes</h3>
                    <ul>
                      {methodologyData.sources.map((source) => (
                        <li key={source.id}>
                          <strong>{source.label}</strong> — {source.scope}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>Limitações</h3>
                    <ul>
                      {methodologyData.limitations.map((limitation) => (
                        <li key={limitation}>{limitation}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
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

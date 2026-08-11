import MethodNote from '../../shared/MethodNote'
import MetricCard from '../../shared/MetricCard'
import SourcePanel from '../../shared/SourcePanel'
import { useSource } from '../../shared/SourceContext'
import { formatInteger, formatPeriod } from '../../shared/format'
import './MetodologiaView.css'

export default function MetodologiaView() {
  const { sourceState } = useSource()
  const data =
    sourceState.kind === 'live' || sourceState.kind === 'fallback'
      ? sourceState.data.methodology
      : null

  return (
    <main className="page-main methodology-page">
      <header className="view-header">
        <p className="section-kicker">METODOLOGIA E QUALIDADE</p>
        <h1>Posso confiar no número e quais são seus limites?</h1>
        <p>
          Consulte cobertura, reconciliações, fórmulas e cortes sem confundir um dado
          administrativo agregado com afirmação clínica individual.
        </p>
      </header>

      <SourcePanel />

      {data && (
        <section className="methodology-summary" aria-labelledby="methodology-title">
          <div className="view-intro">
            <div>
              <p className="section-kicker">RESUMO PUBLICADO</p>
              <h2 id="methodology-title">Cobertura antes do detalhe</h2>
              <p data-testid="methodology-data-through">
                Gold publicada até {formatPeriod(data.data_through)} · contrato v{data.contract_version}
              </p>
            </div>
          </div>
          <div className="metric-grid methodology-metrics">
            <MetricCard label="Regiões" value={formatInteger(data.coverage.regions)} detail="regiões de saúde" testId="coverage-regions" />
            <MetricCard label="Competências" value={formatInteger(data.coverage.competencies)} detail="fotografias mensais" testId="coverage-competencies" />
            <MetricCard label="Internações novas" value={formatInteger(data.coverage.new_admissions)} detail="amostra administrativa agregada" testId="coverage-admissions" />
            <MetricCard label="Pacientes-dia estimados" value={formatInteger(data.coverage.estimated_patient_days)} detail="numerador persistido do IPH" testId="coverage-patient-days" />
            <MetricCard label="Dias de permanência" value={formatInteger(data.coverage.stay_days)} detail="não equivalem a diárias faturadas" testId="coverage-stay-days" />
            <MetricCard label="Benchmark zerado" value={formatInteger(data.coverage.benchmark_zero_rows)} detail="linhas com IPR nulo" testId="coverage-benchmark-zero" />
          </div>

          <MethodNote>
            Os blocos abaixo são colapsáveis. Cada um mantém no máximo 45% da altura da tela e
            possui rolagem interna quando o detalhe é longo.
          </MethodNote>

          <div className="methodology-details">
            <details>
              <summary>Fórmulas e interpretações <span>{data.formulas.length}</span></summary>
              <div className="detail-scroll detail-list">
                {data.formulas.map((formula) => (
                  <article key={formula.id} data-testid={`formula-${formula.id}`}>
                    <h3>{formula.label}</h3>
                    <p><strong>Expressão:</strong> {formula.expression}</p>
                    <p>{formula.interpretation}</p>
                  </article>
                ))}
              </div>
            </details>

            <details>
              <summary>Cortes de amostra <span>{data.cuts.length}</span></summary>
              <div className="detail-scroll detail-list">
                {data.cuts.map((cut) => (
                  <article key={cut.id} data-testid={`cut-${cut.id}`}>
                    <h3>{cut.label}</h3>
                    <p>{cut.description}</p>
                  </article>
                ))}
              </div>
            </details>

            <details>
              <summary>Reconciliações e estados nulos <span>{data.reconciliations.length + data.states.length}</span></summary>
              <div className="detail-scroll detail-list">
                {data.reconciliations.map((item) => (
                  <article key={item.id} data-testid={`reconciliation-${item.id}`}>
                    <h3>{item.label} · {item.status}</h3>
                    <p>{item.left_label}: {formatInteger(item.left_value)} · {item.right_label}: {formatInteger(item.right_value)} · diferença: {formatInteger(item.difference)}</p>
                    <p>{item.note}</p>
                  </article>
                ))}
                {data.states.map((state) => (
                  <article key={state.id} data-testid={`state-${state.id}`}>
                    <h3>{state.label} · {formatInteger(state.count)} {state.count_label}</h3>
                    <p>{state.description}</p>
                  </article>
                ))}
              </div>
            </details>

            <details>
              <summary>Definições administrativas <span>{data.definitions.length}</span></summary>
              <div className="detail-scroll detail-list">
                {data.definitions.map((definition) => (
                  <article key={definition.id} data-testid={`definition-${definition.id}`}>
                    <h3>{definition.label}</h3>
                    <p>{definition.definition}</p>
                    <p><strong>Campo Gold:</strong> {definition.gold_field}</p>
                    <p>{definition.value_note}</p>
                  </article>
                ))}
              </div>
            </details>

            <details>
              <summary>Fontes e limitações <span>{data.sources.length + data.limitations.length}</span></summary>
              <div className="detail-scroll detail-list">
                {data.sources.map((source) => (
                  <article key={source.id}>
                    <h3>{source.label}</h3>
                    <p>{source.scope}</p>
                  </article>
                ))}
                <ul>
                  {data.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
                </ul>
              </div>
            </details>
          </div>
        </section>
      )}
    </main>
  )
}

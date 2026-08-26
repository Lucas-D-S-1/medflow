import MethodNote from '../../shared/MethodNote'
import MetricCard from '../../shared/MetricCard'
import SourcePanel from '../../shared/SourcePanel'
import { useSource } from '../../shared/SourceContext'
import { formatInteger, formatPeriod } from '../../shared/format'
import './MetodologiaView.css'

const databaseDecision = [
  {
    option: 'Oracle Autonomous Database 26ai',
    status: 'Escolha do MVP',
    gold: 5,
    serving: 5,
    language: 5,
    operation: 5,
    cost: 5,
    rationale: 'Gold, views, ORDS e Select AI no mesmo plano de dados.',
  },
  {
    option: 'PostgreSQL gerenciado + API própria',
    status: 'Alternativa avaliada',
    gold: 4,
    serving: 3,
    language: 2,
    operation: 3,
    cost: 4,
    rationale: 'Bom encaixe relacional, mas acrescentaria backend e integração de IA.',
  },
  {
    option: 'Warehouse analítico + aplicação separada',
    status: 'Alternativa avaliada',
    gold: 4,
    serving: 2,
    language: 3,
    operation: 3,
    cost: 3,
    rationale: 'Forte para análise, com mais componentes para servir o produto.',
  },
]

function scoreTotal(option: (typeof databaseDecision)[number]) {
  return option.gold + option.serving + option.language + option.operation + option.cost
}

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

          <section className="database-decision" aria-labelledby="database-decision-title">
            <div className="view-intro">
              <div>
                <p className="section-kicker">DECISÃO DE ARQUITETURA</p>
                <h2 id="database-decision-title">Por que Oracle neste MVP?</h2>
                <p>
                  A escolha considera o produto construído, o prazo do challenge e o ambiente
                  disponível. A pontuação vai de 1 a 5 e mede aderência a este cenário — não a
                  qualidade universal de cada tecnologia.
                </p>
              </div>
              <span className="decision-badge">25 / 25</span>
            </div>

            <div className="decision-summary">
              <article>
                <strong>Menos componentes</strong>
                <span>Gold, serving e linguagem natural na mesma plataforma.</span>
              </article>
              <article>
                <strong>Governança próxima ao dado</strong>
                <span>Views, SQL somente leitura, auditoria e limites no banco.</span>
              </article>
              <article>
                <strong>Custo compatível</strong>
                <span>O volume atual cabe no ambiente Always Free já provisionado.</span>
              </article>
            </div>

            <div className="decision-table-wrap">
              <table className="decision-table">
                <thead>
                  <tr>
                    <th>Tecnologia</th>
                    <th>Gold</th>
                    <th>Serving</th>
                    <th>Linguagem natural</th>
                    <th>Operação</th>
                    <th>Custo do MVP</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {databaseDecision.map((option) => (
                    <tr key={option.option} className={option.status === 'Escolha do MVP' ? 'selected' : undefined}>
                      <th scope="row">
                        <strong>{option.option}</strong>
                        <span>{option.status}</span>
                        <small>{option.rationale}</small>
                      </th>
                      <td data-label="Gold">{option.gold}</td>
                      <td data-label="Serving">{option.serving}</td>
                      <td data-label="Linguagem natural">{option.language}</td>
                      <td data-label="Operação">{option.operation}</td>
                      <td data-label="Custo do MVP">{option.cost}</td>
                      <td data-label="Total"><strong>{scoreTotal(option)} / 25</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="methodology-details">
            <details data-testid="territorial-hierarchy">
              <summary>Territórios e redes assistenciais <span>3 conceitos</span></summary>
              <div className="detail-scroll detail-list">
                <article>
                  <h3>Município</h3>
                  <p>
                    Unidade administrativa usada para localizar residência, população e
                    estabelecimentos. Zona, distrito, subprefeitura e coordenadoria municipal
                    pertencem a outra hierarquia e não são sinônimos de RRAS.
                  </p>
                </article>
                <article>
                  <h3>Região de Saúde</h3>
                  <p>
                    Agrupamento oficial de municípios vizinhos usado como território principal
                    das análises regionais, dos fluxos e dos benchmarks do MedFlow.
                  </p>
                </article>
                <article>
                  <h3>Rede Regional de Atenção à Saúde (RRAS)</h3>
                  <p>
                    Reúne uma ou mais Regiões de Saúde para articular serviços de diferentes
                    complexidades. Na interface, “Rede regional 16 — Bragança e Jundiaí” é um
                    rótulo amigável; RRAS 16 continua sendo o identificador oficial.
                  </p>
                </article>
              </div>
            </details>
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

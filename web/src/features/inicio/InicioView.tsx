import { Link, useLocation } from 'react-router-dom'
import { withEntryIntent } from '../../shared/entryNavigation'
import { sourceSections } from '../../shared/publicNavigation'
import EntryVideo from './EntryVideo'
import './InicioView.css'

const steps = [
  { title: 'Região', text: 'Quais regiões estão sob mais pressão, e como isso varia ao longo do ano?', path: 'M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z M9 4v14 M15 6v14' },
  { title: 'Hospital', text: 'Quais hospitais da região puxam essa pressão?', path: 'M4 20V8l8-4 8 4v12 M9 20v-5h6v5 M12 8v4 M10 10h4' },
  { title: 'Especialidade', text: 'Qual especialidade explica a diferença, com fonte e limite à vista?', path: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z' },
]

export default function InicioView() {
  const { search } = useLocation()
  return (
    <main className="page-main entry-page">
      <section className="entry-hero" aria-labelledby="entry-title">
        <div className="entry-intro">
          <span className="entry-kicker">Inteligência em saúde pública · São Paulo</span>
          <h1 id="entry-title">Muitos dados públicos. Um caminho claro até o problema.</h1>
          <p>O MedFlow ajuda o gestor de saúde a descobrir onde a rede está sob pressão, entender o porquê e decidir para onde olhar primeiro.</p>
        </div>
        <EntryVideo />
        <div className="entry-actions">
          <Link className="entry-cta primary" to={{ pathname: '/', search: withEntryIntent(search, false) }}>Explorar os dados <span aria-hidden="true">→</span></Link>
          <Link className="entry-cta" to={{ pathname: '/metodologia', search }}>Ver fontes e indicadores</Link>
        </div>
      </section>
      <section className="entry-journey" aria-labelledby="journey-title">
        <div className="entry-track" aria-hidden="true"><span /></div>
        <div>
          <h2 id="journey-title">Como a investigação anda</h2>
          <ol>
            {steps.map((step) => <li key={step.title} className="entry-step">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={step.path} /></svg>
              <div><h3>{step.title}</h3><p>{step.text}</p></div>
            </li>)}
          </ol>
        </div>
      </section>
      <section className="entry-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Perguntas frequentes</h2>
        {sourceSections.map((section) => <Link key={section.id} to={{ pathname: '/metodologia', search, hash: `#${section.id}` }}>
          <span>{section.question}</span><small>{section.action} ›</small>
        </Link>)}
      </section>
      <footer className="entry-footer">Ômega Urban Tech · Challenge Oracle Health Data Intelligence · FIAP 2026</footer>
    </main>
  )
}

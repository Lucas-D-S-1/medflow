import SourcePanel from './SourcePanel'

export default function RoutePlaceholder({ title, question }: { title: string; question: string }) {
  return (
    <main className="page-main">
      <header className="view-header compact">
        <p className="section-kicker">VISÃO PLANEJADA</p>
        <h1>{title}</h1>
        <p>{question}</p>
      </header>
      <SourcePanel />
      <p className="route-placeholder">
        Esta visão ainda não possui endpoint publicado. O shell reserva a rota sem antecipar a fatia de dados.
      </p>
    </main>
  )
}

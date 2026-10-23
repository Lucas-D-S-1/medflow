import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SourceProvider } from './shared/SourceContext'
import InicioView from './features/inicio/InicioView'
import TechnicalView from './features/metodologia/TechnicalView'
import { isEntryLocation, withEntryIntent } from './shared/entryNavigation'
import AnalisePage from './features/analise/AnalisePage'
import AssistantWidget from './features/assistant/AssistantWidget'
import MetodologiaView from './features/metodologia/MetodologiaView'

function Shell() {
  const location = useLocation()
  const onEntry = isEntryLocation(location)
  const onAnalysis = location.pathname === '/' && !onEntry
  const routeWithContext = (pathname: string) => ({
    pathname,
    search: location.search,
  })

  return (
    <div className="app-shell">
      <div className="site-chrome">
        <header className="topbar">
          <Link
            className="brand"
            to={{ pathname: '/', search: withEntryIntent(location.search, true) }}
            aria-label="MedFlow, início"
          >
            <svg className="brand-symbol" viewBox="0 0 48 48" aria-hidden="true">
              <defs>
                <linearGradient
                  id="medflow-brand-gradient"
                  x1="6"
                  y1="42"
                  x2="42"
                  y2="6"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#37AB94" />
                  <stop offset="1" stopColor="#2B6CB0" />
                </linearGradient>
              </defs>
              <path
                fill="url(#medflow-brand-gradient)"
                d="M18 2h12a4 4 0 0 1 4 4v8h8a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-8v8a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4v-8H6a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4h8V6a4 4 0 0 1 4-4Z"
              />
              <path
                d="M4 28c6 0 8-10 14-10s6 12 12 12 8-10 14-10"
                fill="none"
                stroke="#fff"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3.25"
              />
            </svg>
            <span>MedFlow</span>
          </Link>
          <nav aria-label="Principal">
            <Link to={{ pathname: '/', search: withEntryIntent(location.search, true) }} className={onEntry ? 'active' : undefined} aria-current={onEntry ? 'page' : undefined}>Início</Link>
            <Link to={{ pathname: '/', search: withEntryIntent(location.search, false) }} className={onAnalysis ? 'active' : undefined} aria-current={onAnalysis ? 'page' : undefined}>Dados</Link>
            <Link to={routeWithContext('/metodologia')} className={location.pathname.startsWith('/metodologia') ? 'active' : undefined} aria-current={location.pathname.startsWith('/metodologia') ? 'page' : undefined}>Fontes e indicadores</Link>
          </nav>
        </header>
      </div>

      <Routes>
        <Route path="/" element={onEntry ? <InicioView /> : <AnalisePage />} />
        <Route path="/metodologia/tecnico" element={<TechnicalView />} />
        <Route path="/metodologia" element={<MetodologiaView />} />
        {/*
          Os caminhos antigos (/regional, /fluxos, /hospital) são reescritos
          para âncoras em main.tsx, antes do app montar. Aqui resta apenas a
          rede de segurança para qualquer outro endereço.
        */}
        <Route
          path="*"
          element={<Navigate to={{ pathname: '/', search: location.search }} replace />}
        />
      </Routes>
      <AssistantWidget />
    </div>
  )
}

export default function App() {
  return (
    <SourceProvider>
      <Shell />
    </SourceProvider>
  )
}

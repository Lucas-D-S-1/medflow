import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { SourceProvider } from './shared/SourceContext'
import AnalisePage from './features/analise/AnalisePage'
import AssistantWidget from './features/assistant/AssistantWidget'
import MetodologiaView from './features/metodologia/MetodologiaView'
import GlobalContextBar from './shared/GlobalContextBar'
import { useActiveSection } from './shared/useActiveSection'

const SECTIONS = [
  { id: 'regional', label: 'Regional' },
  { id: 'fluxos', label: 'Fluxos' },
  { id: 'hospital', label: 'Hospital' },
]
const SECTION_IDS = SECTIONS.map((section) => section.id)

function Shell() {
  const location = useLocation()
  const onAnalysis = location.pathname === '/'
  const activeSection = useActiveSection(SECTION_IDS, onAnalysis, location.hash)
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
            to={{ pathname: '/', search: location.search }}
            aria-label="MedFlow, início da análise"
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
          {/*
            O direcionador não troca de tela: ele diz onde você está na mesma
            investigação e rola até a etapa escolhida.
          */}
          <nav aria-label="Etapas da análise">
            {SECTIONS.map((section) => (
              <Link
                key={section.id}
                to={{ pathname: '/', search: location.search, hash: `#${section.id}` }}
                className={onAnalysis && activeSection === section.id ? 'active' : undefined}
                aria-current={
                  onAnalysis && activeSection === section.id ? 'true' : undefined
                }
                data-testid={`anchor-${section.id}`}
              >
                {section.label}
              </Link>
            ))}
            <NavLink to={routeWithContext('/metodologia')}>Metodologia</NavLink>
          </nav>
        </header>
        <GlobalContextBar />
      </div>

      <Routes>
        <Route path="/" element={<AnalisePage />} />
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

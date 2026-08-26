import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { SourceProvider } from './shared/SourceContext'
import AssistantWidget from './features/assistant/AssistantWidget'
import FluxosView from './features/fluxos/FluxosView'
import HospitalView from './features/hospital/HospitalView'
import MetodologiaView from './features/metodologia/MetodologiaView'
import RegionalView from './features/regional/RegionalView'

function Shell() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/regional" aria-label="MedFlow, visão regional">
          <svg className="brand-symbol" viewBox="0 0 48 48" aria-hidden="true">
            <defs>
              <linearGradient id="medflow-brand-gradient" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
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
        </NavLink>
        <nav aria-label="Navegação principal">
          <NavLink to="/regional">Regional</NavLink>
          <NavLink to="/fluxos">Fluxos</NavLink>
          <NavLink to="/hospital">Hospital</NavLink>
          <NavLink to="/metodologia">Metodologia</NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/regional" element={<RegionalView />} />
        <Route path="/fluxos" element={<FluxosView />} />
        <Route path="/hospital" element={<HospitalView />} />
        <Route path="/metodologia" element={<MetodologiaView />} />
        <Route path="*" element={<Navigate to="/regional" replace />} />
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

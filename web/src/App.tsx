import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { SourceProvider } from './shared/SourceContext'
import FluxosView from './features/fluxos/FluxosView'
import HospitalView from './features/hospital/HospitalView'
import MetodologiaView from './features/metodologia/MetodologiaView'
import RegionalView from './features/regional/RegionalView'

function Shell() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/regional" aria-label="MedFlow, visão regional">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
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

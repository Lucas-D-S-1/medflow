import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import App from './App'
import './styles/tokens.css'
import './styles.css'
import './shared/components.css'

/*
 * As três visões viraram âncoras de uma página só. Os links já compartilhados
 * continuam válidos, mas o endereço é reescrito ANTES do app montar: fazer isso
 * com um redirecionamento do roteador criaria um segundo escritor da URL,
 * competindo com a normalização de competência e território e desfazendo-a com
 * um `search` capturado antes dela.
 */
function rewriteLegacyPath() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const path = window.location.pathname.startsWith(base)
    ? window.location.pathname.slice(base.length)
    : window.location.pathname
  const section = path.replace(/^\/+|\/+$/g, '')
  if (!['regional', 'fluxos', 'hospital'].includes(section)) return

  window.history.replaceState(
    window.history.state,
    '',
    `${base}/${window.location.search}#${section}`,
  )
}

rewriteLegacyPath()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      O site publicado não fica na raiz do domínio, e sim em `/<repositório>/`.
      O `BASE_URL` é o mesmo `base` do Vite, então o roteador e os assets
      concordam sobre onde a aplicação começa, em qualquer ambiente.
    */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

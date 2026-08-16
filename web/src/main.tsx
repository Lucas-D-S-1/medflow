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

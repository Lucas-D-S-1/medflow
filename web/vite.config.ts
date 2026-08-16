import { copyFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const envDir = fileURLToPath(new URL('..', import.meta.url))
const distDir = fileURLToPath(new URL('./dist/', import.meta.url))

/**
 * O GitHub Pages serve arquivos, não conhece as rotas do SPA: abrir
 * `/medflow/fluxos` direto, ou dar F5 fora da raiz, procura um arquivo que não
 * existe. Servindo o próprio `index.html` como página de 404, o roteador
 * assume no navegador e a rota abre — é o caminho padrão para SPA no Pages.
 */
function fallbackDeRotasNoPages(): Plugin {
  return {
    name: 'medflow-fallback-404',
    apply: 'build',
    closeBundle() {
      copyFileSync(`${distDir}index.html`, `${distDir}404.html`)
    },
  }
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, envDir, '')

  // O proxy só existe no dev server. Um build de produção não fala com o
  // ORDS, então exigir a variável nele quebraria a CI sem motivo — e a
  // suíte Playwright intercepta as rotas antes de chegarem ao proxy.
  if (command === 'serve' && !env.ORDS_BASE_URL) {
    throw new Error('ORDS_BASE_URL não definido no .env da raiz do repositório')
  }

  // O site publicado mora em `/<repositório>/`, não na raiz do domínio. Fica
  // em variável para o build local, o `preview` e o Playwright continuarem
  // em `/`, sem precisar de um caminho que só existe no Pages.
  const base = env.VITE_BASE?.trim() || '/'

  return {
    base,
    envDir,
    plugins: [react(), fallbackDeRotasNoPages()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.ORDS_BASE_URL,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})


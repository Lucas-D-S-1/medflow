import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const envDir = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, envDir, '')

  // O proxy só existe no dev server. Um build de produção não fala com o
  // ORDS, então exigir a variável nele quebraria a CI sem motivo — e a
  // suíte Playwright intercepta as rotas antes de chegarem ao proxy.
  if (command === 'serve' && !env.ORDS_BASE_URL) {
    throw new Error('ORDS_BASE_URL não definido no .env da raiz do repositório')
  }

  return {
    envDir,
    plugins: [react()],
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


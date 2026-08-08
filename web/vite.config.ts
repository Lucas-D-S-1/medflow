import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const envDir = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')

  if (!env.ORDS_BASE_URL) {
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


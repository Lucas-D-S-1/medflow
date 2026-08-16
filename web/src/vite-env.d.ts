/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Prefixo das chamadas à API. Vazio em desenvolvimento, onde o proxy do Vite
   * resolve; a URL absoluta do módulo ORDS `api/v1` no build publicado.
   * Ver `src/lib/api/base.ts`.
   */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

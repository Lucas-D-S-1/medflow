/**
 * De onde o navegador busca os dados — um lugar só, para os dez endpoints.
 *
 * Em desenvolvimento o valor é relativo (`/api/dev/v1`): o proxy do Vite
 * encaminha ao ORDS, o navegador nunca sai da própria origem e CORS não entra
 * na conta. No site publicado não existe proxy — a página é estática no GitHub
 * Pages e fala direto com o Autonomous Database. Ali o valor é a URL absoluta
 * do módulo público `api/v1`, e quem autoriza a chamada entre origens é o
 * `set_module_origins_allowed` do ORDS, não o front.
 *
 * Antes isto estava escrito à mão em dez arquivos. Trocar de ambiente virava
 * dez edições, e bastava esquecer uma para o site publicado servir metade dos
 * painéis de um módulo e metade de outro — sem erro visível, só números de
 * procedências diferentes na mesma tela.
 */
const CONFIGURADA = import.meta.env.VITE_API_BASE?.trim()

export const API_BASE = (CONFIGURADA || '/api/dev/v1').replace(/\/+$/, '')

/** Monta a URL de um endpoint a partir do caminho declarado no contrato. */
export function apiUrl(caminho: string): string {
  return `${API_BASE}${caminho.startsWith('/') ? caminho : `/${caminho}`}`
}

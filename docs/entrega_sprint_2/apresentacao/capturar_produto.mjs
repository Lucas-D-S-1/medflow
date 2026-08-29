import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))

// O Playwright vive em `web/node_modules` do repositório do produto. Este
// arquivo existe em duas árvores — no repositório acadêmico, ao lado da
// entrega, e dentro do próprio medflow — e a distância até `web/` é diferente
// nas duas. Resolver em tempo de execução mantém as duas cópias idênticas.
const candidatosPlaywright = [
  resolve(aqui, '../../../medflow/web/node_modules/playwright/index.mjs'),
  resolve(aqui, '../../../web/node_modules/playwright/index.mjs'),
]
const caminhoPlaywright = candidatosPlaywright.find(existsSync)
if (!caminhoPlaywright) {
  throw new Error(
    'Playwright nao encontrado. Rode `make web-install` no medflow.\nProcurei em:\n  ' +
      candidatosPlaywright.join('\n  '),
  )
}
const { chromium } = await import(caminhoPlaywright)

// Capturas do produto publicado, para as evidências visuais da apresentação.
// O produto deixou de ser quatro visões: a análise é uma página contínua com
// território e hospital ancorados, e a Metodologia à parte.

const saida = resolve(aqui, 'capturas')
const base = (process.env.MEDFLOW_CAPTURE_BASE
  ?? 'https://lucas-d-s-1.github.io/medflow').replace(/\/+$/, '')

await mkdir(saida, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })

async function abrir(caminho, seletor) {
  await page.goto(`${base}${caminho}`, { waitUntil: 'domcontentloaded' })
  await page.locator(seletor).waitFor({ state: 'visible', timeout: 30_000 })
  await page.addStyleTag({ content: '.topbar { position: static !important; } .assistant-widget { display: none !important; }' })
  await page.waitForTimeout(1200)
}

async function recortar(seletor, nome) {
  await page.locator(seletor).first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.locator(seletor).first().screenshot({ path: resolve(saida, nome) })
}

// Território: o mapa é o que responde "onde olhar primeiro".
await abrir('/regional?competencia=2026-06&regiao=35073', '.regional-map-svg')
await page.screenshot({ path: resolve(saida, 'produto-abertura.png') })
await recortar('.map-panel', 'jornada-1-territorio.png')
await recortar('.regional-series-panel', 'jornada-2-serie.png')

// Hospital: a lista, a comparação com pares e as especialidades com o IPE.
await abrir(
  '/hospital?competencia=2026-06&regiao=35073&hospital=3012212',
  'section[aria-labelledby="hospital-specialty-title"]',
)
await recortar('section[aria-labelledby="hospital-list-title"]', 'jornada-3-hospitais.png')
await recortar('.hospital-peers', 'jornada-4-pares.png')
await recortar('section[aria-labelledby="hospital-specialty-title"]', 'jornada-5-especialidades.png')

// Metodologia: reconciliação e limites, que é o que sustenta o resto.
await abrir('/metodologia', '[data-testid="methodology-limits"]')
await recortar('.methodology-summary', 'metodologia-evidencia.png')

// FlowIA respondendo, com o contexto da tela.
await abrir('/regional?competencia=2026-06&regiao=35073', '.regional-map-svg')
await page.addStyleTag({ content: '.assistant-widget { display: block !important; }' })
await page.locator('.assistant-launcher').click()
await page.getByRole('button', { name: 'O que é IPH?' }).click()
await page.waitForTimeout(600)
await recortar('.assistant-panel', 'assistente-medflow.png')

await browser.close()
console.log('capturas gravadas em', saida)

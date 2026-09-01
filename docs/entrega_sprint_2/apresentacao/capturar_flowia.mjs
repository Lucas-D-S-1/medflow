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

// Uma pergunta real, feita no site publicado, para o slide da FlowIA.
//
// A pergunta é coloquial de propósito e não nomeia indicador, tabela nem
// corte: é o mesmo registro da bateria de avaliação. O que a captura precisa
// mostrar é a resposta com o SQL auditável ao lado — a prova de que a
// narrativa não é a fonte da verdade.
//
// Cada execução consome uma pergunta da cota diária do Select AI.

const saida = resolve(aqui, 'capturas')
const base = (process.env.MEDFLOW_CAPTURE_BASE
  ?? 'https://lucas-d-s-1.github.io/medflow').replace(/\/+$/, '')
const pergunta = process.env.MEDFLOW_PERGUNTA
  ?? 'o que mais interna nesse hospital?'

await mkdir(saida, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } })

page.on('console', (m) => { if (m.type() === 'error') console.error('  [console]', m.text()) })

// Esperar a tela terminar de carregar antes de abrir o assistente. O widget
// monta o contexto a partir do que a página já sabe, e perguntar cedo demais
// manda "competencia=nao informada" — foi o que produziu uma primeira captura
// com o mesmo hospital repetido cinco vezes, um por mês.
await page.goto(`${base}/?competencia=2026-06&regiao=35073&hospital=3012212#hospital`, {
  waitUntil: 'domcontentloaded',
})
const especialidades = page.locator('section[aria-labelledby="hospital-specialty-title"]')
await especialidades.waitFor({ state: 'visible', timeout: 60_000 })
await especialidades.scrollIntoViewIfNeeded()
await page.waitForTimeout(2000)

await page.getByRole('button', { name: /Posso ajudar/ }).waitFor({ timeout: 30_000 })
await page.getByRole('button', { name: /Posso ajudar/ }).click()

const painel = page.locator('#medflow-assistant-panel')
await painel.waitFor({ state: 'visible', timeout: 15_000 })

await page.getByLabel('Faça outra pergunta').fill(pergunta)
await page.getByRole('button', { name: 'Enviar pergunta' }).click()
console.log(`perguntado: ${pergunta}`)

// A resposta vem do Oracle e pode demorar: são duas gerações do modelo.
await painel.locator('.assistant-answer').first().waitFor({ timeout: 120_000 })
await page.waitForFunction(
  () => !document.querySelector('#medflow-assistant-panel .assistant-thinking'),
  { timeout: 120_000 },
)
await page.waitForTimeout(1500)

const texto = await painel.innerText()
console.log('\n--- painel ---\n' + texto + '\n--------------')

await painel.screenshot({ path: resolve(saida, 'flowia-ao-vivo.png') })
console.log('captura: capturas/flowia-ao-vivo.png')

const conversa = painel.locator('.assistant-conversation')
await conversa.screenshot({ path: resolve(saida, 'flowia-ao-vivo-conversa.png') })
console.log('captura: capturas/flowia-ao-vivo-conversa.png')

const detalhes = painel.locator('.assistant-answer details').first()
if (await detalhes.count()) {
  await detalhes.locator('summary').click()
  await page.waitForTimeout(300)
  await detalhes.screenshot({ path: resolve(saida, 'flowia-sql-auditavel.png') })
  console.log('captura: capturas/flowia-sql-auditavel.png')
}

await browser.close()

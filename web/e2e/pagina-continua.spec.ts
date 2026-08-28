/**
 * A página analítica contínua.
 *
 * As três etapas dividem um endereço só, o direcionador marca onde a leitura
 * está e os caminhos antigos continuam válidos como âncoras.
 */

import { expect, test } from '@playwright/test'
import { itens, mockLiveSource, regionalSnapshot, snapshotCompetencia } from './apoio'

test('reúne território, fluxos e hospital em uma página só', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto('/')

  await expect(page.locator('#regional')).toBeVisible()
  await expect(page.locator('#fluxos')).toHaveCount(1)
  await expect(page.locator('#hospital')).toHaveCount(1)
  // Uma investigação, um documento: nada de <main> por etapa.
  await expect(page.locator('main')).toHaveCount(1)
  // As perguntas saem dos títulos; a disposição dos dados é que as provoca.
  await expect(page.getByRole('heading', { name: /Onde devo investigar primeiro/ })).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: /A população é atendida no próprio território/ }),
  ).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /O que explica o sinal da região/ })).toHaveCount(0)
})

test('mantém válidos os caminhos antigos, com o recorte intacto', async ({ page }) => {
  await mockLiveSource(page)

  await page.goto(
    `/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212&elegiveis=0`,
  )

  await expect(page).toHaveURL(/#hospital$/)
  await expect(page).toHaveURL(/hospital=3012212/)
  await expect(page).toHaveURL(/elegiveis=0/)
  await expect(page.getByTestId('global-region')).toHaveValue('35073')
})

test('o direcionador marca a etapa escolhida sem trocar de tela', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto('/')

  await expect(page.getByTestId('anchor-regional')).toHaveAttribute('aria-current', 'true')

  await page.getByTestId('anchor-fluxos').click()
  await expect(page.getByTestId('anchor-fluxos')).toHaveAttribute('aria-current', 'true')
  await expect(page.getByTestId('anchor-regional')).not.toHaveAttribute('aria-current', 'true')
  // Continua sendo a mesma página: a etapa anterior não foi desmontada.
  await expect(page.locator('#regional')).toHaveCount(1)
})

test('abre a etapa territorial pelo comportamento sazonal do mês', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073`)

  const jundiai = itens(regionalSnapshot).find(
    (item) => item.region_code === '35073',
  ) as Record<string, number>
  const desvio = (jundiai.seasonality_index as number) - 1

  // JUNDIAI está dentro da faixa de ruído no recorte publicado, e o texto
  // precisa dizer isso em vez de anunciar um sinal que não existe.
  expect(Math.abs(desvio)).toBeLessThan(0.05)
  await expect(page.getByTestId('seasonal-headline')).toContainText(
    'dentro do que costuma ser',
  )
  await expect(page.getByTestId('seasonal-basis')).toContainText('na média do mesmo mês em')
  await expect(page.getByTestId('seasonal-basis')).toContainText('anos anteriores')
  await expect(page.getByTestId('seasonal-above-count')).toContainText('de 62 regiões')
})

test('leva ao território escolhido no destaque sazonal', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073`)

  // O alvo sai dos dados, não da ordem do DOM: a lista reordena quando a
  // competência termina de carregar, e ler o nome de um chip para clicar nele
  // logo depois deixava o teste dependendo dessa janela.
  const maisAcima = itens(regionalSnapshot)
    .filter((item) => item.seasonality_status === 'calculado')
    .sort(
      (left, right) =>
        (right.seasonality_index as number) - (left.seasonality_index as number),
    )[0] as Record<string, string | number>
  const nome = maisAcima.region_name as string

  // Espera o contexto estar destravado: em fallback a troca de território não
  // tem efeito, e clicar cedo demais media o nada.
  const chip = page.locator('.seasonal-highlights button', { hasText: nome })
  await expect(chip).toBeEnabled()
  await chip.click()

  await expect(page.getByTestId('regional-selected-name')).toHaveText(nome)
  await expect(page.getByTestId('seasonal-headline')).toContainText(
    'acima do que este mês costuma ser',
  )
})

test('o filtro de contexto sai da frente ao rolar; só o direcionador fica', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto('/')
  await expect(page.getByTestId('seasonal-basis')).toBeVisible()

  await page.mouse.wheel(0, 900)

  // O direcionador continua acessível: é ele que diz em que etapa a leitura
  // está, e some junto tornaria a marcação de etapa ativa inútil.
  await expect
    .poll(async () => Math.round((await page.locator('.topbar').boundingBox())?.y ?? -1))
    .toBe(0)

  // O filtro, que ocupava 188px dos 260px de chrome grudado, não cobre mais a
  // análise durante a leitura.
  await expect
    .poll(async () => {
      const caixa = await page.locator('.global-context-bar').boundingBox()
      return caixa === null || caixa.y + caixa.height <= 0
    })
    .toBe(true)
})

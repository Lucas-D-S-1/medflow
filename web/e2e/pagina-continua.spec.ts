/**
 * A página analítica contínua.
 *
 * As três etapas dividem um endereço só, o direcionador marca onde a leitura
 * está e os caminhos antigos continuam válidos como âncoras.
 */

import { expect, test } from '@playwright/test'
import { itens, mockLiveSource, pt, regionalSnapshot, snapshotCompetencia } from './apoio'

test('reúne território e hospital em uma página só', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto('/')

  await expect(page.locator('#regional')).toBeVisible()
  await expect(page.locator('#hospital')).toHaveCount(1)
  await expect(page.locator('#fluxos')).toHaveCount(0)
  // Uma investigação, um documento: nada de <main> por etapa.
  await expect(page.locator('main')).toHaveCount(1)
  // As perguntas saem dos títulos; a disposição dos dados é que as provoca.
  await expect(page.getByRole('heading', { name: /Onde devo investigar primeiro/ })).toHaveCount(0)
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

  await page.getByTestId('anchor-hospital').click()
  await expect(page.getByTestId('anchor-hospital')).toHaveAttribute('aria-current', 'true')
  await expect(page.getByTestId('anchor-regional')).not.toHaveAttribute('aria-current', 'true')
  // Continua sendo a mesma página: a etapa anterior não foi desmontada.
  await expect(page.locator('#regional')).toHaveCount(1)
})

// Saíram daqui os dois testes do painel de comportamento sazonal. O painel foi
// removido do produto por ser repetição: o índice sazonal já vive na série
// mensal, ao lado da curva que ele qualifica, e lá ele responde a pergunta que
// interessa — se o mês está pior ou se sempre foi assim neste mês. O motivo de
// não ser calculado continua coberto em `regional.spec.ts`.

test('o filtro rola junto com a página; só o direcionador fica fixo', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073`)
  // Espera a etapa territorial montada antes de medir a rolagem.
  await expect(page.getByTestId('regional-map-svg')).toBeVisible()

  const antes = (await page.locator('.global-context-bar').boundingBox())?.y ?? 0
  await page.mouse.wheel(0, 600)

  // O filtro ocupava 188px de chrome grudado e cobria a análise durante a
  // leitura. Agora ele vive no fluxo da página, depois do mapa.
  await expect
    .poll(async () => {
      const depois = (await page.locator('.global-context-bar').boundingBox())?.y ?? 0
      return antes - depois > 300
    })
    .toBe(true)

  // O direcionador continua acessível: é ele que diz em que etapa a leitura
  // está, e some junto tornaria a marcação de etapa ativa inútil.
  await expect
    .poll(async () => Math.round((await page.locator('.topbar').boundingBox())?.y ?? -1))
    .toBe(0)
})

test('abre em panorama, sem território eleito por padrão', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto('/')

  // O mapa compara as 62 regiões antes de qualquer filtro: escolher um
  // território é um ato do usuário, não um padrão herdado.
  await expect(page.locator('.regional-map-shape')).toHaveCount(62)
  await expect(page.getByTestId('regional-map-selection')).toContainText('Nenhuma região')
  await expect(page.getByTestId('global-region')).toHaveValue('')
  await expect(page.getByTestId('regional-selected-name')).toHaveCount(0)
  expect(new URL(page.url()).searchParams.get('regiao')).toBeNull()
})

test('o hover no mapa mostra os valores da região, e o clique propaga', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto('/')
  await expect(page.locator('.regional-map-shape')).toHaveCount(62)

  const alvo = page.getByTestId('regional-map-35073')
  await alvo.hover()
  const cartao = page.getByTestId('regional-map-tooltip')
  await expect(cartao).toContainText('JUNDIAI')
  await expect(cartao).toContainText('IPH estimado')
  await expect(cartao).toContainText('Internações novas')
  await expect(cartao).toContainText('MoM')

  await alvo.click()
  await expect(page).toHaveURL(/regiao=35073/)
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
  await expect(page.getByTestId('global-region')).toHaveValue('35073')
})

test('escolher pelo seletor abaixo do mapa vale o mesmo que clicar nele', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto('/')

  await page.getByTestId('global-region').selectOption('35073')
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')

  // E voltar ao panorama larga o território.
  await page.getByTestId('global-region').selectOption('')
  await expect(page.getByTestId('regional-selected-name')).toHaveCount(0)
  expect(new URL(page.url()).searchParams.get('regiao')).toBeNull()
})

test('o panorama mostra os totais do recorte, somados e não promediados', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}`)

  const regioes = itens(regionalSnapshot) as unknown as Record<string, number>[]
  const soma = (campo: string) => regioes.reduce((total, item) => total + item[campo], 0)

  await expect(page.getByTestId('state-total-admissions')).toContainText(
    pt(soma('new_admissions')),
  )

  // A razão é total sobre total. A média simples dos percentuais das 62
  // regiões dá outro número, porque trataria uma região de 4 mil internações
  // como igual a uma de 80 mil.
  const iphExato = (soma('estimated_patient_days') / soma('declared_capacity_bed_days')) * 100
  const iphMediaSimples =
    regioes.reduce((total, item) => total + item.iph_percent, 0) / regioes.length
  expect(Math.abs(iphExato - iphMediaSimples)).toBeGreaterThan(1)
  await expect(page.getByTestId('state-total-iph')).toContainText(`${pt(iphExato, 1)}%`)

  const tmhExato = (soma('deaths') / soma('new_admissions')) * 100
  await expect(page.getByTestId('state-total-tmh')).toContainText(`${pt(tmhExato, 1)}%`)

  // Atendimento no próprio território e atendimento fora dele repartem o mesmo
  // denominador: juntos fecham o total de residentes.
  const proprio = (soma('resident_admissions_in_own_region') / soma('resident_admissions_observed')) * 100
  const fora = (soma('observed_intrastate_evasion_admissions') / soma('resident_admissions_observed')) * 100
  expect(Math.round(proprio + fora)).toBe(100)
  await expect(page.getByTestId('state-total-own-region')).toContainText(`${pt(proprio, 1)}%`)
  await expect(page.getByTestId('state-total-evasion')).toContainText(`${pt(fora, 1)}%`)

  // O IPE agrega por contagem, não por média de medianas: uma região com 4
  // comparações não pode pesar o mesmo que uma com 243.
  const ipeAcima = (soma('ipe_above_reference') / soma('ipe_eligible_pairs')) * 100
  await expect(page.getByTestId('state-total-ipe')).toContainText(`${pt(ipeAcima, 1)}%`)
  // O testId fica no valor; a contagem que o sustenta mora no detalhe ao lado.
  await expect(page.getByTestId('state-total-ipe').locator('..')).toContainText(
    `${pt(soma('ipe_above_reference'))} de ${pt(soma('ipe_eligible_pairs'))}`,
  )

  await expect(page.getByTestId('state-totals-scope')).toContainText(pt(soma('population')))
})

test('clicar de novo na região selecionada volta ao panorama', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}`)

  const jundiai = page.getByTestId('regional-map-35073')
  await jundiai.click()
  await expect(page.getByTestId('regional-selected-name')).toHaveText('JUNDIAI')
  await expect(page.getByTestId('state-totals-scope')).toHaveCount(0)

  // O gesto que se tenta primeiro para desfazer é clicar de novo no mesmo
  // lugar, e não caçar o seletor abaixo do mapa.
  await jundiai.click()
  await expect(page.getByTestId('regional-selected-name')).toHaveCount(0)
  await expect(page.getByTestId('state-totals-scope')).toBeVisible()
  expect(new URL(page.url()).searchParams.get('regiao')).toBeNull()
})

test('o cartão do mapa fica no território escolhido, sem depender do ponteiro', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073`)

  const cartao = page.getByTestId('regional-map-tooltip')
  await expect(cartao).toContainText('JUNDIAI')
  await expect(cartao).toContainText('selecionada')

  // O ponteiro passa a servir para comparar outra região sem perder a escolha.
  await page.getByTestId('regional-map-35071').hover()
  await expect(cartao).toContainText('BRAGANCA')

  // E ao sair volta para a região escolhida, em vez de esvaziar.
  await page.mouse.move(2, 2)
  await expect(cartao).toContainText('JUNDIAI')
  await expect(cartao).toContainText('selecionada')
})

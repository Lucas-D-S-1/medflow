/**
 * Visão hospital e pares.
 *
 * O que explica o sinal e onde ele se concentra: lista, série,
 * especialidades e IPR por diagnóstico.
 */

import { expect, test } from '@playwright/test'
import {
  cidAsma,
  cidMaisFrequente,
  competenciaAnterior,
  contextoCid,
  especialidadeObstetricia,
  especialidadePediatria,
  hospitalDestacado,
  hospitalListSnapshot,
  hospitalSemAmostra,
  hospitalSeriesSnapshot,
  itens,
  linhaSerieHospital,
  mockLiveSource,
  paginacao,
  pt,
  regionalSnapshot,
  snapshotCompetencia,
  snapshotCompetenciaBR,
  totalInternacoesDoHospital,
} from './apoio'

/** O mesmo recorte que `HospitalSeries` mostra antes de expandir. */
const PREVIEW_SERIE = 6

test('lista hospitais da região, marca amostra e capacidade, e seleciona pela URL', async ({
  page,
}) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073`)

  await expect(page.getByTestId('hospital-count')).toHaveText(
    `${paginacao(hospitalListSnapshot).count} de ${paginacao(hospitalListSnapshot).count} hospitais`,
  )
  await expect(page.getByTestId('hospital-row-2786435')).toContainText('HCSVP HOSPITAL SAO VICENTE')
  await expect(page.getByTestId('hospital-row-2786435')).toContainText(pt(hospitalDestacado.new_admissions as number))
  await expect(page.getByTestId('hospital-row-2786435')).toContainText(`${pt(hospitalDestacado.iph_percent as number, 1)}%`)
  await expect(page.getByTestId('hospital-row-2786435')).toContainText(`${pt(hospitalDestacado.tmh_percent as number, 1)}%`)
  await expect(page.getByTestId('hospital-row-2786435')).toContainText(pt(hospitalDestacado.average_stay_days as number, 2))

  // IPH acima de 100% precisa vir com a ressalva, nunca como ocupação real.
  await expect(page.getByTestId('hospital-capacity-2786435')).toContainText(
    'acima da capacidade declarada',
  )
  await expect(page.getByText('não ocupação real acima do teto físico')).toBeVisible()

  const totalHospitais = paginacao(hospitalListSnapshot).count
  await expect(page.getByTestId('hospital-count')).toHaveText(
    `${totalHospitais} de ${totalHospitais} hospitais`,
  )

  await expect(page.getByTestId(`hospital-sample-${hospitalSemAmostra.cnes}`)).toContainText(
    'amostra insuficiente para comparação',
  )

  // Selecionar grava o CNES na URL sem perder o recorte.
  await page.getByTestId('hospital-select-3012212').click()
  await expect(page).toHaveURL(/hospital=3012212/)
  await expect(page).toHaveURL(new RegExp(`competencia=${snapshotCompetencia}`))
  await expect(page).toHaveURL(/regiao=35073/)
  await expect(page.getByTestId('hospital-select-3012212')).toHaveText('Selecionado')
})
test('busca hospital por alias, envia o termo na URL e mostra o território', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })
  await page.route('**/api/dev/v1/hospitais?**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    const regionCode = url.searchParams.get('regiao') ?? ''
    const busca = url.searchParams.get('busca')
    const payload = busca === 'Ermelino Matarazzo'
      ? {
          ...hospitalListSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: `${year}-${String(month).padStart(2, '0')}`,
          filters: { year, month, region_code: regionCode },
          pagination: { limit: 200, offset: 0, count: 1, has_more: false, order: 'new_admissions_desc' },
          items: [{
            ...hospitalDestacado,
            cnes: '2082829',
            hospital_name: 'HOSP MUN PROFESSOR DOUTOR ALIPIO CORREA NETTO',
            region_code: regionCode,
            district_code: '28',
            health_coordinator_code: '2',
            health_technical_supervision_code: '6',
          }],
        }
      : {
          ...hospitalListSnapshot,
          source: 'oracle-live',
          database_time: '2026-08-01T12:00:00-03:00',
          data_through: `${year}-${String(month).padStart(2, '0')}`,
          filters: { year, month, region_code: regionCode },
        }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) })
  })

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)
  await page.getByTestId('hospital-search').fill('Ermelino Matarazzo')

  await expect(page).toHaveURL(/busca=Ermelino(\+|%20)Matarazzo/)
  await expect(page).not.toHaveURL(/hospital=/)
  await expect(page.getByTestId('hospital-count')).toHaveText('1 de 1 hospitais')
  await expect(page.getByText('Distrito 28 · CRS 2 · STS 6')).toBeVisible()
})
test('hospital sem internação nova não exibe TMH, permanência nem CMI', async ({ page }) => {
  // Regra de produto, não fato do recorte. O teste antigo dependia de existir
  // um hospital com zero internações na competência da fixture; quando o
  // recorte avançou para 2026-06, JUNDIAI deixou de ter um e a regra ficaria
  // sem cobertura em silêncio. O caso agora é construído, então vale sempre.
  const vazio = {
    ...hospitalDestacado,
    cnes: '9999999',
    hospital_name: 'HOSPITAL SEM MOVIMENTO',
    new_admissions: 0,
    deaths: 0,
    patient_days_estimated: 0,
    tmh_percent: null,
    cmi_real: null,
    average_stay_days: null,
    iph_percent: null,
    sample_status: 'amostra_insuficiente',
    capacity_status: 'sem_leito_sus_declarado',
    above_declared_capacity: 0,
  }

  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })
  await page.route('**/api/dev/v1/hospitais?**', async (route) => {
    const itensComVazio = [...itens(hospitalListSnapshot), vazio]
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...hospitalListSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        pagination: {
          ...paginacao(hospitalListSnapshot),
          count: itensComVazio.length,
          has_more: false,
        },
        items: itensComVazio,
      }),
    })
  })

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073`)
  await expect(page.getByTestId('hospital-row-9999999')).toContainText(
    'sem internação nova na competência',
  )
})
test('abre a série mensal do hospital selecionado com denominadores e CMI nominal', async ({
  page,
}) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)

  await expect(page.getByTestId('serie-count')).toHaveText(
    `6 de ${paginacao(hospitalSeriesSnapshot).count} competências`,
  )
  await expect(page.getByTestId(`serie-row-${snapshotCompetencia}`)).toContainText(snapshotCompetenciaBR)
  await expect(page.getByTestId(`serie-row-${snapshotCompetencia}`)).toContainText(pt(linhaSerieHospital.new_admissions as number))
  await expect(page.getByTestId(`serie-row-${snapshotCompetencia}`)).toContainText(`${pt(linhaSerieHospital.iph_percent as number, 1)}%`)
  await expect(page.getByTestId(`serie-row-${snapshotCompetencia}`)).toContainText(
    `${pt(linhaSerieHospital.patient_days_estimated as number)} / ` +
      `${pt(linhaSerieHospital.declared_bed_days as number)} leito-dia`,
  )
  await expect(page.getByTestId(`serie-row-${snapshotCompetencia}`)).toContainText(pt(linhaSerieHospital.average_stay_days as number, 2))

  // CMI real e nominal divergem quando há correção de IPCA; ambos aparecem.
  await expect(page.getByTestId(`serie-row-${competenciaAnterior.competence}`)).toContainText(
    pt(competenciaAnterior.cmi_real as number, 2),
  )
  await expect(page.getByTestId('serie-row-2026-04')).toContainText('nominal')
  await expect(page.getByTestId(`serie-row-${competenciaAnterior.competence}`)).toContainText(
    pt(competenciaAnterior.cmi_nominal as number, 2),
  )

  await page
    .getByRole('button', {
      name: `Ver todas as ${paginacao(hospitalSeriesSnapshot).count} competências`,
    })
    .click()
  await expect(page.getByTestId('serie-count')).toHaveText(
    `${paginacao(hospitalSeriesSnapshot).count} de ${paginacao(hospitalSeriesSnapshot).count} competências`,
  )
  await expect(page.getByTestId('serie-row-2024-01')).toBeVisible()

  // A série inteira fica numa tabela só, que rola dentro de si. Antes as
  // competências além das seis primeiras iam para um segundo painel abaixo, e
  // a lista ficava partida em dois lugares.
  await expect(page.locator('.hospital-series-table')).toHaveCount(1)
  const rolagem = await page
    .locator('#hospital-series-rows')
    .evaluate((el) => {
      // O tsconfig das specs não carrega a lib DOM; o resto do arquivo também
      // descreve estruturalmente o que usa.
      const caixa = el as unknown as { clientHeight: number; scrollHeight: number }
      return { visivel: caixa.clientHeight, total: caixa.scrollHeight }
    })
  expect(rolagem.total).toBeGreaterThan(rolagem.visivel)

  // O IPE também na evolução mensal: a série responde "isso é de agora ou vem
  // de antes?", e sem ele o indicador novo só existia na foto do mês.
  await expect(page.getByTestId(`serie-ipe-${snapshotCompetencia}`)).toHaveText(
    pt(linhaSerieHospital.ipe_median as number, 2),
  )

  // Chegar no fim da lista não pode prender a página. O quadro tinha
  // `overscroll-behavior: contain`, e a rolagem parava ali: quem descia a
  // página ficava travado num quadro que nem parecia rolável.
  const caixa = page.locator('#hospital-series-rows')
  await caixa.scrollIntoViewIfNeeded()
  const quadro = await caixa.boundingBox()
  await page.mouse.move(quadro!.x + quadro!.width / 2, quadro!.y + 80)
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(50)
  }
  const interno = await caixa.evaluate((el) => {
    const c = el as unknown as { scrollTop: number; scrollHeight: number; clientHeight: number }
    return { fim: c.scrollTop >= c.scrollHeight - c.clientHeight - 2 }
  })
  expect(interno.fim).toBe(true)
  const paginaAntes = await page.evaluate(() => (globalThis as unknown as { scrollY: number }).scrollY)
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(50)
  }
  const paginaDepois = await page.evaluate(() => (globalThis as unknown as { scrollY: number }).scrollY)
  expect(paginaDepois).toBeGreaterThan(paginaAntes)

  // Ordenar vale para a série inteira, não só para a metade visível.
  await page.getByTestId('serie-sort-iph').click()
  const iphs = await page
    .locator('.hospital-series-table tbody tr td:nth-child(3) strong')
    .evaluateAll((celulas) =>
      (celulas as unknown as { textContent: string | null }[]).map((celula) =>
        Number((celula.textContent || '').replace('%', '').replace(',', '.')),
      ),
    )
  expect(iphs.length).toBeGreaterThan(PREVIEW_SERIE)
  expect([...iphs].sort((a, b) => b - a)).toEqual(iphs)
})
test('mostra o perfil por especialidade somando as internações do hospital', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)

  // O IPE também sobe de grão: a lista hospitalar mostra a mediana entre as
  // especialidades comparáveis do hospital, o mesmo índice um degrau acima.
  // Sem isso ele só existia dentro da tabela de especialidades.
  await expect(page.getByTestId(`hospital-ipe-${hospitalDestacado.cnes}`)).toHaveText(
    pt(hospitalDestacado.ipe_median as number, 2),
  )

  await expect(page.getByTestId('especialidade-count')).toHaveText('4 de 4 especialidades')
  await expect(page.getByTestId('especialidade-row-02')).toContainText('Obstetrícia')
  await expect(page.getByTestId('especialidade-row-02')).toContainText(
    pt(especialidadeObstetricia.new_admissions as number),
  )
  await expect(page.getByTestId('especialidade-row-02')).toContainText(
    pt(especialidadeObstetricia.average_stay_days as number, 2),
  )
  await expect(page.getByTestId('especialidade-row-07')).toContainText('Pediatria')
  await expect(page.getByTestId('especialidade-row-07')).toContainText(
    pt(especialidadePediatria.average_stay_days as number, 2),
  )
  // O IPE divide a permanência do hospital pela dos pares da região na mesma
  // especialidade: 5,11 dias contra 3,09 em sete hospitais dá 1,65.
  await expect(page.getByTestId('especialidade-ipe-07')).toHaveText(
    pt(especialidadePediatria.ipe as number, 2),
  )
  await expect(page.getByTestId('especialidade-row-07')).toContainText(
    `pares: ${pt(especialidadePediatria.average_stay_benchmark as number, 2)} em 7 hospitais`,
  )
  // Os dois cortes divergem nesta linha: 23 internações reprovam em TMH e CMI,
  // que exigem 30, e aprovam no IPE, que exige 20. O aviso diz de qual fala.
  await expect(page.getByTestId('especialidade-sample-03')).toContainText(
    'amostra insuficiente para TMH e CMI',
  )
  await expect(page.getByTestId('especialidade-ipe-03')).toBeVisible()
  // 322 + 300 + 258 + 23 = 903, o total do hospital na competência.
  await expect(
    page.getByText(
      `somam as ${pt(totalInternacoesDoHospital)} internações do hospital`,
    ),
  ).toBeVisible()
})
test('compara diagnósticos com pares elegíveis e explica quem não é elegível', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)

  // Referência regional visível junto da comparação.
  await expect(page.getByTestId('cid-reference')).toContainText(
    pt(contextoCid.hospital_eligible_combinations),
  )
  await expect(page.getByTestId('cid-reference')).toContainText(
    pt(contextoCid.region_ipr_median, 2),
  )
  await expect(page.getByTestId('cid-reference')).toContainText(
    `${pt(contextoCid.region_percent_above_reference, 1)}%`,
  )

  await expect(page.getByTestId('cid-row-O820')).toContainText('Parto por cesariana eletiva')
  await expect(page.getByTestId(`cid-row-${cidMaisFrequente.cid_code}`)).toContainText(
    pt(cidMaisFrequente.new_admissions as number),
  )
  await expect(page.getByTestId(`cid-row-${cidMaisFrequente.cid_code}`)).toContainText(
    pt(cidMaisFrequente.average_stay_hospital as number, 2),
  )
  await expect(page.getByTestId(`cid-row-${cidMaisFrequente.cid_code}`)).toContainText(
    pt(cidMaisFrequente.average_stay_benchmark as number, 2),
  )
  await expect(page.getByTestId(`cid-ipr-${cidMaisFrequente.cid_code}`)).toHaveText(
    pt(cidMaisFrequente.ipr as number, 2),
  )
  await expect(page.getByTestId(`cid-row-${cidAsma.cid_code}`)).toContainText(
    `${pt(cidAsma.benchmark_admissions as number)} internações em ` +
      `${pt(cidAsma.benchmark_hospitals as number)} hospitais`,
  )
  await expect(page.getByTestId(`cid-ipr-${cidAsma.cid_code}`)).toHaveText(
    pt(cidAsma.ipr as number, 2),
  )

  // A lista é truncada e diz isso.
  await expect(page.getByTestId('cid-truncado')).toContainText('10 diagnósticos de maior volume')
  await expect(page.getByTestId('cid-truncado')).toContainText(
    pt(contextoCid.hospital_eligible_combinations),
  )

  // O recorte de elegíveis continua na URL para links já compartilhados, mas
  // perdeu o controle próprio: a tabela já marca quem não tem IPR calculável.
  await expect(page.getByTestId('cid-eligible-toggle')).toHaveCount(0)
})
test('isola falha dos diagnósticos sem derrubar especialidades nem série', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })
  await page.route('**/api/dev/v1/hospitais/*/cids**', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)

  await expect(page.getByTestId('cid-error')).toContainText('Diagnósticos indisponíveis')
  await expect(page.getByTestId('especialidade-count')).toHaveText('4 de 4 especialidades')
  await expect(page.getByTestId('serie-count')).toHaveText(
    `6 de ${paginacao(hospitalSeriesSnapshot).count} competências`,
  )
  await expect(page.getByTestId('hospital-count')).toHaveText(
    `${paginacao(hospitalListSnapshot).count} de ${paginacao(hospitalListSnapshot).count} hospitais`,
  )
})
test('isola falha da série sem derrubar a lista de hospitais', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })
  await page.route('**/api/dev/v1/hospitais/*/serie**', async (route) => {
    await route.abort('connectionfailed')
  })

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)

  await expect(page.getByTestId('serie-error')).toContainText('Série do hospital indisponível')
  await expect(page.getByTestId('hospital-count')).toHaveText(
    `${paginacao(hospitalListSnapshot).count} de ${paginacao(hospitalListSnapshot).count} hospitais`,
  )
  await expect(page.getByTestId('source-badge')).toHaveCount(0)
})
test('trocar a região limpa o hospital selecionado da URL', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
      }),
    })
  })

  await page.goto(`/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`)
  await expect(page.getByTestId('hospital-select-3012212')).toHaveText('Selecionado')

  await page.getByTestId('global-region').selectOption('35011')
  await expect(page).not.toHaveURL(/hospital=/)
  await expect(page).toHaveURL(/regiao=35011/)
  await expect(page).toHaveURL(new RegExp(`competencia=${snapshotCompetencia}`))
})
test('distingue competência sem hospital publicado de falha do endpoint', async ({ page }) => {
  await mockLiveSource(page)
  await page.route('**/api/dev/v1/regioes/resumo**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...regionalSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { year, month, macroregion_code: null, region_code: null },
      }),
    })
  })
  await page.route('**/api/dev/v1/hospitais**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('ano'))
    const month = Number(url.searchParams.get('mes'))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...hospitalListSnapshot,
        source: 'oracle-live',
        database_time: '2026-08-01T12:00:00-03:00',
        data_through: `${year}-${String(month).padStart(2, '0')}`,
        filters: { year, month, region_code: '35073' },
        region: {
          region_code: '35073',
          region_name: null,
          macroregion_code: null,
          macroregion_name: null,
        },
        pagination: {
          limit: 200,
          offset: 0,
          count: 0,
          has_more: false,
          order: 'new_admissions_desc',
        },
        items: [],
      }),
    })
  })

  await page.goto('/hospital?competencia=2023-12&regiao=35073')

  await expect(page.getByTestId('hospital-absent-competence')).toContainText(
    'Competência sem hospitais publicados',
  )
  await expect(page.getByTestId('hospital-absent-competence')).toContainText('12/2023')
  await expect(page.getByTestId('hospital-list-error')).toHaveCount(0)
})

test('busca sem resultado preserva o campo para o usuário voltar atrás', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(`/?competencia=${snapshotCompetencia}&regiao=35073#hospital`)

  const campo = page.getByTestId('hospital-search')
  await expect(campo).toBeVisible()
  await campo.fill('zzzznaoexiste')

  // O campo carrega a própria saída: escondê-lo junto com a tabela deixava o
  // usuário sem como apagar o que digitou.
  await expect(page.getByTestId('hospital-empty')).toContainText('Nenhum hospital com esse termo')
  await expect(campo).toBeVisible()
  await expect(campo).toHaveValue('zzzznaoexiste')

  await campo.fill('')
  await expect(page.getByTestId('hospital-count')).toBeVisible()
})

test('a comparacao com pares diz o criterio, o porte e quem sao os pares', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(
    `/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=2701561`,
  )

  // O porte é a régua, e ela fica escrita. Antes um dos modos comparava por
  // região sem controlar porte, e isso punha um hospital de 876 leitos contra
  // um de 9 — o caso do Hospital de Base de São José do Rio Preto.
  const criterio = page.getByTestId('peer-criterio')
  await expect(criterio).toContainText('na faixa de até 24 leitos')
  await expect(criterio).toContainText('em JUNDIAI')
  await expect(page.getByTestId('peer-rebaixado')).toHaveCount(0)

  // Sem os nomes, a faixa é um número sobre um grupo invisível.
  await page.getByTestId('peer-lista').locator('summary').click()
  await expect(page.getByTestId('peer-lista').locator('li')).toHaveCount(5)
  await expect(page.getByTestId('peer-lista')).toContainText('HOSPITAL DA CRIANCA GRENDACC')
})

test('sem pares do mesmo porte na regiao, a regua sobe e a tela avisa', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(
    `/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=3012212`,
  )

  // Cair calado num grupo diferente do anunciado seria pior do que não
  // comparar: o número mudaria de significado sem avisar.
  await expect(page.getByTestId('peer-rebaixado')).toContainText('não há 3 hospitais')
  await expect(page.getByTestId('peer-criterio')).toContainText('no estado')
})

test('a participacao do hospital na regiao fica visivel', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto(
    `/hospital?competencia=${snapshotCompetencia}&regiao=35073&hospital=2786435`,
  )

  // Quem concentra a maior parte das internações não é um par entre iguais: é
  // a referência, e permanência maior é o esperado nesse papel.
  const total = itens(hospitalListSnapshot).reduce(
    (soma, item) => soma + (item.new_admissions as number),
    0,
  )
  const destaque = itens(hospitalListSnapshot).find(
    (item) => item.cnes === '2786435',
  ) as Record<string, number>
  const participacao = (destaque.new_admissions / total) * 100
  await expect(page.getByTestId('peer-participacao')).toContainText(
    `${pt(participacao, 1)}%`,
  )
})

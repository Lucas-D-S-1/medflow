/**
 * Regrava os dez snapshots de contingência a partir da API ao vivo.
 *
 * As fixtures existem para um caso só: quando o Oracle não responde, a tela
 * mostra dados versionados com selo explícito em vez de página vazia. Elas
 * foram feitas à mão a partir da resposta ao vivo, e isso era uma dívida
 * séria — snapshot escrito à mão continua passando nos testes depois que a
 * realidade mudou. Foi o que aconteceu: o recorte avançou para 2026-06 na
 * fatia 5b e as dez fixtures seguiram descrevendo 2026-05.
 *
 * Três coisas que este script faz de propósito:
 *
 * 1. **`source` vira `snapshot`.** A resposta ao vivo diz `oracle-live`; um
 *    snapshot que se declara ao vivo faria a tela mentir sobre a origem do
 *    número, que é justamente o que o produto se recusa a fazer.
 * 2. **`database_time` vira o carimbo da Gold**, não o horário do banco. O que
 *    importa num snapshot é de qual Gold ele veio, e há um teste que exige
 *    essa igualdade.
 * 3. **`links` sai.** É acrescentado pelo ORDS e não faz sentido offline.
 *
 * A competência não é escrita aqui: sai do manifesto da Bronze. Memorizá-la
 * neste arquivo recriaria a dívida que ele existe para pagar.
 *
 *   node scripts/gerar-mocks.ts             # regrava
 *   node scripts/gerar-mocks.ts --conferir  # não escreve; sai 1 se desatualizado
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ_WEB = join(AQUI, '..')
const RAIZ = join(RAIZ_WEB, '..')
const DIR_MOCKS = join(RAIZ_WEB, 'src', 'mocks')

/** O recorte que os snapshots retratam. Escolha de produto, não do dado. */
const REGIAO = '35073' // JUNDIAI
const HOSPITAL = '3012212'

type Envelope = Record<string, unknown>

interface Fixture {
  arquivo: string
  caminho: string
  parametros?: Record<string, string>
}

/**
 * O `limit` de cada snapshot tem de ser o mesmo que o cliente pede.
 *
 * Não é detalhe: os clientes validam `pagination.limit === o limite que eu
 * pedi` antes de aceitar a resposta, justamente para não renderizar uma página
 * de outro recorte. Gerar a fixture com outro limite a torna inválida, e a
 * tela cai para... nada, porque o snapshot é o próprio plano B.
 *
 * A fonte é o `options.limit ?? N` de cada cliente em `src/features/` e `src/lib/api/`. Se um deles
 * mudar, a suíte hermética acusa: o snapshot passa a ser rejeitado e o selo de
 * fonte muda na tela.
 */
const LIMITE_DO_CLIENTE: Record<string, string> = {
  'regioes/resumo': '62',
  serie: '100',
  padrao: '200',
}

function lerJson(caminho: string): Record<string, unknown> {
  return JSON.parse(readFileSync(caminho, 'utf8'))
}

/** A última competência comum de SIH/RD e CNES/LT, como `2026-06` e `{ano, mes}`. */
function competenciaCorrente(): { iso: string; ano: string; mes: string } {
  const manifesto = lerJson(join(RAIZ, 'data', 'bronze', 'MANIFESTO.json'))
  const recorte = manifesto.recorte as { ultima_competencia_comum: string }
  const bruta = recorte.ultima_competencia_comum
  const ano = bruta.slice(0, 4)
  const mes = bruta.slice(4)
  return { iso: `${ano}-${mes}`, ano, mes }
}

function carimboDaGold(): string {
  const metadados = lerJson(
    join(RAIZ, 'data', 'gold', 'qualidade', 'METADADOS.json'),
  )
  return metadados.gerado_em_utc as string
}

function planoDeFixtures(ano: string, mes: string): Fixture[] {
  const competencia = { ano, mes }
  return [
    { arquivo: 'status.json', caminho: 'status' },
    { arquivo: 'metodologia.json', caminho: 'metodologia' },
    {
      arquivo: 'regioes-resumo.json',
      caminho: 'regioes/resumo',
      parametros: { ...competencia, limit: LIMITE_DO_CLIENTE['regioes/resumo'] },
    },
    {
      arquivo: `regiao-serie-${REGIAO}.json`,
      caminho: `regioes/${REGIAO}/serie`,
      parametros: { limit: LIMITE_DO_CLIENTE.serie },
    },
    {
      arquivo: `fluxos-${REGIAO}.json`,
      caminho: 'fluxos',
      parametros: { ...competencia, origem: REGIAO, limit: LIMITE_DO_CLIENTE.padrao },
    },
    {
      arquivo: `icsap-${REGIAO}.json`,
      caminho: 'icsap',
      parametros: { ...competencia, regiao: REGIAO, limit: LIMITE_DO_CLIENTE.padrao },
    },
    {
      arquivo: `hospitais-${REGIAO}.json`,
      caminho: 'hospitais',
      parametros: { ...competencia, regiao: REGIAO, limit: LIMITE_DO_CLIENTE.padrao },
    },
    {
      arquivo: `hospital-serie-${HOSPITAL}.json`,
      caminho: `hospitais/${HOSPITAL}/serie`,
      parametros: { limit: LIMITE_DO_CLIENTE.padrao },
    },
    {
      arquivo: `hospital-especialidades-${HOSPITAL}.json`,
      caminho: `hospitais/${HOSPITAL}/especialidades`,
      parametros: { ...competencia, limit: LIMITE_DO_CLIENTE.padrao },
    },
    {
      arquivo: `hospital-cids-${HOSPITAL}.json`,
      caminho: `hospitais/${HOSPITAL}/cids`,
      // `elegivel=1` porque a tela abre com o recorte de elegíveis ligado, e o
      // cliente recusa a resposta se vier uma linha não-elegível com o filtro
      // ativo. Um snapshot com os 1.192 diagnósticos seria rejeitado sempre —
      // e o estado de contingência mostraria "Diagnósticos indisponíveis",
      // que é o oposto do que ele existe para fazer.
      parametros: { elegivel: '1', limit: LIMITE_DO_CLIENTE.padrao },
    },
  ]
}

async function buscar(base: string, fixture: Fixture): Promise<Envelope> {
  const url = new URL(`${base}/${fixture.caminho}`)
  for (const [chave, valor] of Object.entries(fixture.parametros ?? {})) {
    url.searchParams.set(chave, valor)
  }
  const resposta = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!resposta.ok) {
    throw new Error(`${fixture.caminho} devolveu ${resposta.status}`)
  }
  return (await resposta.json()) as Envelope
}

function paraSnapshot(corpo: Envelope, carimbo: string): Envelope {
  const { links: _descartado, ...resto } = corpo
  return { ...resto, source: 'snapshot', database_time: carimbo }
}

function serializar(corpo: Envelope): string {
  return `${JSON.stringify(corpo, null, 2)}\n`
}

async function principal(): Promise<number> {
  const conferir = process.argv.includes('--conferir')
  const base = (process.env.ORDS_BASE_URL ?? '').trim().replace(/\/$/, '')
  if (!base) {
    console.error('ORDS_BASE_URL não definida. Rode via `dotenv -f ../.env run --`.')
    return 2
  }
  // Mesmo padrão da reconciliação: dev por omissão, `ORDS_API_PATH=api/v1`
  // para gerar os snapshots a partir do módulo público.
  const caminhoDaApi = (process.env.ORDS_API_PATH ?? 'api/dev/v1')
    .trim()
    .replace(/^\/+|\/+$/g, '')

  const { iso, ano, mes } = competenciaCorrente()
  const carimbo = carimboDaGold()
  const plano = planoDeFixtures(ano, mes)
  mkdirSync(DIR_MOCKS, { recursive: true })

  console.log(`Gold de ${carimbo}, competência ${iso}, região ${REGIAO}, hospital ${HOSPITAL}`)

  const desatualizadas: string[] = []
  for (const fixture of plano) {
    const corpo = paraSnapshot(await buscar(`${base}/${caminhoDaApi}`, fixture), carimbo)
    const conteudo = serializar(corpo)
    const destino = join(DIR_MOCKS, fixture.arquivo)

    let anterior: string | null = null
    try {
      anterior = readFileSync(destino, 'utf8')
    } catch {
      anterior = null
    }
    if (anterior === conteudo) {
      console.log(`  = ${fixture.arquivo}`)
      continue
    }
    desatualizadas.push(fixture.arquivo)
    if (conferir) {
      console.log(`  ! ${fixture.arquivo} desatualizada`)
      continue
    }
    writeFileSync(destino, conteudo, 'utf8')
    console.log(`  ${anterior === null ? '+' : '~'} ${fixture.arquivo}`)
  }

  // Uma fixture que sobrou de um recorte anterior continuaria sendo importada
  // e nunca mais atualizada — é a mesma dívida com outro nome.
  const esperados = new Set(plano.map((f) => f.arquivo))
  const sobrando = readdirSync(DIR_MOCKS)
    .filter((nome) => nome.endsWith('.json') && !esperados.has(nome))
  if (sobrando.length) {
    console.error(`\nFixtures fora do plano, remova-as: ${sobrando.join(', ')}`)
    return 1
  }

  if (conferir && desatualizadas.length) {
    console.error(`\n${desatualizadas.length} fixture(s) desatualizada(s).`)
    return 1
  }
  console.log(desatualizadas.length ? '\nRegravadas.' : '\nJá estavam em dia.')
  return 0
}

principal().then(
  (codigo) => process.exit(codigo),
  (erro) => {
    console.error(erro)
    process.exit(1)
  },
)

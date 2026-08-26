/**
 * Rótulos de apresentação para as Redes Regionais de Atenção à Saúde (RRAS).
 *
 * O identificador oficial continua sendo RRAS 01–19. Os complementos abaixo
 * traduzem a composição observada no recorte publicado pelo MedFlow; não criam
 * uma divisão territorial e não são zonas ou coordenadorias municipais.
 */
const REGIONAL_NETWORK_ALIASES: Record<number, string> = {
  1: 'Grande ABC',
  2: 'Alto do Tietê',
  3: 'Franco da Rocha',
  4: 'Mananciais',
  5: 'Rota dos Bandeirantes',
  6: 'São Paulo',
  7: 'Baixada Santista e Vale do Ribeira',
  8: 'Sorocaba, Itapetininga e Itapeva',
  9: 'Bauru e região',
  10: 'Marília e região',
  11: 'Presidente Prudente e oeste paulista',
  12: 'São José do Rio Preto e noroeste paulista',
  13: 'Barretos, Franca e Ribeirão Preto',
  14: 'Piracicaba e região',
  15: 'Campinas e São João da Boa Vista',
  16: 'Bragança e Jundiaí',
  17: 'Vale do Paraíba e Litoral Norte',
  18: 'Araraquara e região',
  19: 'Araçatuba e região',
}

export function regionalNetworkNumber(name: string | null | undefined) {
  const match = name?.match(/(?:RRAS\s*)?(\d{1,2})/i)
  if (!match) return null
  const value = Number(match[1])
  return Number.isInteger(value) && value >= 1 && value <= 19 ? value : null
}

export function formatRegionalNetwork(name: string | null | undefined) {
  const number = regionalNetworkNumber(name)
  if (number === null) return name || 'Rede regional não informada'
  const alias = REGIONAL_NETWORK_ALIASES[number]
  const official = `Rede regional ${String(number).padStart(2, '0')}`
  return alias ? `${official} — ${alias}` : official
}

type SearchableHospital = {
  cnes: string
  hospital_name: string
}

export function normalizeHospitalSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Busca local sobre a lista canônica completa do recorte. */
export function filterHospitals<T extends SearchableHospital>(items: T[], query: string): T[] {
  const normalized = normalizeHospitalSearch(query)
  if (!normalized) return items
  const digits = query.replace(/\D/g, '')
  return items.filter((item) => {
    const nameMatches = normalizeHospitalSearch(item.hospital_name).includes(normalized)
    const cnesMatches = digits.length > 0 && item.cnes.includes(digits)
    return nameMatches || cnesMatches
  })
}

import { expect, test } from '@playwright/test'
import { filterHospitals, normalizeHospitalSearch } from '../src/features/hospital/hospitalSearch'

function hospital(cnes: string, name: string) {
  return { cnes, hospital_name: name }
}

const ITEMS = [
  hospital('3012212', 'HU Hospital Universitário'),
  hospital('2786435', 'HCSVP Hospital São Vicente'),
]

test('normaliza acentos, caixa e separadores sem alterar a lista de origem', () => {
  expect(normalizeHospitalSearch('  SÃO   Vicente ')).toBe('sao vicente')
  const original = [...ITEMS]
  expect(filterHospitals(ITEMS, 'hospital universitario').map((item) => item.cnes)).toEqual([
    '3012212',
  ])
  expect(ITEMS).toEqual(original)
})

test('busca trecho de nome e sequência parcial do CNES', () => {
  expect(filterHospitals(ITEMS, 'vicen').map((item) => item.cnes)).toEqual(['2786435'])
  expect(filterHospitals(ITEMS, '1221').map((item) => item.cnes)).toEqual(['3012212'])
  expect(filterHospitals(ITEMS, '301 2212').map((item) => item.cnes)).toEqual(['3012212'])
})

test('busca vazia devolve o mesmo universo e termo ausente devolve vazio', () => {
  expect(filterHospitals(ITEMS, '')).toBe(ITEMS)
  expect(filterHospitals(ITEMS, 'não existe')).toEqual([])
})

import { useMemo, useState } from 'react'

/**
 * Ordenação de tabela, com a mesma regra em todo o produto.
 *
 * A ordenação é do usuário porque a pergunta é dele: "pior IPH" e "menor
 * permanência" são recortes diferentes do mesmo dado, e nenhum é o padrão certo
 * para todo mundo.
 *
 * Valor ausente vai para o fim em qualquer direção. Ausência não é o menor
 * valor — ordenar crescente por um indicador não pode encher a primeira tela de
 * "não calculado", que é justamente o que não se quer olhar.
 */

export type SortableColumn<Row> = {
  id: string
  label: string
  /** Cabeçalho secundário, para dizer o que a coluna não é. */
  hint?: string
  numeric: boolean
  value: (row: Row) => number | string | null
}

export function useSortableRows<Row>(
  rows: Row[],
  columns: SortableColumn<Row>[],
  initial: string,
  tiebreak: (row: Row) => string,
) {
  const [sortBy, setSortBy] = useState(initial)
  const [descending, setDescending] = useState(
    columns.find((column) => column.id === initial)?.numeric ?? true,
  )
  const column = columns.find((candidate) => candidate.id === sortBy) ?? columns[0]

  const sorted = useMemo(() => {
    const direction = descending ? -1 : 1
    return [...rows].sort((left, right) => {
      const a = column.value(left)
      const b = column.value(right)
      if (a === null && b === null) return tiebreak(left).localeCompare(tiebreak(right), 'pt-BR')
      if (a === null) return 1
      if (b === null) return -1
      if (typeof a === 'string' || typeof b === 'string') {
        return String(a).localeCompare(String(b), 'pt-BR') * direction
      }
      return (a - b) * direction || tiebreak(left).localeCompare(tiebreak(right), 'pt-BR')
    })
  }, [column, descending, rows, tiebreak])

  function toggleSort(id: string) {
    if (id === sortBy) {
      setDescending((current) => !current)
      return
    }
    setSortBy(id)
    // Texto começa de A a Z; número começa pelo maior, que é onde mora a
    // pergunta de quem está priorizando.
    setDescending(columns.find((candidate) => candidate.id === id)?.numeric ?? true)
  }

  return { sorted, sortBy, descending, toggleSort }
}

export function SortableHeader<Row>({
  columns,
  sortBy,
  descending,
  onToggle,
  testIdPrefix,
}: {
  columns: SortableColumn<Row>[]
  sortBy: string
  descending: boolean
  onToggle: (id: string) => void
  testIdPrefix: string
}) {
  return (
    <tr>
      {columns.map((column) => (
        <th
          key={column.id}
          scope="col"
          aria-sort={sortBy === column.id ? (descending ? 'descending' : 'ascending') : 'none'}
        >
          <button
            type="button"
            className="hospital-sort"
            onClick={() => onToggle(column.id)}
            data-testid={`${testIdPrefix}-${column.id}`}
            title={
              sortBy === column.id && descending
                ? 'Ordenar do menor para o maior'
                : 'Ordenar do maior para o menor'
            }
          >
            {column.label}
            <span aria-hidden="true">
              {sortBy === column.id ? (descending ? '↓' : '↑') : '↕'}
            </span>
          </button>
          {column.hint && <small>{column.hint}</small>}
        </th>
      ))}
    </tr>
  )
}

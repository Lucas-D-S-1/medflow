import { useEffect, useMemo, useRef, useState } from 'react'
import type { HospitalItem, HospitalListResponse } from './hospitais'
import StatePanel from '../../shared/StatePanel'
import { formatCurrency, formatDecimal, formatInteger, formatPercent } from '../../shared/format'

type ColumnId = 'hospital' | 'admissions' | 'iph' | 'tmh' | 'stay' | 'cmi' | 'ipe'

/**
 * A ordenação é do usuário porque a pergunta é dele. "Pior IPH" e "menor
 * permanência" são recortes diferentes do mesmo dado, e nenhum dos dois é o
 * padrão certo para todo mundo.
 */
const COLUMNS: {
  id: ColumnId
  label: string
  numeric: boolean
  value: (item: HospitalItem) => number | string | null
}[] = [
  { id: 'hospital', label: 'Hospital', numeric: false, value: (item) => item.hospital_name },
  { id: 'admissions', label: 'Internações', numeric: true, value: (item) => item.new_admissions },
  { id: 'iph', label: 'Pressão sobre leitos (IPH)', numeric: true, value: (item) => item.iph_percent },
  { id: 'tmh', label: 'Mortalidade observada (TMH)', numeric: true, value: (item) => item.tmh_percent },
  { id: 'stay', label: 'Permanência média', numeric: true, value: (item) => item.average_stay_days },
  { id: 'cmi', label: 'Custo médio por internação (CMI real)', numeric: true, value: (item) => item.cmi_real },
  // A mediana entre as especialidades comparáveis do hospital. Ordenar por ela
  // responde "quem fica mais tempo que os pares", que é outra pergunta que
  // nenhuma das colunas acima respondia.
  { id: 'ipe', label: 'Permanência ante os pares (IPE)', numeric: true, value: (item) => item.ipe_median },
]

/**
 * Motivo pelo qual um indicador não pôde ser calculado, dito com as palavras do
 * contrato. Nunca inventar um número no lugar.
 */
function motivoAusencia(item: HospitalItem, campo: 'iph' | 'derivado') {
  if (campo === 'iph' && item.capacity_status === 'sem_leito_sus_declarado') {
    return 'sem leito SUS declarado'
  }
  if (campo === 'derivado' && item.new_admissions === 0) {
    return 'sem internação nova na competência'
  }
  return 'não calculado'
}

function Valor({
  valor,
  formatar,
  motivo,
}: {
  valor: number | null
  formatar: (n: number) => string
  motivo: string
}) {
  if (valor === null) return <em className="valor-ausente">{motivo}</em>
  return <strong>{formatar(valor)}</strong>
}

export default function HospitalTable({
  data,
  selectedCnes,
  onSelect,
  search,
  onSearchChange,
  searchDisabled,
}: {
  data: HospitalListResponse
  selectedCnes: string
  onSelect: (cnes: string) => void
  search: string
  onSearchChange: (value: string) => void
  searchDisabled: boolean
}) {
  // O campo escreve em estado local e só depois na URL. Controlado direto pela
  // URL, cada tecla disparava uma navegação do router e o input re-renderizava
  // com o valor anterior no meio da digitação: digitar "butanta" deixava "u".
  const [draft, setDraft] = useState(search)
  const pushed = useRef(search)

  // Mudança vinda de fora — a busca rápida do topo, um link colado — reposiciona
  // o campo. Mudança que este componente acabou de empurrar, não.
  useEffect(() => {
    if (search !== pushed.current) {
      pushed.current = search
      setDraft(search)
    }
  }, [search])

  useEffect(() => {
    if (draft === pushed.current) return
    const timer = window.setTimeout(() => {
      pushed.current = draft
      onSearchChange(draft)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [draft, onSearchChange])

  const [sortBy, setSortBy] = useState<ColumnId>('admissions')
  const [descending, setDescending] = useState(true)

  const column = COLUMNS.find((candidate) => candidate.id === sortBy) as (typeof COLUMNS)[number]
  const items = useMemo(() => {
    const direction = descending ? -1 : 1
    return [...data.items].sort((left, right) => {
      const a = column.value(left)
      const b = column.value(right)
      // Indicador não calculado vai para o fim em qualquer direção: ausência
      // não é o menor valor, é ausência de comparação.
      if (a === null && b === null) return left.hospital_name.localeCompare(right.hospital_name, 'pt-BR')
      if (a === null) return 1
      if (b === null) return -1
      if (typeof a === 'string' || typeof b === 'string') {
        return String(a).localeCompare(String(b), 'pt-BR') * direction
      }
      return (a - b) * direction || left.hospital_name.localeCompare(right.hospital_name, 'pt-BR')
    })
  }, [column, data.items, descending])

  function toggleSort(id: ColumnId) {
    if (id === sortBy) {
      setDescending((current) => !current)
      return
    }
    setSortBy(id)
    setDescending(COLUMNS.find((candidate) => candidate.id === id)?.numeric ?? true)
  }

  // A lista completa vira dois blocos em vez de uma tabela só. Uma seção única
  // com todos os hospitais passa de metade da altura da página em telas
  // estreitas, que é o limite que esta interface se impôs.
  function renderTable(items: HospitalItem[], label: string) {
    return (
      <div className="hospital-table-wrap rolagem-interna">
        <table className="hospital-table" aria-label={label}>
          <thead>
            <tr>
              {COLUMNS.map((item) => (
                <th
                  key={item.id}
                  scope="col"
                  aria-sort={sortBy === item.id ? (descending ? 'descending' : 'ascending') : 'none'}
                >
                  <button
                    type="button"
                    className="hospital-sort"
                    onClick={() => toggleSort(item.id)}
                    data-testid={`hospital-sort-${item.id}`}
                    title={
                      sortBy === item.id && descending
                        ? 'Ordenar do menor para o maior'
                        : 'Ordenar do maior para o menor'
                    }
                  >
                    {item.label}
                    <span aria-hidden="true">
                      {sortBy === item.id ? (descending ? '↓' : '↑') : '↕'}
                    </span>
                  </button>
                </th>
              ))}
              <th scope="col">Ação</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.cnes}
                className={item.cnes === selectedCnes ? 'hospital-selected' : undefined}
                data-testid={`hospital-row-${item.cnes}`}
              >
                <td data-label="Hospital">
                  <strong>{item.hospital_name}</strong>
                  <small>
                    CNES {item.cnes} · {item.unit_type_name} ·{' '}
                    {formatInteger(item.sus_beds)} leitos SUS
                  </small>
                  {item.district_code && (
                    <small>
                      Distrito {item.district_code} · CRS {item.health_coordinator_code ?? '—'} · STS{' '}
                      {item.health_technical_supervision_code ?? '—'}
                    </small>
                  )}
                  {item.sample_status === 'amostra_insuficiente' && (
                    <small className="marca-amostra" data-testid={`hospital-sample-${item.cnes}`}>
                      amostra insuficiente para comparação
                    </small>
                  )}
                </td>
                <td data-label="Internações">
                  <strong>{formatInteger(item.new_admissions)}</strong>
                  <small>{formatInteger(item.deaths)} óbitos</small>
                </td>
                <td data-label="IPH estimado">
                  <Valor
                    valor={item.iph_percent}
                    formatar={formatPercent}
                    motivo={motivoAusencia(item, 'iph')}
                  />
                  {item.above_declared_capacity === 1 && (
                    <small
                      className="marca-capacidade"
                      data-testid={`hospital-capacity-${item.cnes}`}
                    >
                      acima da capacidade declarada
                    </small>
                  )}
                </td>
                <td data-label="TMH">
                  <Valor
                    valor={item.tmh_percent}
                    formatar={formatPercent}
                    motivo={motivoAusencia(item, 'derivado')}
                  />
                </td>
                <td data-label="Permanência média">
                  <Valor
                    valor={item.average_stay_days}
                    formatar={formatDecimal}
                    motivo={motivoAusencia(item, 'derivado')}
                  />
                </td>
                <td data-label="CMI real">
                  <Valor
                    valor={item.cmi_real}
                    formatar={formatCurrency}
                    motivo={motivoAusencia(item, 'derivado')}
                  />
                </td>
                <td data-label="IPE">
                  {item.ipe_median === null ? (
                    <em className="valor-ausente">sem especialidade comparável</em>
                  ) : (
                    <>
                      <strong data-testid={`hospital-ipe-${item.cnes}`}>
                        {formatDecimal(item.ipe_median)}
                      </strong>
                      <small>
                        {formatInteger(item.ipe_above_reference)} de{' '}
                        {formatInteger(item.ipe_eligible_specialties)} acima dos pares
                      </small>
                    </>
                  )}
                </td>
                <td data-label="Ação">
                  <button
                    type="button"
                    className="secondary-action compacta"
                    aria-pressed={item.cnes === selectedCnes}
                    data-testid={`hospital-select-${item.cnes}`}
                    onClick={() => onSelect(item.cnes)}
                  >
                    {item.cnes === selectedCnes ? 'Selecionado' : 'Abrir'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="hospital-panel" aria-labelledby="hospital-list-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">HOSPITAIS DA REGIÃO</p>
          <h2 id="hospital-list-title">{data.region.region_name}</h2>
          <p>
            Ordene por qualquer indicador para achar o extremo que interessa.
            Selecione um hospital para abrir a série, o perfil por especialidade
            e a comparação por diagnóstico.
          </p>
        </div>
        <div className="hospital-list-tools">
          <label className="hospital-inline-search">
            <span>Filtrar</span>
            <input
              type="search"
              value={draft}
              minLength={2}
              maxLength={120}
              placeholder="Nome ou alias"
              disabled={searchDisabled}
              data-testid="hospital-search"
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <strong data-testid="hospital-count">
            {formatInteger(items.length)} de {formatInteger(data.pagination.count)} hospitais
          </strong>
        </div>
      </div>

      {/* A lista vem inteira e rola dentro de si: nenhuma seção pode ocupar
          mais que metade da altura da página, e paginar em dois blocos
          escondia justamente os extremos que a ordenação existe para achar. */}
      {items.length === 0 ? (
        <StatePanel
          kind="empty"
          title={search ? 'Nenhum hospital com esse termo' : 'Nenhum hospital no recorte'}
          testId="hospital-empty"
        >
          {search
            ? `A busca por "${search}" não encontrou hospital por nome ou alias nesta região e competência. Limpe o campo acima para ver a lista inteira.`
            : 'A fonte respondeu normalmente, mas não observou hospital com produção nessa região e competência.'}
        </StatePanel>
      ) : (
        renderTable(items, 'Hospitais da região')
      )}
    </section>
  )
}

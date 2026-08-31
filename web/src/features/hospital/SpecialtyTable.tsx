import type { SpecialtyItem, SpecialtyResponse } from './hospitalEspecialidades'
import {
  SortableHeader,
  useSortableRows,
  type SortableColumn,
} from '../../shared/useSortableRows'
import { formatCurrency, formatDecimal, formatInteger, formatPercent, formatPeriod } from '../../shared/format'

function Valor({
  valor,
  formatar,
  ausencia,
}: {
  valor: number | null
  formatar: (n: number) => string
  ausencia: string
}) {
  if (valor === null) return <em className="valor-ausente">{ausencia}</em>
  return <strong>{formatar(valor)}</strong>
}

function ausencia(item: SpecialtyItem) {
  return item.new_admissions === 0 ? 'sem internação nova' : 'não calculado'
}

// O IPE tem cortes próprios, diferentes dos de TMH e CMI. Quando ele não é
// calculável, a tela diz qual das duas coisas faltou em vez de mostrar vazio.
const MOTIVO_INELEGIVEL: Record<Exclude<SpecialtyItem['ipe_sample_status'], 'suficiente'>, string> = {
  amostra_insuficiente: 'amostra insuficiente para comparar',
  // Há hospital par na região; o que falta é permanência registrada neles.
  benchmark_zero: 'pares sem permanência registrada',
}

/**
 * Quanto das internações da região naquela especialidade passa por este
 * hospital, na competência aberta.
 *
 * O denominador não é cálculo novo: `benchmark_admissions` são as internações
 * dos **demais** hospitais da região na mesma especialidade e competência, e
 * este hospital está fora dele por construção — é assim que a Gold monta o
 * benchmark do IPE. Somar os dois devolve o total da região, o mesmo que a
 * carga agrupa antes de subtrair o próprio hospital. Nenhum número é digitado
 * aqui: é a divisão de dois campos já publicados no contrato, o que mantém a
 * coluna verdadeira também em contingência, onde não há Oracle para consultar.
 *
 * Concentração não é qualidade nem capacidade instalada: diz onde o volume da
 * especialidade se acumula, e é aí que a investigação começa.
 */
function participacaoRegional(item: SpecialtyItem): number | null {
  const regiao = item.new_admissions + item.benchmark_admissions
  return regiao > 0 ? (item.new_admissions / regiao) * 100 : null
}

const COLUMNS: SortableColumn<SpecialtyItem>[] = [
  { id: 'especialidade', label: 'Especialidade', numeric: false, value: (item) => item.specialty_name },
  { id: 'internacoes', label: 'Internações', numeric: true, value: (item) => item.new_admissions },
  {
    id: 'participacao',
    label: 'Participação na região',
    hint: 'concentração, não qualidade',
    numeric: true,
    value: participacaoRegional,
  },
  {
    id: 'tmh',
    label: 'Mortalidade observada (TMH)',
    hint: 'sem ajuste de risco',
    numeric: true,
    value: (item) => item.tmh_percent,
  },
  { id: 'permanencia', label: 'Permanência média', numeric: true, value: (item) => item.average_stay_days },
  {
    id: 'cmi',
    label: 'Custo médio por internação (CMI real)',
    numeric: true,
    value: (item) => item.cmi_real,
  },
  {
    id: 'ipe',
    label: 'Permanência ante os pares (IPE)',
    hint: 'não é nota de qualidade',
    numeric: true,
    value: (item) => item.ipe,
  },
]

export default function SpecialtyTable({ data }: { data: SpecialtyResponse }) {
  const { sorted, sortBy, descending, toggleSort } = useSortableRows(
    data.items,
    COLUMNS,
    'internacoes',
    (item) => item.specialty_name,
  )

  return (
    <section className="hospital-panel" aria-labelledby="hospital-specialty-title">
      <div className="block-heading">
        <div>
          <p className="section-kicker">PERFIL POR ESPECIALIDADE</p>
          <h2 id="hospital-specialty-title">
            Especialidades em {formatPeriod(data.data_through)}
          </h2>
          <p>
            Ordene por qualquer indicador. As especialidades somam as{' '}
            {formatInteger(data.hospital.new_admissions_total)} internações do hospital na
            competência; especialidade com amostra insuficiente não é comparável. A
            participação compara essas internações com as da região inteira na mesma
            especialidade — é onde o volume se concentra, não uma medida de qualidade
            nem de capacidade instalada. O
            IPE divide a permanência média do hospital pela dos demais hospitais da
            mesma região na mesma especialidade, com o próprio hospital fora do
            benchmark: acima de 1 é permanência maior que a dos pares.
          </p>
        </div>
        <strong data-testid="especialidade-count">
          {formatInteger(data.items.length)} de {formatInteger(data.pagination.count)}{' '}
          especialidades
        </strong>
      </div>

      <div className="hospital-table-wrap">
        <table
          className="hospital-table hospital-specialty-table"
          aria-label="Especialidades do hospital por internações novas"
        >
          <thead>
            <SortableHeader
              columns={COLUMNS}
              sortBy={sortBy}
              descending={descending}
              onToggle={toggleSort}
              testIdPrefix="especialidade-sort"
            />
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.specialty_code} data-testid={`especialidade-row-${item.specialty_code}`}>
                <td data-label="Especialidade">
                  <strong>{item.specialty_name}</strong>
                  <small>código {item.specialty_code}</small>
                  {/*
                    O corte de TMH e CMI exige 30 internações; o do IPE exige 20.
                    Os dois divergem na mesma linha, então o aviso precisa dizer
                    de qual indicador ele fala: sem isso a tela anunciaria
                    "amostra insuficiente" ao lado de um IPE publicado.
                  */}
                  {item.sample_status === 'amostra_insuficiente' && (
                    <small
                      className="marca-amostra"
                      data-testid={`especialidade-sample-${item.specialty_code}`}
                    >
                      amostra insuficiente para TMH e CMI
                    </small>
                  )}
                </td>
                <td data-label="Internações">
                  <strong>{formatInteger(item.new_admissions)}</strong>
                  <small>
                    {formatInteger(item.deaths)} óbitos ·{' '}
                    {formatInteger(item.stay_days_total)} dias
                  </small>
                </td>
                <td
                  data-label="Participação na região"
                  data-testid={`especialidade-participacao-${item.specialty_code}`}
                >
                  <Valor
                    valor={participacaoRegional(item)}
                    formatar={formatPercent}
                    ausencia="sem internação na região"
                  />
                  {item.new_admissions + item.benchmark_admissions > 0 && (
                    <small>
                      {formatInteger(item.new_admissions + item.benchmark_admissions)} na região ·{' '}
                      {item.benchmark_hospitals === 0
                        ? 'único hospital com a especialidade'
                        : `${formatInteger(item.benchmark_hospitals + 1)} hospitais`}
                    </small>
                  )}
                </td>
                <td data-label="TMH">
                  <Valor valor={item.tmh_percent} formatar={formatPercent} ausencia={ausencia(item)} />
                </td>
                <td data-label="Permanência média">
                  <Valor
                    valor={item.average_stay_days}
                    formatar={formatDecimal}
                    ausencia={ausencia(item)}
                  />
                  {item.benchmark_hospitals > 0 && (
                    <small>
                      pares: {formatDecimal(item.average_stay_benchmark ?? 0)} em{' '}
                      {formatInteger(item.benchmark_hospitals)} hospitais
                    </small>
                  )}
                </td>
                <td data-label="CMI real">
                  <Valor valor={item.cmi_real} formatar={formatCurrency} ausencia={ausencia(item)} />
                </td>
                <td data-label="IPE">
                  {item.ipe === null ? (
                    <em
                      className="valor-ausente"
                      data-testid={`especialidade-inelegivel-${item.specialty_code}`}
                    >
                      {MOTIVO_INELEGIVEL[
                        item.ipe_sample_status as keyof typeof MOTIVO_INELEGIVEL
                      ]}
                    </em>
                  ) : (
                    <strong data-testid={`especialidade-ipe-${item.specialty_code}`}>
                      {formatDecimal(item.ipe)}
                    </strong>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

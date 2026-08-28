import { useEffect, useMemo, useRef, useState } from 'react'
import { formatPeriod } from './format'
import './CompetencePicker.css'

const MONTHS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

type CompetencePickerProps = {
  value: string
  /** Primeira e última competências publicadas, inclusive. */
  min: string
  max: string
  disabled: boolean
  onChange: (competence: string) => void
}

function toIndex(competence: string) {
  const [year, month] = competence.split('-').map(Number)
  return year * 12 + (month - 1)
}

function fromParts(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/**
 * Seletor de competência que só oferece o que existe.
 *
 * O `input type="month"` do navegador rotulava o mês em inglês, ignorava o
 * idioma da página e deixava o usuário tentar meses que a Gold não publicou.
 * Aqui o recorte é visível: mês fora do publicado aparece desabilitado, em vez
 * de aceitar o clique e devolver uma tela vazia.
 */
export default function CompetencePicker({
  value,
  min,
  max,
  disabled,
  onChange,
}: CompetencePickerProps) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => Number(value.slice(0, 4)) || Number(max.slice(0, 4)))
  const container = useRef<HTMLDivElement>(null)

  const bounds = useMemo(() => ({ min: toIndex(min), max: toIndex(max) }), [max, min])
  const firstYear = Number(min.slice(0, 4))
  const lastYear = Number(max.slice(0, 4))

  useEffect(() => {
    if (!open) setYear(Number(value.slice(0, 4)) || lastYear)
  }, [lastYear, open, value])

  // Fechar ao clicar fora e no Escape: um painel que só fecha pelo próprio
  // botão prende o usuário que já mudou de ideia.
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="competence-picker" ref={container}>
      <button
        type="button"
        className="competence-trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="global-competence"
        data-value={value}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value ? formatPeriod(value) : '—'}</span>
        <small aria-hidden="true">▾</small>
      </button>

      {open && (
        <div className="competence-panel" role="dialog" aria-label="Escolher competência">
          <div className="competence-years">
            <button
              type="button"
              disabled={year <= firstYear}
              onClick={() => setYear((current) => current - 1)}
              aria-label="Ano anterior"
            >
              ‹
            </button>
            <strong data-testid="competence-year">{year}</strong>
            <button
              type="button"
              disabled={year >= lastYear}
              onClick={() => setYear((current) => current + 1)}
              aria-label="Próximo ano"
            >
              ›
            </button>
          </div>

          <div className="competence-months">
            {MONTHS.map((label, index) => {
              const competence = fromParts(year, index)
              const position = toIndex(competence)
              const available = position >= bounds.min && position <= bounds.max
              return (
                <button
                  key={label}
                  type="button"
                  disabled={!available}
                  aria-current={competence === value ? 'true' : undefined}
                  data-testid={`competence-month-${index + 1}`}
                  onClick={() => {
                    onChange(competence)
                    setOpen(false)
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <p className="competence-range">
            Publicado de {formatPeriod(min)} a {formatPeriod(max)}
          </p>
        </div>
      )}
    </div>
  )
}

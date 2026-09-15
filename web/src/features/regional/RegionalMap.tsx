import { useMemo, useRef, useState } from 'react'
import regionalMapAsset from '../../../../data/gold/geografia/mapa_regiao_saude_sp.geojson?raw'
import type { RegionalSummaryItem } from '../../lib/api/regioes'
import type { RegionSignals } from './sinais'
import { SIGNALS, signalLabel } from './sinais'

type Position = [number, number]
type Polygon = Position[][]
type MapGeometry =
  | { type: 'Polygon'; coordinates: Polygon }
  | { type: 'MultiPolygon'; coordinates: Polygon[] }
type MapFeature = {
  type: 'Feature'
  id: string
  properties: { cd_regiao_saude: string; nm_regiao_saude: string }
  geometry: MapGeometry
}
type MapFeatureCollection = { type: 'FeatureCollection'; features: MapFeature[] }

type RegionalMapProps = {
  items: RegionalSummaryItem[]
  selectedRegionCode: string
  selectedMacroregionCode: string
  onSelect: (regionCode: string) => void
  formatInteger: (value: number) => string
  formatPercent: (value: number) => string
  /** Região sob o ponteiro ou o foco, controlada de fora para que o mapa e a
   *  tabela comparativa se destaquem mutuamente. */
  hoveredCode?: string
  onHoverChange?: (regionCode: string) => void
  /** Sinais acesos e variações por região, para o cartão de valores. */
  signals?: Map<string, RegionSignals>
  /** O que a cor representa. O placar de sinais consome os seis indicadores;
   *  o IPH é um deles isolado. */
  colorBy?: 'iph' | 'sinais'
  variations?: Map<string, { mom: number | null; yoy: number | null }>
  competence: string
  comparisonPeriods: { previous: string; yearAgo: string }
  onAskLocal: (question: string) => void
  onViewHospitals: () => void
}

const mapData = JSON.parse(regionalMapAsset) as MapFeatureCollection
const SIGNAL_TOTAL = SIGNALS.length
const MAP_WIDTH = 1_000
const MAP_HEIGHT = 620
const MAP_PADDING = 16

function polygonsOf(geometry: MapGeometry): Polygon[] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
}

const allPositions = mapData.features.flatMap((feature) =>
  polygonsOf(feature.geometry).flatMap((polygon) => polygon.flat()),
)
const longitudeValues = allPositions.map(([longitude]) => longitude)
const latitudeValues = allPositions.map(([, latitude]) => latitude)
const minLongitude = Math.min(...longitudeValues)
const maxLongitude = Math.max(...longitudeValues)
const minLatitude = Math.min(...latitudeValues)
const maxLatitude = Math.max(...latitudeValues)
const longitudeSpan = Math.max(maxLongitude - minLongitude, 1)
const latitudeSpan = Math.max(maxLatitude - minLatitude, 1)

function project([longitude, latitude]: Position) {
  return [
    MAP_PADDING + ((longitude - minLongitude) / longitudeSpan) * (MAP_WIDTH - MAP_PADDING * 2),
    MAP_PADDING + ((maxLatitude - latitude) / latitudeSpan) * (MAP_HEIGHT - MAP_PADDING * 2),
  ] as const
}

function ringPath(ring: Position[]) {
  return `${ring
    .map((position, index) => {
      const [x, y] = project(position)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')} Z`
}

function geometryPath(geometry: MapGeometry) {
  return polygonsOf(geometry)
    .flatMap((polygon) => polygon.map(ringPath))
    .join(' ')
}

/** Ausência de comparação não é variação de zero, e o texto diz isso. */
function formatVariation(value: number | null) {
  if (value === null) return 'sem comparação disponível'
  const percent = Math.abs(value * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  if (Math.abs(value) < 0.0005) return '0,0%'
  return `${value > 0 ? '+' : '−'}${percent}%`
}

function quantile(sortedValues: number[], percentile: number) {
  if (sortedValues.length === 0) return 0
  const position = (sortedValues.length - 1) * percentile
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sortedValues[lower]
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (position - lower)
}

export default function RegionalMap({
  items,
  selectedRegionCode,
  selectedMacroregionCode,
  onSelect,
  formatInteger,
  formatPercent,
  hoveredCode: controlledHoveredCode,
  onHoverChange,
  signals,
  variations,
  competence,
  comparisonPeriods,
  onAskLocal,
  onViewHospitals,
  colorBy = 'iph',
}: RegionalMapProps) {
  const [ownHoveredCode, setOwnHoveredCode] = useState('')
  const hoveredCode = controlledHoveredCode ?? ownHoveredCode
  const setHoveredCode = (regionCode: string) => {
    setOwnHoveredCode(regionCode)
    onHoverChange?.(regionCode)
  }
  const pathRefs = useRef(new Map<string, SVGPathElement>())
  const itemsByRegion = useMemo(
    () => new Map(items.map((item) => [item.region_code, item])),
    [items],
  )
  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          !selectedMacroregionCode || item.macroregion_code === selectedMacroregionCode,
      ),
    [items, selectedMacroregionCode],
  )
  const interactiveCodes = mapData.features
    .map((feature) => feature.properties.cd_regiao_saude)
    .filter((code) => {
      const item = itemsByRegion.get(code)
      return Boolean(item && (!selectedMacroregionCode || item.macroregion_code === selectedMacroregionCode))
    })
  const rovingCode = interactiveCodes.includes(selectedRegionCode)
    ? selectedRegionCode
    : interactiveCodes[0]
  // Colorir pelo placar de sinais não usa percentis: a escala já é discreta e
  // pequena, de zero a seis, e reparti-la em quintis inventaria um corte onde
  // a contagem já é o corte.
  const bySignals = colorBy === 'sinais' && signals !== undefined
  const metricOf = (item: RegionalSummaryItem) =>
    bySignals ? (signals?.get(item.region_code)?.count ?? 0) : item.iph_percent
  const values = visibleItems.map(metricOf).sort((a, b) => a - b)
  // Os cortes do placar eram fixos em 0, 1, 2 e 3. Como o recorte publicado
  // chega no máximo a 3 dos 6 sinais, os dois tons escuros nunca eram usados:
  // o mapa inteiro ficava na metade clara da rampa, e a legenda mostrava um
  // tom que região nenhuma tinha. Agora a escala se estica até o máximo
  // observado, então o pior do recorte é sempre o tom mais escuro e o melhor
  // é sempre o mais claro.
  const observedMax = bySignals ? (values.at(-1) ?? 0) : 0
  const thresholds = bySignals
    ? [0.2, 0.4, 0.6, 0.8].map((fracao) => fracao * observedMax)
    : [0.2, 0.4, 0.6, 0.8].map((percentile) => quantile(values, percentile))
  const hoveredItem = itemsByRegion.get(hoveredCode)
  // Com um território escolhido o cartão fica nele por padrão: os valores da
  // região selecionada não podem depender de manter o ponteiro parado em cima.
  // O ponteiro passa a servir para comparar outra região sem perder a escolha.
  const selectedItem = itemsByRegion.get(selectedRegionCode)
  const cardItem = hoveredItem ?? selectedItem
  const cardIsSelection = Boolean(
    selectedItem && cardItem?.region_code === selectedItem.region_code,
  )
  const cardSignals = cardItem ? signals?.get(cardItem.region_code) : undefined

  function formatSignalNumber(value: number, signalId: (typeof SIGNALS)[number]['id']) {
    if (signalId === 'cmi') {
      return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      })
    }
    if (signalId === 'stay') {
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} dias`
    }
    return formatPercent(value)
  }

  function formatSignalValue(item: RegionalSummaryItem, signalId: (typeof SIGNALS)[number]['id']) {
    const signal = SIGNALS.find((candidate) => candidate.id === signalId)
    return formatSignalNumber(signal?.value(item) ?? 0, signalId)
  }

  function toneFor(item: RegionalSummaryItem | undefined) {
    if (!item) return 'is-muted'
    const index = thresholds.findIndex((threshold) => metricOf(item) <= threshold)
    return `tone-${index === -1 ? 5 : index + 1}`
  }

  function moveFocus(currentCode: string, direction: 1 | -1 | 'first' | 'last') {
    if (interactiveCodes.length === 0) return
    const currentIndex = Math.max(interactiveCodes.indexOf(currentCode), 0)
    const nextIndex =
      direction === 'first'
        ? 0
        : direction === 'last'
          ? interactiveCodes.length - 1
          : (currentIndex + direction + interactiveCodes.length) % interactiveCodes.length
    const nextCode = interactiveCodes[nextIndex]
    onSelect(nextCode)
    requestAnimationFrame(() => pathRefs.current.get(nextCode)?.focus())
  }

  return (
    <div className="regional-map" data-testid="regional-map">
      <svg
        className="regional-map-svg"
        data-testid="regional-map-svg"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        aria-labelledby="regional-map-title regional-map-description"
      >
        <title id="regional-map-title">Mapa das 62 regiões de saúde de São Paulo</title>
        <desc id="regional-map-description">
          {bySignals
            ? 'As cores vão do mais claro, nenhum sinal aceso, ao mais escuro, o maior placar observado nesta competência.'
            : 'As cores usam percentis do IPH estimado na competência selecionada.'}{' '}
          Use as setas para navegar pelas regiões e Enter ou espaço para selecionar. Ativar a
          região já selecionada volta ao panorama, sem território escolhido.
        </desc>
        {mapData.features.map((feature) => {
          const regionCode = feature.properties.cd_regiao_saude
          const item = itemsByRegion.get(regionCode)
          const isVisible = Boolean(
            item && (!selectedMacroregionCode || item.macroregion_code === selectedMacroregionCode),
          )
          const isSelected = regionCode === selectedRegionCode
          const label = item
            ? `${feature.properties.nm_regiao_saude}, ${
                bySignals
                  ? `${signals?.get(regionCode)?.count ?? 0} de ${SIGNAL_TOTAL} sinais acesos`
                  : `IPH estimado ${formatPercent(item.iph_percent)}`
              }, amostra de ${formatInteger(item.new_admissions)} internações novas${
                isSelected ? '. Selecionada: ative novamente para voltar ao panorama' : ''
              }`
            : `${feature.properties.nm_regiao_saude}, sem dados para a competência selecionada`

          return (
            <path
              key={feature.id}
              ref={(node) => {
                if (node) pathRefs.current.set(regionCode, node)
                else pathRefs.current.delete(regionCode)
              }}
              d={geometryPath(feature.geometry)}
              className={`regional-map-shape ${toneFor(item)}${isSelected ? ' selected' : ''}${isVisible ? '' : ' filtered-out'}`}
              data-testid={`regional-map-${regionCode}`}
              role={isVisible ? 'button' : undefined}
              tabIndex={isVisible && regionCode === rovingCode ? 0 : -1}
              aria-label={isVisible ? label : undefined}
              aria-pressed={isVisible ? isSelected : undefined}
              onMouseEnter={() => isVisible && setHoveredCode(regionCode)}
              onMouseLeave={() => setHoveredCode('')}
              onFocus={() => isVisible && setHoveredCode(regionCode)}
              onBlur={() => setHoveredCode('')}
              // Clicar de novo na região já escolhida devolve ao panorama: é o
              // gesto que o usuário tenta primeiro para desfazer a seleção.
              onClick={() =>
                isVisible && onSelect(regionCode === selectedRegionCode ? '' : regionCode)
              }
              onKeyDown={(event) => {
                if (!isVisible) return
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveFocus(regionCode, 1)
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveFocus(regionCode, -1)
                } else if (event.key === 'Home' || event.key === 'End') {
                  event.preventDefault()
                  moveFocus(regionCode, event.key === 'Home' ? 'first' : 'last')
                } else if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(regionCode === selectedRegionCode ? '' : regionCode)
                }
              }}
            >
              <title>{label}</title>
            </path>
          )
        })}
      </svg>
      {cardItem ? (
        <div
          className={`map-hover-card${cardIsSelection ? ' pinned' : ''}`}
          data-testid="regional-map-tooltip"
          aria-live="polite"
        >
          <div className="map-hover-head">
            <strong>{cardItem.region_name}</strong>
            <span>
              {cardIsSelection
                ? 'selecionada'
                : `${formatInteger(cardItem.municipality_count)} municípios`}
            </span>
          </div>
          <p className="map-card-competence">Competência {competence}</p>
          <section className="map-card-signal" aria-label="Sinais e motivo da triagem">
            <span>SINAIS DE ATENÇÃO</span>
            <strong data-testid="regional-map-signals">
              {cardSignals
                ? `${cardSignals.count} de ${cardSignals.total} sinais acesos`
                : 'Sinais indisponíveis'}
            </strong>
            <p>
              {!cardSignals
                ? 'Não foi possível calcular os sinais desta região.'
                : cardSignals.count > 0
                  ? `${cardSignals.lit.map(signalLabel).join(', ')} no grupo de valores mais altos do recorte.`
                  : 'Nenhum dos seis indicadores acendeu um sinal neste recorte.'}
            </p>
            {cardIsSelection && (
              <button type="button" onClick={() => onAskLocal('O que são os sinais?')}>
                O que são os sinais?
              </button>
            )}
          </section>

          <div className="map-card-primary-metrics">
            <section>
              <span>IPH estimado</span>
              <strong>{formatPercent(cardItem.iph_percent)}</strong>
              <small>Estimativa mensal de pressão sobre a capacidade declarada.</small>
              {cardIsSelection && (
                <button type="button" onClick={() => onAskLocal('O que é IPH?')}>
                  O que é IPH?
                </button>
              )}
            </section>
            <section>
              <span>Internações novas</span>
              <strong>{formatInteger(cardItem.new_admissions)}</strong>
              <dl className="admissions-comparisons" data-testid="map-card-admissions-comparisons">
                <div>
                  <dt>Em relação a {comparisonPeriods.previous}</dt>
                  <dd>{formatVariation(variations?.get(cardItem.region_code)?.mom ?? null)}</dd>
                </div>
                <div>
                  <dt>Em relação a {comparisonPeriods.yearAgo}</dt>
                  <dd>{formatVariation(variations?.get(cardItem.region_code)?.yoy ?? null)}</dd>
                </div>
              </dl>
            </section>
            <section>
              <span>Permanência média</span>
              <strong>
                {cardItem.average_stay_days.toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}{' '}
                dias
              </strong>
            </section>
          </div>

          {cardIsSelection && (
            <>
              <details className="map-card-other" data-testid="map-card-other-indicators">
                <summary>Outros indicadores</summary>
                <p>
                  Os sinais indicam valores no grupo mais alto do recorte; são triagem
                  comparativa, não nota de qualidade.
                </p>
                <dl>
                  {SIGNALS.filter(
                    (signal) => signal.id !== 'iph' && signal.id !== 'stay',
                  ).map((signal) => (
                    <div key={signal.id} data-signal={signal.id}>
                      <dt>{signalLabel(signal.id)}</dt>
                      <dd>
                        {formatSignalValue(cardItem, signal.id)}
                        {cardSignals?.lit.includes(signal.id) ? ' · sinal aceso' : ''}
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt>Acima dos pares (IPE)</dt>
                    <dd data-testid="map-card-ipe">
                      {cardItem.ipe_eligible_pairs === 0
                        ? 'sem comparação elegível'
                        : `${formatInteger(cardItem.ipe_above_reference)} de ${formatInteger(cardItem.ipe_eligible_pairs)}`}
                    </dd>
                  </div>
                </dl>
              </details>
              <button className="map-card-hospitals" type="button" onClick={onViewHospitals}>
                Ver hospitais da região ↓
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="map-hover-label" data-testid="regional-map-tooltip" aria-live="polite">
          Passe o ponteiro ou use as setas para identificar uma região.
        </p>
      )}
      <div className="regional-map-legend" aria-label="Legenda do IPH estimado" data-testid="regional-map-legend">
        {bySignals ? (
          <>
            {/* A legenda descreve o que está na tela: cravar "quatro ou mais"
                anunciaria um tom que pode não existir na competência. */}
            <span><i className="tone-swatch tone-1" /> {formatInteger(values[0] ?? 0)} de {SIGNAL_TOTAL} sinais</span>
            <span><i className="tone-swatch tone-5" /> até {formatInteger(values.at(-1) ?? 0)} de {SIGNAL_TOTAL}</span>
            <small>
              Contagem de indicadores no quintil mais alto do recorte. É placar de
              sinais para priorizar investigação, não nota de qualidade.
            </small>
          </>
        ) : (
          <>
            <span><i className="tone-swatch tone-1" /> mínimo real {formatPercent(values[0] ?? 0)}</span>
            <span><i className="tone-swatch tone-5" /> máximo real {formatPercent(values.at(-1) ?? 0)}</span>
            <small>Escala visual relativa por percentis desta competência; não é classificação clínica.</small>
          </>
        )}
      </div>
    </div>
  )
}

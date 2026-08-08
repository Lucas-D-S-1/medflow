import { useMemo, useRef, useState } from 'react'
import regionalMapAsset from '../../../data/gold/geografia/mapa_regiao_saude_sp.geojson?raw'
import type { RegionalSummaryItem } from '../api/regioes'

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
}

const mapData = JSON.parse(regionalMapAsset) as MapFeatureCollection
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
}: RegionalMapProps) {
  const [hoveredCode, setHoveredCode] = useState('')
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
  const values = visibleItems.map((item) => item.iph_percent).sort((a, b) => a - b)
  const thresholds = [0.2, 0.4, 0.6, 0.8].map((percentile) => quantile(values, percentile))
  const hoveredItem = itemsByRegion.get(hoveredCode)

  function toneFor(item: RegionalSummaryItem | undefined) {
    if (!item) return 'is-muted'
    const index = thresholds.findIndex((threshold) => item.iph_percent <= threshold)
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
          As cores usam percentis do IPH estimado na competência selecionada. Use as setas para
          navegar pelas regiões e Enter ou espaço para selecionar.
        </desc>
        {mapData.features.map((feature) => {
          const regionCode = feature.properties.cd_regiao_saude
          const item = itemsByRegion.get(regionCode)
          const isVisible = Boolean(
            item && (!selectedMacroregionCode || item.macroregion_code === selectedMacroregionCode),
          )
          const isSelected = regionCode === selectedRegionCode
          const label = item
            ? `${feature.properties.nm_regiao_saude}, IPH estimado ${formatPercent(item.iph_percent)}, amostra de ${formatInteger(item.new_admissions)} internações novas`
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
              onClick={() => isVisible && onSelect(regionCode)}
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
                  onSelect(regionCode)
                }
              }}
            >
              <title>{label}</title>
            </path>
          )
        })}
      </svg>
      <p className="map-hover-label" data-testid="regional-map-tooltip" aria-live="polite">
        {hoveredItem
          ? `${hoveredItem.region_name}: IPH estimado ${formatPercent(hoveredItem.iph_percent)}`
          : 'Passe o ponteiro ou use as setas para identificar uma região.'}
      </p>
      <div className="regional-map-legend" aria-label="Legenda do IPH estimado" data-testid="regional-map-legend">
        <span><i className="tone-swatch tone-1" /> mínimo real {formatPercent(values[0] ?? 0)}</span>
        <span><i className="tone-swatch tone-5" /> máximo real {formatPercent(values.at(-1) ?? 0)}</span>
        <small>Escala visual relativa por percentis desta competência; não é classificação clínica.</small>
      </div>
    </div>
  )
}

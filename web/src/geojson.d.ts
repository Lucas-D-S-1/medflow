declare module '*.geojson' {
  const value: unknown
  export default value
}

declare module '*?raw' {
  const value: string
  export default value
}

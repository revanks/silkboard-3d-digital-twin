// Color language shared with GridSense AI's own React dashboard/Streamlit app, ported verbatim from
// dashboard/map_layers.py so the 3D scene's "risk" color mode visually matches the rest of the product.

export const SEQUENTIAL_RAMP_HEX = [
  '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7',
  '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b',
]

// Categorical slots 1-5, fixed order (dashboard/map_layers.py CUSTOMER_TYPE_COLORS) — indexed by the
// numeric `type` code the exporter assigns (0=residential .. 4=hospital, see threejs_export.py).
export const CUSTOMER_TYPE_COLOR_BY_CODE = [
  '#2a78d6', // 0 residential — slot 1 blue
  '#1baf7a', // 1 commercial — slot 2 aqua
  '#eda100', // 2 industrial — slot 3 yellow
  '#008300', // 3 school — slot 4 green
  '#4a3aa7', // 4 hospital — slot 5 violet
]

export const NEUTRAL_COLOR = '#898781'

// Real pole material weights/colors (POLE_MATERIAL_WEIGHTS in risk_model.py: concrete 90% / steel 6% /
// wooden 4%) — indexed by the exporter's `mat` code (0/1/2).
export const POLE_MATERIAL = [
  { color: '#8f8a80', roughness: 0.9, metalness: 0.0 }, // 0 concrete
  { color: '#6e727a', roughness: 0.5, metalness: 0.4 }, // 1 steel
  { color: '#5c4a34', roughness: 0.85, metalness: 0.0 }, // 2 wooden
]

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

// Same interpolation as dashboard/map_layers.py's risk_to_rgb — 13-step ramp, linear-interpolated.
export function riskColor(value, range) {
  if (value === null || value === undefined || Number.isNaN(value)) return NEUTRAL_COLOR
  const [vmin, vmax] = range || [0, 1]
  const frac = Math.max(0, Math.min(1, (value - vmin) / Math.max(vmax - vmin, 1e-6)))
  const steps = SEQUENTIAL_RAMP_HEX.map(hexToRgb)
  const n = steps.length - 1
  const pos = frac * n
  const lo = Math.floor(pos)
  const hi = Math.min(lo + 1, n)
  const t = pos - lo
  const [r0, g0, b0] = steps[lo]
  const [r1, g1, b1] = steps[hi]
  return rgbToHex(r0 + (r1 - r0) * t, g0 + (g1 - g0) * t, b0 + (b1 - b0) * t)
}

export function customerTypeColor(code) {
  return CUSTOMER_TYPE_COLOR_BY_CODE[code] ?? NEUTRAL_COLOR
}

export function poleMaterialColor(code) {
  return POLE_MATERIAL[code]?.color ?? POLE_MATERIAL[0].color
}

// Deterministic per-feeder color for the "color by feeder" grouping mode (Stage C) — small fixed
// palette since there are only ever a few feeders (3 in the current pilot).
export const FEEDER_COLORS = ['#2a78d6', '#eda100', '#1baf7a', '#d03b3b', '#4a3aa7', '#008300']
export function feederColor(feederIndex) {
  if (feederIndex === null || feederIndex === undefined) return NEUTRAL_COLOR
  return FEEDER_COLORS[feederIndex % FEEDER_COLORS.length]
}

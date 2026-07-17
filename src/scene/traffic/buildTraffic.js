import { mulberry32, randBetween } from '../../utils.js'

// Lane network for the two corridors (left-hand traffic).
//  - Hosur Rd at-grade lanes + service roads: signal group 'ns'
//  - ORR lanes: signal group 'ew'
//  - Flyover lanes (inner Hosur lanes ride up the ramp): free-flow
// Lanes are straight paths of length 2000 m; s = distance travelled.
// dir +1 means coordinate runs -1000 → +1000.

export const L = 2000
export const HALF = L / 2
const STOP_S = HALF - 34 // stop line 34 m before the junction centre

export const TYPES = ['bike', 'car', 'suv', 'auto', 'bus', 'truck']
export const TYPE_LEN = { bike: 2.0, car: 4.3, suv: 4.45, auto: 2.6, bus: 10.8, truck: 8.8 }

// Weighted to match real Indian road colours — whites/silvers dominate cars,
// autos are Bengaluru green, buses wear BMTC liveries.
export const PALETTES = {
  bike: ['#1c1c20', '#1c1c20', '#2b2b30', '#8c1f1f', '#274b8f', '#3d3d44', '#b8342a', '#191919', '#4a4a52', '#7a1f6b'],
  car: ['#e8e8ea', '#e8e8ea', '#e8e8ea', '#e8e8ea', '#d8d9dc', '#b8bcc2', '#8f949b', '#17171b', '#17171b', '#8c1f1f', '#2a4680', '#6b1f24'],
  suv: ['#e8e8ea', '#e8e8ea', '#17171b', '#17171b', '#2b2b30', '#5c5c62', '#8c1f1f', '#2a4680'],
  auto: ['#1e8a3c', '#1e8a3c', '#25913e', '#0f6b2d', '#1e8a3c'],
  bus: ['#aebfd0', '#aebfd0', '#aebfd0', '#2b5f9e', '#5b4a9e', '#3e7d4e', '#c8cdd3'],
  truck: ['#c47a2b', '#a8562f', '#8a8f5a', '#b0a13c', '#7d6b4f', '#3e6b8f'],
}

// Traffic composition per lane kind (fractions must sum to 1).
export const MIXES = {
  main: [['bike', 0.32], ['car', 0.24], ['suv', 0.12], ['auto', 0.12], ['bus', 0.08], ['truck', 0.12]],
  service: [['bike', 0.42], ['car', 0.22], ['suv', 0.06], ['auto', 0.3]],
  flyover: [['bike', 0.28], ['car', 0.3], ['suv', 0.14], ['auto', 0.05], ['bus', 0.1], ['truck', 0.13]],
  orr: [['bike', 0.3], ['car', 0.24], ['suv', 0.12], ['auto', 0.1], ['bus', 0.1], ['truck', 0.14]],
}

export function pickType(rng, mix) {
  let r = rng()
  for (const [type, p] of mix) {
    r -= p
    if (r <= 0) return type
  }
  return mix[0][0]
}

// axis: which world axis the lane runs along; lateral: the fixed other coord.
const LANE_DEFS = [
  // Hosur Rd at-grade (outer lanes), signalized
  ...[[8.6, 1], [11.6, 1], [-8.6, -1], [-11.6, -1]].map(([lat, dir]) => ({
    axis: 'z', lateral: lat, dir, y: 0.25, limit: 11, signal: 'ns', mix: 'main', n: 70,
  })),
  // Hosur Rd service roads, signalized, light vehicles only
  ...[[22, 1], [25, 1], [-22, -1], [-25, -1]].map(([lat, dir]) => ({
    axis: 'z', lateral: lat, dir, y: 0.22, limit: 7, signal: 'ns', mix: 'service', n: 45,
  })),
  // Flyover through-lanes (inner Hosur lanes), free-flow
  ...[[2.6, 1], [5.2, 1], [-2.6, -1], [-5.2, -1]].map(([lat, dir]) => ({
    axis: 'z', lateral: lat, dir, y: 0.26, limit: 16, signal: null, mix: 'flyover', n: 80, elevated: true,
  })),
  // Outer Ring Road, signalized (left-hand side of travel direction)
  ...[[-2.5, 1], [-6.3, 1], [-10.1, 1], [2.5, -1], [6.3, -1], [10.1, -1]].map(([lat, dir]) => ({
    axis: 'x', lateral: lat, dir, y: 0.27, limit: 12, signal: 'ew', mix: 'orr', n: 75,
  })),
]

export function buildTraffic() {
  const rng = mulberry32(555777)
  const lanes = []
  const vehicles = []
  const counts = { bike: 0, car: 0, suv: 0, auto: 0, bus: 0, truck: 0 }

  for (const def of LANE_DEFS) {
    const lane = { ...def, length: L, stopS: STOP_S, vehicles: [] }
    const n = def.n + Math.floor(randBetween(rng, -8, 8))
    const spacing = L / n
    for (let i = 0; i < n; i++) {
      const type = pickType(rng, MIXES[def.mix])
      const pal = PALETTES[type]
      const factor = randBetween(rng, 0.85, 1.18)
      const v = {
        type,
        s: i * spacing + randBetween(rng, 0, spacing * 0.5),
        speed: def.limit * factor * randBetween(rng, 0.4, 1),
        factor,
        jit: type === 'bike' ? randBetween(rng, -0.85, 0.85) : randBetween(rng, -0.3, 0.3),
        halfLen: TYPE_LEN[type] / 2,
        scale: randBetween(rng, 0.92, 1.08),
        color: pal[Math.floor(rng() * pal.length)],
        slot: counts[type]++,
      }
      lane.vehicles.push(v) // ascending s — order never changes (no overtaking)
      vehicles.push(v)
    }
    lanes.push(lane)
  }
  return { lanes, vehicles, counts }
}

// Deterministic seeded RNG so the city layout is identical on every load.
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randBetween(rng, min, max) {
  return min + rng() * (max - min)
}

// Madiwala Lake footprint (ellipse, NW of the junction) — buildings and
// trees must not spawn inside it.
export function inMadiwalaLake(x, z) {
  const dx = (x + 480) / 205
  const dz = (z + 660) / 165
  return dx * dx + dz * dz < 1
}

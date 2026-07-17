// Geometry helpers for OSM polylines/polygons.
// Points are [x, z] in local metres (x = east, z = south), same as the scene.

// Overpass returns way geometry running well past the fetched tile; anything
// drawn beyond the ground plane floats over the void. Clip to this radius.
export const MAP_BOUND = 1250

export function inBounds(x, z) {
  return Math.abs(x) <= MAP_BOUND && Math.abs(z) <= MAP_BOUND
}

// Arc-length parametrised path over a polyline. sample(s) returns position
// and unit direction at distance s along the way — used by roads, traffic,
// metro trains, streetlights and power poles alike.
export function buildPath(pts) {
  const cum = [0]
  let length = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0]
    const dz = pts[i][1] - pts[i - 1][1]
    length += Math.hypot(dx, dz)
    cum.push(length)
  }

  function seg(s) {
    // Binary search for the segment containing arc length s.
    let lo = 0
    let hi = cum.length - 2
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (cum[mid] <= s) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  function sample(s) {
    const sc = Math.min(Math.max(s, 0), length)
    const i = seg(sc)
    const a = pts[i]
    const b = pts[i + 1]
    const segLen = cum[i + 1] - cum[i] || 1
    const t = (sc - cum[i]) / segLen
    const dx = (b[0] - a[0]) / segLen
    const dz = (b[1] - a[1]) / segLen
    return {
      x: a[0] + (b[0] - a[0]) * t,
      z: a[1] + (b[1] - a[1]) * t,
      dx,
      dz,
    }
  }

  return { pts, length, cum, sample }
}

// Bridge ways in OSM are chopped into segments (the Silk Board interchange
// is ~10 connected ways: main flyover, double-decker, U-turn loop, ramps).
// A deck should only taper to the ground at an endpoint NO other bridge way
// shares — otherwise the structure dips to grade mid-air at every way join.
// Annotates each bridge road with rs/re: "ramp at start/end?".
export function annotateBridgeRamps(roads) {
  const counts = new Map()
  const key = (p) => `${p[0]},${p[1]}`
  for (const r of roads) {
    if (!r.b || !r.p || r.p.length < 2) continue
    for (const k of [key(r.p[0]), key(r.p[r.p.length - 1])]) {
      counts.set(k, (counts.get(k) || 0) + 1)
    }
  }
  for (const r of roads) {
    if (!r.b || !r.p || r.p.length < 2) continue
    r.rs = (counts.get(key(r.p[0])) || 0) < 2
    r.re = (counts.get(key(r.p[r.p.length - 1])) || 0) < 2
  }
}

// Ray-cast point-in-polygon (x/z plane). pts closes on itself.
export function pointInPolygon(x, z, pts) {
  let inside = false
  const n = pts.length - 1
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, zi] = pts[i]
    const [xj, zj] = pts[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// Signed area (shoelace, in the x/z plane). Positive or negative depending
// on winding — callers use Math.abs.
export function polygonArea(pts) {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i]
    const [x2, z2] = pts[(i + 1) % pts.length]
    a += x1 * z2 - x2 * z1
  }
  return a / 2
}

export function polygonCentroid(pts) {
  let a = 0
  let cx = 0
  let cz = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i]
    const [x2, z2] = pts[(i + 1) % pts.length]
    const cross = x1 * z2 - x2 * z1
    a += cross
    cx += (x1 + x2) * cross
    cz += (z1 + z2) * cross
  }
  a /= 2
  if (Math.abs(a) < 1e-6) {
    // Degenerate polygon — fall back to vertex average.
    let sx = 0
    let sz = 0
    for (const [x, z] of pts) {
      sx += x
      sz += z
    }
    return [sx / pts.length, sz / pts.length]
  }
  return [cx / (6 * a), cz / (6 * a)]
}

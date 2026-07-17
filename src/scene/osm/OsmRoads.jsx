import React, { useMemo } from 'react'
import * as THREE from 'three'
import InstancedBoxes from '../InstancedBoxes.jsx'
import { buildPath, inBounds } from './geo.js'

// Real OSM road network as merged ribbon geometry — one draw call for all
// ground roads, one for bridges, plus instanced dashes and piers.

export const ROAD_W = {
  motorway: 13,
  trunk: 12,
  primary: 10,
  secondary: 9,
  tertiary: 8,
  unclassified: 5,
  residential: 5.5,
  living_street: 4.5,
  service: 4,
}
// Link ramps (trunk_link etc.) are narrower than their parent class.
const LINK_W = 7

// Stacking order so overlapping classes never z-fight (bigger = on top).
const RANK = {
  service: 0,
  living_street: 1,
  unclassified: 1,
  residential: 2,
  tertiary: 3,
  secondary: 4,
  primary: 5,
  trunk: 6,
  motorway: 7,
}

const TINT = {
  motorway: '#3a3d42',
  trunk: '#3a3d42',
  primary: '#3f4247',
  secondary: '#43464b',
  tertiary: '#46494e',
  residential: '#505358',
  living_street: '#55585d',
  unclassified: '#505358',
  service: '#5a5c60',
}

export const BRIDGE_H = 7
const RAMP_L = 45
const PIER_SPACING = 25

export function roadWidth(road) {
  const base = road.c.endsWith('_link') ? road.c.slice(0, -5) : road.c
  if (road.c.endsWith('_link')) return LINK_W
  return ROAD_W[base] || 5
}

function baseClass(c) {
  return c.endsWith('_link') ? c.slice(0, -5) : c
}

// Deck height along a bridge way: flat BRIDGE_H with smooth tapered ramps —
// but only at ends where the structure actually touches down (rampStart /
// rampEnd come from annotateBridgeRamps; a shared endpoint stays elevated).
export function bridgeHeight(s, length, rampStart = true, rampEnd = true) {
  const up = rampStart ? Math.min(1, s / RAMP_L) : 1
  const down = rampEnd ? Math.min(1, (length - s) / RAMP_L) : 1
  const t = Math.min(up, down)
  return BRIDGE_H * t * t * (3 - 2 * t) // smoothstep
}

function buildRibbons(roads, { bridges }) {
  const positions = []
  const colors = []
  const indices = []
  const color = new THREE.Color()
  let vi = 0

  for (const road of roads) {
    if (Boolean(road.b) !== bridges) continue
    if (road.p.length < 2) continue
    const path = buildPath(road.p)
    if (path.length < 4) continue

    const w = roadWidth(road) / 2
    const cls = baseClass(road.c)
    const yBase = 0.06 + (RANK[cls] ?? 1) * 0.025
    color.set(TINT[cls] || '#4a4d52')

    // Stations: every original vertex + subdivisions (fine on bridges so
    // the ramp curvature reads).
    const maxStep = bridges ? 5 : 22
    const stations = []
    for (let i = 0; i < path.cum.length; i++) {
      const s0 = path.cum[i]
      stations.push(s0)
      if (i < path.cum.length - 1) {
        const segLen = path.cum[i + 1] - s0
        const nSub = Math.floor(segLen / maxStep)
        for (let k = 1; k <= nSub; k++) stations.push(s0 + (segLen * k) / (nSub + 1))
      }
    }

    const first = vi
    const inside = []
    for (const s of stations) {
      const p = path.sample(s)
      inside.push(inBounds(p.x, p.z))
      // Average direction across the vertex so ribbon joins are mitred.
      const a = path.sample(Math.max(0, s - 0.5))
      const b = path.sample(Math.min(path.length, s + 0.5))
      let dx = a.dx + b.dx
      let dz = a.dz + b.dz
      const len = Math.hypot(dx, dz) || 1
      dx /= len
      dz /= len
      const px = -dz // left perpendicular
      const pz = dx
      const y = yBase + (bridges ? bridgeHeight(s, path.length, road.rs, road.re) : 0)
      positions.push(p.x + px * w, y, p.z + pz * w, p.x - px * w, y, p.z - pz * w)
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b)
      vi += 2
    }
    for (let i = first; i < vi - 2; i += 2) {
      // Skip strip segments that leave the modelled area (clipped, not capped).
      if (!inside[(i - first) / 2] || !inside[(i - first) / 2 + 1]) continue
      indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// Dashed centre-line markings on tertiary and above (skip link ramps).
const MARKED = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary'])

function buildDashes(roads) {
  const items = []
  for (const road of roads) {
    if (!MARKED.has(road.c) || road.p.length < 2) continue
    const path = buildPath(road.p)
    if (path.length < 20) continue
    const bridge = Boolean(road.b)
    const cls = baseClass(road.c)
    const yBase = 0.06 + (RANK[cls] ?? 1) * 0.025 + 0.02
    for (let s = 6; s < path.length - 6; s += 9) {
      const p = path.sample(s)
      if (!inBounds(p.x, p.z)) continue
      const y = yBase + (bridge ? bridgeHeight(s, path.length, road.rs, road.re) : 0)
      items.push({
        pos: [p.x, y, p.z],
        scale: [0.18, 0.02, 3],
        rotY: Math.atan2(p.dx, p.dz),
      })
    }
  }
  return items
}

// Concrete parapet walls along both edges of every elevated deck — these
// give the flyover its visual mass so it reads from any distance.
function buildParapets(roads) {
  const positions = []
  const indices = []
  let vi = 0
  for (const road of roads) {
    if (!road.b || road.p.length < 2) continue
    const path = buildPath(road.p)
    if (path.length < 30) continue
    const w = roadWidth(road) / 2
    const cls = baseClass(road.c)
    const yBase = 0.06 + (RANK[cls] ?? 1) * 0.025
    const stations = []
    for (let s = 0; s <= path.length; s += 5) stations.push(s)

    for (const side of [1, -1]) {
      const first = vi
      const inside = []
      for (const s of stations) {
        const p = path.sample(s)
        const a = path.sample(Math.max(0, s - 0.5))
        const b = path.sample(Math.min(path.length, s + 0.5))
        let dx = a.dx + b.dx
        let dz = a.dz + b.dz
        const len = Math.hypot(dx, dz) || 1
        dx /= len
        dz /= len
        const ex = p.x - dz * w * side
        const ez = p.z + dx * w * side
        const h = bridgeHeight(s, path.length, road.rs, road.re)
        inside.push(inBounds(ex, ez) && h > 0.4)
        const y = yBase + h
        positions.push(ex, y, ez, ex, y + 1.05, ez)
        vi += 2
      }
      for (let i = first; i < vi - 2; i += 2) {
        if (!inside[(i - first) / 2] || !inside[(i - first) / 2 + 1]) continue
        indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// Piers under elevated decks, every ~25 m where the deck is high enough.
function buildPiers(roads) {
  const items = []
  for (const road of roads) {
    if (!road.b || road.p.length < 2) continue
    const path = buildPath(road.p)
    if (path.length < 30) continue
    for (let s = PIER_SPACING / 2; s < path.length; s += PIER_SPACING) {
      const h = bridgeHeight(s, path.length, road.rs, road.re)
      if (h < 2) continue
      const p = path.sample(s)
      if (!inBounds(p.x, p.z)) continue
      items.push({ pos: [p.x, h / 2, p.z], scale: [2, h, 1.6] })
    }
  }
  return items
}

export default function OsmRoads({ osm }) {
  const ground = useMemo(() => buildRibbons(osm.roads, { bridges: false }), [osm])
  const bridges = useMemo(() => buildRibbons(osm.roads, { bridges: true }), [osm])
  const dashes = useMemo(() => buildDashes(osm.roads), [osm])
  const piers = useMemo(() => buildPiers(osm.roads), [osm])
  const parapets = useMemo(() => buildParapets(osm.roads), [osm])

  return (
    <group>
      <mesh geometry={ground} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh geometry={bridges} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh geometry={parapets} castShadow>
        <meshStandardMaterial color="#b0aa9c" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <InstancedBoxes items={piers} color="#9a948a" castShadow />
      <InstancedBoxes items={dashes} color="#c9cdd2" roughness={0.7} />
    </group>
  )
}

import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { makeVehicleGeometries } from '../traffic/vehicleGeometries.js'
import { PALETTES, MIXES, pickType, TYPES, TYPE_LEN } from '../traffic/buildTraffic.js'
import { PHASES, signal, stepSignal, sim, flow, stats, env } from '../trafficStore.js'
import { mulberry32, randBetween } from '../../utils.js'
import { buildPath, MAP_BOUND } from './geo.js'
import { bridgeHeight } from './OsmRoads.jsx'

// Traffic on the real OSM network. Same follow-the-leader physics and
// instanced rendering as traffic/TrafficSystem.jsx, but lanes follow real
// polylines (arc-length sampled) instead of straight axes.

const ACCEL = 3
const DECEL = 8
const MIN_GAP = 1.6
const MAX_SUBSTEP = 0.08
const TYPE_W = { bike: 0.5, car: 1.55, suv: 1.7, auto: 1.25, bus: 2.3, truck: 2.2 }

const LANE_CLASSES = new Set([
  'trunk', 'primary', 'secondary', 'tertiary',
  'trunk_link', 'primary_link', 'secondary_link',
])
const MIN_WAY_LEN = 120
const MAX_VEHICLES = 2200
const SIGNAL_RADIUS = 50 // ways passing this close to the junction get queued
const STOP_BACK = 30 // stop line this far before the nearest-to-origin point

const LIMITS = { trunk: 14, primary: 12, secondary: 11, tertiary: 9 }
const SPACING = { trunk: 26, primary: 26, secondary: 34, tertiary: 38 }

function baseClass(c) {
  return c.endsWith('_link') ? c.slice(0, -5) : c
}

// Arc length of the point on the way nearest the junction (origin), plus
// its distance and direction — used to place signal stop lines.
function nearestToOrigin(path) {
  let best = { d2: Infinity, s: 0, dx: 0, dz: 1 }
  for (let s = 0; s <= path.length; s += 5) {
    const p = path.sample(s)
    const d2 = p.x * p.x + p.z * p.z
    if (d2 < best.d2) best = { d2, s, dx: p.dx, dz: p.dz }
  }
  return best
}

function buildOsmLanes(roads) {
  const rng = mulberry32(424242)
  const lanes = []
  const vehicles = []
  const counts = { bike: 0, car: 0, suv: 0, auto: 0, bus: 0, truck: 0 }

  for (const road of roads) {
    if (!LANE_CLASSES.has(road.c) || road.p.length < 2) continue
    const path = buildPath(road.p)
    if (path.length < MIN_WAY_LEN) continue
    const cls = baseClass(road.c)
    const bridge = Boolean(road.b)

    // Signal: ways passing near the junction queue at a stop line, grouped
    // by their heading there. Bridge ways (the flyover) run free.
    const near = nearestToOrigin(path)
    const signalized = !bridge && near.d2 < SIGNAL_RADIUS * SIGNAL_RADIUS
    const group = Math.abs(near.dx) > Math.abs(near.dz) ? 'ew' : 'ns'

    // oneway → two lanes straddling the centreline; bidirectional → one
    // lane per direction on the LEFT of travel (left-hand traffic;
    // left of dir (dx,dz) is (dz,−dx)).
    const defs = road.o
      ? [
          { rev: false, off: 1.6 },
          { rev: false, off: -1.6 },
        ]
      : [
          { rev: false, off: 1.6 },
          { rev: true, off: 1.6 },
        ]

    for (const def of defs) {
      if (vehicles.length >= MAX_VEHICLES) break
      const stopS = def.rev ? path.length - near.s - STOP_BACK : near.s - STOP_BACK
      const lane = {
        path,
        bridge,
        rs: road.rs,
        re: road.re,
        rev: def.rev,
        off: def.off,
        length: path.length,
        limit: (LIMITS[cls] || 9) * (bridge ? 1.3 : 1),
        signal: signalized && stopS > 0 && stopS < path.length ? group : null,
        stopS,
        vehicles: [],
      }
      const mix = cls === 'tertiary' ? MIXES.service : MIXES.main
      const n = Math.max(2, Math.floor(path.length / SPACING[cls] || 30))
      const spacing = path.length / n
      for (let i = 0; i < n; i++) {
        const type = pickType(rng, mix)
        const pal = PALETTES[type]
        const factor = randBetween(rng, 0.85, 1.18)
        const v = {
          type,
          s: i * spacing + randBetween(rng, 0, spacing * 0.5),
          speed: lane.limit * factor * randBetween(rng, 0.4, 1),
          factor,
          jit: type === 'bike' ? randBetween(rng, -0.7, 0.7) : randBetween(rng, -0.25, 0.25),
          halfLen: TYPE_LEN[type] / 2,
          scale: randBetween(rng, 0.92, 1.08),
          color: pal[Math.floor(rng() * pal.length)],
          slot: counts[type]++,
        }
        lane.vehicles.push(v)
        vehicles.push(v)
      }
      lanes.push(lane)
    }
    if (vehicles.length >= MAX_VEHICLES) break
  }
  return { lanes, vehicles, counts }
}

export default function OsmTraffic({ osm }) {
  const data = useMemo(() => {
    const d = buildOsmLanes(osm.roads)
    d.vehicles.forEach((v, i) => (v.gi = i))
    return d
  }, [osm])
  const geoms = useMemo(() => makeVehicleGeometries(), [])
  const refs = useRef({})
  const darkRefs = useRef({})
  const headRef = useRef()
  const tailRef = useRef()
  const dummy = useMemo(() => {
    const d = new THREE.Object3D()
    d.rotation.order = 'YXZ'
    return d
  }, [])

  useLayoutEffect(() => {
    const c = new THREE.Color()
    for (const t of TYPES) {
      const mesh = refs.current[t]
      if (mesh) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      const dark = darkRefs.current[t]
      if (dark) dark.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    }
    for (const m of [headRef.current, tailRef.current]) {
      if (m) m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    }
    for (const v of data.vehicles) {
      const mesh = refs.current[v.type]
      if (!mesh) continue
      c.set(v.color)
      mesh.setColorAt(v.slot, c)
    }
    for (const t of TYPES) {
      const mesh = refs.current[t]
      if (mesh && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }, [data])

  useFrame((_, delta) => {
    const dtTotal = Math.min(delta, 0.05) * sim.speed
    const nSub = THREE.MathUtils.clamp(Math.ceil(dtTotal / MAX_SUBSTEP), 1, 16)
    const dt = dtTotal / nSub

    // ── Physics: follow-the-leader + signal stops, sub-stepped ──
    for (let k = 0; k < nSub; k++) {
      stepSignal(dt)
      const phase = PHASES[signal.idx]
      for (const lane of data.lanes) {
        const arr = lane.vehicles
        const n = arr.length
        const red = lane.signal && phase[lane.signal] !== 'G'
        const scale = lane.bridge ? flow.flyoverScale : flow.groundScale
        for (let i = 0; i < n; i++) {
          const v = arr[i]
          const lead = arr[(i + 1) % n]
          let gap = lead.s - v.s
          if (gap <= 0) gap += lane.length
          gap -= lead.halfLen + v.halfLen

          let vTarget = lane.limit * v.factor * scale
          if (red) {
            const d = lane.stopS - v.s
            if (d > -2 && d < 90) vTarget = Math.min(vTarget, Math.max(0, (d - 3) * 0.9))
          }
          vTarget = Math.min(vTarget, Math.max(0, (gap - MIN_GAP) * 1.6))
          v.speed += THREE.MathUtils.clamp(vTarget - v.speed, -DECEL * dt, ACCEL * dt)
          v.s += v.speed * dt
          if (v.s >= lane.length) v.s -= lane.length
        }
      }
    }

    // ── Render: write instance matrices (once per frame) ──
    const night = env.mode === 'night'
    const headMesh = headRef.current
    const tailMesh = tailRef.current
    if (headMesh) headMesh.visible = night
    if (tailMesh) tailMesh.visible = night
    let idleCount = 0

    for (const lane of data.lanes) {
      const path = lane.path
      for (const v of lane.vehicles) {
        if (v.speed < 0.5) idleCount++
        const mesh = refs.current[v.type]
        if (!mesh) continue

        const sWay = lane.rev ? lane.length - v.s : v.s
        const p = path.sample(sWay)
        // Ways run past the modelled tile — collapse vehicles out there
        // (their road ribbon is clipped too).
        const out = Math.abs(p.x) > MAP_BOUND || Math.abs(p.z) > MAP_BOUND
        let dx = lane.rev ? -p.dx : p.dx
        let dz = lane.rev ? -p.dz : p.dz
        // Offset to the left of travel (+ per-vehicle lateral jitter).
        const off = lane.off + v.jit
        const x = p.x + dz * off
        const z = p.z - dx * off
        let y = 0.32
        let pitch = 0
        if (lane.bridge) {
          const h = bridgeHeight(sWay, lane.length, lane.rs, lane.re)
          y += h
          const dh =
            (bridgeHeight(Math.min(lane.length, sWay + 2), lane.length, lane.rs, lane.re) -
              bridgeHeight(Math.max(0, sWay - 2), lane.length, lane.rs, lane.re)) / 4
          pitch = -Math.atan(dh) * (lane.rev ? -1 : 1)
        }

        dummy.rotation.set(pitch, Math.atan2(dx, dz), 0)
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(out ? 0.0001 : v.scale)
        dummy.updateMatrix()
        mesh.setMatrixAt(v.slot, dummy.matrix)
        const dark = darkRefs.current[v.type]
        if (dark) dark.setMatrixAt(v.slot, dummy.matrix)

        if (night && headMesh && tailMesh) {
          const noseOff = v.halfLen * v.scale - 0.1
          if (out) dummy.scale.set(0.0001, 0.0001, 0.0001)
          else dummy.scale.set(TYPE_W[v.type] * 0.8, 0.14, 0.1)
          dummy.position.set(x + dx * noseOff, y + 0.78, z + dz * noseOff)
          dummy.updateMatrix()
          headMesh.setMatrixAt(v.gi, dummy.matrix)
          dummy.position.set(x - dx * noseOff, y + 0.85, z - dz * noseOff)
          dummy.updateMatrix()
          tailMesh.setMatrixAt(v.gi, dummy.matrix)
        }
      }
    }

    for (const t of TYPES) {
      const mesh = refs.current[t]
      if (mesh) mesh.instanceMatrix.needsUpdate = true
      const dark = darkRefs.current[t]
      if (dark) dark.instanceMatrix.needsUpdate = true
    }
    if (night) {
      if (headMesh) headMesh.instanceMatrix.needsUpdate = true
      if (tailMesh) tailMesh.instanceMatrix.needsUpdate = true
    }

    stats.total = data.vehicles.length
    stats.idle = idleCount
  })

  return (
    <group>
      {TYPES.map((t) => (
        <instancedMesh
          key={t}
          ref={(m) => (refs.current[t] = m)}
          args={[geoms[t].body, undefined, Math.max(1, data.counts[t])]}
          castShadow
          frustumCulled={false}
        >
          <meshStandardMaterial roughness={0.45} metalness={0.3} />
        </instancedMesh>
      ))}
      {TYPES.map((t) => (
        <instancedMesh
          key={`d${t}`}
          ref={(m) => (darkRefs.current[t] = m)}
          args={[geoms[t].dark, undefined, Math.max(1, data.counts[t])]}
          frustumCulled={false}
        >
          <meshStandardMaterial color="#15161a" roughness={0.3} metalness={0.5} />
        </instancedMesh>
      ))}
      <instancedMesh
        ref={headRef}
        args={[undefined, undefined, Math.max(1, data.vehicles.length)]}
        frustumCulled={false}
        visible={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#fffbe8"
          emissive="#fff3c4"
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={tailRef}
        args={[undefined, undefined, Math.max(1, data.vehicles.length)]}
        frustumCulled={false}
        visible={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#3d0703"
          emissive="#ff2b17"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  )
}

import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import InstancedBoxes from '../InstancedBoxes.jsx'
import { Label } from '../Landmarks.jsx'
import { sim } from '../trafficStore.js'
import { buildPath, inBounds, MAP_BOUND } from './geo.js'

// Namma Metro from real OSM rail ways: Yellow Line viaduct follows the
// mapped alignment, animated trains run along it and dwell at the real
// Central Silk Board station node. Ways tagged under construction render
// as bare pier rows (Blue Line); proposed lines are skipped.

const DECK_Y = 14.5
const DECK_W = 9
const RAIL_Y = 15.2
const TRACK_OFF = 2.1
const CRUISE = 20
const TRAIN_ACCEL = 1.1
const COACH_L = 22.2
const N_COACHES = 6
const DWELL = 11

function flatRibbon(path, w, y, positions, indices, startIndex) {
  let vi = startIndex
  const first = vi
  const stations = []
  for (let i = 0; i < path.cum.length; i++) {
    stations.push(path.cum[i])
    if (i < path.cum.length - 1) {
      const segLen = path.cum[i + 1] - path.cum[i]
      const nSub = Math.floor(segLen / 25)
      for (let k = 1; k <= nSub; k++) stations.push(path.cum[i] + (segLen * k) / (nSub + 1))
    }
  }
  const inside = []
  for (const s of stations) {
    const p = path.sample(s)
    inside.push(inBounds(p.x, p.z))
    const a = path.sample(Math.max(0, s - 0.5))
    const b = path.sample(Math.min(path.length, s + 0.5))
    let dx = a.dx + b.dx
    let dz = a.dz + b.dz
    const len = Math.hypot(dx, dz) || 1
    dx /= len
    dz /= len
    positions.push(p.x - dz * (w / 2), y, p.z + dx * (w / 2), p.x + dz * (w / 2), y, p.z - dx * (w / 2))
    vi += 2
  }
  for (let i = first; i < vi - 2; i += 2) {
    if (!inside[(i - first) / 2] || !inside[(i - first) / 2 + 1]) continue
    indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2)
  }
  return vi
}

function useMetroData(osm) {
  return useMemo(() => {
    const built = []
    const construction = []
    for (const r of osm.rails) {
      if (!r.p || r.p.length < 2) continue
      if (r.t === 'proposed') continue
      const path = buildPath(r.p)
      if (path.length < 20) continue
      if (r.t === 'construction') construction.push(path)
      else built.push(path)
    }

    // Viaduct deck + rail strips, merged (tiny y stagger between
    // overlapping parallel ways so they don't z-fight).
    const positions = []
    const indices = []
    let vi = 0
    built.forEach((path, i) => {
      vi = flatRibbon(path, DECK_W, DECK_Y + i * 0.04, positions, indices, vi)
      vi = flatRibbon(path, 1.4, RAIL_Y + i * 0.04, positions, indices, vi)
    })
    const deckGeo = new THREE.BufferGeometry()
    deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    deckGeo.setIndex(indices)
    deckGeo.computeVertexNormals()

    // Piers every 30 m under built viaduct; bare pier rows on construction.
    const piers = []
    const caps = []
    built.forEach((path) => {
      for (let s = 15; s < path.length; s += 30) {
        const p = path.sample(s)
        if (!inBounds(p.x, p.z)) continue
        piers.push({ pos: [p.x, (DECK_Y - 0.6) / 2, p.z], scale: [2.2, DECK_Y - 0.6, 2.2] })
        caps.push({ pos: [p.x, DECK_Y - 0.55, p.z], scale: [7.5, 1.0, 2.4], rotY: Math.atan2(p.dx, p.dz) })
      }
    })
    const bluePiers = []
    construction.forEach((path) => {
      for (let s = 5; s < path.length; s += 40) {
        const p = path.sample(s)
        if (!inBounds(p.x, p.z)) continue
        bluePiers.push({ pos: [p.x, 4.5, p.z], scale: [2.2, 9, 2.2] })
      }
    })

    // Train route: the longest built way. Trains dwell at the station node
    // nearest the junction (Central Silk Board).
    let route = null
    for (const path of built) if (!route || path.length > route.length) route = path

    let sStation = null
    let stationPos = null
    if (route && osm.stations.length) {
      let st = osm.stations[0]
      for (const s of osm.stations) {
        if (Math.hypot(s.x, s.z) < Math.hypot(st.x, st.z)) st = s
      }
      let best = { d2: Infinity, s: 0 }
      for (let s = 0; s <= route.length; s += 5) {
        const p = route.sample(s)
        const d2 = (p.x - st.x) ** 2 + (p.z - st.z) ** 2
        if (d2 < best.d2) best = { d2, s }
      }
      sStation = best.s
      const p = route.sample(best.s)
      stationPos = { x: p.x, z: p.z, rotY: Math.atan2(p.dx, p.dz), name: st.n }
    }

    return { deckGeo, piers, caps, bluePiers, route, sStation, stationPos }
  }, [osm])
}

function Coach() {
  return (
    <group>
      <mesh position={[0, RAIL_Y + 1.75, 0]} castShadow>
        <boxGeometry args={[2.9, 3.2, 21.4]} />
        <meshStandardMaterial color="#d4d6da" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, RAIL_Y + 2.45, 0]}>
        <boxGeometry args={[2.95, 0.9, 20.5]} />
        <meshStandardMaterial color="#1d232c" emissive="#9db8d9" emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, RAIL_Y + 1.05, 0]}>
        <boxGeometry args={[2.97, 0.45, 21.4]} />
        <meshStandardMaterial color="#f5c518" emissive="#f5c518" emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}

function Trains({ route, sStation }) {
  const coachRefs = useRef([])
  const trains = useMemo(() => {
    const trainLen = N_COACHES * COACH_L
    return [
      { rev: false, off: -TRACK_OFF, s: trainLen + 10, v: CRUISE, dwell: 0, stopped: false },
      { rev: true, off: -TRACK_OFF, s: trainLen + 10 + route.length / 2, v: CRUISE, dwell: 0, stopped: false },
    ]
  }, [route])

  useFrame((_, delta) => {
    const dtTotal = Math.min(delta, 0.05) * sim.speed
    const nSub = THREE.MathUtils.clamp(Math.ceil(dtTotal / 0.1), 1, 16)
    const dt = dtTotal / nSub
    const trainLen = N_COACHES * COACH_L
    const loop = route.length + trainLen // run off the end, wrap hidden

    trains.forEach((t, ti) => {
      // s = distance travelled by the train NOSE along its direction.
      const sStop = t.rev ? route.length - sStation : sStation
      for (let k = 0; k < nSub; k++) {
        if (t.dwell > 0) {
          t.dwell -= dt
          t.v = 0
          continue
        }
        let vT = CRUISE
        if (!t.stopped && sStop != null) {
          const d = sStop + trainLen / 2 - t.s // stop with train centred on the station
          if (d > 0 && d < 300) vT = Math.min(vT, Math.sqrt(2 * 0.9 * d) + 0.1)
          if (d <= 0.6 && d > -5) {
            t.stopped = true
            t.dwell = DWELL
            t.v = 0
            continue
          }
        }
        t.v = Math.min(vT, t.v + TRAIN_ACCEL * dt)
        t.s += t.v * dt
        if (t.s >= loop) {
          t.s -= loop
          t.stopped = false
        }
      }

      for (let c = 0; c < N_COACHES; c++) {
        const g = coachRefs.current[ti * N_COACHES + c]
        if (!g) continue
        const sCoach = t.s - c * COACH_L - COACH_L / 2
        if (sCoach < 0 || sCoach > route.length) {
          g.visible = false
          continue
        }
        g.visible = true
        const sWay = t.rev ? route.length - sCoach : sCoach
        const p = route.sample(sWay)
        if (Math.abs(p.x) > MAP_BOUND || Math.abs(p.z) > MAP_BOUND) {
          g.visible = false // deck is clipped at the map edge — hide with it
          continue
        }
        const dx = t.rev ? -p.dx : p.dx
        const dz = t.rev ? -p.dz : p.dz
        g.position.set(p.x + dz * t.off, 0, p.z - dx * t.off)
        g.rotation.y = Math.atan2(dx, dz)
      }
    })
  })

  return (
    <>
      {trains.map((_, ti) =>
        Array.from({ length: N_COACHES }, (_, c) => (
          <group key={`${ti}-${c}`} ref={(g) => (coachRefs.current[ti * N_COACHES + c] = g)}>
            <Coach />
          </group>
        ))
      )}
    </>
  )
}

export default function OsmMetro({ osm }) {
  const data = useMetroData(osm)

  return (
    <group>
      <mesh geometry={data.deckGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#8f8a7e" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <InstancedBoxes items={data.piers} color="#a09a8c" castShadow />
      <InstancedBoxes items={data.caps} color="#938d80" castShadow />
      <InstancedBoxes items={data.bluePiers} color="#b9b3a4" castShadow />

      {data.stationPos && (
        <group
          position={[data.stationPos.x, 0, data.stationPos.z]}
          rotation-y={data.stationPos.rotY}
        >
          {[-5.8, 5.8].map((dx) => (
            <mesh key={dx} position={[dx, RAIL_Y + 0.1, 0]} castShadow>
              <boxGeometry args={[4.5, 0.5, 130]} />
              <meshStandardMaterial color="#9aa0a6" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 21.5, 0]} castShadow>
            <boxGeometry args={[19, 0.6, 134]} />
            <meshStandardMaterial color="#3f5a6b" roughness={0.7} metalness={0.3} />
          </mesh>
          {[-55, -25, 25, 55].flatMap((cz) =>
            [-8.2, 8.2].map((cx) => (
              <mesh key={`${cx}-${cz}`} position={[cx, 18.5, cz]} castShadow>
                <boxGeometry args={[0.5, 5.5, 0.5]} />
                <meshStandardMaterial color="#7c848a" metalness={0.4} roughness={0.6} />
              </mesh>
            ))
          )}
          <Label
            pos={[0, 32, 0]}
            text={(data.stationPos.name || 'METRO STATION').toUpperCase()}
            sub="Yellow Line · Namma Metro"
            width={70}
          />
        </group>
      )}

      {data.route && data.sStation != null && (
        <Trains route={data.route} sStation={data.sStation} />
      )}

      {data.bluePiers.length > 0 && (
        <Label
          pos={[data.bluePiers[0].pos[0], 20, data.bluePiers[0].pos[2]]}
          text="BLUE LINE — UNDER CONSTRUCTION"
          width={72}
          opacity={0.8}
        />
      )}
    </group>
  )
}

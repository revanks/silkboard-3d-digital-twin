import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import InstancedBoxes from './InstancedBoxes.jsx'
import { Label } from './Landmarks.jsx'
import { sim } from './trafficStore.js'
import { mulberry32, randBetween } from '../utils.js'

// ── Namma Metro at Silk Board ──
// Yellow Line (RV Road–Bommasandra): elevated viaduct along the east side
// of Hosur Road with Central Silk Board station; animated trains.
// Blue Line (ORR): shown in its real state — under construction.

const VIA_X = 38 // viaduct centreline, east of the service road
const DECK_Y = 14.8
const RAIL_Y = 15.6
const STATION_Z = -130
const TRACK_OFF = 2.1
const CRUISE = 20 // m/s
const TRAIN_ACCEL = 1.1
const COACH_L = 22.2
const LOOP = 2600 // train path loops beyond the map edge so wraps are hidden

function makeStationTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 160
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1b2733'
  ctx.fillRect(0, 0, 1024, 160)
  ctx.fillStyle = '#f5c518'
  ctx.fillRect(0, 128, 1024, 32)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#f2f1e8'
  ctx.font = 'bold 64px sans-serif'
  ctx.fillText('CENTRAL SILK BOARD', 512, 78)
  ctx.font = 'bold 34px sans-serif'
  ctx.fillStyle = '#ffd9a8'
  ctx.fillText('ನಮ್ಮ ಮೆಟ್ರೋ · NAMMA METRO', 512, 118)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function Coach({ z }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, RAIL_Y + 1.75, 0]} castShadow>
        <boxGeometry args={[2.9, 3.2, 21.4]} />
        <meshStandardMaterial color="#d4d6da" roughness={0.35} metalness={0.4} />
      </mesh>
      {/* window band — softly lit so trains read at night */}
      <mesh position={[0, RAIL_Y + 2.45, 0]}>
        <boxGeometry args={[2.95, 0.9, 20.5]} />
        <meshStandardMaterial
          color="#1d232c"
          emissive="#9db8d9"
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
      {/* yellow line livery stripe */}
      <mesh position={[0, RAIL_Y + 1.05, 0]}>
        <boxGeometry args={[2.97, 0.45, 21.4]} />
        <meshStandardMaterial color="#f5c518" emissive="#f5c518" emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}

function Trains() {
  const refs = [useRef(), useRef()]
  const trains = useMemo(
    () => [
      // dir +1 heads south (+Z), stops at the station on the way
      { x: VIA_X - TRACK_OFF, dir: 1, s: 300, v: CRUISE, stopped: false, dwell: 0, sStop: STATION_Z + LOOP / 2 },
      { x: VIA_X + TRACK_OFF, dir: -1, s: 1500, v: CRUISE, stopped: false, dwell: 0, sStop: LOOP / 2 - STATION_Z },
    ],
    []
  )

  useFrame((_, delta) => {
    const dtTotal = Math.min(delta, 0.05) * sim.speed
    const nSub = THREE.MathUtils.clamp(Math.ceil(dtTotal / 0.1), 1, 16)
    const dt = dtTotal / nSub

    trains.forEach((t, i) => {
      for (let k = 0; k < nSub; k++) {
        if (t.dwell > 0) {
          t.dwell -= dt
          t.v = 0
          continue
        }
        let vT = CRUISE
        if (!t.stopped) {
          const d = t.sStop - t.s
          if (d > 0 && d < 300) vT = Math.min(vT, Math.sqrt(2 * 0.9 * d) + 0.1)
          if (d <= 0.6 && d > -5) {
            t.stopped = true
            t.dwell = 11
            t.v = 0
            continue
          }
        }
        t.v = Math.min(vT, t.v + TRAIN_ACCEL * dt)
        t.s += t.v * dt
        if (t.s >= LOOP) {
          t.s -= LOOP
          t.stopped = false
        }
      }
      const g = refs[i].current
      if (!g) return
      const z = t.dir > 0 ? -LOOP / 2 + t.s : LOOP / 2 - t.s
      g.position.z = z
      g.visible = Math.abs(z) < 1150
    })
  })

  const coachOffsets = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((k) => k * COACH_L)

  return (
    <>
      {trains.map((t, i) => (
        <group key={i} ref={refs[i]} position={[t.x, 0, 0]}>
          {coachOffsets.map((z) => (
            <Coach key={z} z={z} />
          ))}
        </group>
      ))}
    </>
  )
}

export default function Metro() {
  const stationTex = useMemo(() => makeStationTexture(), [])

  // Yellow Line viaduct piers (instanced)
  const { piers, caps } = useMemo(() => {
    const piers = []
    const caps = []
    for (let z = -990; z <= 990; z += 30) {
      piers.push({ pos: [VIA_X, 6.7, z], scale: [2.2, 13.4, 2.2] })
      caps.push({ pos: [VIA_X, 13.9, z], scale: [7.5, 1.0, 2.4] })
    }
    return { piers, caps }
  }, [])

  // Blue Line under construction along the ORR (south side)
  const { bluePiers, rebar, barricades } = useMemo(() => {
    const rng = mulberry32(2027)
    const bluePiers = []
    const rebar = []
    const barricades = []
    for (let x = -900; x <= 900; x += 40) {
      if (Math.abs(x) < 70) continue // junction kept clear
      const h = randBetween(rng, 6, 12)
      bluePiers.push({ pos: [x, h / 2, 37], scale: [2.2, h, 2.2] })
      if (rng() < 0.6) rebar.push({ pos: [x, h + 1.1, 37], scale: [0.9, 2.2, 0.9] })
      if (rng() < 0.7) {
        barricades.push({
          pos: [x + randBetween(rng, -8, 8), 0.75, 33.5],
          scale: [7, 1.1, 0.4],
        })
      }
    }
    return { bluePiers, rebar, barricades }
  }, [])

  return (
    <group>
      {/* ── Yellow Line viaduct ── */}
      <InstancedBoxes items={piers} color="#a09a8c" castShadow />
      <InstancedBoxes items={caps} color="#938d80" castShadow />
      <mesh position={[VIA_X, DECK_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[9, 1.4, 2000]} />
        <meshStandardMaterial color="#8f8a7e" roughness={0.9} />
      </mesh>
      {[-4.2, 4.2].map((dx) => (
        <mesh key={dx} position={[VIA_X + dx, DECK_Y + 1.1, 0]} castShadow>
          <boxGeometry args={[0.35, 0.9, 2000]} />
          <meshStandardMaterial color="#b5af9f" roughness={0.85} />
        </mesh>
      ))}
      {[-TRACK_OFF, TRACK_OFF].map((dx) => (
        <mesh key={`t${dx}`} position={[VIA_X + dx, RAIL_Y - 0.15, 0]}>
          <boxGeometry args={[1.6, 0.3, 2000]} />
          <meshStandardMaterial color="#55524a" roughness={0.9} />
        </mesh>
      ))}

      {/* ── Central Silk Board station ── */}
      <group position={[VIA_X, 0, STATION_Z]}>
        {[-5.8, 5.8].map((dx) => (
          <mesh key={`p${dx}`} position={[dx, RAIL_Y + 0.1, 0]} castShadow>
            <boxGeometry args={[4.5, 0.5, 130]} />
            <meshStandardMaterial color="#9aa0a6" roughness={0.9} />
          </mesh>
        ))}
        {/* roof + columns */}
        <mesh position={[0, 21.5, 0]} castShadow>
          <boxGeometry args={[19, 0.6, 134]} />
          <meshStandardMaterial color="#3f5a6b" roughness={0.7} metalness={0.3} />
        </mesh>
        {[-55, -25, 25, 55].flatMap((cz) =>
          [-8.2, 8.2].map((cx) => (
            <mesh key={`c${cx}-${cz}`} position={[cx, 18.5, cz]} castShadow>
              <boxGeometry args={[0.5, 5.5, 0.5]} />
              <meshStandardMaterial color="#7c848a" metalness={0.4} roughness={0.6} />
            </mesh>
          ))
        )}
        {/* name boards facing both sides */}
        {[-9.7, 9.7].map((dx) => (
          <mesh key={`b${dx}`} position={[dx, 19.8, 0]} rotation-y={dx < 0 ? -Math.PI / 2 : Math.PI / 2}>
            <planeGeometry args={[26, 4]} />
            <meshStandardMaterial map={stationTex} side={THREE.DoubleSide} roughness={0.7} />
          </mesh>
        ))}
        {/* access/stair tower down to the footpath */}
        <mesh position={[-8.5, 7.8, -45]} castShadow>
          <boxGeometry args={[6, 15.6, 9]} />
          <meshStandardMaterial color="#8d949a" roughness={0.85} />
        </mesh>
      </group>

      {/* ── Trains ── */}
      <Trains />

      {/* ── Blue Line construction on ORR ── */}
      <InstancedBoxes items={bluePiers} color="#b9b3a4" castShadow />
      <InstancedBoxes items={rebar} color="#7a5b3a" />
      <InstancedBoxes items={barricades} color="#e0642a" />

      {/* ── Labels ── */}
      <Label pos={[VIA_X, 32, STATION_Z]} text="CENTRAL SILK BOARD METRO" sub="Yellow Line" width={70} />
      <Label pos={[350, 24, 37]} text="BLUE LINE — UNDER CONSTRUCTION" width={72} opacity={0.8} />
    </group>
  )
}

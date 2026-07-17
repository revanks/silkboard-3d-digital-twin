import React, { useMemo } from 'react'
import InstancedBoxes from './InstancedBoxes.jsx'
import { CFG } from '../config.js'

// ── Road network geometry (metres, junction at origin) ──
// Hosur Road (NH-44): along the Z axis, dual 3-lane carriageway + service roads.
// Outer Ring Road:    along the X axis, dual 3-lane carriageway.
const L = CFG.AREA_SIZE // full length of each corridor

const HOSUR = { half: 17, medianHalf: 0.6 } // 34 m wide main carriageway
const ORR = { half: 13, medianHalf: 0.6 } // 26 m wide

const ASPHALT = '#37373b'
const ASPHALT_2 = '#3d3d42'
const CONCRETE = '#9b9384'
const FOOTPATH = '#8a857b'

export default function Roads({ envMode = 'day' }) {
  // Rain: darker asphalt with low roughness + a touch of metalness for
  // that wet-sheen specular pickup from the overcast light.
  const wet = envMode === 'rain'
  const mainColor = wet ? '#232427' : ASPHALT
  const secColor = wet ? '#26272b' : ASPHALT_2
  const roadRough = wet ? 0.35 : 0.95
  const roadMetal = wet ? 0.18 : 0
  // Dashed lane-divider markings (one InstancedMesh for everything white).
  const markings = useMemo(() => {
    const items = []
    const dash = { len: 2.4, gap: 3.8 }
    const step = dash.len + dash.gap

    // Hosur Rd lane dividers: two per carriageway at x = ±4.9, ±9.3
    for (const x of [-9.3, -4.9, 4.9, 9.3]) {
      for (let z = -L / 2; z < L / 2; z += step) {
        if (Math.abs(z) < 36) continue // keep the junction box clean
        items.push({ pos: [x, 0.31, z], scale: [0.18, 0.03, dash.len] })
      }
    }
    // ORR lane dividers at z = ±4.4, ±8.2
    for (const z of [-8.2, -4.4, 4.4, 8.2]) {
      for (let x = -L / 2; x < L / 2; x += step) {
        if (Math.abs(x) < 36) continue
        items.push({ pos: [x, 0.31, z], scale: [dash.len, 0.03, 0.18] })
      }
    }

    // Zebra crossings on all four approaches
    for (const zSign of [-1, 1]) {
      for (let x = -13; x <= 13; x += 1.7) {
        items.push({ pos: [x, 0.31, 29 * zSign], scale: [0.95, 0.03, 3.4] })
      }
    }
    for (const xSign of [-1, 1]) {
      for (let z = -11; z <= 11; z += 1.7) {
        items.push({ pos: [29 * xSign, 0.31, z], scale: [3.4, 0.03, 0.95] })
      }
    }
    return items
  }, [])

  // Footpaths are split so they never cut across the junction.
  const sideLen = (L - 64) / 2 // each half-corridor segment
  const sideCtr = 32 + sideLen / 2

  return (
    <group>
      {/* ── Hosur Road main carriageway ── */}
      <mesh position={[0, 0.125, 0]} receiveShadow>
        <boxGeometry args={[HOSUR.half * 2, 0.25, L]} />
        <meshStandardMaterial color={mainColor} roughness={roadRough} metalness={roadMetal} />
      </mesh>

      {/* ── Outer Ring Road (slightly taller top so overlaps never z-fight) ── */}
      <mesh position={[0, 0.135, 0]} receiveShadow>
        <boxGeometry args={[L, 0.27, ORR.half * 2]} />
        <meshStandardMaterial color={secColor} roughness={roadRough} metalness={roadMetal} />
      </mesh>

      {/* ── Hosur Rd service roads (Silk Board's parallel slow lanes) ── */}
      {[-23.5, 23.5].map((x) => (
        <mesh key={`svc${x}`} position={[x, 0.11, 0]} receiveShadow>
          <boxGeometry args={[7, 0.22, L]} />
          <meshStandardMaterial color={secColor} roughness={roadRough} metalness={roadMetal} />
        </mesh>
      ))}

      {/* ── Medians (broken at the junction) ── */}
      {[-1, 1].map((s) => (
        <mesh key={`hm${s}`} position={[0, 0.55, s * sideCtr]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.6, sideLen]} />
          <meshStandardMaterial color={CONCRETE} roughness={0.9} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`om${s}`} position={[s * sideCtr, 0.57, 0]} castShadow receiveShadow>
          <boxGeometry args={[sideLen, 0.6, 1.2]} />
          <meshStandardMaterial color={CONCRETE} roughness={0.9} />
        </mesh>
      ))}

      {/* ── Footpaths: inner + outer along Hosur Rd, one pair along ORR ── */}
      {[-1, 1].flatMap((zs) =>
        [-28.5, -18.5, 18.5, 28.5].map((x) => (
          <mesh
            key={`fpH${x}-${zs}`}
            position={[x, 0.22, zs * sideCtr]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[3, 0.45, sideLen]} />
            <meshStandardMaterial color={FOOTPATH} roughness={1} />
          </mesh>
        ))
      )}
      {[-1, 1].flatMap((xs) =>
        [-14.5, 14.5].map((z) => (
          <mesh
            key={`fpO${z}-${xs}`}
            position={[xs * sideCtr, 0.22, z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[sideLen, 0.45, 3]} />
            <meshStandardMaterial color={FOOTPATH} roughness={1} />
          </mesh>
        ))
      )}

      {/* ── All white road markings, one draw call ── */}
      <InstancedBoxes items={markings} color="#d9d4c8" roughness={0.8} />
    </group>
  )
}

import React, { useMemo } from 'react'
import { CFG } from '../config.js'

// The Silk Board flyover carries Hosur Road traffic over the ORR junction.
// Deck runs along Z: flat 9 m above grade for |z| <= 90, ramps down to
// ground level at |z| = 320 with a smoothstep profile.
const DECK_W = 16
const DECK_H = 9
const FLAT = 90
const END = 320
const SEG = 10

export function flyoverHeight(z) {
  const t = Math.abs(z)
  if (t <= FLAT) return DECK_H
  if (t >= END) return 0
  const s = (END - t) / (END - FLAT)
  return DECK_H * s * s * (3 - 2 * s)
}

export default function Flyover() {
  const segments = useMemo(() => {
    const segs = []
    for (let zc = -END + SEG / 2; zc < END; zc += SEG) {
      const h1 = flyoverHeight(zc - SEG / 2)
      const h2 = flyoverHeight(zc + SEG / 2)
      const mid = (h1 + h2) / 2
      if (mid < 0.15) continue
      segs.push({
        z: zc,
        y: mid,
        pitch: -Math.atan2(h2 - h1, SEG),
      })
    }
    return segs
  }, [])

  const piers = useMemo(() => {
    const list = []
    for (let z = -300; z <= 300; z += 25) {
      const h = flyoverHeight(z)
      if (h > 2.2) list.push({ z, h })
    }
    return list
  }, [])

  return (
    <group>
      {segments.map((s, i) => (
        <group key={i} position={[0, s.y, s.z]} rotation-x={s.pitch}>
          {/* deck */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[DECK_W, 0.9, SEG + 0.6]} />
            <meshStandardMaterial color="#52525a" roughness={0.92} />
          </mesh>
          {/* crash barriers */}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * (DECK_W / 2 - 0.25), 0.9, 0]}
              castShadow
            >
              <boxGeometry args={[0.35, 1.0, SEG + 0.6]} />
              <meshStandardMaterial color="#c2b9a6" roughness={0.85} />
            </mesh>
          ))}
          {/* deck centre line */}
          <mesh position={[0, 0.47, 0]}>
            <boxGeometry args={[0.2, 0.03, SEG * 0.55]} />
            <meshStandardMaterial color="#d9d4c8" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {piers.map((p, i) => (
        <group key={`p${i}`} position={[0, 0, p.z]}>
          {/* pier column */}
          <mesh position={[0, (p.h - 0.45) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.6, p.h - 0.45, 1.8]} />
            <meshStandardMaterial color="#8e887b" roughness={0.95} />
          </mesh>
          {/* cap beam */}
          <mesh position={[0, p.h - 0.85, 0]} castShadow>
            <boxGeometry args={[DECK_W - 3, 0.8, 2.2]} />
            <meshStandardMaterial color="#847e71" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

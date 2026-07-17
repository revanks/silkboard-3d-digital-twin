import React, { useMemo } from 'react'
import * as THREE from 'three'
import { LANDMARK_BUILDINGS } from './landmarkData.js'

// Floating name labels (canvas-texture sprites — offline-safe) plus
// Madiwala Lake. Directions match reality relative to the junction:
// -Z = north (Madiwala/city side), +Z = south (Electronic City),
// +X = east (HSR Layout), -X = west (BTM Layout).

function makeLabelTexture(main, sub) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 14
  ctx.lineWidth = 8
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'
  ctx.font = 'bold 86px sans-serif'
  const mainY = sub ? 130 : 160
  ctx.strokeText(main, 512, mainY)
  ctx.fillStyle = '#f4efe2'
  ctx.fillText(main, 512, mainY)
  if (sub) {
    ctx.font = 'bold 52px sans-serif'
    ctx.lineWidth = 6
    ctx.strokeText(sub, 512, 205)
    ctx.fillStyle = '#ffd9a8'
    ctx.fillText(sub, 512, 205)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function Label({ pos, text, sub, width = 70, opacity = 0.95 }) {
  const tex = useMemo(() => makeLabelTexture(text, sub), [text, sub])
  return (
    <sprite position={pos} scale={[width, width / 4, 1]}>
      <spriteMaterial map={tex} transparent opacity={opacity} depthWrite={false} fog={false} />
    </sprite>
  )
}

const DISTRICTS = [
  ['BTM LAYOUT', -620, -260],
  ['HSR LAYOUT', 620, -180],
  ['MADIWALA', -140, -740],
  ['KORAMANGALA', -420, -900],
  ['BOMMANAHALLI', 140, 780],
  ['ROOPENA AGRAHARA', 180, 430],
]

const ROADS = [
  ['HOSUR ROAD · NH-44', 0, 620],
  ['HOSUR ROAD · NH-44', 0, -620],
  ['OUTER RING ROAD', 620, 0],
  ['OUTER RING ROAD', -620, 0],
]

// osmMode: real OSM geometry supplies the lake, buildings and POI labels —
// keep only the district/road/junction wayfinding labels.
export default function Landmarks({ osmMode = false }) {
  return (
    <group>
      {/* ── Madiwala Lake ── */}
      {!osmMode && (
      <group position={[-480, 0, -660]}>
        <mesh rotation-x={-Math.PI / 2} position-y={0.03} scale={[215, 175, 1]}>
          <circleGeometry args={[1, 48]} />
          <meshStandardMaterial color="#5d6b4f" roughness={1} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.06} scale={[205, 165, 1]}>
          <circleGeometry args={[1, 48]} />
          <meshStandardMaterial color="#2e5d7d" roughness={0.15} metalness={0.35} />
        </mesh>
      </group>
      )}

      {/* ── Area labels ── */}
      {DISTRICTS.map(([name, x, z]) => (
        <Label key={name + x} pos={[x, 72, z]} text={name} width={115} opacity={0.85} />
      ))}

      {/* ── Named landmark buildings ── */}
      {!osmMode && LANDMARK_BUILDINGS.map((b) => (
        <group key={b.name} position={[b.x, 0, b.z]}>
          <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.color} roughness={0.85} />
          </mesh>
          <mesh position={[0, b.h + 0.18, 0]} castShadow>
            <boxGeometry args={[b.w + 0.6, 0.4, b.d + 0.6]} />
            <meshStandardMaterial color="#8a8175" roughness={1} />
          </mesh>
          <Label pos={[0, b.h + 16, 0]} text={b.name} sub={b.sub} width={68} />
        </group>
      ))}
      {!osmMode && <Label pos={[-480, 26, -660]} text="MADIWALA LAKE" width={72} />}
      <Label pos={[0, 30, 0]} text="SILK BOARD JUNCTION" sub="Hosur Rd × Outer Ring Rd" width={78} />

      {/* ── Road labels ── */}
      {ROADS.map(([name, x, z], i) => (
        <Label key={name + i} pos={[x, 24, z]} text={name} width={58} opacity={0.65} />
      ))}
    </group>
  )
}

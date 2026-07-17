import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { flow } from './trafficStore.js'

// Emissive strips along both corridors near the junction whose colour is
// driven by the live congestion ratio (red = jammed, green = flowing).
const STRIPS = [
  // Hosur Rd edges
  { pos: [17.7, 0.35, 190], scale: [0.5, 0.06, 300] },
  { pos: [-17.7, 0.35, 190], scale: [0.5, 0.06, 300] },
  { pos: [17.7, 0.35, -190], scale: [0.5, 0.06, 300] },
  { pos: [-17.7, 0.35, -190], scale: [0.5, 0.06, 300] },
  // ORR edges
  { pos: [190, 0.35, 13.7], scale: [300, 0.06, 0.5] },
  { pos: [-190, 0.35, 13.7], scale: [300, 0.06, 0.5] },
  { pos: [190, 0.35, -13.7], scale: [300, 0.06, 0.5] },
  { pos: [-190, 0.35, -13.7], scale: [300, 0.06, 0.5] },
]

export default function CongestionRibbons({ onJunctionClick }) {
  const target = useMemo(() => new THREE.Color(), [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#222222',
        emissive: '#d97a1f',
        emissiveIntensity: 1.5,
        toneMapped: false,
        roughness: 0.6,
      }),
    []
  )

  useFrame(() => {
    // ratio 0.2 → red, 0.85 → green, eased so changes feel organic
    const t = THREE.MathUtils.clamp((flow.ratio - 0.2) / 0.65, 0, 1)
    target.setHSL(t * 0.33, 0.95, 0.5)
    material.emissive.lerp(target, 0.04)
  })

  return (
    <group>
      {STRIPS.map((s, i) => (
        <mesh key={i} position={s.pos} scale={s.scale} material={material}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      ))}
      {/* Invisible click target over the junction — opens the inspect panel */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.6, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onJunctionClick && onJunctionClick()
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <circleGeometry args={[45, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

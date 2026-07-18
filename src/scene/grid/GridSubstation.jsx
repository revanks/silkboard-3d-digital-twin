import React, { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Label } from '../Landmarks.jsx'
import { reliefY } from './relief.js'

// Cyan accent (distinct from OsmHighlights.jsx's amber company beacons) so the one substation reads
// as "grid infrastructure", not a commercial landmark, at a glance across the scene.
const GLOW = '#38bdf8'
const YARD_H = 3
const YARD_W = 14
const YARD_D = 14

// Hero treatment for the single real substation, reusing OsmHighlights.jsx's proven pulsing-glow /
// light-beam / bobbing-pin / label idiom (there's only one of these, so it doesn't need instancing).
export default function GridSubstation({ grid, onAssetClick }) {
  const sub = grid.substation
  const beamRef = useRef()
  const pinRef = useRef()
  const baseY = reliefY(sub.y ?? 0)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.8)
    if (beamRef.current) beamRef.current.material.opacity = 0.12 + 0.16 * pulse
    if (pinRef.current) {
      pinRef.current.position.y = baseY + YARD_H + 14 + Math.sin(t * 1.8) * 1.2
      pinRef.current.rotation.y = t * 1.2
    }
  })

  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        onAssetClick?.('substation', sub)
      }}
    >
      {/* fenced switchyard pad */}
      <mesh position={[sub.x, baseY + YARD_H / 2, sub.z]} castShadow receiveShadow>
        <boxGeometry args={[YARD_W, YARD_H, YARD_D]} />
        <meshStandardMaterial color="#7a8088" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* gantry / bus-bar structure */}
      <mesh position={[sub.x, baseY + YARD_H + 3, sub.z]} castShadow>
        <boxGeometry args={[YARD_W * 0.7, 1, 1]} />
        <meshStandardMaterial color="#3d4148" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* vertical beacon, spottable from across the 2km scene */}
      <mesh ref={beamRef} position={[sub.x, baseY + YARD_H + 25, sub.z]}>
        <cylinderGeometry args={[1.6, 2.6, 50, 12, 1, true]} />
        <meshBasicMaterial
          color={GLOW}
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* bobbing pin */}
      <group ref={pinRef} position={[sub.x, baseY + YARD_H + 14, sub.z]}>
        <mesh>
          <octahedronGeometry args={[3.2]} />
          <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      </group>
      <Label
        pos={[sub.x, baseY + YARD_H + 34, sub.z]}
        text="SUBSTATION"
        sub={`${sub.nTransformers} transformers · ${sub.totalCustomers.toLocaleString()} customers`}
        width={90}
      />
    </group>
  )
}

import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { CFG } from '../config.js'
import { flyoverHeight } from './Flyover.jsx'
import { PHASES, signal } from './trafficStore.js'

// Streetlights (instanced poles + emissive heads that catch the bloom),
// traffic signals at the junction, and a green highway signboard.

function useStreetlightData() {
  return useMemo(() => {
    const half = CFG.AREA_SIZE / 2
    const spots = [] // single-head side poles
    const masts = [] // double-arm median masts on the ORR
    // Hosur Rd — on the inner footpaths
    for (let z = -half + 30; z < half - 30; z += 45) {
      if (Math.abs(z) < 45) continue
      spots.push({ x: -18.5, y: 0, z })
      spots.push({ x: 18.5, y: 0, z })
    }
    // ORR — double-arm masts on the central median (Indian-highway style)
    for (let x = -half + 30; x < half - 30; x += 42) {
      if (Math.abs(x) < 70) continue
      masts.push({ x })
    }
    // Flyover deck lights
    for (let z = -260; z <= 260; z += 40) {
      const h = flyoverHeight(z)
      if (h < 1) continue
      spots.push({ x: -7.5, y: h + 0.45, z })
      spots.push({ x: 7.5, y: h + 0.45, z })
    }
    const heads = [
      ...spots.map((s) => ({ x: s.x, y: s.y + 9.1, z: s.z })),
      ...masts.flatMap((m) => [
        { x: m.x, y: 9.5, z: -1.7 },
        { x: m.x, y: 9.5, z: 1.7 },
      ]),
    ]
    const pools = [
      ...spots.filter((s) => s.y === 0).map((s) => ({ x: s.x, z: s.z })),
      ...masts.map((m) => ({ x: m.x, z: 0 })),
    ]
    return { spots, masts, heads, pools }
  }, [])
}

const HEAD_INTENSITY = { day: 1.3, night: 4.5, rain: 2.6 }

function Streetlights({ envMode = 'day' }) {
  const poleRef = useRef()
  const mastPoleRef = useRef()
  const armRef = useRef()
  const headRef = useRef()
  const poolRef = useRef()
  const { spots, masts, heads, pools } = useStreetlightData()

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()

    const poles = poleRef.current
    if (poles) {
      spots.forEach((s, i) => {
        dummy.position.set(s.x, s.y + 4.5, s.z)
        dummy.scale.set(1, 1, 1)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        poles.setMatrixAt(i, dummy.matrix)
      })
      poles.instanceMatrix.needsUpdate = true
    }

    const mastPoles = mastPoleRef.current
    const arms = armRef.current
    if (mastPoles && arms) {
      masts.forEach((m, i) => {
        dummy.position.set(m.x, 5.05, 0)
        dummy.scale.set(1, 1, 1)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        mastPoles.setMatrixAt(i, dummy.matrix)
        dummy.position.set(m.x, 9.55, 0)
        dummy.updateMatrix()
        arms.setMatrixAt(i, dummy.matrix)
      })
      mastPoles.instanceMatrix.needsUpdate = true
      arms.instanceMatrix.needsUpdate = true
    }

    const headMesh = headRef.current
    if (headMesh) {
      heads.forEach((hd, i) => {
        dummy.position.set(hd.x, hd.y, hd.z)
        dummy.scale.set(1, 1, 1)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        headMesh.setMatrixAt(i, dummy.matrix)
      })
      headMesh.instanceMatrix.needsUpdate = true
    }

    const poolMesh = poolRef.current
    if (poolMesh) {
      pools.forEach((p, i) => {
        dummy.position.set(p.x, 0.52, p.z)
        dummy.scale.set(1, 1, 1)
        dummy.rotation.set(-Math.PI / 2, 0, 0) // lay the discs flat
        dummy.updateMatrix()
        poolMesh.setMatrixAt(i, dummy.matrix)
      })
      dummy.rotation.set(0, 0, 0)
      poolMesh.instanceMatrix.needsUpdate = true
    }
  }, [spots, masts, heads, pools])

  return (
    <group>
      <instancedMesh ref={poleRef} args={[undefined, undefined, Math.max(1, spots.length)]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 9, 6]} />
        <meshStandardMaterial color="#4d4f52" roughness={0.7} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={mastPoleRef} args={[undefined, undefined, Math.max(1, masts.length)]} castShadow>
        <cylinderGeometry args={[0.11, 0.18, 9, 6]} />
        <meshStandardMaterial color="#4d4f52" roughness={0.7} metalness={0.4} />
      </instancedMesh>
      {/* double arms across the median */}
      <instancedMesh ref={armRef} args={[undefined, undefined, Math.max(1, masts.length)]}>
        <boxGeometry args={[0.22, 0.14, 3.9]} />
        <meshStandardMaterial color="#4d4f52" roughness={0.7} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, Math.max(1, heads.length)]}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshStandardMaterial
          color="#ffd9a0"
          emissive="#ffb066"
          emissiveIntensity={HEAD_INTENSITY[envMode]}
          toneMapped={false}
        />
      </instancedMesh>
      {/* Warm light pools under the poles — night only */}
      <instancedMesh
        ref={poolRef}
        args={[undefined, undefined, Math.max(1, pools.length)]}
        visible={envMode === 'night'}
        frustumCulled={false}
      >
        <circleGeometry args={[5, 20]} />
        <meshBasicMaterial
          color="#8f5a1e"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  )
}

// Tall high-mast floodlights at the four junction corners — a Silk Board
// signature.
function HighMasts({ envMode }) {
  const intensity = envMode === 'night' ? 5 : envMode === 'rain' ? 2.5 : 1.2
  return (
    <group>
      {[[60, 60], [-60, 60], [60, -60], [-60, -60]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 13, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.5, 26, 8]} />
            <meshStandardMaterial color="#5a5d60" roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh position={[0, 25.6, 0]}>
            <cylinderGeometry args={[1.9, 1.9, 0.5, 12]} />
            <meshStandardMaterial
              color="#fff2cf"
              emissive="#ffe2a8"
              emissiveIntensity={intensity}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// BMTC bus shelters on the Hosur Rd service-road footpaths.
function BusShelters() {
  return (
    <group>
      {[
        { pos: [29.5, 0, -120], rot: 0 },
        { pos: [-29.5, 0, 130], rot: Math.PI },
      ].map((s, i) => (
        <group key={i} position={s.pos} rotation-y={s.rot}>
          <mesh position={[0, 2.7, 0]} castShadow>
            <boxGeometry args={[2.4, 0.25, 7.5]} />
            <meshStandardMaterial color="#2b5f9e" roughness={0.6} />
          </mesh>
          {[-3.2, 3.2].map((z) => (
            <mesh key={z} position={[0.9, 1.35, z]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 2.7, 6]} />
              <meshStandardMaterial color="#7c848a" metalness={0.4} roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0.9, 1.3, 0]}>
            <boxGeometry args={[0.12, 1.5, 7.3]} />
            <meshStandardMaterial color="#aebfd0" roughness={0.7} />
          </mesh>
          <mesh position={[-0.2, 0.85, 0]} castShadow>
            <boxGeometry args={[0.55, 0.14, 6.2]} />
            <meshStandardMaterial color="#8d949a" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Shrub rows on the central medians.
function MedianShrubs() {
  const ref = useRef()
  const shrubs = useMemo(() => {
    const list = []
    for (let z = 335; z < 980; z += 9) {
      list.push({ x: 0, z })
      list.push({ x: 0, z: -z })
    }
    for (let x = 72; x < 980; x += 9) {
      list.push({ x, z: 0 })
      list.push({ x: -x, z: 0 })
    }
    return list
  }, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    shrubs.forEach((s, i) => {
      dummy.position.set(s.x, 1.0, s.z)
      const sc = 0.8 + (i % 5) * 0.12
      dummy.scale.set(sc * 1.3, sc * 0.8, sc * 1.3)
      dummy.rotation.set(0, i * 0.7, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      c.setHSL(0.3, 0.45, 0.2 + (i % 4) * 0.02)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [shrubs])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, shrubs.length)]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial roughness={0.95} />
    </instancedMesh>
  )
}

const LAMPS = [
  { kind: 'R', y: 0.62, color: '#ff2a1a' },
  { kind: 'A', y: 0, color: '#ffb020' },
  { kind: 'G', y: -0.62, color: '#22e04a' },
]

const POSTS = [
  { pos: [16.5, 0, 34], rotY: Math.PI, group: 'ns' },
  { pos: [-16.5, 0, -34], rotY: 0, group: 'ns' },
  { pos: [34, 0, -12.5], rotY: Math.PI / 2, group: 'ew' },
  { pos: [-34, 0, 12.5], rotY: -Math.PI / 2, group: 'ew' },
]

function TrafficSignals() {
  // Lamp materials animate with the live signal cycle from trafficStore.
  const lampMats = useRef([])

  useFrame(() => {
    const phase = PHASES[signal.idx]
    lampMats.current.forEach((l) => {
      if (!l) return
      const on = phase[l.group] === l.kind
      l.mat.emissiveIntensity = on ? 3.4 : 0.05
      l.mat.toneMapped = !on
    })
  })

  return (
    <group>
      {POSTS.map((p, pi) => (
        <group key={pi} position={p.pos} rotation-y={p.rotY}>
          <mesh position={[0, 3, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.13, 6, 6]} />
            <meshStandardMaterial color="#3c3e40" roughness={0.7} metalness={0.4} />
          </mesh>
          <group position={[0, 5.6, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.55, 2.0, 0.35]} />
              <meshStandardMaterial color="#181a1c" roughness={0.6} />
            </mesh>
            {LAMPS.map((l, li) => (
              <mesh key={li} position={[0, l.y, 0.2]}>
                <sphereGeometry args={[0.17, 10, 8]} />
                <meshStandardMaterial
                  ref={(m) => {
                    if (m) lampMats.current[pi * 3 + li] = { mat: m, group: p.group, kind: l.kind }
                  }}
                  color={l.color}
                  emissive={l.color}
                  emissiveIntensity={0.05}
                />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  )
}

function makeSignTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 288
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0a5c2c'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = '#e9e9e0'
  ctx.lineWidth = 10
  ctx.strokeRect(14, 14, c.width - 28, c.height - 28)
  ctx.fillStyle = '#f2f1e8'
  ctx.textAlign = 'center'
  ctx.font = 'bold 84px sans-serif'
  ctx.fillText('CENTRAL SILK BOARD', c.width / 2, 128)
  ctx.font = 'bold 56px sans-serif'
  ctx.fillText('↑ Electronic City   |   HSR Layout →', c.width / 2, 222)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function SignGantry() {
  const tex = useMemo(() => makeSignTexture(), [])
  return (
    <group position={[0, 0, 390]}>
      {[-9, 9].map((x) => (
        <mesh key={x} position={[x, 3.6, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 7.2, 8]} />
          <meshStandardMaterial color="#5a5d60" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 7.2, 0]} castShadow>
        <boxGeometry args={[19, 0.45, 0.45]} />
        <meshStandardMaterial color="#5a5d60" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0, 8.9, 0]} castShadow>
        <boxGeometry args={[13, 3.4, 0.2]} />
        <meshStandardMaterial map={tex} roughness={0.75} />
      </mesh>
    </group>
  )
}

// In OSM mode the real network provides its own streetlights and the
// procedural road furniture no longer lines up — keep only the junction
// signature pieces (high masts + working signals).
export default function StreetFurniture({ envMode = 'day', osmMode = false }) {
  return (
    <group>
      {!osmMode && <Streetlights envMode={envMode} />}
      <HighMasts envMode={envMode} />
      <TrafficSignals />
      {!osmMode && <SignGantry />}
      {!osmMode && <BusShelters />}
      {!osmMode && <MedianShrubs />}
    </group>
  )
}

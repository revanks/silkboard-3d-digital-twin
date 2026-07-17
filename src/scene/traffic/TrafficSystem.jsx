import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { makeVehicleGeometries } from './vehicleGeometries.js'
import { buildTraffic, TYPES, HALF } from './buildTraffic.js'
import { PHASES, signal, stepSignal, sim, flow, stats, env } from '../trafficStore.js'
import { flyoverHeight } from '../Flyover.jsx'

const ACCEL = 3 // m/s²
const DECEL = 8 // m/s²
const MIN_GAP = 1.6 // m bumper-to-bumper when queued
const MAX_SUBSTEP = 0.08 // s — keeps 10×/60× time-lapse physics stable
const TYPE_W = { bike: 0.5, car: 1.55, suv: 1.7, auto: 1.25, bus: 2.3, truck: 2.2 }

export default function TrafficSystem() {
  const data = useMemo(() => {
    const d = buildTraffic()
    d.vehicles.forEach((v, i) => (v.gi = i)) // global slot for light bars
    return d
  }, [])
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

  // One-time per-instance colours + dynamic matrix buffers.
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
        const scale = lane.elevated ? flow.flyoverScale : flow.groundScale
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
      for (const v of lane.vehicles) {
        if (v.speed < 0.5) idleCount++
        const mesh = refs.current[v.type]
        if (!mesh) continue

        const coord = lane.dir > 0 ? -HALF + v.s : HALF - v.s
        let x, z
        let y = lane.y
        let pitch = 0
        let fx = 0
        let fz = 0
        if (lane.axis === 'z') {
          z = coord
          x = lane.lateral + v.jit
          fz = lane.dir
          if (lane.elevated) {
            const h = flyoverHeight(z)
            y = 0.26 + h + 0.21 * Math.min(1, h / 0.5)
            const dh = (flyoverHeight(z + 2 * lane.dir) - flyoverHeight(z - 2 * lane.dir)) / 4
            pitch = -Math.atan(dh)
          }
          dummy.rotation.set(pitch, lane.dir > 0 ? 0 : Math.PI, 0)
        } else {
          x = coord
          z = lane.lateral + v.jit
          fx = lane.dir
          dummy.rotation.set(0, lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0)
        }
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(v.scale)
        dummy.updateMatrix()
        mesh.setMatrixAt(v.slot, dummy.matrix)
        const dark = darkRefs.current[v.type]
        if (dark) dark.setMatrixAt(v.slot, dummy.matrix)

        if (night && headMesh && tailMesh) {
          const off = v.halfLen * v.scale - 0.1
          dummy.scale.set(TYPE_W[v.type] * 0.8, 0.14, 0.1)
          dummy.position.set(x + fx * off, y + 0.78, z + fz * off)
          dummy.updateMatrix()
          headMesh.setMatrixAt(v.gi, dummy.matrix)
          dummy.position.set(x - fx * off, y + 0.85, z - fz * off)
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
      {/* wheels / glass / windshields — same matrices, dark glossy material */}
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
      {/* Headlight / taillight bars — visible at night only */}
      <instancedMesh
        ref={headRef}
        args={[undefined, undefined, data.vehicles.length]}
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
        args={[undefined, undefined, data.vehicles.length]}
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

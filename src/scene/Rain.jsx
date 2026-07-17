import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { mulberry32 } from '../utils.js'

// Particle rain in a volume that follows the camera, so it always
// surrounds the view without simulating the whole 2 km area.
const COUNT = 9000
const AREA = 700
const HEIGHT = 260

export default function Rain() {
  const pointsRef = useRef()

  const positions = useMemo(() => {
    const rng = mulberry32(8181)
    const arr = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (rng() - 0.5) * AREA
      arr[i * 3 + 1] = rng() * HEIGHT
      arr[i * 3 + 2] = (rng() - 0.5) * AREA
    }
    return arr
  }, [])

  useFrame((state, delta) => {
    const pts = pointsRef.current
    if (!pts) return
    const dt = Math.min(delta, 0.05)
    const arr = pts.geometry.attributes.position.array
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] -= (55 + (i % 7) * 4) * dt
      if (arr[i] < 0) arr[i] += HEIGHT
    }
    pts.geometry.attributes.position.needsUpdate = true
    pts.position.x = state.camera.position.x
    pts.position.z = state.camera.position.z
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#b9c4d0"
        size={0.5}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  )
}

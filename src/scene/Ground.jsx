import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { CFG } from '../config.js'
import { mulberry32, randBetween } from '../utils.js'

// Base earth plane plus large subtle colour patches so the ground
// doesn't read as one flat sheet.
export default function Ground() {
  const patchesRef = useRef()

  const patches = useMemo(() => {
    const rng = mulberry32(1337)
    const list = []
    const half = CFG.AREA_SIZE / 2
    for (let i = 0; i < 140; i++) {
      list.push({
        x: randBetween(rng, -half, half),
        z: randBetween(rng, -half, half),
        w: randBetween(rng, 60, 180),
        d: randBetween(rng, 60, 180),
        shade: randBetween(rng, -0.06, 0.06),
      })
    }
    return list
  }, [])

  useLayoutEffect(() => {
    const mesh = patchesRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const base = new THREE.Color('#8f836c')
    const c = new THREE.Color()
    patches.forEach((p, i) => {
      dummy.position.set(p.x, 0.02 + i * 0.0002, p.z)
      dummy.scale.set(p.w, 0.02, p.d)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      c.copy(base).offsetHSL(0.008 * p.shade * 10, p.shade * 0.5, p.shade)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [patches])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[CFG.AREA_SIZE + 600, CFG.AREA_SIZE + 600]} />
        <meshStandardMaterial color="#8f836c" roughness={1} metalness={0} />
      </mesh>
      <instancedMesh
        ref={patchesRef}
        args={[undefined, undefined, patches.length]}
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8f836c" roughness={1} metalness={0} />
      </instancedMesh>
    </group>
  )
}

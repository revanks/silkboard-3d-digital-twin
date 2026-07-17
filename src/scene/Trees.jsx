import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { CFG } from '../config.js'
import { mulberry32, randBetween, inMadiwalaLake } from '../utils.js'

// Bengaluru avenue greenery: broadleaf rain trees (lumpy multi-lobe
// canopies, some flowering gulmohar/copper-pod), plus coconut palms.

function ico(r, x, y, z) {
  const g = new THREE.IcosahedronGeometry(r, 1)
  g.translate(x, y, z)
  return g
}

export default function Trees() {
  const trunkRef = useRef()
  const canopyRef = useRef()
  const palmTrunkRef = useRef()
  const palmCrownRef = useRef()

  const { broad, palms } = useMemo(() => {
    const rng = mulberry32(4242)
    const half = CFG.AREA_SIZE / 2
    const broad = []
    const palms = []
    const add = (x, z, s, palmChance) => {
      if (rng() < palmChance) palms.push({ x, z, s })
      else broad.push({ x, z, s, flower: rng() < 0.12 ? (rng() < 0.5 ? 1 : 2) : 0 })
    }

    // Avenue trees along both corridors (outside the junction box).
    for (let z = -half + 20; z < half - 20; z += 26) {
      if (Math.abs(z) < 60) continue
      for (const x of [-31.5, 31.5]) {
        if (rng() < 0.25) continue
        add(x + randBetween(rng, -1, 1), z, randBetween(rng, 2.2, 3.6), 0.25)
      }
    }
    for (let x = -half + 20; x < half - 20; x += 26) {
      if (Math.abs(x) < 60) continue
      for (const z of [-17.5, 17.5]) {
        if (rng() < 0.25) continue
        add(x, z + randBetween(rng, -1, 1), randBetween(rng, 2.2, 3.6), 0.25)
      }
    }

    // Scattered block greenery.
    for (let i = 0; i < 420; i++) {
      const x = randBetween(rng, -half, half)
      const z = randBetween(rng, -half, half)
      if (Math.abs(x) < 50 || Math.abs(z) < 44) continue
      if (inMadiwalaLake(x, z)) continue
      add(x, z, randBetween(rng, 2.0, 4.4), 0.15)
    }
    return { broad, palms }
  }, [])

  // Lumpy multi-lobe canopy (rain-tree silhouette).
  const canopyGeom = useMemo(
    () =>
      mergeGeometries([
        ico(1.0, 0, 0, 0),
        ico(0.75, 0.8, -0.15, 0.3),
        ico(0.7, -0.7, -0.2, -0.25),
        ico(0.6, 0.1, -0.3, 0.75),
        ico(0.55, -0.2, 0.45, -0.5),
      ]),
    []
  )

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    const trunk = trunkRef.current
    const canopy = canopyRef.current
    if (trunk && canopy) {
      broad.forEach((t, i) => {
        dummy.position.set(t.x, t.s * 0.55, t.z)
        dummy.scale.set(t.s * 0.16, t.s * 1.1, t.s * 0.16)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        trunk.setMatrixAt(i, dummy.matrix)

        dummy.position.set(t.x, t.s * 1.45, t.z)
        dummy.scale.set(t.s * 1.15, t.s * 0.8, t.s * 1.15)
        dummy.rotation.set(0, (i % 11) * 0.6, 0)
        dummy.updateMatrix()
        canopy.setMatrixAt(i, dummy.matrix)
        if (t.flower === 1) c.set('#c05a35') // gulmohar
        else if (t.flower === 2) c.set('#c9a13b') // copper pod
        else c.setHSL(0.28 + (i % 7) * 0.006, 0.42, 0.25 + (i % 5) * 0.015)
        canopy.setColorAt(i, c)
      })
      trunk.instanceMatrix.needsUpdate = true
      canopy.instanceMatrix.needsUpdate = true
      if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true
    }

    const pTrunk = palmTrunkRef.current
    const pCrown = palmCrownRef.current
    if (pTrunk && pCrown) {
      palms.forEach((p, i) => {
        const height = 6 + p.s
        dummy.position.set(p.x, height / 2, p.z)
        dummy.scale.set(1, height, 1)
        dummy.rotation.set(0, 0, (i % 5) * 0.02 - 0.04) // slight lean
        dummy.updateMatrix()
        pTrunk.setMatrixAt(i, dummy.matrix)

        dummy.position.set(p.x, height + 0.3, p.z)
        dummy.scale.set(p.s * 0.95, p.s * 0.4, p.s * 0.95)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        pCrown.setMatrixAt(i, dummy.matrix)
        c.setHSL(0.26, 0.5, 0.22 + (i % 4) * 0.02)
        pCrown.setColorAt(i, c)
      })
      pTrunk.instanceMatrix.needsUpdate = true
      pCrown.instanceMatrix.needsUpdate = true
      if (pCrown.instanceColor) pCrown.instanceColor.needsUpdate = true
    }
  }, [broad, palms])

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, Math.max(1, broad.length)]} castShadow>
        <cylinderGeometry args={[0.6, 0.9, 1, 6]} />
        <meshStandardMaterial color="#6b4f35" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={canopyRef}
        args={[canopyGeom, undefined, Math.max(1, broad.length)]}
        castShadow
      >
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={palmTrunkRef} args={[undefined, undefined, Math.max(1, palms.length)]} castShadow>
        <cylinderGeometry args={[0.14, 0.24, 1, 6]} />
        <meshStandardMaterial color="#8a7358" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={palmCrownRef} args={[undefined, undefined, Math.max(1, palms.length)]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
    </group>
  )
}

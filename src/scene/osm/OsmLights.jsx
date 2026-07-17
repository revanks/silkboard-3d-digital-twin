import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { buildPath, inBounds } from './geo.js'
import { roadWidth, bridgeHeight } from './OsmRoads.jsx'

// Streetlights along the real major roads — instanced poles, emissive heads
// (bloom picks them up), and warm light pools on the asphalt at night.
// Same visual language as StreetFurniture's procedural Streetlights.

const LIT_CLASSES = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary'])
const SPACING = 48
const HEAD_INTENSITY = { day: 1.3, night: 4.5, rain: 2.6 }

function buildLights(roads) {
  const posts = [] // { x, y, z } base of pole (y = deck height on bridges)
  for (const road of roads) {
    if (!LIT_CLASSES.has(road.c) || road.p.length < 2) continue
    const path = buildPath(road.p)
    if (path.length < 60) continue
    const bridge = Boolean(road.b)
    const off = roadWidth(road) / 2 + 1.2
    let side = 1
    for (let s = SPACING / 2; s < path.length; s += SPACING) {
      const p = path.sample(s)
      if (!inBounds(p.x, p.z)) continue
      const y = bridge ? bridgeHeight(s, path.length, road.rs, road.re) : 0
      // tx/tz: unit vector from the pole back over the carriageway — the
      // arm and lamp head hang over the road, like real installations.
      posts.push({
        x: p.x + p.dz * off * side,
        y,
        z: p.z - p.dx * off * side,
        tx: -p.dz * side,
        tz: p.dx * side,
      })
      side = -side // alternate sides like real installations
    }
  }
  return posts
}

const ARM_R = 2.3 // how far the lamp head reaches over the road

export default function OsmLights({ osm, envMode = 'day' }) {
  const poleRef = useRef()
  const armRef = useRef()
  const headRef = useRef()
  const poolRef = useRef()
  const posts = useMemo(() => buildLights(osm.roads), [osm])
  const grounded = useMemo(() => posts.filter((p) => p.y < 0.5), [posts])

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    const poles = poleRef.current
    const arms = armRef.current
    const heads = headRef.current
    if (poles && arms && heads) {
      posts.forEach((p, i) => {
        dummy.position.set(p.x, p.y + 4.5, p.z)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        poles.setMatrixAt(i, dummy.matrix)
        // arm reaching over the carriageway
        dummy.position.set(p.x + p.tx * (ARM_R / 2), p.y + 8.95, p.z + p.tz * (ARM_R / 2))
        dummy.rotation.set(0, Math.atan2(p.tx, p.tz), 0)
        dummy.scale.set(0.12, 0.12, ARM_R + 0.4)
        dummy.updateMatrix()
        arms.setMatrixAt(i, dummy.matrix)
        // lamp head at the arm tip, over the road
        dummy.position.set(p.x + p.tx * ARM_R, p.y + 8.85, p.z + p.tz * ARM_R)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        heads.setMatrixAt(i, dummy.matrix)
      })
      poles.instanceMatrix.needsUpdate = true
      arms.instanceMatrix.needsUpdate = true
      heads.instanceMatrix.needsUpdate = true
    }
    const pools = poolRef.current
    if (pools) {
      grounded.forEach((p, i) => {
        dummy.position.set(p.x + p.tx * ARM_R, 0.52, p.z + p.tz * ARM_R)
        dummy.rotation.set(-Math.PI / 2, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        pools.setMatrixAt(i, dummy.matrix)
      })
      pools.instanceMatrix.needsUpdate = true
    }
  }, [posts, grounded])

  if (!posts.length) return null

  return (
    <group>
      <instancedMesh ref={poleRef} args={[undefined, undefined, posts.length]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 9, 6]} />
        <meshStandardMaterial color="#4d4f52" roughness={0.7} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={armRef} args={[undefined, undefined, posts.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4d4f52" roughness={0.7} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, posts.length]}>
        <sphereGeometry args={[0.34, 10, 8]} />
        <meshStandardMaterial
          color="#ffd9a0"
          emissive="#ffb066"
          emissiveIntensity={HEAD_INTENSITY[envMode]}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={poolRef}
        args={[undefined, undefined, Math.max(1, grounded.length)]}
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

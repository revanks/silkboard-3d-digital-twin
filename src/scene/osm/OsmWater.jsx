import React, { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Real water bodies (Madiwala Lake etc.) and parks as flat polygons.

function polysToGeometry(polys, y) {
  const geos = []
  for (const poly of polys) {
    const pts = poly.p
    if (!pts || pts.length < 4) continue
    const n = pts.length - 1 // drop repeated closing point
    const shape = new THREE.Shape()
    shape.moveTo(pts[0][0], -pts[0][1])
    for (let i = 1; i < n; i++) shape.lineTo(pts[i][0], -pts[i][1])
    shape.closePath()
    try {
      const g = new THREE.ShapeGeometry(shape)
      g.rotateX(-Math.PI / 2)
      g.translate(0, y, 0)
      geos.push(g)
    } catch {
      // skip broken polygons
    }
  }
  if (!geos.length) return null
  const merged = mergeGeometries(geos)
  geos.forEach((g) => g.dispose())
  return merged
}

export default function OsmWater({ osm, envMode = 'day' }) {
  const water = useMemo(() => polysToGeometry(osm.water, 0.045), [osm])
  const parks = useMemo(() => polysToGeometry(osm.parks, 0.04), [osm])

  return (
    <group>
      {parks && (
        <mesh geometry={parks} receiveShadow>
          <meshStandardMaterial color="#5d7a48" roughness={1} />
        </mesh>
      )}
      {water && (
        <mesh geometry={water} receiveShadow>
          <meshStandardMaterial
            color={envMode === 'night' ? '#16283a' : '#2e5d7d'}
            roughness={0.15}
            metalness={0.35}
          />
        </mesh>
      )}
    </group>
  )
}

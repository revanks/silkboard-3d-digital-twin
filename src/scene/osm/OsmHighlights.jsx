import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Label } from '../Landmarks.jsx'
import { polygonCentroid, polygonArea } from './geo.js'
import { prepareBuildings } from './OsmBuildings.jsx'

// Named-company highlights. OSM footprints often exist but carry only a
// block name (the Happiest Minds SMILES campus is mapped as offices
// "M3"/"M4"), so real-world knowledge is pinned here: each entry snaps to
// the office/commercial footprints near its geocoded point and gets a
// pulsing glow shell, a light beacon, and a company label.
const HIGHLIGHTS = [
  {
    name: 'HAPPIEST MINDS TECHNOLOGIES',
    sub: 'IT Company · SMILES Building, Hosur Rd',
    // geocoded: 12.92040°N 77.62096°E (SMILES 2,3&4, #53/1-4 Hosur Main Rd)
    x: -309,
    z: -301,
    radius: 120,
    kinds: ['office', 'commercial'],
    maxBuildings: 2,
  },
]

const GLOW = '#ffb020'

function buildShell(pts, h) {
  // Footprint scaled slightly outward around its centroid, extruded a touch
  // taller than the building → a glowing jacket around the real geometry.
  const [cx, cz] = polygonCentroid(pts)
  const n = pts.length - 1
  const shape = new THREE.Shape()
  const sx = (i) => cx + (pts[i][0] - cx) * 1.1
  const sz = (i) => cz + (pts[i][1] - cz) * 1.1
  shape.moveTo(sx(0), -sz(0))
  for (let i = 1; i < n; i++) shape.lineTo(sx(i), -sz(i))
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h + 1.2, bevelEnabled: false })
  geo.rotateX(-Math.PI / 2)
  return geo
}

function useHighlightData(osm) {
  return useMemo(() => {
    const prepared = prepareBuildings(osm.buildings)
    const out = []
    for (const hl of HIGHLIGHTS) {
      // candidate footprints of the right kind near the geocoded point,
      // biggest first — a campus can span more than one block
      const cands = prepared
        .map((b) => {
          const [cx, cz] = polygonCentroid(b.p)
          return { b, cx, cz, area: Math.abs(polygonArea(b.p)), d: Math.hypot(cx - hl.x, cz - hl.z) }
        })
        .filter((c) => c.d < hl.radius && hl.kinds.includes(c.b.cat))
        .sort((a, b) => b.area - a.area)
        .slice(0, hl.maxBuildings)
      if (!cands.length) continue

      const shells = cands.map((c) => buildShell(c.b.p, c.b.h))
      // anchor the beacon + label on the biggest block
      const top = cands[0]
      out.push({
        name: hl.name,
        sub: hl.sub,
        x: top.cx,
        z: top.cz,
        h: top.b.h,
        shells,
      })
    }
    return out
  }, [osm])
}

export default function OsmHighlights({ osm }) {
  const items = useHighlightData(osm)
  const shellMatRef = useRef()
  const beamMatRef = useRef()
  const pinRefs = useRef([])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2)
    if (shellMatRef.current) shellMatRef.current.opacity = 0.18 + 0.22 * pulse
    if (beamMatRef.current) beamMatRef.current.opacity = 0.1 + 0.14 * pulse
    pinRefs.current.forEach((g) => {
      if (!g) return
      g.position.y = g.userData.baseY + Math.sin(t * 2.2) * 1.2
      g.rotation.y = t * 1.4
    })
  })

  if (!items.length) return null

  return (
    <group>
      {items.map((it, i) => (
        <group key={it.name}>
          {/* glow jacket around each campus block */}
          {it.shells.map((geo, si) => (
            <mesh key={si} geometry={geo}>
              <meshBasicMaterial
                ref={si === 0 && i === 0 ? shellMatRef : undefined}
                color={GLOW}
                transparent
                opacity={0.3}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
          {/* vertical light beam so it can be spotted from across the map */}
          <mesh position={[it.x, it.h + 25, it.z]}>
            <cylinderGeometry args={[1.6, 2.6, 50, 12, 1, true]} />
            <meshBasicMaterial
              ref={i === 0 ? beamMatRef : undefined}
              color={GLOW}
              transparent
              opacity={0.16}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* bobbing map pin above the roof */}
          <group
            ref={(g) => {
              if (g) {
                g.userData.baseY = it.h + 10
                pinRefs.current[i] = g
              }
            }}
            position={[it.x, it.h + 10, it.z]}
          >
            <mesh>
              <octahedronGeometry args={[3.2]} />
              <meshStandardMaterial
                color={GLOW}
                emissive={GLOW}
                emissiveIntensity={1.6}
                toneMapped={false}
              />
            </mesh>
          </group>
          <Label pos={[it.x, it.h + 34, it.z]} text={it.name} sub={it.sub} width={100} />
        </group>
      ))}
    </group>
  )
}

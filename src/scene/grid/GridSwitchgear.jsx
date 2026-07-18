import React, { useMemo } from 'react'
import { inBounds } from '../osm/geo.js'

// Only 12 total (3 reclosers + 9 sectionalizers) -- too few to bother instancing, matching this
// codebase's own convention (OsmHighlights.jsx also uses plain individual meshes for its handful of
// hero points rather than an instancedMesh built for one item).
const MOUNT_Y = 7 // pole-top mounted, matches the real LT-conductor attachment height band

export default function GridSwitchgear({ grid, onAssetClick }) {
  const reclosers = useMemo(() => grid.reclosers.filter((r) => inBounds(r.x, r.z)), [grid])
  const sectionalizers = useMemo(() => grid.sectionalizers.filter((s) => inBounds(s.x, s.z)), [grid])

  return (
    <group>
      {reclosers.map((r) => (
        <mesh
          key={r.id}
          position={[r.x, MOUNT_Y, r.z]}
          castShadow
          onClick={(e) => {
            e.stopPropagation()
            onAssetClick?.('recloser', r)
          }}
        >
          <cylinderGeometry args={[0.35, 0.35, 1.1, 8]} />
          <meshStandardMaterial color="#c0392b" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      {sectionalizers.map((s) => (
        <mesh
          key={s.id}
          position={[s.x, MOUNT_Y, s.z]}
          castShadow
          onClick={(e) => {
            e.stopPropagation()
            onAssetClick?.('sectionalizer', s)
          }}
        >
          <boxGeometry args={[0.5, 0.8, 0.35]} />
          <meshStandardMaterial color="#e0a815" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

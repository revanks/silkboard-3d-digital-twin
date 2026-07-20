import React, { useMemo, useCallback } from 'react'
import { inBounds } from '../osm/geo.js'
import AssetIdLabels from './AssetIdLabels.jsx'

// Only 12 total (3 reclosers + 9 sectionalizers) -- too few to bother instancing, matching this
// codebase's own convention (OsmHighlights.jsx also uses plain individual meshes for its handful of
// hero points rather than an instancedMesh built for one item).
const MOUNT_Y = 7 // pole-top mounted, matches the real LT-conductor attachment height band
const RECLOSER_COLOR = '#c0392b'
const SECTIONALIZER_COLOR = '#e0a815'

export default function GridSwitchgear({ grid, onAssetClick, showLabels = true }) {
  const reclosers = useMemo(() => grid.reclosers.filter((r) => inBounds(r.x, r.z)), [grid])
  const sectionalizers = useMemo(() => grid.sectionalizers.filter((s) => inBounds(s.x, s.z)), [grid])
  const getPos = useCallback((r) => [r.x, MOUNT_Y + 1.4, r.z], [])

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
          <meshStandardMaterial color={RECLOSER_COLOR} roughness={0.5} metalness={0.5} />
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
          <meshStandardMaterial color={SECTIONALIZER_COLOR} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      {/* Only 12 total -- always labeled regardless of camera distance, no clutter risk. */}
      {showLabels && (
        <>
          <AssetIdLabels items={reclosers} getPos={getPos} getColor={RECLOSER_COLOR} radius={99999} maxCount={12} labelHeight={1.6} />
          <AssetIdLabels items={sectionalizers} getPos={getPos} getColor={SECTIONALIZER_COLOR} radius={99999} maxCount={12} labelHeight={1.6} />
        </>
      )}
    </group>
  )
}

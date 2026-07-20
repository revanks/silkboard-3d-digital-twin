import React, { useMemo } from 'react'
import { inBounds } from '../osm/geo.js'
import { feederColor } from './gridColors.js'
import { Label } from '../Landmarks.jsx'

// Feeders (3 real 11kV backbones) have no dedicated conductor geometry in this scene -- GridSense
// never modeled real attachment-height/material for them, only for pole/transformer/lt_line/
// service_drop/meter (a deliberate, documented gap, not an oversight). This adds just a small
// floating marker + real ID label at each feeder's path midpoint, distinct from (and much lighter
// than) inventing full conductor geometry -- enough to make "Feeders: 3" individually identifiable
// and clickable without overstepping that decision.
const MARKER_Y = 11

export default function GridFeederLabels({ grid, onAssetClick }) {
  const items = useMemo(() => {
    return grid.feeders
      .map((f, i) => {
        const inb = f.path.filter(([x, z]) => inBounds(x, z))
        const pts = inb.length ? inb : f.path
        const [x, z] = pts[Math.floor(pts.length / 2)]
        return { ...f, x, z, index: i }
      })
      .filter((f) => inBounds(f.x, f.z))
  }, [grid])

  return (
    <group>
      {items.map((f) => {
        const color = feederColor(f.index)
        return (
          <group
            key={f.id}
            position={[f.x, MARKER_Y, f.z]}
            onClick={(e) => {
              e.stopPropagation()
              onAssetClick?.('feeder', f)
            }}
          >
            <mesh>
              <octahedronGeometry args={[1.6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} />
            </mesh>
            <Label
              pos={[0, 4.6, 0]}
              text={f.id}
              sub={`${f.nTransformers} transformers · ${f.customers.toLocaleString()} customers`}
              width={95}
            />
          </group>
        )
      })}
    </group>
  )
}

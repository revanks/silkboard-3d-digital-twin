import React, { useMemo } from 'react'
import * as THREE from 'three'
import { inBounds } from '../osm/geo.js'
import { buildRibbonMesh } from './ribbonBuilder.js'
import { riskColor } from './gridColors.js'
import { reliefY } from './relief.js'

// Real conductor color -- LT lines have no material attribute in the data (unlike poles), so
// "realistic" mode uses a single plausible bare-aluminum-conductor color rather than inventing
// per-line variation the data doesn't support. Matches the existing synthetic OsmPower wire color.
const CONDUCTOR_COLOR = '#17171a'

export default function GridLtLines({ grid, colorMode, onAssetClick }) {
  const items = useMemo(
    () => grid.ltLines.filter((l) => inBounds(l.ax, l.az) || inBounds(l.bx, l.bz)),
    [grid]
  )
  const riskRange = grid.meta.ranges.ltLine.risk

  const { geometry, faceRecordIndex } = useMemo(
    () =>
      buildRibbonMesh(items, {
        // Real per-line attachment height (5-9m) plus the shared stylized elevation offset.
        yFn: (rec) => reliefY(rec.yg) + rec.y,
        sag: 0.6,
        segs: 4,
        thickness: 0.09,
        colorFn: (rec) => (colorMode === 'risk' ? riskColor(rec.risk, riskRange) : CONDUCTOR_COLOR),
      }),
    [items, colorMode, riskRange]
  )

  if (!items.length) return null
  return (
    <mesh
      geometry={geometry}
      frustumCulled={false}
      onClick={(e) => {
        e.stopPropagation()
        const recordIdx = faceRecordIndex[e.faceIndex]
        const rec = items[recordIdx]
        if (rec) onAssetClick?.('ltLine', rec)
      }}
    >
      <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  )
}

import React, { useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { inBounds } from '../osm/geo.js'
import { buildRibbonMesh } from './ribbonBuilder.js'
import { riskColor } from './gridColors.js'
import { reliefY } from './relief.js'
import AssetIdLabels from './AssetIdLabels.jsx'

// Real conductor color -- LT lines have no material attribute in the data (unlike poles), so
// "realistic" mode uses a single plausible bare-aluminum-conductor color rather than inventing
// per-line variation the data doesn't support. Matches the existing synthetic OsmPower wire color.
const CONDUCTOR_COLOR = '#17171a'
// Thickened from the original 0.09 -- merged-ribbon conductors were nearly invisible from a
// typical city-view distance across 5,972 real segments.
const THICKNESS = 0.14

export default function GridLtLines({ grid, colorMode, onAssetClick, showLabels = true }) {
  const items = useMemo(
    () => grid.ltLines.filter((l) => inBounds(l.ax, l.az) || inBounds(l.bx, l.bz)),
    [grid]
  )
  const riskRange = grid.meta.ranges.ltLine.risk
  const colorForLine = useCallback(
    (rec) => (colorMode === 'risk' ? riskColor(rec.risk, riskRange) : CONDUCTOR_COLOR),
    [colorMode, riskRange]
  )

  const { geometry, faceRecordIndex } = useMemo(
    () =>
      buildRibbonMesh(items, {
        // Real per-line attachment height (5-9m) plus the shared stylized elevation offset.
        yFn: (rec) => reliefY(rec.yg) + rec.y,
        sag: 0.6,
        segs: 4,
        thickness: THICKNESS,
        colorFn: colorForLine,
      }),
    [items, colorForLine]
  )

  const getPos = useCallback(
    (rec) => [(rec.ax + rec.bx) / 2, reliefY(rec.yg) + rec.y + 0.6, (rec.az + rec.bz) / 2],
    []
  )

  if (!items.length) return null
  return (
    <>
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
      {showLabels && (
        <AssetIdLabels items={items} getPos={getPos} getColor={colorForLine} radius={45} maxCount={35} labelHeight={1.1} />
      )}
    </>
  )
}

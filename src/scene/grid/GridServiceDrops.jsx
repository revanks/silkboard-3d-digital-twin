import React, { useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { inBounds } from '../osm/geo.js'
import { buildRibbonMesh } from './ribbonBuilder.js'
import { riskColor } from './gridColors.js'
import { reliefY } from './relief.js'
import AssetIdLabels from './AssetIdLabels.jsx'

// No real per-drop attachment-height data exists (unlike LT lines' attachment_height_m) -- a real
// service drop slopes from the pole's LT-conductor height down to a lower building-wall entry point,
// so these two constants are an honest, standard-practice assumption, not a measured value.
const POLE_ATTACH_Y = 7.0
const BUILDING_ATTACH_Y = 3.5
const CONDUCTOR_COLOR = '#3a3a3a'
// Thickened from the original 0.045 for visibility across 5,837 real drops.
const THICKNESS = 0.08

export default function GridServiceDrops({ grid, colorMode, onAssetClick, showLabels = true }) {
  const items = useMemo(
    () => grid.serviceDrops.filter((d) => inBounds(d.ax, d.az) || inBounds(d.bx, d.bz)),
    [grid]
  )
  const riskRange = grid.meta.ranges.serviceDrop.risk
  const colorForDrop = useCallback(
    (rec) => (colorMode === 'risk' ? riskColor(rec.risk, riskRange) : CONDUCTOR_COLOR),
    [colorMode, riskRange]
  )

  const { geometry, faceRecordIndex } = useMemo(
    () =>
      buildRibbonMesh(items, {
        yFn: (rec, t) => reliefY(rec.yg) + POLE_ATTACH_Y + (BUILDING_ATTACH_Y - POLE_ATTACH_Y) * t,
        sag: 0.25,
        segs: 3,
        thickness: THICKNESS,
        colorFn: colorForDrop,
      }),
    [items, colorForDrop]
  )

  const getPos = useCallback(
    (rec) => [
      (rec.ax + rec.bx) / 2,
      reliefY(rec.yg) + (POLE_ATTACH_Y + BUILDING_ATTACH_Y) / 2,
      (rec.az + rec.bz) / 2,
    ],
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
          if (rec) onAssetClick?.('serviceDrop', rec)
        }}
      >
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      {showLabels && (
        <AssetIdLabels items={items} getPos={getPos} getColor={colorForDrop} radius={35} maxCount={35} labelHeight={0.9} />
      )}
    </>
  )
}

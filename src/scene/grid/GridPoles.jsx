import React, { useMemo, useRef, useLayoutEffect, useCallback } from 'react'
import * as THREE from 'three'
import { inBounds } from '../osm/geo.js'
import { poleMaterialColor, riskColor, feederColor } from './gridColors.js'
import { reliefY } from './relief.js'
import AssetIdLabels from './AssetIdLabels.jsx'

// Same real LT-pole height already used by the synthetic OsmPower.jsx grid (no explicit pole-height
// constant exists anywhere in GridSense's own data -- 8m is a standard Indian PCC-pole assumption).
export const POLE_H = 8
// Thickened from the original 0.3 so individual poles read as distinct objects at typical city-view
// zoom (8,668 of them at the original hair-thin scale were nearly imperceptible from a distance).
const POLE_THICKNESS = 0.5

export default function GridPoles({ grid, colorMode, onAssetClick, showLabels = true }) {
  const items = useMemo(
    () => grid.poles.filter((p) => inBounds(p.x, p.z)),
    [grid]
  )
  const riskRange = grid.meta.ranges.pole.risk
  const transformers = grid.transformers

  const colorForPole = useCallback(
    (p) => {
      if (colorMode === 'risk') return riskColor(p.risk, riskRange)
      if (colorMode === 'feeder') return feederColor(p.tx !== null && p.tx !== undefined ? transformers[p.tx]?.feeder : null)
      return poleMaterialColor(p.mat)
    },
    [colorMode, riskRange, transformers]
  )

  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((p, i) => {
      dummy.position.set(p.x, POLE_H / 2 + reliefY(p.y), p.z)
      dummy.scale.set(POLE_THICKNESS, POLE_H, POLE_THICKNESS)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      c.set(colorForPole(p))
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items, colorForPole])

  const getPos = useCallback((p) => [p.x, POLE_H + reliefY(p.y), p.z], [])

  if (!items.length) return null
  return (
    <>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, items.length]}
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          const rec = items[e.instanceId]
          if (rec) onAssetClick?.('pole', rec)
        }}
      >
        <cylinderGeometry args={[0.5, 0.65, 1, 6]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      {showLabels && (
        <AssetIdLabels items={items} getPos={getPos} getColor={colorForPole} radius={70} maxCount={40} labelHeight={1.6} />
      )}
    </>
  )
}

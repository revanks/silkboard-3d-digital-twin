import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { inBounds } from '../osm/geo.js'
import { poleMaterialColor, riskColor, feederColor } from './gridColors.js'
import { reliefY } from './relief.js'

// Same real LT-pole height already used by the synthetic OsmPower.jsx grid (no explicit pole-height
// constant exists anywhere in GridSense's own data -- 8m is a standard Indian PCC-pole assumption).
export const POLE_H = 8

export default function GridPoles({ grid, colorMode, onAssetClick }) {
  const items = useMemo(
    () => grid.poles.filter((p) => inBounds(p.x, p.z)),
    [grid]
  )
  const riskRange = grid.meta.ranges.pole.risk
  const transformers = grid.transformers

  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((p, i) => {
      dummy.position.set(p.x, POLE_H / 2 + reliefY(p.y), p.z)
      dummy.scale.set(0.3, POLE_H, 0.3)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      let hex
      if (colorMode === 'risk') hex = riskColor(p.risk, riskRange)
      else if (colorMode === 'feeder') hex = feederColor(p.tx !== null && p.tx !== undefined ? transformers[p.tx]?.feeder : null)
      else hex = poleMaterialColor(p.mat)
      c.set(hex)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items, colorMode, riskRange, transformers])

  if (!items.length) return null
  return (
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
  )
}

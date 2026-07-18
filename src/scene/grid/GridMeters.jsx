import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { inBounds } from '../osm/geo.js'
import { customerTypeColor, riskColor } from './gridColors.js'
import { reliefY } from './relief.js'

// Real service-drop delivery-point height assumption (no per-meter wall-normal/orientation data
// exists to place these more precisely -- honestly framed the same way as GridServiceDrops.jsx's
// BUILDING_ATTACH_Y, which this deliberately matches).
const MOUNT_Y = 1.4
const SIZE = 0.3

export default function GridMeters({ grid, colorMode, onAssetClick }) {
  const items = useMemo(() => grid.meters.filter((m) => inBounds(m.x, m.z)), [grid])
  const riskRange = grid.meta.ranges.meter.risk

  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((m, i) => {
      dummy.position.set(m.x, MOUNT_Y + reliefY(m.y), m.z)
      dummy.scale.set(SIZE, SIZE, SIZE)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      // "realistic" and "feeder" modes both fall back to customer type here -- meters have no
      // material/feeder attribute of their own, and customer type is the one real per-meter
      // categorical GridSense models, matching the dashboard's own default meter coloring.
      c.set(colorMode === 'risk' ? riskColor(m.risk, riskRange) : customerTypeColor(m.type))
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items, colorMode, riskRange])

  if (!items.length) return null
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      onClick={(e) => {
        e.stopPropagation()
        const rec = items[e.instanceId]
        if (rec) onAssetClick?.('meter', rec)
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.5} metalness={0.2} />
    </instancedMesh>
  )
}

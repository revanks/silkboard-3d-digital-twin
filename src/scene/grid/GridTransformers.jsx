import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { inBounds } from '../osm/geo.js'
import { riskColor, feederColor } from './gridColors.js'
import { reliefY } from './relief.js'

// Typical pole-mounted distribution-transformer platform height in Indian LT networks.
const MOUNT_Y = 5.5

// Real BESCOM kVA catalog (config.py transformer_kva_options) -> plausible tank dimensions
// [w, h, d] in metres. No real tank-dimension data exists (GridSense models capacity, not physical
// tank size) -- larger kVA ratings get visibly larger tanks, a real-world-plausible assumption.
const KVA_SCALE = {
  63: [0.7, 0.9, 1.0], 100: [0.75, 1.0, 1.1], 160: [0.85, 1.1, 1.2], 200: [0.9, 1.2, 1.3],
  250: [1.0, 1.3, 1.4], 315: [1.05, 1.4, 1.5], 500: [1.2, 1.6, 1.7], 630: [1.3, 1.7, 1.8],
}
function scaleFor(kva) {
  return KVA_SCALE[kva] ?? [1.0, 1.3, 1.4]
}

function tankColor(rec, colorMode, riskRange) {
  if (colorMode === 'risk') return riskColor(rec.risk, riskRange)
  if (colorMode === 'feeder') return feederColor(rec.feeder)
  // Realistic mode: standard Indian distribution-transformer tank green, shifting to amber/red as
  // the real peak_hotspot_temperature attribute rises into an overheating band.
  const hot = rec.hot ?? 60
  if (hot > 100) return '#c0392b'
  if (hot > 85) return '#e08b2b'
  return '#3f5a44'
}

export default function GridTransformers({ grid, colorMode, onAssetClick }) {
  const items = useMemo(() => grid.transformers.filter((t) => inBounds(t.x, t.z)), [grid])
  const riskRange = grid.meta.ranges.transformer.risk

  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((t, i) => {
      const [w, h, d] = scaleFor(t.kva)
      dummy.position.set(t.x, MOUNT_Y + h / 2 + reliefY(t.y), t.z)
      dummy.scale.set(w, h, d)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      c.set(tankColor(t, colorMode, riskRange))
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
      castShadow
      onClick={(e) => {
        e.stopPropagation()
        const rec = items[e.instanceId]
        if (rec) onAssetClick?.('transformer', rec)
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.6} metalness={0.35} />
    </instancedMesh>
  )
}

import React, { useMemo, useRef, useLayoutEffect, useCallback } from 'react'
import * as THREE from 'three'
import { inBounds } from '../osm/geo.js'
import { riskColor, feederColor } from './gridColors.js'
import { reliefY } from './relief.js'
import AssetIdLabels from './AssetIdLabels.jsx'

// Typical pole-mounted distribution-transformer platform height in Indian LT networks.
const MOUNT_Y = 5.5

// Real BESCOM kVA catalog (config.py transformer_kva_options) -> plausible tank dimensions
// [w, h, d] in metres. No real tank-dimension data exists (GridSense models capacity, not physical
// tank size) -- larger kVA ratings get visibly larger tanks, a real-world-plausible assumption.
// Doubled from the original values (2026-07-20, presentation request): transformers should read as
// unmistakably distinct objects from across the scene, not blend in at normal building scale.
const KVA_SCALE = {
  63: [1.4, 1.8, 2.0], 100: [1.5, 2.0, 2.2], 160: [1.7, 2.2, 2.4], 200: [1.8, 2.4, 2.6],
  250: [2.0, 2.6, 2.8], 315: [2.1, 2.8, 3.0], 500: [2.4, 3.2, 3.4], 630: [2.6, 3.4, 3.6],
}
function scaleFor(kva) {
  return KVA_SCALE[kva] ?? [2.0, 2.6, 2.8]
}

// Uniform vivid, saturated green -- presentation request: every transformer should read clearly as
// "transformer" from any distance, not shift color by hotspot (that thermal signal is still visible
// via the RISK color mode instead).
export const TRANSFORMER_GREEN = '#12e07a'

function tankColor(rec, colorMode, riskRange) {
  if (colorMode === 'risk') return riskColor(rec.risk, riskRange)
  if (colorMode === 'feeder') return feederColor(rec.feeder)
  return TRANSFORMER_GREEN
}

export default function GridTransformers({ grid, colorMode, onAssetClick, showLabels = true }) {
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

  const getPos = useCallback((t) => {
    const [, h] = scaleFor(t.kva)
    return [t.x, MOUNT_Y + h + reliefY(t.y), t.z]
  }, [])
  const getColor = useCallback((t) => tankColor(t, colorMode, riskRange), [colorMode, riskRange])

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
          if (rec) onAssetClick?.('transformer', rec)
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          roughness={0.45}
          metalness={0.2}
          emissive={colorMode === 'realistic' ? TRANSFORMER_GREEN : '#000000'}
          emissiveIntensity={colorMode === 'realistic' ? 0.8 : 0}
        />
      </instancedMesh>
      {showLabels && (
        <AssetIdLabels items={items} getPos={getPos} getColor={getColor} radius={220} maxCount={40} labelHeight={2.2} />
      )}
    </>
  )
}

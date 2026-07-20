import React, { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

// With ~26,370 real GridSense assets in this scene, permanently labeling every single one at once
// would be an unreadable wall of text and would tank frame rate. Instead: recompute (a few times a
// second, not every frame -- 8,668 poles is cheap to distance-check at 4Hz but wasteful at 60Hz) which
// items are within `radius` of the camera, keep only the nearest `maxCount`, and label just those --
// so every asset's real ID becomes visible as you fly close to it, without ever rendering thousands of
// labels simultaneously.

function makeIdTexture(id, accent) {
  const measure = document.createElement('canvas').getContext('2d')
  measure.font = 'bold 40px "Consolas", "Courier New", monospace'
  const textW = measure.measureText(id).width
  const padX = 20
  const w = Math.ceil(textW + padX * 2)
  const h = 64

  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.font = 'bold 40px "Consolas", "Courier New", monospace'

  ctx.fillStyle = 'rgba(6,9,15,0.82)'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = accent
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f4efe2'
  ctx.fillText(id, w / 2, h / 2 + 2)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 2
  return { tex, aspect: w / h }
}

function IdSprite({ id, pos, accent, height }) {
  const { tex, aspect } = useMemo(() => makeIdTexture(id, accent), [id, accent])
  return (
    <sprite position={pos} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={tex} transparent depthWrite={false} fog={false} />
    </sprite>
  )
}

function sameIds(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i].id !== b[i].id) return false
  return true
}

/**
 * @param items      raw records (already inBounds-filtered by the caller)
 * @param getPos     (item) => [x, y, z] world position to anchor the label above
 * @param getColor   (item) => hex string -- lets the label chip match the asset's own current
 *                   render color (e.g. pole material / risk ramp / feeder color), or a fixed hex
 * @param radius     world units; items farther than this from the camera are never labeled
 * @param maxCount   hard cap on simultaneously-rendered labels (nearest-first)
 */
export default function AssetIdLabels({
  items,
  getPos,
  getColor = '#38bdf8',
  radius = 70,
  maxCount = 40,
  labelHeight = 2.2,
  updateInterval = 0.25,
}) {
  const { camera } = useThree()
  const [nearby, setNearby] = useState([])
  const acc = useRef(0)
  const r2 = radius * radius
  const colorFn = typeof getColor === 'function' ? getColor : () => getColor

  useFrame((_, delta) => {
    acc.current += delta
    if (acc.current < updateInterval) return
    acc.current = 0
    if (!items.length) {
      if (nearby.length) setNearby([])
      return
    }
    const camPos = camera.position
    const withDist = []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const p = getPos(it)
      const dx = p[0] - camPos.x
      const dy = p[1] - camPos.y
      const dz = p[2] - camPos.z
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 <= r2) withDist.push([d2, it, p])
    }
    withDist.sort((a, b) => a[0] - b[0])
    const next = withDist
      .slice(0, maxCount)
      .map(([, it, p]) => ({ id: it.id, pos: p, accent: colorFn(it) }))
    if (!sameIds(nearby, next)) setNearby(next)
  })

  return (
    <group>
      {nearby.map((n) => (
        <IdSprite
          key={n.id}
          id={n.id}
          pos={[n.pos[0], n.pos[1] + labelHeight, n.pos[2]]}
          accent={n.accent}
          height={labelHeight}
        />
      ))}
    </group>
  )
}

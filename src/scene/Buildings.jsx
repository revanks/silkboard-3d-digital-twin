import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { CFG } from '../config.js'
import { mulberry32, randBetween, inMadiwalaLake } from '../utils.js'
import { LANDMARK_BUILDINGS } from './landmarkData.js'

const SHOP_COLORS = ['#d63a2f', '#1f7ec2', '#e8b021', '#2e9e4f', '#7b3fb5', '#e05c22', '#c2205a']

function nearLandmark(x, z) {
  return LANDMARK_BUILDINGS.some(
    (b) => Math.abs(x - b.x) < b.w / 2 + 22 && Math.abs(z - b.z) < b.d / 2 + 22
  )
}

// Procedural Bengaluru-style urban fabric on a jittered grid.
// Mostly 2–5 storey plastered blocks (BTM / HSR / Madiwala texture),
// with taller glass-ish tech-park towers clustered east along the ORR.

const PALETTE = [
  '#cfc4b0', '#d8cdbd', '#b8aa96', '#c9b8a4',
  '#a89f93', '#d9c6a5', '#c4bdae', '#bfb19b',
]
const TOWER_PALETTE = ['#7e93a6', '#8fa3b5', '#6f8496', '#9aacbc']

function inRoadCorridor(x, z) {
  if (Math.abs(x) < 48) return true // Hosur Rd + service roads + setback
  if (Math.abs(z) < 42) return true // ORR + setback
  return false
}

export default function Buildings({ envMode = 'day' }) {
  const bldRef = useRef()
  const tankRef = useRef()
  const winLitRef = useRef()
  const winUnlitRef = useRef()
  const roofRef = useRef()
  const shopRef = useRef()

  const { buildings, tanks, windowsLit, windowsUnlit, roofs, shops } = useMemo(() => {
    const rng = mulberry32(20260711)
    const half = CFG.AREA_SIZE / 2
    const buildings = []
    const tanks = []
    const windowsLit = []
    const windowsUnlit = []
    const roofs = []
    const shops = []
    const step = 44

    for (let gx = -half + 30; gx < half - 30; gx += step) {
      for (let gz = -half + 30; gz < half - 30; gz += step) {
        const x = gx + randBetween(rng, -9, 9)
        const z = gz + randBetween(rng, -9, 9)
        if (inRoadCorridor(x, z)) continue
        if (Math.sqrt(x * x + z * z) < 95) continue // junction open space
        if (inMadiwalaLake(x, z)) continue
        if (nearLandmark(x, z)) continue // named buildings own their plots
        if (rng() < 0.16) continue // vacant plots

        const w = randBetween(rng, 14, 30)
        const d = randBetween(rng, 14, 30)

        // Height mix: dense low/mid-rise, tech towers east of the junction.
        const techZone = x > 180 && Math.abs(z) < 420
        const r = rng()
        let h
        let tower = false
        if (techZone && r < 0.22) {
          h = randBetween(rng, 38, 78)
          tower = true
        } else if (r < 0.68) {
          h = randBetween(rng, 6, 15)
        } else if (r < 0.95) {
          h = randBetween(rng, 15, 30)
        } else {
          h = randBetween(rng, 30, 48)
          tower = rng() < 0.5
        }

        const rotY = randBetween(rng, -0.05, 0.05)
        const palette = tower ? TOWER_PALETTE : PALETTE
        const color = palette[Math.floor(rng() * palette.length)]
        buildings.push({ x, z, w, d, h, rotY, color, shade: randBetween(rng, -0.05, 0.05) })

        // Rooftop water tanks — very Bengaluru.
        if (!tower && rng() < 0.45) {
          tanks.push({
            x: x + randBetween(rng, -w / 4, w / 4),
            z: z + randBetween(rng, -d / 4, d / 4),
            y: h,
            s: randBetween(rng, 0.8, 1.3),
          })
        }

        // Rooftop slab — reads as a parapet/roof overhang line.
        roofs.push({ x, z, y: h + 0.15, w: w + 0.5, d: d + 0.5, rotY })

        // Floor-by-floor window grids on all facades. To stay within
        // budget, detailed only near the junction or on tall towers.
        const cos = Math.cos(rotY)
        const sin = Math.sin(rotY)
        if (h > 5 && (Math.hypot(x, z) < 520 || h > 36)) {
          const rows = Math.min(14, Math.floor((h - 2) / 3.2))
          for (const face of [0, 1, 2, 3]) {
            const faceW = face < 2 ? w : d
            const cols = Math.min(9, Math.floor(faceW / 3.4))
            if (cols < 1 || rows < 1) continue
            const start = -((cols - 1) * 3.4) / 2
            for (let r0 = 0; r0 < rows; r0++) {
              const wy = 2.4 + r0 * 3.2
              for (let ci = 0; ci < cols; ci++) {
                if (rng() < 0.12) continue
                const along = start + ci * 3.4
                let lx, lz
                if (face === 0) { lx = along; lz = d / 2 + 0.08 }
                else if (face === 1) { lx = along; lz = -d / 2 - 0.08 }
                else if (face === 2) { lx = w / 2 + 0.08; lz = along }
                else { lx = -w / 2 - 0.08; lz = along }
                const item = {
                  x: x + lx * cos + lz * sin,
                  z: z - lx * sin + lz * cos,
                  y: wy,
                  rotY: rotY + (face < 2 ? 0 : Math.PI / 2),
                }
                if (rng() < 0.55) windowsLit.push(item)
                else windowsUnlit.push(item)
              }
            }
          }
        }

        // Shopfront signboards facing the service roads / ORR.
        const facesHosur = Math.abs(x) > 48 && Math.abs(x) < 95 && Math.abs(z) < 900
        const facesORR = Math.abs(z) > 42 && Math.abs(z) < 95 && Math.abs(x) < 900
        if ((facesHosur || facesORR) && rng() < 0.85) {
          const color = SHOP_COLORS[Math.floor(rng() * SHOP_COLORS.length)]
          if (facesHosur) {
            shops.push({
              x: x + (x > 0 ? -(w / 2 + 0.2) : w / 2 + 0.2),
              y: 3.2, z,
              sx: 0.3, sy: 1.2, sz: Math.min(d * 0.75, 12),
              color,
            })
          } else {
            shops.push({
              x, y: 3.2,
              z: z + (z > 0 ? -(d / 2 + 0.2) : d / 2 + 0.2),
              sx: Math.min(w * 0.75, 12), sy: 1.2, sz: 0.3,
              color,
            })
          }
        }
      }
    }
    return { buildings, tanks, windowsLit, windowsUnlit, roofs, shops }
  }, [])

  useLayoutEffect(() => {
    const mesh = bldRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    buildings.forEach((b, i) => {
      dummy.position.set(b.x, 0, b.z)
      dummy.scale.set(b.w, b.h, b.d)
      dummy.rotation.set(0, b.rotY, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      c.set(b.color).offsetHSL(0, 0, b.shade)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    const tMesh = tankRef.current
    if (tMesh) {
      tanks.forEach((t, i) => {
        dummy.position.set(t.x, t.y + 0.9 * t.s, t.z)
        dummy.scale.set(t.s, t.s, t.s)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        tMesh.setMatrixAt(i, dummy.matrix)
      })
      tMesh.instanceMatrix.needsUpdate = true
    }

    for (const [ref, list] of [
      [winLitRef, windowsLit],
      [winUnlitRef, windowsUnlit],
    ]) {
      const wMesh = ref.current
      if (!wMesh) continue
      list.forEach((wd, i) => {
        dummy.position.set(wd.x, wd.y, wd.z)
        dummy.scale.set(2.0, 1.4, 0.1)
        dummy.rotation.set(0, wd.rotY, 0)
        dummy.updateMatrix()
        wMesh.setMatrixAt(i, dummy.matrix)
      })
      wMesh.instanceMatrix.needsUpdate = true
    }

    const rMesh = roofRef.current
    if (rMesh) {
      roofs.forEach((rf, i) => {
        dummy.position.set(rf.x, rf.y, rf.z)
        dummy.scale.set(rf.w, 0.35, rf.d)
        dummy.rotation.set(0, rf.rotY, 0)
        dummy.updateMatrix()
        rMesh.setMatrixAt(i, dummy.matrix)
      })
      rMesh.instanceMatrix.needsUpdate = true
    }

    const sMesh = shopRef.current
    if (sMesh) {
      shops.forEach((sp, i) => {
        dummy.position.set(sp.x, sp.y, sp.z)
        dummy.scale.set(sp.sx, sp.sy, sp.sz)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        sMesh.setMatrixAt(i, dummy.matrix)
        c.set(sp.color)
        sMesh.setColorAt(i, c)
      })
      sMesh.instanceMatrix.needsUpdate = true
      if (sMesh.instanceColor) sMesh.instanceColor.needsUpdate = true
    }
  }, [buildings, tanks, windowsLit, windowsUnlit, roofs, shops])

  // Unit box with its origin at the base so scale.y == building height.
  const baseBox = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1)
    g.translate(0, 0.5, 0)
    return g
  }, [])

  return (
    <group>
      <instancedMesh
        ref={bldRef}
        args={[baseBox, undefined, buildings.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial roughness={0.88} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={tankRef} args={[undefined, undefined, tanks.length]} castShadow>
        <cylinderGeometry args={[0.8, 0.8, 1.8, 10]} />
        <meshStandardMaterial color="#22201e" roughness={0.8} />
      </instancedMesh>
      {/* Window grids: "lit" fraction glows at night, dark glass by day */}
      <instancedMesh
        ref={winLitRef}
        args={[undefined, undefined, Math.max(1, windowsLit.length)]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#232a34"
          roughness={0.15}
          metalness={0.7}
          emissive="#ffc98c"
          emissiveIntensity={envMode === 'night' ? 1.9 : 0}
          toneMapped={envMode !== 'night'}
        />
      </instancedMesh>
      <instancedMesh
        ref={winUnlitRef}
        args={[undefined, undefined, Math.max(1, windowsUnlit.length)]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#232a34" roughness={0.15} metalness={0.7} />
      </instancedMesh>
      {/* Rooftop parapet slabs */}
      <instancedMesh ref={roofRef} args={[undefined, undefined, Math.max(1, roofs.length)]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8a8175" roughness={1} />
      </instancedMesh>
      {/* Shopfront signboards along the commercial frontages */}
      <instancedMesh ref={shopRef} args={[undefined, undefined, Math.max(1, shops.length)]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
    </group>
  )
}

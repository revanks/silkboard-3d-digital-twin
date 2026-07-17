import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { mulberry32, randBetween } from '../../utils.js'
import { polygonCentroid, pointInPolygon } from './geo.js'

// Real building footprints extruded to plausible heights, merged into one
// geometry per category, plus the facade language from the procedural city:
// floor-by-floor window grids (lit fraction glows at night), rooftop water
// tanks, and shopfront signboards on commercial buildings.

const CATS = {
  residential: { color: '#c8b49a', h: [4, 9] }, // warm plaster
  apartments: { color: '#ddd3bd', h: [12, 24] }, // cream mid-rises
  commercial: { color: '#8fa3b5', h: [7, 14] }, // blue-grey
  office: { color: '#7fa8c9', h: [15, 30] }, // glass blue
  industrial: { color: '#9a9d9f', h: [5, 8] }, // grey sheds
  school: { color: '#d9c489', h: [6, 9] }, // sand
  college: { color: '#b56d4e', h: [8, 12] }, // brick
  hospital: { color: '#e8e8e4', h: [10, 18] }, // white
  worship: { color: '#e9dfc8', h: [5, 9] }, // saffron-tinged white
}
const MAT_PROPS = {
  office: { roughness: 0.35, metalness: 0.35 },
  hospital: { roughness: 0.7, metalness: 0.05 },
}
const SHOP_COLORS = ['#d63a2f', '#1f7ec2', '#e8b021', '#2e9e4f', '#7b3fb5', '#e05c22', '#c2205a']

const WIN_DETAIL_R = 520 // window grids inside this radius (or on tall bldgs)
const MAX_WINDOWS = 48000

function categoryOf(k) {
  return CATS[k] ? k : 'residential'
}

// One deterministic pass assigning category + height to every footprint —
// the extrusions and the facade pass must agree on heights, so both consume
// this list (rng order is stable). Exported so OsmHighlights can wrap a
// specific building at its exact rendered height.
export function prepareBuildings(buildings) {
  const rng = mulberry32(90210)
  const out = []
  for (const b of buildings) {
    if (!b.p || b.p.length < 4) continue
    const cat = categoryOf(b.k)
    const def = CATS[cat]
    const jitter = randBetween(rng, def.h[0], def.h[1])
    const h = b.h > 2 ? b.h : jitter
    out.push({ p: b.p, cat, h })
  }
  return out
}

function buildCategoryGeometries(prepared) {
  const byCat = {}
  for (const b of prepared) {
    const pts = b.p
    const n = pts.length - 1 // footprint closes on itself
    const shape = new THREE.Shape()
    shape.moveTo(pts[0][0], -pts[0][1])
    for (let i = 1; i < n; i++) shape.lineTo(pts[i][0], -pts[i][1])
    shape.closePath()

    let geo
    try {
      geo = new THREE.ExtrudeGeometry(shape, { depth: b.h, bevelEnabled: false })
    } catch {
      continue // skip self-intersecting footprints rather than crash
    }
    geo.rotateX(-Math.PI / 2) // shape (x, -z) + depth → world (x, h, z)
    if (!byCat[b.cat]) byCat[b.cat] = []
    byCat[b.cat].push(geo)
  }

  const merged = {}
  for (const [cat, geos] of Object.entries(byCat)) {
    const g = mergeGeometries(geos)
    if (g) {
      delete g.attributes.uv // not textured; smaller GPU upload
      merged[cat] = g
    }
    geos.forEach((geo) => geo.dispose())
  }
  return merged
}

// Facades: walk every footprint edge and lay window columns along it,
// floor by floor. Detailed near the junction or on tall buildings, with a
// hard global budget. Also: rooftop tanks, commercial signboards.
function buildFacades(prepared) {
  const rng = mulberry32(777333)
  const windowsLit = []
  const windowsUnlit = []
  const tanks = []
  const shops = []

  // Nearest-first so the budget is spent where the camera lives.
  const withDist = prepared.map((b) => {
    const [cx, cz] = polygonCentroid(b.p)
    return { ...b, cx, cz, dist: Math.hypot(cx, cz) }
  })
  withDist.sort((a, b) => a.dist - b.dist)

  let winCount = 0
  for (const b of withDist) {
    const pts = b.p
    const n = pts.length - 1

    // Rooftop water tanks — very Bengaluru.
    if ((b.cat === 'residential' || b.cat === 'apartments') && rng() < 0.35) {
      tanks.push({ x: b.cx, z: b.cz, y: b.h, s: randBetween(rng, 0.8, 1.3) })
    }

    // Which side of an edge is "outside"? Probe once per polygon.
    let flip = 1
    {
      let li = 0
      let lLen = 0
      for (let i = 0; i < n; i++) {
        const ex = pts[i + 1][0] - pts[i][0]
        const ez = pts[i + 1][1] - pts[i][1]
        const l = ex * ex + ez * ez
        if (l > lLen) {
          lLen = l
          li = i
        }
      }
      const a = pts[li]
      const c = pts[li + 1]
      const ex = c[0] - a[0]
      const ez = c[1] - a[1]
      const eLen = Math.hypot(ex, ez) || 1
      const mx = (a[0] + c[0]) / 2 + (ez / eLen) * 0.6
      const mz = (a[1] + c[1]) / 2 - (ex / eLen) * 0.6
      if (pointInPolygon(mx, mz, pts)) flip = -1
    }

    // Shopfront signboard on the longest edge of commercial buildings.
    if (b.cat === 'commercial' && b.h > 3) {
      let li = 0
      let lLen = 0
      for (let i = 0; i < n; i++) {
        const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
        if (l > lLen) {
          lLen = l
          li = i
        }
      }
      if (lLen > 4) {
        const a = pts[li]
        const c = pts[li + 1]
        const ex = (c[0] - a[0]) / lLen
        const ez = (c[1] - a[1]) / lLen
        const nx = ez * flip
        const nz = -ex * flip
        shops.push({
          pos: [(a[0] + c[0]) / 2 + nx * 0.35, 3.1, (a[1] + c[1]) / 2 + nz * 0.35],
          scale: [0.3, 1.1, Math.min(lLen * 0.75, 12)],
          rotY: Math.atan2(ex, ez),
          color: SHOP_COLORS[Math.floor(rng() * SHOP_COLORS.length)],
        })
      }
    }

    // Window grids.
    if (winCount >= MAX_WINDOWS) continue
    if (b.h <= 4 || (b.dist > WIN_DETAIL_R && b.h < 22)) continue
    const rows = Math.min(12, Math.floor((b.h - 1.6) / 3.2))
    if (rows < 1) continue
    for (let i = 0; i < n; i++) {
      const a = pts[i]
      const c = pts[i + 1]
      const ex = c[0] - a[0]
      const ez = c[1] - a[1]
      const eLen = Math.hypot(ex, ez)
      if (eLen < 3.6) continue
      const dx = ex / eLen
      const dz = ez / eLen
      const nx = dz * flip
      const nz = -dx * flip
      const cols = Math.min(9, Math.floor((eLen - 1) / 3.4))
      const start = (eLen - (cols - 1) * 3.4) / 2
      const rotY = Math.atan2(nx, nz)
      for (let r0 = 0; r0 < rows; r0++) {
        const wy = 2.3 + r0 * 3.2
        for (let ci = 0; ci < cols; ci++) {
          if (rng() < 0.12) continue
          const along = start + ci * 3.4
          const item = {
            x: a[0] + dx * along + nx * 0.12,
            z: a[1] + dz * along + nz * 0.12,
            y: wy,
            rotY,
          }
          if (rng() < 0.55) windowsLit.push(item)
          else windowsUnlit.push(item)
          winCount++
        }
      }
      if (winCount >= MAX_WINDOWS) break
    }
  }
  return { windowsLit, windowsUnlit, tanks, shops }
}

function WindowInstances({ items, night, lit }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    items.forEach((wd, i) => {
      dummy.position.set(wd.x, wd.y, wd.z)
      dummy.scale.set(2.0, 1.4, 0.1)
      dummy.rotation.set(0, wd.rotY, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [items])
  if (!items.length) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#232a34"
        roughness={0.15}
        metalness={0.7}
        emissive={lit ? '#ffc98c' : '#000000'}
        emissiveIntensity={lit && night ? 1.9 : 0}
        toneMapped={!(lit && night)}
      />
    </instancedMesh>
  )
}

function ShopInstances({ items }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((sp, i) => {
      dummy.position.set(...sp.pos)
      dummy.scale.set(...sp.scale)
      dummy.rotation.set(0, sp.rotY, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      c.set(sp.color)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items])
  if (!items.length) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  )
}

function TankInstances({ items }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    items.forEach((t, i) => {
      dummy.position.set(t.x, t.y + 0.9 * t.s, t.z)
      dummy.scale.set(t.s, t.s, t.s)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [items])
  if (!items.length) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow>
      <cylinderGeometry args={[0.8, 0.8, 1.8, 10]} />
      <meshStandardMaterial color="#22201e" roughness={0.8} />
    </instancedMesh>
  )
}

export default function OsmBuildings({ osm, envMode = 'day' }) {
  const prepared = useMemo(() => prepareBuildings(osm.buildings), [osm])
  const geos = useMemo(() => buildCategoryGeometries(prepared), [prepared])
  const facades = useMemo(() => buildFacades(prepared), [prepared])
  const night = envMode === 'night'

  return (
    <group>
      {Object.entries(geos).map(([cat, geo]) => (
        <mesh key={cat} geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial
            color={CATS[cat].color}
            roughness={MAT_PROPS[cat]?.roughness ?? 0.85}
            metalness={MAT_PROPS[cat]?.metalness ?? 0}
            emissive={night ? '#5a4a22' : '#000000'}
            emissiveIntensity={night ? 0.22 : 0}
          />
        </mesh>
      ))}
      <WindowInstances items={facades.windowsLit} night={night} lit />
      <WindowInstances items={facades.windowsUnlit} night={night} lit={false} />
      <TankInstances items={facades.tanks} />
      <ShopInstances items={facades.shops} />
    </group>
  )
}

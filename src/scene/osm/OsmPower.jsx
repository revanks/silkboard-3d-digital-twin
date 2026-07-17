import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import InstancedBoxes from '../InstancedBoxes.jsx'
import { buildPath, inBounds } from './geo.js'
import { roadWidth } from './OsmRoads.jsx'

// Electricity distribution grid. OSM has no power data mapped in this area
// (powerNodes = 0 in the extract), so a plausible LT network is synthesized
// along residential streets: wooden/concrete poles every ~40 m with a
// crossarm and 3 sagging LT conductors, and a 2-pole transformer structure
// roughly every 10 poles — the standard Indian street pattern.

const POWER_CLASSES = new Set(['residential', 'unclassified', 'living_street'])
const POLE_SPACING = 40
const POLE_H = 8
const WIRE_Y = 7.6 // conductor attach height (just under the pole top)
const SAG = 0.6
const WIRE_SEGS = 6
const WIRE_OFFSETS = [-0.45, 0, 0.45] // along the crossarm
const TRANSFORMER_EVERY = 10

function buildGrid(roads) {
  const poles = [] // instanced cylinders
  const crossarms = [] // instanced boxes (rotY across the street)
  const xfmrPoles = [] // second pole of transformer structures
  const xfmrBodies = [] // transformer tanks
  // Conductors as thin vertical ribbon quads (merged, one draw call) —
  // GL lines are 1 px and vanish at any distance; ribbons stay visible.
  const wirePos = []
  const wireIdx = []
  let wireVi = 0
  const WIRE_T = 0.09
  const pushWireSeg = (ax, ay, az, bx, by, bz) => {
    wirePos.push(ax, ay, az, ax, ay + WIRE_T, az, bx, by, bz, bx, by + WIRE_T, bz)
    wireIdx.push(wireVi, wireVi + 1, wireVi + 2, wireVi + 1, wireVi + 3, wireVi + 2)
    wireVi += 4
  }
  let poleCount = 0

  for (const road of roads) {
    if (!POWER_CLASSES.has(road.c) || road.p.length < 2) continue
    const path = buildPath(road.p)
    if (path.length < 70) continue
    const off = roadWidth(road) / 2 + 1.0 // one consistent side per street

    let prev = null
    for (let s = 15; s < path.length - 10; s += POLE_SPACING) {
      const p = path.sample(s)
      // pole base, left side of the way
      const x = p.x + p.dz * off
      const z = p.z - p.dx * off
      if (!inBounds(x, z)) {
        prev = null // break the conductor run at the map edge
        continue
      }
      const rotY = Math.atan2(p.dx, p.dz)
      poles.push({ pos: [x, POLE_H / 2, z], scale: [0.3, POLE_H, 0.3] })
      // crossarm perpendicular to the wires (i.e. across, facing the road)
      crossarms.push({ pos: [x, WIRE_Y + 0.15, z], scale: [1.4, 0.16, 0.16], rotY })
      poleCount++

      // Transformer: double-pole structure with a tank slung between.
      if (poleCount % TRANSFORMER_EVERY === 0) {
        const tx = x + p.dx * 1.8
        const tz = z + p.dz * 1.8
        xfmrPoles.push({ pos: [tx, POLE_H / 2, tz], scale: [0.3, POLE_H, 0.3] })
        xfmrBodies.push({
          pos: [(x + tx) / 2, 5.4, (z + tz) / 2],
          scale: [0.9, 1.3, 1.6],
          rotY,
        })
      }

      // 3 catenary conductors from the previous pole on this street.
      if (prev) {
        for (const wo of WIRE_OFFSETS) {
          // offset each conductor along its pole's crossarm direction
          const ax = x + p.dz * wo
          const az = z - p.dx * wo
          const bx = prev.x + prev.pdz * wo
          const bz = prev.z - prev.pdx * wo
          let lx = bx
          let ly = WIRE_Y
          let lz = bz
          for (let i = 1; i <= WIRE_SEGS; i++) {
            const t = i / WIRE_SEGS
            const cx = bx + (ax - bx) * t
            const cz = bz + (az - bz) * t
            const cy = WIRE_Y - SAG * 4 * t * (1 - t)
            pushWireSeg(lx, ly, lz, cx, cy, cz)
            lx = cx
            ly = cy
            lz = cz
          }
        }
      }
      prev = { x, z, pdx: p.dx, pdz: p.dz }
    }
  }
  return { poles, crossarms, xfmrPoles, xfmrBodies, wirePos, wireIdx }
}

function PoleInstances({ items }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    items.forEach((it, i) => {
      dummy.position.set(...it.pos)
      dummy.scale.set(it.scale[0], it.scale[1], it.scale[2])
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [items])
  if (!items.length) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow>
      <cylinderGeometry args={[0.5, 0.65, 1, 6]} />
      <meshStandardMaterial color="#6e675c" roughness={0.9} />
    </instancedMesh>
  )
}

export default function OsmPower({ osm }) {
  const grid = useMemo(() => buildGrid(osm.roads), [osm])
  const wireGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(grid.wirePos, 3))
    g.setIndex(grid.wireIdx)
    return g
  }, [grid])

  return (
    <group>
      <PoleInstances items={grid.poles} />
      <PoleInstances items={grid.xfmrPoles} />
      <InstancedBoxes items={grid.crossarms} color="#4a443c" />
      <InstancedBoxes items={grid.xfmrBodies} color="#55595e" roughness={0.6} metalness={0.4} castShadow />
      <mesh geometry={wireGeo} frustumCulled={false}>
        <meshBasicMaterial color="#17171a" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

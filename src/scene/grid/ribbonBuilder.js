import * as THREE from 'three'

// Sagging-conductor ribbons as merged BufferGeometry quads, extending OsmPower.jsx's own pushWireSeg
// technique (GL Lines are 1px and vanish at distance, so real conductors need actual width). Merging
// every record into ONE mesh keeps this at a single draw call regardless of asset count (poles.
// LtLines/ServiceDrops each render 1 mesh for thousands of real edges), matching this codebase's
// existing instancing/merging performance discipline.
//
// Per-vertex color lets every ribbon carry its own color (age/health/risk-driven) despite being one
// merged mesh. A parallel faceRecordIndex (one entry per triangle, in emission order) lets a click's
// THREE.Intersection.faceIndex resolve back to which real record was hit -- a merged mesh only reports
// which triangle was hit, not "which line", so this lookup is what makes full click-to-inspect possible
// on a merged geometry at all.
export function buildRibbonMesh(records, { yFn, sag = 0.6, segs = 4, thickness = 0.09, colorFn }) {
  const positions = []
  const colors = []
  const indices = []
  const faceRecordIndex = []
  let vi = 0
  const tmpColor = new THREE.Color()

  const pushSeg = (ax, ay, az, bx, by, bz, recordIdx) => {
    positions.push(ax, ay, az, ax, ay + thickness, az, bx, by, bz, bx, by + thickness, bz)
    for (let k = 0; k < 4; k++) colors.push(tmpColor.r, tmpColor.g, tmpColor.b)
    indices.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2)
    faceRecordIndex.push(recordIdx, recordIdx)
    vi += 4
  }

  records.forEach((rec, recordIdx) => {
    tmpColor.set(colorFn(rec))
    let lx = rec.ax
    let ly = yFn(rec, 0)
    let lz = rec.az
    for (let i = 1; i <= segs; i++) {
      const t = i / segs
      const cx = rec.ax + (rec.bx - rec.ax) * t
      const cz = rec.az + (rec.bz - rec.az) * t
      const base = yFn(rec, t)
      const cy = base - sag * 4 * t * (1 - t)
      pushSeg(lx, ly, lz, cx, cy, cz, recordIdx)
      lx = cx
      ly = cy
      lz = cz
    }
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  return { geometry, faceRecordIndex }
}

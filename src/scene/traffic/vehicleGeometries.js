import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Two merged geometries per vehicle type, sharing the same instance matrix:
//   body — painted panels (per-instance colour)
//   dark — wheels, glass, windshields, chassis (one dark glossy material)
// Origin at road level, facing +Z, metres.
function box(w, h, d, y, z = 0, x = 0) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

export function makeVehicleGeometries() {
  return {
    bike: {
      body: mergeGeometries([
        box(0.45, 0.5, 1.9, 0.65),
        box(0.48, 0.8, 0.55, 1.25, -0.2), // rider
      ]),
      dark: mergeGeometries([
        box(0.12, 0.55, 0.55, 0.3, 0.75), // wheels
        box(0.12, 0.55, 0.55, 0.3, -0.75),
        box(0.32, 0.3, 0.34, 1.78, -0.2), // helmet
      ]),
    },
    car: {
      body: mergeGeometries([
        box(1.72, 0.6, 4.25, 0.72),
        box(1.6, 0.52, 2.3, 1.26, -0.15), // cabin
      ]),
      dark: mergeGeometries([
        box(0.26, 0.56, 0.62, 0.32, 1.35, 0.74),
        box(0.26, 0.56, 0.62, 0.32, 1.35, -0.74),
        box(0.26, 0.56, 0.62, 0.32, -1.35, 0.74),
        box(0.26, 0.56, 0.62, 0.32, -1.35, -0.74),
        box(1.64, 0.42, 2.12, 1.3, -0.15), // glasshouse
      ]),
    },
    suv: {
      body: mergeGeometries([
        box(1.85, 0.8, 4.45, 0.85),
        box(1.76, 0.6, 2.7, 1.6, -0.1),
      ]),
      dark: mergeGeometries([
        box(0.3, 0.66, 0.72, 0.38, 1.45, 0.78),
        box(0.3, 0.66, 0.72, 0.38, 1.45, -0.78),
        box(0.3, 0.66, 0.72, 0.38, -1.45, 0.78),
        box(0.3, 0.66, 0.72, 0.38, -1.45, -0.78),
        box(1.8, 0.48, 2.5, 1.64, -0.1),
      ]),
    },
    auto: {
      body: mergeGeometries([
        box(1.3, 0.9, 2.4, 0.8),
        box(1.36, 0.5, 1.8, 1.5, -0.15), // canopy
      ]),
      dark: mergeGeometries([
        box(0.18, 0.46, 0.46, 0.26, 1.0), // front wheel
        box(0.2, 0.46, 0.46, 0.26, -0.75, 0.5),
        box(0.2, 0.46, 0.46, 0.26, -0.75, -0.5),
        box(1.2, 0.5, 0.12, 1.28, 1.15), // windshield
      ]),
    },
    bus: {
      body: mergeGeometries([box(2.5, 2.7, 10.8, 1.9)]),
      dark: mergeGeometries([
        box(2.56, 1.0, 9.6, 2.85), // window band
        box(2.3, 1.15, 0.16, 2.5, 5.4), // windshield
        box(0.3, 0.95, 0.95, 0.5, 3.4, 1.12),
        box(0.3, 0.95, 0.95, 0.5, 3.4, -1.12),
        box(0.3, 0.95, 0.95, 0.5, -3.4, 1.12),
        box(0.3, 0.95, 0.95, 0.5, -3.4, -1.12),
      ]),
    },
    truck: {
      body: mergeGeometries([
        box(2.2, 2.0, 2.2, 1.95, 3.2), // cab
        box(2.4, 2.6, 6.2, 2.05, -1.3), // cargo body
      ]),
      dark: mergeGeometries([
        box(2.24, 0.5, 8.9, 0.55, 0.4), // chassis
        box(2.0, 0.85, 0.16, 2.5, 4.28), // windshield
        box(0.32, 0.95, 0.95, 0.5, 3.2, 1.05),
        box(0.32, 0.95, 0.95, 0.5, 3.2, -1.05),
        box(0.32, 0.95, 0.95, 0.5, -0.5, 1.05),
        box(0.32, 0.95, 0.95, 0.5, -0.5, -1.05),
        box(0.32, 0.95, 0.95, 0.5, -2.6, 1.05),
        box(0.32, 0.95, 0.95, 0.5, -2.6, -1.05),
      ]),
    },
  }
}

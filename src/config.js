// ─────────────────────────────────────────────────────────────
// Silk Board Junction Digital Twin — tuning constants
// Scale: 1 unit = 1 metre. Junction centre = world origin.
// Hosur Road runs along the Z axis (flyover above it),
// Outer Ring Road runs along the X axis.
// ─────────────────────────────────────────────────────────────

export const PLACE = {
  city: 'Bengaluru',
  name: 'Silk Board Junction',
  lat: 12.9177,
  lng: 77.6238,
}

export const CFG = {
  // ── Sun / atmosphere (golden hour) ──
  SUN_ELEVATION: 13, // degrees above horizon — lower = longer shadows
  SUN_AZIMUTH: 60, // degrees — kept behind the default camera so the view is front-lit, not blown out
  SUN_INTENSITY: 3.4,
  EXPOSURE: 1.05,
  FOG_COLOR: '#e7bd8e',
  FOG_DENSITY: 0.00075, // higher = hazier, more depth

  // ── Post-processing ──
  BLOOM_INTENSITY: 0.55, // soft glow on emissive lights
  ENABLE_DOF: true, // gentle depth of field on the junction
  AO_INTENSITY: 2.6,

  // ── World ──
  AREA_SIZE: 2000, // 2 km × 2 km around the junction
  CAMERA_START: [125, 42, 175], // low aerial, looking across the flyover
  CAMERA_TARGET: [0, 7, 0], // junction centre

}

// Direction pointing FROM origin TOWARDS the sun (unit vector).
export function sunDirection() {
  const el = (CFG.SUN_ELEVATION * Math.PI) / 180
  const az = (CFG.SUN_AZIMUTH * Math.PI) / 180
  return [
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az),
  ]
}

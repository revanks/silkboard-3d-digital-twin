// Real elevation across the GridSense pilot spans ~872-912m (a genuine ~40m relief band), but every
// existing layer in this scene (roads, buildings) sits within a 0.06-0.3m y-offset band on a flat
// Ground.jsx plane. Applying the real delta literally would make grid assets float 20-30m above/below
// the ground at the pilot's elevation extremes. Per the resolved plan decision: apply the real delta
// compressed by a damping factor, so real low/high areas read subtly lower/higher without visibly
// detaching from the flat ground -- "relief stylized for readability", not a literal terrain model.
export const RELIEF_DAMPING = 0.12

export function reliefY(rawDeltaMeters) {
  const d = typeof rawDeltaMeters === 'number' && !Number.isNaN(rawDeltaMeters) ? rawDeltaMeters : 0
  return d * RELIEF_DAMPING
}

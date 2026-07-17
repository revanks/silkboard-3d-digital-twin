import { useEffect, useState } from 'react'

// Loads the pre-fetched OpenStreetMap extract (public/osm_silkboard.json,
// produced by scripts/fetchOsm.mjs). Returns null while loading or when the
// file is absent — the caller falls back to the procedural scene, so a
// missing/broken JSON can never blank the screen.
export function useOsmData() {
  const [osm, setOsm] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/osm_silkboard.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        // Sanity-check the shape before trusting it.
        if (!cancelled && json && Array.isArray(json.roads) && Array.isArray(json.buildings)) {
          setOsm(json)
        }
      })
      .catch(() => {
        // Silent — procedural fallback renders instead.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return osm
}

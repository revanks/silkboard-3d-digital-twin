import { useEffect, useState } from 'react'

// Loads the real GridSense AI grid-asset export (public/gridsense_assets.json, produced by
// export_threejs_grid.py from v2_digital_twin_outputs/bengaluru_south). Returns null while loading or
// when the file is absent/malformed -- callers fall back to the existing synthetic OsmPower grid, same
// discipline as useOsmData.js so a missing/broken export can never blank the screen.
export function useGridAssets() {
  const [grid, setGrid] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/gridsense_assets.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled && json && Array.isArray(json.poles) && Array.isArray(json.transformers) && json.meta) {
          setGrid(json)
        }
      })
      .catch(() => {
        // Silent -- synthetic OsmPower fallback renders instead.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return grid
}

import { useEffect, useRef, useState } from 'react'
import { PLACE } from '../config.js'

// Live road-flow data for the junction (TomTom Traffic API), with a
// baked DEMO fallback. Data is ephemeral: fetched, rendered, discarded.
const KEY = import.meta.env.VITE_TOMTOM_KEY || ''
const LIVE_POLL_MS = 60_000 // TomTom fetch cadence
const TICK_MS = 8_000 // demo refresh / retry cadence

// Demo mode: a plausible Silk Board congestion wave so the scene stays alive.
function demoSnapshot() {
  const t = Date.now() / 1000
  const wave = Math.sin(t / 90) * 0.22 + Math.sin(t / 23) * 0.06
  const ratio = Math.min(0.85, Math.max(0.18, 0.42 + wave))
  const freeFlowSpeed = 46
  const freeFlowTravelTime = 188
  return {
    currentSpeed: Math.round(freeFlowSpeed * ratio),
    freeFlowSpeed,
    currentTravelTime: Math.round(freeFlowTravelTime / ratio),
    freeFlowTravelTime,
    confidence: 0.92,
    roadClosure: false,
    updatedAt: new Date(),
  }
}

async function fetchLive() {
  const url =
    `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json` +
    `?key=${KEY}&point=${PLACE.lat},${PLACE.lng}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const d = json && json.flowSegmentData
  // Parse by name with null-guards — never trust the payload shape.
  if (!d || typeof d.currentSpeed !== 'number' || !d.freeFlowSpeed) {
    throw new Error('unexpected payload')
  }
  return {
    currentSpeed: d.currentSpeed,
    freeFlowSpeed: d.freeFlowSpeed,
    currentTravelTime: typeof d.currentTravelTime === 'number' ? d.currentTravelTime : null,
    freeFlowTravelTime: typeof d.freeFlowTravelTime === 'number' ? d.freeFlowTravelTime : null,
    confidence: typeof d.confidence === 'number' ? d.confidence : 0.5,
    roadClosure: Boolean(d.roadClosure),
    updatedAt: new Date(),
  }
}

export function useLiveTraffic() {
  const [wantLive, setWantLive] = useState(Boolean(KEY))
  const [mode, setMode] = useState('DEMO')
  const [data, setData] = useState(demoSnapshot)
  const modeRef = useRef('DEMO')
  const lastFetch = useRef(0)

  useEffect(() => {
    let cancelled = false

    async function tick() {
      if (wantLive && KEY) {
        const now = Date.now()
        // Keep the last live reading between 60 s polls.
        if (modeRef.current === 'LIVE' && now - lastFetch.current < LIVE_POLL_MS) return
        try {
          lastFetch.current = now
          const d = await fetchLive()
          if (cancelled) return
          modeRef.current = 'LIVE'
          setMode('LIVE')
          setData(d)
          return
        } catch {
          // Silent fallback — a network failure must never break the scene.
        }
      }
      if (cancelled) return
      modeRef.current = 'DEMO'
      setMode('DEMO')
      setData(demoSnapshot())
    }

    tick()
    const id = setInterval(tick, TICK_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [wantLive])

  return { data, mode, hasKey: Boolean(KEY), wantLive, setWantLive }
}

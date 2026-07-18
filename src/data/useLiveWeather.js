import { useEffect, useRef, useState } from 'react'
import { PLACE } from '../config.js'

// Real "right now" weather + day/night for the scene's real location, via Open-Meteo's forecast
// endpoint (free, no key -- unlike useLiveTraffic.js's TomTom key gating, this is always attempted).
// Mirrors useLiveTraffic.js's exact tick/fallback/store shape for consistency.
const LIVE_POLL_MS = 60_000
const TICK_MS = 8_000

// WMO weather codes (Open-Meteo's `weather_code`) that mean rain/drizzle/thunderstorm.
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99])

// Real current hour in Bengaluru (IST), regardless of the browser's own timezone -- used only for
// the DEMO fallback's day/night guess, so it stays real-time-correct even with zero network.
function istHour() {
  const s = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: 'numeric' })
  return parseInt(s, 10) % 24
}

function demoSnapshot() {
  const hour = istHour()
  return {
    tempC: 27,
    condition: 'clear',
    isDay: hour >= 6 && hour < 19, // plausible Bengaluru sunrise/sunset band year-round
    sunrise: null,
    sunset: null,
    updatedAt: new Date(),
  }
}

async function fetchLive() {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${PLACE.lat}&longitude=${PLACE.lng}` +
    `&current=temperature_2m,precipitation,weather_code,is_day&daily=sunrise,sunset&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const c = json && json.current
  const d = json && json.daily
  // Parse by name with null-guards -- never trust the payload shape.
  if (!c || typeof c.temperature_2m !== 'number' || typeof c.weather_code !== 'number' || typeof c.is_day !== 'number') {
    throw new Error('unexpected payload')
  }
  return {
    tempC: c.temperature_2m,
    condition: RAIN_CODES.has(c.weather_code) ? 'rain' : 'clear',
    isDay: c.is_day === 1,
    sunrise: d && Array.isArray(d.sunrise) ? d.sunrise[0] : null,
    sunset: d && Array.isArray(d.sunset) ? d.sunset[0] : null,
    updatedAt: new Date(),
  }
}

export function useLiveWeather() {
  const [mode, setMode] = useState('DEMO')
  const [data, setData] = useState(demoSnapshot)
  const modeRef = useRef('DEMO')
  const lastFetch = useRef(0)

  useEffect(() => {
    let cancelled = false

    async function tick() {
      const now = Date.now()
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
        // Silent fallback -- a network failure must never break the scene.
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
  }, [])

  return { data, mode }
}

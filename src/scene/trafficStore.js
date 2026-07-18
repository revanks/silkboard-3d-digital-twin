// Shared mutable simulation state (read every frame — deliberately not React state).
export const sim = { speed: 1 } // 1× now; 10×/60× UI arrives in Stage 4

// Junction signal cycle. 'ns' = Hosur Rd at-grade + service roads,
// 'ew' = Outer Ring Road. Values: G green, A amber, R red.
export const PHASES = [
  { dur: 22, ns: 'G', ew: 'R' },
  { dur: 4, ns: 'A', ew: 'R' },
  { dur: 22, ns: 'R', ew: 'G' },
  { dur: 4, ns: 'R', ew: 'A' },
]

export const signal = { idx: 0, t: 0 }

// Live-data → simulation coupling. ratio = currentSpeed / freeFlowSpeed.
// Scales are applied to lane speed limits every frame.
export const flow = { ratio: 0.55, groundScale: 0.7, flyoverScale: 0.8 }

// Modelled counters the HUD reads (updated by TrafficSystem each frame).
export const stats = { total: 0, idle: 0 }

// Environment mode ('day' | 'night' | 'rain') — mirrored from React state
// so the render loop can read it without prop drilling.
export const env = { mode: 'day' }

// Real "right now" weather for the scene's location (Open-Meteo), mirrored from React state the same
// way `env` is — read by anything that wants live conditions without prop drilling.
export const weatherStore = { isDay: true, condition: 'clear', tempC: 28, source: 'DEMO' }

export function stepSignal(dt) {
  signal.t += dt
  while (signal.t >= PHASES[signal.idx].dur) {
    signal.t -= PHASES[signal.idx].dur
    signal.idx = (signal.idx + 1) % PHASES.length
  }
}

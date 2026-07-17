import React from 'react'
import { PLACE } from '../config.js'

const MODES = [
  ['day', '☀ DAY'],
  ['night', '☾ NIGHT'],
  ['rain', '☂ RAIN'],
]
const SPEEDS = [1, 10, 60]

export default function Overlay({
  cinematic,
  setCinematic,
  onResetView,
  envMode,
  setEnvMode,
  speed,
  setSpeed,
  topView,
  setTopView,
}) {
  return (
    <div className="overlay">
      <div className="title-block">
        <h1>{PLACE.name.toUpperCase()}</h1>
        <p>
          {PLACE.city} · {PLACE.lat}°N {PLACE.lng}°E · Digital Twin
        </p>
      </div>
      <div className="controls">
        <div className="btn-group">
          {MODES.map(([m, label]) => (
            <button
              key={m}
              className={envMode === m ? 'active' : ''}
              onClick={() => setEnvMode(m)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="btn-group">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={speed === s ? 'active' : ''}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>
        <button className={topView ? 'active' : ''} onClick={() => setTopView((v) => !v)}>
          ⊙ TOP VIEW
        </button>
        <button onClick={onResetView}>⌖ RESET VIEW</button>
        <button
          className={cinematic ? 'active' : ''}
          onClick={() => setCinematic((v) => !v)}
        >
          ◉ CINEMATIC {cinematic ? 'ON' : 'OFF'}
        </button>
      </div>
      <div className="hint">drag to orbit · scroll to zoom · right-drag to pan</div>
    </div>
  )
}

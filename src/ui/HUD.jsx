import React, { useEffect, useState } from 'react'
import { stats } from '../scene/trafficStore.js'

function fmtTime(d) {
  return d ? d.toLocaleTimeString('en-IN', { hour12: false }) : '—'
}

export default function HUD({ live, osmActive = false, inspectOpen, onCloseInspect }) {
  const { data, mode, hasKey, wantLive, setWantLive } = live

  // Poll the sim's modelled counters at ~1.5 Hz (no per-frame React churn).
  const [sim, setSim] = useState({ total: 0, idle: 0 })
  useEffect(() => {
    const id = setInterval(() => setSim({ total: stats.total, idle: stats.idle }), 700)
    return () => clearInterval(id)
  }, [])

  const ratio = Math.min(1, data.currentSpeed / Math.max(1, data.freeFlowSpeed))
  const score = data.roadClosure ? 8 : Math.round(ratio * 80 + data.confidence * 20)
  const scoreHue = score * 1.15 // 0 red → 100+ green
  const tti =
    data.currentTravelTime && data.freeFlowTravelTime
      ? data.currentTravelTime / data.freeFlowTravelTime
      : 1 / Math.max(ratio, 0.05)
  // Idling vehicles ≈ 13 g CO₂/min each → kg/hr (modelled, not measured)
  const co2 = Math.round((sim.idle * 13 * 60) / 1000)

  return (
    <>
      <div className="hud">
        <div className="hud-row hud-mode">
          <span className={`dot ${mode === 'LIVE' ? 'live' : 'demo'}`} />
          <span>{mode} DATA</span>
          <button
            className="hud-btn"
            onClick={() => setWantLive((v) => !v)}
            title={hasKey ? 'Toggle live/demo' : 'Add VITE_TOMTOM_KEY to .env to enable live data'}
          >
            {wantLive ? 'USE DEMO' : 'TRY LIVE'}
          </button>
        </div>

        <div className="hud-score">
          <div className="hud-score-num" style={{ color: `hsl(${scoreHue},70%,58%)` }}>
            {score}
          </div>
          <div className="hud-score-label">
            JUNCTION HEALTH
            <div className="bar">
              <div
                className="bar-fill"
                style={{ width: `${score}%`, background: `hsl(${scoreHue},70%,50%)` }}
              />
            </div>
          </div>
        </div>

        <div className="hud-row">
          <span>FLOW</span>
          <b>
            {data.currentSpeed} <i>/ {data.freeFlowSpeed} km/h</i>
          </b>
        </div>
        <div className="hud-row">
          <span>DELAY</span>
          <b>×{tti.toFixed(1)} travel time</b>
        </div>
        <div className="hud-row">
          <span>CONFIDENCE</span>
          <b>{Math.round(data.confidence * 100)}%</b>
        </div>

        <div className="hud-sep" />
        <div className="hud-row">
          <span>VEHICLES</span>
          <b>{sim.total}</b>
        </div>
        <div className="hud-row">
          <span>QUEUED</span>
          <b>{sim.idle}</b>
        </div>
        <div className="hud-row">
          <span>CO₂ (IDLING)</span>
          <b>~{co2} kg/hr</b>
        </div>
        <div className="hud-note">vehicle stats + CO₂ are modelled estimates</div>
        <div className="hud-note dim">updated {fmtTime(data.updatedAt)} · click the junction to inspect</div>
        {osmActive && (
          <div className="hud-note dim">map data © OpenStreetMap contributors (ODbL)</div>
        )}
      </div>

      {mode === 'DEMO' && (
        <div className="banner">Showing demo data — add your TomTom API key to .env for live data</div>
      )}

      {inspectOpen && (
        <div className="inspect">
          <div className="inspect-head">
            <span>SILK BOARD JUNCTION — {mode}</span>
            <button className="hud-btn" onClick={onCloseInspect}>✕</button>
          </div>
          <table>
            <tbody>
              <tr><td></td><td className="th">NOW</td><td className="th">NORMAL</td></tr>
              <tr>
                <td>Road speed</td>
                <td>{data.currentSpeed} km/h</td>
                <td>{data.freeFlowSpeed} km/h</td>
              </tr>
              <tr>
                <td>Segment travel time</td>
                <td>{data.currentTravelTime ? `${data.currentTravelTime}s` : '—'}</td>
                <td>{data.freeFlowTravelTime ? `${data.freeFlowTravelTime}s` : '—'}</td>
              </tr>
              <tr>
                <td>Road closure</td>
                <td colSpan={2}>{data.roadClosure ? 'YES' : 'no'}</td>
              </tr>
              <tr>
                <td>Data confidence</td>
                <td colSpan={2}>{Math.round(data.confidence * 100)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

import React from 'react'

// The persistent "DEMO DATA / JUNCTION HEALTH / FLOW / VEHICLES / CO2" corner panel and its
// "Showing demo data" banner were removed (2026-07-20, user request -- unnecessary permanent UI
// clutter). The click-to-inspect junction detail table is kept: it only appears on demand when the
// user clicks the junction, so it doesn't cost persistent screen space.
export default function HUD({ live, inspectOpen, onCloseInspect }) {
  const { data, mode } = live

  if (!inspectOpen) return null

  return (
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
  )
}

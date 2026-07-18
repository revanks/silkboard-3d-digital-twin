import React, { useMemo } from 'react'

const STATUS_NAME = ['Active', 'Under Maintenance', 'Decommissioned']

function avg(arr, key) {
  const vals = arr.map((r) => r[key]).filter((v) => typeof v === 'number' && !Number.isNaN(v))
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function statusCounts(arr) {
  const counts = { 0: 0, 1: 0, 2: 0 }
  for (const r of arr) counts[r.status] = (counts[r.status] ?? 0) + 1
  return counts
}

// Fleet-wide summary computed once client-side from the already-loaded grid JSON -- no new fetch,
// mirrors GridInspectPanel.jsx's real-attribute-only display discipline.
export default function GridStats({ grid }) {
  const stats = useMemo(() => {
    if (!grid) return null
    const types = [
      { label: 'Transformers', arr: grid.transformers },
      { label: 'Poles', arr: grid.poles },
      { label: 'LT Lines', arr: grid.ltLines },
      { label: 'Service Drops', arr: grid.serviceDrops },
      { label: 'Meters', arr: grid.meters },
    ]
    const totalCustomers = grid.substation?.totalCustomers ?? 0
    const totalKva = grid.substation?.totalKva ?? 0
    const allAssets = types.flatMap((t) => t.arr)
    const status = statusCounts(allAssets)
    return {
      types: types.map((t) => ({ label: t.label, count: t.arr.length, health: avg(t.arr, 'health') })),
      totalCustomers,
      totalKva,
      status,
    }
  }, [grid])

  if (!stats) return null
  return (
    <div className="grid-stats">
      <div className="grid-stats-head">GRIDSENSE AI FLEET SUMMARY</div>
      <table>
        <tbody>
          {stats.types.map((t) => (
            <tr key={t.label}>
              <td>{t.label}</td>
              <td>{t.count.toLocaleString()}</td>
              <td>{t.health !== null ? `avg health ${t.health.toFixed(0)}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="hud-sep" />
      <div className="hud-row">
        <span>TOTAL CUSTOMERS</span>
        <b>{stats.totalCustomers.toLocaleString()}</b>
      </div>
      <div className="hud-row">
        <span>INSTALLED CAPACITY</span>
        <b>{stats.totalKva.toLocaleString()} kVA</b>
      </div>
      <div className="hud-row">
        <span>ACTIVE/MAINT/DECOM</span>
        <b>
          {stats.status[0]}/{stats.status[1]}/{stats.status[2]}
        </b>
      </div>
    </div>
  )
}

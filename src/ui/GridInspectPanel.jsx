import React from 'react'

const TYPE_LABEL = {
  pole: 'POLE', ltLine: 'LT LINE (400V)', serviceDrop: 'SERVICE DROP', transformer: 'TRANSFORMER',
  substation: 'SUBSTATION', feeder: 'FEEDER (11kV)', recloser: 'RECLOSER', sectionalizer: 'SECTIONALIZER',
  meter: 'SMART METER',
}
const MATERIAL_NAME = ['Concrete', 'Steel', 'Wooden']
const STATUS_NAME = ['Active', 'Under Maintenance', 'Decommissioned']
const CUSTOMER_TYPE_NAME = ['Residential', 'Commercial', 'Industrial', 'School', 'Hospital']

// One generic panel every asset type's click handler opens (poles/lines/transformers/meters/...) --
// renders whatever real fields that record actually has, per asset type, instead of a bespoke panel
// per type. Field lists are deliberately short (the headline real attributes), not a full data dump.
const FIELD_DEFS = {
  pole: [
    ['age', 'Age', (v) => `${v.toFixed(1)} yr`],
    ['health', 'Health Index', (v) => `${v.toFixed(0)} / 100`],
    ['mat', 'Material', (v) => MATERIAL_NAME[v] ?? '—'],
    ['risk', 'Priority Score', (v) => v.toFixed(1)],
    ['status', 'Status', (v) => STATUS_NAME[v] ?? '—'],
  ],
  ltLine: [
    ['len', 'Length', (v) => `${v.toFixed(1)} m`],
    ['y', 'Attachment Height', (v) => `${v.toFixed(1)} m`],
    ['age', 'Age', (v) => `${v.toFixed(1)} yr`],
    ['health', 'Health Index', (v) => `${v.toFixed(0)} / 100`],
    ['risk', 'Priority Score', (v) => v.toFixed(1)],
    ['status', 'Status', (v) => STATUS_NAME[v] ?? '—'],
  ],
  serviceDrop: [
    ['len', 'Length', (v) => `${v.toFixed(1)} m`],
    ['age', 'Age', (v) => `${v.toFixed(1)} yr`],
    ['health', 'Health Index', (v) => `${v.toFixed(0)} / 100`],
    ['risk', 'Priority Score', (v) => v.toFixed(1)],
    ['status', 'Status', (v) => STATUS_NAME[v] ?? '—'],
  ],
  transformer: [
    ['kva', 'Rating', (v) => `${v} kVA`],
    ['cust', 'Customers Served', (v) => `${v}`],
    ['age', 'Age', (v) => `${v.toFixed(1)} yr`],
    ['health', 'Health Index', (v) => `${v.toFixed(0)} / 100`],
    ['load', 'Load / Rating Ratio', (v) => `${(v * 100).toFixed(0)}%`],
    ['hot', 'Peak Hotspot Temp', (v) => `${v.toFixed(0)} °C`],
    ['risk', 'Priority Score', (v) => v.toFixed(1)],
    ['status', 'Status', (v) => STATUS_NAME[v] ?? '—'],
  ],
  substation: [
    ['nTransformers', 'Transformers Fed', (v) => `${v}`],
    ['totalKva', 'Total Installed Capacity', (v) => `${v.toLocaleString()} kVA`],
    ['totalCustomers', 'Total Customers', (v) => v.toLocaleString()],
  ],
  feeder: [
    ['nTransformers', 'Transformers Fed', (v) => `${v}`],
    ['totalKva', 'Installed Capacity', (v) => `${v.toLocaleString()} kVA`],
    ['customers', 'Customers Served', (v) => v.toLocaleString()],
  ],
  recloser: [['feeder', 'Feeder', (v) => `#${v + 1}`]],
  sectionalizer: [['feeder', 'Feeder', (v) => `#${v + 1}`]],
  meter: [
    ['type', 'Customer Type', (v) => CUSTOMER_TYPE_NAME[v] ?? '—'],
    ['kwh', 'Avg Draw', (v) => `${v.toFixed(2)} kWh/hr`],
    ['health', 'Health Score', (v) => `${v.toFixed(0)} / 100`],
    ['risk', 'Priority Score', (v) => v.toFixed(1)],
    ['status', 'Status', (v) => STATUS_NAME[v] ?? '—'],
  ],
}

export default function GridInspectPanel({ inspect, onClose }) {
  if (!inspect) return null
  const { assetType, record } = inspect
  const fields = FIELD_DEFS[assetType] ?? []
  return (
    <div className="inspect grid-inspect">
      <div className="inspect-head">
        <span>
          {TYPE_LABEL[assetType] ?? assetType.toUpperCase()} — {record.id}
        </span>
        <button className="hud-btn" onClick={onClose}>✕</button>
      </div>
      <table>
        <tbody>
          {fields.map(([key, label, fmt]) => {
            const v = record[key]
            if (v === null || v === undefined) return null
            return (
              <tr key={key}>
                <td>{label}</td>
                <td colSpan={2}>{fmt(v)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="hud-note dim">GridSense AI digital twin — engineering-simulated attributes on real asset geometry</div>
    </div>
  )
}

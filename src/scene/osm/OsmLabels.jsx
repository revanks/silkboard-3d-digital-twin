import React, { useMemo } from 'react'
import { Label } from '../Landmarks.jsx'
import { polygonArea, polygonCentroid } from './geo.js'

// Name labels for the real places: every named non-residential building
// (IT offices, commercial complexes, schools, colleges, hospitals, places
// of worship…) plus the significant POIs, with category as sub-text.
// Priority-sorted so the civic anchors always make the cut.

const MAX_LABELS = 90

const CAT_TEXT = {
  school: 'School',
  college: 'College',
  university: 'University',
  hospital: 'Hospital',
  clinic: 'Clinic',
  bank: 'Bank',
  place_of_worship: 'Place of Worship',
  worship: 'Place of Worship',
  fuel: 'Fuel Station',
  marketplace: 'Market',
  police: 'Police',
  community_centre: 'Community Centre',
  library: 'Library',
  bus_station: 'Bus Station',
  apartments: 'Apartments',
  commercial: 'Commercial Complex',
  office: 'Offices · IT',
  residential: null,
  industrial: 'Industrial',
}

// Higher = more important; ties broken by footprint area.
const PRIORITY = {
  hospital: 8,
  college: 7,
  school: 7,
  office: 6,
  commercial: 6,
  worship: 5,
  place_of_worship: 5,
  bus_station: 5,
  marketplace: 5,
  police: 5,
  library: 4,
  community_centre: 4,
  bank: 4,
  clinic: 4,
  apartments: 3,
  fuel: 3,
  industrial: 2,
  residential: 1,
}

// Label float height above the building — real tag or category typical.
const CAT_H = {
  apartments: 18, office: 22, commercial: 11, hospital: 14, college: 10,
  school: 8, worship: 8, industrial: 7, residential: 7,
}

function buildLabels(osm) {
  const seen = new Set()
  const cands = []

  const push = (name, k, x, z, y, score) => {
    if (!name || name.length < 3) return
    const key = name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    cands.push({ name, sub: CAT_TEXT[k] ?? (k || null), x, z, y, score })
  }

  // Named buildings — the commercial complexes, IT offices, schools,
  // hospitals the map is actually known by.
  for (const b of osm.buildings) {
    if (!b.n || !b.p || b.p.length < 4) continue
    const area = Math.abs(polygonArea(b.p))
    const [cx, cz] = polygonCentroid(b.p)
    const k = b.k || 'residential'
    const h = b.h > 2 ? b.h : CAT_H[k] || 8
    push(b.n, k, cx, cz, h + 12, (PRIORITY[k] || 1) * 1e6 + area)
  }

  // POIs (amenity nodes) — many named places have no building polygon.
  for (const p of osm.pois) {
    push(p.n, p.k, p.x, p.z, 20, (PRIORITY[p.k] || 3) * 1e6)
  }

  cands.sort((a, b) => b.score - a.score)
  return cands.slice(0, MAX_LABELS)
}

export default function OsmLabels({ osm }) {
  const labels = useMemo(() => buildLabels(osm), [osm])
  return (
    <group>
      {labels.map((l, i) => (
        <Label
          key={`${l.name}-${i}`}
          pos={[l.x, l.y + (i % 3) * 3, l.z]}
          text={l.name.toUpperCase()}
          sub={l.sub || undefined}
          width={38}
          opacity={0.85}
        />
      ))}
    </group>
  )
}

// Fetches real OpenStreetMap data for the area around Silk Board Junction
// via the Overpass API and compiles it into public/osm_silkboard.json.
// Run: node scripts/fetchOsm.mjs [halfSizeMetres]
// Data © OpenStreetMap contributors, ODbL.
import { writeFileSync, mkdirSync } from 'node:fs'

const LAT0 = 12.9177
const LON0 = 77.6238
const HALF = Number(process.argv[2]) || 1000 // metres from centre

const M_PER_LAT = 110574
const M_PER_LON = 111320 * Math.cos((LAT0 * Math.PI) / 180)
const dLat = HALF / M_PER_LAT
const dLon = HALF / M_PER_LON
const bbox = `${LAT0 - dLat},${LON0 - dLon},${LAT0 + dLat},${LON0 + dLon}`

const query = `[out:json][timeout:150];
(
  way["highway"](${bbox});
  way["building"](${bbox});
  way["natural"="water"](${bbox});
  way["water"](${bbox});
  way["leisure"~"park|garden|pitch"](${bbox});
  way["power"](${bbox});
  node["power"](${bbox});
  way["railway"](${bbox});
  node["railway"~"station|stop"](${bbox});
  node["amenity"](${bbox});
  way["amenity"](${bbox});
);
out tags geom;`

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const r1 = (v) => Math.round(v * 10) / 10
const toXZ = (lat, lon) => [r1((lon - LON0) * M_PER_LON), r1(-(lat - LAT0) * M_PER_LAT)]

const HIGHWAY_KEEP = new Set([
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified',
  'residential', 'service', 'living_street',
  'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link',
])

const POI_AMENITIES = new Set([
  'school', 'college', 'university', 'hospital', 'clinic', 'police',
  'fire_station', 'bus_station', 'fuel', 'place_of_worship', 'marketplace',
  'library', 'bank', 'post_office', 'community_centre', 'townhall',
])

function buildingCategory(t) {
  const b = t.building || ''
  if (t.amenity === 'school' || b === 'school') return 'school'
  if (t.amenity === 'college' || t.amenity === 'university' || b === 'college' || b === 'university') return 'college'
  if (t.amenity === 'hospital' || t.amenity === 'clinic' || b === 'hospital') return 'hospital'
  if (t.amenity === 'place_of_worship' || b === 'temple' || b === 'church' || b === 'mosque') return 'worship'
  if (t.office || b === 'office') return 'office'
  if (b === 'industrial' || b === 'warehouse' || b === 'factory') return 'industrial'
  if (b === 'commercial' || b === 'retail' || t.shop) return 'commercial'
  if (b === 'apartments') return 'apartments'
  if (b === 'hotel') return 'commercial'
  return 'residential'
}

function centroid(pts) {
  let sx = 0, sz = 0
  for (const p of pts) { sx += p[0]; sz += p[1] }
  return [r1(sx / pts.length), r1(sz / pts.length)]
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchOverpass() {
  let lastErr
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        console.log(`Querying ${url} (attempt ${attempt + 1}) …`)
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'silkboard-digital-twin/0.1 (educational demo; sachinrev.work@gmail.com)',
            Accept: 'application/json',
          },
          body: 'data=' + encodeURIComponent(query),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.json()
      } catch (e) {
        lastErr = e
        console.warn(`  failed: ${e.message}`)
        await sleep(3000)
      }
    }
    await sleep(15000 * (attempt + 1))
  }
  throw lastErr
}

const json = await fetchOverpass()
console.log(`Elements received: ${json.elements.length}`)

const out = {
  meta: { lat0: LAT0, lon0: LON0, half: HALF, attribution: '© OpenStreetMap contributors (ODbL)' },
  roads: [], buildings: [], water: [], parks: [],
  powerNodes: [], powerLines: [], rails: [], stations: [], pois: [],
}

for (const el of json.elements) {
  const t = el.tags || {}

  if (el.type === 'node') {
    const [x, z] = toXZ(el.lat, el.lon)
    if (t.power) out.powerNodes.push({ t: t.power, x, z })
    else if (t.railway) out.stations.push({ n: t.name || 'Station', x, z })
    else if (t.amenity && POI_AMENITIES.has(t.amenity) && t.name)
      out.pois.push({ n: t.name, k: t.amenity, x, z })
    continue
  }

  if (el.type !== 'way' || !el.geometry) continue
  const pts = el.geometry.map((g) => toXZ(g.lat, g.lon))

  if (t.highway && HIGHWAY_KEEP.has(t.highway)) {
    out.roads.push({
      c: t.highway,
      n: t.name || null,
      b: t.bridge && t.bridge !== 'no' ? 1 : 0,
      o: t.oneway === 'yes' || t.oneway === '1' ? 1 : 0,
      l: t.layer ? Number(t.layer) : 0,
      p: pts,
    })
  } else if (t.building) {
    const levels = parseFloat(t['building:levels'])
    const height = parseFloat(t.height) || (levels ? levels * 3.3 : 0)
    out.buildings.push({
      p: pts,
      h: r1(height),
      k: buildingCategory(t),
      n: t.name || null,
    })
    if (t.amenity && POI_AMENITIES.has(t.amenity) && t.name) {
      const [x, z] = centroid(pts)
      out.pois.push({ n: t.name, k: t.amenity, x, z })
    }
  } else if (t.natural === 'water' || t.water) {
    out.water.push({ p: pts, n: t.name || null })
  } else if (t.leisure) {
    out.parks.push({ p: pts, n: t.name || null })
  } else if (t.power === 'line' || t.power === 'minor_line') {
    out.powerLines.push({ t: t.power, p: pts })
  } else if (t.railway) {
    out.rails.push({ t: t.railway, n: t.name || null, p: pts })
  } else if (t.amenity && POI_AMENITIES.has(t.amenity) && t.name) {
    const [x, z] = centroid(pts)
    out.pois.push({ n: t.name, k: t.amenity, x, z })
  }
}

console.log(
  `roads=${out.roads.length} buildings=${out.buildings.length} water=${out.water.length} ` +
  `parks=${out.parks.length} powerNodes=${out.powerNodes.length} powerLines=${out.powerLines.length} ` +
  `rails=${out.rails.length} stations=${out.stations.length} pois=${out.pois.length}`
)

mkdirSync('public', { recursive: true })
writeFileSync('public/osm_silkboard.json', JSON.stringify(out))
console.log('Wrote public/osm_silkboard.json')

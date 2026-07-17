# Silk Board Junction — Bengaluru Digital Twin

A browser-based, cinematic 3D digital twin of **Central Silk Board Junction, Bengaluru**
(12.9177°N, 77.6238°E) and the surrounding 2 km × 2 km area — Hosur Road, the
Outer Ring Road, the flyover, service roads, and procedural Bengaluru-style
urban fabric.

Built with **Vite + React + Three.js** (`@react-three/fiber`, `drei`,
`@react-three/postprocessing`).

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

**Controls:** drag to orbit · scroll to zoom · right-drag to pan ·
**CINEMATIC** button = slow auto-orbit.

## Build stages (per the project plan)

| Stage | What | Status |
| --- | --- | --- |
| 1 | Beautiful empty environment — roads, flyover, buildings, golden-hour lighting, post-processing | ✅ done |
| 2 | Life — ~1,250 instanced vehicles (two-wheelers, cars, autos, buses, trucks) with signal queuing, animated traffic lights, flyover through-traffic | ✅ this build |
| 3 | Live data — TomTom traffic speeds drive vehicle speeds, congestion ribbons + stats HUD, with silent DEMO fallback and click-to-inspect | ✅ this build |
| 4 | Extra modes — night view (lit windows, headlights, light pools), rain simulation (particles, wet roads, overcast), sim-speed 1×/10×/60× | ✅ done |
| 4.5 | Landmarks — Namma Metro Yellow Line viaduct + Central Silk Board station + animated trains, Blue Line (under construction) on ORR, Madiwala Lake, area/road/landmark name labels, TOP VIEW map camera | ✅ done |
| 5 | **Real OSM data** — real road network (incl. the flyover from bridge tags), 5,000+ real building footprints coloured by category, real water/parks, metro from mapped rail alignments, POI labels, streetlights along real majors, synthesized LT power grid | ✅ this build |

## OSM mode

When `public/osm_silkboard.json` exists (it ships with the repo), the scene
renders from real OpenStreetMap data; delete or rename it and the original
procedural scene renders instead — no network failure ever blanks the screen.
Refresh or enlarge the extract with:

```bash
node scripts/fetchOsm.mjs [halfSizeMetres]   # default 1000 → 2×2 km
```

OSM has no power infrastructure mapped in this area, so the electricity grid
is **synthesized**: poles every ~40 m along residential streets, 3 sagging LT
conductors, and a 2-pole transformer structure every ~10 poles.

## Tuning the look

All visual constants live in [`src/config.js`](src/config.js):

| Constant | Effect |
| --- | --- |
| `SUN_ELEVATION` / `SUN_AZIMUTH` | Sun angle — lower elevation = longer golden-hour shadows |
| `BLOOM_INTENSITY` | Glow on streetlights / signals |
| `FOG_DENSITY` | Atmospheric haze / depth |
| `EXPOSURE` | Overall brightness |
| `ENABLE_DOF` | Toggle depth of field (disable if FPS is low) |
| `AO_INTENSITY` | Ambient-occlusion strength |

Small nudges make a big difference — tune these before re-prompting.

## Live data (Stage 3 prep)

Copy `.env.example` to `.env` and add a free TomTom key
(developer.tomtom.com). With no key the app will run in DEMO mode with baked
data — a network failure never breaks the scene.

## Notes

- Scale: 1 unit = 1 metre, junction centre at the world origin. Hosur Road
  runs along Z (flyover above it), Outer Ring Road along X.
- Layout is **geographically inspired, stylized** — not an exact replica.
- Everything heavy is instanced (buildings, trees, markings, streetlights)
  to hold 60 fps.

## Attribution

Map data **© OpenStreetMap contributors**, licensed under the
[Open Database License (ODbL)](https://www.openstreetmap.org/copyright) —
also shown in the in-app HUD while OSM mode is active.
Traffic flow data © TomTom (when a key is configured).

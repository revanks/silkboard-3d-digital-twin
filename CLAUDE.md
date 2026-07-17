# Silk Board Junction — Bengaluru 3D Digital Twin

Real-time 3D digital twin of Central Silk Board Junction, Bengaluru
(12.9177°N, 77.6238°E), 2×2 km. Vite + React + Three.js
(`@react-three/fiber`, `drei`, `@react-three/postprocessing`).
Built following the staged method in `3D_City_Prompt.docx` (read it for the
philosophy: stage it, judge visuals per stage, never claim "exact replica" —
say "geographically accurate, stylized").

## Environment quirks (Windows 11, PowerShell 5.1)

- **Node is a portable install** at `C:\Users\sachin\.tools\node-v22.11.0-win-x64`
  (on user PATH). If a shell says `npm not recognized`, run:
  `$env:Path = "$env:Path;$env:USERPROFILE\.tools\node-v22.11.0-win-x64"`
- Run app: `npm run dev` → http://localhost:5173. Verify changes with `npm run build`.
- **Git and gh are also portable installs**: `~\.tools\git\cmd` and `~\.tools\gh\bin`
  (append both to `$env:Path` like Node). gh is logged in as **revanks** via the
  Windows keyring. Remote: https://github.com/revanks/silkboard-3d-digital-twin
  (public, branch `main`).

## Current state (all working, verified via build)

Stages 1–4 from the doc are **complete**, plus a realism pass:

- **Scene**: stylized Silk Board — Hosur Rd along Z (−Z = north/Madiwala,
  +Z = south/Electronic City), ORR along X (+X = east/HSR). 1 unit = 1 m,
  junction at origin. Flyover over the junction (`Flyover.jsx`, exports
  `flyoverHeight(z)`), procedural buildings w/ window grids + shopfronts,
  trees (rain trees/palms/gulmohar), streetlights, high-masts, Metro Yellow
  Line viaduct + station + animated trains, Blue Line construction piers on
  ORR, Madiwala Lake, name labels (`Landmarks.jsx`, exports `Label`).
- **Traffic** (`src/scene/traffic/`): ~1,250 instanced vehicles, 6 types
  (bike/car/suv/auto/bus/truck), each = body mesh + dark mesh (wheels/glass)
  sharing matrices. Follow-the-leader + signal queuing, sub-stepped physics
  (`MAX_SUBSTEP` 0.08 s) so 10×/60× sim speed stays stable. Night headlight/
  taillight instanced bars.
- **Shared mutable stores** (`src/scene/trafficStore.js`): `sim.speed`,
  `signal`/`PHASES` (junction cycle), `flow` (live-data congestion scales),
  `stats` (HUD counters), `env.mode` ('day'|'night'|'rain').
- **Live data** (`src/data/useLiveTraffic.js`): TomTom flow API, 60 s poll,
  silent DEMO fallback + banner. Key via `.env` `VITE_TOMTOM_KEY` (user has
  NO key yet — always DEMO so far). Congestion drives vehicle speeds +
  `CongestionRibbons` colour + HUD (health score, TTI, modelled CO₂).
- **UI**: Overlay (DAY/NIGHT/RAIN, 1×/10×/60×, TOP VIEW, RESET VIEW,
  CINEMATIC), HUD bottom-right, click junction → inspect panel.
- **Env modes**: most scene components take an `envMode` prop; night = stars,
  lit windows, light pools; rain = particles + wet asphalt + overcast.
- Visual tunables are named constants in `src/config.js`.

## OSM mode — COMPLETE (built + build-verified + screenshot-verified)

The scene now renders from **real OSM data** when `public/osm_silkboard.json`
exists; the procedural scene is the automatic fallback (delete/rename the
JSON to see it). Awaiting user judgement of the visuals — tune, don't extend,
until they've approved a screenshot.

- `scripts/fetchOsm.mjs` — Overpass fetch, `node scripts/fetchOsm.mjs
  [halfSizeMetres]` (needs the Node PATH line). Current extract: ~1,034
  roads, 5,271 buildings, 11 water, 24 parks, 11 rails, 6 stations, 94 POIs;
  no OSM power data here → grid is synthesized. JSON schema:
  `{meta{lat0,lon0,half}, roads[{c,n,b,o,l,p:[[x,z]..]}], buildings[{p,h,k,n}],
  water[{p,n}], parks[{p,n}], powerNodes, powerLines, rails[{t,n,p}],
  stations[{n,x,z}], pois[{n,k,x,z}]}`. Coords in local metres (x=east, z=south).

**What was built (all in `src/scene/osm/` unless noted):**
- `src/data/useOsmData.js` — fetches `/osm_silkboard.json`, null on failure.
- `geo.js` — `buildPath(pts)` arc-length sampler (s → pos+dir, binary search),
  `polygonArea`/`polygonCentroid`, and **`MAP_BOUND = 1250` + `inBounds(x,z)`**.
  IMPORTANT LESSON: Overpass returns way geometry running far past the bbox
  (points out to ±1200+, plus sparse "jump" segments where intermediate nodes
  were dropped) — everything placed along paths (ribbons, dashes, piers,
  lights, power poles/wires, metro deck, vehicles, trains) must be clipped
  with `inBounds`, else wires/decks float over the void past the ground plane.
- `OsmRoads.jsx` — merged vertex-coloured ribbons (1 draw call ground +
  1 bridges); width/tint/y-rank by class; `b:1` ways elevate to 7 m with 45 m
  smoothstep ramps (exports `bridgeHeight(s,length,rs,re)`, `roadWidth(road)`)
  + piers every 25 m + concrete parapet walls along deck edges; dashed centre
  markings on tertiary+ via InstancedBoxes.
  KEY LESSON: OSM chops the flyover complex into ~10 connected ways
  ("Silk Board Flyover", "Silkboard Double Decker Flyover", "Silk Board
  Interchange" = the 620 m U-turn loop, "Ramp A", "Ragigudda-Silk Board
  Integrated Flyover"). A deck must only ramp to ground at endpoints NO other
  bridge way shares — `annotateBridgeRamps(roads)` in geo.js (called once in
  OsmWorld) sets `rs`/`re` per way; roads/traffic/lights all pass them to
  `bridgeHeight`. Without this the interchange dips to grade at every join.
- `OsmBuildings.jsx` — ExtrudeGeometry footprints merged per category
  (~9 draw calls for 5,271 buildings); `h` tag or category default +
  deterministic jitter (mulberry32, `prepareBuildings` shared by extrusion +
  facade passes so heights agree); category colours per plan; mild emissive
  at night. Facades (user asked for "building exteriors"): window grids
  walked along every footprint edge (outward side found by point-in-polygon
  probe on the longest edge; lit/unlit split glows at night; nearest-first
  with 48k budget, detailed <520 m or h>22), rooftop water tanks on
  residential/apartments, coloured shopfront signboards on commercial.
- `OsmWater.jsx` — merged flat ShapeGeometry water + parks.
- `OsmTraffic.jsx` — ~2,200 vehicles (MAX_VEHICLES cap) on trunk/primary/
  secondary/tertiary(+links) >120 m; oneway = 2 lanes ±1.6, bidirectional =
  1 lane/dir on the LEFT of travel ((dz,−dx)); signal stop where a way passes
  within 50 m of origin (group by |dx|>|dz|, skip bridges — only ~3 ways
  qualify, that's correct); same substep physics/palettes/light bars as
  TrafficSystem (PALETTES/MIXES/pickType now exported from buildTraffic.js);
  out-of-bounds vehicles collapse to scale ~0.
- `OsmLights.jsx` — poles every 48 m along majors, alternating sides,
  offset w/2+1.2, follows bridge decks; arm reaching 2.3 m over the
  carriageway with the lamp head at its tip; night pools under the head,
  grounded poles only.
- `OsmPower.jsx` — synthesized LT grid: poles every 40 m along residential/
  unclassified/living_street, crossarms, 3 catenary conductors (sag 0.6,
  6 segs) as merged thin vertical ribbon quads — GL lineSegments are 1 px
  and invisible at distance, ribbons read — 2-pole transformer every 10th
  pole.
- `OsmMetro.jsx` — viaduct deck+rails ribbon (y 14.5) from `t !== 'proposed'/
  'construction'` rails, piers every 30 m, construction ways → bare pier rows;
  2 trains (6 coaches, opposite directions) run the longest built way and
  dwell 11 s at the station node nearest origin; station structure + label.
- `OsmLabels.jsx` — up to 90 labels, priority-sorted (hospital > school/
  college > office/commercial > worship > … > residential, ties by footprint
  area): all named buildings + POIs, category sub-text ("Offices · IT",
  "Commercial Complex", "School"…), name-deduped, label floats above real/
  typical building height.
- `OsmHighlights.jsx` — pins real companies OSM doesn't name. `HIGHLIGHTS`
  list of {name, sub, x, z, radius, kinds, maxBuildings}; snaps to the
  largest office/commercial footprints near the geocoded point (uses
  exported `prepareBuildings` so shell heights match the rendered city) and
  renders pulsing glow jackets + additive light beam + bobbing pin + Label.
  First entry: Happiest Minds Technologies (SMILES campus, geocoded
  12.92040/77.62096 → local (−309,−301); OSM maps its blocks as offices
  "M3"/"M4" — sanity anchors: Madiwala Traffic Police Stn + Jamia Masjid
  next door). GEOCODING TRICK when Nominatim/Overpass draw a blank (place
  not in OSM): Waze's legacy endpoint
  `waze.com/SearchServer/mozi?q=<name>&lat=..&lon=..` returns JSON with
  lat/lon; overpass-api.de may 406/429 — private.coffee + kumi.systems are
  the fallback mirrors (see fetchOsm.mjs ENDPOINTS).
- `OsmWorld.jsx` — composes all of the above.
- Wiring: `CityScene` takes `osm` prop (`App` calls `useOsmData()`);
  OSM mode keeps Lighting/Ground/Rain/Effects/CongestionRibbons, passes
  `osmMode` to StreetFurniture (HighMasts + TrafficSignals only) and
  Landmarks (district/road/junction labels only — lake + landmark boxes off).
- Attribution: HUD shows "map data © OpenStreetMap contributors (ODbL)" when
  OSM is active; README has OSM-mode + attribution sections.

**Screenshot verification trick (no chromium-cli here):** headless Edge —
`& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
--headless=new --window-size=1600,900 --virtual-time-budget=20000
--screenshot=out.png http://localhost:5173`; for clicks (TOP VIEW/NIGHT),
`npm i puppeteer-core` in the scratchpad and launch it with
`executablePath` pointing at msedge.exe.

**Scaling to more area / all of Bengaluru (after OSM mode works):**
re-run `fetchOsm.mjs` with bigger half-size (e.g. 2500) — watch Overpass
limits; beyond ~5×5 km switch to tiled JSONs (grid of 2 km tiles, load by
camera distance), merge geometry per tile, LOD: drop windows/traffic on far
tiles. Whole city needs a different data path (Geofabrik extract + osmium
preprocessing instead of Overpass).

## Working agreements

- One stage per iteration; user judges a screenshot before the next stage.
- Never break the scene on network failure — every data source has a demo/
  procedural fallback.
- Label modelled numbers as "modelled estimate" in the HUD.
- All heavy geometry instanced or merged; verify 60 fps before adding detail.
- After changes: `npm run build` to verify, dev server hot-reloads.

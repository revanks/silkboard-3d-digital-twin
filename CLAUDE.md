# Silk Board Junction — Bengaluru 3D Digital Twin

Real-time 3D digital twin of Central Silk Board Junction, Bengaluru
(12.9177°N, 77.6238°E), 2×2 km. Vite + React + Three.js
(`@react-three/fiber`, `drei`, `@react-three/postprocessing`).
Built following the staged method in `3D_City_Prompt.docx` (read it for the
philosophy: stage it, judge visuals per stage, never claim "exact replica" —
say "geographically accurate, stylized").

## No-Node deployment (2026-07-20) — the primary way to RUN this on another machine

Another laptop hit Node-related errors (missing `node_modules`, npm install failures). Same
fix as the sibling GridSense AI project's `frontend/` (see that repo's CLAUDE.md §25): this
app is 100% static once built — no backend calls at runtime, everything is either a bundled
JS asset or a static JSON file in `public/` (`gridsense_assets.json`, `osm_silkboard.json`).
Node is only needed to *build*, never to *run*.

- **`dist/` is now committed to this repo** (`.gitignore`'s old `dist` line was removed —
  same "silently excluded the bundle" gotcha the parent project hit, fixed the same way).
  Rebuild + recommit `dist/` (`npm run build`, needs Node) whenever `src/` or `public/`
  changes; a no-Node machine otherwise serves a stale build.
- **`serve.py`** (new, stdlib-only, zero pip/npm dependencies) serves `dist/` correctly —
  run `python serve.py [port]` (default 4173) and open the printed URL. It explicitly forces
  correct MIME types for `.js`/`.json` (Windows' registry-derived guesses can otherwise mislabel
  the Vite build's ES module script as `text/plain`, which browsers refuse to execute).
- Verified end-to-end on this machine: killed the Node dev server, served purely via
  `python serve.py`, confirmed correct `Content-Type` headers (`text/javascript` for the
  bundle, `application/json` for both data files) and did a real headed-browser (Playwright,
  `headless=False` — headless still hits `WebGL: CONTEXT_LOST_WEBGL` here, see below) pass:
  scene rendered fully, real GridSense fleet summary panel showed correct live numbers (40
  transformers / 8,668 poles / 5,972 LT lines / 5,837 service drops+meters), zero console
  errors beyond the one pre-existing harmless favicon 404 this project already had.
- **New-machine procedure**: copy/clone the repo (already has `dist/` committed) → install
  Python (only) → `python serve.py` → open `http://localhost:4173/`. No `npm install`, no
  Node install, no build step needed at all on that machine.

## Environment quirks (Windows 11, PowerShell 5.1) — for DEVELOPING, not for just running it

- **Node is a portable install** at `C:\Users\sachin\.tools\node-v22.11.0-win-x64`
  (on user PATH). If a shell says `npm not recognized`, run:
  `$env:Path = "$env:Path;$env:USERPROFILE\.tools\node-v22.11.0-win-x64"`
- Dev server (hot reload, needs Node): `npm run dev` → http://localhost:5173.
  Verify changes with `npm run build`, then recommit `dist/` (see above).
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

## Video tour pipeline (media/silkboard_digital_twin_tour.mp4)

`?tour=1` swaps OrbitControls for `src/scene/TourRig.jsx` (generic keyframe
interpolator; recorder injects `window.__tourPlan` segments + calls
`window.__startTour()`; state on `window.__tourState`) and disables DoF in
`Effects.jsx` (blurs wide shots). Scratchpad pipeline (this session's
scratchpad): `makevo.mjs` (msedge-tts, en-IN-NeerjaNeural, 8 chapters) →
`plan.mjs` (chapter camera keys + VO-timed segments → tour_plan.json) →
`mixvo.mjs` (adelay/amix → vo_full.m4a) → `record.mjs` (puppeteer-core +
headed msedge, canvas.captureStream+MediaRecorder → tour.webm via download;
needs `protocolTimeout` ≥ tour length and `--disable-backgrounding-occluded-
windows --disable-renderer-backgrounding --disable-background-timer-
throttling` else an occluded window freezes rAF) → ffmpeg-static mux.
LESSONS: camera paths must dodge the 70 m label sprites near origin;
Madiwala Lake is at/past the map edge — the lakes/parks chapter shoots the
east-side ponds + HSR park instead.

## GridSense AI real grid integration — COMPLETE (2026-07-18)

The synthetic `OsmPower.jsx` grid is now replaced (when `public/gridsense_assets.json` is present) by
the **real** electric-distribution digital twin from the sibling project `../` (GridSense AI /
`v2_digital_twin/`, BLR_SOUTH pilot — see that repo's own `CLAUDE.md` §7 onward). Same real Silk Board
Junction neighbourhood, independently-fetched real GridSense OSM data, ~121 m off this scene's own
`lat0/lon0` — reprojected through this scene's own `toXZ` formula so it lands correctly on this scene's
existing basemap. Planned via a full `EnterPlanMode` pass in the parent GridSense session (plan file
`C:\Users\sachin\.claude\plans\mossy-moseying-naur.md`), built and verified in 6 stages exactly like the
OSM-mode work above.

**Data pipeline (lives in the sibling repo, not here):** `v2_digital_twin/threejs_export.py` +
`export_threejs_grid.py` reproject GridSense's 9 real physical layers + join the 5 feature-store
attribute CSVs, write `public/gridsense_assets.json` here (~3.45 MB; real counts 1 substation / 3
feeders / 3 reclosers / 9 sectionalizers / 40 transformers / 8,668 poles / 5,972 LT lines / 5,837
service drops / 5,837 meters). Re-run that script from the parent repo whenever GridSense's own pipeline
output changes — this JSON is a snapshot, not live-synced.

**New `src/data/useGridAssets.js`** — mirrors `useOsmData.js`'s exact null-on-any-failure pattern.

**New `src/scene/grid/`** (parallel to `scene/osm/`): `gridColors.js` (ports the parent repo's own
`dashboard/map_layers.py` `SEQUENTIAL_RAMP_HEX`/`CUSTOMER_TYPE_COLORS` verbatim), `relief.js` (real
elevation 872–912 m compressed ×0.12 so it reads as subtle relief without detaching from this scene's
flat `Ground.jsx`), `ribbonBuilder.js` (generalizes `OsmPower.jsx`'s sagging-ribbon technique into a
reusable merged-`BufferGeometry` builder that ALSO emits a parallel `faceRecordIndex` array — this is
what makes individual LT-line/service-drop clicks resolvable on one merged mesh; the one genuinely new
technique this needed beyond what already existed), `GridPoles.jsx` (real material color via
`setColorAt`, same idiom as `OsmBuildings.jsx`'s `ShopInstances`), `GridLtLines.jsx`/
`GridServiceDrops.jsx` (real per-edge attach height/length), `GridTransformers.jsx` (tank size bucketed
by real BESCOM kVA, color reflects real `peak_hotspot_temperature`), `GridSubstation.jsx` (hero
treatment reusing `OsmHighlights.jsx`'s pulsing-glow/beacon/`Label` idiom for the one real substation),
`GridSwitchgear.jsx` (12 individual meshes, reclosers+sectionalizers), `GridMeters.jsx`, `GridNetwork.jsx`
(top-level wrapper).

**New `src/ui/GridInspectPanel.jsx`** — ONE generic panel every asset type's click opens
(`{assetType, record}` → real fields per a lookup table), not a panel per type. **New
`src/ui/GridStats.jsx`** — fleet-wide summary computed client-side from the loaded JSON (asset counts,
avg health per type, total customers/kVA, Active/Maint/Decom split).

**New `src/data/useLiveWeather.js`** — mirrors `useLiveTraffic.js`'s live/demo pattern but hits
Open-Meteo's **forecast** endpoint (not GridSense's own archive-endpoint helper, which has a 5-day lag),
no key needed. DEMO fallback derives day/night from the real current IST clock (`Asia/Kolkata`
explicitly, regardless of the browser's own timezone) so it stays time-correct fully offline. New
`weatherStore` in `trafficStore.js` (same mutable-object pattern as `env`/`flow`/`sim`). `App.jsx` gained
a 4th `envMode` value `'live'`: `effectiveEnvMode` derives day/night/rain from real weather+time and is
what actually gets passed to `CityScene`/`Effects` — `Lighting.jsx` needs zero changes, it never learns
a "live" mode exists. The existing manual DAY/NIGHT/RAIN toggles are untouched (kept manual on purpose —
the tour-recording pipeline above depends on deterministic manual mode control).

**Verification** (real headed-browser checks, not assumed): parked the camera at known real asset
coordinates (temp edit to `config.js` `CAMERA_START`/`CAMERA_TARGET`, always reverted after) and clicked
each — pole `PL_BLR_SOUTH_000001`, LT line `LT_BLR_SOUTH_003416` (merged-mesh face-index resolution),
transformer `TX_BLR_SOUTH_000001`, substation `SUB_BLR_SOUTH_000001`, recloser
`RCL_BLR_SOUTH_000001`, meter `MTR_BLR_SOUTH_000001` — every field matched the source JSON exactly,
including the transformer's amber warning-tier tank color at its real 95°C hotspot. Confirmed a real
`api.open-meteo.com/v1/forecast` call returns 200 and LIVE mode correctly rendered night at the real
current time (01:25 IST); blocked the API entirely and the DEMO fallback also correctly showed night
(derived from the real clock, not the network). Cycled every env mode × every color mode × cinematic ×
top view × reset × grid on/off × a click in one sequence — zero console errors.

LESSON: `CameraRig.jsx`'s `topView` toggle snaps `CAMERA_START`/`CAMERA_TARGET` to hardcoded values on
**every** toggle, including toggling it back off — don't touch TOP VIEW mid-verification-sequence if
you've manually panned/zoomed, it silently discards the camera state.

**Known, deliberate gap**: feeders (3 real 11kV backbones) have no dedicated 3D conductor geometry —
GridSense never modeled real attachment-height/material for them, only for pole/transformer/lt_line/
service_drop/meter. Confirmed as a deliberate honesty choice (via `AskUserQuestion` in the parent
session), not an oversight. They DO now get a small floating marker + label (see below) — that's just
an ID tag at the feeder's path midpoint, not an attempt at real conductor geometry.

## Distance-based asset-ID labels + bigger/thicker geometry (2026-07-20)

User asked for every one of the ~26,370 real assets (1 substation / 3 feeders / 3 reclosers /
9 sectionalizers / 40 transformers / 8,668 poles / 5,972 LT lines / 5,837 service drops / 5,837
meters) to be clearly visible with its real asset ID showing. Confirmed via `AskUserQuestion`
(permanently labeling all ~26k at once would be an unreadable, unusably slow wall of text): went
with **distance-based auto-labels** (labels appear only for assets near the camera, recomputed a few
times a second not every frame) + **thicker/bigger geometry** for visual distinctness.

- **New `src/scene/grid/AssetIdLabels.jsx`** — generic, reused by every Grid* component. Takes
  `items`, `getPos(item)`, `getColor(item)` (so the label chip's accent border matches whatever color
  mode is currently active — verified: switching REALISTIC/RISK/FEEDER live-recolors the label chips,
  not just the meshes), `radius`, `maxCount`. Every ~0.25s (not every frame — 8,668 simple squared-
  distance checks at 4Hz is cheap; at 60Hz it'd be wasteful), computes the nearest `maxCount` items
  within `radius` of the camera and renders just those as small canvas-texture sprites showing the
  real full `record.id` string (no truncation/abbreviation — matches what `GridInspectPanel` already
  shows on click). A `sameIds` check skips the React state update when the visible set hasn't changed
  (camera stationary), avoiding needless re-renders.
- Wired into `GridPoles`/`GridTransformers`/`GridLtLines`/`GridServiceDrops`/`GridMeters`/
  `GridSwitchgear` (each passes its own already-computed color function through, so labels and meshes
  never disagree on color). Reclosers/sectionalizers (only 12 total) use an effectively-infinite radius
  since there's no clutter risk at that count.
- **New `src/scene/grid/GridFeederLabels.jsx`** — feeders had zero object representation before this
  (only a color-mode grouping key). Adds a small floating marker (feeder-colored octahedron) + real ID
  label at each feeder's path midpoint. Deliberately NOT full conductor geometry — stays inside the
  existing documented gap above.
- `GridSubstation`'s existing hero label gained the real substation ID on its sub-line.
- **Geometry thickened for visibility** (was near-imperceptible at typical city-view zoom):
  pole radius scale 0.3→0.5, meter box 0.3→0.45, LT-line ribbon thickness 0.09→0.14, service-drop
  ribbon thickness 0.045→0.08. Transformers/reclosers/sectionalizers were already large enough, left
  unchanged.
- New Overlay button "🏷 ID LABELS ON/OFF" (`showLabels` state in `App.jsx`, threaded through
  `CityScene`→`OsmWorld`→`GridNetwork`→every Grid* component), default ON.
- `GridInspectPanel.jsx` gained a `feeder` entry (TYPE_LABEL + FIELD_DEFS) so clicking a new feeder
  marker opens a real inspect panel instead of an empty one.
- **Verified** via headed Playwright (not headless — the standing WebGL-in-headless finding still
  applies): zoomed toward a dense pole cluster, confirmed real IDs (e.g. `PL_BLR_SOUTH_008403`,
  `PL_BLR_SOUTH_008356`) render legibly; toggled RISK and FEEDER color modes and confirmed label chip
  borders recolor along with the meshes; toggled the ID LABELS button off then back on and confirmed
  labels actually disappear/reappear; zero new console errors (only the pre-existing harmless favicon
  404). `npm run build` clean; `dist/` rebuilt and recommitted per the no-Node deployment note above.

## Transformers made bigger + uniform vivid green (2026-07-20, same session, presentation request)

Follow-up ask: transformers should be an even bigger, distinctly-colored 3D model, visible from
anywhere in the scene, for presentation purposes.

- `GridTransformers.jsx`'s `KVA_SCALE` table doubled (every `[w,h,d]` entry ×2 from the original
  plausible-tank-size values) — presentation-driven exaggeration, not a "more realistic size" claim.
- New `TRANSFORMER_GREEN = '#12e07a'` (exported) — in `realistic` color mode, EVERY transformer is now
  this one uniform vivid green, no exceptions. This replaces the previous hotspot-driven amber/red
  shift in realistic mode (that thermal signal is still fully visible via the RISK color mode, which
  is untouched) — a deliberate simplification so transformers read as "transformer" unambiguously
  from any distance during a presentation, rather than varying color by temperature.
  RISK/FEEDER color modes are completely unchanged.
- The instancedMesh's shared material now also gets an `emissive`/`emissiveIntensity` boost (green,
  0.8) whenever `colorMode === 'realistic'` (0 in RISK/FEEDER mode, so those modes' own color language
  isn't muddied by an unrelated green glow) — makes them visibly pop/glow rather than just being a
  bigger flat-shaded box.
- Label radius bumped 180→220m to match the increased at-a-distance visibility.
- **Verified**: parked the camera at real transformer `TX_BLR_SOUTH_000001`'s exact coordinates
  (temp `config.js` edit, reverted immediately after per the established `CameraRig`/verification
  discipline) — confirmed a large, vividly glowing green box, clearly readable even pulled back to
  where surrounding poles/buildings are small; other transformers elsewhere in the scene were visible
  as small green specks from very far away, confirming the "visible from anywhere" goal. Zero new
  console errors. `npm run build` clean; `dist/` rebuilt and recommitted.

**Repo note**: this folder has its own `.gitignore`'d `media/` now (added this session — a pre-existing
~230 MB `media/silkboard_digital_twin_tour.mp4` exceeds GitHub's 100 MB single-file push limit;
regenerate via the tour pipeline above if needed, don't commit captured video).

## Removed the persistent "demo data" traffic HUD panel (2026-07-20)

User asked to remove the bottom-right corner panel (DEMO DATA/TRY LIVE, JUNCTION HEALTH, FLOW, DELAY,
CONFIDENCE, VEHICLES, QUEUED, CO2 (IDLING), the notes underneath) and its "Showing demo data — add your
TomTom API key..." banner -- unnecessary permanent screen-space clutter for presentation use.

- `HUD.jsx` gutted down to just the on-demand click-to-inspect junction detail table (opens only when
  the user clicks the junction; kept since it doesn't cost persistent space). All the
  always-rendered `.hud`/`.banner` JSX and its backing calculations (score/ratio/tti/co2/sim polling)
  were removed as dead code, not just hidden via CSS.
- `App.jsx`'s `<HUD>` call dropped the now-unused `osmActive`/`gridActive` props.
- The shared `hud-btn`/`inspect`/`inspect-head`/`th` CSS classes were left alone in `styles.css` --
  `GridInspectPanel.jsx` and `GridStats.jsx` both still use them, confirmed via a repo-wide grep before
  touching anything.
- **Verified**: headed Playwright load, `document.querySelectorAll('.hud').length === 0` and
  `.banner` too, screenshot confirms the corner panel and banner are gone while the unrelated
  GridSense AI Fleet Summary panel (bottom-left, real data) is untouched. Zero new console errors.
  `npm run build` clean; `dist/` rebuilt and recommitted.

## Working agreements

- One stage per iteration; user judges a screenshot before the next stage.
- Never break the scene on network failure — every data source has a demo/
  procedural fallback.
- Label modelled numbers as "modelled estimate" in the HUD.
- All heavy geometry instanced or merged; verify 60 fps before adding detail.
- After changes: `npm run build` to verify, dev server hot-reloads.

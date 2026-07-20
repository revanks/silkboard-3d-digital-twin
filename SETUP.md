# Running this project on a new machine

Applies to **`3D_City/`** — the standalone Silk Board Junction 3D digital twin (Vite + React +
Three.js). This is a separate sub-project from the main GridSense AI app one folder up (see the
repo root's own `SETUP.md`); it has no runtime dependency on that app's backend — it only reads
the static snapshot file `public/gridsense_assets.json` that app's pipeline exports.

**The app is 100% static once built.** There is no backend, no database, no API calls at runtime
(everything it needs is either a bundled JS asset or a static JSON file already in `public/`).
That means **Node.js is only required to build it, never to run it** — the pre-built output
(`dist/`) is committed to this repo, so a fresh machine can run the app with nothing but Python.

---

## 1. Copy the project

Copy the whole `3D_City/` folder (or clone the repo it lives in). One thing to leave behind and
recreate instead:

| Item | Why leave it behind | How to recreate |
|---|---|---|
| `node_modules/` | Machine/Node-version-specific installed packages; copying across machines causes subtle breakage | `npm install` (§3) — only needed if you're developing, not just running |

Everything else needed to just **run** the app (`dist/`, `public/*.json`, `serve.py`) is already
committed and works as-is.

## 2. Run it — no Node.js needed (the primary path)

Requires only **Python 3.7+** (the standard library only — nothing to `pip install`; the empty
`requirements.txt` in this folder documents that explicitly and is safe to run anyway):

```powershell
python serve.py
```

Then open the URL it prints — **`http://localhost:4173/`** by default (pass a different port as
`python serve.py <port>` if 4173 is taken). `Ctrl+C` to stop.

`serve.py` serves the pre-built `dist/` folder with explicit MIME-type overrides (Windows can
otherwise mislabel the Vite build's `.js`/`.json` files, which makes browsers refuse to load
them). If it prints `ERROR: ...dist not found`, `dist/` wasn't copied/pulled — see §3 to build it
on a machine that does have Node.js, then commit/copy `dist/` across.

Open the app in a **real desktop browser window** (Chrome/Edge/Firefox), not a headless/automated
one — see Troubleshooting.

## 3. Developing (Node.js needed — only if you're editing the scene source)

Requires **Node.js 18+** (`node -v` to check).

```powershell
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Hot-reloads on every source save.

After finishing changes, rebuild and recommit the static bundle so no-Node machines (§2) pick
them up:

```powershell
npm run build      # regenerates dist/ — commit it
```

`npm run preview` (serves the just-built `dist/` via Vite itself) is a quick way to sanity-check
the production build without leaving the Node toolchain.

## 4. Optional: live traffic data

Copy `.env.example` to `.env` and add a free TomTom API key (developer.tomtom.com) to enable real
traffic-speed data. With no key (the default), the app runs in DEMO mode with baked data — a
missing/failed key never breaks the scene, it just silently falls back. Live weather
(`useLiveWeather.js`, Open-Meteo) needs no key at all.

## 5. Optional: refresh the underlying data

Both of these are **snapshots**, not live-synced — re-run them only if you want newer data, and
both need Node.js:

- **Real OSM basemap extract** (`public/osm_silkboard.json`): `node scripts/fetchOsm.mjs [halfSizeMetres]`
  (default 1000 → 2×2 km). Needs internet (Overpass API); if it fails or the file is deleted, the
  app falls back to its original procedural (non-OSM) scene automatically.
- **Real GridSense AI grid assets** (`public/gridsense_assets.json`): regenerated from the sibling
  GridSense AI project one folder up, not from within `3D_City/` — run
  `python export_threejs_grid.py` from the repo root (needs that project's own Python environment,
  see the repo root's `SETUP.md` §2) after its own pipeline (`run_ops_pipeline.py`) has produced
  fresh output. Then copy the resulting JSON here (the export script already writes it directly to
  `3D_City/public/gridsense_assets.json`, so usually no copy step is needed).

## 6. Stopping / restarting

- **No-Node mode (§2)**: `Ctrl+C` in the `serve.py` terminal. Restarting is just re-running the
  same command.
- **Dev mode (§3)**: `Ctrl+C` in the `npm run dev` terminal. Vite hot-reloads source changes
  automatically while running.

---

## Troubleshooting

- **Blank/black screen, or console shows `WebGL: CONTEXT_LOST_WEBGL`** → almost always means
  you're viewing this through a **headless/automated** browser (common in CI or scripted
  screenshot tools) — a known limitation of headless Chromium's software rendering, not an app
  bug. It renders correctly in a normal, real browser window.
- **`serve.py` prints `ERROR: ...dist not found`** → `dist/` wasn't copied/pulled, or you're
  running it from the wrong directory. Build it on a machine with Node.js (`npm run build`, §3)
  and make sure the resulting `dist/` folder travels with the copy/commit.
- **Browser refuses to load the script / "Expected a JavaScript module script but the server
  responded with a MIME type of text/plain"** → this is exactly what `serve.py`'s explicit MIME
  overrides exist to prevent; if you're serving `dist/` with a *different* static file server
  instead of `serve.py`, make sure it serves `.js`/`.mjs` as `text/javascript` and `.json` as
  `application/json`.
- **A browser tab that loaded the app once keeps showing stale data/UI after you rebuild/redeploy**
  → do a hard refresh (Ctrl+Shift+R) or clear the browser's cache for the site; `serve.py`'s
  built-in handler doesn't set explicit cache-control headers, so a browser's own heuristics can
  hold onto an old response longer than expected.
- **No power-grid layer at all, only roads/buildings** → `public/gridsense_assets.json` is
  missing or failed to load (check the browser devtools Network tab); the app falls back
  gracefully with no error, but the GridSense fleet panel and real-asset icons won't appear until
  that file exists (see §5).
- **`npm install`/`npm run dev` fails outright with Node-related errors** → that's exactly the
  situation §2 (no-Node mode) exists for; you don't need Node.js at all just to run the app.
- **Corporate/office network: `npm install` fails with connection/SSL errors** → you're likely
  behind a proxy — `npm config set proxy http://<proxy>:<port>` and
  `npm config set https-proxy http://<proxy>:<port>` (ask IT for the proxy address). This only
  matters for §3 (developing); §2 (just running the app) needs no network access to npm at all.

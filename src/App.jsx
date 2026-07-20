import React, { Suspense, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import CityScene from './scene/CityScene.jsx'
import Effects from './scene/Effects.jsx'
import CameraRig from './scene/CameraRig.jsx'
import TourRig from './scene/TourRig.jsx'
import Overlay from './ui/Overlay.jsx'
import HUD from './ui/HUD.jsx'
import GridInspectPanel from './ui/GridInspectPanel.jsx'
import GridStats from './ui/GridStats.jsx'
import { useLiveTraffic } from './data/useLiveTraffic.js'
import { useOsmData } from './data/useOsmData.js'
import { useGridAssets } from './data/useGridAssets.js'
import { useLiveWeather } from './data/useLiveWeather.js'
import { flow, sim, env, weatherStore } from './scene/trafficStore.js'
import { CFG } from './config.js'

// ?tour=1 → scripted camera tour for video capture (see TourRig.jsx)
const TOUR_MODE = new URLSearchParams(window.location.search).has('tour')

export default function App() {
  const [cinematic, setCinematic] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const [inspectOpen, setInspectOpen] = useState(false)
  const [envMode, setEnvMode] = useState('day')
  const [speed, setSpeed] = useState(1)
  const [topView, setTopView] = useState(false)
  const live = useLiveTraffic()
  const osm = useOsmData() // null → procedural fallback
  const grid = useGridAssets() // null → synthetic OsmPower fallback
  const weather = useLiveWeather()
  const [showGrid, setShowGrid] = useState(true)
  const [colorMode, setColorMode] = useState('realistic')
  const [showLabels, setShowLabels] = useState(true)
  const [inspect, setInspect] = useState(null) // {assetType, record} | null

  // 'live' isn't a real render mode -- Lighting.jsx/CityScene.jsx only ever see day/night/rain.
  // Derive which of those three the real current weather+time maps to, so the rest of the scene
  // needs zero changes to support it.
  const effectiveEnvMode =
    envMode === 'live' ? (!weather.data.isDay ? 'night' : weather.data.condition === 'rain' ? 'rain' : 'day') : envMode

  useEffect(() => {
    weatherStore.isDay = weather.data.isDay
    weatherStore.condition = weather.data.condition
    weatherStore.tempC = weather.data.tempC
    weatherStore.source = weather.mode
  }, [weather.data, weather.mode])

  useEffect(() => {
    env.mode = effectiveEnvMode
  }, [effectiveEnvMode])

  useEffect(() => {
    sim.speed = speed
  }, [speed])

  // Push live congestion into the simulation store the render loop reads.
  useEffect(() => {
    const r = Math.min(1, Math.max(0.1, live.data.currentSpeed / Math.max(1, live.data.freeFlowSpeed)))
    flow.ratio = r
    flow.groundScale = 0.35 + 0.65 * r
    flow.flyoverScale = 0.55 + 0.45 * r
  }, [live.data])

  return (
    <div className="app">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: CFG.EXPOSURE,
        }}
        camera={{ position: CFG.CAMERA_START, fov: 45, near: 0.5, far: 6000 }}
      >
        <Suspense fallback={null}>
          <CityScene
            envMode={effectiveEnvMode}
            topView={topView}
            onJunctionClick={() => setInspectOpen(true)}
            osm={osm}
            grid={grid}
            showGrid={showGrid}
            colorMode={colorMode}
            showLabels={showLabels}
            onAssetClick={(assetType, record) => setInspect({ assetType, record })}
          />
          <Effects envMode={effectiveEnvMode} />
        </Suspense>
        {TOUR_MODE ? (
          <TourRig setEnvMode={setEnvMode} />
        ) : (
          <CameraRig cinematic={cinematic} resetSignal={resetSignal} topView={topView} />
        )}
      </Canvas>
      <Overlay
        cinematic={cinematic}
        setCinematic={setCinematic}
        onResetView={() => {
          setTopView(false)
          setResetSignal((n) => n + 1)
        }}
        envMode={envMode}
        setEnvMode={setEnvMode}
        speed={speed}
        setSpeed={setSpeed}
        topView={topView}
        setTopView={setTopView}
        gridActive={Boolean(grid)}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        colorMode={colorMode}
        setColorMode={setColorMode}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
      />
      <HUD
        live={live}
        inspectOpen={inspectOpen}
        onCloseInspect={() => setInspectOpen(false)}
      />
      <GridInspectPanel inspect={inspect} onClose={() => setInspect(null)} />
      {showGrid && <GridStats grid={grid} />}
    </div>
  )
}

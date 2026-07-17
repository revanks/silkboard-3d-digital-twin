import React, { Suspense, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import CityScene from './scene/CityScene.jsx'
import Effects from './scene/Effects.jsx'
import CameraRig from './scene/CameraRig.jsx'
import Overlay from './ui/Overlay.jsx'
import HUD from './ui/HUD.jsx'
import { useLiveTraffic } from './data/useLiveTraffic.js'
import { useOsmData } from './data/useOsmData.js'
import { flow, sim, env } from './scene/trafficStore.js'
import { CFG } from './config.js'

export default function App() {
  const [cinematic, setCinematic] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const [inspectOpen, setInspectOpen] = useState(false)
  const [envMode, setEnvMode] = useState('day')
  const [speed, setSpeed] = useState(1)
  const [topView, setTopView] = useState(false)
  const live = useLiveTraffic()
  const osm = useOsmData() // null → procedural fallback

  useEffect(() => {
    env.mode = envMode
  }, [envMode])

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
            envMode={envMode}
            topView={topView}
            onJunctionClick={() => setInspectOpen(true)}
            osm={osm}
          />
          <Effects envMode={envMode} />
        </Suspense>
        <CameraRig cinematic={cinematic} resetSignal={resetSignal} topView={topView} />
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
      />
      <HUD
        live={live}
        osmActive={Boolean(osm)}
        inspectOpen={inspectOpen}
        onCloseInspect={() => setInspectOpen(false)}
      />
    </div>
  )
}

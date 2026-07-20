import React from 'react'
import { Sky, Stars } from '@react-three/drei'
import Lighting from './Lighting.jsx'
import Ground from './Ground.jsx'
import Roads from './Roads.jsx'
import Flyover from './Flyover.jsx'
import Buildings from './Buildings.jsx'
import Trees from './Trees.jsx'
import StreetFurniture from './StreetFurniture.jsx'
import TrafficSystem from './traffic/TrafficSystem.jsx'
import CongestionRibbons from './CongestionRibbons.jsx'
import Rain from './Rain.jsx'
import Metro from './Metro.jsx'
import Landmarks from './Landmarks.jsx'
import OsmWorld from './osm/OsmWorld.jsx'
import { CFG, sunDirection } from '../config.js'

const FOG = {
  day: null, // filled from CFG below
  night: ['#0a0e18', 0.0012],
  rain: ['#8d949e', 0.0022],
}

export default function CityScene({
  envMode = 'day',
  topView = false,
  onJunctionClick,
  osm = null,
  grid = null,
  showGrid = true,
  colorMode = 'realistic',
  showLabels = true,
  onAssetClick,
}) {
  const sun = sunDirection()
  const base = envMode === 'day' ? [CFG.FOG_COLOR, CFG.FOG_DENSITY] : FOG[envMode]
  // Thin the haze in top view so the whole 2×2 km stays readable.
  const fogCfg = [base[0], base[1] * (topView ? 0.18 : 1)]

  return (
    <>
      <fogExp2 key={`${envMode}-${topView}`} attach="fog" args={fogCfg} />

      {envMode === 'day' && (
        <Sky
          distance={45000}
          sunPosition={sun}
          turbidity={8}
          rayleigh={2.6}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
      )}
      {envMode === 'night' && (
        <>
          <color attach="background" args={['#070a14']} />
          <Stars radius={2500} depth={60} count={3000} factor={10} saturation={0.4} fade speed={0.5} />
        </>
      )}
      {envMode === 'rain' && <color attach="background" args={['#8d949e']} />}

      <Lighting envMode={envMode} />
      <Ground />
      {osm ? (
        // Real OSM data: roads, buildings, water, metro, traffic, lights, power.
        <OsmWorld
          osm={osm}
          envMode={envMode}
          grid={grid}
          showGrid={showGrid}
          colorMode={colorMode}
          showLabels={showLabels}
          onAssetClick={onAssetClick}
        />
      ) : (
        // Procedural fallback — always works, even with no JSON.
        <>
          <Roads envMode={envMode} />
          <Flyover />
          <Buildings envMode={envMode} />
          <Trees />
          <Metro />
          <TrafficSystem />
        </>
      )}
      <StreetFurniture envMode={envMode} osmMode={Boolean(osm)} />
      <Landmarks osmMode={Boolean(osm)} />
      <CongestionRibbons onJunctionClick={onJunctionClick} />
      {envMode === 'rain' && <Rain />}
    </>
  )
}

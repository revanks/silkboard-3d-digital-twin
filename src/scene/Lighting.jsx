import React from 'react'
import { CFG, sunDirection } from '../config.js'

export default function Lighting({ envMode = 'day' }) {
  if (envMode === 'night') {
    return (
      <>
        {/* Faint blue moonlight — no shadows, streetlights carry the scene */}
        <directionalLight position={[250, 420, -180]} intensity={0.22} color="#7288c9" />
        <hemisphereLight args={['#1c2b4d', '#0b0a10', 0.32]} />
        <ambientLight intensity={0.06} color="#4a5f92" />
      </>
    )
  }

  if (envMode === 'rain') {
    return (
      <>
        {/* Overcast: high, soft, desaturated light with weak shadows */}
        <directionalLight
          position={[180, 520, 120]}
          intensity={1.0}
          color="#ccd3dc"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.7}
        >
          <orthographicCamera
            attach="shadow-camera"
            args={[-450, 450, 450, -450, 1, 2200]}
          />
        </directionalLight>
        <hemisphereLight args={['#9aa4b2', '#606266', 0.75]} />
      </>
    )
  }

  // Day: golden hour
  const dir = sunDirection()
  const sunPos = [dir[0] * 700, dir[1] * 700, dir[2] * 700]
  return (
    <>
      <directionalLight
        position={sunPos}
        color="#ffbf78"
        intensity={CFG.SUN_INTENSITY}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.7}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-450, 450, 450, -450, 1, 2200]}
        />
      </directionalLight>
      <hemisphereLight args={['#93b7dd', '#93755a', 0.55]} />
    </>
  )
}

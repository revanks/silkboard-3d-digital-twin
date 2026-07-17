import React from 'react'
import {
  EffectComposer,
  Bloom,
  N8AO,
  DepthOfField,
  Vignette,
  HueSaturation,
  BrightnessContrast,
} from '@react-three/postprocessing'
import { CFG } from '../config.js'

// Night gets much stronger bloom (streetlights, windows, headlights);
// rain stays soft and diffuse.
const BLOOM = { day: CFG.BLOOM_INTENSITY, night: 1.15, rain: 0.45 }

export default function Effects({ envMode = 'day' }) {
  return (
    <EffectComposer multisampling={4}>
      <N8AO
        aoRadius={14}
        intensity={CFG.AO_INTENSITY}
        distanceFalloff={60}
        quality="medium"
        halfRes
      />
      <Bloom
        mipmapBlur
        intensity={BLOOM[envMode]}
        luminanceThreshold={1.0}
        levels={7}
      />
      {CFG.ENABLE_DOF && (
        <DepthOfField
          target={[0, 8, 0]}
          focalLength={0.08}
          bokehScale={1.4}
          height={480}
        />
      )}
      {/* Warm golden-hour grade */}
      <HueSaturation saturation={0.14} hue={-0.015} />
      <BrightnessContrast brightness={0.015} contrast={0.07} />
      <Vignette eskil={false} offset={0.22} darkness={0.55} />
    </EffectComposer>
  )
}

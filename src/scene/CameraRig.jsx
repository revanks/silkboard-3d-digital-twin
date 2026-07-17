import React, { useRef, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { CFG } from '../config.js'

export default function CameraRig({ cinematic, resetSignal, topView }) {
  const controlsRef = useRef()
  const camera = useThree((s) => s.camera)

  // Snap to the framed junction view (RESET VIEW) or the full-area
  // overhead map view (TOP VIEW).
  useEffect(() => {
    if (topView) {
      camera.position.set(0, 2350, 80)
    } else {
      camera.position.set(...CFG.CAMERA_START)
    }
    const c = controlsRef.current
    if (c) {
      if (topView) c.target.set(0, 0, 0)
      else c.target.set(...CFG.CAMERA_TARGET)
      c.update()
    }
  }, [resetSignal, topView, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      target={CFG.CAMERA_TARGET}
      enableDamping
      dampingFactor={0.06}
      autoRotate={cinematic}
      autoRotateSpeed={0.45}
      minDistance={25}
      maxDistance={2600}
      maxPolarAngle={1.47}
      makeDefault
    />
  )
}

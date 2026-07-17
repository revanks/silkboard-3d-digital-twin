import React, { useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'

// Generic instanced unit-box renderer.
// items: [{ pos: [x,y,z], scale: [w,h,d], rotY?: number }]
export default function InstancedBoxes({
  items,
  color = '#ffffff',
  roughness = 0.9,
  metalness = 0,
  emissive,
  emissiveIntensity = 1,
  castShadow = false,
  receiveShadow = true,
}) {
  const ref = useRef()

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    items.forEach((it, i) => {
      dummy.position.set(...it.pos)
      dummy.scale.set(...it.scale)
      dummy.rotation.set(0, it.rotY || 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [items])

  if (!items.length) return null

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive || '#000000'}
        emissiveIntensity={emissive ? emissiveIntensity : 0}
      />
    </instancedMesh>
  )
}

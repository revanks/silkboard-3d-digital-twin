import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'

// Scripted camera tour for video capture (opened with ?tour=1 — App swaps
// OrbitControls for this rig). The recorder injects
//   window.__tourPlan = [{ t0, t1, pos0, pos1, tgt0, tgt1, env }, ...]
// (positions/targets as [x,y,z], times in seconds) and calls
// window.__startTour(). Progress is exposed on window.__tourState:
// 'waiting' → 'running' → 'done'.
const smooth = (t) => t * t * (3 - 2 * t)

export default function TourRig({ setEnvMode }) {
  const camera = useThree((s) => s.camera)
  const startRef = useRef(null)
  const envRef = useRef(null)

  useEffect(() => {
    window.__tourState = 'waiting'
    window.__startTour = () => {
      startRef.current = performance.now()
      window.__tourState = 'running'
    }
    return () => {
      delete window.__startTour
      delete window.__tourState
    }
  }, [])

  useFrame(() => {
    const plan = window.__tourPlan
    if (!plan || !plan.length || startRef.current == null) return
    const t = (performance.now() - startRef.current) / 1000
    const last = plan[plan.length - 1]
    if (t >= last.t1) window.__tourState = 'done'

    let seg = last
    for (const s of plan) {
      if (t < s.t1) {
        seg = s
        break
      }
    }
    if (seg.env && seg.env !== envRef.current) {
      envRef.current = seg.env
      setEnvMode(seg.env)
    }
    const k = smooth(Math.min(1, Math.max(0, (t - seg.t0) / (seg.t1 - seg.t0))))
    const L = (a, b) => a + (b - a) * k
    camera.position.set(
      L(seg.pos0[0], seg.pos1[0]),
      L(seg.pos0[1], seg.pos1[1]),
      L(seg.pos0[2], seg.pos1[2])
    )
    camera.lookAt(
      L(seg.tgt0[0], seg.tgt1[0]),
      L(seg.tgt0[1], seg.tgt1[1]),
      L(seg.tgt0[2], seg.tgt1[2])
    )
  })

  return null
}

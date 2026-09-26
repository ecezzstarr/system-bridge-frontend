'use client'

import { useEffect, useRef, useState } from 'react'

type Ripple = {
  id: number
  x: number
  y: number
}

export function InteractionMotionLayer() {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const nextId = useRef(1)

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const id = nextId.current++
      const ripple = { id, x: event.clientX, y: event.clientY }
      setRipples((current) => [...current.slice(-7), ripple])
      window.setTimeout(() => {
        setRipples((current) => current.filter((item) => item.id !== id))
      }, 920)
    }

    document.addEventListener('pointerdown', onPointer, true)
    return () => document.removeEventListener('pointerdown', onPointer, true)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[34] overflow-hidden"
      data-weave-interaction-motion="true"
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="weave-interaction-ripple absolute rounded-full border border-sky-200/45"
          style={{ left: ripple.x, top: ripple.y }}
        >
          <span className="weave-interaction-core absolute left-1/2 top-1/2 rounded-full bg-amber-200/70" />
        </span>
      ))}
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// The observer moves with the pointer or a native scroll. Input is never captured.
export function CompanyDepthCamera() {
  const pathname = usePathname()
  useEffect(() => {
    const root = document.documentElement
    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let x = 0
    let y = 0
    const clamp = (value: number) => Math.max(-1, Math.min(1, value))

    function clear() {
      cancelAnimationFrame(frame)
      frame = 0
      root.style.removeProperty('--weave-observer-x')
      root.style.removeProperty('--weave-observer-y')
    }
    function update(horizontal: number, vertical: number) {
      if (quiet.matches || document.hidden) return
      x = clamp(horizontal)
      y = clamp(vertical)
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        root.style.setProperty('--weave-observer-x', x.toFixed(3))
        root.style.setProperty('--weave-observer-y', y.toFixed(3))
      })
    }
    function point(event: PointerEvent) {
      update(2 * event.clientX / window.innerWidth - 1, 2 * event.clientY / window.innerHeight - 1)
    }
    function scroll(event: Event) {
      const el = event.target instanceof HTMLElement ? event.target : document.scrollingElement
      if (!el) return
      const range = el.scrollWidth - el.clientWidth
      update(range > 1 ? 2 * el.scrollLeft / range - 1 : 0, Math.sin(el.scrollTop / Math.max(1, window.innerHeight)))
    }
    function leave(event: PointerEvent) { if (!event.relatedTarget) clear() }
    document.addEventListener('pointermove', point, { passive: true })
    document.addEventListener('pointerout', leave)
    document.addEventListener('scroll', scroll, { capture: true, passive: true })
    document.addEventListener('visibilitychange', clear)
    window.addEventListener('blur', clear)
    quiet.addEventListener('change', clear)
    return () => {
      document.removeEventListener('pointermove', point)
      document.removeEventListener('pointerout', leave)
      document.removeEventListener('scroll', scroll, true)
      document.removeEventListener('visibilitychange', clear)
      window.removeEventListener('blur', clear)
      quiet.removeEventListener('change', clear)
      clear()
    }
  }, [pathname])
  return null
}

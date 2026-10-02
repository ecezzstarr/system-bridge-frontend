'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { clampPanelPosition, type PanelPosition } from '@/lib/floating-panel-position'

export function useFloatingPanel(enabled: boolean, storageKey: string) {
  const panelRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null)
  const [position, setPosition] = useState<PanelPosition | null>(null)
  const [dragging, setDragging] = useState(false)
  const current = useRef<PanelPosition | null>(null)

  const move = useCallback((next: PanelPosition, remember = false) => {
    const rect = panelRef.current?.getBoundingClientRect()
    const result = clampPanelPosition(next, { width: rect?.width || 240, height: rect?.height || 64 }, {
      width: window.innerWidth, height: window.visualViewport?.height || window.innerHeight,
    })
    current.current = result
    setPosition(result)
    if (remember) try { localStorage.setItem(storageKey, JSON.stringify(result)) } catch {}
    return result
  }, [storageKey])

  useEffect(() => {
    if (!enabled) return
    current.current = null
    setPosition(null)
    setDragging(false)
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) move(saved)
    } catch {}
    const resize = () => { if (current.current) move(current.current, true) }
    const observer = new ResizeObserver(resize)
    if (panelRef.current) observer.observe(panelRef.current)
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)
    return () => {
      drag.current = null
      observer.disconnect()
      window.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('resize', resize)
    }
  }, [enabled, storageKey, move])

  const reset = () => {
    drag.current = null
    current.current = null
    setDragging(false)
    setPosition(null)
    try { localStorage.removeItem(storageKey) } catch {}
  }
  const end = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.id !== event.pointerId) return
    drag.current = null
    setDragging(false)
    if (current.current) move(current.current, true)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return {
    panelRef,
    style: position ? { left: position.x, top: position.y, right: 'auto' as const } : undefined,
    dragging,
    gripProps: {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (!event.isPrimary || event.button !== 0) return
        const rect = panelRef.current?.getBoundingClientRect()
        if (!rect) return
        event.preventDefault()
        event.currentTarget.focus()
        drag.current = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top }
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
        const active = drag.current
        if (active?.id === event.pointerId) move({ x: event.clientX - active.dx, y: event.clientY - active.dy })
      },
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
      onDoubleClick: reset,
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Home') { event.preventDefault(); reset(); return }
        const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
        const direction = directions[event.key]
        const rect = panelRef.current?.getBoundingClientRect()
        if (!direction || !rect) return
        event.preventDefault()
        const step = event.shiftKey ? 40 : 12
        move({ x: rect.left + direction[0] * step, y: rect.top + direction[1] * step }, true)
      },
    },
  }
}

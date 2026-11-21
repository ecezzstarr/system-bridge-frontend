'use client'

import { useEffect, useRef } from 'react'
import styles from './riverfront.module.css'

const artwork = '/weave/flame-event/burning-river-riverfront.webp'

export function RiverPanorama() {
  const viewport = useRef<HTMLDivElement>(null)
  const bank = useRef<HTMLDivElement>(null)
  const original = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const view = viewport.current
    const surface = bank.current
    const img = original.current
    if (!view || !surface || !img) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let cancelled = false
    let dispose: (() => void) | undefined
    let revision = 0

    async function activate() {
      const version = ++revision
      dispose?.()
      dispose = undefined
      if (motion.matches || !view || !surface || !img) return
      await img.decode()
      const THREE = await import('three')
      if (cancelled || version !== revision) return

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      const canvas = renderer.domElement
      canvas.setAttribute('aria-hidden', 'true')
      const texture = new THREE.Texture(img)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
      const aspect = img.naturalWidth / img.naturalHeight
      const geometry = new THREE.PlaneGeometry(2 * aspect, 2, 48, 1)
      const points = geometry.attributes.position
      // A shallow arc gives the riverbank depth while preserving its original UVs.
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i) / aspect
        points.setZ(i, -.08 * x * x)
      }
      points.needsUpdate = true
      const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
      const scene = new THREE.Scene()
      scene.add(new THREE.Mesh(geometry, material))
      const camera = new THREE.PerspectiveCamera(45, aspect, .1, 10)
      camera.position.z = 2.22
      let look = 0
      let frame = 0
      function draw() {
        frame = 0
        camera.position.x = look * .09
        camera.lookAt(0, 0, 0)
        renderer.render(scene, camera)
      }
      function requestDraw() {
        if (!frame) frame = requestAnimationFrame(draw)
      }
      function scroll() {
        if (!view) return
        const range = view.scrollWidth - view.clientWidth
        look = range > 1 ? 2 * view.scrollLeft / range - 1 : 0
        requestDraw()
      }
      function point(event: PointerEvent) {
        if (event.pointerType !== 'mouse' || !view) return
        const bounds = view.getBoundingClientRect()
        look = 2 * (event.clientX - bounds.left) / bounds.width - 1
        requestDraw()
      }
      function resize() {
        if (!surface) return
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        renderer.setSize(surface.clientWidth, surface.clientHeight, false)
        scroll()
      }
      function lost() { canvas.hidden = true }
      const observer = new ResizeObserver(resize)
      dispose = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        view.removeEventListener('scroll', scroll)
        view.removeEventListener('pointermove', point)
        canvas.removeEventListener('webglcontextlost', lost)
        canvas.remove()
        geometry.dispose()
        material.dispose()
        texture.dispose()
        renderer.dispose()
      }
      observer.observe(surface)
      view.addEventListener('scroll', scroll, { passive: true })
      view.addEventListener('pointermove', point)
      canvas.addEventListener('webglcontextlost', lost)
      resize()
      surface.appendChild(canvas)
    }

    const change = () => { void activate().catch(() => { /* The original image stays visible. */ }) }
    change()
    motion.addEventListener('change', change)
    return () => {
      cancelled = true
      motion.removeEventListener('change', change)
      dispose?.()
    }
  }, [])

  return <div ref={viewport} className={styles.viewport} tabIndex={0} role="region" aria-label="Sunshine riverfront panorama">
    <div ref={bank} className={styles.bank}>
      <img ref={original} src={artwork} width="1600" height="533" alt="Sunshine: Mechanized Wealth on the Burning River waterfront." />
    </div>
  </div>
}

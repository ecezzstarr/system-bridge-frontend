'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { weaveVisualThemeForPath } from '@/lib/weave-visual-theme'

/**
 * A single company visual identity, not a File Folder tier grant.
 * Event routes retain their own Burning River palette and 3D scene.
 */
export function WeaveGlobalVisualTheme() {
  const pathname = usePathname() || '/'
  useLayoutEffect(() => {
    const visualTheme = weaveVisualThemeForPath(pathname)
    document.documentElement.dataset.weaveShellTheme = visualTheme
    // Browser chrome follows route theme, not the permanent File Folder tier.
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', visualTheme === 'plus-white-gold' ? '#f7f9fc' : '#06152e',
    )
  }, [pathname])
  return null
}

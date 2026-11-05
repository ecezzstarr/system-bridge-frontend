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
    document.documentElement.dataset.weaveShellTheme = weaveVisualThemeForPath(pathname)
  }, [pathname])
  return null
}

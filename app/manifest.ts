import { MetadataRoute } from 'next'

// Bump this whenever icon.svg's visual content changes. Browsers/OS only
// re-fetch a manifest icon when its URL changes — a static path means an
// already-installed app's home-screen icon never updates even after a
// fresh deploy. Versioning the URL forces a refresh on the next manifest check.
const ICON_VERSION = '2'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WEAVE - System Switch Bridge Radiance',
    short_name: 'WEAVE',
    description: 'WEAVE ecosystem platform - Wallet, Lounge, Arena, Marketplace',
    start_url: '/',
    display: 'standalone',
    background_color: '#050608',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: `/icon.svg?v=${ICON_VERSION}`,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: `/icon.svg?v=${ICON_VERSION}`,
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: `/icon.svg?v=${ICON_VERSION}`,
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}

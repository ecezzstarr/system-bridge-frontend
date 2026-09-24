import { MetadataRoute } from 'next'

// Bump whenever the official WEAVE mark changes so installed devices refresh it.
const ICON_VERSION = '3'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WEAVE of Presence — System Switch — Bridge Radiance',
    short_name: 'WEAVE',
    description: 'Interaction in Motion: people, ideas, opportunities, value and livelihood in one living WEAVE environment.',
    start_url: '/',
    display: 'standalone',
    background_color: '#02060d',
    theme_color: '#06111f',
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

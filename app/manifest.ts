import { MetadataRoute } from 'next'

// Bump whenever the official WEAVE mark changes so installed devices refresh it.
const ICON_VERSION = '3'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Weave of Presence: System Switch — Bridge of Radiance',
    short_name: 'WEAVE',
    description: 'Interaction in Motion. The Weave of Presence: System Switch — Bridge of Radiance. People, participation, working systems, value and livelihood in one living WEAVE.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f9fc',
    theme_color: '#eaf6fc',
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

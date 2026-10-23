/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_WEAVE_RELEASE_SHA: process.env.WEAVE_RELEASE_SHA || '',
  },
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }]
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // Enable standalone output for Cloud Run deployment
  output: 'standalone',
}

export default nextConfig

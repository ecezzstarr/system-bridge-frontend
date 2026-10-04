'use client'

import { ReactNode, useEffect } from 'react'

export default function AdWorkshopLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const raw = localStorage.getItem('weave_video_ad_handoff')
    if (!raw) return
    localStorage.removeItem('weave_video_ad_handoff')
    let handoff: any
    try { handoff = JSON.parse(raw) } catch { return }
    if (!handoff?.title || !handoff?.mediaUrl) return

    const token = localStorage.getItem('ssb_auth_token')
    void fetch('/api/admin/ads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        title: handoff.title,
        body: handoff.body || '',
        mediaUrl: handoff.mediaUrl,
        mediaType: 'video',
        targetRoles: ['all'],
        placements: ['app'],
        startAt: new Date().toISOString(),
        endAt: null,
        frequency: 'once',
        priority: 0,
        status: 'draft',
        publicMovement: false,
        publicPlatforms: ['direct'],
        movementDestination: '/',
        eventKey: 'video-ad-workshop',
      }),
    }).then(async response => {
      const data = await response.json().catch(() => ({}))
      if (response.ok && data.success) window.location.replace('/admin/ad-workshop')
    }).catch(() => {})
  }, [])

  return children
}

'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Clapperboard } from 'lucide-react'

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

  return (
    <>
      <div className="mx-auto mb-4 flex max-w-7xl justify-end px-1">
        <Link href="/admin/video-ad-workshop" className="inline-flex items-center gap-2 border border-fuchsia-300/20 bg-fuchsia-300/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-100 hover:bg-fuchsia-300/[0.09]">
          <Clapperboard className="h-3.5 w-3.5" /> Video Ad Workshop
        </Link>
      </div>
      {children}
    </>
  )
}

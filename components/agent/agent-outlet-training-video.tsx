'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'

/**
 * Agent-only MP4: fetch with the live account token, then play the authorized
 * response through an ephemeral local object URL. No public media URL is used.
 */
export function AgentOutletTrainingVideo() {
  const { user, token, isInitialized } = useAuth()
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isInitialized || user?.role !== 'agent') return
    const controller = new AbortController()
    let mounted = true
    let objectUrl: string | null = null

    setLoading(true)
    setError('')
    setMediaUrl(null)

    void (async () => {
      try {
        const response = await fetch('/api/agent/training/video', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(response.status === 401 || response.status === 403
            ? 'Your Agent account must be active to watch this training.'
            : 'The training video is temporarily unavailable.')
        }
        const media = await response.blob()
        if (media.size === 0) throw new Error('The training video is empty.')
        objectUrl = URL.createObjectURL(media)
        if (mounted) setMediaUrl(objectUrl)
      } catch (cause) {
        if (mounted && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Unable to load Agent training video.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isInitialized, token, user?.role])

  if (!isInitialized || loading && user?.role === 'agent') {
    return <section role="status" className="max-w-[420px] rounded-xl border border-cyan-300/20 bg-cyan-300/[.04] p-5 text-sm text-cyan-100">
      Loading Agent training video…
    </section>
  }

  if (user?.role !== 'agent') {
    return <section role="alert" className="max-w-[420px] border border-amber-300/30 p-5 text-sm text-amber-100">
      This training is restricted to Agents.
    </section>
  }

  if (error || !mediaUrl) {
    return <section role="status" data-agent-training-video="unavailable" className="max-w-[420px] rounded-xl border border-amber-300/35 bg-amber-300/[.06] p-5 text-sm leading-6 text-amber-100">
      <strong>{error || 'The training video is temporarily unavailable.'}</strong>
      <p className="mt-2">Read the steps below before visiting outlets. Use Agent Distribution Route to register each store, order verified stock and record payments.</p>
    </section>
  }

  return <video controls playsInline preload="metadata" onError={() => setError('This device cannot play the training video.')} data-agent-training-video="ready" className="aspect-[9/16] w-full max-w-[420px] rounded-xl border border-emerald-300/25 bg-black" src={mediaUrl} aria-label="WEAVE Agent daily outlet supply training">
    Your browser does not support this video.
  </video>
}

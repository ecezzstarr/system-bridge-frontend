'use client'

import { useState } from 'react'

/** Keep the training page usable until its narrated MP4 has actually shipped. */
export function AgentOutletTrainingVideo() {
  const [unavailable, setUnavailable] = useState(false)

  if (unavailable) {
    return <section role="status" data-agent-training-video="unavailable" className="max-w-[420px] rounded-xl border border-amber-300/35 bg-amber-300/[.06] p-5 text-sm leading-6 text-amber-100">
      <strong>The narrated training video is not available on this release.</strong>
      <p className="mt-2">Read the steps below before visiting outlets. Use Agent Distribution Route to register each store, order verified stock and record payments. A missing video must not appear as a playable lesson.</p>
    </section>
  }

  return <video controls playsInline preload="metadata" onError={() => setUnavailable(true)} data-agent-training-video="ready" className="aspect-[9/16] w-full max-w-[420px] rounded-xl border border-emerald-300/25 bg-black" src="/training/agent-outlet-training.mp4" aria-label="WEAVE daily outlet supply training video">
    Your browser does not support this video.
  </video>
}

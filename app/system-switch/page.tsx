'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import FileFolderPurchase from '@/components/system-switch/file-folder-purchase'
import { normalizeWeaveTopic } from '@/lib/weave-architecture'

const SystemSwitchWorld = dynamic(() => import('@/components/system-switch/system-switch-world'), { ssr: false })

type Crossing = {
  message: string
  topic: string
  context?: string | null
  flame_name?: string | null
  flame_presence?: string | null
  crossing_state?: string | null
  provider_key?: string | null
  provider_name?: string | null
}

export default function SystemSwitchPage() {
  const params = useSearchParams()
  const bridge = params.get('bridge')
  const [crossing, setCrossing] = useState<Crossing | null>(null)

  useEffect(() => {
    if (!bridge) return
    fetch(`/api/system-switch/bridge?code=${encodeURIComponent(bridge)}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setCrossing(data?.crossing || null))
      .catch(() => setCrossing(null))
  }, [bridge])

  return (
    <main className="min-h-screen bg-black p-3 md:p-6">
      <SystemSwitchWorld
        initialMovement={crossing?.message || null}
        flameName={crossing?.flame_name || null}
        topic={normalizeWeaveTopic(crossing?.topic)}
      />
      <FileFolderPurchase bridgeCode={bridge || undefined} providerKey={crossing?.provider_key || undefined} providerName={crossing?.provider_name || undefined} flameName={crossing?.flame_name || undefined} />
    </main>
  )
}

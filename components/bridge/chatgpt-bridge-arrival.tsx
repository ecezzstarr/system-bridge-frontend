'use client'

import dynamic from 'next/dynamic'
import FileFolderPurchase from '@/components/bridge/file-folder-purchase'
import { normalizeWeaveTopic } from '@/lib/weave-architecture'

const BridgeRadianceWorld = dynamic(
  () => import('@/components/bridge/bridge-radiance-world'),
  { ssr: false },
)

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

export default function ChatGptBridgeArrival({
  code,
  crossing,
}: {
  code: string
  crossing: Crossing
}) {
  return (
    <main className="min-h-screen bg-black p-3 md:p-6">
      <BridgeRadianceWorld
        initialMovement={crossing.message || null}
        flameName={crossing.flame_name || null}
        topic={normalizeWeaveTopic(crossing.topic)}
      />
      <FileFolderPurchase
        bridgeCode={code}
        providerKey={crossing.provider_key || undefined}
        providerName={crossing.provider_name || undefined}
        flameName={crossing.flame_name || undefined}
      />
    </main>
  )
}

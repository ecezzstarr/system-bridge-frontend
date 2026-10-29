'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRef } from 'react'
import FileFolderPurchase from '@/components/bridge/file-folder-purchase'

const BridgeRadianceWorld=dynamic(()=>import('@/components/bridge/bridge-radiance-world'),{ssr:false})

/**
 * Active Bridger Bridge AI paths now open the same public Bridge of Radiance
 * crossing used by the other verified WEAVE arrival flows. The chat entrance
 * remains available without changing the Bridger's existing session/deposit
 * history. The purchase endpoint verifies this active Bridge AI code on the
 * server and attributes the Client to its actual Bridger.
 */
export default function BridgerBridgeRadianceArrival({
  code,bridgerName,welcomeMessage,
}:{
  code:string
  bridgerName:string
  welcomeMessage?:string|null
}){
  const purchaseRef=useRef<HTMLElement|null>(null)
  return <main className="min-h-screen bg-[#02040a] p-3 text-white md:p-6" data-bridger-bridge-radiance="client-crossing">
    <BridgeRadianceWorld
      flameName="Bridge AI"
      topic="Client File Folder construction"
      initialMovement={welcomeMessage||null}
      onCrossingRequest={()=>purchaseRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}
    />
    <section className="mx-auto mt-4 max-w-5xl rounded-2xl border border-cyan-200/20 bg-cyan-300/[.035] p-4 md:p-6">
      <p className="text-[9px] font-black uppercase tracking-[.23em] text-cyan-200">Bridge AI · {bridgerName}</p>
      <h2 className="mt-2 text-xl font-black">Bring your idea into a working business system</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Discuss your business idea with the Bridger’s Bridge AI, or continue to
        the Client File Folder purchase. Before proceeding, review what the
        selected File Folder includes and the stated purchase requirements.
        Your purchase remains linked to this Bridger path for Administration verification.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/bridge/${encodeURIComponent(code)}?chat=1`}
          className="inline-flex min-h-11 items-center rounded-xl border border-cyan-200/35 px-4 py-2.5 text-xs font-black text-cyan-100">
          Discuss your idea with Bridge AI
        </Link>
        <button type="button"
          onClick={()=>purchaseRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}
          className="min-h-11 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-slate-950">
          Continue to File Folder purchase
        </button>
      </div>
    </section>
    <section ref={purchaseRef}>
      <FileFolderPurchase bridgeCode={code}/>
    </section>
  </main>
}

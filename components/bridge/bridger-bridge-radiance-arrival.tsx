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
      <h2 className="mt-2 text-xl font-black">Recognize what you want to build</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Talk with the Bridger's Bridge AI about your idea, compare the four File Folder types, or continue to purchase. Checkout supports Paystack in Naira and the existing TRX method. Your purchase remains attached to this specific Bridger path for Administration verification.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/bridge/${encodeURIComponent(code)}?chat=1`}
          className="inline-flex min-h-11 items-center rounded-xl border border-cyan-200/35 px-4 py-2.5 text-xs font-black text-cyan-100">
          Talk with Bridge AI
        </Link>
        <Link href="/file-folder-preview"
          className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold text-slate-200">
          Preview File Folder types
        </Link>
        <button type="button"
          onClick={()=>purchaseRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}
          className="min-h-11 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-slate-950">
          Purchase a Client File Folder
        </button>
      </div>
    </section>
    <section ref={purchaseRef}>
      <FileFolderPurchase bridgeCode={code}/>
    </section>
  </main>
}

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Flame } from 'lucide-react'
import { NigeriaFlameFrontier } from '@/components/events/nigeria-flame-frontier'

export const dynamic = 'force-dynamic'

export default function PublicFlameFrontierPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl bg-[#070505] pb-16 text-white" data-world-witness="flame-nigeria-frontier">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-orange-300/20 px-4 py-5 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-stone-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Weave of Presence
        </Link>
        <p className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-orange-200">
          <Flame className="h-4 w-4" /> Company Loop 1 · Flame Event
        </p>
      </header>
      <NigeriaFlameFrontier allowSubmission={false} />
      <section className="px-4 py-8 sm:px-6">
        <h2 className="text-xl font-black">World witness · From recognition to delivery</h2>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-stone-400">
          This public record shows verified, consented movement, not a declaration that WEAVE currently operates in every state.
          If a location is empty, its public evidence has not yet arrived. Real movements are submitted from WEAVE positions and checked by Administration.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/login" className="inline-flex items-center gap-2 border border-orange-300/25 px-4 py-3 text-xs font-black text-orange-100">
            Enter WEAVE <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/market" className="inline-flex items-center gap-2 border border-white/15 px-4 py-3 text-xs font-black text-stone-200">
            Explore Client Customer Doors <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}

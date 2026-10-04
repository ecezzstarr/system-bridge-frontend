import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Radio, ShieldCheck } from 'lucide-react'
import { getArenaCarrier } from '@/lib/arena-carrier'

export const dynamic = 'force-dynamic'

function statusLabel(status: string) {
  if (status === 'live') return 'LIVE NOW'
  if (status === 'upcoming') return 'UPCOMING'
  if (status === 'settling') return 'VERIFYING RESULT'
  if (status === 'completed') return 'STREAM COMPLETED'
  if (status === 'cancelled') return 'STREAM CLOSED'
  return status.toUpperCase()
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const carrier = await getArenaCarrier(id, false)
  if (!carrier) {
    return {
      title: 'Weave Carrier',
      description: 'A public entrance carried from Weave.',
    }
  }

  return {
    title: `${carrier.aceName} · Weave Carrier`,
    description: `Ace ${carrier.aceName} — ${carrier.goal}`,
    openGraph: {
      title: `${carrier.aceName} · Weave Arena`,
      description: carrier.goal,
      type: 'website',
      url: carrier.url,
    },
  }
}

export default async function CarrierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const carrier = await getArenaCarrier(id, true)

  if (!carrier) {
    return (
      <main className="min-h-screen bg-[#070a10] px-5 py-16 text-white">
        <div className="mx-auto max-w-xl border-y border-white/10 py-10">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-500">WEAVE · CARRIER</p>
          <h1 className="mt-3 text-3xl font-black">THIS CARRIER IS NOT ACTIVE</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">The entrance may have been withdrawn or the stream is no longer available through this Carrier.</p>
          <Link href="/" className="mt-7 inline-flex items-center gap-2 border border-white/15 px-4 py-3 text-xs font-black uppercase tracking-widest text-white">Enter Weave <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#070a10] px-4 py-10 text-white sm:px-6 sm:py-16">
      <section className="mx-auto max-w-2xl overflow-hidden border-y border-yellow-300/20 bg-black/15 sm:border">
        <header className="border-b border-white/10 px-5 py-6 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300/70">WEAVE · CARRIER</p>
              <p className="mt-2 text-xs font-bold text-slate-500">A public entrance carried from an Ace stream</p>
            </div>
            <Radio className="h-6 w-6 text-red-400" />
          </div>
        </header>

        <div className="px-5 py-7 sm:px-8 sm:py-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-yellow-300/20 bg-yellow-300/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-yellow-200">ACE</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{statusLabel(carrier.status)}</span>
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{carrier.aceName}</h1>
          <p className="mt-2 text-sm font-bold text-slate-400">{carrier.title}</p>

          <div className="mt-8 border-y border-white/10 py-6">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Trying to achieve</p>
            <p className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">{carrier.goal}</p>
          </div>

          <p className="mt-6 text-sm leading-6 text-slate-400">This Carrier came from Weave Arena. Join Weave to enter the Arena ground, follow the stream and participate from inside the subscribed Weave world.</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href={`/register?carrier=${encodeURIComponent(carrier.id)}`} className="inline-flex items-center justify-center gap-2 bg-yellow-400 px-4 py-4 text-xs font-black uppercase tracking-wider text-black hover:bg-yellow-300">Join Weave · Enter Arena <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 border border-white/15 px-4 py-4 text-xs font-black uppercase tracking-wider text-white hover:bg-white/[0.04]">Already in Weave <ShieldCheck className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </main>
  )
}

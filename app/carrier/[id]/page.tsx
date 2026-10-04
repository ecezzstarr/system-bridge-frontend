import type { Metadata } from 'next'
import { Radio } from 'lucide-react'
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
      description: 'A public watching entrance carried from Weave.',
    }
  }

  return {
    title: `${carrier.aceName} · Weave Carrier`,
    description: carrier.goal,
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
          <h1 className="mt-3 text-3xl font-black">CARRIER CLOSED</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">This Ace stream is no longer being carried here.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#070a10] text-white">
      <section className="mx-auto min-h-screen max-w-5xl overflow-hidden bg-black/10">
        <header className="border-b border-white/10 px-4 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300/70">WEAVE · CARRIER</p>
              <h1 className="mt-1 text-xl font-black">{carrier.aceName}</h1>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <Radio className={carrier.status === 'live' ? 'h-4 w-4 text-red-400' : 'h-4 w-4 text-slate-500'} />
              {statusLabel(carrier.status)}
            </div>
          </div>
        </header>

        <div className="px-4 py-5 sm:px-7">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-600">Trying to achieve</p>
          <p className="mt-2 text-xl font-black leading-tight sm:text-2xl">{carrier.goal}</p>
        </div>

        {carrier.streamUrl ? (
          <div className="aspect-video w-full bg-black">
            <iframe
              src={carrier.streamUrl}
              title={`${carrier.aceName} — ${carrier.title}`}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-black px-6 text-center">
            <div>
              <Radio className="mx-auto h-8 w-8 text-slate-700" />
              <p className="mt-3 text-sm font-black text-slate-400">STREAM OPENS HERE</p>
              <p className="mt-1 text-xs text-slate-600">No account or registration is required to watch.</p>
            </div>
          </div>
        )}

        <footer className="border-t border-white/10 px-4 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 sm:px-7">
          Weave Arena · Carrier
        </footer>
      </section>
    </main>
  )
}

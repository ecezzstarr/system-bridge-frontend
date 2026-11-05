'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-provider'
import { ArrowLeft, CameraOff, Info, Mic, ShieldCheck, Video } from 'lucide-react'

/**
 * Separate Bridger video-call destination.
 * This page intentionally does not request camera permission or pretend that
 * provider signaling, AI participation or live video sessions already exist.
 */
export default function BridgerAiVideoCallPage() {
  const { user, isInitialized, isLoading } = useAuth()

  if (!isInitialized || isLoading) return (
    <main role="status" className="mx-auto max-w-4xl p-6 text-sm text-white">Opening the Bridger video-call room…</main>
  )
  if (user?.role !== 'bridger') return (
    <main className="mx-auto max-w-3xl p-6 text-sm text-white">This communication room belongs to the Bridger Department.</main>
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8" data-bridger-ai-video-call="not-live">
      <div className="overflow-hidden rounded-[2rem] border border-amber-300/30 bg-[#f9f6ed] p-5 text-[#263841] shadow-2xl sm:p-9">
        <Link href="/bridger/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#826026]">
          <ArrowLeft className="h-4 w-4"/> Back to Bridger Workplace
        </Link>
        <p className="mt-7 text-xs font-semibold uppercase tracking-widest text-[#966e28]">Hope · Communication</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">AI Video Call</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#4b5b63]">
          This is the independent Bridger video-call room. Live video meetings and AI participation
          are not yet enabled, so no call will be started or charged from this page.
        </p>
        <div className="mt-7 grid gap-5 md:grid-cols-[1.25fr_.75fr]">
          <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-[#e0d3b8] bg-gradient-to-br from-[#eaf1ee] to-[#eee0bd] p-7 text-center">
            <Video className="h-12 w-12 text-[#aa803d]"/>
            <h2 className="mt-4 text-xl font-semibold">Video room not yet active</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#536268]">When available, meetings will require appropriate account access, camera and microphone permission, and clear AI disclosure.</p>
            <div className="mt-6 flex items-center gap-5 text-[#6c7576]" aria-hidden="true">
              <CameraOff className="h-6 w-6"/><Mic className="h-6 w-6"/><ShieldCheck className="h-6 w-6"/>
            </div>
          </section>
          <section className="rounded-2xl border border-[#e0d3b8] bg-white p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Info className="h-5 w-5 text-[#a47d33]"/> Available communication</h2>
            <p className="mt-3 text-sm leading-6 text-[#536268]">River AI Voice Calls are a separate telephone outreach service. Consent and the displayed call cost are required before dialing.</p>
            <Link href="/bridger/river-call-outreach" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#ab8241] px-4 py-3 text-sm font-semibold text-white">
              Open River Voice Calls
            </Link>
            <Link href="/communications" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#d4c4a6] px-4 py-3 text-sm font-semibold text-[#6e5224]">
              Open Direct Communication
            </Link>
          </section>
        </div>
      </div>
    </main>
  )
}

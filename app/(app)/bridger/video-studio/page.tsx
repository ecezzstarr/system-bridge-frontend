'use client'

import Link from 'next/link'
import {ArrowLeft,Camera,Layers3,ShieldCheck,Sparkles} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import HopeVideoFilterShop from '@/components/bridger/hope-video-filter-shop'

/**
 * A commerce entrance independent of an active call.
 * Paid effects are owned permanently, while human-to-human calling remains free.
 */
export default function HopeVideoStudioPage(){
  const {user,isInitialized,isLoading}=useAuth()
  if(!isInitialized||isLoading)return <main role="status" className="mx-auto max-w-5xl p-6 text-sm">Opening the Hope Video Studio…</main>
  if(user?.role!=='bridger')return <main className="mx-auto max-w-5xl p-6">An active Hope Bridger account is required for the video studio.</main>
  return <main data-hope-video-studio="commercial-workshop" className="mx-auto max-w-6xl space-y-6 px-4 py-7 text-[#263c48] sm:px-7 sm:py-10">
    <div className="relative overflow-hidden rounded-[2rem] border border-[#d4bd8b] bg-gradient-to-br from-[#ffffff] via-[#f8f3e6] to-[#dfeced] px-5 py-7 shadow-xl sm:p-10">
      <div className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border-[55px] border-[#d5be8d]/20"/>
      <Link href="/bridger/dashboard" className="relative inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#876329]"><ArrowLeft size={16}/> Hope Workplace</Link>
      <p className="relative mt-7 text-[11px] font-bold uppercase tracking-[.2em] text-[#997339]">Weave of Presence · Hope</p>
      <h1 className="relative mt-2 max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">A professional presence, carried through every conversation.</h1>
      <p className="relative mt-4 max-w-2xl text-base leading-7 text-[#556a71]">Choose a background, shape your look, and build your own permanent studio collection. Every licensed effect works with your WEAVE video calls where the device supports it. Your voice remains your own.</p>
      <div className="relative mt-6 flex flex-wrap items-center gap-3">
        <Link href="/bridger/ai-video-call" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#234e5e] px-5 text-sm font-bold text-white"><Camera size={18}/> Open WEAVE Video Call</Link>
        <span className="rounded-xl border border-[#d9c49d] bg-white/80 px-4 py-3 text-xs font-semibold text-[#6a6d67]">Basic video calls · No charge</span>
      </div>
      <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border border-[#d9c9a9] bg-white/70 p-3"><Layers3 size={19} className="shrink-0 text-[#926c32]"/><p className="text-xs leading-5"><strong className="block text-sm">28 premium effects</strong>Backgrounds, color treatments and face masks</p></div>
        <div className="flex items-start gap-3 rounded-xl border border-[#d9c9a9] bg-white/70 p-3"><Sparkles size={19} className="shrink-0 text-[#926c32]"/><p className="text-xs leading-5"><strong className="block text-sm">Three Studio packages</strong>Permanent collections at a reduced price</p></div>
        <div className="flex items-start gap-3 rounded-xl border border-[#d9c9a9] bg-white/70 p-3"><ShieldCheck size={19} className="shrink-0 text-[#926c32]"/><p className="text-xs leading-5"><strong className="block text-sm">Verified checkout</strong>System Switch payment recorded before access</p></div>
      </div>
    </div>
    <HopeVideoFilterShop/>
    <p className="px-1 text-xs leading-6 text-[#5c6e72]">Live background removal and synthetic face transformations use on-device vision processing. Check compatibility before buying. The company does not record calls using this feature, and no promise of professional streaming quality is made without device testing.</p>
  </main>
}

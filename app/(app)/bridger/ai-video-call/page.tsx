'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { getAuthHeaders } from '@/lib/auth-client'
import { ArrowLeft, Camera, Link2, ShieldCheck, Video } from 'lucide-react'
import WeaveVideoRoom from '@/components/bridger/weave-video-room'

type Call={id:string;status:string;guestName:string|null;createdAt:string;joinedAt:string|null;endedAt:string|null;expiresAt:string}
const SESSION_KEY='weave:hope-video:host:v1'

/** Hope's private WebRTC video-call entrance. Human-to-human only; no hidden billing or AI. */
export default function BridgerAiVideoCallPage(){
  const {user,isInitialized,isLoading}=useAuth()
  const [call,setCall]=useState<Call|null>(null)
  const [link,setLink]=useState('')
  const [history,setHistory]=useState<Call[]>([])
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [initialized,setInitialized]=useState(false)

  const load=useCallback(async()=>{
    try{
      const response=await fetch('/api/hope/video-calls',{headers:getAuthHeaders(),cache:'no-store'})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Call records unavailable')
      setHistory(result.calls||[])
      if(!initialized){
        const saved=sessionStorage.getItem(SESSION_KEY)
        const previous=saved?JSON.parse(saved):null
        const found=(result.calls||[]).find((item:Call)=>item.id===previous?.id&&['inviting','joined'].includes(item.status)&&new Date(item.expiresAt)>new Date())
        if(found){setCall(found);setLink(String(previous.inviteLink||''))}
        else sessionStorage.removeItem(SESSION_KEY)
        setInitialized(true)
      }
    }catch(e:any){setError(e?.message||'Unable to open WEAVE video records')}
  },[initialized])

  useEffect(()=>{
    if(user?.role==='bridger')void load()
  },[user?.role,load])

  const create=async()=>{
    if(busy)return
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/hope/video-calls',{method:'POST',headers:getAuthHeaders()})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Unable to create video call')
      sessionStorage.setItem(SESSION_KEY,JSON.stringify({id:result.call.id,inviteLink:result.inviteLink}))
      setCall(result.call);setLink(result.inviteLink)
      await load()
    }catch(e:any){setError(e?.message||'Could not create video call')}
    finally{setBusy(false)}
  }

  const finished=()=>{
    sessionStorage.removeItem(SESSION_KEY)
    setCall(null);setLink('')
    void load()
  }

  if(!isInitialized||isLoading)return <main role="status" className="mx-auto max-w-4xl p-6 text-sm">Opening Hope video…</main>
  if(user?.role!=='bridger')return <main className="mx-auto max-w-3xl p-6">Hope video calling is available to authorized Bridgers.</main>

  return <main className="mx-auto max-w-5xl px-4 py-8 text-[#263841] sm:px-8" data-bridger-ai-video-call="peer-to-peer">
    <div className="rounded-[1.8rem] border border-[#d7bf8c] bg-[#fbf8f0] p-5 shadow-xl sm:p-8">
      <Link href="/bridger/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[#7d5c24]"><ArrowLeft size={17}/> Hope Workplace</Link>
      <div className="mt-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c6828]">Hope · WEAVE Communications</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">WEAVE Video Call</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#536267]">Speak face to face with a person who has agreed to meet. Create one private invitation, share it directly, and let the invited person join from their phone or browser. Camera and microphone access require each person's permission.</p>
        <p className="mt-3 text-sm font-medium text-[#536267]">Human video calling is separate from River AI telephone calls. Basic conversations remain free; optional Studio effects are purchased individually or in permanent packages using System Switch. Calls are not recorded by WEAVE.</p>
        <Link href="/bridger/video-studio" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#cbb27f] bg-white/80 px-5 text-sm font-bold text-[#6b4d22]">Explore paid Video Studio backgrounds and packages</Link>
      </div>
      {call ? <div className="mt-7"><WeaveVideoRoom key={call.id} callId={call.id} role="bridger" inviteLink={link} onClose={finished}/></div> :
      <div className="mt-7 rounded-2xl border border-[#d7c59f] bg-white p-5">
        <div className="flex items-start gap-3">
          <Video className="mt-1 text-[#a98239]" size={25}/>
          <div><h2 className="text-xl font-semibold">Start a private call</h2>
            <p className="mt-2 text-sm leading-6 text-[#56666b]">Only one guest can accept each invitation. A call expires after two hours. Previous active invitations end when you create another.</p></div>
        </div>
        <button type="button" onClick={create} disabled={busy} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#254a58] px-4 font-semibold text-white disabled:opacity-50"><Camera size={19}/>{busy?'Preparing call…':'Create WEAVE Video Call'}</button>
      </div>}
      {error&&<p role="alert" className="mt-5 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e2d5bd] bg-white/60 p-4"><Camera size={21} className="text-[#987537]"/><p className="mt-2 text-sm font-semibold">Camera and microphone</p><p className="mt-1 text-xs leading-5">Mute, turn camera off and switch cameras on compatible devices.</p></div>
        <div className="rounded-xl border border-[#e2d5bd] bg-white/60 p-4"><Link2 size={21} className="text-[#987537]"/><p className="mt-2 text-sm font-semibold">Private invitation</p><p className="mt-1 text-xs leading-5">Only share with an invited person. First accepted guest holds the room.</p></div>
        <div className="rounded-xl border border-[#e2d5bd] bg-white/60 p-4"><ShieldCheck size={21} className="text-[#987537]"/><p className="mt-2 text-sm font-semibold">Protected conversation</p><p className="mt-1 text-xs leading-5">WebRTC encrypts media. No video or audio recording by WEAVE.</p></div>
      </div>
      <section className="mt-9">
        <h2 className="text-lg font-semibold">Recent call records</h2>
        <p className="mt-1 text-xs leading-5 text-[#667478]">Call status and participation only. No video or audio recordings.</p>
        <div className="mt-3 divide-y divide-[#dfd4bd]">
          {history.map(item=><div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
            <div><p className="font-semibold">{item.guestName||'Invitation not accepted'}</p><p className="text-xs text-[#65737a]">{new Date(item.createdAt).toLocaleString()}</p></div>
            <span className="rounded-lg border border-[#d8c49e] px-3 py-1.5 text-xs font-medium">{item.status}</span>
          </div>)}
          {!history.length&&<p className="py-4 text-sm text-[#667478]">No WEAVE video calls yet.</p>}
        </div>
      </section>
      <div className="mt-7 flex flex-wrap gap-4 text-sm"><Link href="/communications" className="font-semibold text-[#876329]">Direct Communication</Link><Link href="/bridger/river-call-outreach" className="font-semibold text-[#876329]">River AI Voice Calls</Link></div>
    </div>
  </main>
}

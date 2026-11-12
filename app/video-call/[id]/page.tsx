'use client'

import { useEffect,useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Camera, ShieldCheck, Video } from 'lucide-react'
import WeaveVideoRoom from '@/components/bridger/weave-video-room'

/** Public invitation entrance: no WEAVE account required for the invited guest. */
export default function InvitedWeaveVideoCallPage(){
  const params=useParams()
  const id=String(params.id||'')
  const storageKey='weave:video-guest:'+id
  const [invite,setInvite]=useState('')
  const [access,setAccess]=useState('')
  const [name,setName]=useState('')
  const [consent,setConsent]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [loaded,setLoaded]=useState(false)
  const [ended,setEnded]=useState(false)

  useEffect(()=>{
    if(!id)return
    const hash=new URLSearchParams(window.location.hash.replace(/^#/,''))
    setInvite(hash.get('invite')||'')
    const stored=sessionStorage.getItem(storageKey)
    if(stored){
      // Check session access before re-entering after a phone browser refresh.
      fetch('/api/hope/video-calls/'+id,{cache:'no-store',headers:{'x-weave-video-guest':stored}})
        .then(async response=>{
          const data=await response.json().catch(()=>({}))
          if(!response.ok||!['inviting','joined'].includes(data.call?.status))throw new Error('Call no longer available')
          setAccess(stored)
          window.history.replaceState(null,'',window.location.pathname+window.location.search)
        })
        .catch(()=>sessionStorage.removeItem(storageKey))
        .finally(()=>setLoaded(true))
    }else setLoaded(true)
  },[id,storageKey])

  const join=async()=>{
    if(busy||!consent)return
    if(name.trim().length<2){setError('Enter your name to join this call');return}
    if(!invite){setError('An invitation link from a Bridger is required');return}
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/hope/video-calls/'+id+'/join',{
        method:'POST',headers:{'Content-Type':'application/json','x-weave-video-invite':invite},
        body:JSON.stringify({name:name.trim()})
      })
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Unable to join')
      sessionStorage.setItem(storageKey,result.guestAccess)
      setAccess(result.guestAccess)
      setInvite('')
      window.history.replaceState(null,'',window.location.pathname+window.location.search)
    }catch(e:any){setError(e?.message||'Unable to accept invitation')}
    finally{setBusy(false)}
  }

  const finished=()=>{
    sessionStorage.removeItem(storageKey)
    setAccess('');setInvite('');setEnded(true)
  }

  return <main className="min-h-screen bg-gradient-to-b from-[#f9f5e9] to-[#e3eced] px-4 py-10 text-[#233943]">
    <div className="mx-auto max-w-4xl rounded-[1.8rem] border border-[#d6bf8c] bg-white/90 p-5 shadow-2xl sm:p-9">
      <Link href="/" className="text-sm font-semibold text-[#82632c]">WEAVE · The Company of Time</Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[#94702f]">Hope · Private Invitation</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">WEAVE Video Call</h1>
      <p className="mt-3 text-sm leading-6 text-[#53636b]">A Bridger has invited you to a face-to-face conversation. You can join without creating a WEAVE account. This call is not recorded by WEAVE or joined by an AI.</p>

      {!loaded&&<p role="status" className="mt-6">Checking your invitation…</p>}
      {loaded&&access&&!ended&&<div className="mt-7"><WeaveVideoRoom key={id} callId={id} role="guest" guestAccess={access} onClose={finished}/></div>}
      {loaded&&!access&&!ended&&<div className="mt-7 rounded-2xl border border-[#dccbad] bg-[#fffdf6] p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Video size={23} className="text-[#a0803d]"/> Join your invitation</h2>
        <p className="mt-2 text-sm leading-6">Only join if you know the Bridger and have agreed to this conversation. After joining, you control when to enable your microphone and camera.</p>
        <label htmlFor="guest-name" className="mt-5 block text-sm font-semibold">Your name</label>
        <input id="guest-name" value={name} onChange={e=>setName(e.target.value)} maxLength={100} placeholder="Name for this call" className="mt-2 min-h-12 w-full rounded-lg border border-[#cdbb97] bg-white px-4"/>
        <label className="mt-4 flex items-start gap-3 text-sm leading-6">
          <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1"/>
          I agree to join this live video conversation and understand that WEAVE does not record it.
        </label>
        <button onClick={join} disabled={busy||!consent} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#265367] px-4 font-semibold text-white disabled:opacity-50"><Camera size={18}/>{busy?'Accepting invitation…':'Accept invitation'}</button>
      </div>}
      {ended&&<p className="mt-7 rounded-xl border border-[#d9c49d] bg-[#fff8e7] p-5 text-sm">This call has ended. Request another invitation if you need to speak again.</p>}
      {error&&<p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {!invite&&!access&&!ended&&loaded&&<p className="mt-4 text-sm text-[#775b29]">An unexpired private invitation link from a WEAVE Bridger is required.</p>}
      <p className="mt-7 flex items-start gap-2 text-xs leading-5 text-[#637177]"><ShieldCheck size={17} className="shrink-0"/> Secure HTTPS and WebRTC are required. The invited person may decline or end the call at any time. On some networks, calls require TURN relay configured by Administrations.</p>
    </div>
  </main>
}

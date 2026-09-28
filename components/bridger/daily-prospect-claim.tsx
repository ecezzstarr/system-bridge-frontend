'use client'

import Link from 'next/link'
import { useEffect,useState } from 'react'
import { CheckCircle2,Gift,MessageCircle,RefreshCw,Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAuthHeaders } from '@/lib/auth-client'
import { openWhatsAppWithNumber } from '@/components/external-apps-nav'
import { emitWeaveMotion } from '@/lib/weave-interaction-motion'
import { visiblePoll } from '@/lib/visible-poll'

export function DailyProspectClaim(){
  const [loading,setLoading]=useState(true)
  const [claiming,setClaiming]=useState(false)
  const [claimed,setClaimed]=useState(false)
  const [claim,setClaim]=useState<any>(null)
  const [error,setError]=useState('')

  const load=async(silent=false,signal?:AbortSignal)=>{
    if(!silent)setLoading(true)
    setError('')
    try{
      const response=await fetch('/api/bridger/daily-prospect',{headers:getAuthHeaders(),cache:'no-store',signal})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Unable to load daily prospect')
      setClaimed(Boolean(data.claimed))
      setClaim(data.claim||null)
    }catch(err:any){
      if(err?.name==='AbortError')return
      setError(err?.message||'Unable to load daily prospect')
    }finally{
      if(!silent)setLoading(false)
    }
  }

  useEffect(()=>{
    void load()
    return visiblePoll(signal=>load(true,signal),60000,false)
  },[])

  const claimToday=async()=>{
    setClaiming(true)
    setError('')
    try{
      const response=await fetch('/api/bridger/daily-prospect',{
        method:'POST',
        headers:getAuthHeaders(),
        body:JSON.stringify({}),
      })
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'No free prospect is available')
      setClaimed(true)
      setClaim(data.claim||null)
      emitWeaveMotion({kind:'route',label:'Daily Prospect entered Bridger outreach',intensity:1.15,confirmed:true,source:'daily-prospect'})
    }catch(err:any){
      const label=err?.message||'Unable to claim daily prospect'
      emitWeaveMotion({kind:'interruption',label,intensity:.6,confirmed:true,source:'daily-prospect'})
      setError(label)
    }finally{
      setClaiming(false)
    }
  }

  const phone=claim?.whatsapp||claim?.whatsapp_number||claim?.phone
  const name=claim?.name||claim?.full_name||'Daily Prospect'
  const outreachMessage=claim?.message_sent||`Hi ${name}, this is your Bridger from Weave.`

  return <section className="border-y border-emerald-300/15 py-4" data-daily-prospect-station="live">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Gift className="h-5 w-5 text-emerald-300"/>
        <div>
          <p className="text-[8px] font-black uppercase tracking-[.16em] text-emerald-300">Daily Prospect</p>
          <p className="mt-1 text-sm font-black text-white">{loading?'READING':claimed?'CLAIMED':'READY'}</p>
        </div>
      </div>

      {!loading&&!claimed&&!error&&<Button
        data-presence-output="Claim Daily Prospect into Bridger outreach"
        onClick={claimToday}
        disabled={claiming}
        className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
      >
        {claiming?<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>:<Gift className="mr-2 h-4 w-4"/>}
        Claim
      </Button>}

      {!loading&&claimed&&claim&&<div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-black text-white"><CheckCircle2 className="h-4 w-4 text-emerald-300"/>{name}</span>
        {phone&&<Button onClick={()=>openWhatsAppWithNumber(phone,outreachMessage)} className="bg-green-600 hover:bg-green-700"><MessageCircle className="mr-2 h-4 w-4"/>Message</Button>}
        <Button asChild variant="outline"><Link href="/weave/market/prospects"><Users className="mr-2 h-4 w-4"/>Prospects</Link></Button>
      </div>}
    </div>

    {!loading&&error&&<div className="mt-3 flex items-center justify-between gap-3 border-l border-amber-300/25 pl-3 text-xs text-amber-200">
      <span>{error}</span>
      <button onClick={()=>void load()} className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em]"><RefreshCw className="h-3.5 w-3.5"/>Retry</button>
    </div>}
  </section>
}

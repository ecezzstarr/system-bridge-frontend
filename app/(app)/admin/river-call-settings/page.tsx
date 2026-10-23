'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {getAuthHeaders} from '@/lib/auth-client'
type Report={settings:{price_flame_coin:string|null;enabled:boolean;updated_at:string};statistics:{calls:number;handoffs:number;refunds:number};voiceConfigured:boolean;aiConfigured:boolean;whatsappConfigured:boolean}
export default function RiverCallSettingsPage(){
  const [data,setData]=useState<Report|null>(null)
  const [enabled,setEnabled]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  const load=useCallback(async()=>{
    try{
      const response=await fetch('/api/admin/river-call-settings',{headers:getAuthHeaders(),cache:'no-store'})
      const report=await response.json()
      if(!response.ok)throw new Error(report.error||'Unable to load settings')
      setData(report);setEnabled(Boolean(report.settings.enabled))
    }catch(e:any){setError(e?.message||'Settings unavailable')}
  },[])
  useEffect(()=>{load()},[load])
  const save=async()=>{
    setBusy(true);setError('');setNotice('')
    try{
      const response=await fetch('/api/admin/river-call-settings',{method:'PATCH',headers:getAuthHeaders(),
        body:JSON.stringify({enabled})})
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Unable to save settings')
      setNotice('River calling availability updated. Each call costs 5 Flame Coin.')
      await load()
    }catch(e:any){setError(e?.message||'Could not save')}
    finally{setBusy(false)}
  }
  return <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/dashboard" className="text-xs text-sky-300">← Administration</Link>
      <h1 className="mt-5 text-3xl font-black">River Call Outreach · Administration</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">Each River call costs 5 Flame Coin. Activate or suspend calling without redeployment. Activation is restricted until both the verified telephony service and River AI are available.</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          ['Voice provider',data?.voiceConfigured?'Configured':'Not configured'],
          ['River AI',data?.aiConfigured?'Configured':'Not configured'],
          ['Automatic WhatsApp handoff',data?.whatsappConfigured?'Business template configured':'Manual Bridger handoff']
        ].map(([label,value])=><div key={label} className="border border-white/10 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}
      </div>
      {(error||notice)&&<p role="alert" className={'mt-5 text-sm '+(error?'text-rose-300':'text-emerald-300')}>{error||notice}</p>}
      <div className="mt-8 border-y border-white/10 py-6">
        <p className="text-sm font-bold">One River call = 5 Flame Coin</p>
        <label className="mt-6 flex items-center gap-3 text-sm"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Enable new River calls</label>
        <button onClick={save} disabled={busy} className="mt-5 border border-sky-300/40 px-5 py-3 text-sm font-bold text-sky-100 disabled:opacity-40">{busy?'Saving…':'Save River calling availability'}</button>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {[
          ['Call attempts',data?.statistics?.calls??0],['Consented WhatsApp handoffs',data?.statistics?.handoffs??0],['Refunded calls',data?.statistics?.refunds??0]
        ].map(([label,value])=><div key={label} className="border-t border-white/10 pt-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}
      </div>
      <p className="mt-8 text-xs leading-5 text-slate-500">WhatsApp business messages require prospect opt-in, a registered Business sender and an approved outbound template. A normal Bridger WhatsApp number alone cannot be used by WEAVE to automatically send messages.</p>
    </div>
  </main>
}

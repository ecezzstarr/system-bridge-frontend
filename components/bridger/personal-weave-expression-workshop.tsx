'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Copy, Loader2, RefreshCw, Save, Sparkles } from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'

type Expression = {
  bridge_code:string; template_name:string; status:string; specialty:string;
  public_title:string; purpose:string; expression:string; invitation:string
}
const specialties = [
  ['general','Business formation'],['commerce','Retail & exchange'],['food','Food & hospitality'],
  ['technology','Technology & software'],['creative','Creative production'],
  ['agriculture','Agriculture & distribution'],['services','Professional services'],
  ['enterprise','Enterprise systems'],
] as const

export default function PersonalWeaveExpressionWorkshop() {
  const [paths,setPaths]=useState<Expression[]>([])
  const [code,setCode]=useState('')
  const [form,setForm]=useState({specialty:'general',public_title:'',purpose:'',expression:'',invitation:''})
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [copied,setCopied]=useState(false)

  async function load() {
    setLoading(true);setError('')
    try {
      const r=await fetch('/api/bridger/bridge-expression',{headers:getAuthHeaders(),cache:'no-store'})
      const b=await r.json()
      if(!r.ok)throw new Error(b.error||'Unable to open workshop')
      const list:Expression[]=b.expressions||[]
      setPaths(list.filter(item=>item.status==='active'))
      const match=list.find(x=>x.bridge_code===code&&x.status==='active')||
        list.find(x=>x.status==='active')
      setCode(match?.bridge_code||'')
      if(match)setForm({specialty:match.specialty,public_title:match.public_title,
        purpose:match.purpose,expression:match.expression,invitation:match.invitation})
    }catch(e:any){setError(e?.message||'Unable to open workshop')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  function choose(nextCode:string) {
    setCode(nextCode)
    setMessage('');setError('');setCopied(false)
    const path=paths.find(item=>item.bridge_code===nextCode)
    if(path)setForm({specialty:path.specialty,public_title:path.public_title,
      purpose:path.purpose,expression:path.expression,invitation:path.invitation})
  }
  async function save(){
    if(!code)return
    setSaving(true);setMessage('');setError('')
    try{
      const r=await fetch('/api/bridger/bridge-expression',{
        method:'PATCH',headers:getAuthHeaders(),body:JSON.stringify({
          bridgeCode:code,specialty:form.specialty,publicTitle:form.public_title,
          purpose:form.purpose,expression:form.expression,invitation:form.invitation,
        }),
      })
      const data=await r.json()
      if(!r.ok)throw new Error(data.error||'Unable to save expression')
      setPaths(previous=>previous.map(p=>p.bridge_code===code?{...p,...form}:p))
      setMessage('Saved to your own active Bridge AI. New visitors to this Bridge now encounter your specialized Weave expression.')
    }catch(e:any){setError(e.message||'Unable to save expression')}
    finally{setSaving(false)}
  }

  const link=code?'https://weavingsystem.online/bridge/'+encodeURIComponent(code):''
  const field='mt-2 min-h-12 w-full rounded-xl border border-[#d6c6a7] bg-white px-4 py-3 text-base text-[#252725] outline-none focus:border-[#91713c]'
  const label='block text-sm font-semibold text-[#33342f]'

  return <section className="border-b border-[#e2d5ba] bg-[#f7f3eb] px-4 py-7 text-[#242822] sm:px-7" data-weave-personal-expression="bridger-owned">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-[#897345]"><Sparkles className="h-4 w-4"/> Hope · My Weave Intelligence</p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Your personal specialized Weave workshop</h2>
        </div>
        <button type="button" onClick={()=>void load()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#bba67e] px-4 text-sm font-semibold"><RefreshCw className="h-4 w-4"/>Refresh</button>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#56554d]">Weave is intelligence expressed through your work, not an interchangeable sales script. Give your Bridge a recognizable purpose and cadence. The intelligence listens, recognizes a person's actual needs, and expresses the next useful movement without forcing a purchase.</p>
      {loading&&<p className="mt-4 text-sm"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Opening your Bridge paths…</p>}
      {!loading&&paths.length===0&&<p className="mt-4 rounded-xl border border-[#d0bd98] p-4 text-sm">Your personal workshop becomes available once you open an active Bridge AI path using the existing template controls on this page.</p>}
      {paths.length>0&&<div className="mt-6 grid gap-5 lg:grid-cols-[1fr_.9fr]">
        <div className="rounded-3xl border border-[#e0d5c0] bg-white p-5 sm:p-6">
          <label className={label}>Which of your Bridge AI paths carries this expression?
            <select className={field} value={code} onChange={e=>choose(e.target.value)}>
              {paths.map(item=><option key={item.bridge_code} value={item.bridge_code}>{item.template_name} · {item.bridge_code}</option>)}
            </select>
          </label>
          <div className="mt-4 grid gap-4">
            <label className={label}>Your business specialization
              <select className={field} value={form.specialty} onChange={e=>setForm({...form,specialty:e.target.value})}>
                {specialties.map(([value,title])=><option key={value} value={value}>{title}</option>)}
              </select>
            </label>
            <label className={label}>Personal public title
              <input className={field} required maxLength={90} value={form.public_title} onChange={e=>setForm({...form,public_title:e.target.value})} placeholder="e.g. A bridge for local enterprise"/>
            </label>
            <label className={label}>What work do you specialize in?
              <textarea rows={3} className={field} maxLength={260} value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})} placeholder="I help businesses organize work, sales and customer relationships."/>
            </label>
            <label className={label}>Your distinctive expression
              <textarea rows={4} className={field} maxLength={500} value={form.expression} onChange={e=>setForm({...form,expression:e.target.value})} placeholder="The way you recognize needs and guide an individual from a real idea toward useful work."/>
            </label>
            <label className={label}>Welcome to your Bridge
              <textarea rows={3} className={field} maxLength={280} value={form.invitation} onChange={e=>setForm({...form,invitation:e.target.value})} placeholder="Tell me what you're building. We can find the next practical step together."/>
            </label>
          </div>
          <button type="button" onClick={()=>void save()} disabled={saving||!code} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#26322d] px-6 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{saving?'Saving…':'Publish to my Bridge'}</button>
          {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
          {message&&<p role="status" className="mt-4 text-sm text-[#365a3d]">{message}</p>}
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-[#d5c5a3] bg-[#efe4cf] p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7e653b]">Your public Weave expression</p>
            <h3 className="mt-3 text-2xl font-semibold">{form.public_title||'Your personal Bridge'}</h3>
            <p className="mt-3 text-sm leading-7 text-[#595247]">{form.invitation||'A place to recognize what the person needs before offering a File Folder.'}</p>
            <p className="mt-4 text-sm font-semibold text-[#595247]">{form.purpose||'Your business purpose appears here.'}</p>
            <div className="mt-5 break-all rounded-xl border border-[#d4c2a2] bg-white/70 p-3 font-mono text-xs">{link}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={!link} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#26322d] px-4 text-sm font-bold text-white" onClick={()=>void navigator.clipboard.writeText(link).then(()=>setCopied(true)).catch(()=>setCopied(false))}><Copy className="h-4 w-4"/>{copied?'Copied':'Copy my Bridge AI link'}</button>
              {code&&<Link href={'/bridge/'+encodeURIComponent(code)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#aa936e] px-4 text-sm font-semibold">Open my Bridge <ArrowUpRight className="h-4 w-4"/></Link>}
            </div>
          </div>
          <div className="rounded-3xl border border-[#d8cbb3] bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold">Bring real opportunities into your intelligence</h3>
            <p className="mt-2 text-sm leading-7 text-[#57544c]">Use the Unbuilt Door inside your workshop to select verified customer needs. Share your own Bridge AI link; never send a competing generic sales entrance. Personal expression does not change Weave's official prices, commissions, terms or payment verification.</p>
            <Link href="/bridger/unbuilt-door" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#775a30]">Explore verified-demand outreach <ArrowUpRight className="h-4 w-4"/></Link>
          </div>
        </div>
      </div>}
    </div>
  </section>
}

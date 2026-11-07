'use client'

import Link from 'next/link'
import {useEffect,useState,type FormEvent} from 'react'
import {useRouter,useSearchParams} from 'next/navigation'
import {ArrowRight,BookOpen,CheckCircle2,Compass,Search,ShieldCheck} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import {useEnvironmentOrganizer} from '@/components/world/environment-organizer-provider'
import type {WeaveSearchDestination,WeaveSearchRole} from '@/lib/weave-action-search'

type SearchResponse={
  role:WeaveSearchRole
  roleName:string
  query:string
  indexedCount:number
  count:number
  results:WeaveSearchDestination[]
  guidance:string
}
const examples:Record<WeaveSearchRole,string[]>={
  agent:['I want to sell food to shops','How do I order stock?','Where are my commissions?','Find a company job'],
  bridger:['How do I contact Prospects?','Explain the File Folder','Where is Bridge AI?','How do I get a Client?'],
  client:['How do I build my store?','How do I earn with my File Folder?','Show my business records','My approved company position'],
  admin:['Where are pending payments?','Approve a staff application','Find company users','How do I deploy a release?'],
  legion:['My Client duties','What can I do next?'],
}
const help:Record<WeaveSearchRole,string>={
  agent:'Stability: sell and distribute real WEAVE products. Search by the work you want to do, not by a page name.',
  bridger:'Hope: introduce WEAVE through real conversations. Search for an outreach task or a Client crossing step.',
  client:'Dream Lovely: form systems and serve customers through your owned File Folder. Search by the business you want to operate.',
  admin:'A Time: maintain the company and its authorized records. Search by the decision, verification or workshop you need.',
  legion:'Your Client employment is exclusive while active. Find only authorized Legion work and guidance.',
}
const accessText:Record<string,string>={
  approval:'Approval or appointment required',
  lifestyle:'Lifestyle eligibility required',
  preview:'Preview only; full operation may be unavailable',
}

export default function WeaveCompanySearchPage(){
  const {token,user,isInitialized}=useAuth()
  const {ready:visibilityReady,isVisible}=useEnvironmentOrganizer()
  const router=useRouter()
  const params=useSearchParams()
  const query=(params.get('q')||'').trim()
  const [draft,setDraft]=useState(query)
  const [response,setResponse]=useState<SearchResponse|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>setDraft(query),[query])
  useEffect(()=>{
    if(!isInitialized)return
    const controller=new AbortController()
    let active=true
    setLoading(true);setError('')
    const headers:HeadersInit=token?{Authorization:'Bearer '+token}:{}
    void fetch('/api/weave/search'+(query?'?q='+encodeURIComponent(query):''),{
      headers,cache:'no-store',signal:controller.signal,
    }).then(async res=>{
      const body=await res.json().catch(()=>({}))
      if(!res.ok)throw new Error(body.error||'Your role search is unavailable')
      return body as SearchResponse
    }).then(body=>{
      if(active)setResponse(body)
    }).catch(e=>{
      if(active&&!controller.signal.aborted){setResponse(null);setError(e instanceof Error?e.message:'Unable to search WEAVE')}
    }).finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false;controller.abort()}
  },[query,token,isInitialized])

  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const value=draft.trim()
    router.push(value?'/search?q='+encodeURIComponent(value):'/search')
  }
  const role=response?.role||(user?.role==='agent'||user?.role==='bridger'||user?.role==='client'||user?.role==='admin'?user.role:'client')
  const suggestions=examples[role]||examples.client
  const items=(response?.results||[]).filter(item=>!visibilityReady||isVisible(item.href))
  return <main className="mx-auto w-full max-w-6xl space-y-5 px-3 py-5 text-white sm:px-6 sm:py-8" data-weave-company-search="role-aware">
    <header className="rounded-2xl border border-sky-300/25 bg-[#081b2b] p-5 sm:p-7">
      <div className="flex items-center gap-2 text-sm font-semibold text-sky-200"><Compass className="h-5 w-5"/> WEAVE · Company Search</div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Tell WEAVE what you want to do.</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200">
        You do not need to know the name of a system. Describe your task, and WEAVE will show the original working page, what it does and what you need first.
      </p>
      <p className="mt-3 text-sm text-sky-100">{response?.roleName||'Your company position'}</p>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">{help[role]}</p>
      <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={submit} role="search">
        <label className="relative block flex-1">
          <span className="sr-only">Describe what you need to do at WEAVE</span>
          <Search className="absolute left-4 top-4 h-5 w-5 text-sky-200"/>
          <input value={draft} onChange={e=>setDraft(e.target.value)} type="search"
            maxLength={160}
            placeholder={role==='agent'?'Example: I want to sell food to shops':role==='bridger'?'Example: How do I find Clients?':role==='admin'?'Example: Where are pending approvals?':'Example: How do I open my store?'}
            className="min-h-14 w-full rounded-xl border border-sky-200/30 bg-black/30 py-3 pl-12 pr-4 text-base text-white placeholder:text-slate-400 focus:border-sky-200 focus:outline-none"/>
        </label>
        <button type="submit" className="min-h-14 rounded-xl bg-sky-200 px-7 py-3 text-base font-semibold text-[#071a2a]">Find my next step</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Example tasks">
        {suggestions.map(q=><button key={q} type="button" onClick={()=>{setDraft(q);router.push('/search?q='+encodeURIComponent(q))}}
          className="rounded-full border border-sky-300/20 bg-sky-200/[.04] px-3 py-2 text-sm text-sky-100 hover:border-sky-200/50">{q}</button>)}
      </div>
      <nav className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-4 text-sm" aria-label="Search categories">
        <span className="rounded-lg bg-sky-200/15 px-4 py-2 font-semibold text-sky-100" aria-current="page">Company work and systems</span>
        <Link href={'/search/cadences'+(query?'?q='+encodeURIComponent(query):'')} className="rounded-lg border border-white/20 px-4 py-2 text-slate-200 hover:bg-white/5">
          <BookOpen className="mr-2 inline h-4 w-4"/>Human Cadence Engine · Recorded knowledge
        </Link>
      </nav>
    </header>

    <section className="rounded-2xl border border-white/10 bg-[#071522]/90 p-4 sm:p-6" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold">{query?'Relevant company places':'Good places to begin'}</h2>
          <p className="mt-1 text-sm text-slate-300">{query?'Showing places relevant to “'+query+'”.':'Start with one actual company function. All existing work remains in its original page.'}</p>
        </div>
        {response&&<span className="text-xs text-slate-400">{items.length} visible · {response.indexedCount} indexed destinations</span>}
      </div>

      {loading&&<p role="status" className="py-8 text-sm text-slate-300">Finding the correct places for your role…</p>}
      {error&&<div role="alert" className="mt-4 rounded-xl border border-rose-300/30 p-4 text-sm text-rose-100">{error}</div>}
      {!loading&&!error&&!items.length&&<div className="mt-5 rounded-xl border border-dashed border-white/20 p-5">
        <p className="font-semibold">No matching authorized workstation was found.</p>
        <p className="mt-2 text-sm text-slate-300">Try the task in simpler words. You can search for “money”, “job”, “product” or “File Folder”. A missing result is not proof a service is available to you.</p>
        <button type="button" onClick={()=>{setDraft('');router.push('/search')}} className="mt-4 rounded-lg border border-sky-200/30 px-4 py-2 text-sm text-sky-100">See where to begin</button>
      </div>}
      {!loading&&!error&&items.length>0&&<div className="mt-5 grid gap-4 md:grid-cols-2">
        {items.map(result=><article key={result.href} className="flex min-w-0 flex-col rounded-xl border border-white/15 bg-[#10273a]/65 p-5" data-weave-search-result={result.href}>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">{result.department}</p>
          <h3 className="mt-2 text-lg font-bold">{result.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-200">{result.description}</p>
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm">
            <p className="text-slate-200"><strong className="text-white">Before you begin:</strong> {result.requirements}</p>
            <p className="text-slate-200"><strong className="text-white">Your next step:</strong> {result.nextStep}</p>
            {result.access!=='available'&&<p className="text-amber-200"><ShieldCheck className="mr-1 inline h-4 w-4"/>{accessText[result.access]||'Check requirements first'}</p>}
          </div>
          <Link href={result.href} className="mt-5 inline-flex min-h-12 items-center justify-between rounded-lg bg-sky-200 px-4 py-2 font-semibold text-[#071a2a]">
            Open the existing work page <ArrowRight className="h-5 w-5"/>
          </Link>
        </article>)}
      </div>}
      <p className="mt-5 flex gap-2 border-t border-white/10 pt-4 text-sm leading-6 text-slate-400">
        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0"/>
        {response?.guidance||'Search explains what exists. Every payment, company approval, Client access and fulfilled order is independently verified.'}
      </p>
    </section>
  </main>
}

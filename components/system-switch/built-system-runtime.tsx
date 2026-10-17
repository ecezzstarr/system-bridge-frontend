'use client'
import { useState } from 'react'
import { capabilityGraph, searchRuntimeEntries, workQueue, type Capability } from '@/lib/file-folder-capability-graph'

const labels: Record<Capability,string> = {work_queue:'Work queue',record_search:'Search records',customer_door:'Customer Door',system_routes:'System routes'}
export function BuiltSystemRuntime({system,onNavigate,onToggle,busy}: {
  system:any; onNavigate:(surface:'business'|'enterprise')=>void;
  onToggle:(entry:any)=>void; busy:boolean;
}) {
  const [query,setQuery]=useState('')
  const capabilities=capabilityGraph([system]).nodes[0]?.capabilities||[]
  const [chosen,setChosen]=useState<Capability|undefined>(capabilities[0])
  const selected=chosen&&capabilities.includes(chosen)?chosen:capabilities[0]
  const entries=Array.isArray(system.entries)?system.entries:[]
  const queue=workQueue(entries)
  return <section data-capability-runtime={selected||'legacy'} className="border-b border-emerald-300/20 p-5 text-white">
    <nav aria-label="Built system capabilities" className="flex flex-wrap gap-2">
      {capabilities.map(c=><button key={c} onClick={()=>setChosen(c)} aria-pressed={selected===c} className="rounded-xl border border-emerald-200/30 px-3 py-2 text-xs">{labels[c]}</button>)}
    </nav>
    {!selected&&<p className="mt-3 text-xs">This system type uses the compatible records workspace below.</p>}
    {selected==='work_queue'&&<div className="mt-4 grid gap-3 sm:grid-cols-2">{(['open','done'] as const).map(state=><div key={state}>
      <h3 className="font-bold">{state==='open'?'Pending work':'Completed'} · {queue[state].length}</h3>
      {queue[state].map((entry:any)=><button key={entry.id} disabled={busy} onClick={()=>onToggle(entry)} className="mt-2 block w-full rounded-lg border border-white/20 p-3 text-left text-sm">{entry.title}<span className="block text-xs text-emerald-200">{state==='open'?'Complete work':'Reopen work'}</span></button>)}
      {!queue[state].length&&<p className="mt-2 text-xs text-slate-400">No work in this queue.</p>}
    </div>)}</div>}
    {selected==='record_search'&&<div className="mt-4"><input aria-label="Search this system" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title and content" className="w-full rounded-lg bg-black/40 p-3"/>
      <p className="mt-2 text-xs">{searchRuntimeEntries(entries,query).length} matching records</p>
      {searchRuntimeEntries(entries,query).map((entry:any)=><article key={entry.id} className="mt-2 border-b border-white/10 p-2"><b>{entry.title}</b><p className="whitespace-pre-wrap text-xs text-slate-300">{entry.body}</p></article>)}
    </div>}
    {selected==='customer_door'&&<button onClick={()=>onNavigate('business')} className="mt-4 rounded-xl bg-emerald-400 px-4 py-3 text-sm text-black">Operate offers, customer requests and fulfilment</button>}
    {selected==='system_routes'&&<button onClick={()=>onNavigate('enterprise')} className="mt-4 rounded-xl bg-cyan-300 px-4 py-3 text-sm text-black">Operate authorized system connections</button>}
  </section>
}

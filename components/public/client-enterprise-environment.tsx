
import Link from 'next/link'
import { ArrowRight, Building2, Crown, Network, Radio, Store, Users, Workflow } from 'lucide-react'

export function ClientEnterpriseEnvironment({
  enterprise,growth,systems,legions,marketUrl,streamUrl,
}:{
  enterprise:any
  growth:any
  systems:any[]
  legions:any[]
  marketUrl?:string|null
  streamUrl?:string|null
}){
  const position=String(enterprise.requested_position||'lord')
  return <main className="min-h-screen bg-transparent text-white" data-client-enterprise-world>
    <header className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(245,158,11,.2),transparent_34%),radial-gradient(circle_at_82%_10%,rgba(56,189,248,.11),transparent_32%),linear-gradient(180deg,#151005,#03050a)] px-5 py-10 md:px-8 md:py-16">
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_84%)]"/>
      <div className="relative mx-auto max-w-7xl">
        <nav className="flex flex-wrap items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/55">
          <Link href="/enterprise" className="inline-flex items-center gap-2 hover:text-white"><Crown className="h-4 w-4"/>WEAVE Enterprise Territory</Link>
          <span>{position==='lady'?'Lady':'Lord'} · {enterprise.sector}</span>
        </nav>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">Enterprise Door · Open</p>
            <h1 data-weave-live-word="title" className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.045em] sm:text-6xl">{enterprise.enterprise_name}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">An Administration-approved Client enterprise carried through a constructed public Enterprise Door. This territory reflects systems, participants and business movement actually present in the File Folder.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.05] p-4 text-center"><p className="text-[8px] font-black uppercase tracking-wider text-amber-300">Business Vitality</p><p className="mt-2 text-3xl font-black">{growth.vitality.score}</p><p className="text-[8px] text-slate-500">30-day activity index</p></div>
            <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.05] p-4 text-center"><p className="text-[8px] font-black uppercase tracking-wider text-sky-300">Live systems</p><p className="mt-2 text-3xl font-black">{systems.length}</p></div>
          </div>
        </div>
      </div>
    </header>

    <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-[2rem] border border-amber-300/12 bg-[linear-gradient(145deg,rgba(245,158,11,.06),rgba(255,255,255,.015))] p-6">
          <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-amber-300"/><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">Enterprise structures</p><h2 data-weave-live-word="title" className="mt-1 text-2xl font-black">Constructed territory</h2></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['Enterprise Door',growth.enterprise.doorOpen],
              ['Enterprise Hall',growth.enterprise.hallOpen],
              ['Operations Command',growth.enterprise.operationsOpen],
              ['Enterprise Treasury',growth.enterprise.treasuryOpen],
              ['Distribution Network',growth.enterprise.distributionOpen],
              ['Legion Quarters',growth.capabilities.legionCapacity>0],
            ].map(entry=>{
              const label=String(entry[0])
              const open=Boolean(entry[1])
              return <div key={label} className={'rounded-2xl border p-4 '+(open?'border-emerald-300/15 bg-emerald-400/[0.04]':'border-white/8 bg-black/20')}><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{open?'Constructed':'Not constructed'}</p><p className="mt-2 text-sm font-black">{label}</p></div>
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Legions</p></div>
            <p className="mt-3 text-3xl font-black">{legions.length}<span className="text-sm text-slate-600"> / {growth.capabilities.legionCapacity||0}</span></p>
            <div className="mt-4 space-y-2">{legions.slice(0,8).map(legion=><div key={legion.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3"><p className="text-xs font-black">{legion.name}</p><p className="mt-1 text-[9px] text-violet-300">{legion.function_title}</p></div>)}</div>
          </section>
          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Public entrances</p>
            <div className="mt-3 grid gap-2">
              {marketUrl&&<Link href={marketUrl} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-xs font-black"><span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-emerald-300"/>Client Market</span><ArrowRight className="h-4 w-4"/></Link>}
              {streamUrl&&<Link href={streamUrl} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-xs font-black"><span className="inline-flex items-center gap-2"><Radio className="h-4 w-4 text-rose-300"/>Streaming Gate</span><ArrowRight className="h-4 w-4"/></Link>}
            </div>
          </section>
        </aside>
      </div>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Operating systems</p><h2 className="mt-2 text-2xl font-black">What this enterprise has actually built</h2></div><Workflow className="h-5 w-5 text-sky-300"/></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{systems.map(system=><article key={system.id} className="rounded-[1.6rem] border border-white/10 bg-white/[0.025] p-5"><p className="text-[8px] font-black uppercase tracking-wider text-sky-300">{String(system.system_type).replaceAll('_',' ')}</p><h3 className="mt-2 text-lg font-black">{system.title}</h3><p className="mt-3 text-[9px] uppercase tracking-wider text-slate-600">Activated {new Date(system.activated_at).toLocaleDateString()}</p></article>)}</div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-cyan-300/12 bg-cyan-400/[0.025] p-6">
        <div className="flex items-center gap-2"><Network className="h-4 w-4 text-cyan-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">Business Routes</p></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{growth.routes.length===0?<p className="text-xs text-slate-500">No Business Route movement has been established yet.</p>:growth.routes.map((route:any)=><div key={route.id} className="rounded-xl border border-white/8 bg-black/20 p-4"><p className="text-xs font-black">{route.name}</p><p className="mt-1 text-[9px] text-slate-500">{route.source_title} → {route.target_title}</p><p className="mt-2 text-[9px] uppercase tracking-wider text-cyan-300">{route.movement_count} recorded movements</p></div>)}</div>
      </section>

      <footer className="mt-12 border-t border-white/10 pt-6 text-center text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Approved Client enterprise · public Enterprise Door</footer>
    </section>
  </main>
}

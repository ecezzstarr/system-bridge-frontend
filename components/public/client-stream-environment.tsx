
import Link from 'next/link'
import { CalendarClock, Radio, Sparkles, Store, TowerControl, Users } from 'lucide-react'

function SourcePlayer({url,title}:{url?:string|null;title:string}){
  if(!url)return <div className="flex aspect-video items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-black/30 text-sm text-slate-500">The Client has not attached a public broadcast source.</div>
  const lower=url.toLowerCase()
  if(lower.includes('youtube.com/embed/')||lower.includes('youtube-nocookie.com/embed/')||lower.includes('player.vimeo.com/')){
    return <iframe src={url} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full rounded-[2rem] border border-white/10 bg-black"/>
  }
  if(/\.(mp4|webm)(\?|$)/i.test(url)){
    return <video src={url} controls playsInline className="aspect-video w-full rounded-[2rem] border border-white/10 bg-black object-contain"/>
  }
  return <div className="flex aspect-video flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_40%,rgba(244,63,94,.13),transparent_38%),#030611] p-8 text-center">
    <Radio className="h-10 w-10 text-rose-300"/>
    <p className="mt-4 text-lg font-black text-white">{title}</p>
    <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">This broadcast source opens in its authorized external player.</p>
    <a href={url} target="_blank" rel="noreferrer" className="mt-5 rounded-full bg-white px-5 py-2.5 text-xs font-black text-slate-950">Open live source</a>
  </div>
}

export function ClientStreamEnvironment({
  channel,programs,mediaNetworkOpen,audienceCapacity,marketUrl,enterpriseUrl,
}:{
  channel:any
  programs:any[]
  mediaNetworkOpen:boolean
  audienceCapacity:number
  marketUrl?:string|null
  enterpriseUrl?:string|null
}){
  const live=Boolean(channel.is_live&&channel.live_source_url)
  const upcoming=programs.filter(item=>item.status==='scheduled').slice(0,8)
  const replays=programs.filter(item=>item.status==='replay').slice(0,12)
  const activeProgramCount=programs.filter(item=>['scheduled','live'].includes(item.status)).length

  return <main className="min-h-screen bg-[#02040a] text-white">
    <header className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(244,63,94,.2),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(139,92,246,.17),transparent_30%),linear-gradient(180deg,#100510,#030611)] px-5 py-7 md:px-8 md:py-10">
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]"/>
      <div className="relative mx-auto max-w-7xl">
        <nav className="flex flex-wrap items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/55">
          <Link href="/stream" className="inline-flex items-center gap-2 hover:text-white"><TowerControl className="h-4 w-4"/>WEAVE Stream Network</Link>
          <span>{mediaNetworkOpen?'Media Network':'Streaming Open Gate'}</span>
        </nav>
        <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_.75fr] lg:items-end">
          <div>
            <div className="flex items-center gap-2"><span className={'h-2.5 w-2.5 rounded-full '+(live?'bg-rose-400 shadow-[0_0_24px_rgba(251,113,133,.9)]':'bg-slate-600')}/><p className="text-[9px] font-black uppercase tracking-[0.23em] text-rose-300">{live?'Live now':'Public channel open'}</p></div>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-6xl">{channel.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{channel.tagline||'A Client-built broadcast environment in the WEAVE Stream Network.'}</p>
            {channel.description&&<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{channel.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.05] p-4"><p className="text-[8px] font-black uppercase tracking-wider text-rose-300">Active programs</p><p className="mt-2 text-2xl font-black">{activeProgramCount}</p></div>
            <div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.05] p-4"><p className="text-[8px] font-black uppercase tracking-wider text-violet-300">Audience capacity</p><p className="mt-2 text-2xl font-black">{audienceCapacity.toLocaleString()}</p></div>
          </div>
        </div>
      </div>
    </header>

    <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-300">Broadcast chamber</p>
          <h2 className="mt-2 text-2xl font-black">{live?(channel.live_title||'Live broadcast'):'The gate is open.'}</h2>
          <div className="mt-5"><SourcePlayer url={live?channel.live_source_url:null} title={channel.live_title||channel.name}/></div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-violet-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">Program board</p></div>
            <div className="mt-4 space-y-2">
              {upcoming.length===0&&<p className="text-xs leading-5 text-slate-500">No scheduled public programs yet.</p>}
              {upcoming.map(program=><div key={program.id} className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-xs font-black text-white">{program.title}</p><p className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">{String(program.program_type).replaceAll('_',' ')}{program.scheduled_at?' · '+new Date(program.scheduled_at).toLocaleString():''}</p></div>)}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Connected Client worlds</p>
            <div className="mt-3 grid gap-2">
              {marketUrl&&<Link href={marketUrl} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs font-black"><span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-emerald-300"/>Visit Store</span><span>→</span></Link>}
              {enterpriseUrl&&<Link href={enterpriseUrl} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs font-black"><span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-amber-300"/>Enterprise Door</span><span>→</span></Link>}
            </div>
          </div>
        </aside>
      </div>

      {replays.length>0&&<section className="mt-12">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Replay district</p><h2 className="mt-2 text-2xl font-black">Past programs</h2></div><Sparkles className="h-5 w-5 text-sky-300"/></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{replays.map(program=><article key={program.id} className="rounded-[1.6rem] border border-white/10 bg-white/[0.025] p-5"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">{String(program.program_type).replaceAll('_',' ')}</p><h3 className="mt-2 text-lg font-black">{program.title}</h3>{program.description&&<p className="mt-2 text-xs leading-5 text-slate-500">{program.description}</p>}{program.media_url&&<a href={program.media_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-white/10 px-3 py-2 text-[9px] font-black uppercase text-slate-300">Open replay</a>}</article>)}</div>
      </section>}

      <footer className="mt-12 border-t border-white/10 pt-6 text-center text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Client-built Streaming Open Gate · public access does not require a WEAVE account</footer>
    </section>
  </main>
}

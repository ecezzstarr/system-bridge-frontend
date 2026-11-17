'use client'
import Link from 'next/link'
import {ArrowRight, BarChart3, BookOpen, CalendarCheck2, CheckCircle2, ClipboardCheck, ClipboardList, Headphones, LayoutDashboard, Megaphone, PackageCheck, RefreshCw, ShieldCheck, Sun, Users, Wallet, AlertCircle, GraduationCap, Network, Sparkles, Clock3} from 'lucide-react'

export type RegionalPanel='overview'|'guide'|'team'|'tasks'|'support'|'attention'|'reports'|'gate'
type Member={user_id:string;name:string;role:string;position:string;level:'direct'|'assistant';lead_user_id:string|null}
type Task={status:string;assigned_user_id:string}
type RegionalSummary={todayCheckins:number;tasksOpen:number;tasksCompleted:number;awaitingTaskReviews:number;needsHelp:number;outstandingSystemSwitchSupport:number|null;outstandingNgnSupport:number|null}
type RegionalMetrics={prospectPurchases:{available:boolean;packages?:number};confirmedFileFolders:{available:boolean;folders?:number};fulfilledFood:{available:boolean;orders?:number}}
type Props={
 team:Member[];tasks:Task[];summary:RegionalSummary|null;todayCheckins:number;missingCheckins:number;
 supportCases:number|null;supportAvailable:boolean;metrics:RegionalMetrics|null;
 selected:RegionalPanel;onSelect:(value:RegionalPanel)=>void;onRefresh:()=>void
}
const shell='rounded-2xl border border-[#d6dfed] bg-white/95 shadow-[0_6px_24px_rgba(21,52,94,.09)]'
const item='flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-[#eaf3ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500'
const action='inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#b5c8e2] bg-gradient-to-b from-white to-[#eaf3fc] px-4 py-2 text-xs font-bold text-[#122957] shadow-sm hover:border-[#6f9bcf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'
const number=(value:number)=>Number(value||0).toLocaleString('en-NG')

export function RegionalManagerCommandCenter({team,tasks,summary,todayCheckins,missingCheckins,supportCases,supportAvailable,metrics,selected,onSelect,onRefresh}:Props){
 const direct=team.filter(m=>m.level==='direct')
 const bridgers=team.filter(m=>m.role==='bridger')
 const agents=team.filter(m=>m.role==='agent')
 const reviewCount=summary?.awaitingTaskReviews??0
 const openTasks=summary?.tasksOpen??0
 const pendingHelp=summary?.needsHelp??0
 const reports=[
  {name:'My Team',value:number(team.length),detail:'Verified assigned staff',icon:Users,tint:'text-blue-700',panel:'team' as RegionalPanel},
  {name:'Check-ins Today',value:number(todayCheckins)+' / '+number(team.length),detail:team.length?number(Math.round(todayCheckins/team.length*100))+'% recorded':'No assigned staff',icon:CalendarCheck2,tint:'text-emerald-700',panel:'attention' as RegionalPanel},
  {name:'Tasks Awaiting Review',value:number(reviewCount),detail:'Work submitted for decision',icon:ClipboardCheck,tint:'text-amber-700',panel:'tasks' as RegionalPanel},
  {name:'Support Cases',value:supportAvailable?number(supportCases??0):'Unavailable',detail:'Private follow-up required',icon:Headphones,tint:'text-indigo-700',panel:'support' as RegionalPanel},
 ]
 const steps=[
  {name:'Check My Team',detail:'See who is working, missing a check-in or needs guidance.',button:'View Team',icon:Users,panel:'team' as RegionalPanel},
  {name:'Review Outreach',detail:'Inspect Bridger contact activity, social posts and evidence.',button:'Open Hope',icon:Megaphone,href:'/weave/lifestyles/regional-manager/hope-outreach'},
  {name:'Assign and Review Tasks',detail:'Give direct reports clear work and review submitted evidence.',button:'Open Tasks',icon:ClipboardCheck,panel:'tasks' as RegionalPanel},
  {name:'Resolve Obstacles',detail:'Speak to staff and follow authorized support cases.',button:'Open Support',icon:Headphones,panel:'support' as RegionalPanel},
  {name:'Report and Plan',detail:'Review verified results and direct the next working day.',button:'View Reports',icon:BarChart3,panel:'reports' as RegionalPanel},
 ]
 const go=(p:RegionalPanel)=>{onSelect(p)}
 const menu=[
  {name:'Dashboard',icon:LayoutDashboard,panel:'overview' as RegionalPanel},
  {name:'My Team',icon:Users,panel:'team' as RegionalPanel},
  {name:'Daily Work',icon:ClipboardList,panel:'tasks' as RegionalPanel},
  {name:'Hope Outreach',icon:Megaphone,href:'/weave/lifestyles/regional-manager/hope-outreach'},
  {name:'Support',icon:Headphones,panel:'support' as RegionalPanel},
  {name:'Reports',icon:BarChart3,panel:'reports' as RegionalPanel},
  {name:'Training',icon:GraduationCap,panel:'guide' as RegionalPanel},
  {name:'Resources',icon:BookOpen,href:'/weave/lifestyles/work'},
 ]
 return <section data-regional-manager-command-center="first-day-ready" className="overflow-hidden rounded-[26px] border border-[#bed2ea] bg-[#f5f9ff] text-[#102956] shadow-[0_24px_80px_rgba(0,36,86,.16)]">
  <div className="grid lg:grid-cols-[210px_minmax(0,1fr)]">
   <aside className="border-b border-[#d1ddef] bg-gradient-to-b from-white to-[#e8f2ff] p-3 lg:border-b-0 lg:border-r lg:p-4">
    <Link href="/weave/lifestyles/work" className="mb-4 hidden text-center lg:block">
     <span className="block text-3xl font-bold tracking-[.15em] text-[#123b7e]">WEAVE</span>
     <span className="block text-xs tracking-[.28em] text-[#1d427f]">OF PRESENCE</span>
     <span className="mt-2 block text-[10px] text-[#657a9c]">System Switch · Bridge of Radiance</span>
    </Link>
    <nav aria-label="Regional Manager tools" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
     {menu.map(x=>{
      const Icon=x.icon
      const active=selected===x.panel&&!x.href
      return x.href?<Link key={x.name} href={x.href} className={item+' whitespace-nowrap text-[#18365d]'}><Icon size={19}/><span>{x.name}</span></Link>:
      <button key={x.name} type="button" onClick={()=>go(x.panel!)} aria-current={active?'page':undefined}
       className={item+' whitespace-nowrap '+(active?'bg-[#073d7c] text-white shadow-md hover:bg-[#073d7c]':'text-[#18365d]')}>
       <Icon size={19}/><span>{x.name}</span>
      </button>
     })}
    </nav>
    <Link href="/event" className="mt-6 hidden rounded-2xl border border-amber-300/50 bg-gradient-to-br from-[#042d67] via-[#07448b] to-[#197dba] p-4 text-center text-white shadow-lg lg:block">
     <span className="block text-2xl text-amber-200">✦</span><span className="block font-bold">Flame Event</span>
     <span className="block text-sm">Loop 1 · Burning River</span>
    </Link>
   </aside>
   <div className="min-w-0">
    <div className="relative overflow-hidden bg-gradient-to-r from-[#062d63] via-[#0b4f8e] to-[#338ac0] p-5 text-white sm:px-7 sm:py-6">
     <div aria-hidden="true" className="pointer-events-none absolute -right-7 top-0 h-40 w-64 rounded-full bg-sky-200/20 blur-3xl"/>
     <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[60%] bg-right bg-no-repeat opacity-30" style={{backgroundImage:"url('/weave/loader-company-world.svg')",backgroundSize:'auto 160%'}}/>
     <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-[9%] h-12 w-56 rounded-t-[75%] border-x-4 border-t-4 border-amber-200/35 bg-white/10"/>
     <div className="relative flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[11px] font-bold uppercase tracking-[.22em] text-amber-200">WEAVE · A Time · Company of Time</p>
       <h1 className="mt-1 font-serif text-2xl font-bold leading-tight sm:text-4xl">Regional Manager Workspace</h1>
       <p className="mt-2 text-sm text-sky-50">Lead people · Ensure participation · Remove obstacles · Grow livelihoods</p></div>
      <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-2 text-xs font-semibold"><ShieldCheck size={16}/> Verified records · 20s refresh</div>
     </div>
    </div>
    <div className="space-y-5 p-3 sm:p-5">
     <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-lg font-bold">Welcome, Regional Manager</p><p className="text-xs text-[#536b8a]">Your region · Your assigned team · Your daily command</p></div>
      <button type="button" onClick={onRefresh} className={action}><RefreshCw size={15}/> Refresh records</button>
     </div>
     <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {reports.map(r=>{const Icon=r.icon;return <button key={r.name} onClick={()=>go(r.panel)} className={shell+' min-w-0 p-3 text-left transition hover:border-[#77a6dc] sm:p-4'}>
       <div className="flex items-center gap-2"><Icon size={22} className={r.tint}/><span className="text-xs font-bold sm:text-sm">{r.name}</span></div>
       <div className="mt-2 text-xl font-extrabold tabular-nums sm:text-2xl">{r.value}</div><p className="mt-1 text-[11px] leading-4 text-[#536b8a]">{r.detail}</p>
      </button>})}
     </div>
     <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,1fr)]">
      <div className="space-y-4">
       <section className={shell+' p-3 sm:p-4'}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-extrabold"><ClipboardCheck size={21} className="text-[#ad760a]"/> Today's Work</h2><span className="rounded-full bg-[#fff0cb] px-3 py-1 text-[11px] font-bold text-[#8a5400]">Follow these 5 steps each day</span></div>
        <div className="space-y-2">{steps.map((s,i)=>{const Icon=s.icon;return <div key={s.name} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#dbe4f2] bg-[#fafdff] p-2.5 sm:flex-nowrap">
         <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-400 bg-amber-100 text-xs font-extrabold text-[#8a5300]">{i+1}</span>
         <Icon size={19} className="shrink-0 text-[#17417f]"/><div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold">{s.name}</h3><p className="text-[11px] leading-4 text-[#506786]">{s.detail}</p></div>
         {s.href?<Link href={s.href} className={action+' ml-auto'}>{s.button}<ArrowRight size={14}/></Link>:
          <button type="button" onClick={()=>go(s.panel!)} className={action+' ml-auto'}>{s.button}<ArrowRight size={14}/></button>}
        </div>})}</div>
       </section>
       <section className={shell+' border-amber-200 bg-gradient-to-br from-[#fffef9] to-[#fff2d6] p-3 sm:p-4'}>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><Sparkles size={20} className="text-[#b0780b]"/> First Day Setup <span className="text-xs font-medium text-[#6b7082]">(3 simple steps)</span></h2>
        <div className="grid gap-2 sm:grid-cols-3">
         {[{name:'1 · See My Region',detail:'Review your authorized team and leadership chain.',panel:'team' as RegionalPanel},
           {name:'2 · Learn My Work',detail:'Read the daily instructions before directing staff.',panel:'guide' as RegionalPanel},
           {name:'3 · Set Daily Work',detail:'Assign clear tasks and Hope outreach targets.',panel:'tasks' as RegionalPanel}].map(x=>
           <button key={x.name} type="button" onClick={()=>go(x.panel)} className="rounded-xl border border-[#bcd1e6] bg-white/90 p-3 text-left hover:border-[#d6a343]">
            <h3 className="text-sm font-bold">{x.name}</h3><p className="mt-1 text-xs leading-5 text-[#536b8a]">{x.detail}</p><span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#125a9a]">Open <ArrowRight size={13}/></span>
           </button>)}
        </div>
       </section>
      </div>
      <div className="space-y-4">
       <section className={shell+' p-3 sm:p-4'}>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><Network size={20}/> Regional Tools</h2>
        <Link href="/weave/lifestyles/regional-manager/hope-outreach" className="mb-2 flex items-center gap-3 rounded-xl border border-[#c5d4ec] bg-[#f2edff] p-3 hover:border-blue-400"><Megaphone size={27} className="text-[#6540a9]"/><span className="flex-1"><strong className="block text-sm">Hope · Bridger Outreach</strong><span className="text-xs text-[#51688a]">Prospects · posts · File Folder sales</span></span><ArrowRight size={16}/></Link>
        <button type="button" onClick={()=>go('team')} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-[#c5d4ec] bg-[#eaf5ff] p-3 text-left hover:border-blue-400"><PackageCheck size={27} className="text-[#2365ab]"/><span className="flex-1"><strong className="block text-sm">Stability · Agent Operations</strong><span className="text-xs text-[#51688a]">Food orders · distribution · staff</span></span><ArrowRight size={16}/></button>
        <Link href="/weave/lifestyles/sunshine" className="flex items-start gap-3 rounded-xl border border-[#f0ca75] bg-gradient-to-br from-[#fff9e7] to-[#ffe6a5] p-3 hover:border-[#ce9a2f]"><Sun size={28} className="shrink-0 text-[#bf8617]"/><span className="flex-1"><strong className="block text-sm">Sunshine: Mechanized Wealth</strong><span className="block text-[11px] font-bold text-[#9a701b]">Weave livelihood mechanism — not a department</span><span className="mt-1 block text-xs leading-5 text-[#6c5f45]">Support participation and remove obstacles. Personal savings remain in the participant's own bank.</span></span><ArrowRight size={16}/></Link>
        <button type="button" onClick={()=>go('support')} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-[#c5d4ec] bg-white p-3 text-left hover:border-blue-400"><Wallet size={24} className="text-[#92620c]"/><span className="flex-1"><strong className="block text-sm">Authorized Work Support</strong><span className="text-xs text-[#536b8a]">Support cases · approvals · recovery</span></span><ArrowRight size={16}/></button>
        <button type="button" onClick={()=>go('gate')} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-[#c5d4ec] bg-white p-3 text-left hover:border-blue-400"><Network size={24} className="text-[#2365ab]"/><span className="flex-1"><strong className="block text-sm">Regional System Switch Gate</strong><span className="text-xs text-[#536b8a]">Read signals · publish authorized directions</span></span><ArrowRight size={16}/></button>
       </section>
       <section className={shell+' p-3 sm:p-4'}>
        <h2 className="mb-3 text-sm font-extrabold">Verified Company Movement Today</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
         {[{label:'Prospect packages',value:metrics?.prospectPurchases.available?number(metrics.prospectPurchases.packages??0):'—'},
           {label:'File Folders',value:metrics?.confirmedFileFolders.available?number(metrics.confirmedFileFolders.folders??0):'—'},
           {label:'Fulfilled orders',value:metrics?.fulfilledFood.available?number(metrics.fulfilledFood.orders??0):'—'}].map(x=><div key={x.label} className="rounded-xl bg-[#eff5fd] p-2"><p className="text-lg font-black">{x.value}</p><p className="text-[10px] leading-4 text-[#526b90]">{x.label}</p></div>)}
        </div><p className="mt-2 text-[11px] leading-4 text-[#65718a]">A dash means source unavailable; it does not mean zero. Counts are not profit.</p>
       </section>
      </div>
     </div>
     <section className={shell+' p-3 sm:p-4'}>
      <h2 className="mb-3 text-lg font-extrabold">Live Regional Workspace</h2>
      <div className="grid gap-3 lg:grid-cols-3">
       <button type="button" onClick={()=>go('team')} className="rounded-xl border border-[#c8d8ec] bg-[#f7fbff] p-3 text-left hover:border-[#659dd6]">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Users size={18}/> Team and Authority</h3>
        <p className="text-xs text-[#506786]">Regional Manager → direct staff → assistants through their leads</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold"><span>{bridgers.length} Bridgers</span><span>{agents.length} Agents</span><span>{direct.length} direct</span></div>
       </button>
       <button type="button" onClick={()=>go('attention')} className="rounded-xl border border-[#c8d8ec] bg-[#f7fbff] p-3 text-left hover:border-[#659dd6]">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><AlertCircle size={18} className="text-amber-600"/> Daily Attention</h3>
        <p className="text-xs leading-6 text-[#506786]">Missing check-ins: <b>{number(missingCheckins)}</b> · Help requested: <b>{number(pendingHelp)}</b></p>
        <p className="text-xs text-[#506786]">Submitted tasks: <b>{number(reviewCount)}</b></p>
       </button>
       <button type="button" onClick={()=>go('tasks')} className="rounded-xl border border-[#c8d8ec] bg-[#f7fbff] p-3 text-left hover:border-[#659dd6]">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><ClipboardList size={18}/> Assignments and Evidence</h3>
        <p className="text-xs leading-6 text-[#506786]">Open: <b>{number(openTasks)}</b> · Completed: <b>{number(summary?.tasksCompleted??0)}</b></p>
        <p className="text-xs text-[#506786]">Select to assign work or review a submission.</p>
       </button>
      </div>
     </section>
     <p className="flex items-start gap-2 rounded-xl bg-[#fdf5e5] p-3 text-[11px] leading-5 text-[#715929]"><ShieldCheck size={16} className="shrink-0"/> Regional Managers direct verified work and request authorized support. Administrations retains appointment, payment verification and payroll authority. Sunshine is a livelihood mechanism, not a department.</p>
    </div>
   </div>
  </div>
 </section>
}

'use client'

import { useEffect,useState } from 'react'
import { quoteFileFolderBlueprint, type BlueprintCostFields } from '@/lib/file-folder-build-quote'
import { Boxes,CheckCircle2,Clock3,ArrowRight,Plus,ShieldAlert } from 'lucide-react'
import { FILE_FOLDER_PLATFORM_TEMPLATES,type FileFolderPlatformKind } from '@/lib/file-folder-platform-projects'

type PlatformProject={
  id:string;kind:FileFolderPlatformKind;title:string;purpose?:string|null;
  completed:number;total:number;technicalLaunchVerified:boolean;
  stages:Array<{blueprintKey:string;label:string;status:'not_started'|'building'|'operating';buildId:string|null;systemId:string|null}>
}
type Props={
  projects:PlatformProject[];
  blueprints:Array<{blueprint_key:string;name:string}&BlueprintCostFields>;
  busy:boolean;
  onCreate:(kind:FileFolderPlatformKind,title:string,purpose:string)=>Promise<void>;
  onChooseBlueprint:(key:string)=>void;
}

export default function FileFolderPlatformProjectStudio({projects,blueprints,busy,onCreate,onChooseBlueprint}:Props){
  const [kind,setKind]=useState<FileFolderPlatformKind>('short_video')
  const [title,setTitle]=useState('')
  const [purpose,setPurpose]=useState('')
  const [selection,setSelection]=useState('')
  const [error,setError]=useState('')
  const [creating,setCreating]=useState(false)
  const template=FILE_FOLDER_PLATFORM_TEMPLATES[kind]
  const selected=projects.find(p=>p.id===selection)||projects[0]||null
  const selectedTemplate=selected?FILE_FOLDER_PLATFORM_TEMPLATES[selected.kind]:null
  useEffect(()=>{
    if(projects.length===0)setSelection('')
    else if(!projects.some(p=>p.id===selection))setSelection(projects[0].id)
  },[projects,selection])
  const create=async()=>{
    if(title.trim().length<3){setError('Give the new platform its own name (at least 3 characters).');return}
    setError('')
    setCreating(true)
    try {
      await onCreate(kind,title.trim(),purpose.trim())
    }finally{setCreating(false)}
  }
  return <section className="mb-5 rounded-2xl border border-cyan-300/20 bg-[linear-gradient(145deg,rgba(15,39,58,.75),rgba(8,14,26,.86))] p-4 sm:p-5" data-file-folder-platform-projects="client-owned">
    <style>{`.ff-platform-direction{display:none}@media(max-width:767px),(max-height:500px) and (max-width:1000px){.ff-platform-direction{display:block}.ff-platform-directions{display:none}}`}</style>
    <div className="flex items-start gap-3">
      <Boxes className="mt-1 h-5 w-5 shrink-0 text-cyan-200"/>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Your own technology platform</p>
        <h4 className="mt-1 text-lg font-black text-white">Start with your idea. Build it inside your File Folder.</h4>
        <p className="mt-2 text-xs leading-6 text-slate-300">
          Want your own short-video, public conversation, social community, creator channel or marketplace platform? Name it here.
          WEAVE organizes the real blueprints and construction sequence; you own the project.
        </p>
      </div>
    </div>
    <label className="ff-platform-direction mt-4 block text-sm text-cyan-100">Choose your project direction
      <select value={kind} onChange={event=>setKind(event.target.value as FileFolderPlatformKind)} className="mt-2 block w-full rounded-xl border border-cyan-100/20 bg-[#102333] p-3 text-base text-white">
        {Object.entries(FILE_FOLDER_PLATFORM_TEMPLATES).map(([key,item])=><option key={key} value={key}>{item.name}</option>)}
      </select>
    </label>
    <div className="ff-platform-directions mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {(Object.entries(FILE_FOLDER_PLATFORM_TEMPLATES) as Array<[FileFolderPlatformKind,(typeof FILE_FOLDER_PLATFORM_TEMPLATES)[FileFolderPlatformKind]]>).map(([key,item])=>
        <button key={key} type="button" aria-pressed={kind===key} onClick={()=>setKind(key)}
          className={`min-h-[75px] rounded-xl border p-3 text-left ${kind===key?'border-cyan-200/70 bg-cyan-200/10':'border-white/10 bg-black/20'}`}>
          <span className="block text-[11px] font-black text-white">{item.name}</span>
          <span className="mt-1 block text-[9px] leading-4 text-slate-400">{item.example}</span>
        </button>)}
    </div>
    <p className="mt-3 text-[11px] leading-5 text-slate-300">{template.description}</p>
    <div className="mt-3 grid gap-2">
      <label className="text-[10px] font-bold text-slate-200">Your platform name
        <input value={title} maxLength={220} onChange={event=>setTitle(event.target.value)}
          className="mt-1 block w-full rounded-xl border border-cyan-100/15 bg-black/35 p-3 text-sm text-white outline-none" placeholder="Name your platform, not the example company"/>
      </label>
      <label className="text-[10px] font-bold text-slate-200">What will your platform enable?
        <textarea value={purpose} maxLength={2000} onChange={event=>setPurpose(event.target.value)}
          rows={2} className="mt-1 block w-full resize-none rounded-xl border border-cyan-100/15 bg-black/35 p-3 text-sm text-white outline-none"
          placeholder="Describe the experience your members, creators or customers should have."/>
      </label>
    </div>
    {error&&<p role="alert" className="mt-2 text-xs text-amber-200">{error}</p>}
    <button type="button" disabled={busy||creating} onClick={create}
      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40">
      <Plus className="h-4 w-4"/>{creating||busy?'Creating project…':'Establish my platform project'}
    </button>
    <p className="mt-2 text-[10px] leading-5 text-slate-400">Creating a project plan does not charge Flame Coin. Materials and construction remain purchased separately, with recorded receipts.</p>

    {projects.length>0&&<div className="mt-6 border-t border-white/10 pt-5">
      <label className="block text-[10px] font-black uppercase tracking-[.14em] text-cyan-200">Platform projects · {projects.length}
        <select value={selected?.id||''} onChange={event=>setSelection(event.target.value)}
          className="mt-2 block w-full rounded-xl border border-cyan-100/20 bg-[#102333] p-3 text-sm font-semibold text-white">
          {projects.map(project=><option key={project.id} value={project.id}>{project.title} · {FILE_FOLDER_PLATFORM_TEMPLATES[project.kind]?.name}</option>)}
        </select>
      </label>
      {selected&&selectedTemplate&&<>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div><h5 className="font-black text-white">{selected.title}</h5>
            <p className="mt-1 text-xs leading-5 text-slate-400">{selected.purpose||selectedTemplate.description}</p>
          </div>
          <span className="shrink-0 text-sm font-black text-cyan-200">{selected.completed}/{selected.total} built</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan-300" style={{width:(selected.total?selected.completed/selected.total*100:0)+'%'}}/></div>
        <div className="mt-3 space-y-2">
          {selected.stages.map((stage,index)=>{
            const blueprint=blueprints.find(b=>b.blueprint_key===stage.blueprintKey)
            const published=Boolean(blueprint)
            const quote=blueprint?quoteFileFolderBlueprint(blueprint):null
            return <div key={stage.blueprintKey} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="w-5 shrink-0">
                {stage.status==='operating'?<CheckCircle2 className="h-4 w-4 text-emerald-300"/>:stage.status==='building'?<Clock3 className="h-4 w-4 text-amber-300"/>:<span className="text-[10px] text-slate-500">{index+1}</span>}
              </div>
              <div className="min-w-0 flex-1"><p className="text-xs font-bold text-white">{stage.label}</p><p className="mt-1 text-[9px] uppercase tracking-wide text-slate-400">{stage.status==='operating'?'Built system operating':stage.status==='building'?'Construction in progress':'Not yet constructed'}</p>
                {stage.status==='not_started'&&quote&&<p className="mt-2 text-[10px] leading-5 text-amber-100">
                  Acquire kit: {quote.priceAvailable?quote.requiredMaterialCost.toLocaleString()+' Flame Coin total':'Price unavailable'}
                  {' · '}Start-build fee: 0 FC
                  {quote.materialRequired>0&&' · '+quote.materialRequired+' × '+quote.materialName}
                </p>}
                {stage.status==='not_started'&&!published&&<p className="mt-2 text-[10px] text-amber-300">Blueprint not yet published</p>}
              </div>
              {stage.status==='not_started'&&published&&<button onClick={()=>onChooseBlueprint(stage.blueprintKey)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-cyan-200/35 px-2.5 py-2 text-[10px] font-black text-cyan-100">
                Blueprint <ArrowRight className="h-3 w-3"/>
              </button>}
            </div>
          })}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-200"/>
          <p className="text-[10px] leading-5 text-slate-300">
            <strong className="text-amber-100">Construction is not automatic platform launch.</strong> {selectedTemplate.productionGap}
            WEAVE does not claim that these blueprint milestones alone create a finished public social network.
          </p>
        </div>
      </>}
    </div>}
  </section>
}

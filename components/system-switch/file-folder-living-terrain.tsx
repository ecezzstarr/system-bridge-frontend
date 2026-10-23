'use client'
import {useMemo,useState} from 'react'
import {buildFormationProgress} from '@/lib/file-folder-world-runtime'
type District={key:string;label:string}
const LOCATIONS:Record<string,{x:number;y:number;description:string;type:string}>={
 workshop_core:{x:50,y:28,description:'Understand your world, resources and next movement.',type:'citadel'},
 blueprint_foundry:{x:21,y:39,description:'Choose a blueprint and begin a new system.',type:'dome'},
 build_market:{x:79,y:40,description:'Acquire kits and construction materials.',type:'market'},
 parts_workshop:{x:68,y:58,description:'Choose compatible parts for your structures.',type:'lab'},
 formation_yard:{x:35,y:62,description:'Watch your construction and install parts.',type:'yard'},
 boost_bay:{x:18,y:75,description:'Apply acceleration to active construction.',type:'tower'},
 active_systems:{x:83,y:75,description:'Enter completed and operating systems.',type:'city'},
 library_district:{x:51,y:82,description:'Explore what systems can become together.',type:'sphere'}
}
export default function FileFolderLivingTerrain({districts,onEnter,active,systems=0,building=0,builds=[],now=Date.now()}:{districts:District[];onEnter:(key:string)=>void;active:string;systems?:number;building?:number;builds?:Array<{id:string;title:string;status:string;started_at?:string;completes_at?:string}>;now?:number}){
 const [selected,setSelected]=useState<string|null>(null)
 const places=useMemo(()=>districts.map((district,i)=>({district,...(LOCATIONS[district.key]||{x:18+(i%3)*31,y:35+Math.floor(i/3)*20,description:'Enter this construction workspace.',type:'dome'})})),[districts])
 const forming=builds.filter(b=>b.status==='building').slice(0,4).map(b=>({ ...b,progress:buildFormationProgress(b,now),remaining:Math.max(0,Math.ceil((new Date(b.completes_at||now).getTime()-now)/1000)) }))
 const focused=places.find(p=>p.district.key===selected)||places.find(p=>p.district.key===active)||places[0]
 return <section aria-label="Explore your File Folder world" className="relative isolate overflow-hidden rounded-2xl border border-cyan-200/25 bg-[#061728] text-white">
 <header className="relative z-20 border-b border-cyan-100/10 bg-[#071523]/90 px-4 py-4">
  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-200">WEAVE · File Folder World</p>
  <h3 className="mt-1 text-xl font-black">Your systems are places you can enter</h3>
  <p className="mt-1 text-xs leading-5 text-slate-300">Touch a building to enter that live workspace directly. Your construction records and progress remain connected across every district. Your real construction records remain connected to the existing workshops.</p>
  <p className="mt-2 text-[10px] text-cyan-200">{building} building · {systems} completed · construction follows real-world time, even while you are away</p>
 </header>
 <div className="relative overflow-hidden" style={{minHeight:540,background:'radial-gradient(ellipse at 50% 22%,rgba(255,196,125,.9),transparent 22%),linear-gradient(180deg,#0b1d3d 0%,#355177 25%,#dd9971 43%,#28728a 54%,#06384e 100%)'}}>
  <div aria-hidden="true" className="absolute inset-x-0 top-[43%] h-[57%]" style={{background:'repeating-radial-gradient(ellipse at 50% 50%,rgba(13,98,125,.3) 0px,rgba(46,176,204,.3) 3px,rgba(8,46,73,.8) 8px,rgba(7,46,70,.9) 24px)'}}/>
  <div aria-hidden="true" className="absolute left-1/2 top-[47%] h-[44%] w-[90%] -translate-x-1/2 rounded-[50%] border-[10px] border-[#a9f3e5]/25 bg-[#165a63]/45 shadow-[0_0_75px_rgba(63,210,228,.25)]"/>
  <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-60" viewBox="0 0 100 100" preserveAspectRatio="none">
   <path d="M50 28 Q40 36 21 39 M50 28 Q67 30 79 40 M21 39 Q29 50 35 62 M79 40 Q72 50 68 58 M35 62 Q42 74 51 82 M68 58 Q65 75 51 82 M35 62 L18 75 M68 58 L83 75" fill="none" stroke="#d4cba4" strokeWidth="1.4" strokeDasharray="2 1"/>
  </svg>
  {places.map(({district,x,y,type})=><button key={district.key} type="button" aria-label={`Inspect ${district.label}`} aria-pressed={focused?.district.key===district.key} onClick={()=>{setSelected(district.key);onEnter(district.key)}} className="group absolute z-10 flex w-[29%] min-w-[82px] max-w-[155px] -translate-x-1/2 -translate-y-1/2 flex-col items-center focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200" style={{left:`${x}%`,top:`${y}%`}}>
   <span aria-hidden="true" className={`relative flex h-14 w-[90%] items-center justify-center rounded-[50%] border-2 shadow-[0_12px_25px_rgba(0,0,0,.55)] transition-transform duration-200 group-active:scale-95 sm:h-20 ${focused?.district.key===district.key?'border-amber-200 shadow-[0_0_22px_rgba(255,208,122,.65)]':'border-cyan-100/50'}`} style={{background:'radial-gradient(ellipse at 50% 18%,#d6bd82,#588b83 55%,#0a4159 90%)'}}>
    <span className={`absolute bottom-[42%] w-[35%] rounded-t-[50%] border border-amber-100/70 bg-gradient-to-t from-[#28516b] via-[#8ac8d0] to-[#ffe2ad] shadow-[0_0_20px_rgba(255,214,151,.5)] ${type==='citadel'?'h-20 sm:h-28':type==='tower'?'h-14 sm:h-20':'h-10 sm:h-14'}`}/>
    <span className="absolute bottom-[43%] left-[18%] h-6 w-[14%] rounded-t-full bg-[#76b9c6]"/>
    <span className="absolute bottom-[43%] right-[18%] h-7 w-[12%] rounded-t-full bg-[#9fd0d4]"/>
   </span>
   <span className="mt-1 rounded-md border border-cyan-100/20 bg-[#041322]/90 px-1.5 py-1 text-center text-[9px] font-bold leading-3 text-white shadow-lg sm:text-xs">{district.label}</span>
  </button>)}
  <div className="absolute inset-x-3 bottom-3 z-20 rounded-xl border border-amber-200/25 bg-[#061523]/95 p-3 shadow-2xl backdrop-blur">
   <p className="text-[10px] font-black uppercase tracking-wider text-amber-200">{focused?.district.label||'Explore your world'}</p>
   <p className="mt-1 text-xs leading-5 text-slate-200">{focused?.description||'Select a building to enter its activity.'}</p>
   <button type="button" disabled={!focused} onClick={()=>focused&&onEnter(focused.district.key)} className="mt-2 min-h-11 w-full rounded-lg bg-amber-200 px-4 py-2 text-sm font-black text-[#10243b] disabled:opacity-40">Enter {focused?.district.label||'workspace'} →</button>
  </div>
 </div>
 <p className="px-4 py-2 text-[10px] text-slate-400">Illustrative interactive terrain · building locations open existing File Folder workspaces, not separate demo pages.</p>
 </section>
}

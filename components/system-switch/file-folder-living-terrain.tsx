'use client'
import {useMemo} from 'react'
type District={key:string;label:string}
export default function FileFolderLivingTerrain({districts,onEnter,active,systems=0,building=0}:{districts:District[];onEnter:(key:string)=>void;active:string;systems?:number;building?:number}){
 const islands=useMemo(()=>districts.map((d,i)=>({district:d,x:18+(i%3)*31,y:24+Math.floor(i/3)*24})),[districts])
 return <section aria-label="Explore your living File Folder world" className="relative isolate overflow-hidden rounded-2xl border border-cyan-200/20 bg-[#071426] text-white" style={{minHeight:380}}>
 <div className="absolute inset-0" aria-hidden="true" style={{background:'radial-gradient(ellipse at 50% 23%,#e9ad78 0%,#64436b 18%,transparent 50%),linear-gradient(180deg,#102f59 0%,#1c4260 48%,#06212e 52%,#031321 100%)'}}/>
 <div className="absolute inset-x-0 bottom-0 h-[46%] opacity-70" aria-hidden="true" style={{background:'repeating-radial-gradient(ellipse at 50% 0%,transparent 0 13px,rgba(80,209,226,.26) 15px 17px,transparent 20px 33px)'}}/>
 <div className="relative z-10 px-4 pt-5"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-200">Your world · Your construction</p><h3 className="mt-1 text-xl font-black">Walk into what you want to build</h3><p className="mt-2 max-w-sm text-xs leading-5 text-slate-200">Choose a place below. The workshop helps you plan; the foundry supplies blueprints; the yard forms your systems. Completed systems can become working services.</p><p className="mt-2 text-[10px] text-cyan-100">{building} forming · {systems} completed systems</p></div>
 <div className="relative z-10 mx-auto grid max-w-xl grid-cols-3 gap-x-1 gap-y-5 px-2 pb-7 pt-8">
 {islands.map(({district},i)=><button type="button" key={district.key} onClick={()=>onEnter(district.key)} aria-pressed={active===district.key} className="group flex min-h-20 flex-col items-center justify-end gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">
 <span aria-hidden="true" className="relative flex h-14 w-20 items-center justify-center rounded-[50%] border border-cyan-100/40 shadow-[0_7px_20px_rgba(0,210,255,.25)] transition-transform group-active:scale-95" style={{background:'radial-gradient(ellipse at 50% 28%,#d8b37d 0%,#7b9e99 30%,#245a65 65%,#082c42 100%)'}}>
 <span className="absolute bottom-6 h-10 w-6 rounded-t-full border border-amber-100/60 bg-gradient-to-t from-[#284967] via-[#78afc6] to-[#fbd6a3] shadow-[0_0_20px_rgba(255,201,139,.35)]"/>
 <span className="absolute bottom-7 left-4 h-5 w-2 rounded-t-sm bg-[#82c8d1]"/>
 <span className="absolute bottom-7 right-4 h-6 w-2 rounded-t-sm bg-[#82c8d1]"/>
 </span>
 <span className={`rounded-lg px-1 py-1 text-center text-[10px] font-bold leading-3 ${active===district.key?'bg-cyan-200 text-slate-950':'bg-[#061827]/80 text-white'}`}>{district.label}</span>
 </button>)}
 </div>
 <p className="relative z-10 pb-3 text-center text-[9px] text-slate-300">Interactive conceptual terrain · structures represent real construction workspaces</p>
 </section>
}

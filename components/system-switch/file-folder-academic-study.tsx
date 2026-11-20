'use client'

import {useState} from 'react'
import {Calculator,Copy,ShieldAlert} from 'lucide-react'
import {beamStudyNote,calculateSimpleBeamStudy} from '@/lib/file-folder-academic-study'

/** Real, explicitly bounded calculation for one civil-engineering study case. */
export default function FileFolderAcademicStudy({projectTitle}:{projectTitle:string}){
  const [span,setSpan]=useState('12')
  const [uniform,setUniform]=useState('15')
  const [point,setPoint]=useState('0')
  const [copyStatus,setCopyStatus]=useState('')
  const input={spanMetres:Number(span),uniformLoadKnPerMetre:Number(uniform),midspanPointLoadKn:Number(point)}
  let result:ReturnType<typeof calculateSimpleBeamStudy>|null=null
  let error=''
  try{
    if([span,uniform,point].some(value=>value.trim()===''))throw new Error('Fill in all three quantities.')
    result=calculateSimpleBeamStudy(input)
  }catch(reason){error=reason instanceof Error?reason.message:'Invalid study inputs.'}
  const note=result?beamStudyNote(projectTitle,input,result):''
  const num=(value:number)=>value.toLocaleString(undefined,{maximumFractionDigits:3})
  const copy=async()=>{
    if(!note)return
    try{
      await navigator.clipboard.writeText(note)
      setCopyStatus('Copied. Save this note in your Research Room or report.')
    }catch{setCopyStatus('Copy unavailable. Select the text from the worksheet below.')}
  }
  return <section className="mt-4 rounded-xl border border-cyan-200/25 bg-cyan-200/[.04] p-4" data-file-folder-civil-engineering-study="preliminary">
    <div className="flex items-start gap-2">
      <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200"/>
      <div>
        <h6 className="text-sm font-black text-white">Civil engineering · Structural study worksheet</h6>
        <p className="mt-1 text-xs leading-5 text-slate-300">Work through a simple bridge-span load case using an idealized simply supported beam. Quantities are editable; the calculation runs locally, without charging System Switch or recording an unverified engineering result.</p>
      </div>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <label className="text-xs text-slate-200">Span (m)
        <input type="number" inputMode="decimal" min="0.001" max="1000" step="any" value={span} onChange={e=>setSpan(e.target.value)} className="mt-1 block w-full rounded-lg border border-cyan-100/20 bg-slate-950/80 p-3 text-sm text-white"/>
      </label>
      <label className="text-xs text-slate-200">Distributed load (kN/m)
        <input type="number" inputMode="decimal" min="0" max="100000" step="any" value={uniform} onChange={e=>setUniform(e.target.value)} className="mt-1 block w-full rounded-lg border border-cyan-100/20 bg-slate-950/80 p-3 text-sm text-white"/>
      </label>
      <label className="text-xs text-slate-200">Point load at midpoint (kN)
        <input type="number" inputMode="decimal" min="0" max="100000" step="any" value={point} onChange={e=>setPoint(e.target.value)} className="mt-1 block w-full rounded-lg border border-cyan-100/20 bg-slate-950/80 p-3 text-sm text-white"/>
      </label>
    </div>
    {error?<p role="alert" className="mt-3 text-xs text-amber-200">{error}</p>:result&&<>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-live="polite">
        {[
          ['Total load',num(result.totalLoadKn)+' kN'],
          ['Reaction / support',num(result.reactionAtEachSupportKn)+' kN'],
          ['Max. absolute shear',num(result.maximumShearKn)+' kN'],
          ['Max. bending moment',num(result.maximumMomentKnMetres)+' kN·m'],
        ].map(([label,value])=><div key={label} className="rounded-lg border border-white/10 bg-black/25 p-3"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-2 text-sm font-black text-cyan-100">{value}</p></div>)}
      </div>
      <p className="mt-3 text-[11px] text-slate-300">Symmetric reactions: R = (qL + P)/2. Midspan moment: M = qL²/8 + PL/4. These are calculated results for the stated simplified model, not verified bridge capacity.</p>
      <button type="button" onClick={copy} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-200/35 px-3 py-2 text-xs font-bold text-cyan-100">
        <Copy className="h-4 w-4"/>Copy calculation note
      </button>
      {copyStatus&&<p role="status" className="mt-2 text-xs text-cyan-200">{copyStatus}</p>}
      <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-slate-200">View full calculation note</summary>
        <textarea readOnly value={note} aria-label="Engineering calculation note" rows={13} className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 p-3 text-xs leading-5 text-slate-200"/>
      </details>
    </>}
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-amber-100"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0"/>Educational screening only: no material capacity, deformation, foundations, wind, seismic, hydraulic or safety-code verification. A qualified engineer and academic supervisor must independently evaluate the real project. Worksheet entries are not saved automatically.</p>
  </section>
}

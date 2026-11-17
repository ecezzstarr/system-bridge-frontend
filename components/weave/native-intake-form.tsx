'use client'
import {useState} from 'react'
import {CheckCircle2,Send,ShieldCheck} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import {WEAVE_NATIVE_DEPARTMENTS,type NativeDepartment,type NativeBlock} from '@/lib/weave-native-blueprint'
type Intake=Extract<NativeBlock,{type:'intake'}>
const fieldClass="mt-2 w-full rounded-xl border border-white/20 bg-[#071a2b] px-4 py-3 text-sm text-white focus:border-cyan-300 focus:outline-none"
export function NativeIntakeForm({block,releaseId,department,preview}:{
 block:Intake;releaseId?:string;department:NativeDepartment;preview:boolean
}){
 const {user,token}=useAuth()
 const [answers,setAnswers]=useState<Record<string,string>>({})
 const [busy,setBusy]=useState(false)
 const [record,setRecord]=useState('')
 const [error,setError]=useState('')
 const authorized=user?.role===WEAVE_NATIVE_DEPARTMENTS[department].role
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault()
  if(preview||!authorized||!releaseId||!token)return
  setBusy(true);setError('');setRecord('')
  try{
   const res=await fetch('/api/weave-native-modules',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({action:'submit_intake',releaseId,formId:block.formId,answers}),
   })
   const result=await res.json().catch(()=>({}))
   if(!res.ok||!result.success)throw Error(result.error||'Unable to record this work')
   setRecord(result.submission.id)
   setAnswers({})
  }catch(e){setError(e instanceof Error?e.message:'Work record failed')}
  finally{setBusy(false)}
 }
 return <section className="rounded-3xl border border-cyan-200/20 bg-white/[.05] p-6 sm:p-9">
  <div className="flex items-start justify-between gap-3">
   <div><h2 className="text-2xl font-bold">{block.heading}</h2>
    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{block.description}</p></div>
   <ShieldCheck className="shrink-0 text-cyan-200"/>
  </div>
  <p className="mt-4 text-xs text-amber-100">Recorded for company review; this is not a payment, verification, legal approval or private credential form. Do not enter passwords or payment details.</p>
  <form className="mt-5 space-y-4" onSubmit={e=>void submit(e)}>
   {block.fields.map(field=><label key={field.id} className="block text-xs font-semibold text-slate-200">
    {field.label}{field.required?' *':''}
    {field.kind==='choice'
     ?<select required={field.required} value={answers[field.id]||''} onChange={e=>setAnswers(p=>({...p,[field.id]:e.target.value}))} className={fieldClass}>
      <option value="">Choose…</option>{field.options.map(x=><option value={x} key={x}>{x}</option>)}
     </select>
     :field.kind==='long'
      ?<textarea required={field.required} rows={4} maxLength={1500} value={answers[field.id]||''}
        onChange={e=>setAnswers(p=>({...p,[field.id]:e.target.value}))} className={fieldClass}/>
      :<input required={field.required} maxLength={240} value={answers[field.id]||''}
        onChange={e=>setAnswers(p=>({...p,[field.id]:e.target.value}))} className={fieldClass}/>}
   </label>)}
   <button type="submit" disabled={preview||!authorized||busy||!releaseId}
    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#e9d3ad] px-5 py-3 text-sm font-bold text-[#182d40] disabled:opacity-45">
    <Send size={16}/>{preview?'Preview only':busy?'Recording…':'Record this work'}
   </button>
  </form>
  {record&&<p role="status" className="mt-4 flex items-start gap-2 text-sm text-cyan-100">
   <CheckCircle2 size={17} className="mt-0.5 shrink-0"/>Recorded with reference {record}. A company decision is separate from this submission.
  </p>}
  {error&&<p role="alert" className="mt-4 text-xs text-rose-200">{error}</p>}
 </section>
}

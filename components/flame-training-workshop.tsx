'use client'
import {useEffect,useRef,useState} from 'react'
import {getClientToken} from '@/lib/client-auth'
type Run={id:string;state:string;createdAt:string;steps:number;corpus:string;checkpoint?:string;diagnosticPasses?:number;diagnosticCount?:number;metrics?:{validation_loss:number;parameters:number;train_turns:number;validation_turns:number};reason?:string}
type Active={id:string;checkpoint:string}
type State={ready:boolean;corpus:{sha:string;counts:{train:number;validation:number}}|null;runs:Run[];deployment:{current:Active|null;previous:Active|null};productionEnabled:false}
const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+(getClientToken()||'')})
const button='rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40'
export function FlameTrainingWorkshop(){
 const [state,setState]=useState<State|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const [file,setFile]=useState<File|null>(null),[reviewed,setReviewed]=useState(false),[steps,setSteps]=useState(500),[parent,setParent]=useState('')
 const [report,setReport]=useState<any>(null),[prompt,setPrompt]=useState(''),[answer,setAnswer]=useState<{text:string;checkpoint:string}|null>(null)
 const lock=useRef(false)
 async function refresh(){
  try{const r=await fetch('/api/admin/flame-training',{headers:headers(),cache:'no-store'});const b=await r.json();if(!r.ok||!b.ready)throw Error(b.error||b.message||'Worker unavailable.');setState(b);setError('')}
  catch(e){setState(null);setError(e instanceof Error?e.message:'Worker unavailable.')}
 }
 useEffect(()=>{void refresh();const t=window.setInterval(()=>{if(!lock.current&&!document.hidden)void refresh()},10000);return()=>window.clearInterval(t)},[])
 async function action(payload:object){
  const r=await fetch('/api/admin/flame-training',{method:'POST',headers:headers(),body:JSON.stringify(payload)});const b=await r.json()
  if(!r.ok||!b.success)throw Error(b.error||b.message||'Operation unconfirmed.')
  if(!b.result?.queued)return b.result
  for(let attempt=0;attempt<60;attempt++){
   await new Promise(resolve=>window.setTimeout(resolve,2000))
   const receipt=await fetch('/api/admin/flame-training?jobId='+encodeURIComponent(b.result.jobId),{headers:headers(),cache:'no-store'})
   const job=await receipt.json()
   if(!receipt.ok)throw Error('Job receipt unavailable. Inspect node status before retrying.')
   if(job.status==='completed'){
    if(job.result?.success!==true)throw Error(job.result?.error||'Native operation failed.')
    return job.result.result
   }
   if(job.status==='indeterminate')throw Error('Job expired. Inspect local node before retrying.')
  }
  throw Error('Job still unconfirmed. Inspect node status before retrying.')
 }
 async function run(fn:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();await refresh()}catch(e){setError(e instanceof Error?e.message:'Operation unconfirmed.')}finally{lock.current=false;setBusy(false)}}
 const training=state?.runs.some(r=>['queued','training','evaluating'].includes(r.state))
 return <section className="space-y-4 rounded-2xl border border-border p-4" aria-label="Weave One Training Workshop">
  <header><h3 className="text-xl font-semibold">Weave One Training Workshop</h3><p className="mt-1 text-sm text-muted-foreground">Private corpus → native training → evaluation → checkpoint deployment to the Administrations pilot. Normal Flame remains independent. Research outputs may be unreliable.</p></header>
  <div className="flex flex-wrap items-center gap-2 text-sm"><span>{state?.ready?'Private worker connected':'Worker connection unverified'}</span><button type="button" className={button} disabled={busy} onClick={()=>void refresh()}>Refresh</button></div>
  <a className="inline-block text-sm underline" href="/admin/sovereign-server">Connect the Weave-owned laptop</a>
  {error&&<p role="alert" className="text-sm text-amber-600">{error}</p>}
  <div className="space-y-2 rounded-xl border border-border p-3">
   <h4 className="font-semibold">1 · Reviewed Flame Words corpus</h4>
   <p className="text-xs text-muted-foreground">Upload approved JSONL only, maximum 1 MiB. Each dialogue needs source_id, approved:true, split and alternating user/assistant messages. Remove personal records and secrets before import. No automatic account history collection.</p>
   <input type="file" accept=".jsonl,application/json,application/x-ndjson" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]||null);setReviewed(false)}} className="block w-full text-sm"/>
   <label className="flex gap-2 text-xs"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} disabled={busy}/>I have reviewed these records, confirmed training rights, removed confidential information and separated validation sources.</label>
   <button type="button" className={button} disabled={!state||busy||!file||!reviewed} onClick={()=>void run(async()=>{if(!file||file.size>1048576)throw Error('Choose a reviewed JSONL file up to 1 MiB.');await action({action:'import',confirmation:'IMPORT REVIEWED CORPUS',corpus:await file.text()});setFile(null);setReviewed(false)})}>Import reviewed corpus</button>
   {state?.corpus&&<p className="break-all text-xs">Corpus SHA-256: {state.corpus.sha} · {state.corpus.counts.train} training and {state.corpus.counts.validation} validation assistant turns.</p>}
  </div>
  <div className="space-y-2 rounded-xl border border-border p-3">
   <h4 className="font-semibold">2 · Native training</h4>
   <label className="block text-sm">Training steps (CPU research, 1–2,000)<input type="number" min={1} max={2000} value={steps} disabled={busy||training} onChange={e=>setSteps(Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-border bg-background p-2"/></label>
   <label className="block text-sm">Initialization<select className="mt-1 block w-full rounded-lg border border-border bg-background p-2" disabled={busy||training} value={parent} onChange={e=>setParent(e.target.value)}><option value="">New native weights</option>{state?.runs.filter(r=>r.state==='evaluated').map(r=><option key={r.id} value={r.id}>Continue {r.checkpoint?.slice(0,12)} (fresh optimizer)</option>)}</select></label>
   <button type="button" className={button} disabled={!state?.corpus||busy||training||!Number.isInteger(steps)||steps<1||steps>2000} onClick={()=>{if(state?.corpus&&window.confirm('Start bounded CPU training using the displayed corpus hash?'))void run(async()=>{await action({action:'train',confirmation:'START TRAINING',sha:state.corpus!.sha,steps,parent:parent||null})})}}>Start training</button>
  </div>
  <div className="space-y-2 rounded-xl border border-border p-3">
   <h4 className="font-semibold">3 · Checkpoint evaluation and pilot deployment</h4>
   <p className="text-xs text-muted-foreground">A diagnostic score is not a language-quality or safety certification. Deploy only for private testing; no participant rollout is authorized.</p>
   {state?.runs.map(r=><div key={r.id} className="space-y-1 rounded-lg border border-border p-3 text-xs"><p className="font-semibold">{r.state} · {r.steps} steps · {new Date(r.createdAt).toLocaleString()}</p>{r.checkpoint&&<p className="break-all">SHA-256: {r.checkpoint}</p>}{r.metrics&&<p>Parameters: {r.metrics.parameters} · Validation loss: {r.metrics.validation_loss.toFixed(3)} · Training turns: {r.metrics.train_turns}</p>}{r.diagnosticCount!==undefined&&<p>Diagnostic keyword probes: {r.diagnosticPasses}/{r.diagnosticCount}</p>}{r.reason&&<p>{r.reason}</p>}{r.state==='evaluated'&&<div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={()=>void run(async()=>{setReport(await action({action:'report',id:r.id}))})}>Read evaluation</button><button type="button" className={button} disabled={busy||training} onClick={()=>{if(window.confirm('Activate this exact checkpoint for private experimental pilot only? '+r.checkpoint))void run(async()=>{await action({action:'activate',confirmation:'DEPLOY PILOT',id:r.id,sha:r.checkpoint});setAnswer(null)})}}>Deploy pilot</button></div>}</div>)}
   {report&&<details open className="rounded-lg border border-border p-3"><summary className="text-sm">Diagnostic report</summary><p className="text-xs break-all">{report.checkpoint_sha256}</p>{[...(report.results||[]),...(report.conversation_results||[])].map((r:any,i:number)=><article key={i} className="mt-2 text-xs"><p className="font-semibold">{r.question||r.name}</p><p className="whitespace-pre-wrap break-words">{r.reply}</p>{r.rubric&&<p>Review: {r.rubric}</p>}</article>)}<button className={button} type="button" onClick={()=>setReport(null)}>Close report</button></details>}
  </div>
  <div className="space-y-2 rounded-xl border border-border p-3">
   <h4 className="font-semibold">4 · Active pilot and rollback</h4>
   <p className="break-all text-xs">Active checkpoint: {state?.deployment.current?.checkpoint||'None'}</p>
   <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy||!state?.deployment.current} onClick={()=>{if(window.confirm('Deactivate private pilot inference?'))void run(async()=>{await action({action:'deactivate',confirmation:'DEACTIVATE PILOT'});setAnswer(null)})}}>Deactivate pilot</button><button type="button" className={button} disabled={busy||training||!state?.deployment.previous} onClick={()=>{const p=state?.deployment.previous;if(p&&window.confirm('Restore previous evaluated checkpoint '+p.checkpoint+'?'))void run(async()=>{await action({action:'activate',confirmation:'DEPLOY PILOT',id:p.id,sha:p.checkpoint});setAnswer(null)})}}>Restore previous pilot</button></div>
   <textarea aria-label="Pilot test prompt" rows={2} maxLength={1000} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Non-sensitive evaluation prompt" className="w-full rounded-lg border border-border bg-background p-2 text-sm"/>
   <button type="button" className={button} disabled={busy||training||!state?.deployment.current||!prompt.trim()} onClick={()=>void run(async()=>{const r=await action({action:'test',messages:[{role:'user',content:prompt.trim()}]});setAnswer(r)})}>Test active checkpoint</button>
   {answer&&<div className="text-sm"><p className="break-all text-xs">Experimental output · {answer.checkpoint}</p><p className="whitespace-pre-wrap break-words">{answer.text||'(No output)'}</p></div>}
  </div>
 </section>
}

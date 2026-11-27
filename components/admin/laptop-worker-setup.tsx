'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {Download,Laptop,RefreshCw,Unplug} from 'lucide-react'

type Device={id:string;label:string;expires_at:string;revoked_at:string|null;last_seen_at:string|null;online:boolean;snapshot:Record<string,boolean|number>}
type Job={id:string;device_id:string;operation:string;status:string;created_at:string;result_code:string|null}
type State={devices:Device[];jobs:Job[];installerSha256:string|null}
const names:Record<string,string>={inspect:'Check laptop',install_linux:'Install Linux',install_docker:'Install Docker'}
const phrases:Record<string,string>={inspect:'CHECK LAPTOP',install_linux:'INSTALL LINUX',install_docker:'INSTALL DOCKER',revoke:'DISCONNECT LAPTOP'}
const results:Record<string,string>={checked:'Status check complete',linux_installed:'Linux installer finished; complete any local restart and Ubuntu setup',
 restart_required:'Restart Windows, finish Ubuntu setup, then restart the worker',docker_installed:'Docker Engine and Compose installed',
 local_setup_required:'Start the worker with -AllowSetup',local_admin_required:'Start the worker as Windows Administrator',
 operation_failed:'Operation failed; inspect the laptop locally before retrying',operation_timeout:'Operation timed out; inspect local installation before retrying',
 expired:'Operation expired; inspect the laptop before retrying',disconnected:'Connection revoked; an operation already running may finish locally'}
const field='w-full rounded-xl border border-white/20 bg-[#071c2d] p-3 text-sm text-white'
const button='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-200/35 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-40'
export function LaptopWorkerSetup({token}:{token:string|null}){
 const [state,setState]=useState<State|null>(null)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [busy,setBusy]=useState(false)
 const [label,setLabel]=useState('Weave laptop')
 const [pairing,setPairing]=useState<{code:string;expiresAt:string}|null>(null)
 const [pairPhrase,setPairPhrase]=useState('')
 const [deviceId,setDeviceId]=useState('')
 const [operation,setOperation]=useState('inspect')
 const [phrase,setPhrase]=useState('')
 const mutation=useRef(false)
 const activeToken=useRef(token)
 activeToken.current=token
 const load=useCallback(async()=>{
  if(!token)return
  try{
  const response=await fetch('/api/admin/laptop-worker',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(12000)})
  const body=await response.json().catch(()=>({}))
  if(activeToken.current!==token)return
  if(!response.ok||!body.success)throw Error(body.error||'Laptop register unavailable')
  setState(body);setError('')
  }catch(error){if(activeToken.current===token)throw error}
 },[token])
 useEffect(()=>{
  setState(null);setPairing(null);setDeviceId('');setPhrase('');setPairPhrase('')
  if(!token)return
  const read=()=>{if(document.visibilityState==='visible'&&!mutation.current)void load().catch(e=>{setState(null);setError(e.message)})}
  read();const timer=setInterval(read,15000)
  document.addEventListener('visibilitychange',read)
  return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',read)}
 },[token,load])
 useEffect(()=>{setPhrase('')},[deviceId,operation])
 useEffect(()=>{
  if(!pairing)return
  const expires=new Date(pairing.expiresAt).getTime()-Date.now()
  const timer=setTimeout(()=>setPairing(null),Math.max(0,expires))
  return ()=>clearTimeout(timer)
 },[pairing])
 const submit=async(data:Record<string,unknown>)=>{
  if(!token||mutation.current)return
  mutation.current=true;setBusy(true);setError('');setNotice('')
  try{
   const response=await fetch('/api/admin/laptop-worker',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data)})
   const result=await response.json().catch(()=>({}))
   if(activeToken.current!==token)return
   if(!response.ok||!result.success)throw Error(result.error||'Laptop action refused')
   if(data.action==='pairing')setPairing({code:result.code,expiresAt:result.expiresAt})
   setPairPhrase('');setPhrase('')
   setNotice(data.action==='queue'?'Operation queued for the selected laptop. Watch its result below.':data.action==='revoke'?'Connection revoked. Already-running setup may finish locally.':'One-time connection code created. Complete pairing on the laptop.')
   await load().catch(()=>{setState(null);setError('Action recorded. Refresh the register to inspect its current state.')})
  }catch(e){setError(e instanceof Error?e.message:'Laptop action unavailable')}
  finally{mutation.current=false;setBusy(false)}
 }
 const device=state?.devices.find(item=>item.id===deviceId)
 const pending=state?.jobs.some(job=>job.device_id===deviceId&&['queued','running'].includes(job.status))
 const canInstall=Boolean(device?.online&&device.snapshot.setupAllowed===true)
 return <section className="mt-6 space-y-5 rounded-3xl border border-cyan-200/25 bg-[#0c2335] p-5 text-white sm:p-7" aria-labelledby="laptop-connection-title" data-weave-laptop-worker>
  <header className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#ecd4a7]">Administrations · Company-owned laptop</p>
    <h2 id="laptop-connection-title" className="mt-3 flex items-center gap-2 text-2xl font-bold"><Laptop size={24}/> Connect and prepare this laptop</h2>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">Connect a local Windows worker, inspect the laptop and request Linux or Docker setup. Oracle stays live while this candidate is prepared. A connection does not move the company or certify production readiness.</p>
   </div>
   <button type="button" className={button} disabled={busy||!token} onClick={()=>void load().catch(e=>{setState(null);setError(e.message)})}><RefreshCw size={16}/>Refresh laptops</button>
  </header>
  {error&&<p role="alert" className="rounded-xl border border-rose-200/30 p-4 text-sm text-rose-100">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-cyan-200/30 p-4 text-sm text-cyan-100">{notice}</p>}
  <div className="grid gap-5 lg:grid-cols-2">
   <div className="space-y-4 rounded-2xl border border-white/10 p-5">
    <h3 className="text-lg font-bold">1. Start the worker on your laptop</h3>
    <p className="text-sm leading-7 text-slate-300">Download and review the worker. Run it locally in PowerShell. Use Windows Administrator when installing Linux, and add <code>-AllowSetup</code> to permit the two installation actions for this run. Keep the window open; Ctrl+C stops the worker.</p>
    {state?.installerSha256?<>
     <a className={button} href="/host/weave-laptop-worker.ps1" download="weave-laptop-worker.ps1"><Download size={16}/>Download laptop worker</a>
     <details className="text-xs text-slate-300"><summary className="cursor-pointer">Worker SHA-256</summary><code className="mt-2 block break-all">{state.installerSha256}</code></details>
    </>:<p className="text-sm text-amber-100">Worker download is unavailable until this release is installed.</p>}
    <pre className="overflow-x-auto rounded-xl bg-black/25 p-3 text-xs text-cyan-100"><code>powershell -NoProfile -File .\weave-laptop-worker.ps1 -Pair -AllowSetup</code></pre>
    <p className="text-xs leading-6 text-slate-300">After pairing, run the same command without <code>-Pair</code> to reconnect. Windows may require local approval under its existing script policy. The worker does not change execution policy, open Windows firewall ports or add automatic startup.</p>
   </div>
   <div className="space-y-4 rounded-2xl border border-white/10 p-5">
    <h3 className="text-lg font-bold">2. Connect with a one-time code</h3>
    <label className="block space-y-2 text-xs font-semibold">Laptop name<input className={field} value={label} maxLength={80} disabled={busy} onChange={e=>setLabel(e.target.value)}/></label>
    <p className="text-sm leading-7 text-slate-300">The code expires in ten minutes and can be used once. A new code invalidates your previous unused code. Paste it only into the reviewed worker on your laptop. Connecting grants that laptop checks and the setup operations you permit locally, for up to 30 days.</p>
    <label className="block space-y-2 text-xs font-semibold">Type CONNECT LAPTOP<input className={field} autoComplete="off" value={pairPhrase} disabled={busy} onChange={e=>setPairPhrase(e.target.value)}/></label>
    <button type="button" className={button} disabled={busy||!state||!label.trim()||pairPhrase!=='CONNECT LAPTOP'} onClick={()=>void submit({action:'pairing',label:label.trim(),confirmation:pairPhrase})}>Create connection code</button>
    {pairing&&<div className="space-y-3 rounded-xl border border-amber-200/35 p-4">
     <label className="block space-y-2 text-xs font-semibold">One-time connection code<input className={field+' font-mono'} readOnly autoComplete="off" value={pairing.code} onFocus={e=>e.currentTarget.select()}/></label>
     <p className="text-xs text-amber-100">Expires {new Date(pairing.expiresAt).toLocaleTimeString()}. Never share this code or paste it into a chat.</p>
     <button type="button" className={button} onClick={()=>setPairing(null)}>Hide code</button>
    </div>}
   </div>
  </div>
  <div className="space-y-4 rounded-2xl border border-white/10 p-5">
   <h3 className="text-lg font-bold">3. Prepare the connected laptop</h3>
   {state?.devices.length===0&&<p className="text-sm text-amber-100">No laptop is connected yet. Complete the local pairing step above.</p>}
   <label className="block space-y-2 text-xs font-semibold">Laptop connection<select className={field} value={deviceId} disabled={busy} onChange={e=>setDeviceId(e.target.value)}>
    <option value="">Choose a laptop</option>
    {state?.devices.map(item=><option key={item.id} value={item.id}>{item.label} · {item.revoked_at?'Disconnected':item.online?'Connected':'Offline'}</option>)}
   </select></label>
   {device&&<div className="space-y-3">
    <p className="text-sm text-slate-300">{device.online?'Worker connected':'Worker offline or connection expired'} · Last report {device.last_seen_at?new Date(device.last_seen_at).toLocaleString():'not received'} · Connection expires {new Date(device.expires_at).toLocaleDateString()}</p>
    <div className="grid gap-3 sm:grid-cols-3">
     {[
      ['Logical processors',device.snapshot.logicalProcessors||'Unknown'],['RAM (GiB)',device.snapshot.memoryGiB||'Unknown'],['Free disk (GiB)',device.snapshot.freeDiskGiB||'Unknown'],
      ['Ubuntu',device.snapshot.ubuntuInstalled===true?'Installed':'Needs setup'],['Docker Engine',device.snapshot.dockerInstalled===true?'Running':'Needs setup'],['Docker Compose',device.snapshot.composeInstalled===true?'Installed':'Needs setup'],
     ].map(([name,value])=><div key={String(name)} className="rounded-xl border border-white/10 p-3"><p className="text-xs text-slate-400">{name}</p><p className="mt-2 text-sm font-bold">{String(value)}</p></div>)}
    </div>
    <p className="text-xs leading-6 text-slate-300">Setup permission: {device.snapshot.setupAllowed===true?'enabled locally':'checks only'}. Windows Administrator: {device.snapshot.administrator===true?'yes':'no'}. Install Linux first, restart Windows if requested, launch Ubuntu locally to finish its account setup, then restart this worker and install Docker.</p>
   </div>}
   <label className="block space-y-2 text-xs font-semibold">Operation<select className={field} value={operation} disabled={busy} onChange={e=>setOperation(e.target.value)}>
    <option value="inspect">Check laptop</option><option value="install_linux">Install Linux (Ubuntu / WSL)</option><option value="install_docker">Install Docker Engine and Compose in Ubuntu</option><option value="revoke">Disconnect laptop</option>
   </select></label>
   <p className="text-sm leading-7 text-slate-300">{operation==='revoke'?'Disconnect prevents new requests. An installation already running may finish locally; check the laptop before repeating it.':operation==='inspect'?'Read the current local capacity and runtime status.':operation==='install_linux'?'Enable the Windows Linux runtime and install Ubuntu. Windows may require a restart and local account setup; the worker never restarts the laptop automatically.':'Install Docker Engine and Compose from Docker’s official Ubuntu repository. Existing conflicting container packages require local review. This does not launch Weave or transfer production records.'}</p>
   <label className="block space-y-2 text-xs font-semibold">Type {phrases[operation]}<input className={field} autoComplete="off" value={phrase} disabled={busy} onChange={e=>setPhrase(e.target.value)}/></label>
   <button type="button" className={button} disabled={busy||!state||!device||Boolean(device.revoked_at)||phrase!==phrases[operation]||(operation!=='revoke'&&(!device.online||pending))||(operation.startsWith('install_')&&!canInstall)||(operation==='install_linux'&&device.snapshot.administrator!==true)||(operation==='install_docker'&&device.snapshot.ubuntuInstalled!==true)}
    onClick={()=>void submit({action:operation==='revoke'?'revoke':'queue',deviceId,operation,confirmation:phrase})}>{operation==='revoke'?<Unplug size={16}/>:null}{busy?'Recording…':operation==='revoke'?'Disconnect selected laptop':names[operation]}</button>
  </div>
  {state&&state.jobs.length>0&&<div className="space-y-3">
   <h3 className="text-lg font-bold">Laptop operation history</h3>
   {state.jobs.filter(job=>!deviceId||job.device_id===deviceId).slice(0,12).map(job=><article key={job.id} className="rounded-xl border border-white/10 p-4">
    <p className="text-sm font-semibold">{names[job.operation]} · {job.status}</p>
    <p className="mt-1 text-xs text-slate-400">{state.devices.find(item=>item.id===job.device_id)?.label||'Laptop'} · {new Date(job.created_at).toLocaleString()}</p>
    {job.result_code&&<p className="mt-2 text-xs leading-6 text-slate-300">{results[job.result_code]||'Review the laptop locally.'}</p>}
   </article>)}
  </div>}
  <p className="text-xs leading-6 text-slate-400">Laptop setup is separate from production hosting. Use the Weave-owned server readiness and controlled transition workflow before moving company traffic. The production PowerShell sentinel and its token are separate from this laptop connection.</p>
 </section>
}

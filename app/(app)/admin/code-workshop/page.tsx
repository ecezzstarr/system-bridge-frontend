'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {
 ArrowRight,BookOpen,CheckCircle2,Code2,FileCode2,Folder,GitBranch,
 GitMerge,GitPullRequest,RefreshCw,Save,ShieldCheck,TerminalSquare
} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import {isWeaveWorkArea,WEAVE_INDUSTRY_PURPOSE,WEAVE_WORK_AREAS} from '@/lib/weave-workshop-purpose'

type Entry={name:string;path:string;type:'file'|'dir';size:number}
type Activity={event:string;branch:string;file_path:string|null;commit_sha:string|null;
 pull_request:number|null;message:string;created_at:string}
type Source={kind:'file'|'directory';branch:string;path?:string;directory?:string;
 sha?:string|null;content?:string;entries?:Entry[];exists?:boolean}
const defaultPath='app/page.tsx'
const reviewChecks=[
 'The change respects each department’s duties, permissions and company position.',
 'Customer information, company money, employment agreements and ledger integrity are protected.',
 'No secret, host command, private key or production bypass is included in the source.',
 'The change requires independent review, passing tests and a separate authorized deployment.',
] as const

export default function CodeWorkshopPage(){
 const {token,user,isInitialized}=useAuth()
 const [branch,setBranch]=useState('main')
 const [file,setFile]=useState(defaultPath)
 const [directory,setDirectory]=useState('app')
 const [source,setSource]=useState('')
 const [baseline,setBaseline]=useState('')
 const [sha,setSha]=useState<string|null>(null)
 const [entries,setEntries]=useState<Entry[]>([])
 const [activity,setActivity]=useState<Activity[]>([])
 const [ready,setReady]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [writeConfigured,setWriteConfigured]=useState(false)
 const [output,setOutput]=useState<string[]>([
  'WEAVE / ADMINISTRATIONS / A TIME',
  'Safe source terminal · GitHub draft editing only',
  'Type help for supported commands. No shell commands run on the production host.',
 ])
 const [command,setCommand]=useState('')
 const [commitMessage,setCommitMessage]=useState('')
 const [confirmation,setConfirmation]=useState('')
 const [reviewTitle,setReviewTitle]=useState('')
 const [reviewSummary,setReviewSummary]=useState('')
 const [workArea,setWorkArea]=useState('')
 const [reviewChecksState,setReviewChecksState]=useState<boolean[]>([false,false,false,false])
 const [prUrl,setPrUrl]=useState('')
 const [prNumber,setPrNumber]=useState<number|null>(null)

 const print=(message:string)=>setOutput(current=>[...current.slice(-55),message])
 const headers=useCallback((json=false)=>({
  Authorization:'Bearer '+token,...(json?{'Content-Type':'application/json'}:{}),
 }),[token])

 const query=useCallback(async(mode:'file'|'directory'|'activity',path?:string,ref?:string)=>{
  if(!token)throw Error('Administrator login is required')
  const qs=new URLSearchParams({mode,branch:ref||branch})
  if(path)qs.set('path',path)
  const res=await fetch('/api/admin/code-workshop?'+qs,{
   headers:headers(),cache:'no-store',
  })
  const body=await res.json().catch(()=>({error:'Code Workshop did not return valid data'}))
  if(!res.ok||!body.success)throw Error(body.error||'Source request unavailable')
  setWriteConfigured(Boolean(body.writingConfigured))
  return body
 },[token,headers,branch])

 const openFile=useCallback(async(path:string,ref?:string)=>{
  setBusy(true);setError('')
  try{
   const result:Source=await query('file',path,ref)
   setFile(path);setSource(result.content||'');setBaseline(result.content||'')
   setSha(result.sha||null);setReady(true)
   print('READ '+path+' @ '+(ref||branch).split('/').slice(-1)[0]+(result.exists?'':' (new file)'))
  }catch(e){setError(e instanceof Error?e.message:'Unable to read source')}
  finally{setBusy(false)}
 },[query,branch])

 const browse=useCallback(async(path:string,ref?:string)=>{
  setBusy(true);setError('')
  try{
   const result:Source=await query('directory',path,ref)
   setEntries(result.entries||[]);setDirectory(path)
   print('LIST '+path+' · '+(result.entries||[]).length+' entries')
  }catch(e){setError(e instanceof Error?e.message:'Source directory unavailable')}
  finally{setBusy(false)}
 },[query])

 const reloadActivity=useCallback(async()=>{
  const data=await query('activity')
  setActivity(data.entries||[])
 },[query])

 useEffect(()=>{
  if(!isInitialized||!token||user?.role!=='admin')return
  void (async()=>{
   try{
    await Promise.all([openFile(defaultPath,'main'),browse('app','main'),reloadActivity()])
   }catch{}
  })()
 // Initial load is deliberate; branch change is handled explicitly.
 },[isInitialized,token,user?.role])

 const post=async(action:string,extras:Record<string,unknown>)=>{
  if(!token)throw Error('Administrator login required')
  const response=await fetch('/api/admin/code-workshop',{
   method:'POST',headers:headers(true),body:JSON.stringify({action,...extras}),
  })
  const body=await response.json().catch(()=>({error:'Invalid Code Workshop response'}))
  if(!response.ok||!body.success)throw Error(body.error||'Code Workshop action was not accepted')
  return body.result
 }
 async function createDraft(){
  if(confirmation!=='CREATE DRAFT')return
  setBusy(true);setError('')
  try{
   const data=await post('create_branch',{confirmation})
   setBranch(data.branch);setPrNumber(null);setPrUrl('');setReviewChecksState([false,false,false,false])
   setWorkArea('')
   setConfirmation('');setCommitMessage('')
   print('DRAFT '+data.branch+' from '+data.baseSha.slice(0,12)+' · main unchanged')
   await openFile(file,data.branch)
   await browse(directory,data.branch)
   await reloadActivity()
  }catch(e){setError(e instanceof Error?e.message:'Cannot create draft')}
  finally{setBusy(false)}
 }
 async function save(){
  if(branch==='main'||confirmation!=='SAVE DRAFT'||!file)return
  setBusy(true);setError('')
  try{
   const data=await post('save_file',{
    branch,path:file,content:source,expectedSha:sha,message:commitMessage,confirmation,
   })
   setSha(data.sha);setBaseline(source);setConfirmation('');setCommitMessage('')
   print('SAVED '+file+' · commit '+data.commit.slice(0,12)+' on draft only')
   await reloadActivity()
  }catch(e){setError(e instanceof Error?e.message:'Cannot commit source')}
  finally{setBusy(false)}
 }
 async function openReview(){
  if(branch==='main'||confirmation!=='OPEN REVIEW')return
  setBusy(true);setError('')
  try{
   const data=await post('open_review',{
    branch,title:reviewTitle,summary:reviewSummary,workArea,
    confirmation,attestations:reviewChecksState,
   })
   setPrNumber(data.number);setPrUrl(data.url);setConfirmation('')
   print('PR #'+data.number+' opened. GitHub review and Production Check are required.')
   await reloadActivity()
  }catch(e){setError(e instanceof Error?e.message:'Cannot open review')}
  finally{setBusy(false)}
 }
 async function runCommand(){
  const input=command.trim()
  if(!input)return
  setCommand('')
  print('> '+input.slice(0,200))
  if(input==='help'){
   print('COMMANDS: help · status · ls [directory] · open <file path> · clear')
   print('To write: CREATE DRAFT → edit source → SAVE DRAFT → OPEN REVIEW → Release Workshop')
  }else if(input==='status'){
   print('Repository: ecezzstarr/system-bridge-frontend · '+branch)
   print('File: '+file+' · '+(source===baseline?'no unsaved edits':'unsaved edits')+
    ' · GitHub writing: '+(writeConfigured?'configured':'not configured'))
  }else if(input==='clear')setOutput([])
  else if(input==='ls'||input.startsWith('ls '))await browse(input.slice(3).trim()||directory)
  else if(input.startsWith('open ')&&input.slice(5).trim())await openFile(input.slice(5).trim())
  else print('Blocked: only source navigation commands are supported. Production shell and secrets are never available.')
 }

 if(!isInitialized)return <main className="p-6">Opening Administrations…</main>
 if(user?.role!=='admin')return <main className="p-6">Administrations access required.</main>
 const modified=source!==baseline
 return <main className="min-h-dvh bg-[#071625] px-3 py-7 text-slate-100 sm:px-6" data-admin-code-workshop="guarded" data-code-workshop-no-shell="true">
  <div className="mx-auto max-w-7xl space-y-6">
   <nav className="flex flex-wrap items-center gap-4 text-xs font-semibold text-sky-200">
    <Link href="/admin/control-center" className="underline">Administrations Control Center</Link>
    <Link href="/admin/release-workshop" className="underline">GitHub merge & Oracle release</Link>
    <Link href="/admin/deployment-records" className="underline">Sovereign + Flame release records</Link>
    <Link href="/policies" className="underline">Company operating policies</Link>
   </nav>
   <header className="rounded-3xl border border-sky-300/25 bg-[radial-gradient(circle_at_78%_0%,rgba(101,194,248,.18),transparent_45%),linear-gradient(116deg,#092a4b,#0b1e31)] p-6 sm:p-9">
    <div className="flex items-center gap-3 text-sky-200"><TerminalSquare size={23}/>
     <span className="text-xs font-bold uppercase tracking-[.19em]">Weave of Presence · Administrations · A Time</span>
    </div>
    <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Company Code Workshop</h1>
    <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-200">Write and inspect Weave source code inside the company. Changes enter a private GitHub draft, undergo independent review and testing, and can be merged through the existing Release Workshop. Only a verified main release can reach the production worker.</p>
    <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
     {['GitHub source drafts','Versioned commits','Review & CI before main','Separate Oracle deployment','Audited Administrations actions'].map(x=>
      <span key={x} className="rounded-full border border-sky-200/25 bg-sky-300/[.08] px-3 py-2 text-sky-100">{x}</span>)}
    </div>
   </header>

   {error&&<section role="alert" className="rounded-xl border border-rose-300/30 bg-rose-400/[.07] px-4 py-3 text-sm text-rose-100">
    {error}
    {error.includes('Unauthorized')&&<p className="mt-2 text-xs">Source control requires a designated Administrations operator. Configure WEAVE_WORKSHOP_ADMIN_IDS privately; ordinary admin membership alone cannot edit or merge company code.</p>}
   </section>}

   <div className="grid gap-5 lg:grid-cols-[minmax(230px,.72fr)_minmax(0,2fr)]">
    <aside className="space-y-5">
     <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-200"><Folder size={15}/> Repository files</p>
      <div className="mt-4 flex flex-wrap gap-2">{['app','components','lib','tests','docs','public'].map(root=>
       <button key={root} type="button" disabled={busy} onClick={()=>void browse(root)} className="rounded-lg border border-sky-200/20 px-3 py-2 text-xs text-slate-200 disabled:opacity-40">{root}</button>)}</div>
      <label className="mt-4 block text-xs text-slate-300">Source directory
       <input value={directory} onChange={e=>setDirectory(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-[#081929] p-3 font-mono text-xs"/>
      </label>
      <button onClick={()=>void browse(directory)} disabled={busy} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-sky-300/30 px-3 py-2 text-xs font-semibold text-sky-200 disabled:opacity-40"><RefreshCw size={14}/>Browse directory</button>
      <div className="mt-4 max-h-[290px] space-y-1 overflow-auto">
       {entries.map(entry=><button type="button" key={entry.path} onClick={()=>void (entry.type==='dir'?browse(entry.path):openFile(entry.path))}
        disabled={busy} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-200 hover:bg-white/[.07] disabled:opacity-40">
        {entry.type==='dir'?<Folder size={15} className="shrink-0 text-sky-300"/>:<FileCode2 size={15} className="shrink-0 text-slate-400"/>}
        <span className="min-w-0 break-all">{entry.name}</span></button>)}
      </div>
     </section>
     <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-200"><ShieldCheck size={15}/> Source boundaries</p>
      <p className="mt-3 text-xs leading-6 text-slate-300">Only designated Administrators may write code. Authentication, wallet, payment, release, security and workshop-authority files require an independent engineering process. No host shell, arbitrary commands, direct main edits or secret files are exposed.</p>
      <p className="mt-3 text-xs text-slate-400">Source credential: <strong className={writeConfigured?'text-emerald-200':'text-amber-200'}>{writeConfigured?'Configured':'Not configured'}</strong></p>
     </section>
    </aside>

    <div className="min-w-0 space-y-5">
     <section className="rounded-2xl border border-sky-300/20 bg-[#081d32] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
       <p className="flex items-center gap-2 text-sm font-bold"><Code2 size={17} className="text-sky-200"/> Source editor</p>
       <span className="rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10px] text-sky-200">
        {branch==='main'?'MAIN · READ ONLY':'DRAFT · EDITABLE'}</span>
      </div>
      <p className="mt-3 break-all text-xs text-slate-400">{branch}</p>
      <label className="mt-4 block text-xs text-slate-300">Repository file path
       <input value={file} onChange={e=>setFile(e.target.value)} spellCheck={false}
        className="mt-2 w-full rounded-xl border border-sky-300/20 bg-[#061524] p-3 font-mono text-sm text-white"/>
      </label>
      <button onClick={()=>void openFile(file)} disabled={busy} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-sky-300/25 px-3 py-2 text-xs font-bold text-sky-100 disabled:opacity-40"><RefreshCw size={14}/>Read source</button>
      <textarea value={source} onChange={e=>setSource(e.target.value)} disabled={branch==='main'||busy||!ready}
       spellCheck={false} aria-label="GitHub source code editor" rows={21}
       className="mt-4 block min-h-[470px] w-full resize-y rounded-xl border border-sky-300/20 bg-[#040f1c] p-4 font-mono text-[12px] leading-6 text-sky-50 outline-none focus:border-sky-300/60 disabled:opacity-75"/>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-slate-400">
       <span>{source.split('\n').length} lines · {new TextEncoder().encode(source).length.toLocaleString()} bytes</span>
       <span>{modified?'Unsaved draft changes':'Source matches last read/commit'}</span>
      </div>
     </section>

     <section className="rounded-2xl border border-white/10 bg-[#06111d] p-4" data-workshop-command-palette="allowlisted">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-200"><TerminalSquare size={16}/> Code terminal · safe commands</div>
      <div role="log" aria-live="polite" className="mt-3 max-h-[215px] min-h-[145px] space-y-1 overflow-y-auto rounded-lg border border-white/[.08] bg-black/30 p-3 font-mono text-[11px] leading-5 text-sky-100">
       {output.map((line,index)=><p key={index} className="whitespace-pre-wrap break-all">{line}</p>)}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={e=>{e.preventDefault();void runCommand()}}>
       <span className="self-center font-mono text-sky-300">&gt;</span>
       <input value={command} onChange={e=>setCommand(e.target.value)} spellCheck={false}
        placeholder="help · ls app · open components/example.tsx · status"
        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#091b2d] p-3 font-mono text-xs"/>
       <button type="submit" className="rounded-lg border border-sky-300/25 px-4 text-xs font-bold text-sky-100">Run</button>
      </form>
      <p className="mt-2 text-[11px] text-slate-400">This is a repository command interface, not Linux, SSH or a production shell.</p>
     </section>

     <section className="space-y-4 rounded-2xl border border-sky-300/20 bg-[#0a2135] p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold"><GitBranch className="text-sky-200"/> Source → Draft → Review</h2>
      <p className="text-xs leading-6 text-slate-300">Create an isolated branch from canonical main. Save reviewed files with a clear commit reason. Open a pull request only after checking company safeguards; the separate GitHub merge workshop then enforces CI and review.</p>
      <label className="block text-xs">Commit reason
       <input value={commitMessage} onChange={e=>setCommitMessage(e.target.value)}
        placeholder="Explain the change and its expected behavior"
        className="mt-2 w-full rounded-lg border border-white/20 bg-[#071625] p-3 text-sm"/>
      </label>
      <label className="block text-xs">Confirmation phrase for the next action
       <input value={confirmation} onChange={e=>setConfirmation(e.target.value)}
        placeholder={branch==='main'?'CREATE DRAFT':'SAVE DRAFT or OPEN REVIEW'}
        className="mt-2 w-full rounded-lg border border-white/20 bg-[#071625] p-3 font-mono text-sm"/>
      </label>
      <div className="flex flex-wrap gap-2">
       <button type="button" onClick={()=>void createDraft()} disabled={busy||confirmation!=='CREATE DRAFT'||!writeConfigured}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-200 px-4 text-sm font-bold text-[#102c45] disabled:opacity-35">
        <GitBranch size={16}/>Create draft</button>
       <button type="button" onClick={()=>void save()} disabled={busy||branch==='main'||!writeConfigured||!modified||confirmation!=='SAVE DRAFT'||commitMessage.trim().length<12}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-300/35 px-4 text-sm font-bold text-sky-100 disabled:opacity-35">
        <Save size={16}/>Save draft commit</button>
      </div>
      <div className="border-t border-white/10 pt-4">
       <h3 className="flex items-center gap-2 font-bold"><GitPullRequest size={17}/>Open independent code review</h3>
       <p className="mt-2 text-xs leading-6 text-slate-300">{WEAVE_INDUSTRY_PURPOSE}</p>
       <label className="mt-4 block text-xs">Review title
        <input value={reviewTitle} onChange={e=>setReviewTitle(e.target.value)}
         className="mt-2 w-full rounded-lg border border-white/20 bg-[#071625] p-3 text-sm"/>
       </label>
       <label className="mt-3 block text-xs">Weave work affected
        <select value={workArea} onChange={e=>setWorkArea(e.target.value)}
         className="mt-2 w-full rounded-lg border border-white/20 bg-[#071625] p-3 text-sm">
         <option value="">Choose the main area, if applicable</option>
         {Object.entries(WEAVE_WORK_AREAS).map(([key,area])=><option key={key} value={key}>{area.label}</option>)}
        </select>
       </label>
       {isWeaveWorkArea(workArea)&&<p className="mt-2 text-xs leading-6 text-sky-100">{WEAVE_WORK_AREAS[workArea].review}</p>}
       <label className="mt-3 block text-xs">Who participates, what changes, and how you tested it
        <textarea value={reviewSummary} onChange={e=>setReviewSummary(e.target.value)} rows={4}
         className="mt-2 w-full rounded-lg border border-white/20 bg-[#071625] p-3 text-sm"/>
       </label>
       <div className="mt-4 space-y-3">
        {reviewChecks.map((label,index)=><label key={label} className="flex items-start gap-3 text-xs leading-5 text-slate-200">
         <input type="checkbox" checked={reviewChecksState[index]} onChange={e=>setReviewChecksState(current=>current.map((x,i)=>i===index?e.target.checked:x))}
          className="mt-1 h-4 w-4 accent-sky-300"/>{label}</label>)}
       </div>
       <button type="button" onClick={()=>void openReview()}
        disabled={busy||branch==='main'||!writeConfigured||modified||confirmation!=='OPEN REVIEW'||reviewTitle.trim().length<12||reviewSummary.trim().length<60||reviewChecksState.some(v=>!v)}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-200 px-4 text-sm font-bold text-[#102c45] disabled:opacity-35">
        <GitPullRequest size={16}/>Create GitHub review PR</button>
       {prUrl&&<p className="mt-3 text-xs text-emerald-200">PR #{prNumber} created: <a href={prUrl} target="_blank" rel="noreferrer" className="underline">Review exact changes in GitHub</a></p>}
       <Link href="/admin/release-workshop" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-sky-200 underline"><GitMerge size={15}/>Continue to GitHub merge and verified deployment <ArrowRight size={14}/></Link>
      </div>
     </section>
    </div>
   </div>
   <section className="rounded-2xl border border-white/10 bg-white/[.02] p-5">
    <h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen size={19} className="text-sky-200"/>Administrations change records</h2>
    <p className="mt-2 text-xs leading-6 text-slate-300">Each branch, commit and pull request is associated with its author. Activity is not a deployment record; Sovereign + Flame tracks verified production movement separately.</p>
    <button onClick={()=>void reloadActivity().catch(e=>setError(e.message))} className="mt-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-sky-200">Refresh activity</button>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{activity.map((entry,index)=><article key={entry.created_at+index} className="rounded-xl border border-white/[.09] p-3">
     <p className="text-xs font-bold text-sky-100">{entry.event.replaceAll('_',' ')}</p>
     <p className="mt-1 break-all font-mono text-[10px] text-slate-400">{entry.file_path||entry.branch}</p>
     <p className="mt-1 text-xs text-slate-300">{entry.message}</p>
     <p className="mt-2 text-[10px] text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
    </article>)}</div>
   </section>
   <p className="pb-4 text-xs text-slate-400"><CheckCircle2 size={14} className="mr-1 inline text-sky-200"/> Code authored here is never automatically merged, executed on the host, or deployed merely by saving it.</p>
  </div>
 </main>
}

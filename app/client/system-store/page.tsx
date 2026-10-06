'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Boxes, ExternalLink, FileUp, PackageCheck, RefreshCcw, Send, ShieldCheck } from 'lucide-react'
import { getClientToken } from '@/lib/client-auth'

const TYPES=['web','pwa','android_apk','weave_native','api','enterprise_service','desktop']
const CATEGORIES=['Business','Commerce','Productivity','AI','Media','Education','Logistics','Finance','Developer Tools','Enterprise','Other']

export default function ClientSystemStorePublisher(){
  const [systems,setSystems]=useState<any[]>([])
  const [selectedId,setSelectedId]=useState('')
  const [file,setFile]=useState<File|null>(null)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [form,setForm]=useState({system_name:'',summary:'',category:'Business',package_type:'web',version_name:'1.0.0',package_name:'',entry_url:'',price:'0',currency:'NGN',distribution_scope:'store',release_notes:''})

  const selected=useMemo(()=>systems.find(system=>String(system.id)===selectedId)||null,[systems,selectedId])

  const selectSystem=(system:any)=>{
    setSelectedId(String(system.id))
    setFile(null)
    setForm(current=>({
      ...current,
      system_name:String(system.system_name||system.title||''),
      summary:String(system.summary||''),
      category:String(system.category||'Business'),
      package_type:String(system.package_type||'web'),
      version_name:system.version_name?nextVersion(String(system.version_name)):'1.0.0',
      package_name:String(system.package_name||''),
      entry_url:String(system.entry_url||''),
      price:String(system.price??0),
      currency:String(system.currency||'NGN'),
      distribution_scope:String(system.distribution_scope||'store'),
      release_notes:'',
    }))
  }

  const load=async()=>{
    const token=getClientToken()
    if(!token){setMessage('Client login required.');return}
    const response=await fetch('/api/client/system-store',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'})
    const body=await response.json()
    if(!response.ok)throw new Error(body.error||'Unable to load System Store publisher')
    const nextSystems=body.systems||[]
    setSystems(nextSystems)
    if(!selectedId&&nextSystems[0])selectSystem(nextSystems[0])
  }

  useEffect(()=>{void load().catch(error=>setMessage(error instanceof Error?error.message:'Unable to load publisher'))},[])

  const submit=async()=>{
    if(!selected)return
    const token=getClientToken()
    if(!token)return
    setBusy(true);setMessage('')
    try{
      let storageObject:string|null=null
      let contentType:string|null=null
      let sizeBytes:number|null=null
      let sha256:string|null=null
      if(file){
        const prep=await fetch('/api/client/system-store',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'prepare_upload',system_id:selected.id,package_type:form.package_type,file_name:file.name,content_type:file.type||'application/octet-stream',size_bytes:file.size})})
        const prepBody=await prep.json()
        if(!prep.ok)throw new Error(prepBody.error||'Unable to prepare package upload')
        const upload=await fetch(prepBody.uploadUrl,{method:'PUT',headers:{'Content-Type':prepBody.contentType},body:file})
        if(!upload.ok)throw new Error('Google Cloud package upload failed')
        storageObject=prepBody.storageObject
        contentType=prepBody.contentType
        sizeBytes=file.size
        if(file.size<=100_000_000){
          const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer())
          sha256=Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('')
        }
      }

      const response=await fetch('/api/client/system-store',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({
        action:'submit_version',system_id:selected.id,...form,price:Number(form.price||0),storage_object:storageObject,content_type:contentType,size_bytes:sizeBytes,package_sha256:sha256,
      })})
      const body=await response.json()
      if(!response.ok)throw new Error(body.error||'Unable to submit system version')
      setMessage(body.message||'System submitted to Administration.')
      setFile(null)
      await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to submit system')}
    finally{setBusy(false)}
  }

  const withdraw=async(system:any)=>{
    if(!system.publication_id)return
    const token=getClientToken();if(!token)return
    setBusy(true);setMessage('')
    try{
      const response=await fetch('/api/client/system-store',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'withdraw',publication_id:system.publication_id})})
      const body=await response.json();if(!response.ok)throw new Error(body.error||'Unable to withdraw system')
      setMessage('System withdrawn from public distribution.');await load()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to withdraw system')}
    finally{setBusy(false)}
  }

  return <main className="mx-auto max-w-7xl px-4 py-8 text-white md:px-7" data-client-system-store-publisher>
    <header className="border-b border-white/10 pb-6"><p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><Boxes className="h-4 w-4"/>File Folder · System Publisher</p><h1 className="mt-2 text-4xl font-black">Publish what you have built.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Only active systems already formed in your File Folder can enter the WEAVE System Store. Every version is submitted to Administration before it becomes public.</p><div className="mt-4 flex gap-3 text-xs"><Link href="/system-store" className="text-cyan-300">Open public System Store</Link><Link href="/client/system-switch" className="text-slate-400">Return to File Folder</Link></div></header>

    {message&&<div className="mt-5 rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-4 text-sm text-cyan-100">{message}</div>}

    <section className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-[1.7rem] border border-white/10 bg-white/[.02] p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Active File Folder systems</p><p className="mt-1 text-xl font-black">{systems.length} publishable</p></div><button onClick={()=>void load()} className="rounded-lg border border-white/10 p-2 text-slate-400"><RefreshCcw className="h-4 w-4"/></button></div><div className="mt-4 divide-y divide-white/10">{systems.map(system=><div key={system.id} className="py-4"><button onClick={()=>selectSystem(system)} className={`w-full text-left ${selectedId===String(system.id)?'text-cyan-100':'text-slate-300'}`}><div className="flex items-start justify-between gap-3"><span><span className="block text-sm font-black">{system.title}</span><span className="mt-1 block text-[10px] text-slate-500">{system.system_type}</span></span><span className="rounded-full border border-white/10 px-2 py-1 text-[8px] font-black uppercase">{system.publication_status||'not published'}</span></div>{system.version_name&&<p className="mt-2 text-[9px] text-slate-600">Latest v{system.version_name} · {system.review_status||'—'}</p>}{system.review_note&&<p className="mt-1 text-[10px] text-amber-300">Review: {system.review_note}</p>}</button>{system.public_slug&&system.publication_status==='approved'&&<Link href={`/system-store/${system.public_slug}`} className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-300">Live page<ExternalLink className="h-3 w-3"/></Link>}</div>)}</div></div>

      {selected?<div className="rounded-[1.7rem] border border-white/10 bg-white/[.02] p-5 md:p-6"><div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">New version submission</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Public system name"><input value={form.system_name} onChange={e=>setForm({...form,system_name:e.target.value})}/></Field><Field label="Category"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(value=><option key={value}>{value}</option>)}</select></Field><Field label="Package type"><select value={form.package_type} onChange={e=>setForm({...form,package_type:e.target.value})}>{TYPES.map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></Field><Field label="Version"><input value={form.version_name} onChange={e=>setForm({...form,version_name:e.target.value})}/></Field><Field label="Package / bundle name"><input value={form.package_name} onChange={e=>setForm({...form,package_name:e.target.value})} placeholder="com.example.system"/></Field><Field label="Live entry URL"><input value={form.entry_url} onChange={e=>setForm({...form,entry_url:e.target.value})} placeholder="https://... or /weave/path"/></Field><Field label="Price"><input type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></Field><Field label="Currency"><input value={form.currency} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})}/></Field><Field label="Distribution"><select value={form.distribution_scope} onChange={e=>setForm({...form,distribution_scope:e.target.value})}><option value="store">WEAVE Store</option><option value="customer_door">Customer Door</option><option value="both">Store + Customer Door</option></select></Field><Field label="Hosted package"><label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/15 px-3 text-xs text-slate-400"><FileUp className="h-4 w-4"/>{file?file.name:'Choose package file'}<input type="file" className="hidden" onChange={e=>setFile(e.target.files?.[0]||null)}/></label></Field></div><Field label="Public summary"><textarea rows={4} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/></Field><Field label="Release notes"><textarea rows={3} value={form.release_notes} onChange={e=>setForm({...form,release_notes:e.target.value})}/></Field><div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} onClick={()=>void submit()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-black text-slate-950 disabled:opacity-50"><Send className="h-4 w-4"/>{busy?'Working…':'Submit version for verification'}</button>{selected.publication_id&&<button disabled={busy} onClick={()=>void withdraw(selected)} className="rounded-xl border border-rose-300/20 px-5 text-sm font-black text-rose-200">Withdraw publication</button>}</div><p className="mt-4 inline-flex items-center gap-2 text-[10px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5"/>Approval makes this version the current public release. Existing approved versions remain live until a newer version passes review.</p></div>:<div className="rounded-[1.7rem] border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">Build and activate a File Folder system first.</div>}
    </section>
  </main>
}

function Field({label,children}:{label:string,children:ReactNode}){return <label className="mt-4 block"><span className="mb-2 block text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</span><div className="[&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-white/10 [&_input]:bg-black/20 [&_input]:px-3 [&_select]:min-h-11 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-white/10 [&_select]:bg-slate-950 [&_select]:px-3 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-white/10 [&_textarea]:bg-black/20 [&_textarea]:p-3">{children}</div></label>}

function nextVersion(value:string){const parts=value.split('.').map(Number);if(parts.length===3&&parts.every(Number.isFinite)){parts[2]+=1;return parts.join('.')}return value}

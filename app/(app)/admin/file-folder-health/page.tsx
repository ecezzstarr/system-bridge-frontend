'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {AlertTriangle,ArrowLeft,CheckCircle2,RefreshCw,ShieldCheck} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'

type Audit={
  success:boolean;health:string;checkedAt:string;
  missingTables?:string[];
  counts:Record<string,number|null>|null
  issues:Array<{client_id:string;name:string;file_number:string;folder_number:string|null;
    folder_status:string|null;workshop_number:string|null;issue:string}>
  action:string
}

const labels:Record<string,string>={
  owners:'Clients with issued File Numbers',
  missing_folders:'Missing owned File Folders',
  inactive_folders:'Inactive owned File Folders',
  mismatched_folders:'File Number ownership mismatches',
  missing_workshops:'Missing first workshops',
  mismatched_workshops:'Wrong workshop File Number',
  missing_domains:'Missing shared-world domains',
}

export default function AdministrationFileFolderHealth(){
  const {user,token,isInitialized}=useAuth()
  const [state,setState]=useState<Audit|null>(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const refresh=useCallback(async()=>{
    if(!token||user?.role!=='admin')return
    setLoading(true);setError('')
    try{
      const response=await fetch('/api/admin/file-folder-health',{
        headers:{Authorization:'Bearer '+token},cache:'no-store',
      })
      const result=await response.json()
      if(!response.ok)throw new Error(result.error||'Health audit unavailable')
      setState(result)
    }catch(e){setError(e instanceof Error?e.message:'Health audit unavailable')}
    finally{setLoading(false)}
  },[token,user?.role])
  useEffect(()=>{if(isInitialized&&user?.role==='admin')void refresh()},[isInitialized,user?.role,refresh])
  if(!isInitialized||user?.role!=='admin')return null

  const healthy=state?.health==='owner_records_consistent'
  const status=state?.health==='schema_review_required'?'Database schema requires review':healthy?'Ownership records aligned':'Owner records require review'
  return <main className="mx-auto min-h-screen max-w-6xl space-y-5 px-4 py-7 text-white" data-admin-file-folder-health="owner-diagnostics">
    <Link href="/admin/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-amber-200">
      <ArrowLeft className="h-4 w-4"/> Administrations World
    </Link>
    <section className="rounded-2xl border border-amber-200/25 bg-[#101925] p-5 sm:p-7">
      <p className="text-sm font-semibold text-amber-200">A Time · Private File Folder integrity</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Client File Folder Health</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
        Inspect whether the same Client owns the issued File Number, active private File Folder and first workshop. This view is read-only: it never grants folders, credits funds or marks payments verified.
      </p>
      <button type="button" onClick={()=>void refresh()} disabled={loading}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200/40 bg-amber-100 px-5 py-2 text-sm font-bold text-[#19212a] disabled:opacity-60">
        <RefreshCw className={'h-4 w-4 '+(loading?'animate-spin':'')}/>{loading?'Checking records…':'Run integrity check'}
      </button>
      {error&&<p role="alert" className="mt-4 text-sm text-rose-200">{error}</p>}
      {state&&<div className="mt-5 flex items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-4">
        {healthy?<CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300"/>:<AlertTriangle className="h-5 w-5 shrink-0 text-amber-300"/>}
        <div>
          <p className="font-bold">{status}</p>
          <p className="mt-1 text-sm text-slate-200">{state.action}</p>
          <p className="mt-2 text-xs text-slate-400">Inspected: {new Date(state.checkedAt).toLocaleString()}</p>
        </div>
      </div>}
    </section>
    {state?.missingTables?.length?<p role="alert" className="rounded-xl border border-rose-200/20 p-5 text-sm text-rose-200">Missing schema: {state.missingTables.join(', ')}</p>:null}
    {state?.counts&&<section aria-label="File Folder integrity counts" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(state.counts).map(([key,value])=><article key={key} className="rounded-xl border border-white/15 bg-[#101925] p-5">
        <p className="text-sm text-slate-300">{labels[key]||key}</p>
        <p className="mt-2 text-3xl font-bold text-white">{value===null?'Not checked':value.toLocaleString()}</p>
      </article>)}
    </section>}
    <section className="rounded-xl border border-white/15 bg-[#101925] p-5">
      <h2 className="text-lg font-bold">Owners requiring review</h2>
      <p className="mt-1 text-sm text-slate-300">Up to 40 affected accounts are shown. Confirm every existing purchase, ownership and workshop record before any repair.</p>
      {!state?.issues?.length?<p className="mt-4 text-sm text-slate-300">{loading?'Checking…':'No owner/workshop mismatches returned by this check.'}</p>:
      <div className="mt-4 space-y-3">{state.issues.map(row=><article key={row.client_id} className="rounded-lg border border-amber-200/20 bg-black/20 p-4 text-sm">
        <p className="font-semibold text-white">{row.name||'Client'} · {row.file_number}</p>
        <p className="mt-1 text-amber-200">{row.issue.replaceAll('_',' ')}</p>
        <p className="mt-1 text-slate-300">Owned Folder: {row.folder_number||'Missing'} · {row.folder_status||'No status'} · Workshop: {row.workshop_number||'Missing'}</p>
      </article>)}</div>}
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-sky-200/30 px-4 py-2 text-sky-100" href="/admin/file-number-engine"><ShieldCheck className="h-4 w-4"/> Review File Numbers</Link>
        <Link className="inline-flex min-h-11 items-center rounded-lg border border-sky-200/30 px-4 py-2 text-sky-100" href="/admin/client-vault">Client Records</Link>
      </div>
    </section>
  </main>
}

'use client'
import Link from 'next/link'
import {useParams} from 'next/navigation'
import {useEffect,useState} from 'react'
import {ArrowLeft,RefreshCw} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import {
 validNativeDepartment,WEAVE_NATIVE_DEPARTMENTS,type WeaveNativeBlueprint,
} from '@/lib/weave-native-blueprint'
import {NativeModuleRenderer} from '@/components/weave/native-module-renderer'

type Published={id:string;version:number;slug:string;department:string;blueprint:WeaveNativeBlueprint}
type Progress={step_id:string;completed:boolean}
export default function WeaveNativeDepartmentPage(){
 const {department,slug}=useParams<{department:string;slug:string}>()
 const {token,user,isInitialized}=useAuth()
 const [module,setModule]=useState<Published|null>(null)
 const [progress,setProgress]=useState<Progress[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 useEffect(()=>{
  if(!isInitialized)return
  if(!token||!validNativeDepartment(department)){setLoading(false);setError('Active WEAVE account and valid department required');return}
  const controller=new AbortController()
  setLoading(true);setError('')
  const query=new URLSearchParams({department,slug})
  fetch('/api/weave-native-modules?'+query,{
   headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal,
  }).then(async res=>{
   const data=await res.json()
   if(!res.ok||!data.success)throw Error(data.error||'Department module unavailable')
   if(controller.signal.aborted)return
   setModule(data.module);setProgress(data.progress||[])
  }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Module unavailable')})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return ()=>controller.abort()
 },[token,isInitialized,department,slug])
 const base=validNativeDepartment(department)?WEAVE_NATIVE_DEPARTMENTS[department].role:''
 const home=base==='agent'?'/agent/dashboard':base==='bridger'?'/bridger/dashboard':
  base==='client'?'/client/system-switch':'/admin/dashboard'
 return <main className="min-h-dvh bg-[#071827] px-3 py-7 text-white sm:px-6" data-weave-department-native-page="verified">
  <div className="mx-auto max-w-7xl">
   <Link href={home} className="inline-flex items-center gap-2 text-sm text-cyan-200"><ArrowLeft size={15}/>Return to department</Link>
   {loading&&<p className="mt-10 text-sm text-slate-300">Opening the published WEAVE system…</p>}
   {error&&<section className="mt-8 rounded-2xl border border-rose-300/25 p-6">
    <p role="alert" className="text-rose-100">{error}</p>
    <p className="mt-2 text-xs text-slate-400">Pages are available only when Administrations has published them for your active company role.</p>
   </section>}
   {!loading&&!error&&module&&<div className="mt-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
     <span>WEAVE native publication · Version {module.version}</span>
     <button type="button" onClick={()=>window.location.reload()} className="inline-flex items-center gap-2 text-cyan-200"><RefreshCw size={14}/>Check current version</button>
    </div>
    <NativeModuleRenderer key={module.id} blueprint={module.blueprint} releaseId={module.id} progress={progress}/>
   </div>}
  </div>
 </main>
}

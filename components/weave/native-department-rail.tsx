'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {Blocks,ChevronRight} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import {
 WEAVE_NATIVE_DEPARTMENTS,type NativeDepartment,type WeaveNativeBlueprint,
} from '@/lib/weave-native-blueprint'

type Live={id:string;slug:string;version:number;blueprint:WeaveNativeBlueprint}
/** A single dynamic entry on each real department desk. */
export function NativeDepartmentRail({department}:{department:NativeDepartment}){
 const {user,token,isInitialized}=useAuth()
 const [modules,setModules]=useState<Live[]>([])
 useEffect(()=>{
  if(!isInitialized||!token||!user)return
  const controller=new AbortController()
  fetch('/api/weave-native-modules?'+new URLSearchParams({department}),{
   headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal,
  }).then(async response=>{
   const data=await response.json()
   if(response.ok&&data.success&&!controller.signal.aborted)setModules(data.modules||[])
  }).catch(()=>{})
  return ()=>controller.abort()
 },[department,isInitialized,token,user?.id])
 if(!modules.length)return null
 return <section className="mx-auto my-5 w-full max-w-6xl rounded-2xl border border-[#d4b982]/40 bg-[#102a3d] p-4 text-white shadow-xl sm:p-6" data-weave-native-department-rail={department}>
  <div className="flex flex-wrap items-center gap-3"><Blocks className="h-5 w-5 text-[#edd3a1]"/>
   <div><h2 className="text-lg font-bold">New working systems</h2>
    <p className="text-xs text-slate-300">{WEAVE_NATIVE_DEPARTMENTS[department].label} · Published by Administrations</p></div>
  </div>
  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
   {modules.map(module=><Link key={module.id} href={'/weave-modules/'+department+'/'+module.slug}
    className="group flex min-h-28 items-center justify-between gap-3 rounded-xl border border-cyan-200/20 bg-white/[.055] p-4 transition hover:border-cyan-200/50">
    <div><h3 className="text-sm font-bold">{module.blueprint.title}</h3>
     <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{module.blueprint.description}</p>
     <p className="mt-2 text-[11px] capitalize text-[#efd8ae]">{module.blueprint.kind} · Version {module.version}</p>
    </div>
    <ChevronRight size={17} className="shrink-0 text-cyan-200 group-hover:translate-x-1"/>
   </Link>)}
  </div>
 </section>
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import FileFolderOpenWorld from '@/components/system-switch/file-folder-open-world'
import { FileFolderEnvironmentLoader } from '@/components/system-switch/file-folder-environment-loader'

export default function SupportFileFolderPage() {
  const params = useParams<{ fileNumber: string }>()
  const router = useRouter()
  const { token, user, isLoading } = useAuth()
  const [data,setData]=useState<any>(null)
  const [error,setError]=useState('')

  useEffect(()=>{
    if(isLoading) return
    if(!user || !token){
      router.replace('/login')
      return
    }
    if(!['admin','agent','bridger'].includes(user.role || '')){
      router.replace('/weave')
      return
    }
    const fileNumber=Array.isArray(params.fileNumber)?params.fileNumber[0]:params.fileNumber
    fetch(`/api/world/file-folders/${encodeURIComponent(fileNumber || '')}`,{
      headers:{Authorization:`Bearer ${token}`},
      cache:'no-store',
    }).then(async response=>{
      const body=await response.json()
      if(!response.ok) throw new Error(body.error || 'Unable to enter File Folder')
      return body
    }).then(setData).catch(err=>setError(err instanceof Error?err.message:'Unable to enter File Folder'))
  },[isLoading,user,token,params.fileNumber,router])

  if(isLoading || (!data && !error)) return <FileFolderEnvironmentLoader support />

  if(error || !data){
    return <main className="min-h-screen bg-[#020711] p-6 text-white"><div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-8 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-violet-300"/><h1 className="mt-4 text-xl font-bold">Bridge Plaza Access</h1><p className="mt-3 text-sm leading-6 text-slate-400">{error}</p><Link href="/weave" className="mt-5 inline-flex rounded-full border border-white/10 px-4 py-2 text-xs">Return to Bridge Plaza</Link></div></main>
  }

  return <main className="min-h-screen bg-[#020711] p-3 text-white md:p-6">
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-4 rounded-3xl border border-violet-300/15 bg-[linear-gradient(135deg,rgba(139,92,246,.08),rgba(14,165,233,.05))] p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">Bridge Plaza → Client File Folder</p>
            <h1 className="mt-1 text-lg font-black text-white">You are viewing one Client operating environment.</h1>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300">Support enters the Client’s existing world without ownership rights. Blueprints become builds, builds become live systems, and real activity stays attached to the Client File Folder. The Client remains the player and owner of the environment.</p>
          </div>
          <Link href="/weave" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs text-slate-200"><ArrowLeft className="h-3.5 w-3.5"/>Bridge Plaza</Link>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2 text-center">
          {[
            ['Recognize','text-sky-300 bg-sky-400/[0.05] border-sky-300/15'],
            ['Preview','text-violet-300 bg-violet-400/[0.05] border-violet-300/15'],
            ['Build','text-amber-300 bg-amber-400/[0.05] border-amber-300/15'],
            ['Activate','text-emerald-300 bg-emerald-400/[0.05] border-emerald-300/15'],
            ['Operate','text-cyan-300 bg-cyan-400/[0.05] border-cyan-300/15'],
          ].map(([label,tone])=><div key={label} className={`rounded-xl border px-2 py-2 text-[8px] font-black uppercase tracking-[0.08em] ${tone}`}>{label}</div>)}
        </div>
      </div>
      <FileFolderOpenWorld
        clientName={data.client.name}
        fileNumber={data.client.file_number}
        workshopTitle={data.workshop.title}
        workshopPurpose={data.workshop.description}
        initialWorld={data.world}
        readOnly
        refreshUrl={`/api/world/file-folders/${encodeURIComponent(data.client.file_number)}`}
        refreshToken={token}
      />
    </div>
  </main>
}

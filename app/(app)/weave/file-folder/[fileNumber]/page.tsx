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
    const controller=new AbortController()
    const timeout=window.setTimeout(()=>controller.abort(),12000)
    const fileNumber=Array.isArray(params.fileNumber)?params.fileNumber[0]:params.fileNumber
    fetch(`/api/world/file-folders/${encodeURIComponent(fileNumber || '')}`,{
      headers:{Authorization:`Bearer ${token}`},
      cache:'no-store',
      signal:controller.signal,
    }).then(async response=>{
      const body=await response.json()
      if(!response.ok) throw new Error(body.error || 'Unable to enter File Folder')
      return body
    }).then(setData).catch(err=>{
      setError(controller.signal.aborted
        ?'The Client File Folder took too long to load. Return to Bridge Plaza and enter again.'
        :err instanceof Error?err.message:'Unable to enter File Folder')
    }).finally(()=>window.clearTimeout(timeout))
    return()=>{
      window.clearTimeout(timeout)
      controller.abort()
    }
  },[isLoading,user,token,params.fileNumber,router])

  if(isLoading || (!data && !error)) return <FileFolderEnvironmentLoader support />

  if(error || !data){
    return <main className="min-h-screen bg-[#020711] p-6 text-white"><div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-8 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-violet-300"/><h1 className="mt-4 text-xl font-bold">Client File Folder Support</h1><p className="mt-3 text-sm leading-6 text-slate-400">{error}</p><Link href="/weave" className="mt-5 inline-flex rounded-full border border-white/10 px-4 py-2 text-xs">Return to Role World</Link></div></main>
  }

  return <main className="min-h-screen bg-[#020711] p-2 text-white sm:p-3 md:p-6">
    <div className="mx-auto max-w-[1500px]">
      <div className="sticky top-0 z-40 mb-2 flex h-11 items-center gap-3 border-b border-violet-300/15 bg-[#020711]/94 px-1 backdrop-blur-xl md:static md:mb-4 md:h-auto md:rounded-2xl md:border md:bg-[linear-gradient(135deg,rgba(139,92,246,.08),rgba(14,165,233,.05))] md:px-4 md:py-3">
        <Link href="/weave" className="inline-flex shrink-0 items-center gap-1.5 border-r border-white/10 pr-3 text-[8px] font-black uppercase tracking-[.12em] text-violet-200 md:rounded-full md:border md:border-white/10 md:bg-black/20 md:px-3 md:py-2"><ArrowLeft className="h-3.5 w-3.5"/><span className="hidden sm:inline">Bridge Plaza</span></Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-violet-300"/>
            <p className="truncate text-[8px] font-black uppercase tracking-[.14em] text-violet-200">Territory observer · Read only · {data.client.name}</p>
          </div>
          <p className="mt-0.5 hidden truncate text-[9px] text-slate-500 sm:block">Observe the territory forming in real time. Client authority remains with the Client; wallet, private records and build controls are not transferred to staff.</p>
        </div>
        <span className="shrink-0 font-mono text-[7px] text-slate-600 md:text-[8px]">{data.client.file_number}</span>
      </div>
      <FileFolderOpenWorld
        clientName={data.client.name}
        fileNumber={data.client.file_number}
        workshopTitle={data.workshop.title}
        workshopPurpose={data.workshop.description}
        initialWorld={data.world}
        readOnly
        observerLabel={`${user?.role || 'staff'} observation`}
        refreshUrl={`/api/world/file-folders/${encodeURIComponent(data.client.file_number)}`}
        refreshToken={token}
      />
    </div>
  </main>
}

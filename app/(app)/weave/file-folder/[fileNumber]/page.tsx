'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import FileFolderOpenWorld from '@/components/system-switch/file-folder-open-world'

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

  if(isLoading || (!data && !error)){
    return <main className="min-h-screen bg-[#020711] p-8 text-slate-400">Entering Client File Folder…</main>
  }

  if(error || !data){
    return <main className="min-h-screen bg-[#020711] p-6 text-white"><div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-8 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-violet-300"/><h1 className="mt-4 text-xl font-bold">Bridge Plaza Access</h1><p className="mt-3 text-sm leading-6 text-slate-400">{error}</p><Link href="/weave" className="mt-5 inline-flex rounded-full border border-white/10 px-4 py-2 text-xs">Return to Bridge Plaza</Link></div></main>
  }

  return <main className="min-h-screen bg-[#020711] p-3 text-white md:p-6">
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-300/10 bg-violet-400/[0.035] px-4 py-3">
        <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">Bridge Plaza → Client File Folder</p><p className="mt-1 text-xs text-slate-400">Support enters the Client’s existing world. The Client remains the player.</p></div>
        <Link href="/weave" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300"><ArrowLeft className="h-3.5 w-3.5"/>Bridge Plaza</Link>
      </div>
      <FileFolderOpenWorld
        clientName={data.client.name}
        fileNumber={data.client.file_number}
        workshopTitle={data.workshop.title}
        workshopPurpose={data.workshop.description}
        initialWorld={data.world}
        readOnly
      />
    </div>
  </main>
}

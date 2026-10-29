'use client'
import Link from 'next/link'
import { useCallback,useEffect,useRef,useState } from 'react'
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { visiblePoll } from '@/lib/visible-poll'

type Department = 'mandate'|'forensic'|'lawyer'
type Thread={requesterId:string;name:string;username:string;role:string;lastMessageAt:string;messageCount:number}
type Message={id:string;userId:string;sender:string;senderRole:string;content:string;createdAt:string}
const names:Record<Department,string>={mandate:'Mandate',forensic:'Forensics',lawyer:'Attorney'}
export default function MandateGuidanceInbox(){
  const {user,token,isInitialized}=useAuth()
  const [departments,setDepartments]=useState<Department[]>([])
  const [department,setDepartment]=useState<Department>('mandate')
  const [threads,setThreads]=useState<Thread[]>([])
  const [selected,setSelected]=useState<Thread|null>(null)
  const [messages,setMessages]=useState<Message[]>([])
  const [content,setContent]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const endRef=useRef<HTMLDivElement|null>(null)
  const header=useCallback(()=>({Authorization:`Bearer ${token||''}`}),[token])
  useEffect(()=>{
    if(!token)return
    let mounted=true
    fetch('/api/weave/lifestyles/mandate',{headers:header(),cache:'no-store'})
      .then(async res=>{const data=await res.json();if(!res.ok)throw new Error(data.error||'Unable to check assignment');return data})
      .then(data=>{
        if(!mounted)return
        const next=(data.activeDepartments||[]) as Department[]
        setDepartments(next)
        const preferred=typeof window!=='undefined' ? new URLSearchParams(window.location.search).get('department') as Department|null : null
        if(preferred&&next.includes(preferred))setDepartment(preferred)
        else if(next.length)setDepartment(next[0])
        setLoading(false)
      })
      .catch(e=>{if(mounted){setError(String(e));setLoading(false)}})
    return()=>{mounted=false}
  },[token,header])
  const loadThreads=useCallback(async()=>{
    if(!token||!departments.includes(department))return
    try{
      const response=await fetch(`/api/company-guidance/staff?department=${department}`,{headers:header(),cache:'no-store'})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Unable to load guidance inbox')
      setThreads(data.threads||[])
      setSelected(current=>(data.threads||[]).find((item:Thread)=>item.requesterId===current?.requesterId)||null)
      setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to load threads')}
  },[token,department,departments,header])
  const loadMessages=useCallback(async()=>{
    if(!token||!selected)return
    try{
      const response=await fetch(`/api/company-guidance/staff?department=${department}&requesterId=${encodeURIComponent(selected.requesterId)}`,{headers:header(),cache:'no-store'})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Unable to load requester conversation')
      setMessages(data.messages||[]);setError('')
    }catch(e){setError(e instanceof Error?e.message:'Unable to load conversation')}
  },[token,selected?.requesterId,department,header])
  useEffect(()=>{setSelected(null);setThreads([]);setMessages([]);if(!departments.includes(department))return;void loadThreads();return visiblePoll(()=>loadThreads(),6000,false)},[loadThreads,department,departments])
  useEffect(()=>{setMessages([]);if(!selected)return;void loadMessages();return visiblePoll(()=>loadMessages(),4000,false)},[loadMessages,selected?.requesterId,department])
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages])

  async function send(){
    if(!selected||!token||busy||!content.trim())return
    const previous=content.trim()
    setBusy(true);setContent('')
    try{
      const response=await fetch('/api/company-guidance/staff',{
        method:'POST',headers:{'Content-Type':'application/json',...header()},
        body:JSON.stringify({department,requesterId:selected.requesterId,content:previous}),
      })
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Unable to send departmental reply')
      await loadMessages();await loadThreads()
    }catch(e){setError(e instanceof Error?e.message:'Reply failed');setContent(previous)}
    finally{setBusy(false)}
  }

  if(!isInitialized||loading)return <main className="p-6 text-sm text-white">Opening Mandate Guidance Inbox…</main>
  if(!user||!['agent','bridger'].includes(user.role||'')||departments.length===0)
    return <main className="p-6 text-white"><p>Administration approval and active Agent/Bridger standing are required.</p><Link href="/weave/lifestyles/mandate" className="mt-4 inline-flex text-sky-200">Return to applications</Link></main>

  return <main className="mx-auto max-w-7xl px-4 pb-16 pt-5 text-white" data-mandate-staff-inbox="approved-only">
    <Link href="/weave/lifestyles/mandate" className="flex items-center gap-2 text-xs text-sky-200"><ArrowLeft className="h-4 w-4"/>WEAVE Mandate Lifestyle</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
      <div><p className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-200"><ShieldCheck className="h-4 w-4"/>Approved Company Support</p>
        <h1 className="mt-2 text-2xl font-black">Company Guidance · Department Inbox</h1>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-stone-400">Replies are sent from your named Agent or Bridger identity with its department attached. Administration still oversees each conversation.</p>
      </div>
      <div className="flex flex-wrap gap-2">{departments.map(d=><button key={d} type="button" onClick={()=>setDepartment(d)} aria-pressed={department===d}
        className={`border px-3 py-2 text-xs font-bold ${department===d?'border-amber-300/50 text-amber-100':'border-white/10 text-stone-400'}`}>{names[d]}</button>)}</div>
    </div>
    {departments.includes('forensic')&&<Link href="/weave/lifestyles/mandate/forensic-food" className="mt-4 inline-flex border border-amber-300/30 px-4 py-3 text-xs font-bold text-amber-200">Open Food Forensics · Weave OPay stock distributions</Link>}
    {departments.includes('forensic')&&<Link href="/weave/lifestyles/mandate/forensic-gift-cards" className="ml-2 mt-4 inline-flex border border-violet-300/30 px-4 py-3 text-xs font-bold text-violet-200">Open Gift-Card Forensics · Partnerships & repeat transactions</Link>}
    {error&&<p role="alert" className="mt-3 text-xs text-rose-200">{error}</p>}
    <div className="mt-4 flex min-h-[600px] flex-col border border-white/10 md:h-[72vh] md:flex-row">
      <aside className="max-h-72 overflow-y-auto border-b border-white/10 md:max-h-none md:w-80 md:border-b-0 md:border-r">
        <div className="border-b border-white/10 p-4 text-xs font-black text-stone-300">{names[department]} requests · {threads.length}</div>
        {threads.map(thread=><button key={thread.requesterId} onClick={()=>setSelected(thread)}
          className={`w-full border-b border-white/5 p-4 text-left hover:bg-white/[.035] ${selected?.requesterId===thread.requesterId?'bg-amber-300/[.06]':''}`}>
          <p className="text-sm font-black">{thread.name||thread.username}</p>
          <p className="mt-2 text-[10px] text-stone-500">{thread.role} · {thread.messageCount} messages</p>
        </button>)}
        {!threads.length&&<p className="p-5 text-xs text-stone-500">No requesters have contacted this department yet.</p>}
      </aside>
      <section className="flex min-h-[400px] flex-1 flex-col">
        {!selected?<p className="m-auto p-8 text-center text-sm text-stone-500">Choose an existing requester to answer.</p>:<>
          <header className="border-b border-white/10 p-4">
            <p className="text-sm font-black">{selected.name||selected.username}</p>
            <p className="mt-1 text-[10px] text-stone-500">{selected.role} · {names[department]} support</p>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map(message=><div key={message.id} className={`flex ${message.userId===user.id?'justify-end':'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 text-xs leading-6 ${message.userId===user.id?'bg-amber-300 text-black':'bg-white/[.07] text-stone-200'}`}>
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className="mt-1 text-[10px] opacity-70">{message.sender} · {new Date(message.createdAt).toLocaleString()}</p>
              </div>
            </div>)}
            <div ref={endRef}/>
          </div>
          <form onSubmit={e=>{e.preventDefault();void send()}} className="flex gap-2 border-t border-white/10 p-4">
            <input value={content} onChange={e=>setContent(e.target.value)} maxLength={10000}
              className="min-w-0 flex-1 border border-white/15 bg-black/30 px-3 py-3 text-sm text-white"
              placeholder={`Reply as ${names[department]} support…`}/>
            <button type="submit" disabled={busy||!content.trim()} className="bg-amber-300 px-4 py-3 text-black disabled:opacity-40"><Send className="h-4 w-4"/></button>
          </form>
        </>}
      </section>
    </div>
    <p className="mt-3 text-xs leading-5 text-stone-500">Do not export private conversations or promise actions beyond your authorized department. Escalate safety, finance, legal and unresolved verification decisions to Administration.</p>
  </main>
}

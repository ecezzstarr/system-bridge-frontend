'use client'
import { getAuthHeaders } from '@/lib/auth-client'

import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Loader2,
  Mail,
  Package,
  PhoneCall,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'

type ProspectChannel='whatsapp'|'email'

interface Contact {
  id:string
  phone:string|null
  email:string|null
  channel:ProspectChannel
  status:string
  created_at:string
}

interface Mailbox {
  id:string
  email:string
  provider:string
  status:string
  verified_at:string|null
  last_sent_at:string|null
}

export default function ProspectEnginePage() {
  const [channel,setChannel]=useState<ProspectChannel>('whatsapp')
  const [sourceNumber,setSourceNumber]=useState('08012345000')
  const [count,setCount]=useState('50')
  const [emailInput,setEmailInput]=useState('')
  const [isGenerating,setIsGenerating]=useState(false)
  const [isAddingEmails,setIsAddingEmails]=useState(false)
  const [isPackaging,setIsPackaging]=useState(false)
  const [availableContacts,setAvailableContacts]=useState<Contact[]>([])
  const [selectedContacts,setSelectedContacts]=useState<string[]>([])
  const [isLoading,setIsLoading]=useState(true)

  const [mailbox,setMailbox]=useState<Mailbox|null>(null)
  const [mailboxEmail,setMailboxEmail]=useState('')
  const [mailboxPassword,setMailboxPassword]=useState('')
  const [connectingMailbox,setConnectingMailbox]=useState(false)
  const [runningEmail,setRunningEmail]=useState(false)
  const [emailRunLimit,setEmailRunLimit]=useState('50')
  const [emailReport,setEmailReport]=useState<{queued:number;sent:number;failed:number}|null>(null)
  const [syncingFeedback,setSyncingFeedback]=useState(false)
  const [feedbackReport,setFeedbackReport]=useState<{checked:number;responded:number;mailboxes:number}|null>(null)

  useEffect(()=>{ void Promise.all([fetchAvailable(),loadMailbox()]) },[])

  const visibleContacts=useMemo(
    ()=>availableContacts.filter(contact=>(contact.channel||'whatsapp')===channel),
    [availableContacts,channel],
  )

  const fetchAvailable=async()=>{
    setIsLoading(true)
    try{
      const res=await fetch('/api/admin/market/prospects/list-available',{headers:getAuthHeaders(),cache:'no-store'})
      const data=await res.json()
      if(data.success)setAvailableContacts(data.contacts)
    }catch{
      toast.error('Failed to load Prospect inventory')
    }finally{
      setIsLoading(false)
    }
  }

  const loadMailbox=async()=>{
    try{
      const res=await fetch('/api/mailbox',{headers:getAuthHeaders(),cache:'no-store'})
      const data=await res.json()
      if(res.ok&&data.success){
        setMailbox(data.mailbox||null)
        if(data.mailbox?.email)setMailboxEmail(data.mailbox.email)
      }
    }catch{}
  }

  const handleGenerate=async(e:React.FormEvent)=>{
    e.preventDefault()
    setIsGenerating(true)
    try{
      const res=await fetch('/api/admin/market/prospects/generate',{
        method:'POST',
        headers:getAuthHeaders(),
        body:JSON.stringify({sourceNumber,count}),
      })
      const data=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Generation failed')
      toast.success(`Generated ${data.contactsGenerated} WhatsApp Prospect candidates.`)
      await fetchAvailable()
    }catch(error){
      toast.error(error instanceof Error?error.message:'Generation failed')
    }finally{
      setIsGenerating(false)
    }
  }

  const handleAddEmails=async()=>{
    const emails=emailInput.split(/[\n,;]+/).map(v=>v.trim()).filter(Boolean)
    if(!emails.length)return
    setIsAddingEmails(true)
    try{
      const res=await fetch('/api/admin/market/prospects/email',{
        method:'POST',
        headers:getAuthHeaders(),
        body:JSON.stringify({emails,source:'administration_email_engine'}),
      })
      const data=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Email Prospect intake failed')
      toast.success(`${data.added.length} email Prospect candidate${data.added.length===1?'':'s'} added; ${data.duplicates.length} duplicate${data.duplicates.length===1?'':'s'} ignored.`)
      setEmailInput('')
      await fetchAvailable()
    }catch(error){
      toast.error(error instanceof Error?error.message:'Email Prospect intake failed')
    }finally{
      setIsAddingEmails(false)
    }
  }

  const handlePackage=async()=>{
    if(selectedContacts.length===0)return toast.error('Select Prospects to package')
    setIsPackaging(true)
    try{
      const res=await fetch('/api/admin/market/prospects/package',{
        method:'POST',
        headers:getAuthHeaders(),
        body:JSON.stringify({contactIds:selectedContacts,channel}),
      })
      const data=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Failed to create package')
      toast.success(`${channel==='email'?'Email':'WhatsApp'} package created: ${data.package.title}`)
      setSelectedContacts([])
      await fetchAvailable()
    }catch(error){
      toast.error(error instanceof Error?error.message:'Failed to create package')
    }finally{
      setIsPackaging(false)
    }
  }

  const connectMailbox=async()=>{
    if(!mailboxEmail.trim()||!mailboxPassword.trim())return
    setConnectingMailbox(true)
    try{
      const res=await fetch('/api/mailbox',{
        method:'POST',
        headers:getAuthHeaders(),
        body:JSON.stringify({email:mailboxEmail.trim(),appPassword:mailboxPassword}),
      })
      const data=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Google authentication failed')
      setMailbox(data.mailbox)
      setMailboxPassword('')
      toast.success('Administration Google mailbox authenticated')
    }catch(error){
      toast.error(error instanceof Error?error.message:'Google authentication failed')
    }finally{
      setConnectingMailbox(false)
    }
  }

  const runEmailMovement=async()=>{
    if(!mailbox||mailbox.status!=='connected')return toast.error('Authenticate the Administration Google mailbox first')
    setRunningEmail(true)
    try{
      const res=await fetch('/api/admin/market/prospects/email/run',{
        method:'POST',
        headers:getAuthHeaders(),
        body:JSON.stringify({limit:Math.max(1,Math.min(250,Number(emailRunLimit)||50))}),
      })
      const data=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Email movement failed')
      setEmailReport(data.report)
      toast.success(`Email movement: ${data.report.sent} sent, ${data.report.failed} failed.`)
      await Promise.all([fetchAvailable(),loadMailbox()])
    }catch(error){
      toast.error(error instanceof Error?error.message:'Email movement failed')
    }finally{
      setRunningEmail(false)
    }
  }

  const syncEmailFeedback=async()=>{
    setSyncingFeedback(true)
    try{
      const res=await fetch('/api/admin/market/prospects/email/feedback',{
        method:'POST',
        headers:getAuthHeaders(),
        body:JSON.stringify({limit:250}),
      })
      const data=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Email feedback sync failed')
      setFeedbackReport(data.feedback)
      toast.success(`Email feedback: ${data.feedback.responded} new repl${data.feedback.responded===1?'y':'ies'} detected.`)
    }catch(error){
      toast.error(error instanceof Error?error.message:'Email feedback sync failed')
    }finally{
      setSyncingFeedback(false)
    }
  }

  const selectChannel=(next:ProspectChannel)=>{
    setChannel(next)
    setSelectedContacts([])
  }

  const toggleContact=(id:string)=>{
    setSelectedContacts(prev=>prev.includes(id)?prev.filter(item=>item!==id):[...prev,id])
  }

  return (
    <WeaveSystemRoom
      roomKey="administration-prospect-engine"
      eyebrow="Administration · Prospect Engine"
      title="One Prospect engine · two outreach channels"
      detail="WhatsApp and email share one inventory, one audit chain and one Client crossing. Email candidates are cryptographically deduplicated and package at half the WhatsApp unit price."
      tone="amber"
      pulse={runningEmail?'Email movement active':isGenerating||isAddingEmails?'Prospect intake active':isPackaging?'Packaging selected Prospects':'Prospect Engine ready'}
      left={
        <div className="space-y-6">
          <section className="border-l border-amber-300/25 pl-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Channel</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" variant={channel==='whatsapp'?'default':'outline'} onClick={()=>selectChannel('whatsapp')} className={channel==='whatsapp'?'bg-orange-600':'border-white/10'}><PhoneCall className="mr-2 h-4 w-4"/>WhatsApp</Button>
              <Button type="button" variant={channel==='email'?'default':'outline'} onClick={()=>selectChannel('email')} className={channel==='email'?'bg-sky-600':'border-white/10'}><Mail className="mr-2 h-4 w-4"/>Email</Button>
            </div>
          </section>

          {channel==='whatsapp'?(
            <section className="border-l border-orange-300/25 pl-4">
              <div className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-orange-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-orange-300">Number series</p></div>
              <form onSubmit={handleGenerate} className="mt-4 space-y-4">
                <label className="block space-y-2"><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Source number</span><Input value={sourceNumber} onChange={e=>setSourceNumber(e.target.value)} className="border-white/10 bg-black/20 font-mono text-white"/></label>
                <label className="block space-y-2"><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Count</span><Input type="number" value={count} onChange={e=>setCount(e.target.value)} className="border-white/10 bg-black/20 text-white"/></label>
                <Button type="submit" className="w-full bg-orange-600 font-black uppercase" disabled={isGenerating}>{isGenerating?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Zap className="mr-2 h-4 w-4"/>}Run agent</Button>
              </form>
            </section>
          ):(
            <>
              <section className="border-l border-sky-300/25 pl-4">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-sky-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">Email Prospect intake</p></div>
                <p className="mt-2 text-[10px] leading-5 text-slate-500">Enter real candidate addresses from an authorized source. WEAVE fingerprints them cryptographically so duplicates cannot be sold twice.</p>
                <textarea value={emailInput} onChange={e=>setEmailInput(e.target.value)} placeholder="prospect@example.com&#10;another@example.com" rows={6} className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-xs text-white outline-none"/>
                <Button type="button" onClick={handleAddEmails} disabled={isAddingEmails||!emailInput.trim()} className="mt-3 w-full bg-sky-600 font-black uppercase">{isAddingEmails?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Zap className="mr-2 h-4 w-4"/>}Add email Prospects</Button>
              </section>

              <section className="border-l border-emerald-300/25 pl-4">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Administration sender</p></div>
                <p className="mt-2 text-[10px] leading-5 text-slate-500">The same authenticated Google transport powers outreach and forgotten-password codes. The protected system mailbox remains primary for recovery; this verified Administration mailbox can serve as its Google fallback.</p>
                <Input value={mailboxEmail} onChange={e=>setMailboxEmail(e.target.value)} placeholder="weavebridge@gmail.com" className="mt-3 border-white/10 bg-black/20 text-white"/>
                <Input type="password" value={mailboxPassword} onChange={e=>setMailboxPassword(e.target.value)} placeholder="Google app password" className="mt-2 border-white/10 bg-black/20 text-white"/>
                <Button type="button" onClick={connectMailbox} disabled={connectingMailbox||!mailboxEmail.trim()||!mailboxPassword.trim()} className="mt-2 w-full bg-emerald-700 font-black uppercase">{connectingMailbox?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<ShieldCheck className="mr-2 h-4 w-4"/>}{mailbox?.status==='connected'?'Reconnect Google':'Authenticate Google'}</Button>
                {mailbox?.status==='connected'&&<div className="mt-3 border-y border-emerald-300/15 py-3 text-[10px] text-emerald-200"><p className="font-black">{mailbox.email}</p><p className="mt-1 text-slate-500">Authenticated {mailbox.verified_at?new Date(mailbox.verified_at).toLocaleString():''}</p></div>}
                <div className="mt-3 grid grid-cols-[88px_1fr] gap-2">
                  <Input type="number" min={1} max={250} value={emailRunLimit} onChange={e=>setEmailRunLimit(e.target.value)} className="border-white/10 bg-black/20 text-white" aria-label="Email daily run limit"/>
                  <Button type="button" onClick={runEmailMovement} disabled={runningEmail||mailbox?.status!=='connected'} className="bg-sky-700 font-black uppercase">{runningEmail?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Send className="mr-2 h-4 w-4"/>}Run email movement</Button>
                </div>
                <p className="mt-1 text-[9px] text-slate-600">Run size · 1–250. Automatic Flame Event movement uses the configured daily limit.</p>
                {emailReport&&<p className="mt-2 text-[10px] text-slate-400">Queued {emailReport.queued} · Sent {emailReport.sent} · Failed {emailReport.failed}</p>}
                <Button type="button" variant="outline" onClick={syncEmailFeedback} disabled={syncingFeedback||mailbox?.status!=='connected'} className="mt-3 w-full border-emerald-300/20 text-emerald-200">{syncingFeedback?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<RefreshCw className="mr-2 h-4 w-4"/>}Sync Google feedback</Button>
                {feedbackReport&&<p className="mt-2 text-[10px] text-slate-400">Checked {feedbackReport.checked} sent messages · {feedbackReport.responded} replies detected · {feedbackReport.mailboxes} mailbox{feedbackReport.mailboxes===1?'':'es'}</p>}
              </section>
            </>
          )}

          <section className="border-l border-blue-300/20 pl-4">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-300"/><p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">Inventory</p></div>
            <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
              <div className="flex items-center justify-between py-3"><span className="text-[10px] font-bold uppercase text-slate-500">Available</span><span className="text-lg font-black text-white">{visibleContacts.length}</span></div>
              <div className="flex items-center justify-between py-3"><span className="text-[10px] font-bold uppercase text-blue-300">Selected</span><span className="text-lg font-black text-blue-300">{selectedContacts.length}</span></div>
            </div>
            <Button onClick={handlePackage} disabled={selectedContacts.length===0||isPackaging} className="mt-4 w-full bg-blue-600 font-black uppercase">{isPackaging?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Package className="mr-2 h-4 w-4"/>}Create {channel==='email'?'email':'WhatsApp'} package</Button>
          </section>
        </div>
      }
      center={
        <section data-prospect-pool>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Prospect Pool · {channel}</p>
              <h2 className="mt-1 text-xl font-black text-white">{channel==='email'?'Email Prospect inventory':'WhatsApp Prospect inventory'}</h2>
              <p className="mt-1 text-[10px] text-slate-500">{channel==='email'?'Email packages default to 0.55 Flame Coin per Prospect — half the WhatsApp unit price.':'WhatsApp packages default to 1.10 Flame Coin per Prospect.'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAvailable} className="border-white/10 text-slate-300"><RefreshCw className="mr-1 h-3 w-3"/>Refresh</Button>
          </div>

          {isLoading?(
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-700"/></div>
          ):(
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-white/10">
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Contact</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Channel</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Added</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleContacts.length===0?(
                    <TableRow><TableCell colSpan={5} className="py-20 text-center text-xs text-slate-500">No available {channel} Prospects.</TableCell></TableRow>
                  ):visibleContacts.map(contact=>(
                    <TableRow key={contact.id} className={`cursor-pointer border-white/[0.07] transition hover:bg-amber-300/[0.025] ${selectedContacts.includes(contact.id)?'bg-blue-500/[0.06]':''}`} onClick={()=>toggleContact(contact.id)}>
                      <TableCell><div className={`flex h-4 w-4 items-center justify-center border border-slate-600 ${selectedContacts.includes(contact.id)?'border-blue-500 bg-blue-500':''}`}>{selectedContacts.includes(contact.id)&&<CheckCircle2 className="h-3 w-3 text-white"/>}</div></TableCell>
                      <TableCell className="font-mono text-xs text-white">{channel==='email'?contact.email:contact.phone}</TableCell>
                      <TableCell><Badge variant="outline" className={channel==='email'?'border-sky-500/20 bg-sky-500/5 text-[8px] uppercase text-sky-400':'border-orange-500/20 bg-orange-500/5 text-[8px] uppercase text-orange-400'}>{channel}</Badge></TableCell>
                      <TableCell className="font-mono text-[9px] text-slate-500">{new Date(contact.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="outline" className="border-green-500/20 bg-green-500/5 text-[8px] uppercase text-green-500">Available</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      }
      right={
        <section className="border-l border-emerald-300/20 pl-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">One movement</p>
          <div className="mt-3 space-y-2 text-[10px] leading-5 text-slate-400">
            <p>Intake → cryptographic identity.</p>
            <p>Package → one channel and one price.</p>
            <p>Purchase → atomic Flame Coin debit.</p>
            <p>Send → authenticated sender.</p>
            <p>Report → Administration outreach registry.</p>
            <p>Conversion → Client crossing.</p>
          </div>
        </section>
      }
    />
  )
}

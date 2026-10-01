'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  Send,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'

import { DailyProspectClaim } from '@/components/bridger/daily-prospect-claim'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAuthHeaders } from '@/lib/auth-client'
import { useAuth } from '@/lib/auth-provider'

type ProspectChannel='whatsapp'|'email'

interface ProspectPackage {
  id:string
  title:string
  description:string
  price_trx:string
  channel:ProspectChannel
  created_at:string
}

interface MyProspect {
  outreachId:string
  status:'pending'|'sent'|'responded'|'opened'|'converted'|'invalid_number'|'unsubscribed'
  channel:ProspectChannel
  messageSent:string
  deliveryError:string|null
  sentAt:string|null
  lastActivityAt:string
  name:string|null
  prospectEmail:string|null
  prospectWhatsapp:string|null
  phone:string|null
  bridgeUrl:string|null
}

interface Mailbox {
  id:string
  email:string
  provider:string
  status:string
  verified_at:string|null
  last_sent_at:string|null
}

const STATUS_LABEL:Record<string,{label:string;color:string}>={
  pending:{label:'Ready for outreach',color:'bg-slate-500/10 text-slate-400 border-slate-500/20'},
  sent:{label:'Message sent',color:'bg-blue-500/10 text-blue-400 border-blue-500/20'},
  opened:{label:'Opened Bridge',color:'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'},
  responded:{label:'Active response',color:'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'},
  converted:{label:'Converted — Client',color:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'},
  invalid_number:{label:'WhatsApp unavailable',color:'bg-red-500/10 text-red-400 border-red-500/20'},
  unsubscribed:{label:'Outreach ended',color:'bg-slate-500/10 text-slate-500 border-slate-500/20'},
}

export default function ProspectMarketPage(){
  const {user,updateBalance}=useAuth()
  const [tab,setTab]=useState<'browse'|'mine'>('browse')
  const [packages,setPackages]=useState<ProspectPackage[]>([])
  const [isLoading,setIsLoading]=useState(true)
  const [purchasingId,setPurchasingId]=useState<string|null>(null)

  const [myProspects,setMyProspects]=useState<MyProspect[]>([])
  const [whatsappNumber,setWhatsappNumber]=useState('')
  const [numberInput,setNumberInput]=useState('')
  const [mineLoading,setMineLoading]=useState(true)
  const [savingNumber,setSavingNumber]=useState(false)
  const [sendingId,setSendingId]=useState<string|null>(null)
  const [reportingId,setReportingId]=useState<string|null>(null)

  const [mailbox,setMailbox]=useState<Mailbox|null>(null)
  const [mailboxEmail,setMailboxEmail]=useState('')
  const [mailboxPassword,setMailboxPassword]=useState('')
  const [connectingMailbox,setConnectingMailbox]=useState(false)

  useEffect(()=>{void fetchPackages()},[])
  useEffect(()=>{if(tab==='mine')void Promise.all([fetchMine(),loadMailbox()])},[tab])

  const fetchPackages=async()=>{
    setIsLoading(true)
    try{
      const res=await fetch('/api/market/prospects',{headers:getAuthHeaders(),cache:'no-store'})
      const data=await res.json()
      if(data.success)setPackages(data.packages)
    }catch{
      toast.error('Failed to load Prospect Market')
    }finally{
      setIsLoading(false)
    }
  }

  const fetchMine=async()=>{
    setMineLoading(true)
    try{
      const res=await fetch('/api/bridger/prospects',{headers:getAuthHeaders(),cache:'no-store'})
      const data=await res.json()
      if(data.success){
        setMyProspects(data.prospects)
        setWhatsappNumber(data.whatsappNumber||'')
        setNumberInput(data.whatsappNumber||'')
      }
    }catch{
      toast.error('Failed to load your Prospects')
    }finally{
      setMineLoading(false)
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

  const handlePurchase=async(packageId:string)=>{
    setPurchasingId(packageId)
    try{
      const res=await fetch('/api/market/prospects/purchase',{
        method:'POST',
        headers:getAuthHeaders(),
        body:JSON.stringify({packageId}),
      })
      const data=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Purchase failed')
      if(typeof data.newBalance==='number')updateBalance(data.newBalance)
      toast.success('Prospect package purchased and Flame Coin debit recorded.')
      await fetchPackages()
    }catch(error){
      toast.error(error instanceof Error?error.message:'Prospect purchase failed')
    }finally{
      setPurchasingId(null)
    }
  }

  const handleSaveNumber=async()=>{
    if(!numberInput.trim())return
    setSavingNumber(true)
    try{
      const res=await fetch('/api/bridger/prospects',{
        method:'PATCH',
        headers:getAuthHeaders(),
        body:JSON.stringify({whatsappNumber:numberInput.trim()}),
      })
      const data=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Unable to save WhatsApp number')
      setWhatsappNumber(data.whatsappNumber)
      toast.success('WhatsApp sender saved')
    }catch(error){
      toast.error(error instanceof Error?error.message:'Unable to save WhatsApp number')
    }finally{
      setSavingNumber(false)
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
      toast.success('Google outreach mailbox authenticated')
    }catch(error){
      toast.error(error instanceof Error?error.message:'Google authentication failed')
    }finally{
      setConnectingMailbox(false)
    }
  }

  const handleReportInvalid=async(p:MyProspect)=>{
    setReportingId(p.outreachId)
    try{
      const res=await fetch(`/api/bridger/prospects/${p.outreachId}/report-invalid`,{
        method:'POST',
        headers:getAuthHeaders(),
      })
      const data=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Failed to report Prospect')
      toast.success(data.message||'Prospect report recorded')
      await fetchMine()
    }catch(error){
      toast.error(error instanceof Error?error.message:'Failed to report Prospect')
    }finally{
      setReportingId(null)
    }
  }

  const handleSend=async(p:MyProspect)=>{
    if(p.channel==='email'){
      if(mailbox?.status!=='connected'){
        toast.error('Authenticate your Google outreach mailbox first')
        return
      }
      setSendingId(p.outreachId)
      try{
        const res=await fetch(`/api/bridger/prospects/${p.outreachId}/email`,{
          method:'POST',
          headers:getAuthHeaders(),
        })
        const data=await res.json()
        if(!res.ok||!data.success)throw new Error(data.error||'Email send failed')
        toast.success('Email sent and reported to WEAVE')
        await Promise.all([fetchMine(),loadMailbox()])
      }catch(error){
        toast.error(error instanceof Error?error.message:'Email send failed')
      }finally{
        setSendingId(null)
      }
      return
    }

    if(!whatsappNumber){
      toast.error('Add your WhatsApp sender first')
      return
    }
    setSendingId(p.outreachId)
    try{
      const target=(p.prospectWhatsapp||p.phone||'').replace(/[^\d+]/g,'')
      const waUrl=`https://wa.me/${target.replace('+','')}?text=${encodeURIComponent(p.messageSent)}`
      window.open(waUrl,'_blank')

      const res=await fetch(`/api/bridger/prospects/${p.outreachId}/send`,{
        method:'POST',
        headers:getAuthHeaders(),
      })
      const data=await res.json()
      if(!res.ok||!data.success)throw new Error(data.error||'Failed to report WhatsApp send')
      toast.success('WhatsApp movement marked as sent')
      await fetchMine()
    }catch(error){
      toast.error(error instanceof Error?error.message:'WhatsApp send failed')
    }finally{
      setSendingId(null)
    }
  }

  const handleSendBridge=(p:MyProspect)=>{
    if(p.channel!=='whatsapp')return
    if(!whatsappNumber)return toast.error('Add your WhatsApp sender first')
    if(!p.bridgeUrl)return toast.error('Create or activate Bridge AI before this handoff')
    const target=(p.prospectWhatsapp||p.phone||'').replace(/[^\d+]/g,'')
    const message=`I've opened your WEAVE Bridge. Enter with the movement we were discussing; you do not need to understand every part of WEAVE at once. ${p.bridgeUrl}`
    window.open(`https://wa.me/${target.replace('+','')}?text=${encodeURIComponent(message)}`,'_blank')
  }

  return (
    <div className="container mx-auto space-y-8 py-10">
      {user?.role==='bridger'&&<DailyProspectClaim/>}

      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-blue-600 p-3 shadow-lg shadow-blue-900/20"><ShoppingCart className="h-8 w-8 text-white"/></div>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Prospect Market</h1>
            <p className="font-medium text-slate-400">One Prospect movement. WhatsApp or email. One Client crossing.</p>
          </div>
        </div>
        <Card className="shrink-0 border-slate-700 bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="flex items-center gap-3 p-4">
            <Wallet className="h-5 w-5 text-[#e8b93f]"/>
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your Balance</p><p className="text-lg font-black text-white">{user?.platform_wallet_balance?.toFixed(2)||'0.00'} <span className="text-xs text-[#e8b93f]">Flame Coin</span></p></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-slate-800">
        <button onClick={()=>setTab('browse')} className={`px-4 py-2 text-sm font-bold uppercase tracking-tight ${tab==='browse'?'border-b-2 border-blue-400 text-blue-400':'text-slate-500'}`}>Browse Prospects</button>
        <button onClick={()=>setTab('mine')} className={`flex items-center gap-1 px-4 py-2 text-sm font-bold uppercase tracking-tight ${tab==='mine'?'border-b-2 border-blue-400 text-blue-400':'text-slate-500'}`}><Users className="h-3 w-3"/>My Prospects</button>
      </div>

      {tab==='browse'?(
        <>
          {isLoading?(
            <div className="flex justify-center py-40"><Loader2 className="h-12 w-12 animate-spin text-blue-500 opacity-20"/></div>
          ):(
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {packages.length===0?(
                <div className="col-span-full space-y-4 py-40 text-center"><Package className="mx-auto h-16 w-16 text-slate-800"/><p className="font-medium italic text-slate-500">No Prospect packages available.</p></div>
              ):packages.map(pkg=>(
                <Card key={pkg.id} className="flex flex-col border-slate-700 bg-slate-900/50 backdrop-blur-xl transition-colors hover:border-blue-500/50">
                  <CardHeader>
                    <div className="mb-2 flex items-start justify-between">
                      <Badge className={pkg.channel==='email'?'border-sky-500/20 bg-sky-500/10 text-[9px] font-black uppercase text-sky-400':'border-orange-500/20 bg-orange-500/10 text-[9px] font-black uppercase text-orange-400'}>{pkg.channel==='email'?'Email Prospect':'WhatsApp Prospect'}</Badge>
                      <span className="font-mono text-[10px] text-slate-500">{new Date(pkg.created_at).toLocaleDateString()}</span>
                    </div>
                    <CardTitle className="text-xl font-black italic text-white">{pkg.title}</CardTitle>
                    <CardDescription className="text-xs text-slate-400">{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                      <div className="mb-2 flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500"/><span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Cryptographically deduplicated candidate</span></div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500"/><span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{pkg.channel==='email'?'Half-price email Prospect movement':'WhatsApp Prospect movement'}</span></div>
                    </div>
                    <div className="flex items-baseline gap-1"><span className="text-3xl font-black text-white">{pkg.price_trx}</span><span className="text-xs font-black uppercase tracking-widest text-[#e8b93f]">Flame Coin</span></div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button className="w-full bg-blue-600 font-black uppercase tracking-tighter text-white hover:bg-blue-700" disabled={purchasingId===pkg.id} onClick={()=>handlePurchase(pkg.id)}>
                      {purchasingId===pkg.id?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<ShoppingCart className="mr-2 h-4 w-4"/>}
                      Purchase · debit Flame Coin
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          <div className="flex items-start gap-4 rounded-2xl border border-blue-900/20 bg-blue-900/10 p-6">
            <AlertCircle className="h-6 w-6 shrink-0 text-blue-400"/>
            <div className="space-y-1"><p className="text-sm font-bold uppercase tracking-tight text-blue-400">Prospect movement</p><p className="text-xs leading-relaxed text-slate-400">Purchase is the debit point. Email Prospect packages use half the WhatsApp unit price. Contact details are available only after assignment, and every send is tied to the purchasing Bridger and recorded in Administration.</p></div>
          </div>
        </>
      ):(
        <div className="space-y-6">
          <div className="border-y border-amber-300/15 bg-amber-300/[.035] px-4 py-4 sm:px-5">
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-amber-200">Before outreach</p>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">The Crossing Notebook remains the Bridger manual. WhatsApp begins human-first. Email Prospect movement uses the approved Flame Event File Folder message and records the send automatically.</p>
            <Link href="/bridger/crossing-notebook" className="mt-3 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-amber-100"><BookOpen className="h-3.5 w-3.5"/>Open Crossing Notebook</Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-slate-700 bg-slate-900/50">
              <CardHeader><CardTitle className="text-sm">WhatsApp sender</CardTitle><CardDescription className="text-xs">Used only for WhatsApp Prospects.</CardDescription></CardHeader>
              <CardContent className="flex gap-2">
                <Input value={numberInput} onChange={e=>setNumberInput(e.target.value)} placeholder="+1 555 000 0000" className="border-slate-700 bg-slate-800 text-white"/>
                <Button onClick={handleSaveNumber} disabled={savingNumber||!numberInput.trim()} className="bg-blue-600 hover:bg-blue-700">{savingNumber?<Loader2 className="h-4 w-4 animate-spin"/>:'Save'}</Button>
              </CardContent>
            </Card>

            <Card className="border-sky-300/15 bg-sky-400/[0.035]">
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-sky-300"/>Email sender</CardTitle><CardDescription className="text-xs">Authenticate the Google mailbox you want WEAVE to use for your email Prospects.</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                <Input value={mailboxEmail} onChange={e=>setMailboxEmail(e.target.value)} placeholder="yourname@gmail.com" className="border-slate-700 bg-slate-800 text-white"/>
                <Input type="password" value={mailboxPassword} onChange={e=>setMailboxPassword(e.target.value)} placeholder="Google app password" className="border-slate-700 bg-slate-800 text-white"/>
                <Button onClick={connectMailbox} disabled={connectingMailbox||!mailboxEmail.trim()||!mailboxPassword.trim()} className="w-full bg-sky-700 hover:bg-sky-800">{connectingMailbox?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<ShieldCheck className="mr-2 h-4 w-4"/>}{mailbox?.status==='connected'?'Reconnect Google':'Authenticate Google'}</Button>
                {mailbox?.status==='connected'&&<p className="text-[10px] text-emerald-300">Connected · {mailbox.email}{mailbox.last_sent_at?` · last send ${new Date(mailbox.last_sent_at).toLocaleString()}`:''}</p>}
              </CardContent>
            </Card>
          </div>

          {mineLoading?(
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-700"/></div>
          ):myProspects.length===0?(
            <div className="py-20 text-center text-sm text-slate-500">No Prospects assigned yet.</div>
          ):(
            <div className="space-y-3">
              {myProspects.map(p=>{
                const st=STATUS_LABEL[p.status]||STATUS_LABEL.pending
                const contact=p.channel==='email'?p.prospectEmail:(p.prospectWhatsapp||p.phone)
                const sendDisabled=sendingId===p.outreachId||(p.channel==='email'?mailbox?.status!=='connected':!whatsappNumber)
                return (
                  <Card key={p.outreachId} className="border-slate-700 bg-slate-900/50">
                    <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-white">{p.name||'Prospect'}</p><Badge variant="outline" className={p.channel==='email'?'border-sky-400/20 text-sky-300':'border-orange-400/20 text-orange-300'}>{p.channel}</Badge></div>
                        <p className="mt-1 break-all text-xs text-slate-500">{contact}</p>
                        <Badge variant="outline" className={`mt-2 text-[10px] ${st.color}`}>{st.label}</Badge>
                        {p.deliveryError&&<p className="mt-2 text-[10px] text-rose-300">{p.deliveryError}</p>}
                      </div>

                      {p.status==='pending'?(
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={sendDisabled} onClick={()=>handleSend(p)} className={p.channel==='email'?'bg-sky-700 hover:bg-sky-800':'bg-blue-600 hover:bg-blue-700'}>
                            {sendingId===p.outreachId?<Loader2 className="mr-1 h-3 w-3 animate-spin"/>:p.channel==='email'?<Mail className="mr-1 h-3 w-3"/>:<Send className="mr-1 h-3 w-3"/>}
                            {p.channel==='email'?'Email & report':'Send first message'}
                          </Button>
                          {p.channel==='whatsapp'&&<Button size="sm" variant="outline" disabled={reportingId===p.outreachId} onClick={()=>handleReportInvalid(p)} className="border-red-500/30 text-red-400 hover:bg-red-500/10">{reportingId===p.outreachId?<Loader2 className="h-3 w-3 animate-spin"/>:'Not on WhatsApp?'}</Button>}
                        </div>
                      ):p.status==='converted'?(
                        <CheckCircle2 className="h-5 w-5 text-emerald-400"/>
                      ):p.status==='sent'&&p.channel==='whatsapp'?(
                        <Button size="sm" variant="outline" disabled={!p.bridgeUrl||!whatsappNumber} onClick={()=>handleSendBridge(p)} className="border-amber-300/30 text-amber-200 hover:bg-amber-300/10"><MessageCircle className="mr-1 h-3 w-3"/>Send Bridge When Ready</Button>
                      ):(
                        <MessageCircle className="h-5 w-5 text-slate-500"/>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,CheckCircle2,MessageCircle,RefreshCw,Send,ShieldCheck,Smartphone,Unplug} from 'lucide-react'

type Channel={id:string;phoneNumber:string;verifiedName:string;status:string}
type Thread={id:string;remote_wa_id:string;display_name:string|null;last_inbound_at:string|null;
 last_message_at:string;reply_allowed:boolean;preview:string|null}
type Message={id:string;direction:'inbound'|'outbound';message_type:string;body:string;
 delivery_status:string;created_at:string}
type MetaSdk={init:(args:Record<string,unknown>)=>void;
 login:(callback:(result:{authResponse?:{code?:string}})=>void,args:Record<string,unknown>)=>void}
type MetaWindow=Window&{FB?:MetaSdk}
type PendingMeta={code?:string;wabaId?:string;phoneNumberId?:string}
const CHANNEL_API='/api/bridger/hope-whatsapp'
const INBOX=CHANNEL_API+'/messages'

export default function HopeWhatsappWorkboard(){
 const [channel,setChannel]=useState<Channel|null>(null)
 const [configured,setConfigured]=useState(false)
 const [appId,setAppId]=useState('')
 const [configId,setConfigId]=useState('')
 const [metaReady,setMetaReady]=useState(false)
 const [threads,setThreads]=useState<Thread[]>([])
 const [messages,setMessages]=useState<Message[]>([])
 const [selected,setSelected]=useState('')
 const [draft,setDraft]=useState('')
 const [pin,setPin]=useState('')
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const pending=useRef<PendingMeta>({})
 const connecting=useRef(false)
 const refreshSettings=useCallback(async()=>{
  const response=await fetch(CHANNEL_API,{cache:'no-store'})
  const body=await response.json()
  if(!response.ok)throw new Error(body.error||'Unable to read WhatsApp connection status.')
  setChannel(body.channel);setConfigured(Boolean(body.configured))
  setAppId(body.appId||'');setConfigId(body.configId||'')
 },[])
 const refreshThreads=useCallback(async(id?:string)=>{
  const response=await fetch(INBOX+(id?'?threadId='+encodeURIComponent(id):''),{cache:'no-store'})
  const body=await response.json()
  if(!response.ok)throw new Error(body.error||'Unable to read messages.')
  setThreads(body.threads||[])
  if(id)setMessages(body.messages||[])
 },[])
 useEffect(()=>{
  let stopped=false
  const start=async()=>{
   try{await refreshSettings();if(!stopped)await refreshThreads()}
   catch(e){if(!stopped)setError(e instanceof Error?e.message:'Unable to open your workspace')}
   finally{if(!stopped)setLoading(false)}
  }
  void start()
  return()=>{stopped=true}
 },[refreshSettings,refreshThreads])
 useEffect(()=>{
  if(!channel||channel.status!=='connected')return
  const tick=()=>{if(document.visibilityState==='visible')void refreshThreads(selected||undefined).catch(()=>{})}
  const timer=window.setInterval(tick,12000)
  window.addEventListener('focus',tick)
  return()=>{window.clearInterval(timer);window.removeEventListener('focus',tick)}
 },[channel?.status,selected,refreshThreads])
 useEffect(()=>{
  if(!configured||!appId)return
  let stopped=false
  const sdkWindow=window as MetaWindow
  function ready(){
   if(stopped)return
   if(!sdkWindow.FB)return
   sdkWindow.FB.init({appId,cookie:true,xfbml:false,version:'v25.0'})
   setMetaReady(true)
  }
  const old=document.getElementById('hope-meta-sdk')
  if(old){ready();return}
  const script=document.createElement('script')
  script.id='hope-meta-sdk';script.src='https://connect.facebook.net/en_US/sdk.js'
  script.async=true;script.crossOrigin='anonymous'
  script.onload=ready
  script.onerror=()=>{if(!stopped)setError('Meta signup could not load. Check your connection or browser settings.')}
  document.body.appendChild(script)
  return()=>{stopped=true}
 },[configured,appId])

 const finishMeta=useCallback(async()=>{
  const {code,wabaId,phoneNumberId}=pending.current
  if(!code||!wabaId||connecting.current)return
  connecting.current=true;setBusy(true);setError('');setNotice('')
  try{
   const response=await fetch(CHANNEL_API,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'connect',code,wabaId,phoneNumberId})})
   const body=await response.json()
   if(!response.ok)throw new Error(body.error||'Meta did not authorize this number.')
   pending.current={}
   setNotice('Meta confirmed number ownership. Continue the connection steps shown below.')
   await refreshSettings()
   await refreshThreads()
  }catch(e){setError(e instanceof Error?e.message:'Meta connection did not complete')}
  finally{connecting.current=false;setBusy(false)}
 },[refreshSettings,refreshThreads])
 useEffect(()=>{
  if(!configured)return
  const receive=(event:MessageEvent)=>{
   try{
    const origin=new URL(event.origin)
    if(origin.protocol!=='https:'||!/(^|\.)facebook\.com$/.test(origin.hostname))return
    const payload=typeof event.data==='string'?JSON.parse(event.data):event.data
    if(payload?.type!=='WA_EMBEDDED_SIGNUP')return
    if(!['FINISH','FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'].includes(payload.event))return
    pending.current={...pending.current,wabaId:String(payload.data?.waba_id||''),
     phoneNumberId:String(payload.data?.phone_number_id||'')}
    void finishMeta()
   }catch{/* Ignore unrelated messages from other browser windows. */}
  }
  window.addEventListener('message',receive)
  return()=>window.removeEventListener('message',receive)
 },[configured,finishMeta])

 const startMeta=()=>{
  const fb=(window as MetaWindow).FB
  if(!fb||!configId)return setError('Official Meta signup is not available yet.')
  pending.current={}
  setError('');setNotice('In Meta’s window, verify the number you control by SMS or voice. Enter that one-time code with Meta, not in Weave.')
  fb.login(response=>{
   const code=response.authResponse?.code
   if(!code){setError('Meta signup was cancelled or not authorized.');return}
   pending.current={...pending.current,code}
   void finishMeta()
   if(!pending.current.wabaId)setNotice('Complete the WhatsApp Business number selection and verification in Meta’s signup window.')
  },{config_id:configId,response_type:'code',override_default_response_type:true,
   extras:{setup:{},featureType:'whatsapp_embedded_signup',sessionInfoVersion:'3'}})
 }
 async function act(action:'register'|'disconnect'|'refresh_registration'){
  setBusy(true);setError('');setNotice('')
  try{
   const response=await fetch(CHANNEL_API,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action,pin:action==='register'?pin:undefined})})
   const body=await response.json()
   if(!response.ok)throw new Error(body.error||'Action failed')
   setPin('')
   setNotice(action==='register'?'Meta confirmed this number is registered. Your inbox can now receive conversations.':
    action==='refresh_registration'?'Meta registration status checked. If the account is still pending, finish Meta registration or contact Administrations.':
    'This Weave connection is disabled. Its existing message records are retained.')
   await refreshSettings();if(action==='register'||action==='refresh_registration')await refreshThreads()
  }catch(e){setError(e instanceof Error?e.message:'Unable to complete action')}
  finally{setBusy(false)}
 }
 async function selectThread(id:string){
  setSelected(id);setError('')
  try{await refreshThreads(id)}catch(e){setError(e instanceof Error?e.message:'Conversation unavailable')}
 }
 async function send(){
  if(!selected||!draft.trim())return
  setBusy(true);setError('');setNotice('')
  try{
   const response=await fetch(INBOX,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({threadId:selected,text:draft.trim(),clientRequestId:crypto.randomUUID()})})
   const body=await response.json()
   if(!response.ok)throw new Error(body.error||'WhatsApp send failed.')
   setDraft('')
   await refreshThreads(selected)
  }catch(e){setError(e instanceof Error?e.message:'Send failed')}
  finally{setBusy(false)}
 }
 const thread=threads.find(t=>t.id===selected)
 return <main data-hope-whatsapp-workboard="true" className="min-h-screen bg-[#f7f4ed] px-4 pb-20 pt-7 text-[#253442] sm:px-8">
  <div className="mx-auto max-w-6xl space-y-6">
   <header className="rounded-3xl border border-[#d8c69f] bg-gradient-to-br from-[#fffcf6] via-[#f5ecd7] to-[#dcebec] p-6 shadow-sm sm:p-9">
    <Link href="/bridger" className="inline-flex items-center gap-2 text-sm font-semibold text-[#785c28]"><ArrowLeft size={17}/> Hope workplace</Link>
    <p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-[#927135]">Hope · Personal specialized workshop</p>
    <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">WhatsApp Workboard</h1>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#52626a]">Connect your authorized WhatsApp Business number through Meta, receive replies and continue genuine prospect conversations inside Weave without opening a WhatsApp app for supported messages.</p>
    <div className="mt-4 flex flex-wrap gap-2">
     <Link href="/weave/market/prospects?tab=mine" className="rounded-full border border-[#beac86] bg-white/80 px-4 py-2 text-sm font-semibold">My Prospects</Link>
     <Link href="/bridger/bridge-ai" className="rounded-full border border-[#beac86] bg-white/80 px-4 py-2 text-sm font-semibold">Bridge AI</Link>
     <Link href="/bridger/numbers" className="rounded-full border border-[#beac86] bg-white/80 px-4 py-2 text-sm font-semibold">Number Bay</Link>
    </div>
   </header>
   {error&&<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
   {notice&&<p role="status" className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">{notice}</p>}
   {loading?<section role="status" className="rounded-2xl border border-[#d4c29d] bg-white p-6">Checking your private WhatsApp connection…</section>:
   <section className="rounded-2xl border border-[#d4c29d] bg-white p-5 sm:p-7" data-hope-whatsapp-status={channel?.status||'not-connected'}>
    <div className="flex flex-wrap items-start justify-between gap-4">
     <div><p className="text-xs font-semibold uppercase tracking-widest text-[#927135]">Your business number</p>
      <h2 className="mt-2 text-xl font-bold">{channel?.phoneNumber||'Connect a number you own'}</h2>
      <p className="mt-1 text-sm text-[#617078]">{channel?.verifiedName||'Meta Business Platform · authorized accounts only'}</p></div>
     <span className="inline-flex items-center gap-2 rounded-full bg-[#edf3f1] px-3 py-2 text-xs font-bold">
      {channel?.status==='connected'?<CheckCircle2 size={16}/>:<Smartphone size={16}/>}
      {channel?.status==='connected'?'Connected':channel?.status==='pending_registration'?'Complete Meta registration':'Not connected'}
     </span>
    </div>
    {!configured?<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
     Administrations must configure a Meta-approved Business Platform app, Embedded Signup, the public webhook and encrypted token storage before live registration is available. This board cannot issue its own WhatsApp SMS code.</div>:
    channel?.status==='pending_registration'?<div className="mt-5 space-y-3 rounded-xl bg-[#f5f7f4] p-5">
     <h3 className="font-bold">Finish WhatsApp Business Platform registration</h3>
     <p className="text-sm leading-6 text-[#52626a]">Meta has authorized this business number, but its Cloud API registration is not confirmed. Enter a six-digit <strong>business two-step verification PIN you choose</strong> here, not the SMS ownership code. For coexistence numbers already registered, consult Administrations if Meta reports registration is unnecessary.</p>
     <label className="block text-sm font-semibold">Two-step registration PIN
      <input value={pin} onChange={e=>setPin(e.target.value.replace(/[^0-9]/g,'').slice(0,6))}
       type="password" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="6-digit PIN"
       className="mt-2 block w-full max-w-xs rounded-lg border border-[#cdbb98] p-3"/></label>
     <button disabled={busy||pin.length!==6} onClick={()=>void act('register')}
      className="rounded-lg bg-[#183f49] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Register through Meta</button>
     <button disabled={busy} onClick={()=>void act('refresh_registration')} className="ml-0 rounded-lg border border-[#c4d4d0] px-5 py-3 text-sm font-semibold text-[#214a4a] sm:ml-3">Check Meta connection status</button>
    </div>:channel?.status!=='connected'?<div className="mt-5 space-y-4">
     <p className="text-sm leading-7 text-[#52626a]">Meta will ask you to sign in to your Business Portfolio, select a WhatsApp Business number and verify ownership using an SMS or voice call. Complete the SMS code <strong>inside Meta’s window</strong>. Numbers already used in a personal WhatsApp account may need to migrate; eligible WhatsApp Business app numbers may use Meta coexistence.</p>
     <button disabled={!metaReady||busy} onClick={startMeta}
      className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#183f49] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
      <ShieldCheck size={18}/> {metaReady?'Connect with Meta · SMS/voice verification':'Loading official Meta signup…'}
     </button>
    </div>:<div className="mt-5 flex flex-wrap items-center gap-3">
     <p className="flex items-center gap-2 text-sm text-[#226451]"><CheckCircle2 size={18}/> This number can use the Weave WhatsApp inbox.</p>
     <button disabled={busy} onClick={()=>void act('disconnect')} className="inline-flex items-center gap-2 rounded-lg border border-[#c9d0ce] px-3 py-2 text-xs font-semibold"><Unplug size={14}/> Disconnect Weave access</button>
    </div>}
   </section>}
   {channel?.status==='connected'&&<section className="overflow-hidden rounded-2xl border border-[#d4c29d] bg-white shadow-sm" data-hope-whatsapp-inbox="true">
    <div className="flex items-center justify-between border-b border-[#e6ddca] px-5 py-4">
     <div className="flex items-center gap-2"><MessageCircle className="text-[#8d6a2c]"/><h2 className="text-lg font-bold">Your WhatsApp conversations</h2></div>
     <button onClick={()=>void refreshThreads(selected||undefined).catch(()=>setError('Refresh failed'))} className="rounded-lg p-2" aria-label="Refresh inbox"><RefreshCw size={19}/></button>
    </div>
    <div className="grid min-h-[470px] md:grid-cols-[minmax(210px,1fr)_minmax(0,2fr)]">
     <aside className="border-b border-[#eee4d3] md:border-b-0 md:border-r" aria-label="Your conversations">
      {threads.length===0?<p className="p-5 text-sm leading-6 text-[#6a7680]">No customer messages yet. Conversations appear here when a person messages your connected business number. This board does not send unsolicited first messages.</p>:
      threads.map(t=><button key={t.id} type="button" onClick={()=>void selectThread(t.id)}
       className={'w-full border-b border-[#eee5d8] p-4 text-left hover:bg-[#f5f5ee] '+(selected===t.id?'bg-[#ecf2ef]':'')} aria-current={selected===t.id?'true':undefined}>
       <span className="block text-sm font-semibold">{t.display_name||'WhatsApp contact'}</span>
       <span className="block text-xs text-[#63747b]">+{t.remote_wa_id}</span>
       <span className="mt-2 block truncate text-xs text-[#63747b]">{t.preview||'Conversation'}</span>
       <span className={'mt-2 block text-xs font-semibold '+(t.reply_allowed?'text-[#32725a]':'text-amber-800')}>{t.reply_allowed?'Reply window open':'Template required to restart'}</span>
      </button>)}
     </aside>
     <div className="flex min-h-[470px] flex-col">
      {!thread?<p className="m-auto px-6 py-14 text-center text-sm text-[#69767c]">Select an inbound WhatsApp conversation to read and reply.</p>:<>
       <div className="border-b border-[#eee4d3] p-4">
        <h3 className="font-semibold">{thread.display_name||'WhatsApp contact'} · +{thread.remote_wa_id}</h3>
        <p className="mt-1 text-xs text-[#607079]">{thread.reply_allowed?'Reply to this customer inside Weave.':'Customer reply window ended. An approved opt-in template is required for a new business-initiated message.'}</p>
       </div>
       <div className="flex-1 space-y-3 overflow-y-auto bg-[#f7f8f5] p-4" aria-label="WhatsApp conversation messages">
        {messages.map(m=><article key={m.id} className={'max-w-[90%] rounded-2xl p-3 text-sm leading-6 sm:max-w-[78%] '+(m.direction==='outbound'?'ml-auto bg-[#daeee7]':'mr-auto bg-white')}>
         <p className="whitespace-pre-wrap break-words">{m.body}</p>
         <p className="mt-1 text-right text-[10px] text-[#64737c]">{new Date(m.created_at).toLocaleString()} · {m.delivery_status}</p>
        </article>)}
       </div>
       <form onSubmit={e=>{e.preventDefault();void send()}} className="border-t border-[#eee4d3] p-3">
        <label htmlFor="hope-whatsapp-reply" className="sr-only">Reply to WhatsApp customer</label>
        <div className="flex items-end gap-2">
         <textarea id="hope-whatsapp-reply" rows={2} maxLength={4096} value={draft}
          disabled={!thread.reply_allowed||busy} onChange={e=>setDraft(e.target.value)}
          placeholder={thread.reply_allowed?'Write a WhatsApp reply':'Reply window closed'}
          className="min-w-0 flex-1 resize-none rounded-xl border border-[#cfc4ac] p-3 text-sm disabled:opacity-60"/>
         <button type="submit" disabled={!thread.reply_allowed||!draft.trim()||busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#214a4a] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"><Send size={17}/> Send</button>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#69767c]">WhatsApp Business policies apply. Meta may charge messaging fees. No unverified sales or commissions are recorded from a message alone.</p>
       </form>
      </>}
     </div>
    </div>
   </section>}
   <footer className="rounded-xl border border-[#dfd3b9] bg-[#fffdf8] p-5 text-xs leading-6 text-[#68747a]">
    Meta owns phone verification and WhatsApp delivery; Weave stores only authorized business-message records. This workboard is separate from Number Bay purchases and does not grant ownership of another person’s number. File Folder sales continue through the Bridger’s attributed Hope workflow.
   </footer>
  </div>
 </main>
}

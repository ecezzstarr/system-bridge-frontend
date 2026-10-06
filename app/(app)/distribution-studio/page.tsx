'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { Activity, CalendarDays, ExternalLink, Link2, Loader2, Pause, Radio, RefreshCw, Send, Share2, Sparkles, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type StudioRole = 'admin' | 'agent' | 'bridger' | 'client'
type Channel = { key:string; label:string; kind:'native'|'external'; status:string; accountLabel:string|null; providerAccountId:string|null; connectedAt:string|null; route:string|null }
type Delivery = { channelKey:string; status:string; providerUrl:string|null; scheduledAt:string|null; publishedAt:string|null; error:string|null }
type ContentItem = { id:string; title:string; body:string; media_url:string|null; media_type:string; destination:string; status:string; scheduled_at:string|null; published_at:string|null; deliveries:Delivery[] }
type Profile = { presence_name:string|null; objective:string; default_destination:string; posting_cadence:'light'|'steady'|'active' }
type StudioState = {
  role: StudioRole
  profile: Profile
  channels: Channel[]
  content: ContentItem[]
  summary: { scheduled:number; published:number; drafts:number; reach:number; views:number; engagements:number; clicks:number; follows:number; publishedDeliveries:number; waitingConnections:number; failedDeliveries:number }
}

const ROLES:StudioRole[]=['admin','agent','bridger','client']
const ROLE_COPY:Record<StudioRole,{title:string;description:string}>={
  agent:{title:'AGENT SOCIAL PRESENCE',description:'Build a visible Agent presence around your real movement, Agility work and the people you want to reach.'},
  bridger:{title:'BRIDGER SOCIAL PRESENCE',description:'Build trust before the conversation begins. Carry clear Prospect-facing movement from your social channels into the right WEAVE entrance.'},
  client:{title:'CLIENT SOCIAL PRESENCE',description:'Grow the public presence of your own business and carry people from social media toward your Customer Door, store or other Client destination.'},
  admin:{title:'ADMINISTRATION SOCIAL PRESENCE',description:'Operate a personal Administration distribution presence. Institutional oversight remains in the Administration Distribution Studio.'},
}

function isStudioRole(value:unknown):value is StudioRole{return typeof value==='string'&&ROLES.includes(value as StudioRole)}
function compact(value:number){return new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(Number(value)||0)}
function localDateTime(value?:string|null){const date=value?new Date(value):new Date(Date.now()+60*60*1000);if(Number.isNaN(date.getTime()))return'';const shifted=new Date(date.getTime()-date.getTimezoneOffset()*60000);return shifted.toISOString().slice(0,16)}

export default function DistributionStudioPage(){
  const {user}=useAuth()
  const router=useRouter()
  const [state,setState]=useState<StudioState|null>(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState<string|null>(null)
  const [presenceName,setPresenceName]=useState('')
  const [objective,setObjective]=useState('')
  const [destination,setDestination]=useState('/')
  const [cadence,setCadence]=useState<'light'|'steady'|'active'>('steady')
  const [title,setTitle]=useState('')
  const [body,setBody]=useState('')
  const [mediaUrl,setMediaUrl]=useState('')
  const [mediaType,setMediaType]=useState<'none'|'image'|'video'>('none')
  const [scheduledAt,setScheduledAt]=useState(localDateTime())
  const [selectedChannels,setSelectedChannels]=useState<string[]>([])
  const [accountLabels,setAccountLabels]=useState<Record<string,string>>({})

  const userRole=String(user?.role||'')
  const role:StudioRole=state?.role||(isStudioRole(userRole)?userRole:'client')
  const copy=ROLE_COPY[role]

  useEffect(()=>{if(!user)return;if(!isStudioRole(user.role))router.replace('/dashboard')},[user,router])

  const authHeaders=(json=false):Record<string,string>=>{const token=typeof window!=='undefined'?localStorage.getItem('ssb_auth_token'):null;return{...(json?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})}}

  const load=async()=>{
    setLoading(true);setMessage(null)
    try{
      const response=await fetch('/api/distribution-studio',{headers:authHeaders(),cache:'no-store'})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!data.success)throw new Error(data.error||'Distribution Studio could not open')
      setState(data)
      setPresenceName(data.profile?.presence_name||'')
      setObjective(data.profile?.objective||'')
      setDestination(data.profile?.default_destination||'/')
      setCadence(data.profile?.posting_cadence||'steady')
      setSelectedChannels(current=>current.length?current:(data.channels||[]).filter((channel:Channel)=>channel.status==='ready').map((channel:Channel)=>channel.key))
    }catch(error:any){setMessage(error.message||'Distribution Studio could not open')}finally{setLoading(false)}
  }

  useEffect(()=>{if(user&&isStudioRole(user.role))void load()},[user?.id,user?.role])

  const readyChannels=useMemo(()=>(state?.channels||[]).filter(channel=>channel.status==='ready'),[state?.channels])

  const saveProfile=async()=>{
    setSaving(true);setMessage(null)
    try{
      const response=await fetch('/api/distribution-studio',{method:'POST',headers:authHeaders(true),body:JSON.stringify({action:'save_profile',presenceName,objective,defaultDestination:destination,postingCadence:cadence})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!data.success)throw new Error(data.error||'Presence could not be saved')
      setMessage('Social Presence direction saved.');await load()
    }catch(error:any){setMessage(error.message||'Presence could not be saved')}finally{setSaving(false)}
  }

  const requestConnection=async(channel:Channel)=>{
    const accountLabel=String(accountLabels[channel.key]||'').trim()
    if(!accountLabel){setMessage(`Add the ${channel.label} account name or handle first.`);return}
    setSaving(true);setMessage(null)
    try{
      const response=await fetch('/api/distribution-studio',{method:'POST',headers:authHeaders(true),body:JSON.stringify({action:'request_connection',channelKey:channel.key,accountLabel})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!data.success)throw new Error(data.error||`${channel.label} connection could not be prepared`)
      setMessage(data.message||`${channel.label} connection prepared.`);await load()
    }catch(error:any){setMessage(error.message||`${channel.label} connection could not be prepared`)}finally{setSaving(false)}
  }

  const disconnectChannel=async(channel:Channel)=>{
    setSaving(true);setMessage(null)
    try{
      const response=await fetch('/api/distribution-studio',{method:'PATCH',headers:authHeaders(true),body:JSON.stringify({action:'disconnect_channel',channelKey:channel.key})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!data.success)throw new Error(data.error||`${channel.label} could not be disconnected`)
      setMessage(`${channel.label} disconnected from this WEAVE presence.`);await load()
    }catch(error:any){setMessage(error.message||`${channel.label} could not be disconnected`)}finally{setSaving(false)}
  }

  const toggleChannel=(key:string)=>setSelectedChannels(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key])

  const createContent=async()=>{
    if(!title.trim()){setMessage('Give the movement a title before saving it.');return}
    setSaving(true);setMessage(null)
    try{
      const response=await fetch('/api/distribution-studio',{method:'POST',headers:authHeaders(true),body:JSON.stringify({action:'create_content',title,body,mediaUrl:mediaUrl||null,mediaType:mediaUrl?mediaType:'none',destination,scheduledAt:scheduledAt?new Date(scheduledAt).toISOString():null,channels:selectedChannels})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!data.success)throw new Error(data.error||'Content movement could not be formed')
      setTitle('');setBody('');setMediaUrl('');setMediaType('none');setScheduledAt(localDateTime());setMessage('Content movement saved to your Social Presence queue.');await load()
    }catch(error:any){setMessage(error.message||'Content movement could not be formed')}finally{setSaving(false)}
  }

  const pauseContent=async(contentId:string)=>{
    setSaving(true)
    try{
      const response=await fetch('/api/distribution-studio',{method:'PATCH',headers:authHeaders(true),body:JSON.stringify({action:'content_status',contentId,status:'paused'})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!data.success)throw new Error(data.error||'Movement could not be paused')
      setMessage('Content movement paused.');await load()
    }catch(error:any){setMessage(error.message||'Movement could not be paused')}finally{setSaving(false)}
  }

  if(!user||!isStudioRole(user.role))return null

  return <main className="mx-auto max-w-7xl space-y-6 pb-16" data-social-presence-studio={role}>
    <section className="overflow-hidden border-y border-cyan-300/15 bg-[#07101a]/88 p-5 text-white sm:rounded-[2rem] sm:border sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-4xl"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-cyan-300"><Share2 className="h-4 w-4"/>Distribution Studio · Social Presence</div><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{copy.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{copy.description}</p><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-600">Your WEAVE position stays intact. This environment only carries your authorized public presence outward and returns the record to you.</p></div><div className="flex gap-2">{role==='admin'&&<Button asChild variant="outline" className="border-white/15 text-white"><Link href="/admin/distribution-studio">ADMIN OVERSIGHT</Link></Button>}<Button variant="outline" onClick={()=>void load()} disabled={loading} className="border-white/15 text-white"><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>REFRESH</Button></div></div>
      <div className="mt-7 grid grid-cols-2 border-y border-white/10 sm:grid-cols-5"><Metric label="Ready Channels" value={readyChannels.length}/><Metric label="Scheduled" value={state?.summary.scheduled||0} bordered/><Metric label="Published" value={state?.summary.publishedDeliveries||0} bordered/><Metric label="Reach" value={state?.summary.reach||0} bordered/><Metric label="Follows" value={state?.summary.follows||0}/></div>
    </section>

    {message&&<div className="border border-cyan-300/20 bg-cyan-300/[0.04] px-4 py-3 text-sm text-cyan-100">{message}</div>}
    {loading&&!state?<div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300"/></div>:<>
      <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-5 border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6"><div><p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300">PRESENCE DIRECTION</p><h2 className="mt-1 text-2xl font-black text-white">WHAT SHOULD PEOPLE RECOGNIZE?</h2></div><Input value={presenceName} onChange={event=>setPresenceName(event.target.value)} placeholder="Name people should recognize" className="border-white/10 bg-black/30 text-white"/><textarea value={objective} onChange={event=>setObjective(event.target.value)} rows={5} placeholder="What should your social presence achieve?" className="w-full resize-y border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none"/><Input value={destination} onChange={event=>setDestination(event.target.value)} placeholder="Default WEAVE destination" className="border-white/10 bg-black/30 text-white"/><select value={cadence} onChange={event=>setCadence(event.target.value as typeof cadence)} className="h-10 w-full border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"><option value="light">Light · a few movements each week</option><option value="steady">Steady · consistent daily presence</option><option value="active">Active · multiple daily movements</option></select><Button onClick={saveProfile} disabled={saving} className="bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200">{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Sparkles className="mr-2 h-4 w-4"/>}SAVE PRESENCE</Button></div>

        <div className="border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.24em] text-fuchsia-300">CHANNELS</p><h2 className="mt-1 text-2xl font-black text-white">YOUR PUBLIC OUTLETS</h2></div><p className="text-[9px] font-black uppercase tracking-widest text-slate-600">No shared credentials</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{(state?.channels||[]).map(channel=><div key={channel.key} className={`border p-4 ${channel.status==='ready'?'border-emerald-300/20 bg-emerald-300/[0.025]':'border-white/10 bg-[#07101a]/45'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-white">{channel.label}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">{channel.kind==='native'?'WEAVE NATIVE':'YOUR EXTERNAL ACCOUNT'}</p></div><span className={`text-[8px] font-black uppercase tracking-widest ${channel.status==='ready'?'text-emerald-300':channel.status==='pending'?'text-yellow-300':'text-slate-600'}`}>{channel.status}</span></div>{channel.accountLabel&&<p className="mt-3 text-xs text-slate-300">{channel.accountLabel}</p>}{channel.kind==='native'&&channel.route&&<Button asChild variant="outline" className="mt-4 h-8 border-white/10 text-[10px] text-white"><Link href={channel.route}>OPEN<ExternalLink className="ml-2 h-3 w-3"/></Link></Button>}{channel.kind==='external'&&channel.status==='disconnected'&&<div className="mt-4 flex gap-2"><Input value={accountLabels[channel.key]||''} onChange={event=>setAccountLabels(current=>({...current,[channel.key]:event.target.value}))} placeholder={`@${channel.key} account`} className="h-8 border-white/10 bg-black/30 text-xs text-white"/><Button onClick={()=>requestConnection(channel)} disabled={saving} className="h-8 bg-white/10 px-3 text-[9px] font-black text-white hover:bg-white/15">PREPARE</Button></div>}{channel.kind==='external'&&channel.status==='pending'&&<p className="mt-4 text-[10px] leading-4 text-yellow-200/70">Provider authorization is still required. WEAVE has only prepared this account position; no social password or access token is stored here.</p>}{channel.kind==='external'&&channel.status==='ready'&&<Button variant="outline" onClick={()=>disconnectChannel(channel)} disabled={saving} className="mt-4 h-8 border-white/10 text-[9px] text-slate-300">DISCONNECT</Button>}</div>)}</div></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-5 border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6"><div><p className="text-[9px] font-black uppercase tracking-[0.24em] text-yellow-300">FORMATION</p><h2 className="mt-1 text-2xl font-black text-white">FORM THE NEXT MOVEMENT</h2><p className="mt-2 text-xs leading-5 text-slate-500">Prepare one piece of content, choose where it should travel, and carry people toward one WEAVE destination.</p></div><Input value={title} onChange={event=>setTitle(event.target.value)} placeholder="Movement title" className="border-white/10 bg-black/30 text-white"/><textarea value={body} onChange={event=>setBody(event.target.value)} rows={5} placeholder="Write the public message..." className="w-full resize-y border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none"/><div className="grid gap-3 sm:grid-cols-[.7fr_1.3fr]"><select value={mediaType} onChange={event=>setMediaType(event.target.value as typeof mediaType)} className="h-10 border border-white/10 bg-black/40 px-3 text-xs text-white outline-none"><option value="none">No media</option><option value="image">Image</option><option value="video">Video</option></select><Input value={mediaUrl} onChange={event=>setMediaUrl(event.target.value)} placeholder="Media URL from WEAVE Studio or storage" className="border-white/10 bg-black/30 text-white"/></div><div className="flex flex-wrap items-center gap-2"><Button asChild variant="outline" className="border-white/10 text-xs text-white"><Link href="/video-ad-studio"><Video className="mr-2 h-4 w-4"/>OPEN VIDEO STUDIO</Link></Button><span className="text-[10px] text-slate-600">Finished Studio media can be carried here.</span></div><div className="grid gap-3 sm:grid-cols-2"><Input value={destination} onChange={event=>setDestination(event.target.value)} placeholder="WEAVE destination" className="border-white/10 bg-black/30 text-white"/><Input type="datetime-local" value={scheduledAt} onChange={event=>setScheduledAt(event.target.value)} className="border-white/10 bg-black/30 text-white"/></div><div><p className="text-[9px] font-black uppercase tracking-wider text-slate-600">Carry through</p><div className="mt-2 flex flex-wrap gap-2">{(state?.channels||[]).map(channel=><button key={channel.key} onClick={()=>toggleChannel(channel.key)} className={`border px-3 py-1.5 text-[9px] font-black uppercase ${selectedChannels.includes(channel.key)?'border-cyan-300/50 bg-cyan-300/[0.08] text-cyan-100':'border-white/10 text-slate-500'}`}>{channel.label}{channel.status!=='ready'?' · wait':''}</button>)}</div></div><Button onClick={createContent} disabled={saving} className="bg-yellow-300 font-black text-slate-950 hover:bg-yellow-200">{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Send className="mr-2 h-4 w-4"/>}SAVE TO MOVEMENT QUEUE</Button></div>

        <div className="border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-300"/><p className="text-[9px] font-black uppercase tracking-[0.24em] text-emerald-300">GROWTH RECORD</p></div><h2 className="mt-2 text-2xl font-black text-white">WHAT RETURNS</h2><div className="mt-5 space-y-2"><RecordLine label="Reach" value={state?.summary.reach||0}/><RecordLine label="Views" value={state?.summary.views||0}/><RecordLine label="Engagements" value={state?.summary.engagements||0}/><RecordLine label="Clicks into your movement" value={state?.summary.clicks||0}/><RecordLine label="New follows" value={state?.summary.follows||0}/></div><div className="mt-6 grid grid-cols-3 border-y border-white/10 text-center"><MiniMetric label="Waiting" value={state?.summary.waitingConnections||0}/><MiniMetric label="Published" value={state?.summary.publishedDeliveries||0} bordered/><MiniMetric label="Failed" value={state?.summary.failedDeliveries||0}/></div></div>
      </section>

      <section className="border-y border-white/10 bg-black/15 p-5 sm:border sm:p-6"><div className="flex items-end justify-between gap-4"><div><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cyan-300"/><p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300">MOVEMENT QUEUE</p></div><h2 className="mt-2 text-2xl font-black text-white">YOUR CONTENT</h2></div><p className="text-xs text-slate-600">{state?.summary.drafts||0} draft · {state?.summary.scheduled||0} scheduled</p></div><div className="mt-5 space-y-3">{(state?.content||[]).length===0?<p className="py-8 text-center text-sm text-slate-600">Your first public movement has not been formed yet.</p>:(state?.content||[]).map(item=><article key={item.id} className="grid gap-4 border border-white/10 bg-[#07101a]/45 p-4 lg:grid-cols-[1.4fr_.8fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className={`text-[8px] font-black uppercase tracking-widest ${item.status==='published'?'text-emerald-300':item.status==='scheduled'?'text-cyan-300':item.status==='paused'?'text-slate-500':'text-yellow-300'}`}>{item.status}</span><span className="text-[8px] font-black uppercase tracking-widest text-slate-600">{item.media_type}</span></div><h3 className="mt-2 text-base font-black text-white">{item.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.body}</p><p className="mt-2 flex items-center gap-1 text-[9px] text-slate-600"><Link2 className="h-3 w-3"/>{item.destination}</p></div><div><p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Channels</p><div className="mt-2 flex flex-wrap gap-1.5">{(item.deliveries||[]).map(delivery=><span key={delivery.channelKey} className="border border-white/10 px-2 py-1 text-[8px] font-black uppercase text-slate-500">{delivery.channelKey} · {delivery.status}</span>)}</div>{item.scheduled_at&&<p className="mt-2 text-[9px] text-slate-600">{new Date(item.scheduled_at).toLocaleString()}</p>}</div><div>{!['paused','published'].includes(item.status)&&<Button variant="outline" onClick={()=>pauseContent(item.id)} disabled={saving} className="h-8 border-white/10 px-3 text-[9px] text-white"><Pause className="mr-1 h-3 w-3"/>PAUSE</Button>}{item.status==='published'&&<Radio className="h-4 w-4 text-emerald-300"/>}</div></article>)}</div></section>
    </>}
  </main>
}

function Metric({label,value,bordered=false}:{label:string;value:number;bordered?:boolean}){return <div className={`px-2 py-4 text-center ${bordered?'border-x border-white/10':''}`}><p className="text-xl font-black text-white sm:text-2xl">{compact(value)}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</p></div>}
function RecordLine({label,value}:{label:string;value:number}){return <div className="flex items-center justify-between border-b border-white/5 py-3"><span className="text-xs text-slate-500">{label}</span><strong className="text-lg text-white">{compact(value)}</strong></div>}
function MiniMetric({label,value,bordered=false}:{label:string;value:number;bordered?:boolean}){return <div className={`px-2 py-3 ${bordered?'border-x border-white/10':''}`}><p className="text-lg font-black text-white">{compact(value)}</p><p className="mt-1 text-[7px] font-black uppercase tracking-widest text-slate-600">{label}</p></div>}

'use client'

import {Component,useEffect,useState,useCallback,type ReactNode} from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {WeaveWorldAtlas,WeaveWorldSheet,worldRegionName,type WorldDomainFilter} from './weave-world-atlas'
import {WEAVE_WRITING} from '@/lib/weave-writing'
import {visiblePoll} from '@/lib/visible-poll'
import {verifyCastlePlacement,type PublicWorldDomain} from '@/lib/weave-open-world-domains'
import {ArrowRight,Castle,Handshake,Layers3,MapPinned,RefreshCcw,Store} from 'lucide-react'

const WeaveWorldScene=dynamic(()=>import('./weave-world-scene').then(m=>m.WeaveWorldScene),{
  ssr:false,
  loading:()=> <div role="status" className="flex h-full items-center justify-center text-sm text-sky-100">Opening the 3D land…</div>,
})

function RestoreWorldMap({onUnavailable}:{onUnavailable:()=>void}){
 useEffect(onUnavailable,[onUnavailable])
 return null
}

class WorldGraphicsBoundary extends Component<{children:ReactNode;onUnavailable:()=>void},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){
   return this.state.failed?<RestoreWorldMap onUnavailable={this.props.onUnavailable}/>:this.props.children
 }
}

type Connection={id:string;status:'pending'|'accepted'|'declined';otherDomainId:string;direction:'incoming'|'outgoing';requestNote:string}
type JointProject={id:string;connectionId:string;kind:string;title:string;status:'proposed'|'active';createdBySelf:boolean;otherDomainId:string;ownContribution:boolean;partnerContribution:boolean}
type OwnOperatingSystem={id:string;name:string;systemType:string}
type OwnWorld={domainId:string;worldSlot:number;collaborationOpen:boolean;connections:Connection[];projects:JointProject[];ownSystems:OwnOperatingSystem[]}
type WorldFeed={page:number;domains:PublicWorldDomain[];links:{from:string;to:string}[];hasMore:boolean;event?:{label:string;status:string}}
const emptyFeed:WorldFeed={page:-1,domains:[],links:[],hasMore:false}

const stageLabel:{[key:string]:string}={
 foundation:'World foundation',forming:'Structures forming',
 operating:'Systems operating',expanding:'Business expanding',
}

export function BurningRiverLiveWorld({role='visitor',carrierCode=null,requestedDoor=null,legionCode=null,returnHref='/flame-event'}:{
  returnHref?:'/system-switch'|'/flame-event'
  legionCode?:string|null
  carrierCode?:string|null
  requestedDoor?:string|null
  role?:'visitor'|'client'|'agent'|'bridger'|'admin'
}){
 const [view,setView]=useState<'map'|'world'>('map')
 const [panel,setPanel]=useState<'domains'|'customers'|'community'|'guide'|'domain'|null>(null)
 const [domainFilter,setDomainFilter]=useState<WorldDomainFilter>({})
 const [feed,setFeed]=useState<WorldFeed>(emptyFeed)
 const [status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading')
 const [selected,setSelected]=useState<string|null>(null)
 const [placing,setPlacing]=useState(false)
 const [candidate,setCandidate]=useState<{x:number;z:number}|null>(null)
 const [page,setPage]=useState(0)
 const [owner,setOwner]=useState<OwnWorld|null>(null)
 const [jointConnectionId,setJointConnectionId]=useState('')
 const [jointTitle,setJointTitle]=useState('')
 const [jointKind,setJointKind]=useState('system_integration')
 const [selectedSystemIds,setSelectedSystemIds]=useState<Record<string,string>>({})
 const [operation,setOperation]=useState('')
 const [busy,setBusy]=useState(false)
 const [mapNotice,setMapNotice]=useState('')
 const [sceneReady,setSceneReady]=useState(false)
 const selectedDomain=feed.domains.find(d=>d.domainId===selected)||null
 const publicHref=(domain:PublicWorldDomain)=>{
   if(!domain.customerDoor.open||!domain.customerDoor.href?.startsWith('/market/'))return null
   const suffix=legionCode&&/^[a-zA-Z0-9_-]{1,80}$/.test(legionCode)?'&legion='+encodeURIComponent(legionCode):''
   return domain.customerDoor.href+suffix+'#offers'
 }
 const displayDomains=placing&&candidate&&owner
  ?feed.domains.map(d=>d.domainId===owner.domainId?{...d,location:{...d.location,...candidate}}:d)
  :feed.domains
 useEffect(()=>{
   if(!requestedDoor||selected||feed.page!==page)return
   const match=feed.domains.find(d=>d.customerDoor.href?.startsWith('/market/'+encodeURIComponent(requestedDoor)+'?'))
   if(match){setSelected(match.domainId);setPanel('domain')}
   else if(status==='ready'&&feed.hasMore&&page<10)setPage(p=>p+1)
 },[feed.domains,feed.page,requestedDoor,selected,status,feed.hasMore,page])

 const refresh=useCallback(async(signal?:AbortSignal)=>{
   const response=await fetch('/api/system-switch/open-world?page='+page,
     {signal,cache:'no-store'})
   const json=await response.json()
   if(!response.ok||!json.success||!Array.isArray(json.domains))throw new Error('World service unavailable')
   if(signal?.aborted)return
   setFeed({page,domains:json.domains,links:json.links||[],hasMore:json.hasMore===true,event:json.event})
   setStatus('ready')
 },[page])
 const refreshOwner=useCallback(async(signal?:AbortSignal)=>{
   if(role!=='client')return
   const token=localStorage.getItem('ssb_auth_token')||''
   const response=await fetch('/api/client/company-loop-connections',
     {headers:token?{Authorization:'Bearer '+token}:{},signal,cache:'no-store'})
   if(!response.ok)return
   const json=await response.json()
   if(json.success)setOwner({domainId:json.domainId,worldSlot:Number(json.worldSlot)||1,
     collaborationOpen:json.collaborationOpen,connections:json.connections||[],
     projects:json.projects||[],ownSystems:json.ownSystems||[]})
 },[role])
 useEffect(()=>{
   const openCustomerDoors=()=>{
     if(window.location.hash==='#domains')setPanel('customers')
   }
   openCustomerDoors()
   window.addEventListener('hashchange',openCustomerDoors)
   return ()=>window.removeEventListener('hashchange',openCustomerDoors)
 },[])
 useEffect(()=>{
   let mounted=true
   const stop=visiblePoll(async signal=>{
     try{await refresh(signal)}catch{
       // Requests aborted by the watchdog must exit the initial loading state.
       if(mounted&&!document.hidden)setStatus('unavailable')
     }
   },15000,true)
   return ()=>{mounted=false;stop()}
 },[refresh])
 useEffect(()=>{
   if(role!=='client')return
   const stop=visiblePoll(signal=>refreshOwner(signal),15000,true)
   return stop
 },[role,refreshOwner])
 const request=async(action:string,payload:Record<string,unknown>={})=>{
   setBusy(true);setOperation('')
   try{
     const token=localStorage.getItem('ssb_auth_token')||''
     const response=await fetch('/api/client/company-loop-connections',{
       method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
       body:JSON.stringify({action,...payload}),
     })
     const data=await response.json()
     if(!response.ok||!data.success)throw new Error(data.error||'Unable to complete event action')
     setOperation(action==='request_connection'?'Invitation sent. The other Client decides whether to accept.':
       action==='respond_connection'?'Client response recorded.':'Collaboration setting updated.')
     await Promise.all([refresh(),refreshOwner()])
   }catch(error){setOperation(error instanceof Error?error.message:'Event action unavailable')}
   finally{setBusy(false)}
 }
 const placeOnLand=(point:{x:number;z:number})=>{
   if(!placing||!owner)return
   const occupied=feed.domains.filter(d=>d.domainId!==owner.domainId).map(d=>({x:d.location.x,z:d.location.z}))
   const result=verifyCastlePlacement(point.x,point.z,occupied)
   if(!result.ok){setOperation(result.reason);setCandidate(null);return}
   setCandidate(result.point)
   setOperation('Previewing this position. Confirm to move your castle for everyone.')
 }
 const moveMyCastle=async()=>{
   if(!owner||!candidate||busy)return
   setBusy(true);setOperation('')
   try{
     const token=localStorage.getItem('ssb_auth_token')||''
     const response=await fetch('/api/client/open-world/castle-position',{method:'POST',
       headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
       body:JSON.stringify(candidate)})
     const data=await response.json()
     if(!response.ok||!data.success)throw Error(data.error||'Castle relocation could not be completed.')
     setPlacing(false);setCandidate(null)
     await refresh()
     setOperation('Your castle moved to its new WEAVE land position. File Folder ownership and Customer Door are unchanged.')
   }catch(error){setOperation(error instanceof Error?error.message:'Your previous castle position is unchanged.')}
   finally{setBusy(false)}
 }
 const tapCastle=(id:string)=>{
   setSelected(id)
   if(placing)return
   const domain=feed.domains.find(d=>d.domainId===id)
   if(!domain)return
   if(role==='client'&&!owner){setPanel('domain');return}
   if(role==='client'&&owner?.domainId===id){window.location.assign('/client/system-switch');return}
   const href=publicHref(domain)
   if(href)window.location.assign(href)
   else setPanel('domain')
 }
 const incoming=owner?.connections.filter(c=>c.status==='pending'&&c.direction==='incoming')||[]
 const accepted=owner?.connections.filter(c=>c.status==='accepted')||[]
 const labels=new Map(feed.domains.map(d=>[d.domainId,d.publicName]))
 const doorList=panel==='customers'
 const visibleDomains=feed.domains.filter(d=>doorList?Boolean(publicHref(d)):
   (!domainFilter.region||d.location.region===domainFilter.region)&&(!domainFilter.tier||d.tier===domainFilter.tier))
 const crossing=WEAVE_WRITING.systemSwitch
 const staffHref=role==='visitor'?'/login':role==='client'?'/client/system-switch':'/'+role+'/dashboard'
 const eventHref=carrierCode?'/flame-event?carrier='+encodeURIComponent(carrierCode):'/flame-event'
 const eventLabel=feed.event?.status==='active'?(feed.event.label||'Company Loop 1 · Burning River'):'Shared File Folder Domains'
 const reload=()=>{
   setStatus('loading')
   void refresh().catch(()=>setStatus('unavailable'))
   void refreshOwner().catch(()=>{})
 }
 const changeView=(nextView:typeof view)=>{
   setView(nextView)
   window.scrollTo(0,0)
 }
 const showMap=()=>{changeView('map');setPlacing(false);setCandidate(null);setOperation('')}
 const graphicsUnavailable=useCallback(()=>{
   setView('map')
   setPlacing(false)
   setCandidate(null)
   setMapNotice('3D graphics could not open. You can still explore File Folders and Customer Doors on this map.')
   window.scrollTo(0,0)
 },[])
 useEffect(()=>{
   if(view!=='world'||sceneReady)return
   const timeout=window.setTimeout(graphicsUnavailable,12000)
   return ()=>window.clearTimeout(timeout)
 },[view,sceneReady,graphicsUnavailable])
 const explore=()=>{
   try{
     const context=document.createElement('canvas').getContext('webgl2')
     if(!context){graphicsUnavailable();return false}
     context.getExtension('WEBGL_lose_context')?.loseContext()
   }catch{
     graphicsUnavailable()
     return false
   }
   setSceneReady(false)
   setMapNotice('')
   changeView('world')
   return true
 }
 const browseDomains=(filter:WorldDomainFilter={})=>{
   setDomainFilter(filter)
   setPanel('domains')
 }
 const selectDomain=(id:string)=>{setSelected(id);setPanel('domain')}
 const findMyCastle=()=>{
   if(!owner)return
   setPage(Math.max(0,Math.floor((owner.worldSlot-1)/48)))
   selectDomain(owner.domainId)
 }
 const startPlacement=()=>{
   if(!owner)return
   setPanel(null)
   if(view!=='world'&&!explore())return
   setPage(Math.max(0,Math.floor((owner.worldSlot-1)/48)))
   setSelected(owner.domainId)
   setPlacing(true)
   setCandidate(null)
   setOperation('Tap an empty area of land to preview your castle position.')
 }
 const sheetTitle=panel==='customers'?'Customer Doors':panel==='community'?'Community'
  :panel==='guide'?'Open World guide':panel==='domain'?(selectedDomain?.publicName||'File Folder domain')
  :domainFilter.region?worldRegionName(domainFilter.region)
  :domainFilter.tier?domainFilter.tier[0].toUpperCase()+domainFilter.tier.slice(1)+' File Folders':'File Folder domains'
 return <section className="relative isolate overflow-hidden bg-[#070e1e] text-white"
   data-burning-river-live-multiplayer="systems-and-business"
   data-weave-open-world="system-switch-file-folder-world"
   data-weave-official-open-world-reference="burning-river-open-world-official.webp">
   {view==='map'?<WeaveWorldAtlas domains={feed.domains} status={status} eventLabel={eventLabel} staffHref={staffHref} notice={mapNotice}
     returnHref={returnHref==='/system-switch'?returnHref:eventHref}
     onExplore={explore}
     onDomains={browseDomains} onDomain={selectDomain}
     onCustomers={()=>setPanel('customers')} onCommunity={()=>setPanel('community')} onGuide={()=>setPanel('guide')}/>
   :<div className="relative h-[100svh] min-h-[430px] overflow-hidden" data-open-world-map="interactive">
     <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#385c62,#0b2334_68%,#071324)]"/>
     <WorldGraphicsBoundary onUnavailable={graphicsUnavailable}>
       <WeaveWorldScene domains={displayDomains} links={feed.links} selected={selected}
         onSelect={tapCastle} placing={placing} onPlace={placeOnLand} preview={candidate}
         onReady={()=>setSceneReady(true)}/>
     </WorldGraphicsBoundary>
     <nav aria-label="Explore the WEAVE land" className="absolute inset-x-3 top-3 z-20 flex flex-wrap gap-2">
       <button type="button" onClick={showMap} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-200/40 bg-[#081b34] px-3 text-xs font-bold text-amber-100">
         <MapPinned className="h-4 w-4"/> World Map
       </button>
       <button type="button" onClick={()=>browseDomains()} className="min-h-11 rounded-lg border border-amber-200/40 bg-[#081b34] px-3 text-xs font-bold text-amber-100">Domains</button>
     </nav>
     {role==='client'&&owner&&<div className="absolute right-3 top-16 z-20 flex max-w-[57%] flex-col gap-2" data-client-world-castle-relocation="owner-only">
       {!placing&&<button type="button" className="min-h-10 rounded-xl border border-amber-200/40 bg-[#112b36]/95 px-3 text-xs font-bold text-amber-100"
          onClick={findMyCastle}>
          Find my castle
       </button>}
       {!placing?<button type="button" className="min-h-11 rounded-xl border border-cyan-200/45 bg-[#092a36]/95 px-3 text-xs font-black text-cyan-100"
         onClick={startPlacement}>
         Position my castle
       </button>:<div className="space-y-2 rounded-xl border border-emerald-200/40 bg-[#082b2b]/95 p-3 text-xs text-white shadow-xl">
         <p className="font-bold text-emerald-100">Tap an open space on the land.</p>
         <p className="text-[11px] text-slate-200">{candidate?('New site: '+candidate.x+', '+candidate.z):'Your current location remains unchanged until confirmation.'}</p>
         <button type="button" disabled={!candidate||busy} onClick={()=>void moveMyCastle()}
           className="min-h-10 w-full rounded-lg bg-emerald-200 px-2 font-bold text-[#082522] disabled:opacity-40">Confirm castle position</button>
         <button type="button" onClick={()=>{setPlacing(false);setCandidate(null);setOperation('Castle movement cancelled.')}}
           className="min-h-10 w-full rounded-lg border border-white/30 px-2">Cancel</button>
       </div>}
     </div>}
     {operation&&panel===null&&<p role="status" className="absolute bottom-16 left-3 z-20 max-w-[75%] rounded-lg border border-amber-200/40 bg-[#081b34] px-3 py-2 text-xs text-amber-100">{operation}</p>}
     <div className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-lg border border-white/20 bg-[#061225]/85 px-3 py-2 text-[11px] text-sky-100">
       {placing?'Tap free land · Preview · Confirm move':'Drag to look · Pinch to zoom · Tap a Client castle to enter'}
     </div>
     {status==='unavailable'&&<div role="alert" className="absolute bottom-16 left-3 z-20 max-w-[75%] rounded-xl border border-amber-200/50 bg-[#071b2c]/95 p-3 text-xs leading-5 text-amber-100">
       The live land feed did not respond. The landscape remains available while the connection recovers.
       <button type="button" onClick={()=>{setStatus('loading');void refresh().catch(()=>setStatus('unavailable'))}}
         className="mt-2 block min-h-9 rounded-lg border border-amber-200/50 px-3 font-bold">Retry land connection</button>
     </div>}
   </div>}
   <WeaveWorldSheet open={panel!==null} title={sheetTitle} onClose={()=>setPanel(null)}>
    {panel==='guide'&&<div className="space-y-3 text-sm leading-6 text-sky-100" data-system-switch-arrival-orientation="true">
      <p>{crossing.arrival}</p>
      {role==='visitor'&&<p>{crossing.visitor}</p>}
      <p>The named places in the illustration are landmarks. Tap them to browse an area or a File Folder tier. Live badges identify verified Client domains. Explore opens the 3D land, where you can drag, pinch and tap buildings.</p>
      <p>{crossing.privacy}</p>
      <div className="flex flex-wrap gap-2">
        <Link href={eventHref} className="rounded-lg border border-amber-200/45 px-3 py-2 text-amber-100">Company Loop 1 · Burning River</Link>
        <Link href={staffHref} className="rounded-lg border border-amber-200/45 px-3 py-2 text-amber-100">Staff Entrance</Link>
        <Link href="/" className="rounded-lg border border-amber-200/45 px-3 py-2 text-amber-100">The Company of Time</Link>
        {owner&&<>
          <button type="button" onClick={findMyCastle} className="rounded-lg border border-amber-200/45 px-3 py-2 text-amber-100">Find my castle</button>
          <button type="button" onClick={startPlacement} className="rounded-lg border border-amber-200/45 px-3 py-2 text-amber-100">Position my castle</button>
        </>}
      </div>
    </div>}
    {(panel==='domains'||doorList)&&<div id="domains" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-sky-100/80">
        <p>{doorList?'Commissioned public entrances to Client businesses.':'Verified File Folders in this part of the map.'}</p>
        {panel==='domains'&&(domainFilter.region||domainFilter.tier)&&<button type="button" onClick={()=>setDomainFilter({})} className="min-h-11 px-2 font-bold text-amber-100">All domains</button>}
        <button type="button" onClick={reload} className="inline-flex min-h-11 items-center gap-2 px-2 font-bold text-amber-100">
          <RefreshCcw className="h-4 w-4"/> {status==='unavailable'?'Retry land connection':'Refresh'}
        </button>
      </div>
      <ul className="divide-y divide-amber-100/20">
        {visibleDomains.map(d=><li key={d.domainId}>
          <button type="button" onClick={()=>selectDomain(d.domainId)}
            className="flex min-h-12 w-full items-center justify-between gap-2 px-2 py-2 text-left text-sm hover:bg-white/10">
            <span className="min-w-0 break-words font-semibold text-white">{d.publicName}</span>
            <span className="shrink-0 text-xs capitalize text-amber-100">{d.tier} <ArrowRight className="ml-1 inline h-4 w-4"/></span>
          </button>
        </li>)}
      </ul>
      {!visibleDomains.length&&<p className="text-sm text-sky-100/80">
        {status==='loading'?'Retrieving verified domains…':status==='unavailable'?'The live land feed is unavailable.':doorList?'No commissioned Customer Door in this area.':'No verified domain in this area.'}
      </p>}
      {(page>0||feed.hasMore)&&<nav aria-label="Map areas" className="flex items-center gap-2 text-xs">
        <button type="button" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}
          className="min-h-11 rounded-lg border border-amber-100/25 px-3 disabled:opacity-30">Previous area</button>
        <span className="text-sky-100/80">Map area {page+1}</span>
        <button type="button" disabled={!feed.hasMore} onClick={()=>setPage(p=>p+1)}
          className="min-h-11 rounded-lg border border-amber-100/25 px-3 disabled:opacity-30">Next area</button>
      </nav>}
    </div>}
    {panel==='domain'&&<div className="space-y-3" data-open-world-selected-building={selectedDomain?.domainId}>
      {selectedDomain?<>
        <p className="text-xs font-bold uppercase tracking-widest text-amber-200">Selected Client domain · World location {selectedDomain.location.slot}</p>
        <p className="text-xs capitalize text-sky-100/85">{selectedDomain.tier} File Folder · {stageLabel[selectedDomain.stage]} · {selectedDomain.location.region.replaceAll('_',' ')}</p>
        <p className="text-sm text-sky-100/80">
          {selectedDomain.activity.activeBuilds} forming · {selectedDomain.activity.operatingSystems} operating · {selectedDomain.activity.jointFormations} joint systems
        </p>
        {role==='client'&&owner?.domainId===selectedDomain.domainId?
          <Link href="/client/system-switch" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-200 px-3 py-3 text-sm font-black text-[#132d2a]">
            <Castle className="h-4 w-4"/> Enter my private File Folder <ArrowRight className="h-4 w-4"/>
          </Link>:
          publicHref(selectedDomain)?
          <Link href={publicHref(selectedDomain)!}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-200 px-3 py-3 text-sm font-black text-[#142139]">
            <Store className="h-4 w-4"/> Open public Customer Door · Products <ArrowRight className="h-4 w-4"/>
          </Link>:
          <p className="rounded-lg border border-sky-200/20 p-3 text-xs text-sky-100/75">
            Private workspaces require owner access. Public entry opens when a Customer Door is commissioned.
          </p>}
        {role==='client'&&owner&&owner.domainId!==selectedDomain.domainId&&
          <button type="button" disabled={busy||!owner.collaborationOpen||!selectedDomain.collaborationAvailable}
            onClick={()=>void request('request_connection',{targetDomainId:selectedDomain.domainId})}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-200/40 px-3 py-3 text-xs font-bold text-amber-100 disabled:opacity-40">
            <Handshake className="h-4 w-4"/> Invite this Client to form a connection
          </button>}
      </>:<p className="text-sm text-sky-100/80">Retrieving the verified File Folder for this area.</p>}
    </div>}
    {panel==='community'&&<div className="space-y-3">
      <p className="text-sm text-sky-100/85">Meet through the Company Loop. Client owners can opt into connections and form work together from their own File Folders.</p>
      <Link href={eventHref} className="inline-flex min-h-11 items-center text-sm font-bold text-amber-200">Enter Burning River <ArrowRight className="ml-2 h-4 w-4"/></Link>
      {role==='client'&&owner&&<div className="space-y-3 border-t border-white/10 pt-3" data-client-world-collaboration="opt-in">
        <h4 className="flex items-center gap-2 text-sm font-bold text-amber-100"><Handshake className="h-4 w-4"/> My Company Loop Connections</h4>
        <label className="flex items-start gap-3 text-xs leading-5 text-sky-100/90">
          <input type="checkbox" checked={owner.collaborationOpen} disabled={busy}
            onChange={event=>void request('set_collaboration',{open:event.target.checked})}
            className="mt-1 h-4 w-4"/>
          Allow other Client worlds to send business and systems collaboration invitations.
        </label>
        {incoming.map(c=><div key={c.id} className="space-y-2 rounded-lg border border-amber-200/25 p-3">
          <p className="text-xs">Invitation from {labels.get(c.otherDomainId)||'another Client domain'}</p>
          {c.requestNote&&<p className="text-xs text-sky-100/80">{c.requestNote}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy}
              onClick={()=>void request('respond_connection',{connectionId:c.id,response:'accept'})}
              className="min-h-10 rounded-lg bg-amber-200 px-4 text-xs font-bold text-[#142139]">Accept</button>
            <button type="button" disabled={busy}
              onClick={()=>void request('respond_connection',{connectionId:c.id,response:'decline'})}
              className="min-h-10 rounded-lg border border-white/25 px-4 text-xs">Decline</button>
          </div>
        </div>)}
        <p className="text-xs text-sky-100/75">{accepted.length} accepted connections · {owner.connections.filter(c=>c.status==='pending'&&c.direction==='outgoing').length} sent invitations.</p>
        {accepted.length>0&&<form className="space-y-2 rounded-xl border border-amber-200/25 bg-white/[.03] p-3"
          onSubmit={event=>{
            event.preventDefault()
            if(jointConnectionId&&jointTitle.trim().length>=4){
              void request('propose_project',{connectionId:jointConnectionId,kind:jointKind,title:jointTitle.trim()})
              setJointTitle('')
            }
          }} data-joint-system-proposal="consent-required">
          <p className="text-xs font-bold text-amber-100">Form a project with another Client domain</p>
          <label className="block text-xs text-sky-100/80">Connected world
            <select value={jointConnectionId} onChange={event=>setJointConnectionId(event.target.value)}
              required className="mt-1 min-h-10 w-full rounded-lg border border-white/25 bg-[#0b2840] px-3 text-sm text-white">
              <option value="">Choose a connected Client</option>
              {accepted.map(c=><option key={c.id} value={c.id}>
                {labels.get(c.otherDomainId)||'Client world'} · accepted
              </option>)}
            </select>
          </label>
          <label className="block text-xs text-sky-100/80">System or business formation
            <input value={jointTitle} onChange={event=>setJointTitle(event.target.value)} required minLength={4} maxLength={120}
              placeholder="Name the work two worlds can form"
              className="mt-1 min-h-10 w-full rounded-lg border border-white/25 bg-[#0b2840] px-3 text-sm text-white"/>
          </label>
          <label className="block text-xs text-sky-100/80">Type of cooperation
            <select value={jointKind} onChange={event=>setJointKind(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-lg border border-white/25 bg-[#0b2840] px-3 text-sm text-white">
              <option value="system_integration">Connect operating systems</option>
              <option value="commerce">Commerce and Customer Doors</option>
              <option value="distribution">Distribution and fulfillment</option>
              <option value="media">Media production</option>
              <option value="shared_service">Shared service</option>
            </select>
          </label>
          <button type="submit" disabled={busy||!jointConnectionId||jointTitle.trim().length<4}
            className="min-h-11 w-full rounded-lg border border-amber-200/50 bg-amber-200/10 px-3 text-xs font-black text-amber-100 disabled:opacity-40">
            Propose joint work · Partner must accept
          </button>
        </form>}
        {owner.projects.map(project=><div key={project.id}
           className="space-y-2 rounded-lg border border-white/20 p-3" data-joint-system-formation={project.id}>
          <p className="text-xs font-black text-white">{project.title}</p>
          <p className="text-xs text-sky-100/70">
            {labels.get(project.otherDomainId)||'Connected Client domain'} · {project.kind.replaceAll('_',' ')} · {project.status}
          </p>
          {project.status==='proposed'&&!project.createdBySelf&&
            <button type="button" disabled={busy}
              onClick={()=>void request('accept_project',{projectId:project.id})}
              className="min-h-10 rounded-lg bg-amber-200 px-3 text-xs font-bold text-[#182539]">
              Approve this joint project
            </button>}
          {project.status==='proposed'&&project.createdBySelf&&
            <p className="text-xs text-sky-100/65">Awaiting the other Client's approval. No shared systems exist yet.</p>}
          {project.status==='active'&&<>
            <p className="text-xs text-emerald-100">
              My system: {project.ownContribution?'contributed':'not connected'} · Other Client: {project.partnerContribution?'contributed':'awaiting contribution'}
            </p>
            {!project.ownContribution&&owner.ownSystems.length>0&&
              <div className="flex flex-col gap-2">
                <select aria-label={'My system for '+project.title}
                  value={selectedSystemIds[project.id]||''}
                  onChange={event=>setSelectedSystemIds(values=>({...values,[project.id]:event.target.value}))}
                  className="min-h-11 rounded-lg border border-white/20 bg-[#0b2840] px-3 text-xs text-white">
                  <option value="">Select my live system</option>
                  {owner.ownSystems.map(sys=><option key={sys.id} value={sys.id}>
                    {sys.name} · {sys.systemType}
                  </option>)}
                </select>
                <button type="button" disabled={busy||!selectedSystemIds[project.id]}
                  onClick={()=>void request('contribute_system',{projectId:project.id,systemId:selectedSystemIds[project.id]})}
                  className="min-h-11 rounded-lg border border-emerald-300/45 px-3 text-xs font-bold text-emerald-100 disabled:opacity-40">
                  Connect this real active system
                </button>
              </div>}
            {!project.ownContribution&&owner.ownSystems.length===0&&
              <Link href="/client/system-switch" className="text-xs font-bold text-amber-200">
                Build and commission a system in my private File Folder first →
              </Link>}
            {project.ownContribution&&project.partnerContribution&&
              <p className="text-xs font-bold text-emerald-200">
                Both worlds have contributed commissioned systems. This joint formation now develops their public castles; it does not claim a completed sale or integration.
              </p>}
          </>}
        </div>)}
        <Link href="/client/system-switch" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-amber-200">
          <Layers3 className="h-4 w-4"/> Continue building my private File Folder
        </Link>
      </div>}
    </div>}
    {operation&&<p role="status" className="mt-3 border-t border-white/20 pt-3 text-xs text-amber-100">{operation}</p>}
   </WeaveWorldSheet>
 </section>
}

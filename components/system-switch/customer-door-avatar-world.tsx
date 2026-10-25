'use client'
import { useEffect,useRef,useState,type MutableRefObject } from 'react'
import Link from 'next/link'
import { Text } from '@react-three/drei'
import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'
import { FileFolderScenery,FileFolderPresenceAvatar } from '@/components/system-switch/file-folder-world-art'
import { EmbodiedWorldRuntime,type WorldInput } from '@/components/system-switch/embodied-world-runtime'
import { SharedWorldAvatars } from '@/components/system-switch/shared-world-avatars'
import { useWorldPresence } from '@/components/system-switch/use-world-presence'
import { type Presence } from '@/lib/file-folder-world-runtime'
import { ArrowLeft,ArrowRight,Users,ShoppingBag,ShieldCheck } from 'lucide-react'

export type Door={slug:string;name:string;description:string;platform:string;entrance:'market'|'flame-event';offerCount:number}
export type Hosted={publicSlug:string;name:string;description:string;environment:{platformName:string;tagline:string;sign:string;marketSection:string};entrance:string;
  systems:{name:string;description:string;systemType:string}[];offers:{id:string;name:string;description:string;price:number|null;currency:string;offerType:string}[];shopUrl:string}
type Landmark={id:string;name:string;kind:'door'|'offer'|'system';at:[number,number,number];click:()=>void;tag:string}
const at=(i:number,n:number):[number,number,number]=>{
  const theta=i/Math.max(1,n)*Math.PI*2
  return [Math.cos(theta+Math.PI/2)*6.25,0,Math.sin(theta+Math.PI/2)*6.25]
}
function Building({place}:{place:Landmark}){
  return <group position={place.at} rotation={[0,Math.atan2(-place.at[0],-place.at[2]),0]}>
    <mesh castShadow position={[0,1.1,0]} onClick={place.click}>
      <boxGeometry args={[2.25,2.2,1.45]}/><meshStandardMaterial color={place.kind==='offer'?'#1e624d':'#294356'} roughness={.67}/>
    </mesh>
    <mesh castShadow position={[0,2.3,0]}>
      <boxGeometry args={[2.48,.35,1.72]}/><meshStandardMaterial color={place.kind==='offer'?'#e4bd7c':'#87b3c2'} metalness={.35} roughness={.41}/>
    </mesh>
    <mesh position={[0,1.07,.738]} onClick={place.click}>
      <planeGeometry args={[1.55,1.55]}/><meshStandardMaterial color="#0b1b24" emissive="#0b4a37" emissiveIntensity={.4}/>
    </mesh>
    <Text position={[0,1.21,.75]} fontSize={.15} color="#fff2ce" maxWidth={1.35} anchorX="center" anchorY="middle" textAlign="center">{place.name.slice(0,38)}</Text>
    <Text position={[0,2.75,0]} fontSize={.18} color="#bdfce4" maxWidth={2.65} anchorX="center">{place.tag}</Text>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.035,1.15]} onClick={place.click}>
      <planeGeometry args={[1.38,1.1]}/><meshStandardMaterial color="#557d71" roughness={.92}/>
    </mesh>
  </group>
}
function SpatialWorld({places,presence,input,others,onNearby}:{places:Landmark[];presence:MutableRefObject<Presence>;input:MutableRefObject<WorldInput>;
  others:ReturnType<typeof useWorldPresence>['others'];onNearby:(label:string)=>void}){
  return <AdaptiveCanvas shadows camera={{position:[0,3.8,7],fov:69,near:.1,far:80}}>
    <color attach="background" args={['#13212d']}/><fog attach="fog" args={['#13212d',18,44]}/>
    <ambientLight intensity={.86}/><hemisphereLight args={['#ddf8ff','#294232',1.2]}/>
    <directionalLight intensity={2.4} position={[8,11,6]} castShadow/>
    <pointLight intensity={3.1} position={[0,4,0]} color="#ffd5a1" distance={15}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.18,0]} receiveShadow>
      <circleGeometry args={[11,64]}/><meshStandardMaterial color="#27443c" roughness={.94}/>
    </mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.16,0]}>
      <ringGeometry args={[7.95,8.35,64]}/><meshStandardMaterial color="#f8d5a3" transparent opacity={.35}/>
    </mesh>
    <FileFolderScenery formationCount={0}/>
    <group position={[0,0,-.65]}>
      <mesh castShadow position={[0,.9,0]}><cylinderGeometry args={[1.15,1.4,1.65,10]}/><meshStandardMaterial color="#263d52" metalness={.32}/></mesh>
      <mesh castShadow position={[0,2.12,0]}><coneGeometry args={[1.25,.92,10]}/><meshStandardMaterial color="#e2c58a" metalness={.3}/></mesh>
      <Text position={[0,1.44,1.01]} color="#d8f7f2" fontSize={.23} anchorX="center">SYSTEM SWITCH</Text>
      <Text position={[0,1.02,1.24]} color="#bde8e7" fontSize={.13} anchorX="center">CUSTOMER DOORS</Text>
    </group>
    {places.map(p=><Building key={p.id} place={p}/>)}
    <SharedWorldAvatars others={others}/>
    <FileFolderPresenceAvatar presence={presence}/>
    <EmbodiedWorldRuntime input={input} presence={presence} onNearby={onNearby} thirdPerson
      obstacles={[{x:0,z:-.65,radius:1.55},...places.map(p=>({x:p.at[0],z:p.at[2],radius:1.25}))]}
      entrances={places.map(p=>({id:p.id,label:p.name,position:p.at,enter:p.click}))}/>
  </AdaptiveCanvas>
}
function Controls({input}:{input:MutableRefObject<WorldInput>}){
  const hold=(key:string,on:boolean)=>{
    if(on)input.current.keys.add(key)
    else input.current.keys.delete(key)
  }
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0b171c] p-3">
    <div className="flex items-center gap-2">
      {[['a','Turn left'],['w','Walk'],['s','Back'],['d','Turn right']].map(([key,label])=>
        <button key={key} type="button" aria-label={label}
          onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);hold(key,true)}}
          onPointerUp={()=>hold(key,false)} onPointerCancel={()=>hold(key,false)} onLostPointerCapture={()=>hold(key,false)}
          className="min-h-11 min-w-12 touch-none border border-white/15 px-3 py-2 text-xs text-slate-200">{label}</button>)}
    </div>
    <button type="button" onClick={()=>{input.current.enter=true}} className="inline-flex min-h-11 items-center gap-2 bg-emerald-300 px-4 py-2 text-xs font-black text-[#10231c]">Cross nearby door <ArrowRight className="h-4 w-4"/></button>
  </div>
}
function useMovement(){
  const presence=useRef<Presence>({x:0,z:4,yaw:Math.PI})
  const input=useRef<WorldInput>({keys:new Set(),enter:false,active:true})
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement)?.closest?.('input,textarea,select,[contenteditable]'))return
      const k=e.key.toLowerCase()
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){input.current.keys.add(k);e.preventDefault()}
      if(k==='e'||k==='enter')input.current.enter=true
    }
    const up=(e:KeyboardEvent)=>input.current.keys.delete(e.key.toLowerCase())
    const reset=()=>input.current.keys.clear()
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',reset)
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',reset)}
  },[])
  return {presence,input}
}
export function SystemSwitchDoorPlaza(){
  const {presence,input}=useMovement()
  const [nearby,setNearby]=useState('')
  const [doors,setDoors]=useState<Door[]>([])
  const [position,setPosition]=useState('visitor')
  const [error,setError]=useState('')
  const {others,online}=useWorldPresence('system-switch',presence)
  useEffect(()=>{
    let done=false
    const load=async()=>{
      try{
        const token=localStorage.getItem('ssb_auth_token')
        const r=await fetch('/api/system-switch/customer-doors',{cache:'no-store',
          headers:token?{Authorization:'Bearer '+token}:{}})
        const data=await r.json()
        if(!r.ok)throw Error(data.error||'No Customer Door directory')
        if(!done){const selected=new URLSearchParams(window.location.search).get('door')
          const list:Door[]=data.doors||[]
          setDoors(selected?[...list].sort((a,b)=>Number(b.slug===selected)-Number(a.slug===selected)):list)
          setPosition(data.position);setError('')}
      }catch(e){if(!done)setError(e instanceof Error?e.message:'Could not open doors')}
    }
    void load()
    const timer=setInterval(()=>void load(),15000)
    return()=>{done=true;clearInterval(timer)}
  },[])
  const navigate=(door:Door)=>{
    const referral=new URLSearchParams(window.location.search).get('legion')
    const url='/system-switch/customer-doors/'+encodeURIComponent(door.slug)+'?entrance='+door.entrance+(referral?'&legion='+encodeURIComponent(referral):'')
    window.location.assign(url)
  }
  const places:Landmark[]=doors.slice(0,10).map((d,i,a)=>({
    id:d.slug,name:d.name,kind:'door',at:at(i,a.length),tag:'CLIENT CUSTOMER DOOR',click:()=>navigate(d),
  }))
  return <main className="min-h-dvh bg-[#07111b] text-white" data-system-switch-plaza="visitor-and-staff-avatar">
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5">
      <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-200">WEAVE · Bridge of Radiance</p>
        <h1 className="mt-2 text-3xl font-black">System Switch · Customer Door Plaza</h1>
        <p className="mt-2 text-xs text-stone-400">Explore the open world, approach a Client Customer Door, and enter its published business systems.</p>
      </div>
      <Link href="/system-switch/bridge-radiance/flame-coin" className="inline-flex items-center gap-2 border border-amber-200/25 bg-amber-300/[.07] p-3 text-xs font-bold text-amber-200">Buy Flame Coin · Purchase enquiry</Link>
      
      <Link href={position==='visitor'?'/market':'/system-switch/flame-event'} className="inline-flex items-center gap-2 border border-white/10 p-3 text-xs text-sky-200"><ArrowLeft className="h-4 w-4"/>Back</Link>
    </header>
    <section className="mx-auto max-w-7xl px-3" data-shared-customer-door-avatar-plaza>
      <div className="relative h-[56vh] min-h-[420px] overflow-hidden border border-white/10">
        <SpatialWorld presence={presence} input={input} places={places} others={others} onNearby={setNearby}/>
        <div className="pointer-events-none absolute left-3 top-3 bg-[#07111b]/80 p-3 text-xs text-white/90">
          <p className="flex items-center gap-2 font-bold"><Users className="h-4 w-4"/>{online?others.length+1+' participants here':'Connecting real participants…'}</p>
          <p className="mt-1 text-emerald-200">{nearby?'Nearby: '+nearby:'Walk toward a Customer Door'}</p>
        </div>
      </div>
      <Controls input={input}/>
      {error&&<p role="alert" className="mt-4 text-sm text-rose-200">{error}</p>}
      <section className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {doors.map(d=><button type="button" key={d.slug} onClick={()=>navigate(d)}
          className="border border-white/10 bg-white/[.035] p-5 text-left">
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-200">{d.entrance==='flame-event'?'Flame Event hosted':'Customer Market hosted'}</p>
          <h2 className="mt-2 text-lg font-black">{d.platform||d.name}</h2>
          <p className="mt-2 text-xs leading-5 text-stone-400">{d.description||'A Client-created business and systems world.'}</p>
          <p className="mt-3 text-xs text-amber-200">{d.offerCount} live offer{d.offerCount===1?'':'s'} · Enter the World <ArrowRight className="inline h-3 w-3"/></p>
        </button>)}
      </section>
      {!doors.length&&!error&&<p className="pb-12 text-sm text-stone-500">No Client has hosted a public Customer Door for your position yet. The plaza remains available for real participant movement.</p>}
    </section>
  </main>
}
export function HostedFileFolderVisit({slug,entrance}:{slug:string;entrance:'market'|'flame-event'}){
  const {presence,input}=useMovement()
  const [world,setWorld]=useState<Hosted|null>(null)
  const [error,setError]=useState('')
  const [nearby,setNearby]=useState('')
  const [selection,setSelection]=useState<Landmark|null>(null)
  const {others,online}=useWorldPresence('door:'+slug,presence,Boolean(world))
  useEffect(()=>{
    let stopped=false
    const load=async()=>{
      try{
        const token=localStorage.getItem('ssb_auth_token')
        const response=await fetch(`/api/public/client-world/${encodeURIComponent(slug)}?entrance=${entrance}`,{
          cache:'no-store',headers:token?{Authorization:'Bearer '+token}:{},
        })
        const data=await response.json()
        if(!response.ok)throw Error(data.error||'This Client has not opened a visitor world.')
        if(!stopped){setWorld(data.hostedWorld);setError('')}
      }catch(e){if(!stopped){setWorld(null);setError(e instanceof Error?e.message:'File Folder unavailable')}}
    }
    void load()
    return()=>{stopped=true}
  },[slug,entrance])
  const things=world?[...world.offers.slice(0,12).map(o=>({id:o.id,name:o.name,kind:'offer' as const,tag:'OFFER'})),
    ...world.systems.slice(0,12).map((s,i)=>({id:'system:'+i,name:s.name,kind:'system' as const,tag:'PUBLIC SYSTEM'}))]:[]
  const checkout=typeof window!=='undefined' ? new URLSearchParams(window.location.search).get('legion') : null
  const checkoutUrl=world ? world.shopUrl.replace('#offers',(checkout?'&legion='+encodeURIComponent(checkout):'')+'#offers') : '/market'
  const places:Landmark[]=things.slice(0,14).map((p,i,a)=>({...p,at:at(i,a.length),click:()=>setSelection({
    ...p,at:at(i,a.length),click:()=>{}, // Offers are inspected in the existing Client-controlled checkout.
  })}))
  return <main className="min-h-dvh bg-[#091521] text-white" data-public-file-folder-avatar-crossing={entrance}>
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5">
      <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-200">System Switch · Public File Folder</p>
        <h1 className="mt-2 text-3xl font-black">{world?.name||'Client Customer Door'}</h1>
        <p className="mt-2 max-w-2xl text-xs text-stone-400">{world?.description||'A Client-controlled public world. Private File Folder construction remains reserved for its Lord or Lady.'}</p></div>
      
      <Link href="/system-switch/customer-doors" className="flex items-center gap-2 border border-white/10 p-3 text-xs text-sky-200"><ArrowLeft className="h-4 w-4"/>System Switch Plaza</Link>
    </header>
    {error&&<p role="alert" className="mx-auto max-w-7xl px-4 py-5 text-rose-200">{error}</p>}
    {world&&<section className="mx-auto max-w-7xl px-3">
      <div className="relative h-[56vh] min-h-[420px] overflow-hidden border border-white/10">
        <SpatialWorld places={places} presence={presence} input={input} others={others} onNearby={setNearby}/>
        <div className="pointer-events-none absolute left-3 top-3 bg-[#07111b]/80 p-3 text-xs">
          <p className="flex items-center gap-2"><Users className="h-4 w-4"/>{online?others.length+1+' present':'Connecting multiplayer presence…'}</p>
          <p className="mt-1 text-emerald-200">{nearby||'Move through the world to a public system or offer'}</p>
        </div>
      </div>
      <Controls input={input}/>
      {selection&&<div className="mt-4 border border-emerald-300/30 bg-emerald-300/[.035] p-5">
        <p className="text-[10px] font-black uppercase text-emerald-200">{selection.kind==='offer'?'Client offer':'Public system'}</p>
        <h2 className="mt-2 text-xl font-black">{selection.name}</h2>
        <p className="mt-2 text-xs text-stone-400">{selection.kind==='offer'?world.offers.find(o=>o.id===selection.id)?.description:world.systems[Number(selection.id.replace('system:',''))]?.description}</p>
        {selection.kind==='offer'&&<Link href={checkoutUrl} className="mt-4 inline-flex items-center gap-2 bg-emerald-300 px-4 py-3 text-xs font-black text-[#071a15]"><ShoppingBag className="h-4 w-4"/>Continue to Client checkout <ArrowRight className="h-4 w-4"/></Link>}
      </div>}
      <div className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {world.offers.map(o=><div key={o.id} className="border border-white/10 p-5">
          <p className="text-[10px] font-bold uppercase text-emerald-200">{o.offerType}</p><h3 className="mt-2 text-lg font-black">{o.name}</h3>
          <p className="mt-2 text-xs text-stone-400">{o.description}</p>
          <p className="mt-3 text-sm font-bold text-amber-200">{o.price===null?'Request Client quote':o.price.toLocaleString()+' '+o.currency}</p>
          <Link href={checkoutUrl} className="mt-4 inline-flex items-center gap-2 text-xs text-sky-200">Buy from Client <ArrowRight className="h-4 w-4"/></Link>
        </div>)}
      </div>
      <p className="pb-8 text-xs text-stone-500"><ShieldCheck className="mr-1 inline h-4 w-4"/>Buyer payments and orders continue through the Client’s existing Customer Door. Avatar access never authorizes private construction, wallets or Administration.</p>
    </section>}
  </main>
}

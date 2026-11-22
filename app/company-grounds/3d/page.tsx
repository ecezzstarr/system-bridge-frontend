'use client'

import Link from 'next/link'
import {Suspense, useCallback, useState, useEffect, type ReactNode} from 'react'
import {useRouter} from 'next/navigation'
import {Canvas, type ThreeEvent} from '@react-three/fiber'
import {OrbitControls, useGLTF} from '@react-three/drei'
import {Flame, ArrowLeft, Menu, X, RotateCcw} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'

type PlaceId = 'hope'|'stability'|'administrations'|'dream'|'management'|'sunshine'|'river'|'market'|'estates'|'grounds'

const PLACES: Record<PlaceId,{name:string;department:string;role?:string;description:string}> = {
  hope:{name:'Hope',department:'Bridgers',role:'bridger',description:'Prospect acquisition, outreach, Bridge AI and social production'},
  stability:{name:'Stability',department:'Agents',role:'agent',description:'Distribution, stores, logistics and practical support'},
  administrations:{name:'Administrations',department:'A Time',role:'admin',description:'Company systems, oversight, infrastructure and authorized release'},
  dream:{name:'Dream Lovely',department:'Clients',role:'client',description:'File Folders, client enterprises, products and Customer Doors'},
  management:{name:'Company Managements',department:'Staff workspaces',description:'Regional management and company staff coordination'},
  sunshine:{name:'Sunshine',department:'Mechanized Wealth',description:'Savings-supported participation and income workflows'},
  river:{name:'Burning River',department:'Flame Event',description:'The shared company event and participation'},
  market:{name:'Open Market',department:'Client products',description:'Market entrances and products from Client businesses'},
  estates:{name:'Client Estates',department:'File Folder previews',description:'Explore available Client File Folders without entering private workspaces'},
  grounds:{name:'Company Grounds',department:'Weave Open World',description:'The central shared company environment'},
}

function identifyPlace(name:string):PlaceId|null{
  const n=name.toUpperCase()
  if(n.startsWith('HOPE_'))return 'hope'
  if(n.startsWith('STABILITY_'))return 'stability'
  if(n.startsWith('ADMIN_'))return 'administrations'
  if(n.startsWith('DREAM_'))return 'dream'
  if(n.startsWith('MANAGEMENT_'))return 'management'
  if(n.startsWith('SUNSHINE_'))return 'sunshine'
  if(n.startsWith('BURNING_RIVER_'))return 'river'
  if(n.startsWith('MARKET_'))return 'market'
  if(n.startsWith('ESTATE_'))return 'estates'
  if(n.startsWith('COMPANY_GROUNDS_'))return 'grounds'
  return null
}

function ThreeCampus({onSelect,onHover,onReady}:{onSelect:(place:PlaceId)=>void;onHover:(place:PlaceId|null)=>void;onReady:()=>void}){
  const model=useGLTF('/models/weave-company-grounds.glb')
  useEffect(()=>{onReady()},[onReady])
  const click=(e:ThreeEvent<MouseEvent>)=>{
    const place=identifyPlace(e.object.name)
    if(place){e.stopPropagation();onSelect(place)}
  }
  const over=(e:ThreeEvent<PointerEvent>)=>{
    const place=identifyPlace(e.object.name)
    if(place){e.stopPropagation();onHover(place)}
  }
  const out=(e:ThreeEvent<PointerEvent>)=>{
    if(identifyPlace(e.object.name)){e.stopPropagation();onHover(null)}
  }
  return <primitive object={model.scene} onClick={click} onPointerOver={over} onPointerOut={out}/>
}

function Fallback({children}:{children:ReactNode}){
  return <div className="absolute inset-0 flex items-center justify-center bg-[#0a1d32] text-center text-[#fff1d9]">{children}</div>
}

export default function CompanyGrounds3D(){
  const router=useRouter()
  const {user,isInitialized}=useAuth()
  const [selected,setSelected]=useState<PlaceId|null>(null)
  const [hovered,setHovered]=useState<PlaceId|null>(null)
  const [loaded,setLoaded]=useState(false)
  const [directory,setDirectory]=useState(false)
  const [denied,setDenied]=useState<PlaceId|null>(null)
  const sceneReady=useCallback(()=>setLoaded(true),[])
  const eventHref=user?.role==='client'?'/client/event'
    :['admin','bridger','agent'].includes(user?.role??'')?'/event':'/flame-event'
  const ownRoute=user?.role==='bridger'?'/bridger/dashboard':user?.role==='agent'?'/agent/dashboard'
    :user?.role==='admin'?'/admin/dashboard':user?.role==='client'?'/client/dashboard':'/login'

  function resolvePath(place:PlaceId){
    switch(place){
      case 'hope':return user?'/bridger/dashboard':'/login'
      case 'stability':return user?'/agent/dashboard':'/login'
      case 'administrations':return user?'/admin/dashboard':'/login?portal=admin'
      case 'dream':return user?'/client/dashboard':'/client/login'
      case 'management':return !user?'/manager/login':user.role==='client'?'/client/staff-workspace':user.role==='admin'?'/admin/dashboard':'/weave/lifestyles'
      case 'sunshine':return '/weave/lifestyles/sunshine'
      case 'river':return eventHref
      case 'market':return '/market'
      case 'estates':return '/file-folder-preview'
      case 'grounds':return '/system-switch/world'
    }
  }
  function enter(place:PlaceId){
    const role=PLACES[place].role
    if(!isInitialized)return
    if(role&&user&&role!==user.role){setDirectory(false);setDenied(place);return}
    router.push(resolvePath(place))
  }

  return <main data-weave-grounds-live-model="true" className="relative h-[100dvh] w-full overflow-hidden bg-[#0b2340] text-[#fff8e8]">
    <h1 className="sr-only">Weave of Presence · Interactive 3D Company Grounds</h1>
    <div className="absolute inset-0" role="application" aria-label="Interactive 3D Weave Company Grounds. Drag to orbit and pinch to zoom. Select a building, then enter through its route.">
      <Canvas dpr={[1,1.5]} camera={{position:[5,143,221],fov:43,near:.5,far:650}}
        frameloop="demand" gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}
        onPointerMissed={()=>setSelected(null)}
        style={{cursor:hovered?'pointer':'grab'}}>
        <color attach="background" args={['#8fb5c5']}/>
        <ambientLight intensity={2.1}/>
        <hemisphereLight args={['#d7f0ff','#b69c68',2.2]}/>
        <directionalLight position={[-90,125,70]} intensity={3} color="#fff2d5"/>
        <Suspense fallback={null}>
          <ThreeCampus onSelect={setSelected} onHover={setHovered} onReady={sceneReady}/>
        </Suspense>
        <OrbitControls target={[0,8,0]} minDistance={55} maxDistance={355}
          minPolarAngle={.15} maxPolarAngle={Math.PI/2.04} enableDamping dampingFactor={.08}
          rotateSpeed={.65} zoomSpeed={.9} screenSpacePanning={false}/>
      </Canvas>
    </div>
    {!loaded&&<Fallback>
      <div className="flex flex-col items-center gap-3 px-6">
        <img src="/images/weave-company-grounds-3d-preview.png" alt="3D Company Grounds aerial preview"
          className="max-h-[48dvh] max-w-full rounded-xl object-contain"/>
        <p className="text-sm">Preparing the interactive Company Grounds…</p>
      </div>
    </Fallback>}
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-[#051323e8] via-[#051323a9] to-transparent p-3 sm:p-5">
      <Link href="/" className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dfc38b70] bg-[#061b30b8] px-4 text-sm text-[#fff5de]">
        <ArrowLeft size={17} aria-hidden="true"/> Official homepage
      </Link>
      <span className="mt-2 hidden text-center text-sm tracking-[.14em] text-[#faecd0] sm:block">WEAVE · COMPANY GROUNDS · 3D</span>
      <button type="button" onClick={()=>setDirectory(true)} aria-label="Open 3D company directory"
        className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dfc38b70] bg-[#061b30b8] px-4 text-sm">
        <Menu size={18} aria-hidden="true"/> Directory
      </button>
    </header>
    <div className="pointer-events-none absolute bottom-0 inset-x-0 z-10 p-3 sm:p-5">
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-[#dfc38b70] bg-[#061b30e8] px-4 py-3 shadow-2xl backdrop-blur-md">
        {selected ? <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-[#f4d693]">{PLACES[selected].name}</p>
              <p className="text-xs tracking-wide text-[#d8e2e8]">{PLACES[selected].department}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#f0f1e9]">{PLACES[selected].description}</p>
            </div>
            <button className="rounded-full p-1" type="button" onClick={()=>setSelected(null)} aria-label="Clear selected building"><X size={18}/></button>
          </div>
          <button type="button" disabled={!isInitialized} onClick={()=>enter(selected)}
            className="mt-3 min-h-11 w-full rounded-full bg-[#e8c47e] px-5 font-semibold text-[#24170b] disabled:opacity-40">
            Enter {PLACES[selected].name}
          </button>
        </> : <div className="flex items-center gap-2 text-sm text-[#f3e8d3]">
          <RotateCcw size={16} aria-hidden="true"/> Drag to orbit · Pinch to zoom · Tap a building to select
        </div>}
      </div>
    </div>
    {directory&&<div className="absolute inset-0 z-30 flex items-center justify-center bg-[#03101bc9] p-4" role="presentation"
      onClick={()=>setDirectory(false)}>
      <section role="dialog" aria-modal="true" aria-label="3D Company directory"
        onClick={event=>event.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#cba86b] bg-[#0c263b] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Company entrances</h2>
          <button type="button" className="min-h-11 px-2" onClick={()=>setDirectory(false)}>Close</button>
        </div>
        <nav className="mt-3 grid grid-cols-2 gap-2">
          {(Object.keys(PLACES) as PlaceId[]).map(place=><button key={place} type="button"
            disabled={!isInitialized} onClick={()=>enter(place)}
            className="min-h-12 rounded-xl border border-[#b8955d] px-2 text-left text-sm disabled:opacity-50">
            {PLACES[place].name}
          </button>)}
        </nav>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#f4d693]">
          <Link href="/register" className="underline">Join Weave</Link>
          <Link href="/file-folder-preview" className="underline">File Folder previews</Link>
          <Link href="/system-switch/world" className="underline">Weave Open World</Link>
        </div>
      </section>
    </div>}
    {denied&&<div className="absolute inset-0 z-40 flex items-center justify-center bg-[#03101bd9] p-4">
      <section role="alertdialog" aria-modal="true" aria-labelledby="grounds-access-denied-title"
        className="w-full max-w-sm rounded-2xl border border-[#cba86b] bg-[#112c3e] p-6 shadow-2xl">
        <p className="flex items-center gap-2 text-[#f4d693]"><Flame size={18}/> The Flame</p>
        <h2 id="grounds-access-denied-title" className="mt-3 text-xl font-semibold">{PLACES[denied].name} entrance</h2>
        <p className="mt-3 text-sm leading-relaxed">This account cannot enter another department. Your established department and its working systems remain protected.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={ownRoute} className="min-h-11 rounded-full bg-[#e8c47e] px-5 py-3 text-sm font-semibold text-[#25190d]">
            Open my department
          </Link>
          <button type="button" className="min-h-11 px-3 text-sm underline"
            onClick={()=>setDenied(null)}>Remain in Company Grounds</button>
        </div>
      </section>
    </div>}
  </main>
}

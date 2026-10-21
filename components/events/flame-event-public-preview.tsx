'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import {Html,OrbitControls} from '@react-three/drei'
import * as THREE from 'three'
import {AdaptiveCanvas} from '@/components/world/adaptive-canvas'
import {RiverSurface} from '@/components/events/flame-event-mobile-scene'
import type {FlameWorldCustomerDoor} from '@/components/events/flame-event-open-world'

export type PublicClientFolder=FlameWorldCustomerDoor & {
  visual_preset?:string
  public_systems?:{name:string;system_type:string}[]
}

function publicDoorHref(door:PublicClientFolder){
  return '/market/'+encodeURIComponent(door.public_slug)+'?via=system-switch&checkout=1#offers'
}

const LOCATIONS:[number,number][]=[
  [-9,-4],[-3,-9],[4,-6],[10,-12],[-11,-15],[0,-17],[10,-21],[-4,-24],[5,-27],
]

function BuiltClientSystem({door,index}:{door:PublicClientFolder;index:number}){
  const [x,z]=LOCATIONS[index]||[0,-15]
  const systems=door.public_systems||[]
  const kind=systems[0]?.system_type||
    (door.level==='market_hall'?'marketplace_network':door.level==='storefront'?'commerce_storefront':'customer_door')
  const market=/market|commerce|store|distribution/.test(kind)
  const media=/stream|media|broadcast|creator/.test(kind)
  const service=/clinic|health|hospital|service|operations/.test(kind)
  const large=door.level==='market_hall'
  const color=door.visual_preset==='garden_exchange'?'#7ad6bd':door.visual_preset==='night_market'?'#d79adf':
    door.visual_preset==='glass_citadel'?'#9cddf6':'#f3cd8f'
  const href=publicDoorHref(door)
  const open=()=>{window.location.assign(href)}
  return <group position={[x,0,z]} onClick={open} onPointerOver={()=>{document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor='auto'}}>
    <mesh position={[0,-.12,0]} receiveShadow>
      <cylinderGeometry args={[large?3.6:2.9,large?4:3.25,.52,12]}/>
      <meshStandardMaterial color="#526e81" roughness={.9}/>
    </mesh>
    <mesh position={[0,.2,0]} receiveShadow>
      <cylinderGeometry args={[large?3.25:2.65,large?3.35:2.75,.25,12]}/>
      <meshStandardMaterial color="#bbc0ba" roughness={.77}/>
    </mesh>
    <mesh position={[0,.38,0]}>
      <boxGeometry args={[large?3.4:2.6,.25,large?2.2:1.8]}/>
      <meshStandardMaterial color="#33465a" metalness={.32}/>
    </mesh>
    {media?<>
      <mesh position={[0,2.2,0]}>
        <cylinderGeometry args={[.65,1.05,3.5,8]}/>
        <meshStandardMaterial color="#394f6a" emissive={color} emissiveIntensity={.12}/>
      </mesh>
      <mesh position={[0,4.3,0]}><octahedronGeometry args={[.72,0]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6}/></mesh>
    </>:market?<>
      {[-1,0,1].map((unit)=><group key={unit} position={[unit*1.06,0,0]}>
        <mesh position={[0,1.25,0]}><boxGeometry args={[.97,1.6,1.6]}/><meshStandardMaterial color="#899bb0"/></mesh>
        <mesh position={[0,2.17,0]}><coneGeometry args={[.86,.88,4]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.18}/></mesh>
        <mesh position={[0,1.1,.84]}><planeGeometry args={[.67,.8]}/><meshBasicMaterial color="#142a40"/></mesh>
      </group>)}
    </>:service?<>
      <mesh position={[0,1.65,0]}><boxGeometry args={[2.35,2.5,1.7]}/><meshStandardMaterial color="#a3b7c8"/></mesh>
      <mesh position={[0,3.15,0]}><boxGeometry args={[1.9,.48,1.9]}/><meshStandardMaterial color={color}/></mesh>
      <mesh position={[0,2,.89]}><boxGeometry args={[.24,1.2,.05]}/><meshBasicMaterial color="#17465c"/></mesh>
      <mesh position={[0,2,.89]}><boxGeometry args={[1.2,.24,.05]}/><meshBasicMaterial color="#17465c"/></mesh>
    </>:<>
      <mesh position={[0,1.46,0]}><boxGeometry args={[2.55,2.1,1.75]}/><meshStandardMaterial color="#9ba8b5"/></mesh>
      <mesh position={[0,2.75,0]}><coneGeometry args={[1.8,1.2,4]}/><meshStandardMaterial color={color} metalness={.4} emissive={color} emissiveIntensity={.2}/></mesh>
      <mesh position={[0,1.2,.91]}><boxGeometry args={[.8,1.35,.09]}/><meshStandardMaterial color="#315671"/></mesh>
    </>}
    <mesh position={[0,.37,1.5]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.65,.82,32]}/>
      <meshBasicMaterial color={color} side={THREE.DoubleSide}/>
    </mesh>
    <pointLight position={[0,3,1]} intensity={1.1} color={color} distance={7}/>
    <Html center position={[0,media?5.3:market?3.5:service?4:3.85,0]} distanceFactor={14} style={{pointerEvents:'auto'}} zIndexRange={[30,5]}>
      <Link href={href} data-public-client-folder={door.public_slug}
        onClick={event=>event.stopPropagation()}
        className="block w-40 rounded-xl border border-amber-200/60 bg-[#06182d]/95 px-3 py-2 text-center text-white shadow-xl backdrop-blur-sm">
        <span className="block text-[8px] font-black uppercase tracking-widest text-amber-200">
          {systems.length?systems[0].name:door.level==='market_hall'?'Client Market Hall':door.level==='storefront'?'Client Storefront':'Client Customer Door'}
        </span>
        <span className="mt-1 block text-[11px] font-black leading-tight">{door.platform_name||door.name}</span>
        <span className="mt-2 block text-[9px] font-bold text-cyan-100">Open Customer Door →</span>
      </Link>
    </Html>
  </group>
}

function PreviewWorld({enterprises}:{enterprises:PublicClientFolder[]}){
  return <>
    <fog attach="fog" args={['#182f54',28,85]}/>
    <ambientLight intensity={1.35} color="#c3e5fc"/>
    <directionalLight position={[-6,17,-3]} intensity={2.4} color="#ffe4b8"/>
    <pointLight position={[0,5,4]} intensity={4} distance={30} color="#fcae58"/>
    <RiverSurface quiet={false}/>
    <mesh position={[0,-.2,7]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <circleGeometry args={[5.3,48]}/>
      <meshStandardMaterial color="#859aa7" metalness={.1} roughness={.85}/>
    </mesh>
    <mesh position={[0,.14,6]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[3.4,3.58,48]}/>
      <meshBasicMaterial color="#ffe0a3" side={THREE.DoubleSide}/>
    </mesh>
    {enterprises.slice(0,9).map((door,index)=><BuiltClientSystem key={door.public_slug} door={door} index={index}/>)}
    <OrbitControls makeDefault enableDamping enablePan={false} minDistance={9} maxDistance={42}
      minPolarAngle={.45} maxPolarAngle={1.37} target={[0,1,-8]}
      autoRotate autoRotateSpeed={.12}/>
  </>
}

export function FlameEventPublicPreview({enterprises,status}:{
  enterprises:PublicClientFolder[]
  status:'loading'|'ready'|'unavailable'
}){
  const [webgl,setWebgl]=useState(true)
  useEffect(()=>{
    try{
      const test=document.createElement('canvas')
      setWebgl(Boolean(test.getContext('webgl2')||test.getContext('webgl')))
    }catch{setWebgl(false)}
  },[])
  return <section className="relative isolate bg-[#061727] text-white" data-flame-public-preview="client-builds" data-flame-preview-no-avatar="true">
    <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-50" aria-hidden="true"
      style={{backgroundImage:"url('/weave/flame-event/burning-river-world.svg')"}}/>
    <div className="relative z-10 px-4 pb-3 pt-5">
      <p className="text-[10px] font-black uppercase tracking-[.23em] text-amber-200">Company Loop 1 · Flame Event</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">Burning River</h1>
      <p className="mt-2 max-w-xl text-xs leading-5 text-sky-100/85">
        Preview the live Client world. Each structure represents an actual publicly opened Client enterprise and its published systems. Tap a Client File Folder structure to see what its owner sells.
      </p>
    </div>
    <div className="relative h-[56svh] min-h-[350px] max-h-[680px] w-full overflow-hidden" data-flame-preview-interactive-world>
      {webgl&&<AdaptiveCanvas gl={{antialias:false,powerPreference:'low-power'}} mobileGame
        camera={{position:[0,11,24],fov:54,near:.1,far:130}}>
        <PreviewWorld enterprises={enterprises}/>
      </AdaptiveCanvas>}
      {!webgl&&<div className="flex h-full items-center justify-center px-5 text-center text-sm text-white">
        This phone can browse the same Client Customer Doors below without 3D rendering.
      </div>}
      <div className="pointer-events-none absolute bottom-2 left-3 rounded-lg border border-amber-200/20 bg-[#081b34]/85 px-3 py-2 text-[10px] text-sky-100">
        Drag to look around · Tap a building to enter · No avatar required
      </div>
    </div>
    <div className="relative z-10 px-4 pb-5">
      <h2 className="text-sm font-black text-amber-100">Open Client File Folders</h2>
      {enterprises.length===0?<p className="mt-2 text-xs text-sky-100/75">
        {status==='loading'?'Checking for public Client Customer Doors…':status==='unavailable'?'The public Client feed is unavailable. Please retry.':'No Client has opened a public Customer Door yet.'}
      </p>:<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {enterprises.map(door=><Link href={publicDoorHref(door)} key={door.public_slug}
          className="rounded-xl border border-cyan-100/20 bg-white/[.05] p-3 text-xs text-sky-100">
          <span className="block font-black">{door.platform_name||door.name}</span>
          <span className="mt-1 block text-[10px] text-slate-300">
            {door.public_systems?.[0]?.name|| (door.level==='market_hall'?'Market Hall':door.level==='storefront'?'Storefront':'Customer Door')}
          </span>
          <span className="mt-2 block font-bold text-amber-200">View products & services →</span>
        </Link>)}
      </div>}
      <p className="mt-3 text-[10px] leading-5 text-sky-100/65">
        Only public systems approved by their Client are shown. Private workspaces and unpublished builds are not exposed.
      </p>
    </div>
  </section>
}

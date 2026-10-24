'use client'

import {useMemo,useRef} from 'react'
import Link from 'next/link'
import {useFrame} from '@react-three/fiber'
import * as THREE from 'three'
import {AdaptiveCanvas} from '@/components/world/adaptive-canvas'
import type {PublicWorldDomain} from '@/lib/weave-open-world-domains'

/* The approved illustrated land is not a list of imaginary Client accounts.
   Every live marker and the rotating 3D castle below comes from the verified
   System Switch public world feed. Only commissioned Doors can be entered. */
const SCENE_HEIGHT=1672
const SCENE_TILES=Array.from({length:10},(_,i)=>({
  href:'/weave/open-world/scene-'+String(i).padStart(2,'0')+'.webp',
  start:Math.floor(SCENE_HEIGHT*i/10),
  end:Math.floor(SCENE_HEIGHT*(i+1)/10),
}))
const finish=(number:number,min:number,max:number)=>Math.max(min,Math.min(max,number))
function plot(domain:PublicWorldDomain){
  return {
    left:finish(50+domain.location.x*.31,16,84),
    top:finish(35+domain.location.z*.27,20,78),
  }
}

function LiveClientCastle({domain}:{domain:PublicWorldDomain}){
  const pivot=useRef<THREE.Group>(null)
  const height=domain.tier==='plus'?5:domain.tier==='premium'?4.25:domain.tier==='pro'?3.4:2.75
  const level=Math.min(2,Math.log2(domain.buildLevel+1)*.35)
  const tower=height+level
  const stone=domain.tier==='plus'?'#fff0cc':domain.tier==='premium'?'#ead4b3':
    domain.tier==='pro'?'#c3b9cd':'#c0cbd0'
  const roof=domain.tier==='plus'?'#d6a642':domain.tier==='premium'?'#b88955':
    domain.tier==='pro'?'#8161aa':'#416d8c'
  const lit=domain.activity.operatingSystems>0
  useFrame((_,delta)=>{if(pivot.current)pivot.current.rotation.y+=Math.min(delta,.05)*.16})
  return <group ref={pivot} data-live-domain-castle={domain.domainId}>
    <mesh position={[0,.18,0]}><cylinderGeometry args={[2.5,2.9,.36,8]}/>
      <meshStandardMaterial color="#426b57" roughness={.87}/></mesh>
    <mesh castShadow position={[0,tower*.47+.38,0]}>
      <boxGeometry args={[2.55,tower*.94,2.5]}/>
      <meshStandardMaterial color={stone} roughness={.54} metalness={.13}/>
    </mesh>
    <mesh castShadow position={[0,tower+.67,0]}>
      <coneGeometry args={[2,1.76,4]}/>
      <meshStandardMaterial color={roof} metalness={.44} roughness={.27}/>
    </mesh>
    {[-1,1].map(side=><group key={side} position={[side*1.5,0,.56]}>
      <mesh castShadow position={[0,(tower+1.2)/2,0]}>
        <cylinderGeometry args={[.55,.68,tower+1.2,8]}/>
        <meshStandardMaterial color={stone} roughness={.49}/>
      </mesh>
      <mesh position={[0,tower+1.45,0]}><coneGeometry args={[.88,1.35,8]}/>
        <meshStandardMaterial color={roof} metalness={.3} roughness={.3}/></mesh>
    </group>)}
    <mesh position={[0,1.02,1.30]}>
      <boxGeometry args={[.8,1.75,.1]}/>
      <meshStandardMaterial color={domain.customerDoor.open?'#f7cb72':'#253a45'}
        emissive={domain.customerDoor.open?'#b37526':'#000000'} emissiveIntensity={domain.customerDoor.open?.48:0}/>
    </mesh>
    {domain.building&&<group data-castle-live-construction={domain.activity.buildProgress}>
      <mesh position={[2.13,tower*.52,1.6]}><boxGeometry args={[.1,tower, .11]}/>
        <meshStandardMaterial color="#fad183"/></mesh>
      <mesh position={[-2.13,tower*.52,1.6]}><boxGeometry args={[.1,tower,.11]}/>
        <meshStandardMaterial color="#fad183"/></mesh>
    </group>}
    {lit&&<mesh position={[0,tower+1.9,0]}>
      <octahedronGeometry args={[.43,0]}/>
      <meshStandardMaterial color="#ffe6a2" emissive="#f4aa46" emissiveIntensity={1.2}/>
    </mesh>}
    {lit&&<pointLight position={[0,tower+.8,1]} color="#fff1c9" intensity={2} distance={12}/>}
  </group>
}

export function WeaveOpenWorldAtlas({domains,selected,onSelect,onExplore,onShowDomains,onShowCommunity,onShowGuide,onCustomerDoor,role,enable3D=true}:{
  domains:PublicWorldDomain[]
  selected:string|null
  onSelect:(id:string)=>void
  onExplore:()=>void
  onShowDomains:()=>void
  onShowCommunity:()=>void
  onShowGuide:()=>void
  onCustomerDoor:()=>void
  role:'visitor'|'client'|'agent'|'bridger'|'admin'
  enable3D?:boolean
}){
  const active=useMemo(()=>domains.find(d=>d.domainId===selected)||domains[0]||null,[domains,selected])
  const where=active?plot(active):null
  const staffHref=role==='client'?'/client/system-switch':
    role==='visitor'?'/login':'/system-switch'
  return <div className="relative mx-auto aspect-[941/1672] h-full max-h-full w-auto max-w-full overflow-hidden bg-[#08172b]"
      data-weave-official-atlas="approved-image-live-world"
      data-weave-live-domain-count={domains.length}
      style={{backgroundImage:"url('/weave/open-world/scene-preview.webp')",backgroundPosition:'center',backgroundSize:'100% 100%'}}>
    <div className="pointer-events-none absolute inset-0" aria-hidden="true" data-weave-official-art-tiles="10">
      {SCENE_TILES.map((tile,i)=><img key={tile.href}
        src={tile.href} width={941} height={tile.end-tile.start}
        alt="" loading={i<5?'eager':'lazy'} decoding="async"
        className="absolute left-0 w-full object-fill"
        style={{top:(tile.start/SCENE_HEIGHT*100)+'%',height:((tile.end-tile.start)/SCENE_HEIGHT*100)+'%'}}/>)}
    </div>
    {/* The picture depicts example fortresses. The only live castles are generated
        from the purchased Client domains returned by WEAVE's protected projection. */}
    {domains.map(domain=>{
      const at=plot(domain)
      return <button key={domain.domainId} type="button"
        aria-label={'Open live '+domain.tier+' File Folder castle: '+domain.publicName}
        aria-pressed={domain.domainId===active?.domainId}
        onClick={()=>onSelect(domain.domainId)}
        className={'absolute z-20 flex min-h-10 min-w-10 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border px-2 py-1 shadow-[0_0_20px_rgba(251,191,36,.52)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white '+(domain.domainId===active?.domainId?'border-white bg-[#60351e]/90 text-[#fff4cd]':'border-[#f4cf7e] bg-[#0a2540]/90 text-[#ffe3a0]')}
        style={{left:at.left+'%',top:at.top+'%'}}
        data-open-world-domain={domain.domainId} data-live-file-folder-tier={domain.tier}
        title={domain.publicName}>
        <span className="text-[9px] font-black tracking-widest">LIVE</span>
        <span className="max-w-20 truncate text-[8px] font-semibold capitalize">{domain.tier}</span>
      </button>
    })}
    {enable3D&&active&&where&&<div aria-label={'Live three-dimensional '+active.tier+' File Folder castle'} role="img"
      data-weave-live-castle-spotlight={active.domainId}
      className="pointer-events-none absolute z-10 h-[19%] w-[32%] -translate-x-1/2 -translate-y-[115%] overflow-visible"
      style={{left:where.left+'%',top:where.top+'%'}}>
      <AdaptiveCanvas camera={{position:[10,11,14],fov:40,near:.1,far:90}}
        gl={{antialias:false,alpha:true,powerPreference:'low-power'}}
        fallback={<div className="h-full w-full" aria-hidden="true"/>} mobileGame>
        <ambientLight intensity={1.5} color="#fff5df"/>
        <hemisphereLight args={['#d6e9ff','#947348',1.4]}/>
        <directionalLight position={[9,16,11]} intensity={2.4} color="#ffe4a8"/>
        <LiveClientCastle domain={active}/>
      </AdaptiveCanvas>
    </div>}
    <button type="button" aria-label="Open World menu and domains"
      onClick={onShowDomains} className="absolute z-20 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      style={{right:'1%',top:'1%',width:'10%',height:'6%'}}/>
    <Link href={staffHref} aria-label="Bridge of Radiance: System Switch crossing"
      className="absolute z-20 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      style={{left:'70%',top:'16%',width:'29%',height:'5%'}}/>
    {/* Invisible semantic controls are positioned over the illustration's
        EXISTING entrance/menu artwork. No duplicate word-cards are painted. */}
    <Link href={staffHref} aria-label="Staff Entrance" title="Staff Entrance"
      className="absolute z-20 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      style={{left:'2.2%',top:'79.2%',width:'31.5%',height:'6.9%'}} data-weave-image-entrance="staff"/>
    <button type="button" aria-label="Visitor Entrance: explore WEAVE live 3D world"
      onClick={onExplore} className="absolute z-20 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      style={{left:'34.0%',top:'79.2%',width:'31.5%',height:'6.9%'}} data-weave-image-entrance="visitor"/>
    <button type="button" aria-label="Customer Door: commissioned Client products and services"
      onClick={onCustomerDoor} className="absolute z-20 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      style={{left:'66.0%',top:'79.2%',width:'31.5%',height:'6.9%'}} data-weave-image-entrance="customer"/>
    <button type="button" aria-label="World Map" onClick={onExplore}
      className="absolute z-20 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      style={{left:'0',top:'88.1%',width:'19.8%',height:'6.5%'}}/>
    <button type="button" aria-label="Domains" onClick={onShowDomains}
      className="absolute z-20 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      style={{left:'20%',top:'88.1%',width:'19.8%',height:'6.5%'}}/>
    <button type="button" aria-label="Explore 3D" onClick={onExplore}
      className="absolute z-20 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      style={{left:'40%',top:'88.1%',width:'19.8%',height:'6.5%'}}/>
    <button type="button" aria-label="Community" onClick={onShowCommunity}
      className="absolute z-20 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      style={{left:'60%',top:'88.1%',width:'19.8%',height:'6.5%'}}/>
    <button type="button" aria-label="Guide" onClick={onShowGuide}
      className="absolute z-20 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      style={{left:'80%',top:'88.1%',width:'19.8%',height:'6.5%'}}/>
  </div>
}

'use client'

import {Suspense,useEffect,useMemo} from 'react'
import {Html,OrbitControls,Line} from '@react-three/drei'
import {useFrame,useThree} from '@react-three/fiber'
import {BurningRiverFoodStore3D} from './burning-river-food-store-3d'
import {WeaveOpenWorldLandscape} from '@/components/world/weave-open-world-landscape'
import {CityMaterial} from '@/components/system-switch/file-folder-city-material'
import * as THREE from 'three'
import {AdaptiveCanvas} from '@/components/world/adaptive-canvas'
import {FILE_FOLDER_PALETTES} from '@/lib/file-folder-world-presets'
import type {PublicWorldDomain} from '@/lib/weave-open-world-domains'

type WorldSceneProps={
  placing:boolean;onPlace:(point:{x:number;z:number})=>void;preview:{x:number;z:number}|null
  carrierCode?:string|null;focus:'world'|'food'
  domains:PublicWorldDomain[];links:{from:string;to:string}[];selected:string|null
  onSelect:(id:string)=>void
}

const palette:{[key:string]:[string,string,string]}={
  standard:[FILE_FOLDER_PALETTES['standard-living-valley'].structure,FILE_FOLDER_PALETTES['standard-living-valley'].accent,FILE_FOLDER_PALETTES['standard-living-valley'].glow],
  pro:[FILE_FOLDER_PALETTES['radiant-blue'].structure,FILE_FOLDER_PALETTES['radiant-blue'].accent,FILE_FOLDER_PALETTES['radiant-blue'].glow],
  premium:[FILE_FOLDER_PALETTES['ember-gold'].structure,FILE_FOLDER_PALETTES['ember-gold'].accent,FILE_FOLDER_PALETTES['ember-gold'].glow],
  plus:[FILE_FOLDER_PALETTES['plus-white-gold'].structure,FILE_FOLDER_PALETTES['plus-white-gold'].accent,FILE_FOLDER_PALETTES['plus-white-gold'].glow],
  unclassified:['#787c87','#d1bdab','#a7b7c2'],
}
function MovingBurningRiver(){
 const river=useMemo(()=>{
  const curve=new THREE.CatmullRomCurve3(Array.from({length:18},(_,i)=>{
   const z=-110+i*13
   return new THREE.Vector3(Math.sin(i*.62)*6,-.25,z)
  }))
  return new THREE.TubeGeometry(curve,200,2.4,10,false)
 },[])
 useEffect(()=>()=>river.dispose(),[river])
 const vertex=String.raw`
  varying vec2 vUv;
  void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
 `
 const water=useMemo(()=>new THREE.ShaderMaterial({
  uniforms:{time:{value:0}},
  vertexShader:vertex,
  fragmentShader:String.raw`
   precision mediump float;
   uniform float time;varying vec2 vUv;
   void main(){
    vec2 p=vUv;
    float wave=sin(p.y*120.0-time*1.4+sin(p.x*20.0+time*.7));
    wave+=.36*sin(p.y*210.0-time*2.2+p.x*14.0);
    float crest=smoothstep(.45,.95,wave);
    vec3 deep=mix(vec3(.015,.13,.19),vec3(.055,.33,.41),p.x);
    vec3 blue=deep+vec3(.1,.19,.2)*wave*.45+vec3(.32,.44,.45)*crest*.5;
    gl_FragColor=vec4(blue,1.);
   }
  `,
  side:THREE.DoubleSide,
 }),[vertex])
 const fire=useMemo(()=>new THREE.ShaderMaterial({
  uniforms:{time:{value:0}},
  vertexShader:vertex,
  fragmentShader:String.raw`
   precision mediump float;
   uniform float time;varying vec2 vUv;
   void main(){
    vec2 p=vUv;
    float v=sin(p.y*95.0-time*3.2+sin(p.x*23.0+time*1.3)*1.5);
    v+=.45*sin(p.y*190.0-time*4.7+p.x*31.0);
    float heat=smoothstep(-.1,.85,v);
    vec3 ember=mix(vec3(.78,.12,.022),vec3(1.,.72,.18),heat);
    gl_FragColor=vec4(ember,1.);
   }
  `,
  side:THREE.DoubleSide,
 }),[vertex])
 useFrame(({clock})=>{
  water.uniforms.time.value=clock.elapsedTime
  fire.uniforms.time.value=clock.elapsedTime
 })
 useEffect(()=>()=>{water.dispose();fire.dispose()},[water,fire])
 return <group name="flowing-fire-and-water" userData={{companyLoopEvent:"burning-river"}}>
   <mesh geometry={river} material={water}/>
   <mesh geometry={river} material={fire} position={[1.05,-.035,0]} scale={[.38,.82,1]}/>
 </group>
}

function DomainCastle({domain,selected,onSelect}:{
  domain:PublicWorldDomain;selected:boolean;onSelect:(id:string)=>void
}){
  const [stone,roof,light]=palette[domain.tier]
  const base=domain.tier==='plus'?3:domain.tier==='premium'?2.5:domain.tier==='pro'?2.05:1.6
  const growth=Math.min(3.5,Math.log2(domain.buildLevel+1)*.5)
  const height=base+growth+(domain.building?domain.activity.buildProgress/100*.95:0)
  const [x,z]=[domain.location.x,domain.location.z]
  const isBuilding=domain.building
  const buildHeight=0.3+(domain.activity.buildProgress/100)*(height+.4)
  return <group position={[x,0,z]} onClick={event=>{event.stopPropagation();onSelect(domain.domainId)}}>
    <mesh position={[0,-.16,0]}><cylinderGeometry args={[2.9,3.1,.38,10]}/>
      <meshStandardMaterial color={domain.location.region==='ember_reach'?'#684437':'#697781'} roughness={.94}/>
    </mesh>
    <mesh position={[0,.06,0]}><cylinderGeometry args={[2.63,2.76,.22,12]}/>
      <meshStandardMaterial color={roof} roughness={.54} metalness={.12}/>
    </mesh>
    <mesh position={[0,height*.43+.2,0]} castShadow>
      <boxGeometry args={[2.45,height*.86,2.1]}/>
      <Suspense fallback={<meshStandardMaterial color={stone} metalness={.15} roughness={.7}/>}>
       <CityMaterial kind={domain.tier==='plus'?'glass':domain.tier==='premium'?'warm':'metal'} tileX={2} tileY={Math.max(1,Math.round(height/1.2))} tint={stone}/>
      </Suspense>
    </mesh>
    <mesh position={[0,height+.4,0]} castShadow>
      <coneGeometry args={[1.6,1.7,4]}/>
      <Suspense fallback={<meshStandardMaterial color={roof} roughness={.6}/>}>
       <CityMaterial kind={domain.tier==='premium'?'warm':'metal'} tileX={2} tileY={1} tint={roof}/>
      </Suspense>
    </mesh>
    {/* A three-dimensional entrance exists on every building; commissioned doors
         are lit by verified public Client status, never by visual assumption. */}
    <mesh position={[0,.96,1.087]}>
      <boxGeometry args={[.86,1.56,.14]}/>
      <meshPhysicalMaterial color={domain.customerDoor.open?'#5cbab1':'#20374b'} emissive={domain.customerDoor.open?'#1c9b93':'#000000'} emissiveIntensity={domain.customerDoor.open?.55:0} metalness={.5} roughness={.24} clearcoat={.6}/>
    </mesh>
    <mesh position={[0,1.8,1.17]}>
      <boxGeometry args={[1.12,.1,.16]}/><meshStandardMaterial color={roof} metalness={.7} roughness={.28}/>
    </mesh>
    {[-.78,.78].map(x=><group key={'windows-'+x}>
      {Array.from({length:Math.max(1,Math.min(5,Math.floor(height/1.3)))},(_,level)=><mesh key={level} position={[x,.83+level*1.15,1.083]}>
         <boxGeometry args={[.35,.42,.05]}/>
         <meshPhysicalMaterial color={domain.tier==='plus'?'#bddde8':'#95bbca'} metalness={.26} roughness={.17} clearcoat={.8}/>
       </mesh>)}
    </group>)}
    {[-1,1].map(side=><group key={side} position={[side*1.55,0,.35]}>
      <mesh position={[0,(height+1)/2,0]} castShadow>
        <cylinderGeometry args={[.5,.69,height+1,8]}/>
        <meshStandardMaterial color={stone} metalness={.15} roughness={.58}/>
      </mesh>
      <mesh position={[0,height+1.2,0]}><coneGeometry args={[.73,1.05,8]}/>
        <meshStandardMaterial color={roof} metalness={.3} roughness={.38}/>
      </mesh>
    </group>)}
    {domain.tier==='premium'||domain.tier==='plus'?[-1,1].map(side=>
      <group key={'wing'+side} position={[side*2.25,0,-.85]}>
        <mesh position={[0,.65,0]}><boxGeometry args={[1.5,1.3,1.4]}/>
          <meshStandardMaterial color={stone} roughness={.35} metalness={.24}/></mesh>
        <mesh position={[0,1.42,0]}><coneGeometry args={[1.13,1.22,4]}/>
          <meshStandardMaterial color={roof} metalness={.48}/></mesh>
      </group>):null}
    {isBuilding&&<group name="recorded-domain-construction">
      {[-1,1].map(side=><mesh key={side} position={[side*2.02,buildHeight/2,1.3]}>
        <boxGeometry args={[.1,buildHeight,.14]}/>
        <meshStandardMaterial color="#efbd66" metalness={.76} roughness={.24}/>
      </mesh>)}
      <mesh position={[0,buildHeight,1.3]}><boxGeometry args={[4.3,.12,.14]}/>
        <meshStandardMaterial color="#f3bf71" metalness={.75}/></mesh>
    </group>}
    {domain.activity.operatingSystems>0&&<group>
      <mesh position={[0,height+.99,0]}><octahedronGeometry args={[.42,0]}/>
        <meshStandardMaterial color={light} emissive={light} emissiveIntensity={1.1}/></mesh>
      <pointLight position={[0,height+.3,0]} intensity={2} distance={7} color={light}/>
    </group>}
    {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]}>
      <torusGeometry args={[3.3,.12,10,44]}/>
      <meshBasicMaterial color="#ffd88b" side={THREE.DoubleSide}/></mesh>}
    <Html position={[0,height+2.1,0]} center distanceFactor={26} zIndexRange={[15,2]}>
      <button type="button" onClick={event=>{event.stopPropagation();onSelect(domain.domainId)}}
        className={`w-32 rounded-lg border px-2 py-2 text-center text-[10px] font-black shadow-xl backdrop-blur-md
          ${selected?'border-amber-200 bg-[#53341d]/95 text-amber-100':'border-amber-200/45 bg-[#081b34]/90 text-white'}`}
        aria-pressed={selected} data-open-world-domain={domain.domainId}>
        <span className="block truncate">{domain.publicName}</span>
        <span className="mt-1 block text-[9px] font-medium capitalize text-amber-200">{domain.tier} · {domain.stage}</span>
      </button>
    </Html>
  </group>
}

function WorldScene({domains,links,selected,onSelect,carrierCode,focus,placing,onPlace,preview}:WorldSceneProps){
  const {camera}=useThree()
  useEffect(()=>{camera.position.set(...(focus==='food'?[17,11,17]:[0,66,95]) as [number,number,number])},[camera,focus])
  const byId=useMemo(()=>new Map(domains.map(d=>[d.domainId,d])),[domains])
  return <>
    <fog attach="fog" args={['#1a233c',112,260]}/>
    <ambientLight intensity={1.3} color="#b9d3fc"/>
    <hemisphereLight args={['#b9d8ff','#624337',1.2]}/>
    <directionalLight position={[30,55,15]} intensity={2.2} color="#ffe8bf"/>
    <WeaveOpenWorldLandscape domains={domains} placing={placing} onPlace={onPlace}/>
    {placing&&preview&&<mesh position={[preview.x,.09,preview.z]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[3.15,3.55,40]}/>
      <meshBasicMaterial color="#a7ffe2" side={THREE.DoubleSide} transparent opacity={.85}/>
    </mesh>}
    <MovingBurningRiver/>
    <BurningRiverFoodStore3D carrierCode={carrierCode}/>
    {domains.map(d=><DomainCastle key={d.domainId} domain={d}
      selected={selected===d.domainId} onSelect={onSelect}/>)}
    {links.map((link,i)=>{
      const a=byId.get(link.from),b=byId.get(link.to)
      if(!a||!b)return null
      return <Line key={i} points={[
        [a.location.x,2,a.location.z],[((a.location.x+b.location.x)/2),4,((a.location.z+b.location.z)/2)],
        [b.location.x,2,b.location.z]
      ]} color="#ffde96" transparent opacity={.84} lineWidth={1.7}
        dashed dashScale={2} dashSize={.45} gapSize={.25}/>
    })}
    <OrbitControls makeDefault enableDamping enablePan
      minDistance={16} maxDistance={155}
      minPolarAngle={.2} maxPolarAngle={1.4}
      target={focus==='food'?[9.1,3,-5.1]:[0,0,0]}/>
  </>
}

export function WeaveWorldScene(props:WorldSceneProps){
  return <AdaptiveCanvas camera={{position:[0,66,95],fov:46,near:.1,far:350}}
    gl={{antialias:false,alpha:true,powerPreference:'low-power'}}
    fallback={<div className="flex h-full items-center justify-center px-6 text-center text-sm text-sky-100">3D graphics could not start. Return to World Map to open verified Client domains.</div>}
    mobileGame>
    <WorldScene {...props}/>
  </AdaptiveCanvas>
}

'use client'

import {useMemo,useRef,useState} from 'react'
import {Canvas,useFrame} from '@react-three/fiber'
import {OrbitControls,Text} from '@react-three/drei'
import {DoubleSide, type Group, type Mesh} from 'three'
import {buildFormationProgress} from '@/lib/file-folder-world-runtime'
import {FILE_FOLDER_PALETTES,type FileFolderWorldAppearance} from '@/lib/file-folder-world-presets'

type District={key:string;label:string}
type Build={id:string;title:string;status:string;started_at?:string;completes_at?:string}
type StandardStation='customer_door'|'food_business'|'farm_to_customer'|'boutique_brand'|'creative_studio'|'app_platform'|'build'
type Props={
  appearance:FileFolderWorldAppearance
  districts:District[]
  onEnter:(key:string)=>void
  active:string
  systems:number
  building:number
  builds:Build[]
  now:number
  customerDoor?:{public_slug?:string|null;formation_status?:string|null}|null
  operatingSystems?:Array<{system_type?:string;status?:string;title?:string}>
}

const STATIONS:Record<StandardStation,{label:string;purpose:string;district:string;position:[number,number,number];style:string}>={
  customer_door:{label:'Customer Door',purpose:'Open your published Customer Door or continue its formation.',district:'workshop_core',position:[0,0,10],style:'door'},
  food_business:{label:'Food Business',purpose:'Create a food business and connect products to your Customer Door.',district:'blueprint_foundry',position:[-10,0,2.4],style:'food'},
  farm_to_customer:{label:'Farm to Customer',purpose:'Form a farm-to-customer offer with real orders and fulfilment.',district:'build_market',position:[-11,0,-6.5],style:'farm'},
  boutique_brand:{label:'Boutique Brand',purpose:'Build a clothing or retail brand with working systems.',district:'blueprint_foundry',position:[-2.8,0,-11],style:'boutique'},
  creative_studio:{label:'Creative Studio',purpose:'Create media, animation and creative production systems.',district:'blueprint_foundry',position:[7.5,0,-10.2],style:'studio'},
  app_platform:{label:'App & Platform',purpose:'Design and build a real software platform from its blueprint.',district:'blueprint_foundry',position:[12.2,0,-2.2],style:'platform'},
  build:{label:'Build',purpose:'Visit your active construction yard and install working capability.',district:'formation_yard',position:[0,0,-1],style:'construction'},
}
const KEYS=Object.keys(STATIONS) as StandardStation[]
const STATUS_WORDING:Record<StandardStation,string>={
  customer_door:'Client public entrance',
  food_business:'Business formation opportunity',
  farm_to_customer:'Marketplace and agriculture systems',
  boutique_brand:'Brand and storefront systems',
  creative_studio:'Media production systems',
  app_platform:'App, software and platform projects',
  build:'Real build construction',
}

function NatureMaterial({color,metal=false,glass=false}:{color:string;metal?:boolean;glass?:boolean}){
  return <meshPhysicalMaterial color={color} roughness={metal?.24:glass?.16:.76}
    metalness={metal?.64:glass?.28:.02} clearcoat={glass?.9:.1}
    transparent={glass} opacity={glass?.62:1} side={DoubleSide}/>
}
function Tree({x,z,h=1.75}:{x:number;z:number;h?:number}){
  return <group position={[x,0,z]}>
    <mesh position={[0,h*.45,0]} castShadow><cylinderGeometry args={[.075,.13,h*.9,7]}/><NatureMaterial color="#68513b"/></mesh>
    <mesh position={[0,h*.98,0]} castShadow><dodecahedronGeometry args={[h*.4,1]}/><NatureMaterial color="#3b7549"/></mesh>
    <mesh position={[.15,h*1.2,.05]} castShadow><dodecahedronGeometry args={[h*.25,1]}/><NatureMaterial color="#61904b"/></mesh>
  </group>
}
function Sign({text,selected}:{text:string;selected:boolean}){
 return <group position={[0,3.1,1.3]}>
  <mesh><boxGeometry args={[5.0,.67,.15]}/><NatureMaterial color={selected?'#d9ae65':'#4f5051'}/></mesh>
  <Text position={[0,.015,.091]} fontSize={.29} maxWidth={4.75} color="#fffbea" anchorX="center" anchorY="middle">
    {text.toUpperCase()}
  </Text>
 </group>
}
function Building({id,selected,onSelect,realness,hasLiveSystem}:{id:StandardStation;selected:boolean;
 onSelect:(id:StandardStation)=>void;realness:string;hasLiveSystem:boolean}){
  const spec=STATIONS[id]
  const position=spec.position
  const isBuild=id==='build'
  const isFarm=id==='farm_to_customer'
  const isDoor=id==='customer_door'
  const isPlatform=id==='app_platform'
  const isStudio=id==='creative_studio'
  const isFood=id==='food_business'
  const color=isPlatform?'#b8c3c6':isStudio?'#bdad9e':isFarm?'#b99b75':isFood?'#c5b199':'#d9c6a9'
  const height=isBuild?2.0:isDoor?3.5:isPlatform?3.1:2.7
  return <group position={position} onClick={event=>{event.stopPropagation();onSelect(id)}}>
    <mesh position={[0,-.1,0]} receiveShadow>
      <boxGeometry args={[isBuild?8:6.2,.2,isBuild?5.8:4.7]}/><NatureMaterial color="#bfb7a4"/>
    </mesh>
    {isBuild?<group>
      <mesh position={[0,.35,0]} castShadow><boxGeometry args={[6.3,.7,4.3]}/><NatureMaterial color="#9d9383"/></mesh>
      {[-2.7,0,2.7].map(x=>[-1.65,1.65].map(z=><mesh key={x+':'+z} position={[x,1.9,z]}>
        <boxGeometry args={[.18,3,.18]}/><NatureMaterial color="#c79d5b"/>
      </mesh>))}
      {Array.from({length:4},(_,i)=><mesh key={i} position={[0,.65+i*.85,-1.7]}>
        <boxGeometry args={[6,.14,.2]}/><NatureMaterial color="#c79d5b"/>
      </mesh>)}
      <mesh position={[0,3.2,0]}><boxGeometry args={[6.4,.16,4.5]}/><NatureMaterial color="#b08048"/></mesh>
      <mesh position={[0,1.2,2.16]}><boxGeometry args={[2.5,1.7,.1]}/><NatureMaterial color="#764f31"/></mesh>
    </group>:isDoor?<group>
      <mesh position={[0,1.5,0]}><boxGeometry args={[5.0,3,1.5]}/><NatureMaterial color="#c5bbab"/></mesh>
      <mesh position={[0,2.9,0]}><boxGeometry args={[5.9,.45,2.05]}/><NatureMaterial color="#e2caa6"/></mesh>
      <mesh position={[0,1.4,.83]}><boxGeometry args={[3.1,2.8,.11]}/><NatureMaterial color="#443728"/></mesh>
      <mesh position={[0,1.36,.94]}><boxGeometry args={[2.76,2.5,.09]}/><meshStandardMaterial color="#fff5d0" emissive="#ffd68b" emissiveIntensity={1.65}/></mesh>
      {[-2.3,2.3].map(x=><mesh key={x} position={[x,1.4,.92]}>
        <boxGeometry args={[.4,2.8,.3]}/><NatureMaterial color="#f4d9a5"/>
      </mesh>)}
      <mesh position={[0,3.28,0]}><boxGeometry args={[5.7,.2,2.0]}/><NatureMaterial color="#9f7b50"/></mesh>
    </group>:<group>
      <mesh position={[0,height/2,0]} castShadow><boxGeometry args={[5.3,height,3.9]}/><NatureMaterial color={color}/></mesh>
      <mesh position={[0,height+.22,0]} castShadow><boxGeometry args={[5.9,.45,4.4]}/><NatureMaterial color={isStudio?'#31343a':isPlatform?'#354a58':'#75563f'}/></mesh>
      {Array.from({length:4},(_,i)=><group key={i}>
        <mesh position={[-1.85+i*1.2,1.32,1.99]}><boxGeometry args={[.94,1.55,.11]}/><NatureMaterial color="#c2ecf3" glass/></mesh>
        <mesh position={[-1.85+i*1.2,1.32,2.065]}><boxGeometry args={[.76,1.23,.025]}/><meshStandardMaterial color={isStudio?'#e2a2b9':isPlatform?'#87b3d5':'#b2e7c5'} emissive={isStudio?'#bd73a6':'#527d89'} emissiveIntensity={.1}/></mesh>
      </group>)}
      {isFood&&<mesh position={[0,1.05,2.42]}><boxGeometry args={[5.8,.4,1.2]}/><NatureMaterial color="#bd6444"/></mesh>}
      {realness!=='basic'&&[-2.35,2.35].map(x=><mesh key={x} position={[x,1.1,2.12]}>
        <boxGeometry args={[.13,2.15,.09]}/><NatureMaterial color="#f7e6c7"/>
      </mesh>)}
    </group>}
    {isFarm&&Array.from({length:5},(_,i)=><group key={i} position={[-2.3+i*1.1,0,3.1]}>
      <mesh position={[0,.07,0]}><boxGeometry args={[.72,.12,1.9]}/><NatureMaterial color="#805a3a"/></mesh>
      {[-.5,0,.5].map(z=><mesh key={z} position={[0,.3,z]}><sphereGeometry args={[.27,7,5]}/><NatureMaterial color="#5f9d38"/></mesh>)}
    </group>)}
    {isPlatform&&[0,1.3].map((y,i)=><group key={i} position={[i?1.9:-1.9,3.7+y*.2,0]}>
      <mesh rotation={[0,i?.45:-.45,0]}><boxGeometry args={[1.1,1.3,.07]}/><NatureMaterial color="#475972"/></mesh>
      <mesh position={[0,0,.045]}><boxGeometry args={[.86,1.05,.04]}/><meshStandardMaterial color="#92d7e6" emissive="#6bbfd3" emissiveIntensity={.24}/></mesh>
    </group>)}
    {realness==='high'&&Array.from({length:3},(_,i)=><mesh key={i} position={[-2.4+i*2.4,.3,-2.35]}>
      <boxGeometry args={[1.35,.25,.6]}/><NatureMaterial color={i%2?'#789e70':'#b8a68e'}/>
    </mesh>)}
    <Sign text={spec.label} selected={selected}/>
    {hasLiveSystem&&<mesh position={[0,3.75,0]}><sphereGeometry args={[.22,12,8]}/>
      <meshStandardMaterial color="#b5ffe6" emissive="#5bdcb8" emissiveIntensity={.6}/>
    </mesh>}
    {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.035,0]}>
      <torusGeometry args={[3.55,.055,8,44]}/><meshStandardMaterial color="#ffedbd" emissive="#eed58d" emissiveIntensity={.35}/>
    </mesh>}
  </group>
}

function WaterAndLandscape({details}:{details:boolean}){
 const river=useRef<Mesh>(null)
 useFrame(({clock})=>{if(river.current)river.current.rotation.z=Math.sin(clock.elapsedTime*.5)*.007})
 return <group>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.7,0]} receiveShadow>
    <planeGeometry args={[100,100]}/><NatureMaterial color="#3e829c"/>
  </mesh>
  <mesh ref={river} rotation={[-Math.PI/2,0,0]} position={[0,-.55,7]}>
    <planeGeometry args={[32,14]}/><meshPhysicalMaterial color="#60afc4" metalness={.22} roughness={.16} transparent opacity={.87} clearcoat={.8}/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.37,-4.5]} receiveShadow>
    <circleGeometry args={[22,60]}/><NatureMaterial color="#668655"/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.34,-4.5]}>
    <ringGeometry args={[18,19,60]}/><NatureMaterial color="#b1a282"/>
  </mesh>
  <mesh position={[0,-.25,5]}><boxGeometry args={[5,.2,9]}/><NatureMaterial color="#c4b9a3"/></mesh>
  {[-2.5,2.5].map(x=><group key={x}>
    <mesh position={[x,.33,6.5]}><boxGeometry args={[.19,1.2,9]}/><NatureMaterial color="#bcb6a3"/></mesh>
    {Array.from({length:5},(_,i)=><mesh key={i} position={[x,.9,2.9+i*1.8]}>
      <boxGeometry args={[.26,.15,.25]}/><NatureMaterial color="#ad8d5a"/>
    </mesh>)}
  </group>)}
  {Array.from({length:28},(_,i)=>{
    const angle=i/28*Math.PI*2
    const radius=20+(i%4)*1.45
    return <Tree key={i} x={Math.sin(angle)*radius} z={-4.5+Math.cos(angle)*radius} h={1.2+(i%4)*.44}/>
  })}
  {details&&Array.from({length:16},(_,i)=><group key={i} position={[-18+i*2.45,-.16,-20]}>
    <mesh><boxGeometry args={[1.55,.16,1.4]}/><NatureMaterial color="#745437"/></mesh>
    {[-.4,0,.4].map(z=><mesh key={z} position={[0,.23,z]}>
      <sphereGeometry args={[.31,7,5]}/><NatureMaterial color="#50964d"/>
    </mesh>)}
  </group>)}
  {[0,1,2,3,4,5,6].map(i=>{
    const x=-31+i*10
    return <group key={i} position={[x,0,-30]}>
      <mesh position={[0,5+i%3*2,0]} rotation={[0,i*.3,0]}>
        <coneGeometry args={[8,13+i%3*4,5]}/><NatureMaterial color={i%2?'#768d80':'#94a7a2'}/>
      </mesh>
      <mesh position={[0,11+i%3*2,0]}><coneGeometry args={[2.2,3.6,5]}/><NatureMaterial color="#eff0e7"/></mesh>
    </group>
  })}
 </group>
}
function StandardScene({appearance,selected,onSelect,live}:{appearance:FileFolderWorldAppearance;
 selected:StandardStation;onSelect:(id:StandardStation)=>void;live:Set<StandardStation>}){
 const palette=FILE_FOLDER_PALETTES[appearance.theme]
 const details=appearance.realness!=='basic'
 return <>
  <color attach="background" args={['#c0d9ee']}/>
  <fog attach="fog" args={['#b6cfdd',40,95]}/>
  <ambientLight intensity={1.6}/>
  <hemisphereLight args={['#eff6e6','#567356',1.1]}/>
  <directionalLight position={[-20,28,18]} intensity={3.0} color="#fff5d8"/>
  <pointLight position={[0,3,10]} intensity={26} distance={25} color="#ffdc94"/>
  <WaterAndLandscape details={details}/>
  {KEYS.map(id=><Building key={id} id={id} selected={id===selected}
    onSelect={onSelect} realness={appearance.realness} hasLiveSystem={live.has(id)}/>)}
  <mesh position={[0,-.23,-1]} rotation={[-Math.PI/2,0,0]}>
    <ringGeometry args={[5.5,5.9,48]}/><NatureMaterial color={palette.accent} metal/>
  </mesh>
  <OrbitControls enablePan={false} enableDamping dampingFactor={.08}
    minDistance={17} maxDistance={56} minPolarAngle={.25} maxPolarAngle={1.31}
    target={[0,1,-1]} makeDefault/>
 </>
}
export default function FileFolderStandardLivingWorld({appearance,districts,onEnter,systems,building,builds,now,customerDoor,operatingSystems=[]}:Props){
 const [selected,setSelected]=useState<StandardStation>('customer_door')
 const hasPublishedDoor=Boolean(customerDoor?.public_slug)
 const live=useMemo(()=>{
  const names=operatingSystems.filter(s=>s.status==='active'||s.status==='complete')
   .map(s=>(String(s.system_type||'')+' '+String(s.title||'')).toLowerCase())
  const result=new Set<StandardStation>()
  if(hasPublishedDoor)result.add('customer_door')
  if(names.some(n=>/food|pastr|restaurant|cater/.test(n)))result.add('food_business')
  if(names.some(n=>/farm|agricultur|produce/.test(n)))result.add('farm_to_customer')
  if(names.some(n=>/boutique|fashion|apparel/.test(n)))result.add('boutique_brand')
  if(names.some(n=>/creative|video|animation|broadcast/.test(n)))result.add('creative_studio')
  if(names.some(n=>/platform|app|software/.test(n)))result.add('app_platform')
  return result
 },[operatingSystems,hasPublishedDoor])
 const choice=STATIONS[selected]
 const canEnter=districts.some(d=>d.key===choice.district)
 const linked=selected!=='build'&&live.has(selected)
 const buildCount=builds.filter(b=>b.status==='building').length
 const currentBuild=builds.find(b=>b.status==='building')
 const canOpenDoor=selected==='customer_door'&&hasPublishedDoor
 const doorUrl=canOpenDoor?'/market/'+encodeURIComponent(String(customerDoor?.public_slug)):''
 const progress=currentBuild?Math.round(buildFormationProgress(currentBuild,now)):0
 return <section aria-label="Standard File Folder world" data-standard-file-folder-world="official-customer-door"
   data-official-standard-image="383187.png" data-file-folder-theme={appearance.theme}
   data-file-folder-equipment-pack={appearance.equipmentPack}
   className="relative overflow-hidden rounded-2xl border border-[#b0a078]/35 bg-[#e8eee8] text-[#223449]">
  <header className="border-b border-[#c2bba6]/60 bg-[#eaf1ea] px-4 py-4">
   <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#647645]">WEAVE · Standard File Folder · My World</p>
   <h3 className="mt-1 text-xl font-black">Recognize · Preview · Build · Activate · Operate</h3>
   <p className="mt-2 max-w-3xl text-xs leading-5 text-[#516579]">Your Standard File Folder begins here. Explore the Customer Door, construction yard, business districts and software studio. Each location connects to your own recorded File Folder work.</p>
   <p className="mt-2 text-xs font-bold text-[#576e58]">{buildCount} building · {systems} completed · progress follows real construction records</p>
  </header>
  <div className="h-[370px] w-full sm:h-[560px]" role="img" aria-label="Interactive three-dimensional Standard File Folder world with river, mountains, stone Customer Door, construction yard and business districts">
   <Canvas dpr={[1,1.35]} camera={{position:[23,25,30],fov:49,near:.1,far:150}}
     gl={{alpha:false,antialias:true,powerPreference:'high-performance'}}>
    <StandardScene appearance={appearance} selected={selected} onSelect={setSelected} live={live}/>
   </Canvas>
  </div>
  <div className="border-t border-[#b0a078]/35 bg-[#f4f2e9] p-3">
   <p className="text-[10px] font-black uppercase tracking-widest text-[#758063]">Explore your world</p>
   <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
    {KEYS.map(id=><button type="button" key={id} aria-pressed={selected===id}
      onClick={()=>setSelected(id)}
      className={`min-h-12 rounded-lg border px-2 py-2 text-left text-[10px] font-bold ${selected===id
       ?'border-[#b19759] bg-[#f9e9bd] text-[#61491b]':'border-[#c9c9c2] bg-[#fffcf6] text-[#50617a]'}`}>
      {STATIONS[id].label}
    </button>)}
   </div>
   <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d2c6a9] bg-white p-3">
    <div className="min-w-0 flex-1">
     <p className="text-sm font-black text-[#4d564d]">{choice.label}</p>
     <p className="mt-1 text-xs leading-5 text-[#536780]">{choice.purpose}</p>
     <p className="mt-1 text-[10px] text-[#758073]">{selected==='build'&&currentBuild
      ?currentBuild.title+' · '+progress+'% built'
      :linked?'Connected to existing Client systems':STATUS_WORDING[selected]+' · available to form'}
     </p>
    </div>
    {canOpenDoor?<a href={doorUrl} target="_blank" rel="noreferrer"
      className="inline-flex min-h-11 items-center rounded-lg bg-[#718653] px-4 text-xs font-black text-white">Open Customer Door →</a>
      :<button type="button" disabled={!canEnter} onClick={()=>onEnter(choice.district)}
        className="min-h-11 rounded-lg bg-[#6d845b] px-4 py-2 text-xs font-black text-white disabled:opacity-40">
        {selected==='build'?'Enter Construction':selected==='customer_door'?'Form Customer Door':'Enter '+choice.label} →
       </button>}
   </div>
   <p className="mt-2 text-[10px] leading-5 text-[#657481]">Illustrated buildings are locations and future business possibilities, not proof of completed businesses. Your real products, orders, constructions and operating systems come from your Client records.</p>
  </div>
 </section>
}

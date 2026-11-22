'use client'

import {Component,Suspense,useRef,useState,type ReactNode} from 'react'
import {useMachinerySpeed} from '@/components/world/use-machinery-speed'
import {useRouter} from 'next/navigation'
import {Canvas,useFrame} from '@react-three/fiber'
import {OrbitControls} from '@react-three/drei'
import type {Group} from 'three'
import {CityMaterial} from '@/components/system-switch/file-folder-city-material'
import {WEAVE_NATIVE_DEPARTMENTS,type NativeDepartment,type NativeScene} from '@/lib/weave-native-blueprint'

type Building={department:NativeDepartment;slug:string;title:string;plot:number;scene:NativeScene}
class MapBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<p className="p-4">3D view unavailable on this device.</p>:this.props.children}
}

function BuildingModel({building,active,onSelect,speed}:{building:Building;active:boolean;onSelect:()=>void;speed:number}){
 const rotor=useRef<Group>(null)
 useFrame((_,delta)=>{if(rotor.current&&speed)rotor.current.rotation.z+=Math.min(delta,.05)*.7*speed})
 const mechanical=building.scene==='mechanized'
 const height=mechanical?2.8:building.scene==='water'?1.65:3.6
 return <group onClick={event=>{event.stopPropagation();onSelect()}}>
  <mesh position={[0,height/2,0]}>
   <boxGeometry args={[2.9,height,2.4]}/>
   <CityMaterial kind={mechanical?'metal':building.scene==='water'?'warm':'glass'}/>
  </mesh>
  <mesh position={[0,height+.12,0]}><boxGeometry args={[3.3,.24,2.8]}/>
   <meshStandardMaterial color={active?'#ffe39f':'#b69b71'} metalness={.55} roughness={.35}/>
  </mesh>
  <mesh position={[0,.71,1.23]}><boxGeometry args={[.95,1.42,.08]}/><CityMaterial kind="glass"/></mesh>
  {mechanical&&<group ref={rotor} position={[0,height+.95,0]}>
   <mesh><torusGeometry args={[.7,.11,8,28]}/><meshStandardMaterial color="#ddb46b"/></mesh>
   {[0,Math.PI/3,2*Math.PI/3].map(angle=><mesh key={angle} rotation={[0,0,angle]}>
    <boxGeometry args={[1.4,.09,.12]}/><meshStandardMaterial color="#d7ab60"/></mesh>)}
  </group>}
 </group>
}

export function CompanyDomainMap({buildings,preview=false}:{buildings:Building[];preview?:boolean}){
 const router=useRouter()
 const machinery=useMachinerySpeed()
 const [department,setDepartment]=useState(buildings[0]?.department)
 const [plot,setPlot]=useState<number|undefined>(buildings[0]?.plot)
 const zone=preview?buildings[0]?.department:department
 const visible=buildings.filter(b=>b.department===zone)
 const selected=visible.find(b=>b.plot===plot)??visible[0]
 // Published metadata is data, not executable navigation. Validate both route segments.
 const safeDepartment=!!selected&&Object.prototype.hasOwnProperty.call(WEAVE_NATIVE_DEPARTMENTS,selected.department)
 const safeSlug=!!selected&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(selected.slug)
 const entryHref=selected&&safeDepartment&&safeSlug
  ?'/weave-modules/'+encodeURIComponent(selected.department)+'/'+encodeURIComponent(selected.slug)
  :null
 if(!selected)return <p>A Time has yet to open the first company plot.</p>
 return <section className="space-y-4">
  {!preview&&<nav aria-label="Choose a department" className="flex flex-wrap items-center gap-2">
   {Object.entries(WEAVE_NATIVE_DEPARTMENTS).filter(([key])=>buildings.some(b=>b.department===key)).map(([key,dep])=><button key={key} type="button" aria-pressed={zone===key} onClick={()=>{setDepartment(key as NativeDepartment);setPlot(undefined)}}
    className="rounded-full border border-amber-200/40 bg-[#132b35] px-3 py-2 text-sm aria-pressed:bg-amber-100 aria-pressed:text-[#20343c]">{dep.label}</button>)}
  </nav>}
  <div className="h-72 overflow-hidden rounded-2xl border border-amber-100/30 bg-[#192f3a] sm:h-96">
   <MapBoundary><Canvas dpr={[1,1.5]} camera={{position:preview?[5,5,8]:[17,20,23],fov:48}}
    fallback={<p className="p-4">3D view unavailable on this device.</p>}>
    <color attach="background" args={['#8faeb7']}/><hemisphereLight intensity={1.65}/><directionalLight position={[7,12,8]} intensity={2.2}/>
    <Suspense fallback={null}>
     <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]}><planeGeometry args={preview?[9,9]:[32,22]}/><CityMaterial kind="paving" tileX={8} tileY={6}/></mesh>
     {visible.map(building=><group key={building.slug} position={preview?[0,0,0]:[((building.plot-1)%6-2.5)*5,0,(Math.floor((building.plot-1)/6)-1.5)*5]}>
      <BuildingModel building={building} speed={machinery} active={building===selected} onSelect={()=>setPlot(building.plot)}/>
     </group>)}
    </Suspense>
    <OrbitControls maxPolarAngle={Math.PI*.47} minDistance={4} maxDistance={48}/>
   </Canvas></MapBoundary>
  </div>
  {!preview&&<>
   <nav className="flex flex-wrap gap-2" aria-label="Choose a building">
    {visible.map(b=><button key={b.slug} type="button" aria-pressed={b.plot===selected.plot}
     onClick={()=>setPlot(b.plot)} className="rounded-lg border border-amber-200/40 px-3 py-2 text-sm aria-pressed:bg-amber-100 aria-pressed:text-[#20343c]">Plot {b.plot} · {b.title}</button>)}
   </nav>
   <p className="text-sm">Selected workshop: {selected.title}</p>
   {entryHref?<button type="button" className="inline-block rounded-full bg-amber-100 px-5 py-3 font-semibold text-[#20343c]" onClick={()=>router.push(entryHref)}>Enter workshop</button>
    :<p role="alert">This building entrance is unavailable.</p>}
  </>}
 </section>
}

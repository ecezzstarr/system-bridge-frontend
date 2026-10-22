'use client'

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'
import { SystemSwitchThreshold } from '@/components/world/system-switch-threshold'
import { useAdaptiveRuntime } from '@/components/world/use-adaptive-runtime'
import { FLAME_EVENT_PLAYER_START, clampFlameEventPosition, enforceSystemSwitchGate, flameEventDoorPositions, nearestFlameEventDoor } from '@/lib/flame-event-world-geometry'
import type { FlameWorldCustomerDoor } from './flame-event-open-world'
import { WeaveEmbodiedAvatar, type WeaveAvatarMotion, type WeaveAvatarPosition } from '@/components/world/weave-embodied-avatar'

export type FlameMobileInput = {
  forward:number
  right:number
  yaw:number
  pitch:number
  run:boolean
  crouch:boolean
  jumpQueued:boolean
}

export function RiverSurface({quiet}:{quiet:boolean}) {
  const material=useMemo(()=>new THREE.ShaderMaterial({
    uniforms:{time:{value:0}},
    vertexShader:[
      'uniform float time;',
      'varying vec2 vUv2;',
      'void main(){',
      'vUv2=uv; vec3 p=position;',
      'p.z+=sin(p.x*.12+time*.32)*.1+cos(p.y*.19-time*.44)*.06;',
      'gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);',
      '}',
    ].join('\n'),
    fragmentShader:[
      'uniform float time;',
      'varying vec2 vUv2;',
      'void main(){',
      'vec2 p=vUv2*58.;',
      'float a=sin(p.x*.58+sin(p.y*.43+time*.55)-time*.78);',
      'float b=sin(p.y*.81-p.x*.27+time*.48);',
      'float v=sin(p.x*3.1+b*2.+time)*.5+.5;',
      'float f=smoothstep(.44,.85,a*.54+b*.28+.23);',
      'vec3 deep=mix(vec3(.018,.098,.22),vec3(.035,.33,.50),.46+.2*b);',
      'vec3 fire=mix(vec3(.93,.27,.045),vec3(1.,.82,.4),v);',
      'vec3 color=mix(deep,fire,f*.9)+pow(v,12.)*.12;',
      'gl_FragColor=vec4(color,1.);',
      '}',
    ].join('\n'),
    side:THREE.DoubleSide,
  }),[])
  useEffect(()=>()=>material.dispose(),[material])
  useFrame(({clock})=>{if(!quiet)material.uniforms.time.value=clock.elapsedTime})
  return <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.47,0]} material={material}>
    <planeGeometry args={[220,220,1,1]}/>
  </mesh>
}

function StonePaving(){
  const texture=useMemo(()=>{
    const el=document.createElement('canvas')
    el.width=512;el.height=512
    const ctx=el.getContext('2d')
    if(ctx){
      ctx.fillStyle='#91949d';ctx.fillRect(0,0,512,512)
      for(let row=0;row<10;row++)for(let col=0;col<9;col++){
        const offset=row%2?28:0
        ctx.fillStyle=['#959da8','#b3aba0','#beb8ac','#818d9a'][(row*7+col*11)%4]
        ctx.fillRect(col*60-25+offset,row*52+2,57,49)
        ctx.strokeStyle='rgba(32,45,67,.25)'
        ctx.strokeRect(col*60-25+offset,row*52+2,57,49)
      }
      for(let i=0;i<1200;i++){
        ctx.fillStyle=i%2?'rgba(255,235,195,.13)':'rgba(15,33,47,.12)'
        ctx.fillRect((i*79.173)%512,(i*131.039)%512,1.5,1.5)
      }
    }
    const t=new THREE.CanvasTexture(el)
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3.1,3.1)
    t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2
    return t
  },[])
  useEffect(()=>()=>texture.dispose(),[texture])
  return <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
    <circleGeometry args={[16.65,80]}/>
    <meshStandardMaterial map={texture} roughness={.89} metalness={.06}/>
  </mesh>
}

function Terrain({quality}:{quality:number}){
  const landscape=useMemo(()=>Array.from({length:quality>=2?42:23},(_,i)=>{
    const a=(i*2.399963)%(Math.PI*2),r=19+(i%5)*1.2
    return {x:Math.sin(a)*r,z:Math.cos(a)*r,scale:.7+(i%6)*.22}
  }),[quality])
  return <group>
    <StonePaving/>
    {[-1,1].map(side=><group key={'embankment:'+side} position={[side*10,0,0]}>
      <mesh position={[0,.31,0]} castShadow receiveShadow>
        <boxGeometry args={[13,.64,.72]}/>
        <meshStandardMaterial color="#858e95" metalness={.18} roughness={.8}/>
      </mesh>
      <mesh position={[0,.67,0]}>
        <boxGeometry args={[13,.08,.85]}/>
        <meshStandardMaterial color="#d7bd93" metalness={.42} roughness={.52} emissive="#946a2e" emissiveIntensity={.18}/>
      </mesh>
      <mesh position={[0,.45,.39]}>
        <boxGeometry args={[12.3,.065,.055]}/>
        <meshBasicMaterial color="#eec889" transparent opacity={.8}/>
      </mesh>
    </group>)}
    <mesh position={[0,-.2,0]}><cylinderGeometry args={[16.68,17,.4,80]}/><meshStandardMaterial color="#78808b" roughness={.8}/></mesh>
    <mesh position={[0,.028,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[16.2,16.43,80]}/><meshBasicMaterial color="#ffca79" side={THREE.DoubleSide}/>
    </mesh>
    {Array.from({length:14},(_,i)=>{
      const a=i*Math.PI*2/14
      return <group key={i} position={[Math.sin(a)*15.65,.3,Math.cos(a)*15.65]}>
        <mesh castShadow><cylinderGeometry args={[.33,.44,.6,8]}/><meshStandardMaterial color="#7f8896" roughness={.8}/></mesh>
        <mesh position={[0,.48,0]}><cylinderGeometry args={[.12,.19,.44,8]}/><meshStandardMaterial emissive="#ffae54" emissiveIntensity={1.4} color="#ffe5a4"/></mesh>
        {i%3===0&&<pointLight position={[0,.8,0]} color="#ffb86c" intensity={1.25} distance={5}/>}
      </group>
    })}
    {landscape.map((rock,i)=><group key={i} position={[rock.x,-.25,rock.z]}>
      <mesh scale={[rock.scale*1.3,rock.scale*1.6,rock.scale*1.5]} rotation={[.1*i,.3*i,0]}>
        <dodecahedronGeometry args={[1,0]}/>
        <meshStandardMaterial color={i%2?'#617783':'#74858b'} roughness={1}/>
      </mesh>
      {i%4===0&&<group>
        <mesh position={[0,rock.scale*1.2,0]}><cylinderGeometry args={[.1,.17,1.5,6]}/><meshStandardMaterial color="#594d3a"/></mesh>
        <mesh position={[0,rock.scale*1.2+1.1,0]} scale={[.95,1.38,.95]}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color={i%3?'#33594d':'#5f7149'} roughness={.99}/></mesh>
      </group>}
    </group>)}
    {[-1,1].map(side=><group key={side} position={[side*21,.45,-6]}>
      <mesh scale={[3,3,2.3]}><dodecahedronGeometry args={[1,1]}/><meshStandardMaterial color="#7b8490" roughness={.98}/></mesh>
      <mesh position={[-side*1.2,0,1.8]}><boxGeometry args={[.85,5,.04]}/><meshBasicMaterial color="#c5effe" transparent opacity={.42} side={THREE.DoubleSide}/></mesh>
    </group>)}
    <group position={[0,0,-15.8]}>
      <mesh position={[0,3,0]} castShadow><cylinderGeometry args={[.34,.95,6,8]}/><meshStandardMaterial color="#d8b889" metalness={.6} roughness={.35}/></mesh>
      <mesh position={[0,6.1,0]}><octahedronGeometry args={[.67,0]}/><meshStandardMaterial color="#ffecbf" emissive="#f9b858" emissiveIntensity={2.8}/></mesh>
      <pointLight position={[0,5.8,0]} color="#ffc47b" intensity={5} distance={18}/>
    </group>
  </group>
}

/** A visible structure exists only after the Client publishes an ACTIVE built system.
 * No construction countdowns, private workshops, or fictional businesses are shown. */
function PublishedClientSystem({system,index,preset}:{system:{name:string;system_type:string};index:number;preset?:string}){
  const kind=system.system_type.toLowerCase()
  const tower=/stream|broadcast|media|creator/.test(kind)
  const commerce=/store|market|commerce|distribution/.test(kind)
  const height=tower?2.6:commerce?1.65:2.05
  const glow=preset==='garden_exchange'?'#8bffcf':preset==='night_market'?'#ebafff':preset==='glass_citadel'?'#8adfff':'#ffd18b'
  return <group position={[index===0?-2.8:2.8,0,-1.75]} data-public-client-built-system={system.system_type}>
    <mesh position={[0,.05,0]} receiveShadow><cylinderGeometry args={[.95,1.08,.18,8]}/><meshStandardMaterial color="#647a80" roughness={.75}/></mesh>
    <mesh position={[0,height/2+.1,0]} castShadow>
      {tower?<cylinderGeometry args={[.45,.77,height,8]}/>:<boxGeometry args={[1.38,height,1.17]}/>}
      <meshStandardMaterial color={commerce?'#345e66':'#326a81'} metalness={.54} roughness={.24} emissive="#0a4861" emissiveIntensity={.26}/>
    </mesh>
    {[-.41,.41].map((x)=><mesh key={x} position={[x,height*.59,.595]}>
      <boxGeometry args={[.18,height*.54,.02]}/><meshStandardMaterial color="#9ce4ff" metalness={.22} emissive="#30b5da" emissiveIntensity={.65}/>
    </mesh>)}
    <mesh position={[0,height+.19,0]}>
      {tower?<octahedronGeometry args={[.35,0]}/>:<boxGeometry args={[1.58,.2,1.37]}/>}
      <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={.9} metalness={.48}/>
    </mesh>
    <Html center position={[0,height+1,0]} distanceFactor={14} style={{pointerEvents:'none'}} zIndexRange={[11,1]}>
      <div style={{maxWidth:110,minWidth:90,background:'rgba(5,27,44,.88)',padding:'5px 7px',border:'1px solid rgba(255,216,148,.45)',borderRadius:7,textAlign:'center',fontSize:9,lineHeight:1.3,color:'#fff5df',fontWeight:700}}>
        <span style={{display:'block',fontSize:7,letterSpacing:'.1em',color:'#9ce5f5'}}>LIVE CLIENT SYSTEM</span>
        {system.name}
      </div>
    </Html>
  </group>
}

function Portal({
  enterprise,x,z,index,playerMotion,
}:{
  enterprise:FlameWorldCustomerDoor
  x:number
  z:number
  index:number
  playerMotion:MutableRefObject<WeaveAvatarMotion>
}){
  const glow=useRef<THREE.Mesh>(null)
  const membrane=useRef<THREE.MeshBasicMaterial>(null)
  const trim=useRef<THREE.MeshStandardMaterial>(null)
  const level=enterprise.level
  const strong=level==='market_hall'
  const complete=level!=='door'
  const name=enterprise.platform_name||enterprise.name
  const tier=strong?'Market Hall':complete?'Storefront':'Customer Door'
  const height=strong?1.15:complete?1.07:1
  useFrame(({clock})=>{
    const person=playerMotion.current
    const distance=Math.hypot(x-person.x,z-person.z)
    const approach=Math.max(0,1-distance/6)
    if(glow.current)glow.current.scale.y=1+Math.sin(clock.elapsedTime*1.5+index)*.025*(1+approach)
    if(membrane.current)membrane.current.opacity=.34+approach*.28
    if(trim.current)trim.current.emissiveIntensity=.35+approach*1.15
  })
  return <group position={[x,.12,z]} scale={[1,height,1]} data-client-enterprise-level={level}>
    <mesh position={[0,-.02,0]} receiveShadow>
      <cylinderGeometry args={[1.34,1.51,.2,24]}/>
      <meshStandardMaterial color="#a99275" roughness={.65} metalness={.35}/>
    </mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.10,0]}>
      <ringGeometry args={[.98,1.31,36]}/>
      <meshBasicMaterial color={strong?'#c4f1f3':'#ffe3a4'} transparent opacity={.57} side={THREE.DoubleSide}/>
    </mesh>
    {[-.9,.9].map(side=><group key={side} position={[side,0,0]}>
      <mesh position={[0,1,0]} castShadow>
        <boxGeometry args={[.24,1.96,.3]}/>
        <meshStandardMaterial color="#d5c0a1" metalness={.41} roughness={.37}/>
      </mesh>
      <mesh position={[0,2.18,0]}>
        <boxGeometry args={[.37,.22,.41]}/>
        <meshStandardMaterial color="#e4c08b" metalness={.54} roughness={.3}/>
      </mesh>
      {complete&&<mesh position={[side*.32,1.19,-.2]} castShadow>
        <cylinderGeometry args={[.19,.27,2.25,8]}/>
        <meshStandardMaterial color={strong?'#8397a3':'#a09a97'} metalness={.3} roughness={.59}/>
      </mesh>}
      {strong&&<mesh position={[side*.43,2.51,-.2]}>
        <octahedronGeometry args={[.19,0]}/>
        <meshStandardMaterial color="#e5faff" emissive="#4fb5cd" emissiveIntensity={1.25}/>
      </mesh>}
    </group>)}
    <mesh position={[0,2.01,0]}>
      <torusGeometry args={[.9,.126,8,40,Math.PI]}/>
      <meshStandardMaterial ref={trim} color={strong?'#d2edf0':'#ffcd81'} metalness={.52} roughness={.21} emissive="#edab53" emissiveIntensity={.58}/>
    </mesh>
    <mesh ref={glow} position={[0,1.2,-.06]}>
      <planeGeometry args={[1.66,2.10]}/>
      <meshBasicMaterial ref={membrane} color={strong?'#b2e3f0':'#70c7e0'} side={THREE.DoubleSide} transparent opacity={.4} depthWrite={false}/>
    </mesh>
    <mesh position={[0,2.75,0]}>
      <boxGeometry args={[2.16,.17,.36]}/>
      <meshStandardMaterial color="#f0cf93" metalness={.51} roughness={.33}/>
    </mesh>
    {complete&&<mesh position={[0,2.91,-.1]}>
      <boxGeometry args={[2.45,.20,.45]}/>
      <meshStandardMaterial color={strong?'#899ca2':'#ad9478'} roughness={.48} metalness={.26}/>
    </mesh>}
    {strong&&<group position={[0,3.20,-.1]}>
      <mesh><boxGeometry args={[1.75,.35,.46]}/><meshStandardMaterial color="#d3c3ab" metalness={.41}/></mesh>
      <mesh position={[0,.29,0]}><octahedronGeometry args={[.34,0]}/><meshStandardMaterial color="#fff1c3" emissive="#d3a050" emissiveIntensity={1.65}/></mesh>
    </group>}
    {(enterprise.public_systems||[]).filter(s=>s.system_type!=='customer_door').slice(0,2).map((system,i)=>
      <PublishedClientSystem key={system.system_type+':'+i} system={system} index={i} preset={enterprise.visual_preset}/>
    )}
    <Html position={[0,strong?3.94:complete?3.42:3.08,0]} center distanceFactor={13} style={{pointerEvents:'none'}} zIndexRange={[12,2]}>
      <div style={{width:132,textAlign:'center',color:'#fff2d8',fontWeight:800,fontSize:12,lineHeight:1.3,textShadow:'0 2px 7px #061421,0 0 8px #061421',overflowWrap:'break-word'}}>
        <div style={{fontSize:8,letterSpacing:1.25,color:'#ffdb98'}}>{tier.toUpperCase()} {String(index+1).padStart(2,'0')}</div>
        <div>{name}</div>
        <div style={{fontSize:9,color:'#d3f0f8'}}>{enterprise.offer_count} public {enterprise.offer_count===1?'offer':'offers'}</div>
      </div>
    </Html>
  </group>
}

function PresenceCurrent({motion,quiet}:{motion:MutableRefObject<WeaveAvatarMotion>;quiet:boolean}){
  const wake=useRef<THREE.Mesh>(null)
  const aura=useRef<THREE.PointLight>(null)
  const circle=useRef<THREE.MeshBasicMaterial>(null)
  const elapsed=useRef(0)
  useFrame((_,delta)=>{
    const state=motion.current
    if(!wake.current||!circle.current||!aura.current)return
    const pace=Math.min(1,state.speed/5.3)
    elapsed.current+=Math.min(.05,delta)*state.speed
    wake.current.position.set(state.x,.073,state.z)
    wake.current.rotation.z=quiet?0:elapsed.current*.19
    const scale=.84+pace*.6
    wake.current.scale.setScalar(scale)
    circle.current.opacity=quiet?.06:(.07+pace*(.16+.05*Math.sin(elapsed.current*2)))
    aura.current.position.set(state.x,.18,state.z)
    aura.current.intensity=.04+pace*.28
  })
  return <group data-flame-event-responsive-ground>
    <mesh ref={wake} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.6,.69,48]}/>
      <meshBasicMaterial ref={circle} color="#fde6aa" side={THREE.DoubleSide} transparent opacity={.07} depthWrite={false}/>
    </mesh>
    <pointLight ref={aura} color="#b9eefa" intensity={.04} distance={2.1}/>
  </group>
}

function Walker({inputRef,doors,role,onNearbyDoor,onRegionChange,playerMotion}:{
  inputRef:MutableRefObject<FlameMobileInput>
  doors:{x:number;z:number}[]
  role:string
  onNearbyDoor:(index:number|null)=>void
  onRegionChange:(region:FlameRegion)=>void
  playerMotion:MutableRefObject<WeaveAvatarMotion>
}){
  const {camera}=useThree()
  const budget=useAdaptiveRuntime()
  const position=useRef(new THREE.Vector3(FLAME_EVENT_PLAYER_START.x,0,FLAME_EVENT_PLAYER_START.z))
  const velocity=useRef(new THREE.Vector3()),heading=useRef(0),activity=useRef(0)
  const crouch=useRef(false),height=useRef(0),vertical=useRef(0)
  const lastRegion=useRef<FlameRegion>('riverbank')
  const previousDoor=useRef<number|null>(null)
  const target=useRef(new THREE.Vector3()),look=useRef(new THREE.Vector3())
  useEffect(()=>{
    // This is visual continuity within this browser tab; never an access credential.
    const key='weave:flame:presence:'+role
    try{
      const raw=window.sessionStorage.getItem(key)
      const value=raw?JSON.parse(raw):null
      if(value&&[value.x,value.z,value.yaw,value.pitch].every((n:unknown)=>typeof n==='number'&&Number.isFinite(n))){
        const bounded=clampFlameEventPosition(value.x,value.z)
        // Ignore corrupt or out-of-bounds location data instead of teleporting.
        if(Math.hypot(bounded.x-value.x,bounded.z-value.z)<.1){
          position.current.set(bounded.x,0,bounded.z)
          heading.current=value.yaw
          inputRef.current.yaw=value.yaw
          inputRef.current.pitch=Math.max(-.65,Math.min(.72,value.pitch))
          playerMotion.current.x=bounded.x
          playerMotion.current.z=bounded.z
          playerMotion.current.yaw=value.yaw
        }
      }
    }catch{}
    const save=()=>{
      try{
        window.sessionStorage.setItem(key,JSON.stringify({
          x:position.current.x,z:position.current.z,
          yaw:inputRef.current.yaw,pitch:inputRef.current.pitch,
        }))
      }catch{}
    }
    const timer=window.setInterval(save,2500)
    window.addEventListener('pagehide',save)
    window.addEventListener('weave:flame-event:save-presence',save)
    return ()=>{
      save()
      window.clearInterval(timer)
      window.removeEventListener('pagehide',save)
      window.removeEventListener('weave:flame-event:save-presence',save)
    }
  },[role,inputRef,playerMotion])
  useFrame(({clock},delta)=>{
    const dt=Math.min(.05,delta),data=inputRef.current
    const magnitude=Math.min(1,Math.hypot(data.forward,data.right))
    const ux=(data.right*Math.cos(data.yaw)-data.forward*Math.sin(data.yaw))/(magnitude||1)
    const uz=(-data.right*Math.sin(data.yaw)-data.forward*Math.cos(data.yaw))/(magnitude||1)
    const speed=data.crouch?1.2:data.run?5.4:2.6
    const blend=1-Math.exp(-dt*(magnitude>.02?9:13))
    velocity.current.x=THREE.MathUtils.lerp(velocity.current.x,magnitude>.02?ux*speed*magnitude:0,blend)
    velocity.current.z=THREE.MathUtils.lerp(velocity.current.z,magnitude>.02?uz*speed*magnitude:0,blend)
    const bounded=clampFlameEventPosition(position.current.x+velocity.current.x*dt,position.current.z+velocity.current.z*dt)
    const next=enforceSystemSwitchGate(position.current,bounded)
    position.current.x=next.x;position.current.z=next.z
    const actual=Math.hypot(velocity.current.x,velocity.current.z)
    activity.current=THREE.MathUtils.lerp(activity.current,Math.min(1,actual/4.7),blend)
    if(actual>.05)heading.current=Math.atan2(-velocity.current.x,-velocity.current.z)
    crouch.current=data.crouch
    if(data.jumpQueued){
      if(height.current<.005&&!data.crouch)vertical.current=4.35
      data.jumpQueued=false
    }
    vertical.current-=12.4*dt
    height.current=Math.max(0,height.current+vertical.current*dt)
    if(height.current===0)vertical.current=0
    const closest=nearestFlameEventDoor(position.current.x,position.current.z,doors)
    if(closest!==previousDoor.current){previousDoor.current=closest;onNearbyDoor(closest)}
    const region:FlameRegion=closest!==null?'customer-door':position.current.z>5?'riverbank':position.current.z>0?'burning-river':'system-switch'
    if(region!==lastRegion.current){lastRegion.current=region;onRegionChange(region)}
    playerMotion.current.x=position.current.x
    playerMotion.current.z=position.current.z
    playerMotion.current.yaw=heading.current
    playerMotion.current.speed=actual
    playerMotion.current.crouching=crouch.current
    playerMotion.current.airborne=height.current
    const dist=data.crouch?3.8:data.run?5.3:4.5
    const footfall=budget.reducedMotion?0:Math.sin(clock.elapsedTime*(data.run?13:8.8))*Math.min(.045,actual*.009)
    target.current.set(position.current.x+Math.sin(data.yaw)*dist,(data.crouch?1.8:2.5)+data.pitch*2.2+footfall,position.current.z+Math.cos(data.yaw)*dist)
    camera.position.lerp(target.current,1-Math.exp(-dt*7))
    look.current.set(position.current.x,1.28+height.current*.35,position.current.z)
    camera.lookAt(look.current)
  })
  return <WeaveEmbodiedAvatar motion={playerMotion} role={role as WeaveAvatarPosition}/>
}

export type FlameRegion='riverbank'|'burning-river'|'system-switch'|'customer-door'

function World({enterprises,inputRef,role,onNearbyDoor,onRegionChange}:{
  enterprises:FlameWorldCustomerDoor[]
  inputRef:MutableRefObject<FlameMobileInput>
  role:string
  onNearbyDoor:(index:number|null)=>void
  onRegionChange:(region:FlameRegion)=>void
}){
  const budget=useAdaptiveRuntime()
  const doorPositions=useMemo(()=>flameEventDoorPositions(enterprises.length),[enterprises.length])
  const playerMotion=useRef<WeaveAvatarMotion>({x:FLAME_EVENT_PLAYER_START.x,z:FLAME_EVENT_PLAYER_START.z,yaw:0,speed:0,crouching:false,airborne:0})
  return <>
    <fog attach="fog" args={['#0b2840',27,89]}/>
    <ambientLight intensity={.92} color="#c5e9fc"/>
    <hemisphereLight args={['#82caff','#413329',1.1]}/>
    <directionalLight position={[-10,21,-13]} color="#ffd09a" intensity={2.4} castShadow={budget.shadows} shadow-mapSize-width={512} shadow-mapSize-height={512}/>
    <pointLight position={[0,7,-13]} color="#ffc381" intensity={5} distance={31}/>
    <RiverSurface quiet={budget.reducedMotion}/>
    <Terrain quality={budget.level}/>
    <SystemSwitchThreshold active={!budget.reducedMotion} quiet={budget.reducedMotion}/>
    <PresenceCurrent motion={playerMotion} quiet={budget.reducedMotion}/>
    {enterprises.map((door,i)=><Portal key={door.public_slug} enterprise={door} index={i} x={doorPositions[i].x} z={doorPositions[i].z} playerMotion={playerMotion}/>)}
    <Walker inputRef={inputRef} doors={doorPositions} role={role} onNearbyDoor={onNearbyDoor} onRegionChange={onRegionChange} playerMotion={playerMotion}/>
  </>
}

export function FlameEventMobileScene({enterprises,inputRef,role,onNearbyDoor,onRegionChange,onReady}:{
  enterprises:FlameWorldCustomerDoor[]
  inputRef:MutableRefObject<FlameMobileInput>
  role:string
  onNearbyDoor:(index:number|null)=>void
  onRegionChange:(region:FlameRegion)=>void
  onReady?:()=>void
}){
  return <div className="absolute inset-0" data-flame-event-mobile-scene>
    <AdaptiveCanvas
      gl={{alpha:true,antialias:false,powerPreference:'low-power'}}
      camera={{fov:66,near:.1,far:125,position:[0,2.6,15]}}
      shadows
      mobileGame
      onWorldReady={onReady}
    >
      <World enterprises={enterprises} inputRef={inputRef} role={role} onNearbyDoor={onNearbyDoor} onRegionChange={onRegionChange}/>
    </AdaptiveCanvas>
  </div>
}

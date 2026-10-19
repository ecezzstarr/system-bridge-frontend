'use client'

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'
import { SystemSwitchThreshold } from '@/components/world/system-switch-threshold'
import { useAdaptiveRuntime } from '@/components/world/use-adaptive-runtime'
import { FLAME_EVENT_PLAYER_START, clampFlameEventPosition, flameEventDoorPositions, nearestFlameEventDoor } from '@/lib/flame-event-world-geometry'
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

function RiverSurface({quiet}:{quiet:boolean}) {
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
      'precision mediump float;',
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

function Portal({name,x,z,index}:{name:string;x:number;z:number;index:number}){
  const glow=useRef<THREE.Mesh>(null)
  useFrame(({clock})=>{if(glow.current)glow.current.scale.y=1+Math.sin(clock.elapsedTime*1.8+index)*.065})
  return <group position={[x,.12,z]}>
    <mesh position={[0,-.01,0]}><cylinderGeometry args={[1.33,1.5,.2,24]}/><meshStandardMaterial color="#c2a273" metalness={.35} roughness={.63}/></mesh>
    {[-.9,.9].map(a=><mesh key={a} position={[a,1,0]} castShadow>
      <boxGeometry args={[.22,1.96,.29]}/>
      <meshStandardMaterial color="#e7c995" metalness={.48} roughness={.28} emissive="#ae7135" emissiveIntensity={.28}/>
    </mesh>)}
    <mesh position={[0,2.01,0]}><torusGeometry args={[.9,.125,8,32,Math.PI]}/><meshStandardMaterial color="#ffcd81" metalness={.52} roughness={.19} emissive="#f0a253" emissiveIntensity={.95}/></mesh>
    <mesh ref={glow} position={[0,1.21,-.03]}>
      <planeGeometry args={[1.63,2.07]}/>
      <meshBasicMaterial color="#54c6de" side={THREE.DoubleSide} transparent opacity={.49} depthWrite={false}/>
    </mesh>
    <mesh position={[0,2.7,0]}><boxGeometry args={[2.1,.18,.35]}/><meshStandardMaterial color="#e8b36e" metalness={.55} roughness={.24}/></mesh>
    <Html position={[0,3.02,0]} center distanceFactor={13} style={{pointerEvents:'none'}} zIndexRange={[12,2]}>
      <div style={{width:126,textAlign:'center',color:'#fff2d8',fontWeight:800,fontSize:12,lineHeight:1.25,textShadow:'0 2px 6px #071522,0 0 8px #071522',overflowWrap:'break-word'}}>
        <span style={{fontSize:8,letterSpacing:1.2,color:'#ffd78c'}}>CUSTOMER DOOR {index+1}</span>
        <div>{name}</div>
      </div>
    </Html>
  </group>
}

function Walker({inputRef,doors,role,onNearbyDoor,onRegionChange}:{
  inputRef:MutableRefObject<FlameMobileInput>
  doors:{x:number;z:number}[]
  role:string
  onNearbyDoor:(index:number|null)=>void
  onRegionChange:(region:FlameRegion)=>void
}){
  const {camera}=useThree()
  const position=useRef(new THREE.Vector3(FLAME_EVENT_PLAYER_START.x,0,FLAME_EVENT_PLAYER_START.z))
  const velocity=useRef(new THREE.Vector3()),heading=useRef(0),activity=useRef(0)
  const crouch=useRef(false),height=useRef(0),vertical=useRef(0)
  const motion=useRef<WeaveAvatarMotion>({x:FLAME_EVENT_PLAYER_START.x,z:FLAME_EVENT_PLAYER_START.z,yaw:0,speed:0,crouching:false,airborne:0})
  const lastRegion=useRef<FlameRegion>('riverbank')
  const previousDoor=useRef<number|null>(null)
  const target=useRef(new THREE.Vector3()),look=useRef(new THREE.Vector3())
  useFrame((_,delta)=>{
    const dt=Math.min(.05,delta),data=inputRef.current
    const magnitude=Math.min(1,Math.hypot(data.forward,data.right))
    const ux=(data.right*Math.cos(data.yaw)-data.forward*Math.sin(data.yaw))/(magnitude||1)
    const uz=(-data.right*Math.sin(data.yaw)-data.forward*Math.cos(data.yaw))/(magnitude||1)
    const speed=data.crouch?1.2:data.run?5.4:2.6
    const blend=1-Math.exp(-dt*(magnitude>.02?9:13))
    velocity.current.x=THREE.MathUtils.lerp(velocity.current.x,magnitude>.02?ux*speed*magnitude:0,blend)
    velocity.current.z=THREE.MathUtils.lerp(velocity.current.z,magnitude>.02?uz*speed*magnitude:0,blend)
    const next=clampFlameEventPosition(position.current.x+velocity.current.x*dt,position.current.z+velocity.current.z*dt)
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
    motion.current.x=position.current.x
    motion.current.z=position.current.z
    motion.current.yaw=heading.current
    motion.current.speed=actual
    motion.current.crouching=crouch.current
    motion.current.airborne=height.current
    const dist=data.crouch?3.8:data.run?5.3:4.5
    target.current.set(position.current.x+Math.sin(data.yaw)*dist,(data.crouch?1.8:2.5)+data.pitch*2.2,position.current.z+Math.cos(data.yaw)*dist)
    camera.position.lerp(target.current,1-Math.exp(-dt*7))
    look.current.set(position.current.x,1.28+height.current*.35,position.current.z)
    camera.lookAt(look.current)
  })
  return <WeaveEmbodiedAvatar motion={motion} role={role as WeaveAvatarPosition}/>
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
  return <>
    <fog attach="fog" args={['#7894a8',30,95]}/>
    <ambientLight intensity={1.15} color="#dae9f7"/>
    <hemisphereLight args={['#d9e7fc','#726759',1.2]}/>
    <directionalLight position={[-10,21,-13]} color="#ffe2ab" intensity={2.4} castShadow={budget.shadows} shadow-mapSize-width={512} shadow-mapSize-height={512}/>
    <pointLight position={[0,7,-13]} color="#ffc381" intensity={5} distance={31}/>
    <RiverSurface quiet={budget.reducedMotion}/>
    <Terrain quality={budget.level}/>
    <SystemSwitchThreshold active={!budget.reducedMotion} quiet={budget.reducedMotion}/>
    {enterprises.map((door,i)=><Portal key={door.public_slug} name={door.platform_name||door.name} index={i} x={doorPositions[i].x} z={doorPositions[i].z}/>)}
    <Walker inputRef={inputRef} doors={doorPositions} role={role} onNearbyDoor={onNearbyDoor} onRegionChange={onRegionChange}/>
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

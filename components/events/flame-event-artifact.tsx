'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect,useRef,useState } from 'react'
import * as THREE from 'three'
import {
  DEFAULT_FLAME_ARTIFACT_CONFIG,
  normalizeFlameArtifactConfig,
  type FlameArtifactSurface,
  type FlameArtifactVisualConfig,
} from '@/lib/weave-visual-profile'

export const FLAME_EVENT_ARTIFACT_COLORS=DEFAULT_FLAME_ARTIFACT_CONFIG.palette

let cachedRuntime=DEFAULT_FLAME_ARTIFACT_CONFIG
let cachedAt=0
let pending:Promise<void>|null=null

async function refreshRuntimeProfile(){
  const now=Date.now()
  if(now-cachedAt<10000)return
  if(pending)return pending
  cachedAt=now
  pending=fetch('/api/visual-runtime',{cache:'no-store'})
    .then(async response=>{
      if(!response.ok)throw new Error('Visual runtime unavailable')
      const body=await response.json()
      if(body?.success&&body.config)cachedRuntime=normalizeFlameArtifactConfig(body.config)
    })
    .catch(()=>{})
    .finally(()=>{pending=null})
  return pending
}

function useFlameArtifactRuntime(){
  const [config,setConfig]=useState<FlameArtifactVisualConfig>(cachedRuntime)

  useEffect(()=>{
    let mounted=true
    const pull=async()=>{
      await refreshRuntimeProfile()
      if(mounted)setConfig(cachedRuntime)
    }
    void pull()
    const interval=window.setInterval(()=>void pull(),15000)
    window.addEventListener('focus',pull)
    return ()=>{
      mounted=false
      window.clearInterval(interval)
      window.removeEventListener('focus',pull)
    }
  },[])

  return config
}

type ArtifactVariant='core'|'portal'|'hero'

export function FlameEventArtifact3D({
  variant='core',
  progress=4,
  accent,
  active=true,
  surface,
  configOverride,
}:{
  variant?:ArtifactVariant
  progress?:number
  accent?:string
  active?:boolean
  surface?:FlameArtifactSurface
  configOverride?:FlameArtifactVisualConfig
}) {
  const runtime=useFlameArtifactRuntime()
  const config=configOverride?normalizeFlameArtifactConfig(configOverride):runtime
  const root=useRef<THREE.Group>(null)
  const core=useRef<THREE.Group>(null)
  const orbitA=useRef<THREE.Mesh>(null)
  const orbitB=useRef<THREE.Mesh>(null)
  const orbitC=useRef<THREE.Mesh>(null)
  const baseScale=variant==='portal'?0.55:variant==='hero'?1.12:1
  const scale=baseScale*config.appearance.coreScale
  const palette=config.palette
  const motion=config.motion.enabled?config.motion.rotationSpeed:0
  const floatStrength=config.motion.enabled?config.motion.floatStrength:0

  useFrame(({clock},delta)=>{
    const t=clock.getElapsedTime()
    if(root.current){
      root.current.rotation.y+=delta*(variant==='portal'?0.28:0.16)*motion
      root.current.rotation.z=Math.sin(t*0.28)*0.045*motion
      root.current.position.y=Math.sin(t*0.8)*floatStrength
    }
    if(core.current)core.current.rotation.y-=delta*0.36*motion
    if(orbitA.current)orbitA.current.rotation.z+=delta*0.22*motion
    if(orbitB.current)orbitB.current.rotation.z-=delta*0.18*motion
    if(orbitC.current)orbitC.current.rotation.y+=delta*0.16*motion
  })

  if(!config.enabled||(surface&&!config.surfaces[surface]))return null

  const glow=(active?1:0.42)*config.appearance.glow
  const orbit=config.appearance.orbitOpacity
  const wire=config.appearance.wireframeOpacity
  const surfaceAccent=accent||palette.blue
  const satellites=[
    [0,1.7,0],
    [1.48,-0.5,0.45],
    [-1.42,-0.55,-0.35],
    [0,-1.25,1.1],
  ] as [number,number,number][]

  return (
    <group ref={root} scale={scale}>
      <pointLight position={[0,0.2,1.4]} intensity={(variant==='portal'?4:8)*glow} color={palette.red} distance={6}/>
      <pointLight position={[0.8,1.1,-1]} intensity={(variant==='portal'?3:6)*glow} color={palette.sky} distance={6}/>

      <group ref={core}>
        <mesh>
          <octahedronGeometry args={[0.92,2]}/>
          <meshStandardMaterial color={palette.dark} emissive={palette.sky} emissiveIntensity={0.48*glow} metalness={0.72} roughness={0.18}/>
        </mesh>
        <mesh scale={0.76} rotation={[0.35,0.25,0]}>
          <icosahedronGeometry args={[0.88,1]}/>
          <meshStandardMaterial color={palette.white} emissive={palette.red} emissiveIntensity={0.62*glow} transparent opacity={0.28*wire} wireframe/>
        </mesh>
        <mesh position={[0,-0.02,0.1]} rotation={[0,0,Math.PI]}>
          <coneGeometry args={[0.33,1.18,5,1]}/>
          <meshStandardMaterial color={palette.white} emissive={palette.ember} emissiveIntensity={1.35*glow} toneMapped={false} transparent opacity={0.92}/>
        </mesh>
        <mesh position={[0,-0.08,0.16]} rotation={[0,0,Math.PI]} scale={0.55}>
          <coneGeometry args={[0.3,1.05,5,1]}/>
          <meshBasicMaterial color={palette.sky} transparent opacity={0.82}/>
        </mesh>
      </group>

      <mesh ref={orbitA} rotation={[Math.PI/2.7,0.15,0.25]}>
        <torusGeometry args={[1.38,0.025,8,84,Math.PI*1.42]}/>
        <meshBasicMaterial color={palette.sky} transparent opacity={0.72*glow*orbit}/>
      </mesh>
      <mesh ref={orbitB} rotation={[-Math.PI/2.55,0.85,-0.35]}>
        <torusGeometry args={[1.56,0.022,8,84,Math.PI*1.28]}/>
        <meshBasicMaterial color={palette.red} transparent opacity={0.62*glow*orbit}/>
      </mesh>
      <mesh ref={orbitC} rotation={[0.4,Math.PI/2,0.8]}>
        <torusGeometry args={[1.22,0.016,8,72,Math.PI*1.18]}/>
        <meshBasicMaterial color={palette.white} transparent opacity={0.38*glow*orbit}/>
      </mesh>

      {[0,1,2].map(index=>(
        <mesh key={index} rotation={[0,index*Math.PI/3,0]} position={[0,0,-0.08]} scale={1+index*0.17}>
          <tetrahedronGeometry args={[1.22,0]}/>
          <meshBasicMaterial
            color={index===0?palette.sky:index===1?palette.red:palette.white}
            wireframe
            transparent
            opacity={(0.16-index*0.03)*glow*wire}
          />
        </mesh>
      ))}

      {satellites.map((position,index)=>{
        const reached=index<Math.max(0,Math.min(4,progress))
        return (
          <group key={index} position={position}>
            <mesh scale={reached?1:0.72}>
              <octahedronGeometry args={[0.105,0]}/>
              <meshStandardMaterial
                color={reached?palette.white:'#334155'}
                emissive={reached?(index%2?palette.red:palette.sky):'#0f172a'}
                emissiveIntensity={reached?1.2*glow:0.15}
                toneMapped={false}
              />
            </mesh>
            {reached&&<pointLight intensity={0.7*glow} distance={1.2} color={index%2?palette.red:palette.sky}/>}
          </group>
        )
      })}

      {variant==='portal'&&(
        <mesh position={[0,-0.96,0]} rotation={[-Math.PI/2,0,0]}>
          <circleGeometry args={[0.82,36]}/>
          <meshBasicMaterial color={surfaceAccent} transparent opacity={0.11*Math.min(1.4,glow)}/>
        </mesh>
      )}
    </group>
  )
}

export function FlameEventArtifactMark({
  size='md',
  className='',
  surface,
  configOverride,
}:{
  size?:'sm'|'md'|'lg'
  className?:string
  surface?:FlameArtifactSurface
  configOverride?:FlameArtifactVisualConfig
}) {
  const runtime=useFlameArtifactRuntime()
  const config=configOverride?normalizeFlameArtifactConfig(configOverride):runtime
  if(!config.enabled||(surface&&!config.surfaces[surface]))return null

  const dimensions=size==='sm'?'h-12 w-12':size==='lg'?'h-32 w-32':'h-24 w-24'
  const {sky,white,red}=config.palette
  const glow=config.appearance.glow

  return (
    <div className={`relative ${dimensions} ${className}`} data-flame-event-artifact-mark="4d" aria-hidden="true">
      <div className="absolute inset-[8%] rotate-45 border bg-white/[.02]" style={{borderColor:`${sky}59`,boxShadow:`0 0 ${36*glow}px ${sky}24`}}/>
      <div className="absolute inset-[18%] -rotate-12 border bg-white/[.02]" style={{borderColor:`${red}4d`}}/>
      <div className="absolute inset-[29%] rotate-[18deg] border bg-white/[.035]" style={{borderColor:`${white}4d`}}/>
      <div
        className="absolute left-1/2 top-[21%] h-[57%] w-[21%] -translate-x-1/2 [clip-path:polygon(50%_0,100%_54%,72%_100%,28%_100%,0_54%)]"
        style={{background:`linear-gradient(to bottom,${white},${sky},${red})`,boxShadow:`0 0 ${28*glow}px ${red}33`}}
      />
      <div className="absolute left-[8%] top-1/2 h-px w-[84%] -translate-y-1/2 rotate-[-17deg]" style={{background:`linear-gradient(to right,transparent,${sky}b3,transparent)`}}/>
      <div className="absolute left-[8%] top-1/2 h-px w-[84%] -translate-y-1/2 rotate-[22deg]" style={{background:`linear-gradient(to right,transparent,${red}a6,transparent)`}}/>
      <span className="absolute left-1/2 top-[2%] h-1.5 w-1.5 -translate-x-1/2 rotate-45" style={{background:white,boxShadow:`0 0 12px ${white}cc`}}/>
      <span className="absolute bottom-[8%] left-[10%] h-1.5 w-1.5 rotate-45" style={{background:sky,boxShadow:`0 0 12px ${sky}b3`}}/>
      <span className="absolute bottom-[8%] right-[10%] h-1.5 w-1.5 rotate-45" style={{background:red,boxShadow:`0 0 12px ${red}b3`}}/>
    </div>
  )
}

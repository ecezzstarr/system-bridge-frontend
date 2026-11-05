'use client'

import {AdaptiveCanvas} from '@/components/world/adaptive-canvas'
import {FILE_FOLDER_WORLD_APPEARANCES,FILE_FOLDER_PALETTES} from '@/lib/file-folder-world-presets'
import type {FileFolderTier} from '@/lib/file-folder-pricing'

function KingdomArchitecture({tier}:{tier:FileFolderTier}){
  const p=FILE_FOLDER_PALETTES[FILE_FOLDER_WORLD_APPEARANCES[tier].theme]
  const height=tier==='plus'?5.9:tier==='premium'?5:tier==='pro'?4.15:3.3
  const towers=tier==='plus'?6:tier==='premium'?4:tier==='pro'?3:2
  return <group rotation={[0,-.32,0]}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.35,0]} receiveShadow>
      <circleGeometry args={[15,80]}/><meshStandardMaterial color={p.ground} roughness={.85}/>
    </mesh>
    <mesh position={[0,-.13,0]} receiveShadow>
      <cylinderGeometry args={[7.7,8.3,.42,10]}/><meshStandardMaterial color={p.structure} metalness={.2} roughness={.52}/>
    </mesh>
    <mesh position={[0,height*.47,0]} castShadow receiveShadow>
      <boxGeometry args={[5,height,4]}/><meshStandardMaterial color={p.structure} metalness={.3} roughness={.33}/>
    </mesh>
    <mesh position={[0,height+.48,0]} castShadow>
      <coneGeometry args={[3.45,1.25,4]}/><meshStandardMaterial color={p.accent} metalness={.45} roughness={.32}/>
    </mesh>
    <mesh position={[0,1.25,2.05]}>
      <boxGeometry args={[1.55,2.5,.1]}/><meshPhysicalMaterial color={p.glass} transparent opacity={.84} metalness={.4} roughness={.22}/>
    </mesh>
    {Array.from({length:3},(_,level)=>[-1.5,1.5].map(x=>
      <mesh key={level+'-'+x} position={[x,1.9+level*1.05,2.03]}>
        <boxGeometry args={[.68,.53,.09]}/><meshStandardMaterial color={p.glow} emissive={p.accent} emissiveIntensity={.24}/>
      </mesh>
    ))}
    {Array.from({length:towers},(_,i)=>{
      const angle=i*Math.PI*2/towers
      const x=Math.cos(angle)*5.2,z=Math.sin(angle)*5.2
      const towerHeight=height*.66+(i%2)*.75
      return <group key={i} position={[x,0,z]}>
        <mesh castShadow position={[0,towerHeight*.5,0]}>
          <cylinderGeometry args={[.82,1.08,towerHeight,8]}/><meshStandardMaterial color={p.structure} roughness={.46} metalness={.18}/>
        </mesh>
        <mesh castShadow position={[0,towerHeight+.48,0]}>
          <coneGeometry args={[1.24,.95,8]}/><meshStandardMaterial color={p.accent} metalness={.4} roughness={.36}/>
        </mesh>
      </group>
    })}
    {tier==='plus'&&<mesh position={[0,height+1.36,0]}>
      <octahedronGeometry args={[.54,1]}/><meshStandardMaterial color={p.glow} emissive={p.accent} emissiveIntensity={.5}/>
    </mesh>}
    {[-1,1].map(x=><group key={x} position={[x*10,0,-5]}>
      <mesh castShadow position={[0,1.1,0]}><boxGeometry args={[3,2.2,3]}/><meshStandardMaterial color={p.structure} roughness={.4}/></mesh>
      <mesh castShadow position={[0,2.6,0]}><coneGeometry args={[2.12,1.1,4]}/><meshStandardMaterial color={p.accent} metalness={.27}/></mesh>
    </group>)}
  </group>
}
export default function ClientKingdomDashboardScene({tier}:{tier:FileFolderTier}){
  const p=FILE_FOLDER_PALETTES[FILE_FOLDER_WORLD_APPEARANCES[tier].theme]
  return <div className="absolute inset-0 pointer-events-none" aria-hidden="true" data-client-kingdom-3d={tier}>
    <AdaptiveCanvas camera={{position:[15,13,26],fov:48,near:.1,far:130}} shadows={false}>
      <color attach="background" args={[p.sky]}/>
      <fog attach="fog" args={[p.sky,25,85]}/>
      <ambientLight intensity={1.55}/>
      <hemisphereLight args={[p.glow,p.ground,1.3]}/>
      <directionalLight position={[9,18,12]} intensity={2.1} color={p.glow}/>
      <KingdomArchitecture tier={tier}/>
    </AdaptiveCanvas>
    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/15 to-slate-950/70"/>
  </div>
}

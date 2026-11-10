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

/**
 * Premium is an actual tier-specific estate: obsidian stone, brushed gold
 * colonnades, multi-level terraces and luminous glass. The scene decorates the
 * VERIFIED Client account; it never represents fabricated business construction.
 */
function PremiumKingdomArchitecture(){
  const ivory='#e8d6b8',obsidian='#17151a',coal='#252128',gold='#d4aa63',glass='#a8c8c5'
  return <group rotation={[0,-.35,0]} data-premium-client-citadel="monumental-terraced-estate">
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.68,0]} receiveShadow>
      <circleGeometry args={[20,80]}/><meshStandardMaterial color="#181418" roughness={.9}/>
    </mesh>
    {Array.from({length:4},(_,i)=><group key={'terrace-'+i} position={[0,-.33+i*.22,0]}>
      <mesh position={[0,0,-i*.14]} receiveShadow><cylinderGeometry args={[10-i*.9,10.25-i*.9,.28,12]}/><meshPhysicalMaterial color={i%2?coal:obsidian} metalness={.26} roughness={.34} clearcoat={.3}/></mesh>
      <mesh position={[0,.16,-i*.14]}><torusGeometry args={[10-i*.9,.06,8,80]}/><meshStandardMaterial color={gold} metalness={.87} roughness={.2}/></mesh>
    </group>)}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.21,0]}>
      <ringGeometry args={[10.6,12,84]}/><meshPhysicalMaterial color="#486b6f" metalness={.4} roughness={.18} transparent opacity={.86}/></mesh>
    <group position={[0,.9,0]}>
      <mesh castShadow receiveShadow position={[0,2.5,0]}><boxGeometry args={[6.3,5.2,5.6]}/><meshPhysicalMaterial color={obsidian} metalness={.55} roughness={.28} clearcoat={.65}/></mesh>
      <mesh castShadow position={[0,5.2,0]}><boxGeometry args={[7.4,.55,6.5]}/><meshPhysicalMaterial color={ivory} metalness={.32} roughness={.35} clearcoat={.7}/></mesh>
      <mesh castShadow position={[0,5.52,0]}><boxGeometry args={[7.8,.12,6.8]}/><meshStandardMaterial color={gold} metalness={.92} roughness={.19}/></mesh>
      <mesh castShadow position={[0,6.7,0]}><cylinderGeometry args={[2.35,3.2,2.4,12]}/><meshPhysicalMaterial color={coal} metalness={.48} roughness={.28} clearcoat={.6}/></mesh>
      <mesh castShadow position={[0,8.2,0]}><cylinderGeometry args={[1.2,2.3,.72,12]}/><meshPhysicalMaterial color={gold} metalness={.86} roughness={.2}/></mesh>
      <mesh position={[0,8.75,0]}><octahedronGeometry args={[.62,1]}/><meshPhysicalMaterial color="#fff1d0" metalness={.6} roughness={.1} emissive="#c9a35d" emissiveIntensity={.28}/></mesh>
      <mesh position={[0,2.45,2.85]}><boxGeometry args={[2.1,4.35,.15]}/><meshPhysicalMaterial color={glass} metalness={.46} roughness={.13} transparent opacity={.7}/></mesh>
      {[-1,1].map(side=><group key={'wing-'+side}>
        <mesh castShadow position={[side*4.7,2.2,0]}><boxGeometry args={[3.2,4.5,5.2]}/><meshPhysicalMaterial color={coal} metalness={.46} roughness={.34} clearcoat={.58}/></mesh>
        <mesh castShadow position={[side*4.7,4.55,0]}><boxGeometry args={[3.6,.3,5.6]}/><meshStandardMaterial color={gold} metalness={.84} roughness={.23}/></mesh>
        <mesh position={[side*4.7,3,2.68]}><boxGeometry args={[1.95,2.8,.08]}/><meshPhysicalMaterial color={glass} metalness={.3} roughness={.12} transparent opacity={.74}/></mesh>
        {[-.9,.9].map(x=><mesh key={x} position={[side*4.7+x,2.8,2.83]}><boxGeometry args={[.07,3.8,.14]}/><meshStandardMaterial color={gold} metalness={.93} roughness={.16}/></mesh>)}
      </group>)}
      {[-2.65,-1.95,-1.25,1.25,1.95,2.65].map((x,i)=><group key={'col-'+i}>
        <mesh castShadow position={[x,2,3.24]}><cylinderGeometry args={[.11,.18,3.9,12]}/><meshPhysicalMaterial color={ivory} metalness={.25} roughness={.38}/></mesh>
        <mesh position={[x,4.06,3.24]}><boxGeometry args={[.47,.21,.46]}/><meshStandardMaterial color={gold} metalness={.79} roughness={.26}/></mesh>
        <mesh position={[x,-.04,3.24]}><boxGeometry args={[.4,.18,.4]}/><meshStandardMaterial color={gold} metalness={.8} roughness={.24}/></mesh>
      </group>)}
      {[-1,1].map(side=><group key={'tower-'+side} position={[side*7.8,0,-3.8]}>
        <mesh castShadow position={[0,3,0]}><cylinderGeometry args={[1.38,1.75,6.1,12]}/><meshPhysicalMaterial color={obsidian} metalness={.45} roughness={.25} clearcoat={.68}/></mesh>
        <mesh position={[0,5.9,0]}><cylinderGeometry args={[1.72,1.76,.34,12]}/><meshStandardMaterial color={ivory} metalness={.45} roughness={.24}/></mesh>
        <mesh castShadow position={[0,6.9,0]}><coneGeometry args={[1.75,1.8,12]}/><meshStandardMaterial color={gold} metalness={.9} roughness={.2}/></mesh>
        {[-.78,0,.78].map((v,j)=><mesh key={j} position={[v,3.1,1.4]}><boxGeometry args={[.34,2.25,.12]}/><meshPhysicalMaterial color="#cfb879" emissive="#a67a32" emissiveIntensity={.22} metalness={.32} roughness={.22}/></mesh>)}
      </group>)}
    </group>
    {[-1,1].map(side=><group key={'cascade-'+side} position={[side*11.8,-.1,-3]}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.12,0]}><planeGeometry args={[3.2,6]}/><meshPhysicalMaterial color="#557c80" metalness={.5} roughness={.1} transparent opacity={.7}/></mesh>
      <mesh position={[0,1.05,1.5]}><boxGeometry args={[3.3,.18,2.4]}/><meshStandardMaterial color={ivory} metalness={.35} roughness={.38}/></mesh>
      {[-1,-.3,.3,1].map(v=><mesh key={v} position={[v,-.7,2.65]}><planeGeometry args={[.45,2.4]}/><meshPhysicalMaterial color="#b3dcda" transparent opacity={.56} roughness={.14} depthWrite={false}/></mesh>)}
    </group>)}
    {Array.from({length:9},(_,i)=>{
      const angle=i*Math.PI*2/9
      return <group key={'beacon-'+i} position={[Math.cos(angle)*13.1,.15,Math.sin(angle)*13.1]}>
        <mesh position={[0,.6,0]}><cylinderGeometry args={[.14,.21,1.15,8]}/><meshStandardMaterial color={ivory} metalness={.42} roughness={.28}/></mesh>
        <mesh position={[0,1.28,0]}><sphereGeometry args={[.22,10,8]}/><meshStandardMaterial color="#ffdf9e" emissive="#ad834a" emissiveIntensity={.8}/></mesh>
      </group>
    })}
  </group>
}

export default function ClientKingdomDashboardScene({tier}:{tier:FileFolderTier}){
  const p=FILE_FOLDER_PALETTES[FILE_FOLDER_WORLD_APPEARANCES[tier].theme]
  return <div className="absolute inset-0 pointer-events-none" aria-hidden="true" data-client-kingdom-3d={tier}>
    <AdaptiveCanvas camera={{position:[15,13,26],fov:48,near:.1,far:130}} shadows={false}>
      <color attach="background" args={[p.sky]}/>
      <fog attach="fog" args={[p.sky,25,85]}/>
      <ambientLight intensity={tier==='premium'?.85:1.55}/>
      <hemisphereLight args={[p.glow,p.ground,1.3]}/>
      <directionalLight position={[9,18,12]} intensity={2.1} color={p.glow}/>
      {tier==='premium'&&<><spotLight position={[-9,22,12]} angle={.5} penumbra={.5} intensity={100} color="#ffdaa1"/><pointLight position={[0,7,4]} intensity={20} color="#e8b669" distance={20}/></>}
      {tier==='premium'?<PremiumKingdomArchitecture/>:<KingdomArchitecture tier={tier}/>}
    </AdaptiveCanvas>
    <div className={tier==='premium'?'absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,10,.2),transparent_42%,rgba(7,6,9,.62))]':'absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/15 to-slate-950/70'}/>
  </div>
}

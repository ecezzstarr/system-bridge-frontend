'use client'

import {Text} from '@react-three/drei'
import * as THREE from 'three'
import {CityMaterial} from './file-folder-city-material'

export const FILE_FOLDER_VISUAL_TIERS=['standard','pro','premium','plus'] as const
export type FileFolderVisualTier=typeof FILE_FOLDER_VISUAL_TIERS[number]|'legacy'

export function resolveFileFolderVisualTier(value:unknown):FileFolderVisualTier{
  const tier=String(value||'').toLowerCase().trim()
  return FILE_FOLDER_VISUAL_TIERS.includes(tier as typeof FILE_FOLDER_VISUAL_TIERS[number])
    ?tier as FileFolderVisualTier:'legacy'
}
export const FILE_FOLDER_TIER_THEMES={
  standard:{label:'STANDARD',accent:'#87c6d6',body:'#294450',roof:'#b6c5c6',glass:'#79c4cf',height:1.6,columns:2},
  pro:{label:'PRO',accent:'#8ce3d9',body:'#264c53',roof:'#b8ded3',glass:'#64e2d6',height:2.45,columns:3},
  premium:{label:'PREMIUM',accent:'#f6cf87',body:'#5a5145',roof:'#f7e0bd',glass:'#d9be9b',height:3.25,columns:4},
  plus:{label:'PLUS',accent:'#f5f6f5',body:'#d3dadd',roof:'#ffffff',glass:'#b1e5ef',height:4,columns:5},
  legacy:{label:'FILE FOLDER',accent:'#87c6d6',body:'#294450',roof:'#b6c5c6',glass:'#79c4cf',height:1.6,columns:2},
} as const

/**
 * Host-provided architectural identity. These are physical three-dimensional
 * structures, not purchased systems, enterprise authorization, or fake
 * Client construction. The exact number of functional buildings always comes
 * from verified Client build records elsewhere in the scene.
 */
export function FileFolderTierArchitecture({tier='legacy',reducedDetail=false}:{
  tier?:FileFolderVisualTier;reducedDetail?:boolean
}){
  const theme=FILE_FOLDER_TIER_THEMES[tier]
  const extent=theme.height
  const markers=([[-16,-14],[16,-14],[-16,14],[16,14]] as const).slice(0,reducedDetail?2:4)
  const strips=tier==='plus'?6:tier==='premium'?4:tier==='pro'?3:2
  return <group data-file-folder-architecture-tier={tier}>
    {markers.map(([x,z],index)=><group key={index} position={[x,0,z]} rotation={[0,index%2?Math.PI*.25:-Math.PI*.25,0]}>
      <mesh receiveShadow position={[0,-.04,0]}>
        <boxGeometry args={[1.8,.16,1.7]}/>
        <CityMaterial kind="paving" tileX={2} tileY={2}/>
      </mesh>
      <mesh castShadow receiveShadow position={[0,extent*.5,0]}>
        <boxGeometry args={[.95,extent,.65]}/>
        <CityMaterial kind={tier==='plus'?'glass':tier==='premium'?'warm':'metal'} tileY={Math.max(1,Math.round(extent))}/>
      </mesh>
      <mesh castShadow position={[0,extent+.12,0]}>
        <boxGeometry args={[1.22,.24,.86]}/>
        <meshPhysicalMaterial color={theme.roof} metalness={.64} roughness={.25} clearcoat={.38}/>
      </mesh>
      <mesh position={[0,extent+.25,.01]}>
        <boxGeometry args={[1.25,.045,.9]}/>
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={tier==='standard'?.18:.4}/>
      </mesh>
      {Array.from({length:Math.min(strips,reducedDetail?3:6)},(_,n)=>{
        const y=.35+(n+.3)*Math.max(.17,(extent-.5)/strips)
        return <mesh key={n} position={[0,y,.34]}>
          <boxGeometry args={[.8,.035,.025]}/>
          <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={.24}/>
        </mesh>
      })}
      {(tier==='premium'||tier==='plus')&&!reducedDetail&&<mesh position={[0,extent+.48,0]}>
        <octahedronGeometry args={[tier==='plus'?.21:.13,1]}/>
        <meshPhysicalMaterial color={theme.accent} metalness={.45} roughness={.17} clearcoat={.65}/>
      </mesh>}
    </group>)}
    {/* Tier identity is visible inside the physical scene, not only on a card. */}
    <group position={[0,0,-19.2]}>
      <mesh receiveShadow position={[0,-.09,0]}>
        <boxGeometry args={[7.7,.18,1]}/>
        <CityMaterial kind="paving" tileX={6} tileY={1}/>
      </mesh>
      {[-1,1].map(side=><group key={side} position={[side*3.3,0,0]}>
        <mesh position={[0,1.05,0]} castShadow>
          <boxGeometry args={[.34,2.1,.5]}/>
          <CityMaterial kind={tier==='premium'?'warm':tier==='plus'?'glass':'metal'} tileY={2}/>
        </mesh>
        <mesh position={[0,2.12,0]}>
          <boxGeometry args={[.48,.16,.6]}/>
          <meshPhysicalMaterial color={theme.accent} roughness={.21} metalness={.58}/>
        </mesh>
      </group>)}
      <mesh position={[0,2.11,0]}>
        <boxGeometry args={[6.35,.25,.58]}/>
        <meshPhysicalMaterial color={theme.body} metalness={.55} roughness={.31}/>
      </mesh>
      <mesh position={[0,1.72,.01]}>
        <boxGeometry args={[5.25,.48,.15]}/>
        <meshPhysicalMaterial color={theme.glass} transparent opacity={tier==='plus'?.87:.7} metalness={.22} roughness={.21} clearcoat={.62}/>
      </mesh>
      <Text position={[0,1.72,.1]} fontSize={.2} color={tier==='plus'?'#132c39':'#ffffff'} anchorX="center" maxWidth={4.95}>
        {theme.label} · WEAVE OF PRESENCE
      </Text>
    </group>
  </group>
}

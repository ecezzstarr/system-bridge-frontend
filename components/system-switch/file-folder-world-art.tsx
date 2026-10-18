'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useTexture } from '@react-three/drei'
import * as THREE from 'three'

export type FormationStation='blueprint_foundry'|'parts_workshop'|'boost_bay'|'formation_yard'
export const FILE_FOLDER_STATION_POSITIONS:Record<FormationStation,[number,number,number]>={
  blueprint_foundry:[-6.9,0,-.1],
  parts_workshop:[-7.05,0,-4.05],
  boost_bay:[-2.8,0,-4.9],
  formation_yard:[-5.1,0,-2.15],
}
const asset='/weave/file-folder/assets/'

function StoneCliffs(){
  // Stable deterministic terrain silhouettes; geometry never changes between
  // Client visits. No animated wallpaper or inaccessible remote media.
  const silhouettes=useMemo(()=>Array.from({length:28},(_,index)=>{
    const angle=index/28*Math.PI*2
    const radius=12.6+(index%4)*1.35
    return {x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,
      height:2+(index*7%9)*.68,width:1.8+(index*3%4)*.62}
  }),[])
  return <group>
    {silhouettes.map((rock,index)=><group key={index} position={[rock.x,-.85,rock.z]}>
      <mesh receiveShadow castShadow={index%3===0} rotation={[0,index*.4,.05]}>
        <icosahedronGeometry args={[1,0]}/>
        <meshStandardMaterial color={index%3===0?'#384d51':index%3===1?'#30444a':'#475252'} metalness={.04} roughness={.92}/>
        <group scale={[rock.width,rock.height,rock.width*.78]}/>
      </mesh>
      <mesh position={[0,-.5,0]} scale={[rock.width,rock.height,rock.width*.78]}>
        <dodecahedronGeometry args={[1,0]}/>
        <meshStandardMaterial color={index%2?'#273b42':'#465353'} roughness={.94}/>
      </mesh>
    </group>)}
  </group>
}

function CanyonRidge(){
  return <group>
    {[-1,1].map(side=><group key={side} position={[side*13,-1,-12]} scale={[2.2,6,3.8]}>
      <mesh castShadow receiveShadow><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color="#536068" roughness={.94}/></mesh>
      <mesh position={[side*.4,-.18,1]} scale={[.75,.78,.8]}><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color="#263d40" roughness={.95}/></mesh>
    </group>)}
    <mesh position={[0,-.8,-17]} scale={[8.6,4.2,3.2]}>
      <dodecahedronGeometry args={[1,0]}/>
      <meshStandardMaterial color="#43505e" roughness={.95}/>
    </mesh>
  </group>
}

function Waterfall({position,width=1.45,height=4}:{position:[number,number,number];width?:number;height?:number}){
  const shimmer=useRef<THREE.Group>(null)
  useFrame(({clock})=>{
    if(shimmer.current)shimmer.current.position.y=-Math.abs(Math.sin(clock.elapsedTime*1.8))*.12
  })
  return <group position={position}>
    <mesh position={[0,-.18,.1]}><cylinderGeometry args={[width*.6,width*.8,.12,20]}/><meshStandardMaterial color="#326f83" emissive="#22d3ee" emissiveIntensity={.12} roughness={.3}/></mesh>
    <group ref={shimmer}>
      {Array.from({length:5},(_,i)=><mesh key={i} position={[-width*.4+i*width*.2,height*.47,.02+i*.016]}>
        <planeGeometry args={[width*.19,height]}/>
        <meshBasicMaterial color={i%2?'#baf3fa':'#76d7ea'} transparent opacity={i%2?.25:.37} side={THREE.DoubleSide} depthWrite={false}/>
      </mesh>)}
    </group>
    <mesh position={[0,0,.18]} scale={[1,.2,1]}><sphereGeometry args={[width*.66,12,6]}/><meshBasicMaterial color="#d1fbff" transparent opacity={.34}/></mesh>
  </group>
}

function ParkTree({x,z,index}:{x:number;z:number;index:number}){
  const height=.55+(index%3)*.15
  return <group position={[x,-.15,z]}>
    <mesh position={[0,height*.42,0]} castShadow><cylinderGeometry args={[.06,.1,height,5]}/><meshStandardMaterial color="#675543" roughness={.94}/></mesh>
    <mesh position={[0,height+.05,0]} castShadow><coneGeometry args={[.39,height*1.3,6]}/><meshStandardMaterial color={index%3===0?'#21574d':index%3===1?'#316552':'#285849'} roughness={.92}/></mesh>
    <mesh position={[0,height+.38,0]} castShadow><coneGeometry args={[.27,height*.88,6]}/><meshStandardMaterial color="#387b66" roughness={.94}/></mesh>
  </group>
}

export function FileFolderScenery({formationCount=0}:{formationCount?:number}){
  const foliage=useMemo(()=>Array.from({length:20},(_,i)=>{
    const t=i/20*Math.PI*2
    const radius=7.3+(i%4)*.65
    return {x:Math.cos(t)*radius,z:Math.sin(t)*radius}
  }),[])
  return <group>
    <StoneCliffs/>
    <CanyonRidge/>
    <Waterfall position={[-7.6,1.9,-12.2]}/>
    <Waterfall position={[6.7,1.5,-13.1]} width={1.1} height={3.15}/>
    {foliage.map((p,i)=><ParkTree key={i} {...p} index={i}/>)}
    {Array.from({length:12},(_,i)=>{
      const t=i/12*Math.PI*2
      return <group key={i} position={[Math.cos(t)*7.2,-.1,Math.sin(t)*7.2]}>
        <mesh><cylinderGeometry args={[.075,.1,.12,8]}/><meshStandardMaterial color="#394d57" metalness={.5}/></mesh>
        <mesh position={[0,.15,0]}><sphereGeometry args={[.063,8,8]}/><meshStandardMaterial color="#ffda95" emissive="#f8b454" emissiveIntensity={.7}/></mesh>
      </group>
    })}
    {formationCount>0&&<group position={[-5.1,0,-2.15]}>
      {Array.from({length:Math.min(4,formationCount)},(_,i)=><group key={i} position={[-1.6+(i%2)*3.15,.06,-1.1+Math.floor(i/2)*2.2]}>
        <mesh castShadow position={[0,.14,0]}><boxGeometry args={[.42,.29,.42]}/><meshStandardMaterial color="#706451" roughness={.85}/></mesh>
        <mesh position={[0,.32,.22]}><planeGeometry args={[.26,.15]}/><meshBasicMaterial color="#79e5ea"/></mesh>
      </group>)}
    </group>}
  </group>
}

function IndustrialStation({label,texture,accent,position,onEnter}:{
  label:string;texture:THREE.Texture;accent:string;position:[number,number,number];onEnter?:()=>void
}){
  return <group position={position} onClick={e=>{e.stopPropagation();onEnter?.()}}>
    <mesh castShadow receiveShadow position={[0,.12,0]}><boxGeometry args={[1.55,.24,1.28]}/><meshStandardMaterial color="#1b2932" metalness={.12} roughness={.72}/></mesh>
    <mesh castShadow position={[0,.72,-.16]}><boxGeometry args={[1.35,1.18,.86]}/><meshStandardMaterial color="#243946" roughness={.48} metalness={.26}/></mesh>
    {[-.51,.51].map((x,i)=><mesh key={i} position={[x,.76,.31]}><boxGeometry args={[.12,.94,.12]}/><meshStandardMaterial color="#66818b" metalness={.72} roughness={.26}/></mesh>)}
    <mesh position={[0,1.5,.16]}><boxGeometry args={[1.69,.12,.95]}/><meshStandardMaterial color="#435561" metalness={.58} roughness={.26}/></mesh>
    <mesh position={[0,.71,.36]}><planeGeometry args={[.83,.74]}/><meshStandardMaterial color="#17333f" emissive={accent} emissiveIntensity={.2} metalness={.45} roughness={.26} side={THREE.DoubleSide}/></mesh>
    <mesh position={[0,1.65,.41]}><planeGeometry args={[1.73,.82]}/><meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} toneMapped={false}/></mesh>
    <Text position={[0,.16,.69]} color="#b6dfe9" fontSize={.09} maxWidth={1.4} anchorX="center">{label.toUpperCase()}</Text>
  </group>
}

export function FileFolderFacilities({marketReady=false,enterpriseReady=false,onStudioEnter}:{
  marketReady?:boolean;enterpriseReady?:boolean;onStudioEnter?:(key:FormationStation)=>void
}){
  // These facade images are rendered on physical, walkable constructions.
  // They are not a full-screen background or a false stand-in for operation.
  const [yard,door,parts,boost,system,blueprint,expansion]=useTexture([
    asset+'formation-yard.svg',asset+'customer-door.svg',
    asset+'parts-workshop.svg',asset+'boost-bay.svg',
    asset+'system-formation.svg',asset+'blueprint-foundry.svg',
    asset+'enterprise-expansion.svg',
  ])
  return <group>
    <mesh position={[0,2.65,1.08]}><planeGeometry args={[2.65,1.24]}/><meshBasicMaterial map={system} transparent toneMapped={false} side={THREE.DoubleSide}/></mesh>
    <mesh position={[-5.1,1.48,-.34]}><planeGeometry args={[2.8,1.31]}/><meshBasicMaterial map={yard} transparent toneMapped={false} side={THREE.DoubleSide}/></mesh>
    {marketReady&&<mesh position={[5.2,2.19,-.75]}><planeGeometry args={[2.7,1.26]}/><meshBasicMaterial map={door} transparent toneMapped={false} side={THREE.DoubleSide}/></mesh>}
    {enterpriseReady&&<mesh position={[-3.6,3.7,4.15]}><planeGeometry args={[2.4,1.13]}/><meshBasicMaterial map={expansion} transparent toneMapped={false} side={THREE.DoubleSide}/></mesh>}
    <IndustrialStation label="Blueprint Foundry" texture={blueprint} accent="#91c7ff" position={FILE_FOLDER_STATION_POSITIONS.blueprint_foundry} onEnter={()=>onStudioEnter?.('blueprint_foundry')}/>
    <IndustrialStation label="Parts Workshop" texture={parts} accent="#60d9ff" position={FILE_FOLDER_STATION_POSITIONS.parts_workshop} onEnter={()=>onStudioEnter?.('parts_workshop')}/>
    <IndustrialStation label="Boost Bay" texture={boost} accent="#e9c8ff" position={FILE_FOLDER_STATION_POSITIONS.boost_bay} onEnter={()=>onStudioEnter?.('boost_bay')}/>
  </group>
}

'use client'

import { Text } from '@react-three/drei'
import { institutionalArchetype,INSTITUTIONAL_VISUAL_THEME } from '@/lib/file-folder-institutional-visual'

type PhysicalPart={id?:string;itemKey?:string;name?:string;effectType?:string;effectValue?:number}
type Props={
  systemType:string
  progress:number
  parts?:PhysicalPart[]
  compact?:boolean
}
/**
 * Modular, phone-budget 3D construction. Every structure arises from a real
 * Client-owned build or commissioned system; every visible module corresponds
 * to an actual attached part. It is NOT a real hospital/civic deployment.
 */
export function InstitutionalArchitecture({systemType,progress,parts=[],compact=false}:Props){
  const archetype=institutionalArchetype(systemType)
  if(!archetype)return null
  const theme=INSTITUTIONAL_VISUAL_THEME[archetype]
  const stage=Math.max(0,Math.min(100,progress))
  const built=stage>=96
  const height=.18+(stage/100)*(compact?1.55:1.95)
  const facade=stage>=35
  const roof=stage>=78
  const wings=stage>=60
  const installed=parts.filter(part=>part.effectType!=='speed_boost').slice(0,10)
  return <group>
    <mesh receiveShadow position={[0,.11,0]}>
      <boxGeometry args={[1.28,.15,1.08]}/>
      <meshStandardMaterial color="#26323a" roughness={.9}/>
    </mesh>
    <mesh position={[0,.2,0]}>
      <boxGeometry args={[1.13,.1,.96]}/>
      <meshStandardMaterial color={theme.base} metalness={.17} roughness={.7}/>
    </mesh>
    {stage>=12&&[-.43,.43].flatMap(x=>[-.34,.34].map(z=><mesh key={x+':'+z} position={[x,.2+height*.45,z]} castShadow>
      <boxGeometry args={[.07,Math.max(.2,height*.86),.07]}/>
      <meshStandardMaterial color="#9ca6b2" metalness={.43} roughness={.5}/>
    </mesh>))}
    {facade&&<mesh position={[0,.16+height*.48,0]} castShadow>
      <boxGeometry args={[.91,Math.max(.2,height*.86),.75]}/>
      <meshStandardMaterial color={theme.base} roughness={.49} metalness={.24}/>
    </mesh>}
    {facade&&[-.25,0,.25].map(x=><mesh key={x} position={[x,.28+height*.42,.39]}>
      <boxGeometry args={[.14,.28,.026]}/>
      <meshStandardMaterial color="#052735" emissive={theme.glow} emissiveIntensity={built?.5:.18} metalness={.45} roughness={.25}/>
    </mesh>)}
    {roof&&<mesh position={[0,height+.22,0]}>
      <boxGeometry args={[1.08,.12,.92]}/>
      <meshStandardMaterial color="#8793a1" metalness={.32} roughness={.53}/>
    </mesh>}
    {wings&&<group>
      {[-.67,.67].map(x=><mesh key={x} position={[x,height*.37,0]} castShadow>
        <boxGeometry args={[.38,Math.max(.32,height*.53),.69]}/>
        <meshStandardMaterial color={theme.base} roughness={.59} metalness={.2}/>
      </mesh>)}
    </group>}
    {archetype==='health'&&roof&&<group position={[0,height+.32,0]}>
      <mesh><boxGeometry args={[.5,.08,.16]}/><meshStandardMaterial color={theme.glow} emissive={theme.glow} emissiveIntensity={.38}/></mesh>
      <mesh><boxGeometry args={[.16,.08,.5]}/><meshStandardMaterial color={theme.glow} emissive={theme.glow} emissiveIntensity={.38}/></mesh>
      {wings&&<mesh position={[0,.31,-.23]}><cylinderGeometry args={[.13,.17,.4,8]}/><meshStandardMaterial color="#c4dde1" roughness={.44}/></mesh>}
    </group>}
    {archetype==='civic'&&wings&&<group>
      {[-.3,0,.3].map(x=><mesh key={x} position={[x,.2+height*.38,.48]}>
        <cylinderGeometry args={[.065,.08,height*.65,7]}/>
        <meshStandardMaterial color="#c1cad5" roughness={.53}/>
      </mesh>)}
      {roof&&<mesh position={[0,height+.43,0]}><coneGeometry args={[.42,.45,8]}/><meshStandardMaterial color={theme.glow} metalness={.4}/></mesh>}
    </group>}
    {archetype==='market'&&wings&&[-.52,.52].map(x=><group key={x} position={[x,.24,.54]}>
      <mesh position={[0,.12,0]}><boxGeometry args={[.32,.23,.26]}/><meshStandardMaterial color="#b18454"/></mesh>
      <mesh position={[0,.3,0]}><boxGeometry args={[.42,.08,.33]}/><meshStandardMaterial color="#e9bf77"/></mesh>
    </group>)}
    {archetype==='agriculture'&&wings&&[-.7,.7].map(x=><group key={x} position={[x,0,-.18]}>
      <mesh position={[0,.48,0]}><cylinderGeometry args={[.2,.25,.72,10]}/><meshStandardMaterial color="#7ea58d" roughness={.55}/></mesh>
      <mesh position={[0,.89,0]}><coneGeometry args={[.24,.23,8]}/><meshStandardMaterial color="#dceabb"/></mesh>
    </group>)}
    {archetype==='transport'&&wings&&<group position={[0,.13,.72]}>
      <mesh rotation={[-.13,0,0]}><boxGeometry args={[1.5,.09,.48]}/><meshStandardMaterial color="#44505d" roughness={.9}/></mesh>
      {[-.44,0,.44].map(x=><mesh key={x} position={[x,.05,.08]}><boxGeometry args={[.09,.015,.26]}/><meshBasicMaterial color="#f2db98"/></mesh>)}
    </group>}
    {archetype==='education'&&roof&&<group position={[0,height+.33,.13]}>
      <mesh><coneGeometry args={[.25,.31,4]}/><meshStandardMaterial color="#ddc2fa"/></mesh>
      <mesh position={[0,.25,0]}><boxGeometry args={[.055,.15,.06]}/><meshStandardMaterial color="#ffffff"/></mesh>
    </group>}
    {archetype==='utility'&&wings&&<group>
      {[-.72,.72].map(x=><mesh key={x} position={[x,.48,-.15]}>
        <cylinderGeometry args={[.2,.24,.82,10]}/><meshStandardMaterial color="#b0c5d0" metalness={.54} roughness={.32}/>
      </mesh>)}
      <mesh position={[0,height+.38,0]}><torusGeometry args={[.25,.05,7,16]}/><meshStandardMaterial color="#7ce6da" emissive="#68dfd8" emissiveIntensity={.25}/></mesh>
    </group>}
    {archetype==='emergency'&&roof&&<group>
      <mesh position={[0,height+.42,0]}><cylinderGeometry args={[.11,.13,.4,8]}/><meshStandardMaterial color="#e8b06f"/></mesh>
      <mesh position={[0,height+.68,0]}><sphereGeometry args={[.14,10,8]}/><meshStandardMaterial color="#fbba81" emissive="#fb923c" emissiveIntensity={.35}/></mesh>
    </group>}
    {archetype==='identity'&&roof&&<group position={[0,height+.4,0]}>
      <mesh><octahedronGeometry args={[.29,0]}/><meshStandardMaterial color="#9dbcfb" emissive="#91baff" emissiveIntensity={.28} metalness={.44}/></mesh>
      <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[.41,.035,7,16]}/><meshStandardMaterial color="#c0d5ff"/></mesh>
    </group>}
    <Text position={[0,Math.max(.42,height+.79),.2]} fontSize={.11} color={theme.glow} maxWidth={2.3} anchorX="center">
      {theme.label} · {Math.round(stage)}%
    </Text>
    {installed.map((part,index)=>{
      const x=-.72+(index%5)*.36
      const z=index<5?.83:-.88
      const color=['#60d8d4','#bfb9ff','#efc37a','#a5e8a0'][index%4]
      return <group key={part.id||part.itemKey||index} position={[x,.22,z]}>
        <mesh><boxGeometry args={[.24,.29,.18]}/><meshStandardMaterial color="#192c36" emissive={color} emissiveIntensity={.2} metalness={.4}/></mesh>
        <mesh position={[0,.18,0]}><octahedronGeometry args={[.11,0]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.32}/></mesh>
      </group>
    })}
  </group>
}

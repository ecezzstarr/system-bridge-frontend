'use client'

import { Text } from '@react-three/drei'
import { useFileFolderMaterialTextures } from './file-folder-material-textures'

/** Static architectural scenery, kept separate from financial/project data.
 *  Every structural mesh uses real tileable material textures for phone-sized
 *  parallax and material response rather than scene wallpaper.
 */
function ElevatedBridge({x,z,width=5.5}:{x:number;z:number;width?:number}){
  const tex=useFileFolderMaterialTextures()
  return <group position={[x,0,z]}>
    <mesh receiveShadow castShadow position={[0,1.6,0]}>
      <boxGeometry args={[width,.18,.74]}/>
      <meshStandardMaterial map={tex.concrete} color="#c1c4ba" roughness={.81}/>
    </mesh>
    {[-.35,.35].map(zside=><group key={zside}>
      <mesh position={[0,1.95,zside]}><boxGeometry args={[width,.07,.045]}/><meshStandardMaterial map={tex.steel} color="#d5d9d3" metalness={.66} roughness={.32}/></mesh>
      {Array.from({length:7},(_,i)=><mesh key={i} position={[-width/2+i*width/6,1.78,zside]}>
        <boxGeometry args={[.055,.38,.055]}/><meshStandardMaterial color="#96aab1" metalness={.48} roughness={.34}/>
      </mesh>)}
    </group>)}
    {[-width*.42,width*.42].map(xpos=><mesh key={xpos} castShadow position={[xpos,.82,0]}>
      <cylinderGeometry args={[.14,.18,1.55,8]}/>
      <meshStandardMaterial map={tex.steel} color="#b3bdc4" metalness={.48} roughness={.44}/>
    </mesh>)}
  </group>
}

function CityTower({index,x,z}:{index:number;x:number;z:number}){
  const tex=useFileFolderMaterialTextures()
  const h=1.7+(index%6)*.54
  const w=.65+(index%3)*.2
  return <group position={[x,0,z]}>
    <mesh castShadow position={[0,h/2-.1,0]}>
      <boxGeometry args={[w,h,w*.8]}/>
      <meshStandardMaterial map={tex.glass} color={index%2?'#a3d5e1':'#d2dce8'} roughness={.21} metalness={.48}/>
    </mesh>
    <mesh position={[0,h-.03,0]}><boxGeometry args={[w*1.07,.09,w*.84]}/><meshStandardMaterial map={tex.steel} color="#b0b8c8" metalness={.66}/></mesh>
    {index%3===0&&<mesh position={[0,h+.3,0]}><cylinderGeometry args={[.025,.04,.58,6]}/><meshStandardMaterial color="#d9b77f" emissive="#eac38d" emissiveIntensity={.22}/></mesh>}
  </group>
}

function ConstructionVehicle({x,z,index}:{x:number;z:number;index:number}){
  const tex=useFileFolderMaterialTextures()
  const primary=index%2?'#ecb24c':'#42b9d2'
  return <group position={[x,.06,z]} rotation={[0,(index%4)*Math.PI/2,0]}>
    <mesh castShadow position={[0,.18,0]}><boxGeometry args={[.58,.28,.31]}/><meshStandardMaterial color={primary} metalness={.27} roughness={.46}/></mesh>
    <mesh position={[-.1,.38,0]}><boxGeometry args={[.28,.22,.28]}/><meshStandardMaterial map={tex.glass} color="#b8ebef" metalness={.53} roughness={.21}/></mesh>
    {[-.18,.18].flatMap(xoff=>[-.2,.2].map(zoff=><mesh key={xoff+':'+zoff} position={[xoff,.13,zoff]}>
      <cylinderGeometry args={[.078,.078,.065,10]}/><meshStandardMaterial color="#171f24" roughness={.91}/>
    </mesh>))}
  </group>
}

export function FileFolderWorldDetails(){
  return <group>
    {/* Distant skyline is physically behind the Client's buildings. */}
    {Array.from({length:10},(_,i)=>{
      const x=-9.5+i*2.05
      const z=-9.3-(i%3)*1.1
      return <CityTower key={i} x={x} z={z} index={i}/>
    })}
    <ElevatedBridge x={0} z={-7.8} width={12.7}/>
    <ElevatedBridge x={-6.9} z={3.2} width={3.5}/>
    <ElevatedBridge x={6.8} z={3.6} width={3.7}/>
    {Array.from({length:5},(_,i)=><ConstructionVehicle key={i} x={-5.8+i*1.6} z={6.2-(i%2)*.3} index={i}/>)}
    <Text position={[0,.06,7.25]} rotation={[-Math.PI/2,0,0]} fontSize={.33} color="#d3c4a1" anchorX="center">WEAVE · BUILD VISIBLE SYSTEMS</Text>
  </group>
}

'use client'

import {Text} from '@react-three/drei'
import {CityMaterial} from './file-folder-city-material'

/**
 * The approved Plus sales reference depicts a white-and-gold open File Folder,
 * terraces, a central radiant city axis, real greenery and flowing river.
 *
 * This model brings that FORM into the existing interactive world as host
 * architecture; it does not create fake workspaces, grant completion to
 * unbuilt systems, or render the approved artwork as a flat wallpaper.
 */
export function FileFolderPlusLandmark({reducedDetail=false}:{reducedDetail?:boolean}){
 const terraceCount=reducedDetail?2:4
 return <group position={[0,0,-24]} data-plus-real-world-landmark="sculpted-folder-and-radiance">
  <mesh receiveShadow position={[0,-.1,0]}>
   <cylinderGeometry args={[5.6,5.8,.22,36]}/>
   <CityMaterial kind="paving" tileX={8} tileY={8} tint="#f6f6f0"/>
  </mesh>
  {Array.from({length:terraceCount},(_,i)=>(
   <group key={i} position={[0,i*.18,0]}>
    <mesh receiveShadow castShadow>
     <cylinderGeometry args={[5.15-i*.72,5.22-i*.72,.16,32]}/>
     <meshPhysicalMaterial color={i%2?'#e3eaed':'#faf7ec'} metalness={.31} roughness={.23} clearcoat={.74}/>
    </mesh>
    <mesh position={[0,.084,0]}>
     <torusGeometry args={[5.15-i*.72,.036,6,64]}/>
     <meshStandardMaterial color="#c59b58" metalness={.85} roughness={.19}/>
    </mesh>
   </group>
  ))}
  {/* Gold-trimmed white folder panels open toward the Client. */}
  {[-1,1].map(side=><group key={side} position={[side*2.68,1.8,1.3]} rotation={[.04,side*.38,-side*.14]}>
    <mesh castShadow receiveShadow>
     <boxGeometry args={[4.05,3.7,.18]}/>
     <meshPhysicalMaterial color="#f4f3e9" metalness={.19} roughness={.23} clearcoat={.8}/>
    </mesh>
    {[-1,1].map(edge=><mesh key={edge} position={[edge*2.02,0,.12]}>
     <boxGeometry args={[.065,3.73,.08]}/>
     <meshStandardMaterial color="#d7ad6c" metalness={.85} roughness={.2}/>
    </mesh>)}
    <mesh position={[0,1.82,.11]}>
     <boxGeometry args={[4.05,.06,.09]}/>
     <meshStandardMaterial color="#e1b971" metalness={.76} roughness={.24}/>
    </mesh>
    <mesh position={[0,-1.55,.12]}>
     <boxGeometry args={[3.74,.06,.1]}/>
     <meshStandardMaterial color="#e1b971" metalness={.76} roughness={.24}/>
    </mesh>
    <Text position={[0,.16,.126]} fontSize={.4} color="#9b7847" anchorX="center" maxWidth={3.2}>
      {side===-1?'WEAVE':'PLUS'}
    </Text>
    <Text position={[0,-.45,.126]} fontSize={.13} color="#74614d" anchorX="center">
      {side===-1?'BRIDGE OF RADIANCE':'FILE FOLDER'}
    </Text>
   </group>)}
  {/* A central spire of physically luminous geometry, distinct from any
      purchased enterprise system or Client-built tower. */}
  <mesh castShadow position={[0,2.0,-1.75]}>
   <cylinderGeometry args={[.42,.77,3.9,12]}/>
   <meshPhysicalMaterial color="#f4f6ef" metalness={.25} roughness={.18} clearcoat={.8}/>
  </mesh>
  <mesh castShadow position={[0,4.4,-1.75]}>
   <coneGeometry args={[.72,2.4,12]}/>
   <meshPhysicalMaterial color="#fff7df" metalness={.43} roughness={.13} clearcoat={.96}
    emissive="#ffe2a3" emissiveIntensity={.26}/>
  </mesh>
  <mesh position={[0,5.94,-1.75]}>
   <octahedronGeometry args={[.27,1]}/>
   <meshStandardMaterial color="#ffffff" emissive="#f8e9b5" emissiveIntensity={1.6} toneMapped={false}/>
  </mesh>
  {!reducedDetail&&<pointLight position={[0,5,-1.7]} intensity={4.3} distance={8} color="#ffead0"/>}
  {/* Planted terraces preserve the approved image's living greenery, without
      humanoids or claiming a purchased farm/food business. */}
  {!reducedDetail&&[-1,1].flatMap(side=>[0,1,2].map(i=><group key={side+':'+i}
   position={[side*(2.7+i*.75),.3+i*.13,-2.1+i*1.5]}>
    <mesh castShadow position={[0,.2,0]}>
     <cylinderGeometry args={[.2,.25,.36,8]}/>
     <meshStandardMaterial color="#e1d6b8" roughness={.75}/>
    </mesh>
    <mesh castShadow position={[0,.49,0]}>
     <dodecahedronGeometry args={[.36,1]}/>
     <meshStandardMaterial color={i%2?'#2e7559':'#51956e'} roughness={.91}/>
    </mesh>
   </group>))}
 </group>
}

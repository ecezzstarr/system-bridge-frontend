'use client'

import { Text } from '@react-three/drei'
import { useFileFolderMaterialTextures } from './file-folder-material-textures'

/**
 * Physically walkable world landmark — not a composited image or fake
 * building. React Three Fiber renders steel ribs, curtain-wall glass,
 * illuminated floor decks and the WEAVE emblem in true world coordinates.
 */
export function FileFolderCentralSpire({active=false}:{active?:boolean}){
  const tex=useFileFolderMaterialTextures()
  const gold='#ffd58d'
  return <group position={[0,0,0]}>
    <mesh castShadow receiveShadow position={[0,.13,0]}>
      <boxGeometry args={[2.75,.25,2.36]}/>
      <meshStandardMaterial map={tex.concrete} color="#e0d5c8" roughness={.75}/>
    </mesh>
    <mesh castShadow receiveShadow position={[0,2.8,-.18]}>
      <boxGeometry args={[1.58,5.25,1.5]}/>
      <meshStandardMaterial map={tex.glass} color="#92c3da" roughness={.16} metalness={.62}/>
    </mesh>
    <mesh castShadow position={[0,4.0,-.17]}>
      <boxGeometry args={[1.73,2.3,1.62]}/>
      <meshStandardMaterial map={tex.glass} color="#b9d9ec" metalness={.7} roughness={.18}/>
    </mesh>
    <mesh castShadow position={[0,5.85,-.17]}>
      <boxGeometry args={[1.18,1.2,1.23]}/>
      <meshStandardMaterial map={tex.steel} color="#b3bec6" metalness={.66} roughness={.24}/>
    </mesh>
    <mesh position={[0,6.58,-.17]}>
      <cylinderGeometry args={[.19,.3,.48,8]}/>
      <meshStandardMaterial color="#ddc38f" emissive="#f8d18c" emissiveIntensity={.15} metalness={.72}/>
    </mesh>
    <mesh position={[0,7.22,-.17]}>
      <cylinderGeometry args={[.045,.08,.9,8]}/>
      <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={.5}/>
    </mesh>
    {[-.86,.86].flatMap(x=>[-.94,.59].map(z=><mesh key={x+':'+z} castShadow position={[x,3.1,z]}>
      <boxGeometry args={[.09,6.1,.09]}/>
      <meshStandardMaterial map={tex.steel} color="#e2dfd5" metalness={.8} roughness={.23}/>
    </mesh>))}
    {Array.from({length:10},(_,i)=><group key={i} position={[0,.42+i*.52,-.18]}>
      <mesh>
        <boxGeometry args={[1.88,.085,1.8]}/>
        <meshStandardMaterial map={tex.steel} color="#c4ad8a" metalness={.61} roughness={.38}/>
      </mesh>
      <mesh position={[0,.07,.93]}>
        <boxGeometry args={[1.8,.032,.055]}/>
        <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={active?.56:.26}/>
      </mesh>
    </group>)}
    <mesh position={[0,3.46,.65]}>
      <planeGeometry args={[1.31,2.24]}/>
      <meshStandardMaterial color="#081725" emissive="#1a445a" emissiveIntensity={.26} metalness={.42} roughness={.32}/>
    </mesh>
    <Text position={[0,4.17,.688]} fontSize={.75} color={gold} anchorX="center" fontWeight={700}>W</Text>
    <Text position={[0,3.54,.697]} fontSize={.25} color="#fff2d7" anchorX="center" letterSpacing={.075}>WEAVE</Text>
    <Text position={[0,3.08,.697]} fontSize={.13} color="#f3f8f9" anchorX="center">YOUR BUSINESS</Text>
    <Text position={[0,2.88,.697]} fontSize={.13} color="#f3f8f9" anchorX="center">BUILDS HERE</Text>
    <mesh position={[0,1.02,1.04]}>
      <boxGeometry args={[.73,1.75,.09]}/>
      <meshStandardMaterial map={tex.windows} emissive="#59cedd" emissiveIntensity={.12} color="#d8faff" metalness={.45} roughness={.24}/>
    </mesh>
    <mesh position={[0,.08,1.22]}>
      <boxGeometry args={[1.68,.065,.2]}/>
      <meshStandardMaterial color="#d9aa6c" emissive={gold} emissiveIntensity={.35}/>
    </mesh>
    {[-1.08,1.08].map(x=><group key={x} position={[x,.1,1.05]}>
      <mesh position={[0,.43,0]}><cylinderGeometry args={[.065,.075,.86,8]}/><meshStandardMaterial map={tex.steel} metalness={.7} roughness={.28}/></mesh>
      <mesh position={[0,.91,0]}><sphereGeometry args={[.14,10,8]}/><meshStandardMaterial color="#ffe6a5" emissive={gold} emissiveIntensity={.55}/></mesh>
    </group>)}
  </group>
}

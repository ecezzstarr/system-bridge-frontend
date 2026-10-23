'use client'

import { FILE_FOLDER_CITY_BLOCKS, FILE_FOLDER_STREET_COLUMNS, FILE_FOLDER_STREET_ROWS } from '@/lib/file-folder-world-runtime'
import { CityMaterial } from './file-folder-city-material'

/** Walkable host streets surrounding the Client's real operating ground. */
export function FileFolderCityStreets(){
  return <group>
    {FILE_FOLDER_STREET_COLUMNS.map(x=><group key={x} position={[x,-.12,0]}>
      <mesh receiveShadow><boxGeometry args={[3.8,.12,53]}/><CityMaterial kind="paving" tileX={3} tileY={18} tint="#54616e"/></mesh>
      {[-1,1].map(side=><mesh key={side} position={[side*2.25,.08,0]} receiveShadow><boxGeometry args={[.6,.18,53]}/><CityMaterial kind="paving" tileX={1} tileY={18}/></mesh>)}
      {Array.from({length:18},(_,i)=><mesh key={i} position={[0,.065,-25+i*2.9]}><boxGeometry args={[.08,.012,1.25]}/><meshStandardMaterial color="#e7d59c" roughness={.8}/></mesh>)}
    </group>)}
    {FILE_FOLDER_STREET_ROWS.map(z=><group key={z} position={[0,-.115,z]}>
      <mesh receiveShadow><boxGeometry args={[48,.12,3.4]}/><CityMaterial kind="paving" tileX={16} tileY={3} tint="#54616e"/></mesh>
      {[-1,1].map(side=><mesh key={side} position={[0,.08,side*1.95]} receiveShadow><boxGeometry args={[48,.18,.5]}/><CityMaterial kind="paving" tileX={16} tileY={1}/></mesh>)}
      {Array.from({length:14},(_,i)=><mesh key={i} position={[-22+i*3.4,.065,0]}><boxGeometry args={[1.2,.012,.08]}/><meshStandardMaterial color="#e7d59c" roughness={.8}/></mesh>)}
    </group>)}
    {FILE_FOLDER_CITY_BLOCKS.map((b,index)=><group key={index} position={[b.x,0,b.z]}>
      <mesh position={[0,.01,0]} receiveShadow><boxGeometry args={[b.width+1.1,.18,b.depth+1.1]}/><CityMaterial kind="paving" tileX={Math.max(1,Math.round(b.width/2))} tileY={Math.max(1,Math.round(b.depth/2))}/></mesh>
      <mesh position={[0,b.height/2,0]} castShadow receiveShadow><boxGeometry args={[b.width,b.height,b.depth]}/><CityMaterial kind="glass" tileX={Math.max(1,Math.round(b.width/2))} tileY={Math.max(1,Math.round(b.height/2))} glow={.12}/></mesh>
      <mesh position={[0,b.height+.12,0]} castShadow><boxGeometry args={[b.width+.25,.24,b.depth+.25]}/><CityMaterial kind="metal"/></mesh>
      {Array.from({length:Math.floor(b.height)},(_,floor)=><mesh key={floor} position={[0,.7+floor,0]}><boxGeometry args={[b.width+.06,.045,b.depth+.06]}/><meshStandardMaterial color="#b5ada0" metalness={.6} roughness={.4}/></mesh>)}
      {[-1,1].map(side=><group key={side} position={[side*(b.width/2+.3),0,b.depth/2+.35]}>
        <mesh position={[0,1.25,0]}><cylinderGeometry args={[.045,.06,2.5,6]}/><meshStandardMaterial color="#52616c" metalness={.7}/></mesh>
        <mesh position={[0,2.5,0]}><boxGeometry args={[.38,.07,.22]}/><meshStandardMaterial color="#fff0b5" emissive="#ffcf75" emissiveIntensity={1.8}/></mesh>
      </group>)}
    </group>)}
    {/* Crossings are physical ground markings, not teleport controls. */}
    {[-11,11].flatMap(x=>[-12,12].map(z=><group key={x+':'+z} position={[x,-.04,z]}>
      {Array.from({length:6},(_,i)=><mesh key={i} position={[-1.35+i*.54,0,0]}><boxGeometry args={[.28,.018,2.6]}/><meshStandardMaterial color="#e4dfc9" roughness={.85}/></mesh>)}
    </group>))}
  </group>
}

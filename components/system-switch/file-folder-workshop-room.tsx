'use client'
import {useEffect} from 'react'
import {useThree} from '@react-three/fiber'
import {PMREMGenerator} from 'three'
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js'
import {EnterpriseMaterial, EnterpriseWaterMaterial, type EnterpriseTier} from './file-folder-enterprise-surfaces'
import {EnterpriseWorkshopInterior} from './file-folder-enterprise-interior'
import {FILE_FOLDER_WORKSHOP_WALLS as walls} from '@/lib/file-folder-workshop-layout'

export function FileFolderWorkshopRoom({tier,buildCount=0,liveCount=0,progress=0,onOperate}:{
 tier:EnterpriseTier
 buildCount?:number
 liveCount?:number
 progress?:number
 onOperate?:()=>void
}){
 const {gl,scene}=useThree()
 useEffect(()=>{
  // Bake broad window reflections once for the glass, brushed metal and water.
  const studio=new RoomEnvironment()
  const generator=new PMREMGenerator(gl)
  const reflections=generator.fromScene(studio,0,.1,100,{size:64})
  studio.dispose()
  generator.dispose()
  const previousEnvironment=scene.environment
  const previousIntensity=scene.environmentIntensity
  scene.environment=reflections.texture
  scene.environmentIntensity=.55
  return ()=>{
   scene.environment=previousEnvironment
   scene.environmentIntensity=previousIntensity
   reflections.dispose()
  }
 },[gl,scene])
 return <>
    <color attach="background" args={['#bbced9']}/><hemisphereLight args={['#fff7e9','#84919b',1.5]}/><directionalLight position={[2,5,3]} intensity={2} castShadow/>
    <fog attach="fog" args={['#bbced9',20,60]}/>
    <mesh position={[0,-.56,-6]} rotation={[-Math.PI/2,0,0]}>
     <circleGeometry args={[60,48]}/><EnterpriseWaterMaterial tier={tier}/>
    </mesh>
    <mesh position={[0,-.33,-3.4]} receiveShadow>
     <boxGeometry args={[9.4,.4,16.8]}/><EnterpriseMaterial tier={tier} surface="stone" tile={5}/>
    </mesh>
    {[-1,1].map(side=><group key={side} position={[side*4,0,0]}>
     <mesh position={[0,3.14,0]} castShadow>
      <boxGeometry args={[.26,.17,10.1]}/><EnterpriseMaterial tier={tier} surface="metal"/>
     </mesh>
     <mesh position={[-side*.12,3.04,0]}>
      <boxGeometry args={[.045,.04,9.8]}/><meshBasicMaterial color="#fff0cb"/>
     </mesh>
     {[-4.92,-2.5,0,2.5,4.92].map(z=><mesh key={z} position={[0,1.55,z]} castShadow>
      <boxGeometry args={[.16,3.1,.12]}/><EnterpriseMaterial tier={tier} surface="metal"/>
     </mesh>)}
    </group>)}
    <mesh position={[0,-.15,0]} receiveShadow><boxGeometry args={[8,.2,10]}/><EnterpriseMaterial tier={tier} surface="floor" tile={4}/></mesh>
    {/* A glazed partition keeps the operating aisle separate from the machinery. */}
    {walls.slice(0,3).map((wall,index)=><group key={index}>
     <mesh position={[wall.x,.43,wall.z]} receiveShadow>
      <boxGeometry args={[(wall.halfWidth||.1)*2,.96,(wall.halfDepth||.1)*2]}/>
      <EnterpriseMaterial tier={tier} surface="stone"/>
     </mesh>
     <mesh position={[wall.x,2,wall.z]}>
      <boxGeometry args={[(wall.halfWidth||.1)*2,2.2,(wall.halfDepth||.1)*2]}/>
      <EnterpriseMaterial tier={tier} surface="glass"/>
     </mesh>
    </group>)}
    {[-3.9,-1.95,0,1.95,3.9].map(x=><mesh key={x} position={[x,1.99,-5]}>
     <boxGeometry args={[.065,2.25,.33]}/><EnterpriseMaterial tier={tier} surface="metal"/>
    </mesh>)}
    <group position={[0,-.12,-7.6]}>
     <EnterpriseWorkshopInterior tier={tier} buildCount={buildCount} liveCount={liveCount} progress={progress}/>
    </group>
    <group position={[0,0,-2]} onClick={onOperate ? event=>{event.stopPropagation();onOperate()} : undefined}>
     <mesh position={[0,.9,0]} castShadow><boxGeometry args={[2.8,.18,1.1]}/><EnterpriseMaterial tier={tier} surface="stone"/></mesh>
     {[-1,1].map(x=><mesh key={x} position={[x,.4,0]}><boxGeometry args={[.12,.8,.8]}/><EnterpriseMaterial tier={tier} surface="metal"/></mesh>)}
     <mesh position={[0,1.1,-.18]}><boxGeometry args={[.14,.32,.13]}/><EnterpriseMaterial tier={tier} surface="metal"/></mesh>
     <group position={[0,1.44,-.2]} rotation={[-.15,0,0]}>
      <mesh castShadow><boxGeometry args={[1.2,.56,.075]}/><EnterpriseMaterial tier={tier} surface="metal"/></mesh>
      <mesh position={[0,0,.04]}><planeGeometry args={[1.13,.49]}/><meshStandardMaterial color="#163342" roughness={.24}/></mesh>
      {buildCount>0&&<mesh position={[-.5+progress/200,-.14,.045]}><planeGeometry args={[Math.max(.01,progress/100),.055]}/><meshBasicMaterial color="#80e6dc"/></mesh>}
     </group>
    </group>
 </>
}

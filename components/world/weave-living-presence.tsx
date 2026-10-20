'use client'

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAdaptiveRuntime } from '@/components/world/use-adaptive-runtime'

/**
 * A WEAVE participant is visible as a living elemental current, never a humanoid.
 * Shared geometry works in Flame Event, System Switch, public Customer Doors,
 * private File Folder and multiplayer rooms.
 *
 * This is a visual body only. Identity, movement authorization and proximity
 * continue to belong to the existing world controllers and server presence.
 */
export type PresenceElement = 'water' | 'fire' | 'confluence'

const VERTEX_SHADER = [
  'uniform float uTime;',
  'uniform float uDrive;',
  'uniform float uElement;',
  'varying vec3 vFlow;',
  'varying vec3 vNormal;',
  'void main() {',
  '  vec3 p = position;',
  '  float h = (p.y + 1.0) * 0.5;',
  '  float crest = smoothstep(0.12, 1.0, h);',
  '  float taper = mix(0.89, 0.18, crest);',
  '  p.xz *= taper;',
  '  float twist = 2.8*h + uTime*(0.52+uDrive*0.16) + sin(h*8.0+uTime*0.9)*0.19;',
  '  float cs = cos(twist), sn = sin(twist);',
  '  p.xz = mat2(cs,-sn,sn,cs)*p.xz;',
  '  p.x += (0.13+0.05*uDrive)*sin(h*9.0+uTime*1.25);',
  '  p.z += 0.12*cos(h*7.0-uTime*1.0);',
  '  p.y += 0.055*sin(h*13.0-uTime*1.4);',
  '  vFlow = vec3(p.x,h,p.z);',
  '  vNormal = normalize(normalMatrix*normal);',
  '  gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);',
  '}',
].join('\n')

const FRAGMENT_SHADER = [
  'precision mediump float;',
  'uniform float uTime;',
  'uniform float uElement;',
  'uniform float uOpacity;',
  'uniform float uDrive;',
  'varying vec3 vFlow;',
  'varying vec3 vNormal;',
  'void main() {',
  '  float current = sin(vFlow.y*19.0 + atan(vFlow.x,vFlow.z)*3.0 - uTime*2.5);',
  '  float veins = 0.5 + 0.5*current;',
  '  vec3 water = mix(vec3(0.025,0.35,0.70),vec3(0.64,0.99,1.0),veins);',
  '  vec3 fire = mix(vec3(0.88,0.15,0.025),vec3(1.0,0.83,0.30),veins);',
  '  float mingle = smoothstep(-0.45,0.65,sin(vFlow.y*9.0 + atan(vFlow.x,vFlow.z)*2.0 + uTime*0.58));',
  '  float heat = uElement < 0.5 ? 0.0 : (uElement < 1.5 ? 1.0 : mingle);',
  '  vec3 color = mix(water,fire,heat);',
  '  float edge = 0.65 + 0.35*pow(1.0-abs(dot(normalize(vNormal),vec3(0.0,0.0,1.0))),2.0);',
  '  float opacity = uOpacity*(0.56 + veins*0.28 + uDrive*0.07);',
  '  gl_FragColor = vec4(color*(0.82+edge*0.46),opacity);',
  '}',
].join('\n')

function makeMaterial(opacity:number, element:PresenceElement) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: {value:0},
      uDrive: {value:0},
      uElement: {value:element==='water'?0:element==='fire'?1:2},
      uOpacity: {value:opacity},
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
  return material
}

export function LivingPresenceForm({
  element='confluence', compact=false, motion, speed=0,
}:{
  element?:PresenceElement
  compact?:boolean
  motion?:MutableRefObject<{speed:number}>
  speed?:number
}){
  const {reducedMotion,level}=useAdaptiveRuntime()
  const root=useRef<THREE.Group>(null)
  const waterRing=useRef<THREE.Group>(null)
  const fireRing=useRef<THREE.Group>(null)
  const time=useRef(0)
  const materials=useMemo(()=>[
    makeMaterial(compact ? .78 : .88,element),
    makeMaterial(compact ? .56 : .63,element),
  ],[compact,element])
  useEffect(()=>()=>materials.forEach(material=>material.dispose()),[materials])

  const water=element!=='fire',fire=element!=='water'
  const detail=!compact&&level>0
  useFrame((_,delta)=>{
    const dt=Math.min(delta,.05)
    const drive=Math.min(1.3,Math.max(0,(motion?.current.speed??speed)/5))
    if(!reducedMotion)time.current+=dt
    for(const material of materials){
      material.uniforms.uTime.value=time.current
      material.uniforms.uDrive.value=drive
    }
    if(root.current){
      const t=time.current
      root.current.rotation.y=t*.13
      root.current.scale.set(1+drive*.08,1+drive*.16,1+drive*.08)
      root.current.position.y=reducedMotion?0:Math.sin(t*1.8)*.035
    }
    if(waterRing.current){
      waterRing.current.rotation.y=time.current*.55
      waterRing.current.rotation.z=Math.sin(time.current*.83)*.13
    }
    if(fireRing.current){
      fireRing.current.rotation.y=-time.current*.75
      fireRing.current.rotation.x=Math.sin(time.current*.91)*.15
    }
  })

  return <group userData={{weaveLivingPresence:element,presenceDetail:compact?'compact':'local'}}>
    <group ref={root}>
      <mesh position={[0,1.04,0]} scale={[.78,1.06,.78]} material={materials[0]} >
        <sphereGeometry args={[1,20,14]}/>
      </mesh>
      <mesh position={[0,1.04,0]} scale={[.45,.93,.45]} material={materials[1]} frustumCulled={false}>
        <sphereGeometry args={[1,16,12]}/>
      </mesh>
      {detail&&<>
        {water&&<group ref={waterRing} position={[0,.78,0]} rotation={[.55,0,.2]}>
          <mesh><torusGeometry args={[.57,.022,5,32]}/>
            <meshBasicMaterial color="#76efff" transparent opacity={.64} depthWrite={false}/>
          </mesh>
        </group>}
        {fire&&<group ref={fireRing} position={[0,1.25,0]} rotation={[-.35,0,-.35]}>
          <mesh><torusGeometry args={[.38,.029,5,32]}/>
            <meshBasicMaterial color="#ff9f4e" transparent opacity={.75} depthWrite={false}/>
          </mesh>
        </group>}
        <mesh position={[0,.07,0]} rotation={[-Math.PI/2,0,0]}>
          <ringGeometry args={[.30,.69,32]}/>
          <meshBasicMaterial color={element==='water'?'#4bdcf8':element==='fire'?'#ff9743':'#a9d8d3'} transparent opacity={.37} depthWrite={false} side={THREE.DoubleSide}/>
        </mesh>
      </>}
    </group>
  </group>
}

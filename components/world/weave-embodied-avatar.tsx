'use client'

import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * The same physical body is used in the Burning River and the Client File
 * Folder. Its motion comes from the actual local character controller, never
 * from invented participants or a decorative floating marker.
 */
export type WeaveAvatarMotion = {
  x:number
  z:number
  yaw:number
  speed:number
  crouching:boolean
  airborne:number
}
export type WeaveAvatarPosition = 'visitor'|'client'|'agent'|'bridger'|'admin'
const THREAD_COLORS:Record<WeaveAvatarPosition,string>={
  visitor:'#84b7b8',client:'#9981c9',agent:'#3e8bab',bridger:'#dbad5c',admin:'#e2d6bf',
}

function Limb({
  radius,length,color,position,
}:{radius:number;length:number;color:string;position:[number,number,number]}){
  return <mesh position={position} castShadow>
    <capsuleGeometry args={[radius,Math.max(.02,length-radius*2),5,12]}/>
    <meshStandardMaterial color={color} roughness={.88} metalness={.045}/>
  </mesh>
}
function Hand({skin}:{skin:string}){
  return <group>
    <mesh position={[0,-.015,0]} castShadow><sphereGeometry args={[.095,10,8]}/><meshStandardMaterial color={skin} roughness={.95}/></mesh>
    <mesh position={[-.066,-.045,-.055]} rotation={[.2,0,-.32]} castShadow>
      <capsuleGeometry args={[.032,.105,3,8]}/>
      <meshStandardMaterial color={skin} roughness={.95}/>
    </mesh>
  </group>
}

export function WeaveEmbodiedAvatar({
  motion,role='visitor',
}:{
  motion:MutableRefObject<WeaveAvatarMotion>
  role?:WeaveAvatarPosition
}){
  const root=useRef<THREE.Group>(null)
  const spine=useRef<THREE.Group>(null)
  const head=useRef<THREE.Group>(null)
  const leftArm=useRef<THREE.Group>(null)
  const rightArm=useRef<THREE.Group>(null)
  const leftLeg=useRef<THREE.Group>(null)
  const rightLeg=useRef<THREE.Group>(null)
  const leftKnee=useRef<THREE.Group>(null)
  const rightKnee=useRef<THREE.Group>(null)
  const stride=useRef(0)
  const action=useRef(0)
  const bodyAngle=useRef(0)
  const primary=THREAD_COLORS[role]
  const skin='#aa7558'
  const fabric='#253247'
  const dark='#141d2c'
  const trim='#ead4a9'

  useFrame(({clock},delta)=>{
    const actor=root.current
    if(!actor||!spine.current||!head.current||!leftArm.current||!rightArm.current||!leftLeg.current||!rightLeg.current||!leftKnee.current||!rightKnee.current)return
    const dt=Math.min(.05,delta)
    const state=motion.current
    const amount=Math.min(1,Math.max(0,state.speed/4.9))
    action.current=THREE.MathUtils.damp(action.current,amount,9,dt)
    bodyAngle.current=THREE.MathUtils.damp(bodyAngle.current,state.yaw,11,dt)
    stride.current+=dt*(2.8+amount*11.8)
    const step=Math.sin(stride.current)
    const bend=Math.max(0,step)
    const run=action.current
    const crouch=state.crouching?1:0
    const breath=Math.sin(clock.elapsedTime*2.1)*.011

    actor.position.set(state.x,Math.max(0,state.airborne)+Math.abs(step)*run*.025,state.z)
    actor.rotation.y=bodyAngle.current
    spine.current.position.y=THREE.MathUtils.damp(spine.current.position.y,-crouch*.37,10,dt)
    spine.current.rotation.x=THREE.MathUtils.damp(spine.current.rotation.x,run*.12+crouch*.28,9,dt)
    spine.current.rotation.z=Math.sin(stride.current*.5)*run*.021
    spine.current.scale.y=1+breath
    head.current.rotation.x=THREE.MathUtils.damp(head.current.rotation.x,-run*.03,7,dt)
    head.current.rotation.y=Math.sin(clock.elapsedTime*.42)*.065*(1-run)
    const gait=run*.56
    leftLeg.current.rotation.x=step*gait-crouch*.48
    rightLeg.current.rotation.x=-step*gait-crouch*.48
    leftKnee.current.rotation.x=run*.53*bend+crouch*.79
    rightKnee.current.rotation.x=run*.53*Math.max(0,-step)+crouch*.79
    leftArm.current.rotation.x=-step*gait*.75+run*.05+crouch*.25
    rightArm.current.rotation.x=step*gait*.75+run*.05+crouch*.25
    leftArm.current.rotation.z=-.08-run*.1
    rightArm.current.rotation.z=.08+run*.1
  })

  return <group ref={root} data-weave-embodied-avatar={role}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.017,0]}>
      <circleGeometry args={[.43,20]}/>
      <meshBasicMaterial color="#06172a" transparent opacity={.26} depthWrite={false}/>
    </mesh>
    <group ref={spine}>
      <group position={[0,.93,0]}>
        <mesh scale={[.33,.21,.19]} castShadow><sphereGeometry args={[1,14,10]}/><meshStandardMaterial color={fabric} roughness={.88}/></mesh>
      </group>
      <mesh position={[0,1.37,0]} castShadow scale={[.33,.39,.19]}>
        <sphereGeometry args={[1,18,12]}/>
        <meshStandardMaterial color={primary} roughness={.86} metalness={.06}/>
      </mesh>
      <mesh position={[0,1.55,-.173]} castShadow scale={[.345,.125,.065]}>
        <sphereGeometry args={[1,12,10]}/>
        <meshStandardMaterial color={fabric} roughness={.87}/>
      </mesh>
      <mesh position={[0,1.29,-.197]} castShadow>
        <boxGeometry args={[.33,.35,.09]}/>
        <meshStandardMaterial color={dark} roughness={.82}/>
      </mesh>
      <mesh position={[0,1.3,-.26]}>
        <boxGeometry args={[.14,.17,.02]}/>
        <meshStandardMaterial color={trim} metalness={.25} roughness={.65}/>
      </mesh>
      {[-1,1].map(side=><group key={side}>
        <mesh position={[side*.27,1.53,.02]} rotation={[0,0,side*.3]}>
          <capsuleGeometry args={[.06,.46,4,8]}/>
          <meshStandardMaterial color={fabric} roughness={.84}/>
        </mesh>
        <mesh position={[side*.22,.96,-.15]}>
          <boxGeometry args={[.07,.17,.11]}/>
          <meshStandardMaterial color={trim} roughness={.82}/>
        </mesh>
      </group>)}
      <Limb radius={.085} length={.21} color={skin} position={[0,1.84,0]}/>
      <group ref={head} position={[0,2.06,0]}>
        <mesh castShadow scale={[.207,.254,.2]}>
          <sphereGeometry args={[1,16,12]}/>
          <meshStandardMaterial color={skin} roughness={.94}/>
        </mesh>
        <mesh castShadow position={[0,.163,.005]} scale={[.207,.098,.20]}>
          <sphereGeometry args={[1,15,9]}/>
          <meshStandardMaterial color="#251e20" roughness={.99}/>
        </mesh>
        <mesh position={[0,.04,-.204]} scale={[.043,.07,.032]}>
          <sphereGeometry args={[1,8,6]}/>
          <meshStandardMaterial color={skin} roughness={.92}/>
        </mesh>
        {[-1,1].map(side=><group key={side}>
          <mesh castShadow position={[side*.203,-.005,0]} scale={[.048,.073,.052]}>
            <sphereGeometry args={[1,8,7]}/>
            <meshStandardMaterial color={skin}/>
          </mesh>
          <mesh position={[side*.088,.053,-.183]} scale={[.024,.019,.012]}>
            <sphereGeometry args={[1,8,7]}/>
            <meshStandardMaterial color="#302329"/>
          </mesh>
          <mesh position={[side*.087,.092,-.181]} scale={[.048,.012,.01]}>
            <sphereGeometry args={[1,8,6]}/>
            <meshStandardMaterial color="#33262a"/>
          </mesh>
        </group>)}
      </group>
      <group ref={leftArm} position={[-.37,1.66,0]}>
        <Limb radius={.13} length={.57} color={primary} position={[0,-.28,0]}/>
        <Limb radius={.108} length={.27} color={skin} position={[0,-.64,0]}/>
        <group position={[0,-.80,-.02]}><Hand skin={skin}/></group>
      </group>
      <group ref={rightArm} position={[.37,1.66,0]}>
        <Limb radius={.13} length={.57} color={primary} position={[0,-.28,0]}/>
        <Limb radius={.108} length={.27} color={skin} position={[0,-.64,0]}/>
        <group position={[0,-.80,-.02]}><Hand skin={skin}/></group>
      </group>
      <group ref={leftLeg} position={[-.165,.79,0]}>
        <Limb radius={.15} length={.58} color={fabric} position={[0,-.27,0]}/>
        <group ref={leftKnee} position={[0,-.57,0]}>
          <Limb radius={.122} length={.49} color={fabric} position={[0,-.17,0]}/>
          <mesh castShadow position={[0,-.42,-.115]} scale={[.18,.115,.3]}>
            <sphereGeometry args={[1,11,8]}/>
            <meshStandardMaterial color={dark} roughness={.82}/>
          </mesh>
        </group>
      </group>
      <group ref={rightLeg} position={[.165,.79,0]}>
        <Limb radius={.15} length={.58} color={fabric} position={[0,-.27,0]}/>
        <group ref={rightKnee} position={[0,-.57,0]}>
          <Limb radius={.122} length={.49} color={fabric} position={[0,-.17,0]}/>
          <mesh castShadow position={[0,-.42,-.115]} scale={[.18,.115,.3]}>
            <sphereGeometry args={[1,11,8]}/>
            <meshStandardMaterial color={dark} roughness={.82}/>
          </mesh>
        </group>
      </group>
    </group>
  </group>
}

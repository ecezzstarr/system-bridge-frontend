'use client'

import {useEffect,useMemo} from 'react'
import {useFrame} from '@react-three/fiber'
import * as THREE from 'three'

// These surfaces are actual in-scene GPU shaders: no animated wallpapers,
// externally hosted videos, or fake static river/flame screenshots.
const vertex=\`
  varying vec2 vUv;
  void main(){
    vUv=uv;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }
\`
const waterFragment=\`
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  float waves(vec2 p){
    float ripple=sin(p.y*34.0-uTime*1.65+sin(p.x*13.0+uTime*.6));
    ripple+=.38*sin(p.y*65.0-uTime*2.3+p.x*18.0);
    ripple+=.25*sin(p.x*46.0+p.y*19.0+uTime*.95);
    return ripple*.5;
  }
  void main(){
    vec2 p=vUv;
    float wave=waves(p);
    float highlights=smoothstep(.38,.82,wave);
    vec3 depth=mix(vec3(.012,.095,.125),vec3(.065,.29,.32),p.x);
    float current=.08*sin(p.y*12.0-uTime*.85);
    vec3 river=depth+vec3(.018,.075,.086)*(wave+current);
    river+=vec3(.34,.54,.55)*highlights*.36;
    float bank=smoothstep(0.0,.085,p.x)*(1.0-smoothstep(.9,1.0,p.x));
    float edgeFoam=(1.0-bank)*(.09+.1*smoothstep(.5,.88,wave));
    river+=vec3(.21,.43,.45)*edgeFoam;
    gl_FragColor=vec4(clamp(river,0.0,1.0),.96);
  }
\`
const fireFragment=\`
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  float turbulence(vec2 p){
    return sin(p.x*11.0+p.y*8.0+uTime*2.2)*.18+
      sin(p.x*23.0-p.y*13.0-uTime*3.7)*.12+
      sin(p.x*38.0+p.y*18.0+uTime*4.4)*.055;
  }
  void main(){
    vec2 p=vUv;
    float upwards=p.y;
    float gust=turbulence(vec2(p.x,p.y-uTime*.13));
    float centre=.5+sin(uTime*2.2+p.y*7.0)*.09+gust*.22;
    float radius=mix(.39,.035,smoothstep(.0,1.0,upwards));
    float side=1.0-smoothstep(radius*.55,radius,abs(p.x-centre));
    float flicker=.87+.13*sin(uTime*11.0+p.x*31.0+p.y*18.0);
    float alpha=side*(1.0-smoothstep(.76,1.0,upwards))*flicker;
    vec3 gold=vec3(1.0,.45,.064);
    vec3 heat=vec3(1.0,.87,.34);
    vec3 tip=vec3(.75,.08,.025);
    vec3 color=mix(heat,gold,smoothstep(.0,.6,upwards));
    color=mix(color,tip,smoothstep(.69,1.0,upwards));
    gl_FragColor=vec4(color,clamp(alpha,0.0,.9));
  }
\`
function useLivingMaterial(fragmentShader:string){
 const material=useMemo(()=>new THREE.ShaderMaterial({
   vertexShader:vertex,fragmentShader,transparent:true,depthWrite:false,
   side:THREE.DoubleSide,uniforms:{uTime:{value:0}},
 }),[fragmentShader])
 useFrame(({clock})=>{material.uniforms.uTime.value=clock.getElapsedTime()})
 useEffect(()=>()=>material.dispose(),[material])
 return material
}
export function LivingRiverSurface({width,length}:{width:number;length:number}){
 const material=useLivingMaterial(waterFragment)
 return <mesh position={[0,-.017,0]} rotation={[-Math.PI/2,0,0]} renderOrder={1}>
   <planeGeometry args={[width,length,1,1]}/>
   <primitive object={material} attach="material"/>
 </mesh>
}
export function LivingFlameSurface(){
 const material=useLivingMaterial(fireFragment)
 return <group renderOrder={1}>
   <mesh><planeGeometry args={[.52,1.05]}/><primitive object={material} attach="material"/></mesh>
   <mesh rotation={[0,Math.PI/2,0]}>
     <planeGeometry args={[.52,1.05]}/>
     <primitive object={material} attach="material"/>
   </mesh>
 </group>
}

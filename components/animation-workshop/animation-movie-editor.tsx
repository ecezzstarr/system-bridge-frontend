'use client'

import {Canvas,useFrame} from '@react-three/fiber'
import {OrbitControls} from '@react-three/drei'
import {useEffect,useMemo,useRef,useState} from 'react'
import * as THREE from 'three'
import type {AnimationActor,AnimationScene,ActorKind,MaterialName,Vector3Tuple} from '@/lib/animation-workshop'

export type FilmProject={
  id:string;title:string;duration_seconds:number;scene:AnimationScene;
  created_by:string;updated_at:string
}
type Props={project:FilmProject;onSave:(project:FilmProject)=>Promise<void>;onClose:()=>void}

const materialNames:MaterialName[]=['river','flame','stone','timber','metal','fabric']
const objectKinds:ActorKind[]=['sphere','box','cone','cylinder','torus']
const palettes:Record<MaterialName,{base:string;accents:string[];roughness:number;metalness:number}>={
 river:{base:'#116b86',accents:['#62d6e9','#073e68','#bedfdb'],roughness:.22,metalness:.15},
 flame:{base:'#af3915',accents:['#fcad33','#faeb8a','#791911'],roughness:.52,metalness:0},
 stone:{base:'#606c72',accents:['#9a9f99','#343f47','#adb2a8'],roughness:.98,metalness:0},
 timber:{base:'#855333',accents:['#c38b57','#4b281a','#e0ac72'],roughness:.83,metalness:0},
 metal:{base:'#76838b',accents:['#c4ced2','#31383e','#e1eef4'],roughness:.34,metalness:.78},
 fabric:{base:'#7d617f',accents:['#a98eaf','#4d435e','#d2bdd1'],roughness:.97,metalness:0},
}
function buildTexture(material:MaterialName){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256
 const context=canvas.getContext('2d')!
 const style=palettes[material]
 context.fillStyle=style.base;context.fillRect(0,0,256,256)
 let seed=material.split('').reduce((sum,char)=>sum+char.charCodeAt(0),17)
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
 for(let n=0;n<3800;n++){
  const x=rand()*256,y=rand()*256
  context.globalAlpha=.09+rand()*.26;context.fillStyle=style.accents[Math.floor(rand()*style.accents.length)]
  const stroke=material==='timber'||material==='metal'?1+rand()*2:1+rand()*4
  context.fillRect(x,y,material==='timber'?12+rand()*35:material==='metal'?8+rand()*30:stroke,stroke)
 }
 if(material==='fabric'){
  context.globalAlpha=.19;context.strokeStyle='#ded3df'
  for(let x=0;x<256;x+=7){context.beginPath();context.moveTo(x,0);context.lineTo(x,256);context.stroke()}
  for(let y=0;y<256;y+=7){context.beginPath();context.moveTo(0,y);context.lineTo(256,y);context.stroke()}
 }
 if(material==='river'){
  context.strokeStyle='#c0faff';context.globalAlpha=.28
  for(let i=0;i<46;i++){const y=rand()*256;context.beginPath();context.moveTo(rand()*50,y);context.bezierCurveTo(75,y-7,170,y+7,240,y);context.stroke()}
 }
 context.globalAlpha=1
 const texture=new THREE.CanvasTexture(canvas)
 texture.colorSpace=THREE.SRGBColorSpace
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping
 texture.anisotropy=4
 return texture
}
function TexturedMaterial({name}:{name:MaterialName}){
 const texture=useMemo(()=>buildTexture(name),[name])
 useEffect(()=>()=>texture.dispose(),[texture])
 const material=palettes[name]
 return <meshStandardMaterial map={texture} roughness={material.roughness} metalness={material.metalness}
    bumpMap={texture} bumpScale={name==='stone'?.085:.024} />
}
function Geometry({kind}:{kind:ActorKind}){
 switch(kind){
 case 'box':return <boxGeometry args={[1.5,1.5,1.5]}/>
 case 'cone':return <coneGeometry args={[.85,1.7,32]}/>
 case 'cylinder':return <cylinderGeometry args={[.8,.8,1.6,32]}/>
 case 'torus':return <torusGeometry args={[.95,.28,18,70]}/>
 default:return <sphereGeometry args={[.95,48,32]}/>
 }
}
function Actor({actor,clock,duration,selected,onSelect}:{actor:AnimationActor;clock:React.RefObject<number>;duration:number;selected:boolean;onSelect:(id:string)=>void}){
 const ref=useRef<THREE.Mesh>(null)
 useFrame(()=>{
  const mesh=ref.current;if(!mesh)return
  const now=Math.min(duration,clock.current)
  mesh.visible=now>=actor.begin&&now<=actor.end
  const t=THREE.MathUtils.clamp((now-actor.begin)/Math.max(.01,actor.end-actor.begin),0,1)
  const e=t*t*(3-2*t)
  mesh.position.set(
   THREE.MathUtils.lerp(actor.from[0],actor.to[0],e),
   THREE.MathUtils.lerp(actor.from[1],actor.to[1],e),
   THREE.MathUtils.lerp(actor.from[2],actor.to[2],e))
  mesh.rotation.set(0,Math.PI*2*actor.turns*t,actor.kind==='torus'?.4:0)
 })
 return <mesh ref={ref} scale={actor.size} castShadow receiveShadow onClick={e=>{e.stopPropagation();onSelect(actor.id)}}>
   <Geometry kind={actor.kind}/><TexturedMaterial name={actor.material}/>
   {selected&&<lineSegments scale={1.12}><edgesGeometry args={[new THREE.BoxGeometry(2,2,2)]}/><lineBasicMaterial color="#fcda88"/></lineSegments>}
 </mesh>
}
function Ground({backdrop}:{backdrop:AnimationScene['backdrop']}){
 const name:MaterialName=backdrop==='river'?'river':backdrop==='daylight'?'stone':'metal'
 return <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-.025,0]}>
  <planeGeometry args={[160,160]}/><TexturedMaterial name={name}/>
 </mesh>
}
function Stage({scene,duration,clock,playing,onTick,onFinish,selected,onSelect}:{
 scene:AnimationScene;duration:number;clock:React.RefObject<number>;playing:boolean;
 onTick:(time:number)=>void;onFinish:()=>void;selected:string;onSelect:(id:string)=>void;
}){
 const lastTick=useRef(0)
 const completed=useRef(false)
 useEffect(()=>{if(playing)completed.current=false},[playing])
 useFrame(({camera},delta)=>{
  if(playing){
   clock.current=Math.min(duration,clock.current+Math.min(delta,.1))
   if(clock.current>=duration&&!completed.current){completed.current=true;onFinish()}
   const now=performance.now()
   if(now-lastTick.current>110){lastTick.current=now;onTick(clock.current)}
  }
  if(playing){
   const t=clock.current/duration
   const angle=(scene.camera==='orbit'?t*.8:scene.camera==='tracking'?t*.18:0)*Math.PI*2
   const radius=scene.camera==='tracking'?9:11
   camera.position.set(Math.sin(angle)*radius,5+Math.sin(t*2*Math.PI)*.35,Math.cos(angle)*radius)
   camera.lookAt(0,1,0)
  }
 })
 return <>
  <color attach="background" args={[scene.backdrop==='studio'?'#101924':scene.backdrop==='daylight'?'#b0c7d7':'#051b29']}/>
  <fog attach="fog" args={[scene.backdrop==='daylight'?'#b0c7d7':'#0a2533',20,75]}/>
  <ambientLight intensity={scene.backdrop==='studio'?.5:.85}/>
  <hemisphereLight args={['#d6efff','#45342b',1.1]}/>
  <directionalLight castShadow position={[7,12,8]} intensity={2.1} shadow-mapSize={[1024,1024]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15}/>
  <pointLight color="#ff8a44" intensity={scene.backdrop==='river'?12:2} position={[-5,5,-4]} distance={20}/>
  <Ground backdrop={scene.backdrop}/>
  {scene.actors.map(actor=><Actor key={actor.id} actor={actor} clock={clock} duration={duration} selected={selected===actor.id} onSelect={onSelect}/>)}
  <OrbitControls enabled={!playing} enablePan enableZoom minDistance={3} maxDistance={28} target={[0,1,0]}/>
 </>
}
function readError(error:unknown){return error instanceof Error?error.message:'Animation operation failed.'}
function numberInput(value:number,change:(value:number)=>void,min=-20,max=20,step=.25){
 return <input aria-label="Animation value" type="number" min={min} max={max} step={step} value={value}
   onChange={e=>change(Math.max(min,Math.min(max,Number(e.target.value)||0)))}
   className="w-full rounded-lg border border-white/15 bg-slate-950 px-2 py-2 text-xs text-white"/>
}

export default function AnimationMovieEditor({project,onSave,onClose}:Props){
 const [draft,setDraft]=useState(project)
 const [selected,setSelected]=useState(project.scene.actors[0]?.id||'')
 const [frame,setFrame]=useState(0)
 const [playing,setPlaying]=useState(false)
 const [recording,setRecording]=useState(false)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [download,setDownload]=useState('')
 const clock=useRef(0)
 const canvasRef=useRef<HTMLCanvasElement|null>(null)
 const recorder=useRef<MediaRecorder|null>(null)
 const chunks=useRef<Blob[]>([])
 const selectedActor=draft.scene.actors.find(a=>a.id===selected)||null
 const duration=draft.duration_seconds
 useEffect(()=>()=>{if(recorder.current?.state==='recording')recorder.current.stop()},[])
 useEffect(()=>()=>{if(download)URL.revokeObjectURL(download)},[download])
 const patchScene=(patch:Partial<AnimationScene>)=>setDraft(d=>({...d,scene:{...d.scene,...patch}}))
 const patchActor=(patch:Partial<AnimationActor>)=>setDraft(d=>({...d,scene:{
  ...d.scene,actors:d.scene.actors.map(actor=>actor.id===selected?{...actor,...patch}:actor)}}))
 const changeAxis=(key:'from'|'to',axis:number,value:number)=>{
  if(!selectedActor)return
  const xyz=[...selectedActor[key]] as Vector3Tuple;xyz[axis]=value;patchActor({[key]:xyz})
 }
 const addActor=()=>{
  if(draft.scene.actors.length>=24)return setMessage('Maximum 24 objects per film scene.')
  const id='actor-'+Date.now().toString(36)
  const actor:AnimationActor={id,kind:'sphere',material:'stone',size:1,from:[-3,1,0],to:[3,2,0],begin:0,end:duration,turns:1}
  patchScene({actors:[...draft.scene.actors,actor]});setSelected(id)
 }
 const save=async()=>{
  setBusy(true);setMessage('')
  try{await onSave(draft);setMessage('Film timeline saved to this Client File Folder.')}
  catch(error){setMessage(readError(error))}
  finally{setBusy(false)}
 }
 const finish=()=>{
  setPlaying(false);setFrame(duration)
  if(recorder.current?.state==='recording')recorder.current.stop()
 }
 const startMovie=()=>{
  const canvas=canvasRef.current
  if(!canvas?.captureStream||typeof MediaRecorder==='undefined'){
   setMessage('This browser cannot export a WebM movie. Open the workshop in a compatible Chrome or desktop browser.');return
  }
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))
  if(!mime){setMessage('WebM recording is not supported by this browser.');return}
  try{
   if(download){URL.revokeObjectURL(download);setDownload('')}
   chunks.current=[]
   const stream=canvas.captureStream(24)
   const media=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000})
   recorder.current=media
   media.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)}
   media.onerror=()=>setMessage('WebM export failed on this device.')
   media.onstop=()=>{
    stream.getTracks().forEach(track=>track.stop())
    setRecording(false)
    if(chunks.current.length){
     setDownload(URL.createObjectURL(new Blob(chunks.current,{type:mime})))
     setMessage('Animated WebM created on your device. Download the movie below.')
    }
   }
   clock.current=0;setFrame(0)
   media.start(250);setRecording(true);setPlaying(true)
  }catch(error){setRecording(false);setMessage(readError(error))}
 }
 const playback=()=>{clock.current=0;setFrame(0);setPlaying(true)}
 const seek=(n:number)=>{clock.current=n;setFrame(n)}
 const pill='rounded-lg border border-white/15 bg-white/[.05] px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-40'
 const name=(m:string)=>m.charAt(0).toUpperCase()+m.slice(1)
 return <section className="rounded-3xl border border-cyan-300/20 bg-[#070f19] p-4 text-white md:p-6" data-weave-real-animation="true">
  <header className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-300">WEAVE Animation · Client File Folder</p>
    <h2 className="mt-2 text-2xl font-bold">Movie Production Workshop</h2>
    <p className="mt-2 text-xs leading-5 text-slate-400">Build a 3D scene, choose textured materials, animate object movement, direct a camera and record the result as a real WebM video.</p></div>
   <button className={pill} onClick={onClose}>Back to productions</button>
  </header>
  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_315px]">
   <div className="min-w-0 space-y-4">
    <div className="aspect-video overflow-hidden rounded-2xl border border-white/15 bg-black" aria-label="Live three-dimensional animation stage">
     <Canvas shadows dpr={[1,1.5]} camera={{position:[0,5,11],fov:52}}
      gl={{alpha:false,antialias:true,preserveDrawingBuffer:false}}
      onCreated={({gl})=>{canvasRef.current=gl.domElement}}>
      <Stage scene={draft.scene} duration={duration} clock={clock} playing={playing} onTick={setFrame}
       onFinish={finish} selected={selected} onSelect={setSelected}/>
     </Canvas>
    </div>
    <div className="rounded-xl border border-white/10 bg-white/[.035] p-4">
     <div className="flex items-center justify-between text-xs"><b>Animation timeline</b><span>{frame.toFixed(1)} / {duration}s</span></div>
     <input aria-label="Scrub movie timeline" type="range" min={0} max={duration} step={.1} value={frame} disabled={recording}
      className="mt-3 w-full accent-cyan-300" onChange={e=>seek(Number(e.target.value))}/>
     <div className="mt-3 flex flex-wrap gap-2">
      <button className={pill} disabled={recording} onClick={playing?()=>setPlaying(false):playback}>{playing?'Pause':'Play timeline'}</button>
      <button className={pill} disabled={recording||busy} onClick={()=>void save()}>{busy?'Saving…':'Save production'}</button>
      <button className={pill} disabled={recording||playing} onClick={startMovie}>Record film · WebM</button>
      {download&&<a className={pill} href={download} download={(draft.title.replace(/[^a-z0-9_-]/gi,'-')||'weave-film')+'.webm'}>Download film</a>}
     </div>
     <p className="mt-2 text-[11px] text-slate-400">Recording captures the actual 3D stage. Export is silent WebM video on supported browsers; it is not AI-generated video or an MP4 render service.</p>
     {message&&<p role="status" className="mt-3 text-xs text-cyan-200">{message}</p>}
    </div>
   </div>
   <aside className="space-y-4">
    <div className="rounded-xl border border-white/10 bg-white/[.035] p-4">
     <label className="block text-xs text-slate-300">Film name<input className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-sm" maxLength={180}
       value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label>
     <label className="mt-3 block text-xs text-slate-300">Duration (seconds)
      {numberInput(duration,n=>setDraft(d=>({...d,duration_seconds:Math.round(n)})),2,90,1)}</label>
     <label className="mt-3 block text-xs text-slate-300">World atmosphere
      <select value={draft.scene.backdrop} onChange={e=>patchScene({backdrop:e.target.value as AnimationScene['backdrop']})} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-xs">
       <option value="river">Burning River</option><option value="studio">Studio darkness</option><option value="daylight">Daylight</option>
      </select></label>
     <label className="mt-3 block text-xs text-slate-300">Camera movement
      <select value={draft.scene.camera} onChange={e=>patchScene({camera:e.target.value as AnimationScene['camera']})} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-xs">
       <option value="orbit">Cinematic orbit</option><option value="tracking">Tracking</option><option value="static">Fixed shot</option>
      </select></label>
    </div>
    <div className="rounded-xl border border-white/10 bg-white/[.035] p-4">
     <div className="flex items-center justify-between gap-2"><b className="text-sm">Scene objects ({draft.scene.actors.length})</b>
      <button className={pill} onClick={addActor} disabled={recording||playing}>Add object</button></div>
     <div className="mt-3 flex flex-wrap gap-2">{draft.scene.actors.map((a,i)=><button key={a.id} className={pill+(selected===a.id?' !border-cyan-300 !text-cyan-200':'')}
       onClick={()=>setSelected(a.id)}>{i+1}. {name(a.kind)}</button>)}</div>
     {!selectedActor&&<p className="mt-3 text-xs text-slate-400">Add an object to begin animation.</p>}
     {selectedActor&&<div className="mt-4 space-y-3 border-t border-white/10 pt-4">
      <div className="grid grid-cols-2 gap-2">
       <label className="text-xs text-slate-300">Shape
        <select className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-xs" value={selectedActor.kind} onChange={e=>patchActor({kind:e.target.value as ActorKind})}>
         {objectKinds.map(x=><option key={x} value={x}>{name(x)}</option>)}</select></label>
       <label className="text-xs text-slate-300">Real material texture
        <select className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-xs" value={selectedActor.material} onChange={e=>patchActor({material:e.target.value as MaterialName})}>
         {materialNames.map(x=><option key={x} value={x}>{name(x)}</option>)}</select></label>
      </div>
      <label className="block text-xs text-slate-300">Object scale
       {numberInput(selectedActor.size,n=>patchActor({size:n}),.15,8,.1)}</label>
      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">Movement keyframes</p>
      {(['from','to'] as const).map(key=><div key={key}><p className="text-xs text-slate-300">{key==='from'?'Start position':'End position'}</p>
       <div className="mt-1 grid grid-cols-3 gap-2">{selectedActor[key].map((v,i)=><label key={i} className="text-[10px] text-slate-400">{'XYZ'[i]}
        {numberInput(v,n=>changeAxis(key,i,n),i===1?0:-20,i===1?18:20)}</label>)}</div></div>)}
      <div className="grid grid-cols-3 gap-2">
       <label className="text-[10px] text-slate-400">From second
        {numberInput(selectedActor.begin,n=>patchActor({begin:n}),0,duration,.5)}</label>
       <label className="text-[10px] text-slate-400">To second
        {numberInput(selectedActor.end,n=>patchActor({end:n}),0,duration,.5)}</label>
       <label className="text-[10px] text-slate-400">Rotations
        {numberInput(selectedActor.turns,n=>patchActor({turns:n}),-8,8,.5)}</label>
      </div>
      <button disabled={recording} className={pill+' !text-rose-300'} onClick={()=>{
       patchScene({actors:draft.scene.actors.filter(a=>a.id!==selectedActor.id)});setSelected('')
      }}>Remove selected object</button>
     </div>}
    </div>
   </aside>
  </div>
 </section>
}

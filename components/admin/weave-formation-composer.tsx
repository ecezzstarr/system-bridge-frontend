'use client'

import {useMemo,useState} from 'react'
import {Canvas} from '@react-three/fiber'
import {OrbitControls} from '@react-three/drei'
import {Box,Code2,Layers3,PanelsTopLeft,Workflow} from 'lucide-react'
import {
  buildWeaveFormationDraft,type WeaveFormationDraft,type WeaveFormationKind,
} from '@/lib/weave-workshop-formation'

const kinds: {id:WeaveFormationKind;name:string;detail:string}[] = [
  {id:'glass-page',name:'Glass page',detail:'Responsive, layered glass homepage or workshop'},
  {id:'glass-world',name:'3D world',detail:'Real navigable three-dimensional glass architecture'},
  {id:'glass-component',name:'Glass component',detail:'Reusable panel for existing Weave pages'},
]

export default function WeaveFormationComposer({draftReady,onUse}:{
  draftReady:boolean
  onUse:(draft:WeaveFormationDraft)=>Promise<void>
}){
  const [kind,setKind]=useState<WeaveFormationKind>('glass-world')
  const [name,setName]=useState('Still Water Workshop')
  const [cadence,setCadence]=useState('Hope gives direction. Administrations gives the structure through which motion becomes steady and a living system continues.')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const formation=useMemo(()=>{
    try{return {draft:buildWeaveFormationDraft({kind,name,cadence}),error:''}}
    catch(e){return {draft:null,error:e instanceof Error?e.message:'Invalid workshop formation'}}
  },[kind,name,cadence])
  async function useDraft(){
    if(!formation.draft||!draftReady||busy)return
    setBusy(true);setError('')
    try{await onUse(formation.draft)}
    catch(e){setError(e instanceof Error?e.message:'Cannot open draft')}
    finally{setBusy(false)}
  }

  return <section className="overflow-hidden rounded-3xl border border-cyan-200/25 bg-[linear-gradient(120deg,#0c2b41,#071727_70%)] p-4 shadow-2xl sm:p-6" data-weave-formation-foundry="cadence-to-source">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-cyan-200"><Workflow size={16}/>Administrations · Still Water</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Formation Foundry</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Begin in your own cadence. Form a page, a real 3D prototype or a reusable glass-tech component. The template engine writes inspectable TSX into your private draft; it does not execute instructions or deploy to production.</p>
      </div>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(240px,.8fr)_minmax(0,1.2fr)]">
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-slate-200">What will take form?</legend>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            {kinds.map(item=><button type="button" key={item.id} onClick={()=>setKind(item.id)}
              aria-pressed={kind===item.id}
              className={'rounded-xl border p-3 text-left transition '+(kind===item.id?'border-cyan-200/60 bg-cyan-200/15':'border-white/10 bg-white/[.03] hover:border-white/25')}>
              <span className="flex items-center gap-2 text-sm font-bold text-white">
                {item.id==='glass-world'?<Layers3 size={16}/>:item.id==='glass-page'?<PanelsTopLeft size={16}/>:<Box size={16}/>}
                {item.name}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-300">{item.detail}</span>
            </button>)}
          </div>
        </fieldset>
        <label className="block text-xs font-bold text-slate-200">Name of this formation
          <input value={name} onChange={e=>setName(e.target.value)} maxLength={90}
            className="mt-2 w-full rounded-xl border border-white/20 bg-[#061625] p-3 text-sm text-white outline-none focus:border-cyan-200/60"/>
        </label>
        <label className="block text-xs font-bold text-slate-200">Your cadence · What should this presence express?
          <textarea value={cadence} onChange={e=>setCadence(e.target.value)} maxLength={1200} rows={5}
            className="mt-2 w-full resize-y rounded-xl border border-white/20 bg-[#061625] p-3 text-sm leading-6 text-white outline-none focus:border-cyan-200/60"/>
        </label>
        <p className="break-all font-mono text-[11px] text-slate-300">{formation.draft?.path||formation.error}</p>
        {error&&<p role="alert" className="text-xs text-rose-200">{error}</p>}
        <button type="button" disabled={!formation.draft||!draftReady||busy} onClick={()=>void useDraft()}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-100 px-4 text-sm font-bold text-[#0b2539] disabled:cursor-not-allowed disabled:opacity-40">
          <Code2 size={17}/>{busy?'Opening new source…':'Load generated TSX into source editor'}
        </button>
        {!draftReady&&<p className="text-xs leading-5 text-amber-100">First create your private source branch with CREATE DRAFT. This builder cannot change main directly.</p>}
        <p className="text-xs leading-5 text-slate-400">This is a starter blueprint, not an autonomous AI code reviewer. Adapt its source and connect real business records and access controls before opening a release review.</p>
      </div>

      <div className="min-w-0">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-200">Live appearance preview · {kinds.find(x=>x.id===kind)?.name}</p>
        {kind==='glass-world'
          ? <div className="h-[330px] overflow-hidden rounded-2xl border border-cyan-200/20 bg-[#0a2339] sm:h-[480px]">
              <Canvas camera={{position:[7,5,11],fov:43}} dpr={[1,1.5]} shadows>
                <color attach="background" args={['#0a2339']}/>
                <ambientLight intensity={1.15}/>
                <directionalLight position={[6,10,5]} intensity={2.4} castShadow/>
                <pointLight position={[-4,5,-2]} color="#6cddff" intensity={28}/>
                <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-.12,0]}>
                  <planeGeometry args={[30,30]}/>
                  <meshStandardMaterial color="#142f45" roughness={.65}/>
                </mesh>
                {[-3,0,3].map((x,i)=><group key={x} position={[x,0,0]}>
                  <mesh castShadow receiveShadow position={[0,1.2+i*.4,0]}>
                    <boxGeometry args={[1.8,2.4+i*.8,1.7]}/>
                    <meshPhysicalMaterial color="#8fdcff" metalness={.2} roughness={.12} transmission={.35} transparent opacity={.77} clearcoat={1}/>
                  </mesh>
                  <mesh position={[0,2.5+i*.8,0]}>
                    <boxGeometry args={[2,.16,1.9]}/>
                    <meshStandardMaterial color="#edc67b" metalness={.7} roughness={.22}/>
                  </mesh>
                </group>)}
                <OrbitControls enablePan={false} minDistance={5} maxDistance={21} maxPolarAngle={Math.PI/2.1}/>
              </Canvas>
            </div>
          : <div className="relative flex min-h-[330px] items-center overflow-hidden rounded-2xl border border-cyan-200/20 bg-gradient-to-br from-[#164b68] via-[#0a263d] to-[#081826] p-5 sm:min-h-[480px] sm:p-10">
              <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl"/>
              <div className="relative max-w-xl rounded-3xl border border-white/25 bg-white/[.07] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-100">WEAVE · Presence into form</p>
                <h3 className="mt-4 break-words text-2xl font-bold text-white sm:text-4xl">{name||'Untitled formation'}</h3>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">{cadence}</p>
              </div>
            </div>}
        <p className="mt-3 text-xs leading-5 text-slate-400">Appearance preview only; not a deployed route. The 3D scene uses actual WebGL meshes. Generated code remains editable in the workshop.</p>
      </div>
    </div>
  </section>
}

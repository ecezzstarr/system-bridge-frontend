'use client'

import { Component, type ReactNode } from 'react'
import { Html, OrbitControls } from '@react-three/drei'
import { AdaptiveCanvas } from '@/components/world/adaptive-canvas'
import { CityMaterial } from './file-folder-city-material'
import { FILE_FOLDER_PALETTES, type FileFolderThemeId } from '@/lib/file-folder-world-presets'
import { InstitutionalArchitecture } from './file-folder-institutional-architecture'
import { institutionalArchetype } from '@/lib/file-folder-institutional-visual'

type Station = { key: string; label: string; open: () => void }
type Project = Station & { progress: number; systemType: string; status: string }
type Props = {
  tier: string
  appearance: FileFolderThemeId
  name: string
  sector?: string
  stations: Station[]
  projects: Project[]
  selected: string
  onSelect: (key: string) => void
  onExit: () => void
}

class SceneBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed
      ? <p className="p-5 text-sm text-slate-200">3D view unavailable. Use the room and project controls below.</p>
      : this.props.children
  }
}

export function FileFolderOwnerHall({tier, appearance, name, sector, stations, projects, selected, onSelect, onExit}: Props) {
  const theme = FILE_FOLDER_PALETTES[appearance]
  const project = projects.find(item => item.key === selected) || projects[0]
  const button = 'min-h-11 rounded-lg border border-white/25 bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 focus-visible:outline'
  return <section aria-label="Private File Folder hall" className="ff-owner-hall flex h-full min-h-0 flex-col overflow-y-auto bg-[#101c28] text-white">
    <header className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4 md:px-7">
      <div><p className="text-xs uppercase tracking-wider" style={{color:theme.accent}}>{tier.toUpperCase()} · Owner hall</p>
        <h1 className="text-xl font-bold">{name}</h1>{sector && <p className="text-sm text-slate-300">{sector}</p>}</div>
      <button type="button" className={button} onClick={onExit}>Return to territory</button>
    </header>
    <div className="relative min-h-48 flex-1" style={{height:'min(47dvh, 34rem)'}}>
      <SceneBoundary><AdaptiveCanvas camera={{position:[0,3.1,8.4],fov:53}} shadows>
        <color attach="background" args={[theme.glass]}/>
        <hemisphereLight args={[theme.glass,theme.ground,2.2]}/>
        <directionalLight position={[4,7,3]} intensity={2.4} castShadow/>
        <mesh position={[0,-.15,-2]} receiveShadow><boxGeometry args={[19,.3,22]}/><CityMaterial kind="paving" tileX={8} tileY={8} tint={theme.structure}/></mesh>
        {[-7,-2,3].map(z=><group key={z} position={[0,0,z]}>
          {[-1,1].map(side=><group key={side} position={[side*7,0,0]}>
            <mesh position={[0,2,0]}><cylinderGeometry args={[.34,.48,4,8]}/><meshStandardMaterial color={theme.ground}/></mesh>
            <mesh position={[0,4,0]}><boxGeometry args={[1,.24,1]}/><meshStandardMaterial color={theme.accent}/></mesh>
          </group>)}
          <mesh position={[0,4,0]} scale={[1,.63,1]}><torusGeometry args={[7,.17,8,40,Math.PI]}/><meshStandardMaterial color={theme.structure}/></mesh>
        </group>)}
        {stations.map((station,index)=>{
          const x=(index-(stations.length-1)/2)*4.2
          return <group key={station.key} position={[x,0,-4]} onClick={event=>{event.stopPropagation();station.open()}}>
            <Html position={[0,3.5,.25]} center style={{pointerEvents:'none',whiteSpace:'nowrap',fontSize:12,color:'white',background:'#11202c',borderRadius:6,padding:'3px 8px'}}>{station.label}</Html>
            <mesh position={[0,1.5,-.12]}><boxGeometry args={[2.55,3,.25]}/><meshStandardMaterial color={theme.ground}/></mesh>
            {[-1,1].map(side=><mesh key={side} position={[side*1.36,1.5,0]}><boxGeometry args={[.16,3,.36]}/><meshStandardMaterial color={theme.accent}/></mesh>)}
            <mesh position={[0,3,0]}><torusGeometry args={[1.36,.13,8,32,Math.PI]}/><meshStandardMaterial color={theme.accent}/></mesh>
            <mesh position={[0,.08,.53]}><boxGeometry args={[2.55,.16,1.35]}/><meshStandardMaterial color={theme.structure}/></mesh>
            {station.key==='library_district' ? [0,1,2].map(row=><group key={row} position={[0,.27+row*.79,.38]}>
              <mesh><boxGeometry args={[2.18,.07,.5]}/><meshStandardMaterial color={theme.accent}/></mesh>
              {[-.78,-.46,-.15,.23,.58,.87].map((x,i)=><mesh key={x} position={[x,.32,0]}><boxGeometry args={[.2,.53+(i%2)*.09,.38]}/><meshStandardMaterial color={i%2?theme.structure:theme.glass}/></mesh>)}
            </group>) : station.key==='build_market' ? [0,1,2].map(row=><group key={row} position={[-.82+row*.74,.38,.35]}>
              {[0,1,2].map(layer=><mesh key={layer} position={[0,layer*.28,0]}><boxGeometry args={[.63,.22,.72]}/><CityMaterial kind={row===0?'warm':row===1?'metal':'paving'}/></mesh>)}
            </group>) : <group position={[0,.75,.36]}>
              <mesh><boxGeometry args={[2.05,.14,.7]}/><CityMaterial kind="metal"/></mesh>
              {[-.84,.84].map(x=><mesh key={x} position={[x,-.32,0]}><boxGeometry args={[.11,.65,.57]}/><meshStandardMaterial color={theme.accent}/></mesh>)}
              <mesh position={[0,.44,-.14]} rotation={[-.18,0,0]}><boxGeometry args={[1.12,.63,.1]}/><meshStandardMaterial color={theme.glass} emissive={theme.accent} emissiveIntensity={.35}/></mesh>
            </group>}
          </group>
        })}
        <group position={[0,0,1]} onClick={event=>{event.stopPropagation();project?.open()}}>
          <mesh position={[0,.58,0]}><cylinderGeometry args={[1.55,1.16,1.16,48]}/><meshStandardMaterial color={theme.ground}/></mesh>
          <mesh position={[0,1.2,0]}><cylinderGeometry args={[1.68,1.64,.13,48]}/><meshStandardMaterial color={theme.accent} metalness={.55} roughness={.28}/></mesh>
          {project && <group position={[0,1.28,0]} scale={.8}>
            {institutionalArchetype(project.systemType)
              ? <InstitutionalArchitecture compact systemType={project.systemType} progress={project.progress}/>
              : <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.92,1.2,64,1,0,Math.PI*2*Math.max(.005,project.progress/100)]}/><meshBasicMaterial color={theme.glass}/></mesh>}
          </group>}
        </group>
        <OrbitControls target={[0,1.7,-1]} enablePan={false} minDistance={5} maxDistance={12} minPolarAngle={1.05} maxPolarAngle={1.53} minAzimuthAngle={-.55} maxAzimuthAngle={.55}/>
      </AdaptiveCanvas></SceneBoundary>
    </div>
    <div className="space-y-3 border-t border-white/15 p-4 md:px-7">
      {project && <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm">Project table
          <select className="mt-1 block min-h-11 w-full rounded-lg bg-slate-800 px-2" value={project.key} onChange={event=>onSelect(event.target.value)}>
            {projects.map(item=><option key={item.key} value={item.key}>{item.label} · {item.status}</option>)}
          </select>
        </label>
        <button type="button" className={button} onClick={project.open}>Open {project.status==='Active'?'system':'build'}</button>
      </div>}
      {!project && stations.some(station=>station.key==='workshop_core') && <p className="text-sm text-slate-200">Start a build in your Workshop to bring it to the project table.</p>}
      <nav aria-label="Owner hall rooms" className="flex flex-wrap gap-2">
        {stations.map(station=><button key={station.key} type="button" className={button} onClick={station.open}>{station.label}</button>)}
      </nav>
    </div>
  </section>
}

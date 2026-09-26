'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'

type DistrictKey = 'command' | 'builds' | 'business' | 'enterprise' | 'sound'

type District = {
  key: DistrictKey
  label: string
  tone: 'sky' | 'violet' | 'emerald' | 'amber' | 'rose'
}

const COLORS: Record<District['tone'], string> = {
  sky: '#38bdf8',
  violet: '#a78bfa',
  emerald: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185',
}

const POSITIONS: Record<DistrictKey, [number, number, number]> = {
  command: [0, 0, 0],
  builds: [-3.6, 0, -1.4],
  business: [3.6, 0, -1.4],
  enterprise: [-2.35, 0, 2.65],
  sound: [2.35, 0, 2.65],
}

function DistrictStructure({
  district,
  active,
  marketLevel=0,
  marketBuildProgress=0,
  enterpriseLevel=0,
}: {
  district: District
  active: boolean
  marketLevel?: number
  marketBuildProgress?: number
  enterpriseLevel?: number
}) {
  const color = COLORS[district.tone]
  const material = (intensity=0.24) => (
    <meshStandardMaterial color="#08111f" emissive={color} emissiveIntensity={active ? intensity * 2.2 : intensity} metalness={0.4} roughness={0.28} />
  )

  if (district.key === 'command') {
    return <group>
      <mesh position={[0,0.88,0]}><boxGeometry args={[1.05,1.55,1.05]}/>{material(0.3)}</mesh>
      <mesh position={[-0.62,0.58,0]}><boxGeometry args={[0.28,1.05,0.58]}/>{material(0.24)}</mesh>
      <mesh position={[0.62,0.58,0]}><boxGeometry args={[0.28,1.05,0.58]}/>{material(0.24)}</mesh>
      <mesh position={[0,1.85,0]}><coneGeometry args={[0.42,0.72,6]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active?0.9:0.42}/></mesh>
    </group>
  }

  if (district.key === 'builds') {
    return <group>
      <mesh position={[0,0.72,0]}><boxGeometry args={[0.62,1.16,0.62]}/>{material(0.28)}</mesh>
      {[-0.56,0.56].map(x=><mesh key={x} position={[x,0.82,0]}><boxGeometry args={[0.12,1.7,0.12]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active?0.75:0.28}/></mesh>)}
      {[0.35,0.9,1.4].map(y=><mesh key={y} position={[0,y,0]}><boxGeometry args={[1.3,0.09,0.18]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active?0.65:0.22}/></mesh>)}
      <mesh position={[0.24,1.72,0]} rotation={[0,0,-0.46]}><boxGeometry args={[1.1,0.08,0.08]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65}/></mesh>
    </group>
  }

  if (district.key === 'business') {
    const structureHeight=marketLevel>=3?1.65:marketLevel>=2?1.18:marketLevel>=1?0.76:0.38
    const structureWidth=marketLevel>=3?1.55:marketLevel>=2?1.25:0.82
    const buildRise=Math.max(0,Math.min(1,marketBuildProgress/100))*0.55
    return <group>
      <mesh position={[0,(structureHeight+buildRise)/2,0]}>
        <boxGeometry args={[structureWidth,structureHeight+buildRise,0.92]}/>
        {material(0.3)}
      </mesh>
      {marketLevel>=2&&[-0.58,0,0.58].map(x=><mesh key={x} position={[x,0.42,0.5]}><boxGeometry args={[0.27,0.52,0.24]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active?0.74:0.28}/></mesh>)}
      {marketLevel>=3&&<>
        <mesh position={[-0.98,0.48,0]}><boxGeometry args={[0.38,0.9,0.72]}/>{material(0.24)}</mesh>
        <mesh position={[0.98,0.48,0]}><boxGeometry args={[0.38,0.9,0.72]}/>{material(0.24)}</mesh>
        <mesh position={[0,1.96+buildRise,0]}><coneGeometry args={[0.48,0.72,6]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active?0.85:0.34}/></mesh>
      </>}
      {marketBuildProgress>0&&marketBuildProgress<100&&<>
        {[-0.86,0.86].map(x=><mesh key={'market-post-'+x} position={[x,0.9,0]}><boxGeometry args={[0.06,1.8,0.06]}/><meshBasicMaterial color="#fbbf24" transparent opacity={0.48}/></mesh>)}
        {[0.4,0.88,1.35].map(y=><mesh key={'market-beam-'+y} position={[0,y,0]}><boxGeometry args={[1.8,0.05,0.08]}/><meshBasicMaterial color="#fde68a" transparent opacity={0.4}/></mesh>)}
      </>}
      <mesh position={[0,0.04,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[marketLevel>=3?1.42:1.08,0.03,10,48]}/><meshBasicMaterial color={color} transparent opacity={active?0.7:0.25}/></mesh>
    </group>
  }

  if (district.key === 'enterprise') {
    const height=enterpriseLevel>=4?2.65:enterpriseLevel>=3?2.2:enterpriseLevel>=2?1.72:enterpriseLevel>=1?1.18:0.62
    const radius=enterpriseLevel>=2?0.82:0.62
    return <group>
      <mesh position={[0,height/2,0]}><cylinderGeometry args={[radius*0.72,radius,height,8]}/>{material(0.32)}</mesh>
      {enterpriseLevel>=2&&<>
        <mesh position={[-0.86,0.58,0]}><boxGeometry args={[0.48,1.05,0.7]}/>{material(0.24)}</mesh>
        <mesh position={[0.86,0.58,0]}><boxGeometry args={[0.48,1.05,0.7]}/>{material(0.24)}</mesh>
      </>}
      {enterpriseLevel>=3&&<>
        <mesh position={[-1.02,1.42,0]}><cylinderGeometry args={[0.18,0.28,1.35,8]}/>{material(0.26)}</mesh>
        <mesh position={[1.02,1.42,0]}><cylinderGeometry args={[0.18,0.28,1.35,8]}/>{material(0.26)}</mesh>
      </>}
      {enterpriseLevel>=4&&<mesh position={[0,height+0.78,0]}><octahedronGeometry args={[0.28,0]}/><meshBasicMaterial color={color}/></mesh>}
      <mesh position={[0,height+0.34,0]}><coneGeometry args={[enterpriseLevel>=2?0.5:0.36,0.72,8]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active?0.95:0.42}/></mesh>
      <mesh position={[0,0.04,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[enterpriseLevel>=4?1.55:1.16,0.035,10,64]}/><meshBasicMaterial color={color} transparent opacity={active?0.78:0.28}/></mesh>
    </group>
  }

  return <group>
    <mesh position={[0,0.7,0]}><sphereGeometry args={[0.78,20,14,0,Math.PI*2,0,Math.PI/1.85]}/>{material(0.28)}</mesh>
    <mesh position={[0,0.78,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[0.88,0.06,10,48]}/><meshBasicMaterial color={color} transparent opacity={active?0.82:0.34}/></mesh>
  </group>
}

function RoadLink({ district }: { district: District }) {
  if (district.key === 'command') return null
  const [x,,z] = POSITIONS[district.key]
  const length = Math.sqrt(x*x + z*z)
  const angle = Math.atan2(x,z)
  return <mesh position={[x/2,-0.27,z/2]} rotation={[0,angle,0]}>
    <boxGeometry args={[0.28,0.055,length]}/>
    <meshStandardMaterial color="#0a1b2a" emissive={COLORS[district.tone]} emissiveIntensity={0.18} metalness={0.25} roughness={0.7}/>
  </mesh>
}

function DistrictNode({
  district,
  active,
  onSelect,
  marketLevel,
  marketBuildProgress,
  enterpriseLevel,
}: {
  district: District
  active: boolean
  onSelect: () => void
  marketLevel: number
  marketBuildProgress: number
  enterpriseLevel: number
}) {
  const group = useRef<THREE.Group>(null)
  const color = COLORS[district.tone]
  const position = POSITIONS[district.key]

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.getElapsedTime()
    group.current.position.y = Math.sin(t * 1.1 + position[0]) * 0.07
    group.current.rotation.y = Math.sin(t * 0.42 + position[2]) * 0.08
  })

  return (
    <group ref={group} position={position}>
      <mesh
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
        scale={active ? 1.12 : 1}
      >
        <cylinderGeometry args={[1.15, 1.35, 0.34, 6]} />
        <meshStandardMaterial
          color={active ? color : '#0b1524'}
          emissive={color}
          emissiveIntensity={active ? 0.58 : 0.16}
          metalness={0.42}
          roughness={0.28}
        />
      </mesh>

      <DistrictStructure district={district} active={active} marketLevel={marketLevel} marketBuildProgress={marketBuildProgress} enterpriseLevel={enterpriseLevel} />

      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
          <torusGeometry args={[1.55, 0.035, 12, 72]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}

function StreamingTower({level}:{level:number}) {
  if(level<=0)return null
  const height=level>=4?2.8:level>=3?2.2:level>=2?1.55:0.9
  return <group position={[5.15,0,1.45]}>
    <mesh position={[0,height/2,0]}><cylinderGeometry args={[0.22,0.46,height,10]}/><meshStandardMaterial color="#10101c" emissive="#fb7185" emissiveIntensity={0.46} metalness={0.5} roughness={0.25}/></mesh>
    {level>=2&&<mesh position={[0,height+0.18,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[0.64,0.045,10,48]}/><meshBasicMaterial color="#fb7185" transparent opacity={0.72}/></mesh>}
    {level>=3&&<mesh position={[0,height+0.68,0]}><sphereGeometry args={[0.18,18,18]}/><meshBasicMaterial color="#fda4af"/></mesh>}
    {level>=4&&<>
      <mesh position={[0,height+1.06,0]}><coneGeometry args={[0.18,0.7,8]}/><meshBasicMaterial color="#a78bfa"/></mesh>
      <mesh position={[0,0.04,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.0,0.03,10,56]}/><meshBasicMaterial color="#a78bfa" transparent opacity={0.42}/></mesh>
    </>}
  </group>
}

function RouteNetwork({count,vitality}:{count:number;vitality:number}) {
  if(count<=0)return null
  const visible=Math.min(8,count)
  return <group>
    {Array.from({length:visible}).map((_,index)=>{
      const angle=(index/visible)*Math.PI*2
      const radius=4.5+(index%2)*0.75
      const x=Math.cos(angle)*radius
      const z=Math.sin(angle)*radius
      const length=Math.sqrt(x*x+z*z)
      const rotation=Math.atan2(x,z)
      return <group key={'route-'+index}>
        <mesh position={[x/2,-0.20,z/2]} rotation={[0,rotation,0]}><boxGeometry args={[0.055,0.035,length]}/><meshBasicMaterial color="#22d3ee" transparent opacity={0.18+Math.min(0.42,vitality/240)}/></mesh>
        <mesh position={[x,0.25,z]}><sphereGeometry args={[0.12,12,12]}/><meshBasicMaterial color="#67e8f9"/></mesh>
      </group>
    })}
  </group>
}

function BuildCore({
  activeBuilds,
  liveSystems,
}: {
  activeBuilds: Array<{ progress: number }>
  liveSystems: number
}) {
  const core = useRef<THREE.Group>(null)
  const avgProgress = activeBuilds.length
    ? activeBuilds.reduce((sum, item) => sum + item.progress, 0) / activeBuilds.length
    : liveSystems > 0 ? 100 : 0
  const height = 0.7 + (avgProgress / 100) * 2.8

  useFrame(({ clock }) => {
    if (!core.current) return
    core.current.rotation.y = clock.getElapsedTime() * 0.12
  })

  return (
    <group ref={core} position={[0, 0, -3.7]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.54, 0.78, height, 8]} />
        <meshStandardMaterial
          color="#091827"
          emissive={liveSystems > 0 ? '#34d399' : '#fbbf24'}
          emissiveIntensity={0.42}
          metalness={0.5}
          roughness={0.26}
        />
      </mesh>
      <mesh position={[0, height + 0.24, 0]}>
        <sphereGeometry args={[0.25, 20, 20]} />
        <meshBasicMaterial color={liveSystems > 0 ? '#6ee7b7' : '#fde68a'} />
      </mesh>
      {activeBuilds.length > 0 && <>
        {[-0.82,0.82].map(x=><mesh key={'post-'+x} position={[x,1.25,0]}><boxGeometry args={[0.08,2.5,0.08]}/><meshBasicMaterial color="#fbbf24" transparent opacity={0.42}/></mesh>)}
        {[0.45,1.15,1.85].map(y=><mesh key={'beam-'+y} position={[0,y,0]}><boxGeometry args={[1.75,0.07,0.11]}/><meshBasicMaterial color="#fde68a" transparent opacity={0.36}/></mesh>)}
      </>}
    </group>
  )
}

function Scene({
  districts,
  activeSurface,
  onSurfaceChange,
  activeBuilds,
  liveSystems,
  marketLevel,
  marketBuildProgress,
  streamLevel,
  enterpriseLevel,
  routeCount,
  vitalityScore,
}: {
  districts: District[]
  activeSurface: DistrictKey
  onSurfaceChange: (key: DistrictKey) => void
  activeBuilds: Array<{ progress: number }>
  liveSystems: number
  marketLevel: number
  marketBuildProgress: number
  streamLevel: number
  enterpriseLevel: number
  routeCount: number
  vitalityScore: number
}) {
  const root = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!root.current) return
    root.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.16) * 0.035
  })

  return (
    <>
      <color attach="background" args={['#020711']} />
      <fog attach="fog" args={['#020711', 10, 25]} />
      <ambientLight intensity={0.62} />
      <directionalLight position={[6, 9, 6]} intensity={1.3} color="#dbeafe" />
      <pointLight position={[-5, 4, -4]} intensity={16} color="#38bdf8" distance={18} />
      <pointLight position={[5, 3, 3]} intensity={12} color="#fbbf24" distance={16} />
      <Stars radius={28} depth={16} count={550} factor={1.8} saturation={0} fade speed={0.35} />

      <group ref={root}>
        <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[7.6, 64]} />
          <meshStandardMaterial color="#030b16" metalness={0.22} roughness={0.72} />
        </mesh>
        <gridHelper args={[15, 24, '#38bdf8', '#172033']} position={[0, -0.32, 0]} />
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.28,0]}>
          <torusGeometry args={[6.65,0.09,12,96]}/>
          <meshStandardMaterial color="#0a1b2a" emissive="#38bdf8" emissiveIntensity={0.16} metalness={0.45} roughness={0.5}/>
        </mesh>
        {districts.map(district=><RoadLink key={'road-'+district.key} district={district}/>)}

        {districts.map((district) => (
          <DistrictNode
            key={district.key}
            district={district}
            active={district.key === activeSurface}
            onSelect={() => onSurfaceChange(district.key)}
            marketLevel={marketLevel}
            marketBuildProgress={marketBuildProgress}
            enterpriseLevel={enterpriseLevel}
          />
        ))}

        <BuildCore activeBuilds={activeBuilds} liveSystems={liveSystems} />
        <StreamingTower level={streamLevel} />
        <RouteNetwork count={routeCount} vitality={vitalityScore} />

        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, -3.7]}>
          <mesh>
            <torusGeometry args={[1.45, 0.018, 10, 96]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={activeBuilds.length ? 0.42 : 0.14} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 3]}>
            <torusGeometry args={[1.9, 0.012, 10, 96]} />
            <meshBasicMaterial color="#a78bfa" transparent opacity={liveSystems ? 0.34 : 0.1} />
          </mesh>
        </group>

        {Array.from({ length: Math.min(8, liveSystems) }).map((_, index) => {
          const angle = (index / Math.max(1, Math.min(8, liveSystems))) * Math.PI * 2
          const x = Math.cos(angle) * 5.5
          const z = Math.sin(angle) * 5.5
          return (
            <mesh key={index} position={[x, 0.35, z]}>
              <boxGeometry args={[0.45, 0.7 + (index % 3) * 0.25, 0.45]} />
              <meshStandardMaterial
                color="#071724"
                emissive="#34d399"
                emissiveIntensity={0.5}
                metalness={0.36}
                roughness={0.28}
              />
            </mesh>
          )
        })}
      </group>

      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={15}
        minPolarAngle={Math.PI / 4.6}
        maxPolarAngle={Math.PI / 2.18}
        autoRotate
        autoRotateSpeed={0.26}
      />
    </>
  )
}

export function ClientFileFolder3D({
  activeSurface,
  onSurfaceChange,
  activeBuilds,
  liveSystems,
  premiumSound,
  visibleSurfaceKeys,
  marketLevel=0,
  marketBuildProgress=0,
  streamLevel=0,
  enterpriseLevel=0,
  routeCount=0,
  vitalityScore=0,
}: {
  activeSurface: DistrictKey
  onSurfaceChange: (key: DistrictKey) => void
  activeBuilds: Array<{ progress: number }>
  liveSystems: number
  premiumSound: boolean
  visibleSurfaceKeys?: DistrictKey[]
  marketLevel?: number
  marketBuildProgress?: number
  streamLevel?: number
  enterpriseLevel?: number
  routeCount?: number
  vitalityScore?: number
}) {
  const districts = useMemo<District[]>(
    () => [
      { key: 'command', label: 'Command Citadel', tone: 'sky' },
      { key: 'builds', label: 'Construction', tone: 'violet' },
      { key: 'business', label: 'Market', tone: 'emerald' },
      { key: 'enterprise', label: 'Expansion', tone: 'amber' },
      ...(premiumSound ? [{ key: 'sound' as const, label: 'Sound Room', tone: 'rose' as const }] : []),
    ],
    [premiumSound],
  ).filter(district=>!visibleSurfaceKeys||visibleSurfaceKeys.includes(district.key))

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-sky-300/15 bg-[#020711]/80 shadow-[0_24px_70px_rgba(2,8,23,.5)] backdrop-blur-xl">
      <div className="flex flex-col gap-2 border-b border-white/10 bg-[linear-gradient(90deg,rgba(14,165,233,.08),rgba(139,92,246,.05),rgba(52,211,153,.05))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">4D File Folder · Persistent Business World</p>
          <p className="mt-1 text-xs font-bold text-white">Your operating base changes as systems are designed, supplied, constructed, commissioned, used and expanded through real business activity.</p>
        </div>
        <p className="text-[9px] leading-4 text-slate-300">Drag to inspect · tap a district · construction persists through time · live systems remain usable</p>
      </div>

      <div className="relative h-[360px] sm:h-[430px]">
        <Canvas camera={{ position: [0, 7.1, 10.5], fov: 48 }} dpr={[1, 1.6]}>
          <Scene
            districts={districts}
            activeSurface={activeSurface}
            onSurfaceChange={onSurfaceChange}
            activeBuilds={activeBuilds}
            liveSystems={liveSystems}
            marketLevel={marketLevel}
            marketBuildProgress={marketBuildProgress}
            streamLevel={streamLevel}
            enterpriseLevel={enterpriseLevel}
            routeCount={routeCount}
            vitalityScore={vitalityScore}
          />
        </Canvas>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {districts.map((district) => {
            const active = district.key === activeSurface
            const color = COLORS[district.tone]
            return (
              <button
                key={district.key}
                type="button"
                onClick={() => onSurfaceChange(district.key)}
                className="pointer-events-auto rounded-xl border bg-[#030914]/86 px-2 py-2 text-left backdrop-blur-md"
                style={{ borderColor: active ? color : 'rgba(255,255,255,.1)' }}
              >
                <span className="block text-[8px] font-black uppercase tracking-[0.08em]" style={{ color }}>
                  {district.label}
                </span>
                <span className="mt-0.5 block text-[8px] text-slate-300">{active ? 'Operating now' : 'Enter district'}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

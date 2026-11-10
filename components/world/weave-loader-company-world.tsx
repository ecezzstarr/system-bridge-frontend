'use client'

import { Box, Blocks, Cog, Layers3, Network, TrendingUp, Users, Wrench } from 'lucide-react'

type LoaderRole = 'visitor' | 'agent' | 'bridger' | 'client' | 'admin'
type Props = {
  role: LoaderRole
  destination: string
  title: string
  ready: boolean
  lesson: number
  lessons: number
  flame: boolean
}

const departments: Record<LoaderRole, { name: string; description: string }> = {
  visitor: { name: 'Open World · Presence', description: 'Discover the company and its working systems' },
  agent: { name: 'Stability · Agent', description: 'Products, customers and distribution' },
  bridger: { name: 'Hope · Bridger', description: 'Prospects, conversations and Client crossings' },
  client: { name: 'Dream Lovely · Client', description: 'Your File Folder, systems and customers' },
  admin: { name: 'A Time · Administrations', description: 'Company operations, records and verification' },
}

const districts = [
  { label: 'Systems', icon: Layers3 },
  { label: 'Modules', icon: Box },
  { label: 'Tools', icon: Wrench },
  { label: 'People', icon: Users },
  { label: 'Operations', icon: Cog },
  { label: 'Expansion', icon: TrendingUp },
] as const

function Pavilion({ x, y, index }: { x: number; y: number; index: number }) {
  return <g transform={'translate(' + x + ' ' + y + ')'} data-weave-loader-district={districts[index].label}>
    <ellipse cx="0" cy="36" rx="58" ry="15" fill="#113552" opacity=".20" />
    <path d="M-48 23 L-2 4 L50 23 L6 43 Z" fill="url(#wl-platform)" stroke="#b18b48" strokeWidth="2.5" />
    <path d="M-48 23 L6 43 L6 52 L-48 32Z" fill="#f2e8d4" stroke="#b18b48" strokeWidth="1.5"/>
    <path d="M6 43 L50 23 L50 33 L6 52Z" fill="#c6a66d" stroke="#b18b48" strokeWidth="1.5" />
    <path d="M-35 20 L-35 -27 L1 -43 L38 -25 L38 21 L1 38 Z" fill="url(#wl-glass)" stroke="#d6ab57" strokeWidth="2.5" />
    <path d="M1 -43 L1 38 M-35 -27 L1 -12 L38 -25 M-35 4 L1 19 L38 4" stroke="#bd9555" strokeWidth="1.6" fill="none"/>
    <path d="M-42 -31 L1 -53 L45 -32 L1 -12 Z" fill="url(#wl-roof)" stroke="#b5893c" strokeWidth="2.5"/>
    <path d="M-42 -31 L1 -12 L1 -7 L-42 -26Z" fill="#d1b47e"/>
    <path d="M1 -12 L45 -32 L45 -27 L1 -7Z" fill="#b4873d" />
    {[0, 1, 2].map(i => <g key={i}>
      <path d={'M' + (-26 + i*10) + ' ' + (-19+i*4) + ' v22'} stroke="#fff9e8" strokeWidth="2.8" opacity=".75" />
      <path d={'M' + (13+i*7) + ' ' + (-19+i*-3) + ' v31'} stroke="#fff5d5" strokeWidth="1.6" opacity=".7" />
    </g>)}
    {index === 0 && <g fill="#c79c4b" stroke="#80602e" strokeWidth="1">
      <rect x="-29" y="-8" width="19" height="25" rx="2"/>
      <path d="M-24 -3 v15 M-18 -3 v15 M-12 -3 v15" stroke="#fff6d7"/>
    </g>}
    {index === 1 && <g stroke="#b4873d" strokeWidth="3">
      <path d="M-25 13 v-17 M-13 13 v-27 M-1 13 v-38" />
    </g>}
    {index === 2 && <g fill="none" stroke="#bb8a3e" strokeWidth="3">
      <circle cx="-18" cy="-2" r="12"/><circle cx="-18" cy="-2" r="4"/>
    </g>}
    {index === 3 && <g stroke="#ab7f3b" strokeWidth="3" fill="#fdf2cb">
      <circle cx="-20" cy="0" r="5"/><circle cx="-8" cy="-4" r="5"/>
      <path d="M-29 15 q8 -14 17 0 M-15 13 q8 -14 17 0" />
    </g>}
    {index === 4 && <g fill="#eccd91" stroke="#a57939" strokeWidth="1.5">
      <rect x="-24" y="-13" width="19" height="19" rx="2"/><rect x="-18" y="7" width="20" height="13" rx="2"/>
    </g>}
    {index === 5 && <g fill="none" stroke="#af823d" strokeWidth="3"><path d="M-27 15 L-13 0 L-2 7 L18 -17 M11 -17 h7 v8"/></g>}
    <circle cx="-42" cy="23" r="5" fill="#78965a"/><circle cx="43" cy="23" r="5" fill="#78965a"/>
  </g>
}

/**
 * Shared visual stage for the ONE WEAVE navigation/boot loader. This represents
 * company systems; it never grants File Folder ownership or fabricates activity.
 * No WebGL or remote image dependency is required for a reliable phone entrance.
 */
export function WeaveLoaderCompanyWorld({ role, destination, title, ready, lesson, lessons, flame }: Props) {
  const department = departments[role]
  const points = [
    { x: 116, y: 125 }, { x: 380, y: 73 }, { x: 642, y: 125 },
    { x: 116, y: 282 }, { x: 380, y: 320 }, { x: 642, y: 282 },
  ]

  return <div className="weave-loader-company-world" data-weave-company-world="shared"
    data-loader-scene-tone={flame ? 'burning-river' : 'daylight'}>
    <div className="weave-loader-world-identity">
      <div className="weave-loader-world-crest" aria-hidden="true"><Network size={16}/></div>
      <p className="weave-loader-world-overline">WEAVE OF PRESENCE · COMPANY OF TIME</p>
      <h1 className="weave-loader-world-title">{title}</h1>
      <p className="weave-loader-world-department">{department.name} <span aria-hidden="true">·</span> {department.description}</p>
    </div>

    <div className="weave-loader-architecture" aria-label="An illustration of interconnected WEAVE working districts">
      <svg viewBox="0 0 760 380" preserveAspectRatio="xMidYMid meet" role="img"
        aria-label="Six connected working districts around the WEAVE System Switch gateway"
        xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="wl-sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#eef8ff"/><stop offset="1" stopColor="#bddbe8"/></linearGradient>
          <linearGradient id="wl-water" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#83bfd7"/><stop offset=".55" stopColor="#c2e5e9"/><stop offset="1" stopColor="#367b9b"/></linearGradient>
          <linearGradient id="wl-platform" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffdf5"/><stop offset="1" stopColor="#c2af8e"/></linearGradient>
          <linearGradient id="wl-roof" x1="0" y1="0" x2="1" y2=".8"><stop stopColor="#fffdfa"/><stop offset=".7" stopColor="#ebdabb"/><stop offset="1" stopColor="#c9a76d"/></linearGradient>
          <linearGradient id="wl-glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffcf1" stopOpacity=".96"/><stop offset=".6" stopColor="#d4ecf1" stopOpacity=".93"/><stop offset="1" stopColor="#92bbc9" stopOpacity=".88"/></linearGradient>
          <linearGradient id="wl-gold" x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff1b6"/><stop offset=".5" stopColor="#c79a48"/><stop offset="1" stopColor="#f9d98b"/></linearGradient>
        </defs>
        <rect width="760" height="380" rx="20" fill="url(#wl-sky)"/>
        <g fill="#fafbf8" opacity=".88">
          {[0, 37, 76, 119, 163, 208, 261, 488, 543, 585, 624, 673, 716].map((x,i)=>
            <rect key={x} x={x} y={90-(i%4)*11} width={22+(i%3)*7} height={100+(i%4)*11} rx="2" />)}
        </g>
        <path d="M0 178 Q380 122 760 178 V380 H0Z" fill="#e6e9de"/>
        <ellipse cx="380" cy="233" rx="354" ry="148" fill="url(#wl-water)" stroke="#e7d6a7" strokeWidth="6"/>
        <ellipse cx="380" cy="233" rx="326" ry="126" fill="none" stroke="#f4dd9b" strokeWidth="3" opacity=".9"/>
        <ellipse cx="380" cy="233" rx="263" ry="91" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity=".65"/>
        <g strokeLinecap="round">
          {points.map((p,i)=><g key={i}>
            <path d={'M380 211 L'+p.x+' '+(p.y+15)} stroke="#fff5ce" strokeWidth="13" opacity=".7" />
            <path d={'M380 211 L'+p.x+' '+(p.y+15)} stroke="#b18c43" strokeWidth="6" />
          </g>)}
        </g>
        {points.map((point,i)=><Pavilion key={i} x={point.x} y={point.y} index={i}/>)}
        <g transform="translate(380 218)">
          <ellipse rx="94" ry="40" cy="35" fill="#234f6b" opacity=".27"/>
          <ellipse rx="96" ry="42" cy="26" fill="url(#wl-platform)" stroke="#b58a40" strokeWidth="5"/>
          <ellipse rx="75" ry="31" cy="20" fill="#fffaf0" stroke="#dfc17c" strokeWidth="2"/>
          <path d="M-49 10 V-49 Q-49 -61 -37 -61 H-7 L6 -74 H47 Q57 -74 57 -62 V6 Q57 18 43 19 H-36 Q-49 19 -49 10Z"
            fill="url(#wl-gold)" stroke="#926929" strokeWidth="4"/>
          <path d="M-44 -42 H49 V18 H-44Z" fill="#f4f4ee" stroke="#d9c9aa" strokeWidth="3"/>
          <path d="M-42 -28 L48 -33 L54 22 L-42 28Z" fill="#fefcf5" stroke="#bd9551" strokeWidth="3"/>
          <path d="M-22 -3 L-7 8 L21 -15" fill="none" stroke="#c89b43" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
          <text x="0" y="48" textAnchor="middle" fontSize="12" fontWeight="700" fill="#85602f" letterSpacing="2">SYSTEM SWITCH</text>
        </g>
        <g fill="#e9c76e" opacity=".75">
          <circle cx="45" cy="310" r="3"/><circle cx="715" cy="310" r="3"/>
          <circle cx="72" cy="70" r="2"/><circle cx="685" cy="75" r="2"/>
        </g>
      </svg>
    </div>

    <div className="weave-loader-world-districts" aria-label="Company operating districts">
      {districts.map(({label,icon:Icon},index)=>
        <div key={label} className={'weave-loader-world-district '+(index===4?'weave-loader-world-district-selected':'')}>
          <Icon size={15} strokeWidth={1.8} aria-hidden="true"/>
          <span>{label}</span>
        </div>)}
    </div>
    <div className="weave-loader-world-readiness">
      <div className="weave-loader-readiness-title"><Blocks size={16} aria-hidden="true"/>
        <span>Systems in Motion</span>
        <span className="weave-loader-readiness-state" data-ready={ready?'true':'false'}>
          {ready?'Prepared':'Preparing'}
        </span>
      </div>
      <div className="weave-loader-world-readiness-row"><span>Destination</span><strong>{destination}</strong></div>
      <div className="weave-loader-world-readiness-row"><span>Guidance</span><strong>{lesson} of {lessons} lessons</strong></div>
    </div>
  </div>
}

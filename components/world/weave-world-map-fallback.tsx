'use client'

import {useMemo} from 'react'
import type {PublicWorldDomain} from '@/lib/weave-open-world-domains'

/** A navigable, drawn world while WebGL starts or when phone GPU is unavailable.
 * Uses the real server domain list; never invents castles or client businesses.
 * The main renderer remains the three-dimensional world.
 */
export function WeaveWorldMapFallback({domains,onSelect}:{
  domains:PublicWorldDomain[]
  onSelect:(id:string)=>void
}){
  const anchor=domains[0]?.location
  const colors:Record<string,{stone:string;roof:string;trim:string}>={
    standard:{stone:'#9aaec3',roof:'#31485c',trim:'#dce5e6'},
    pro:{stone:'#ced8e5',roof:'#456b87',trim:'#eaf6ff'},
    premium:{stone:'#d3bba2',roof:'#8c6345',trim:'#ffe1ad'},
    plus:{stone:'#f3f0e6',roof:'#c99e4a',trim:'#fff5cb'},
    unclassified:{stone:'#9ea4aa',roof:'#536378',trim:'#d6dbe1'},
  }
  const positions=useMemo(()=>domains.map((d,i)=>{
    const dx=d.location.x-(anchor?.x||0)
    const dz=d.location.z-(anchor?.z||0)
    return {d,left:Math.min(88,Math.max(12,50+dx*1.3-dz*.45)),
      top:Math.min(79,Math.max(19,52+dz*.66+dx*.18)),order:Math.round(d.location.z),i}
  }).sort((a,b)=>a.top-b.top),[domains,anchor?.x,anchor?.z])
  return <div className="absolute inset-0 overflow-hidden bg-[#24415c]" data-weave-open-world-visual-fallback="real-domains"
    aria-label="WEAVE land preview showing actual registered Client castles">
    <svg aria-hidden="true" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="weaveLandSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#193453"/><stop offset="42%" stopColor="#6b8ba2"/><stop offset="100%" stopColor="#dbc59f"/>
        </linearGradient>
        <linearGradient id="weaveLandGround" x1="0" y1="0" x2=".4" y2="1">
          <stop stopColor="#577461"/><stop offset=".5" stopColor="#3d634f"/><stop offset="1" stopColor="#263e34"/>
        </linearGradient>
        <linearGradient id="weaveLandWater" x1="0" x2=".6" y1="0" y2="1">
          <stop stopColor="#49b9d7"/><stop offset=".45" stopColor="#0d698e"/><stop offset="1" stopColor="#083956"/>
        </linearGradient>
        <linearGradient id="weaveLandFire" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#f9bd71" stopOpacity=".05"/><stop offset=".4" stopColor="#ffdb88"/><stop offset=".7" stopColor="#e98434"/><stop offset="1" stopColor="#fff1bf" stopOpacity=".15"/>
        </linearGradient>
        <radialGradient id="weaveLandLight"><stop stopColor="#ffe5a5" stopOpacity=".8"/><stop offset="1" stopColor="#ffdfa3" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="1000" height="700" fill="url(#weaveLandSky)"/>
      <circle cx="760" cy="95" r="245" fill="url(#weaveLandLight)"/>
      <path d="M0 280L100 194 177 259 289 143 409 276 537 157 670 283 781 183 916 271 1000 192V425H0Z" fill="#3a5364" opacity=".8"/>
      <path d="M0 335L178 249 310 315 467 231 590 318 740 224 920 302 1000 255V700H0Z" fill="#406153"/>
      <path d="M0 384Q205 326 417 371T1000 350V700H0Z" fill="url(#weaveLandGround)"/>
      <path d="M-60 552C167 443 259 578 425 516S719 367 1070 498" fill="none" stroke="#193d55" strokeWidth="116" opacity=".75"/>
      <path d="M-60 552C167 443 259 578 425 516S719 367 1070 498" fill="none" stroke="url(#weaveLandWater)" strokeWidth="99"/>
      <path d="M-60 541C167 432 259 567 425 505S719 357 1070 488" fill="none" stroke="#8adcf0" strokeWidth="3" opacity=".75"/>
      <path d="M-50 574C170 463 260 598 441 536S733 388 1060 522" fill="none" stroke="#79b2be" strokeWidth="2" opacity=".52"/>
      <path d="M-80 541C135 460 277 548 440 502S754 393 1058 479" fill="none" stroke="url(#weaveLandFire)" strokeWidth="9" opacity=".9"/>
      <path d="M0 677L1000 585" stroke="#aaa186" strokeWidth="15" opacity=".42"/>
      <path d="M155 700L646 353" stroke="#a8a28d" strokeWidth="9" opacity=".46"/>
      {Array.from({length:44},(_,i)=>{
        const x=(i*227+47)%1030,y=300+(i*139)%370
        if(Math.abs(y-(540-Math.sin(x*.009)*42))<37)return null
        return <g key={i} transform={'translate('+x+' '+y+')'} opacity={.48+(i%4)*.1}>
          <ellipse cy="7" rx="15" ry="6" fill="#1b342b" opacity=".35"/>
          <path d="M-11 2L0 -30L13 3Z" fill={i%2?'#1a4738':'#35634b'}/>
          <path d="M-9 -5L0 -39L11 -5Z" fill="#33664f"/>
        </g>
      })}
    </svg>
    {positions.map(({d,left,top})=>{
      const c=colors[d.tier]||colors.unclassified
      return <button type="button" key={d.domainId}
        onClick={()=>onSelect(d.domainId)} aria-label={'Enter '+d.publicName+' castle'}
        className="absolute flex -translate-x-1/2 -translate-y-2/3 flex-col items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200"
        style={{left:String(left)+'%',top:String(top)+'%',zIndex:Math.round(top)}}
        data-open-world-domain={d.domainId}>
        <svg viewBox="0 0 116 132" aria-hidden="true"
          className="h-[clamp(100px,23svh,168px)] w-[clamp(94px,23svh,156px)] drop-shadow-[0_10px_10px_rgba(0,0,0,.5)]">
          <ellipse cx="58" cy="120" rx="50" ry="10" fill="#132b30" opacity=".5"/>
          <path d="M10 94L56 111L104 89L104 113L56 128L10 110Z" fill="#6d746c"/>
          <path d="M16 40L58 22L101 40V101L57 118L16 99Z" fill={c.stone}/>
          <path d="M16 40L57 12L102 39L57 59Z" fill={c.roof}/>
          <path d="M16 40L57 59V118L16 99Z" fill="#203d50" opacity=".26"/>
          <path d="M42 76L57 71L72 77V111L42 115Z" fill="#173145"/>
          <path d="M51 91L57 89L63 91V112L51 113Z" fill={d.customerDoor.open?'#f3cb6f':'#0b2331'}/>
          {[17,99].map((x,i)=><g key={i}>
            <rect x={x-11} y="35" width="22" height="67" fill={c.stone} stroke={c.roof} strokeWidth="2"/>
            <path d={'M'+(x-14)+' 35L'+x+' 7L'+(x+14)+' 35Z'} fill={c.roof}/>
            <rect x={x-4} y="62" width="8" height="12" fill="#6ab4c9"/>
          </g>)}
          <path d="M47 57L56 54L65 57L65 67L47 66Z" fill={c.trim}/>
          {d.activity.operatingSystems>0&&<circle cx="58" cy="6" r="5" fill="#ffda73"/>}
          {d.building&&<path d="M9 88L107 88M9 99L107 99M31 32V110M83 32V110" fill="none" stroke="#f3cb6a" strokeWidth="2" strokeDasharray="6 5"/>}
        </svg>
        <span className="max-w-36 truncate rounded border border-amber-200/35 bg-[#092136]/90 px-2 py-1 text-[11px] font-bold text-amber-50 shadow-xl">{d.publicName}</span>
      </button>
    })}
    {domains.length===0&&<p className="absolute bottom-16 left-1/2 w-max max-w-[90%] -translate-x-1/2 rounded-lg bg-[#081b30]/90 px-3 py-2 text-xs text-amber-100">No verified Client castles yet</p>}
  </div>
}

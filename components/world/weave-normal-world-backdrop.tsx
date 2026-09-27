'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { usePresenceCamera } from '@/components/world/presence-camera'

const DISTRICTS=[
  ['Bridge','Bridge'],
  ['System Switch','System Switch'],
  ['Presence','Presence'],
  ['Enterprise','Enterprise'],
  ['Support','Support'],
  ['Institution','Institution'],
] as const

function FlameBrazier({side}:{side:'left'|'right'}){
  const edge=side==='left'?'left-[4%]':'right-[4%]'
  return <div className={`absolute bottom-[20%] hidden h-36 w-20 md:block ${edge} [transform:translateZ(-8px)]`}>
    <div className="absolute bottom-0 left-1/2 h-9 w-16 -translate-x-1/2 rounded-b-2xl border border-amber-100/10 bg-[linear-gradient(180deg,#6f4a25,#21140b)] shadow-[0_12px_28px_rgba(0,0,0,.45)]"/>
    <div className="absolute bottom-8 left-1/2 h-5 w-12 -translate-x-1/2 rounded-full border border-amber-200/15 bg-[#130b06]"/>
    <motion.div
      className="absolute bottom-11 left-1/2 h-16 w-9 -translate-x-1/2 origin-bottom rounded-[62%_38%_58%_42%/72%_56%_44%_28%] bg-[radial-gradient(circle_at_50%_72%,#fff4c4_0_12%,#fbbf24_34%,#f97316_64%,rgba(239,68,68,.1)_88%)] blur-[.2px] shadow-[0_0_32px_rgba(251,146,60,.45)]"
      animate={{scaleX:[.82,1.08,.9],scaleY:[.94,1.12,.96],rotate:[-2,2,-1]}}
      transition={{duration:1.8,repeat:Infinity,ease:'easeInOut'}}
    />
    <div className="absolute bottom-8 left-1/2 h-20 w-24 -translate-x-1/2 rounded-full bg-orange-400/10 blur-2xl"/>
  </div>
}

export function WeaveNormalWorldBackdrop() {
  const { scene,moving,lastOutput }=usePresenceCamera()
  const reduceMotion=useReducedMotion()
  const actionFocus=moving&&lastOutput?.type==='action'

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#120b07] [perspective:1500px] [transform-style:preserve-3d]"
      aria-hidden="true"
      initial={false}
      animate={reduceMotion?{x:0,y:0,rotateY:0,rotateX:0,scale:1}:{
        x:-scene.camera.x*.28,
        y:-scene.camera.y*.22,
        rotateY:-scene.camera.yaw*.13,
        rotateX:scene.camera.pitch*.11,
        scale:scene.camera.zoom+(actionFocus?.004:0),
      }}
      transition={{duration:reduceMotion?0:(moving?.46:.75),ease:[.22,1,.36,1]}}
      style={{transformOrigin:'50% 48%',willChange:'transform'}}
      data-camera-scene={scene.key}
      data-camera-level={scene.level}
      data-weave-world-material="stone-bronze-fire-water"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_5%,rgba(255,204,128,.24),transparent_24%),radial-gradient(circle_at_18%_36%,rgba(249,115,22,.10),transparent_23%),radial-gradient(circle_at_82%_34%,rgba(251,191,36,.08),transparent_25%),linear-gradient(180deg,#3a1d0f_0%,#17100b_28%,#0a0d0e_62%,#060707_100%)]"/>

      <div className="absolute inset-x-0 top-0 h-[42%] opacity-60 [background-image:linear-gradient(100deg,transparent_0_16%,rgba(255,224,178,.04)_18%,transparent_20%_47%,rgba(255,224,178,.035)_50%,transparent_53%_80%,rgba(255,224,178,.04)_82%,transparent_84%)]"/>

      <svg className="absolute inset-x-0 bottom-[8%] h-[88%] w-full [transform:translateZ(-70px)_scale(1.055)] [transform-origin:center_bottom]" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#493224"/><stop offset="55%" stopColor="#241a14"/><stop offset="100%" stopColor="#0b0b0b"/></linearGradient>
          <linearGradient id="bronze" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6d4320"/><stop offset="42%" stopColor="#d6a45f"/><stop offset="72%" stopColor="#8b5a2b"/><stop offset="100%" stopColor="#3f2818"/></linearGradient>
          <linearGradient id="water" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#203f47" stopOpacity=".08"/><stop offset="42%" stopColor="#7dd3fc" stopOpacity=".28"/><stop offset="58%" stopColor="#fed7aa" stopOpacity=".2"/><stop offset="100%" stopColor="#203f47" stopOpacity=".06"/></linearGradient>
          <linearGradient id="fire" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#fff7cc"/><stop offset="36%" stopColor="#fbbf24"/><stop offset="68%" stopColor="#f97316"/><stop offset="100%" stopColor="#ef4444" stopOpacity=".15"/></linearGradient>
          <filter id="warmGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        <path d="M0 300 C130 260 214 278 315 242 C432 201 505 210 612 260 L612 560 L0 560Z" fill="#0d0e0d" opacity=".82"/>
        <path d="M988 260 C1102 212 1180 205 1294 242 C1404 278 1478 254 1600 304 L1600 560 L988 560Z" fill="#0d0e0d" opacity=".82"/>
        <path d="M610 226 L680 160 L722 220 L780 112 L831 202 L896 142 L990 238 L990 540 L610 540Z" fill="#11110f" stroke="#d6a45f" strokeOpacity=".12"/>

        <path d="M80 470 L80 250 Q190 154 300 250 L300 470Z" fill="url(#stone)" stroke="#d6a45f" strokeOpacity=".22" strokeWidth="4"/>
        <path d="M130 470 L130 302 Q190 248 250 302 L250 470Z" fill="#0d0d0c" stroke="#b77a3c" strokeOpacity=".28" strokeWidth="3"/>
        <path d="M1300 470 L1300 250 Q1410 154 1520 250 L1520 470Z" fill="url(#stone)" stroke="#d6a45f" strokeOpacity=".22" strokeWidth="4"/>
        <path d="M1350 470 L1350 302 Q1410 248 1470 302 L1470 470Z" fill="#0d0d0c" stroke="#b77a3c" strokeOpacity=".28" strokeWidth="3"/>

        <path d="M332 448 L332 286 Q442 196 552 286 L552 448Z" fill="url(#stone)" stroke="#d6a45f" strokeOpacity=".18" strokeWidth="4"/>
        <path d="M1048 448 L1048 286 Q1158 196 1268 286 L1268 448Z" fill="url(#stone)" stroke="#d6a45f" strokeOpacity=".18" strokeWidth="4"/>

        <path d="M235 300 C390 250 520 250 658 310" fill="none" stroke="url(#bronze)" strokeWidth="18" opacity=".52"/>
        <path d="M942 310 C1085 252 1215 250 1368 300" fill="none" stroke="url(#bronze)" strokeWidth="18" opacity=".52"/>
        <path d="M502 326 C612 280 704 274 800 310 C894 275 986 280 1098 326" fill="none" stroke="#7b5a3b" strokeWidth="10" opacity=".52"/>

        <path d="M455 454 C570 406 665 423 800 482 C938 423 1034 407 1148 454" fill="none" stroke="url(#water)" strokeWidth="15" opacity=".72"/>
        <path d="M302 520 C520 452 667 500 800 550 C933 500 1083 452 1300 520" fill="none" stroke="url(#water)" strokeWidth="9" opacity=".46"/>

        <ellipse cx="800" cy="492" rx="170" ry="52" fill="#091113" stroke="#d6a45f" strokeOpacity=".2" strokeWidth="3"/>
        <ellipse cx="800" cy="486" rx="142" ry="38" fill="#16353a" opacity=".32"/>
        <ellipse cx="800" cy="486" rx="120" ry="26" fill="url(#water)" opacity=".72"/>

        <rect x="742" y="292" width="116" height="190" rx="50" fill="#17110d" stroke="url(#bronze)" strokeWidth="5" opacity=".88"/>
        <path d="M800 468 C758 430 770 393 803 366 C840 335 824 302 803 266 C856 300 862 350 835 382 C813 407 832 440 800 468Z" fill="url(#fire)" opacity=".88" filter="url(#warmGlow)"/>
        <path d="M800 468 C834 430 822 402 792 381 C758 356 774 325 801 292 C755 315 743 359 766 389 C786 416 770 445 800 468Z" fill="#fff1b9" opacity=".52" filter="url(#warmGlow)"/>

        <path d="M0 604 C248 558 424 614 603 592 C741 574 858 574 997 594 C1170 619 1361 558 1600 606 L1600 900 L0 900Z" fill="#090909"/>
        <path d="M0 626 C260 580 430 636 604 613 C750 594 858 596 1002 616 C1186 642 1360 581 1600 630" fill="none" stroke="#b9783e" strokeOpacity=".16" strokeWidth="3"/>
        <path d="M0 674 C250 630 448 676 620 658 C780 641 842 642 995 660 C1167 680 1362 632 1600 676" fill="none" stroke="#7dd3fc" strokeOpacity=".08" strokeWidth="2"/>
      </svg>

      <div className="absolute left-1/2 top-[40%] h-52 w-52 -translate-x-1/2 rounded-full bg-orange-400/[.06] blur-3xl"/>
      <div className="absolute inset-x-[14%] bottom-[13%] h-24 rounded-[50%] bg-amber-200/[.025] blur-2xl"/>

      <div
        className="absolute -bottom-[45%] left-1/2 h-[72%] w-[165%] origin-bottom opacity-[.13]"
        style={{
          transform:'translateX(-50%) perspective(1000px) rotateX(71deg)',
          backgroundImage:'linear-gradient(rgba(214,164,95,.12) 1px, transparent 1px),linear-gradient(90deg,rgba(214,164,95,.09) 1px,transparent 1px)',
          backgroundSize:'104px 104px',
          maskImage:'linear-gradient(to top,black,transparent 78%)',
        }}
      />

      {!reduceMotion&&<><FlameBrazier side="left"/><FlameBrazier side="right"/></>}

      <div className="absolute inset-x-[5%] bottom-[21%] hidden items-end justify-between gap-2 md:flex [transform:translateZ(-2px)]">
        {DISTRICTS.map(([label,district],index)=>{
          const active=scene.district===district
          return <motion.div
            key={district}
            initial={false}
            animate={reduceMotion?undefined:{y:active?-7:0,opacity:active?.96:.33,scale:active?1.04:.98}}
            transition={{duration:.52,ease:[.22,1,.36,1]}}
            className="relative flex min-w-0 flex-1 flex-col items-center"
          >
            <div className={`h-8 w-[2px] rounded-full ${active?'bg-gradient-to-t from-amber-200/80 to-orange-300/10':'bg-gradient-to-t from-stone-500/25 to-transparent'}`}/>
            <div className={`mt-1 h-2 w-5 rounded-t-full border ${active?'border-amber-200/40 bg-amber-300/20 shadow-[0_0_16px_rgba(251,191,36,.35)]':'border-white/10 bg-black/20'}`}/>
            <span className={`mt-2 rounded-full border px-2 py-1 text-center text-[6px] font-black uppercase tracking-[.18em] ${active?'border-amber-200/20 bg-[#24160d]/72 text-amber-100':'border-white/[.05] bg-black/15 text-white/30'}`}>{label}</span>
            {active&&<span className="mt-1 text-[5px] font-bold uppercase tracking-[.16em] text-orange-200/65">{scene.level}</span>}
            <span className="sr-only">District {index+1}</span>
          </motion.div>
        })}
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,4,.72),transparent_20%,transparent_80%,rgba(5,5,4,.72)),linear-gradient(180deg,rgba(35,16,8,.05),transparent_50%,rgba(4,4,4,.68))]"/>
    </motion.div>
  )
}

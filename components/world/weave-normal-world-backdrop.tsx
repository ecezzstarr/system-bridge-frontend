'use client'

import { motion } from 'framer-motion'
import { usePresenceCamera } from '@/components/world/presence-camera'

export function WeaveNormalWorldBackdrop() {
  const { scene,moving,lastOutput }=usePresenceCamera()
  const actionFocus = moving && lastOutput?.type === 'action'

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 overflow-hidden bg-[#020815] [perspective:1200px] [transform-style:preserve-3d]"
      aria-hidden="true"
      initial={false}
      animate={{
        x: -scene.camera.x * 0.42,
        y: -scene.camera.y * 0.32,
        rotateY: -scene.camera.yaw * 0.22,
        rotateX: scene.camera.pitch * 0.18,
        scale: scene.camera.zoom + (actionFocus ? 0.006 : 0),
      }}
      transition={{ duration: moving ? 0.46 : 0.72, ease:[0.22,1,0.36,1] }}
      style={{ transformOrigin:'50% 46%', willChange:'transform' }}
      data-camera-scene={scene.key}
      data-camera-level={scene.level}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(245,158,11,0.13),transparent_24%),radial-gradient(circle_at_18%_44%,rgba(14,165,233,0.14),transparent_28%),radial-gradient(circle_at_82%_48%,rgba(59,130,246,0.13),transparent_28%),linear-gradient(180deg,#020815_0%,#061426_50%,#020812_100%)]" />

      <div className="absolute inset-0 opacity-60 [transform:translateZ(-90px)_scale(1.08)] [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,.85)_0_1px,transparent_1.5px),radial-gradient(circle_at_72%_18%,rgba(125,211,252,.85)_0_1px,transparent_1.5px),radial-gradient(circle_at_38%_52%,rgba(255,255,255,.55)_0_1px,transparent_1.5px),radial-gradient(circle_at_88%_64%,rgba(250,204,21,.5)_0_1px,transparent_1.5px)] [background-size:190px_190px,260px_260px,230px_230px,310px_310px]" />

      <div className="absolute left-1/2 top-[30%] h-[30rem] w-[66rem] -translate-x-1/2 rounded-full bg-sky-400/[0.055] blur-[120px] animate-pulse motion-reduce:animate-none" />
      <div className="absolute left-[8%] top-[36%] h-36 w-72 rounded-full bg-sky-300/[0.035] blur-[70px] [transform:translateZ(-35px)]" />
      <div className="absolute right-[6%] top-[42%] h-40 w-80 rounded-full bg-amber-300/[0.025] blur-[80px] [transform:translateZ(-20px)]" />

      <svg className="absolute inset-x-0 bottom-0 h-[82%] w-full [transform:translateZ(-35px)_scale(1.035)] [transform-origin:center_bottom]" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="nwBlue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0"/>
            <stop offset="28%" stopColor="#38bdf8" stopOpacity=".78"/>
            <stop offset="68%" stopColor="#e0f2fe" stopOpacity=".94"/>
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="nwGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0"/>
            <stop offset="30%" stopColor="#fbbf24" stopOpacity=".70"/>
            <stop offset="70%" stopColor="#fef3c7" stopOpacity=".92"/>
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="nwGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17314c" stopOpacity=".94"/>
            <stop offset="52%" stopColor="#091827" stopOpacity=".98"/>
            <stop offset="100%" stopColor="#02070d" stopOpacity="1"/>
          </linearGradient>
          <radialGradient id="nwCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity=".94"/>
            <stop offset="30%" stopColor="#bae6fd" stopOpacity=".72"/>
            <stop offset="66%" stopColor="#fbbf24" stopOpacity=".22"/>
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/>
          </radialGradient>
          <filter id="nwGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <path d="M48 372 C170 302 282 312 397 375 C328 423 187 444 67 421Z" fill="url(#nwGround)" stroke="#38bdf8" strokeOpacity=".16"/>
        <path d="M1180 366 C1307 301 1453 318 1552 390 C1456 433 1302 442 1192 412Z" fill="url(#nwGround)" stroke="#fbbf24" strokeOpacity=".15"/>
        <path d="M479 447 C645 348 960 348 1122 450 C1034 540 615 544 479 447Z" fill="url(#nwGround)" stroke="#bae6fd" strokeOpacity=".18"/>

        <g fill="#14324d" stroke="#7dd3fc" strokeOpacity=".34">
          <path d="M143 389l13-108 13 108z"/><path d="M193 394l10-69 10 69z"/><path d="M247 391l14-138 14 138z"/>
          <path d="M1270 390l13-100 13 100z"/><path d="M1341 391l10-74 10 74z"/><path d="M1414 391l15-137 15 137z"/>
          <path d="M609 449l15-118 15 118z"/><path d="M690 440l12-84 12 84z"/><path d="M880 442l13-95 13 95z"/><path d="M968 452l15-130 15 130z"/>
        </g>

        <path d="M40 520 C246 433 365 489 520 535 C682 583 746 520 800 472" fill="none" stroke="url(#nwBlue)" strokeWidth="8" filter="url(#nwGlow)" opacity=".70">
          <animate attributeName="stroke-dasharray" values="28 24;10 12;28 24" dur="8s" repeatCount="indefinite"/>
        </path>
        <path d="M1560 514 C1368 430 1240 491 1087 537 C929 584 859 520 800 472" fill="none" stroke="url(#nwGold)" strokeWidth="7" filter="url(#nwGlow)" opacity=".62">
          <animate attributeName="stroke-dasharray" values="24 20;10 10;24 20" dur="9s" repeatCount="indefinite"/>
        </path>
        <path d="M224 687 C447 608 612 648 800 565 C992 648 1167 610 1385 687" fill="none" stroke="url(#nwBlue)" strokeWidth="4" filter="url(#nwGlow)" opacity=".42"/>

        <circle cx="800" cy="470" r="92" fill="url(#nwCore)" opacity=".46" filter="url(#nwGlow)"/>
        <path d="M800 555 C770 522 770 494 787 468 C809 437 812 405 801 367 C835 395 846 435 829 465 C815 491 817 522 800 555Z" fill="#38bdf8" opacity=".62" filter="url(#nwGlow)"/>
        <path d="M800 555 C830 522 830 494 813 468 C791 437 788 405 799 367 C765 395 754 435 771 465 C785 491 783 522 800 555Z" fill="#fbbf24" opacity=".46" filter="url(#nwGlow)"/>

        <path d="M0 708 C262 657 449 726 620 706 C792 684 938 676 1104 709 C1288 747 1439 681 1600 718 L1600 900 L0 900Z" fill="#020812" opacity=".98"/>
        <path d="M0 737 C276 692 449 756 617 733 C785 710 951 704 1114 738 C1288 777 1443 710 1600 741" fill="none" stroke="#38bdf8" strokeOpacity=".16" strokeWidth="3"/>
      </svg>

      <div
        className="absolute -bottom-[38%] left-1/2 h-[66%] w-[155%] origin-bottom opacity-[0.14]"
        style={{
          transform: 'translateX(-50%) perspective(900px) rotateX(68deg)',
          backgroundImage: 'linear-gradient(rgba(125,211,252,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,.13) 1px, transparent 1px)',
          backgroundSize: '76px 76px',
          maskImage: 'linear-gradient(to top, black, transparent 82%)',
        }}
      />
      <div className="absolute inset-x-0 bottom-[16%] h-28 bg-gradient-to-t from-sky-400/[0.035] to-transparent blur-2xl" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,21,.62),transparent_22%,transparent_78%,rgba(2,8,21,.62)),linear-gradient(180deg,rgba(2,8,21,.04),transparent_48%,rgba(2,8,21,.66))]" />
    </motion.div>
  )
}

'use client'

export function WeaveWorldBackdrop({ intensity = 'normal' }: { intensity?: 'soft' | 'normal' | 'event' }) {
  const opacity = intensity === 'soft' ? 'opacity-55' : intensity === 'event' ? 'opacity-100' : 'opacity-80'

  return (
    <div className={`pointer-events-none fixed inset-0 overflow-hidden bg-[#010711] ${opacity}`} aria-hidden="true">
      {/* deep sky */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_16%_44%,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_82%_42%,rgba(239,68,68,0.10),transparent_28%),linear-gradient(180deg,#010711_0%,#04111e_48%,#020913_100%)]" />

      {/* stars */}
      <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,.8)_0_1px,transparent_1.5px),radial-gradient(circle_at_70%_18%,rgba(125,211,252,.8)_0_1px,transparent_1.5px),radial-gradient(circle_at_34%_52%,rgba(255,255,255,.55)_0_1px,transparent_1.5px),radial-gradient(circle_at_88%_64%,rgba(248,113,113,.5)_0_1px,transparent_1.5px)] [background-size:190px_190px,260px_260px,230px_230px,310px_310px]" />

      {/* horizon glow */}
      <div className="absolute left-1/2 top-[37%] h-[30rem] w-[64rem] -translate-x-1/2 rounded-full bg-sky-400/[0.06] blur-[110px]" />

      {/* floating world + rivers */}
      <svg className="absolute inset-x-0 bottom-0 h-[78%] w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="worldRiverBlue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0" />
            <stop offset="25%" stopColor="#38bdf8" stopOpacity=".78" />
            <stop offset="70%" stopColor="#e0f2fe" stopOpacity=".95" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="worldRiverFire" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0" />
            <stop offset="25%" stopColor="#f97316" stopOpacity=".68" />
            <stop offset="70%" stopColor="#fde68a" stopOpacity=".92" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="worldGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10233a" stopOpacity=".9" />
            <stop offset="50%" stopColor="#07131f" stopOpacity=".95" />
            <stop offset="100%" stopColor="#02060d" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="worldFlameCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity=".95" />
            <stop offset="24%" stopColor="#7dd3fc" stopOpacity=".75" />
            <stop offset="62%" stopColor="#f97316" stopOpacity=".35" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
          <filter id="worldGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* distant floating terraces */}
        <path d="M55 396 C160 330 278 326 380 382 C315 425 195 444 72 430Z" fill="url(#worldGround)" stroke="#38bdf8" strokeOpacity=".12" />
        <path d="M1190 365 C1305 309 1458 329 1550 398 C1452 432 1313 440 1200 414Z" fill="url(#worldGround)" stroke="#fb7185" strokeOpacity=".12" />
        <path d="M505 448 C672 367 938 366 1094 455 C1008 533 634 535 505 448Z" fill="url(#worldGround)" stroke="#7dd3fc" strokeOpacity=".15" />

        {/* city spires */}
        <g fill="#102c48" stroke="#60a5fa" strokeOpacity=".28">
          <path d="M158 387l12-96 12 96z"/><path d="M196 393l9-61 9 61z"/><path d="M242 392l12-126 12 126z"/>
          <path d="M1280 389l12-96 12 96z"/><path d="M1346 391l10-66 10 66z"/><path d="M1412 390l14-128 14 128z"/>
          <path d="M620 450l14-111 14 111z"/><path d="M704 438l10-77 10 77z"/><path d="M884 442l12-91 12 91z"/><path d="M970 452l14-122 14 122z"/>
        </g>

        {/* rivers connecting the world */}
        <path d="M40 505 C250 426 361 496 519 534 C690 576 740 520 800 474" fill="none" stroke="url(#worldRiverBlue)" strokeWidth="8" filter="url(#worldGlow)" opacity=".72">
          <animate attributeName="stroke-dasharray" values="30 24;12 12;30 24" dur="7s" repeatCount="indefinite"/>
        </path>
        <path d="M1560 510 C1364 432 1238 494 1084 535 C927 577 862 522 800 474" fill="none" stroke="url(#worldRiverFire)" strokeWidth="7" filter="url(#worldGlow)" opacity=".68">
          <animate attributeName="stroke-dasharray" values="24 18;10 10;24 18" dur="8s" repeatCount="indefinite"/>
        </path>
        <path d="M238 690 C442 610 610 649 799 560 C978 645 1162 610 1375 690" fill="none" stroke="url(#worldRiverBlue)" strokeWidth="5" filter="url(#worldGlow)" opacity=".5"/>

        {/* central presence */}
        <circle cx="800" cy="474" r="92" fill="url(#worldFlameCore)" opacity=".55" filter="url(#worldGlow)" />
        <path d="M800 562 C751 518 756 471 786 440 C817 407 807 373 797 342 C842 377 852 419 830 452 C812 481 818 513 800 562Z" fill="#38bdf8" opacity=".6" filter="url(#worldGlow)" />
        <path d="M800 562 C849 518 844 471 814 440 C783 407 793 373 803 342 C758 377 748 419 770 452 C788 481 782 513 800 562Z" fill="#fb6b35" opacity=".58" filter="url(#worldGlow)" />

        {/* foreground water / mirror */}
        <path d="M0 705 C260 655 446 725 620 704 C790 684 936 672 1100 706 C1282 744 1434 680 1600 716 L1600 900 L0 900Z" fill="#020812" opacity=".98"/>
        <path d="M0 731 C276 686 445 753 612 730 C780 707 947 699 1111 734 C1284 772 1440 706 1600 738" fill="none" stroke="#38bdf8" strokeOpacity=".17" strokeWidth="3"/>
        <path d="M0 789 C250 749 456 806 626 786 C808 764 960 758 1124 793 C1302 831 1464 766 1600 795" fill="none" stroke="#fb7185" strokeOpacity=".11" strokeWidth="2"/>
      </svg>

      {/* glass vignette */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,7,17,.55),transparent_24%,transparent_76%,rgba(1,7,17,.55)),linear-gradient(180deg,rgba(1,7,17,.1),transparent_55%,rgba(1,7,17,.72))]" />
    </div>
  )
}

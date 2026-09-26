'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { usePresenceCamera } from '@/components/world/presence-camera'
import type { WeaveEvent } from '@/lib/weave-event'

export function FlameEventWorldDecorations({
  event,
  soft = false,
}: {
  event: WeaveEvent
  soft?: boolean
}) {
  const { scene, moving } = usePresenceCamera()
  const reduceMotion = useReducedMotion()
  const opacity = soft ? 0.38 : 0.78

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden [perspective:1400px] [transform-style:preserve-3d]"
      initial={false}
      animate={reduceMotion ? {
        x: 0,
        y: 0,
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        opacity,
      } : {
        x: -scene.camera.x * 0.16,
        y: -scene.camera.y * 0.12,
        rotateY: -scene.camera.yaw * 0.15,
        rotateX: scene.camera.pitch * 0.12,
        scale: 1 + Math.min(scene.camera.depth, 60) * 0.0007 + (moving ? 0.004 : 0),
        opacity,
      }}
      transition={{ duration: reduceMotion ? 0 : (moving ? 0.42 : 0.7), ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: '50% 44%', willChange: 'transform, opacity' }}
      data-flame-event-world="active"
      data-flame-event-loop={event.loopNumber}
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-red-500/[0.07] via-sky-400/[0.025] to-transparent" />

      <div className="absolute left-1/2 top-3 -translate-x-1/2 [transform:translateZ(34px)]">
        <div className="relative min-w-[250px] overflow-hidden rounded-b-2xl border-x border-b border-red-200/15 bg-[#17080b]/70 px-5 py-2.5 text-center shadow-[0_18px_60px_rgba(239,68,68,.12)] backdrop-blur-md sm:min-w-[360px]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/65 to-transparent" />
          <p className="text-[8px] font-black uppercase tracking-[0.28em] text-amber-200/85">
            WEAVE · COMPANY LOOP {event.loopNumber} · LIVE EVENT
          </p>
          <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.18em] text-white/90">
            {event.title}
          </p>
        </div>
      </div>

      <div className="absolute left-[3%] top-[14%] hidden h-[52%] w-24 md:block [transform:translateZ(-18px)_rotateY(10deg)]">
        <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-sky-100/45 via-sky-300/18 to-transparent" />
        {['FLAME', 'LOOP 1', 'PRESENCE'].map((label, index) => (
          <motion.div
            key={label}
            className="absolute left-1/2 w-20 -translate-x-1/2 overflow-hidden rounded-r-xl border border-sky-200/15 bg-[#061523]/72 px-2 py-3 text-center shadow-xl backdrop-blur"
            style={{ top: `${index * 29}%` }}
            animate={reduceMotion ? undefined : { rotateZ: [0, 0.8, -0.6, 0] }}
            transition={{ duration: 5 + index, repeat: Infinity, ease: 'easeInOut' }}
          >
            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-sky-100/75">{label}</p>
            <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-gradient-to-r from-sky-300/15 via-white/70 to-red-300/20" />
          </motion.div>
        ))}
      </div>

      <div className="absolute right-[3%] top-[16%] hidden h-[50%] w-24 md:block [transform:translateZ(-12px)_rotateY(-10deg)]">
        <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-amber-100/45 via-red-300/16 to-transparent" />
        {['OPENING', 'WEAVE', 'WORLD'].map((label, index) => (
          <motion.div
            key={label}
            className="absolute left-1/2 w-20 -translate-x-1/2 overflow-hidden rounded-l-xl border border-red-200/15 bg-[#190b10]/72 px-2 py-3 text-center shadow-xl backdrop-blur"
            style={{ top: `${index * 29}%` }}
            animate={reduceMotion ? undefined : { rotateZ: [0, -0.7, 0.6, 0] }}
            transition={{ duration: 5.4 + index, repeat: Infinity, ease: 'easeInOut' }}
          >
            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-amber-100/80">{label}</p>
            <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-gradient-to-r from-red-300/20 via-white/70 to-amber-300/20" />
          </motion.div>
        ))}
      </div>

      <div className="absolute left-1/2 top-[38%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.045] [transform:translateZ(-70px)] sm:h-96 sm:w-96">
        <motion.div
          className="absolute inset-[8%] rounded-full border border-sky-200/[0.055]"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 42, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-[22%] rounded-full border border-red-200/[0.045]"
          animate={reduceMotion ? undefined : { rotate: -360 }}
          transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-[36%] rounded-full bg-white/[0.018] shadow-[0_0_80px_rgba(125,211,252,.08)]" />
      </div>

      <div className="absolute inset-x-[12%] bottom-[18%] h-20 [transform:translateZ(-38px)]">
        <motion.div
          className="absolute inset-x-0 bottom-3 h-px bg-gradient-to-r from-transparent via-red-300/35 to-transparent"
          animate={reduceMotion ? undefined : { opacity:[0.18,0.55,0.18], scaleX:[0.82,1,0.82] }}
          transition={{ duration:5.8, repeat:Infinity, ease:'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-full border border-red-200/10 bg-[#12070b]/28 px-4 py-1.5 backdrop-blur-sm"
          animate={reduceMotion ? undefined : { y:moving ? -4 : 0, opacity:moving ? 0.9 : 0.58 }}
          transition={{ duration:0.42 }}
        >
          <span className="text-[6px] font-black uppercase tracking-[0.2em] text-red-100/70">Flame Event in {scene.district} · {scene.label}</span>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-[8%] flex items-end justify-center gap-3 opacity-55 [transform:translateZ(-26px)]">
        {Array.from({ length: 11 }).map((_, index) => (
          <motion.div
            key={index}
            className="h-1.5 w-1.5 rounded-full border border-white/15 bg-white/25"
            animate={reduceMotion ? undefined : { y: [0, -5 - (index % 3) * 2, 0], opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2.8 + (index % 4) * 0.35, repeat: Infinity, delay: index * 0.08, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className="absolute inset-x-[8%] bottom-4 overflow-hidden rounded-full border border-white/[0.055] bg-black/10 px-4 py-1.5 backdrop-blur-sm sm:inset-x-[18%]">
        <div className="flex items-center justify-center gap-3 whitespace-nowrap text-[7px] font-black uppercase tracking-[0.22em] text-white/35">
          <span className="text-red-200/55">FLAME EVENT</span>
          <span>·</span>
          <span>Interaction in Motion</span>
          <span>·</span>
          <span className="text-sky-200/55">Heaven and Earth as One</span>
          <span>·</span>
          <span>Company Loop {event.loopNumber}</span>
        </div>
      </div>
    </motion.div>
  )
}

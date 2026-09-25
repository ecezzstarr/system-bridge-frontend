'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import {
  DEFAULT_PRESENCE_SCENE,
  PRESENCE_TRACE_KEY,
  PRESENCE_TRACE_LIMIT,
  resolvePresenceScene,
  sceneDirection,
  isPresenceCameraShellManaged,
  type PresenceOutput,
  type PresenceScene,
} from '@/lib/presence-camera'

type PresenceCameraState = {
  pathname: string
  scene: PresenceScene
  previousScene: PresenceScene
  moving: boolean
  lastOutput: PresenceOutput | null
  recordOutput: (output: Omit<PresenceOutput,'id'|'at'|'fromPath'|'fromScene'> & { fromPath?: string; fromScene?: string }) => void
}

const PresenceCameraContext = createContext<PresenceCameraState>({
  pathname:'/',
  scene:DEFAULT_PRESENCE_SCENE,
  previousScene:DEFAULT_PRESENCE_SCENE,
  moving:false,
  lastOutput:null,
  recordOutput:()=>{},
})

function writeOutput(output: PresenceOutput) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.sessionStorage.getItem(PRESENCE_TRACE_KEY)
    const existing = raw ? JSON.parse(raw) : []
    const next = [output, ...(Array.isArray(existing) ? existing : [])].slice(0, PRESENCE_TRACE_LIMIT)
    window.sessionStorage.setItem(PRESENCE_TRACE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('weave:presence-output', { detail: output }))
  } catch {
    // Presence motion must never block the user's action.
  }
}

function actionLabel(target: Element) {
  const explicit = target.getAttribute('data-presence-output')
  if (explicit) return explicit.slice(0,160)
  const aria = target.getAttribute('aria-label') || target.getAttribute('title')
  if (aria) return aria.slice(0,160)
  const text = (target.textContent || '').replace(/\s+/g,' ').trim()
  return (text || target.tagName.toLowerCase()).slice(0,160)
}

export function PresenceCameraProvider({ children }: { children: ReactNode; role?: string | null }) {
  const pathname = usePathname() || '/'
  const scene = useMemo(()=>resolvePresenceScene(pathname),[pathname])
  const previousPathRef = useRef(pathname)
  const previousSceneRef = useRef(scene)
  const [previousScene,setPreviousScene] = useState(scene)
  const [moving,setMoving] = useState(false)
  const [lastOutput,setLastOutput] = useState<PresenceOutput|null>(null)
  const motionTimerRef = useRef<number | null>(null)

  const recordOutput = useCallback((input: Omit<PresenceOutput,'id'|'at'|'fromPath'|'fromScene'> & { fromPath?: string; fromScene?: string })=>{
    const output: PresenceOutput = {
      ...input,
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: new Date().toISOString(),
      fromPath: input.fromPath || previousPathRef.current || pathname,
      fromScene: input.fromScene || previousSceneRef.current.key || scene.key,
    }
    writeOutput(output)
    setLastOutput(output)
    if (input.type === 'action') {
      setMoving(true)
      if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current)
      motionTimerRef.current=window.setTimeout(()=>setMoving(false),360)
    }
  },[pathname,scene.key])

  useEffect(()=>{
    const onClick = (event: MouseEvent)=>{
      const raw = event.target
      if (!(raw instanceof Element)) return
      const target = raw.closest('a,button,[role="button"]')
      if (!target) return
      if (target instanceof HTMLButtonElement && target.disabled) return
      if (target.getAttribute('aria-disabled') === 'true') return

      const anchor = target.closest('a') as HTMLAnchorElement | null
      const href = anchor?.getAttribute('href') || null
      const localDestination = href && href.startsWith('/') ? href.split('#')[0].split('?')[0] : null
      const destinationScene = localDestination ? resolvePresenceScene(localDestination) : null
      const label = actionLabel(target)

      recordOutput({
        type: localDestination ? 'navigation' : 'action',
        label,
        toPath: localDestination,
        toScene: destinationScene?.key || null,
      })

      const normalInPlaceNavigation = Boolean(
        localDestination &&
        localDestination !== pathname &&
        !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
        event.button === 0 &&
        anchor?.target !== '_blank' &&
        !anchor?.hasAttribute('download')
      )
      if (normalInPlaceNavigation) {
        setMoving(true)
        if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current)
        motionTimerRef.current=window.setTimeout(()=>setMoving(false),900)
      }
    }

    document.addEventListener('click',onClick,true)
    return ()=>document.removeEventListener('click',onClick,true)
  },[pathname,recordOutput])

  useEffect(()=>{
    const previousPath = previousPathRef.current
    const previous = previousSceneRef.current
    if (previousPath !== pathname) {
      setPreviousScene(previous)
      recordOutput({
        type:'arrival',
        label:`Arrived at ${scene.label}`,
        fromPath:previousPath,
        fromScene:previous.key,
        toPath:pathname,
        toScene:scene.key,
      })
      previousPathRef.current=pathname
      previousSceneRef.current=scene
      setMoving(true)
      if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current)
      motionTimerRef.current=window.setTimeout(()=>setMoving(false),620)
    }
    previousSceneRef.current=scene
  },[pathname,scene,recordOutput])

  useEffect(()=>()=>{
    if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current)
  },[])

  const value=useMemo(()=>({
    pathname,
    scene,
    previousScene,
    moving,
    lastOutput,
    recordOutput,
  }),[pathname,scene,previousScene,moving,lastOutput,recordOutput])

  return <PresenceCameraContext.Provider value={value}>{children}</PresenceCameraContext.Provider>
}

export function usePresenceCamera() {
  return useContext(PresenceCameraContext)
}

export function PresenceCameraSignal() {
  const { scene,moving,lastOutput }=usePresenceCamera()
  const reduceMotion=useReducedMotion()
  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={{ opacity:moving?0.9:0.48, scale:reduceMotion?1:(moving?1.02:1) }}
      transition={{ duration:reduceMotion?0:0.25 }}
      className="pointer-events-none fixed bottom-3 right-3 z-[35] hidden rounded-full border border-sky-300/10 bg-[#020b17]/72 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-2xl backdrop-blur-xl md:block"
    >
      <span className="text-sky-300">Camera</span>
      <span className="mx-1.5 text-white/20">·</span>
      <span>{scene.district}</span>
      <span className="mx-1.5 text-white/20">/</span>
      <span className="text-slate-300">{scene.label}</span>
      <span className="mx-1.5 text-white/20">·</span>
      <span>{scene.level}</span>
      {moving && lastOutput?.type === 'action' && <span className="ml-2 text-emerald-300">focus</span>}
    </motion.div>
  )
}

export function PresenceCameraRootViewport({ children }: { children: ReactNode }) {
  const pathname=usePathname() || '/'
  if (isPresenceCameraShellManaged(pathname)) return <>{children}</>
  return <PresenceCameraViewport className="z-10">{children}</PresenceCameraViewport>
}

export function PresenceCameraViewport({ children, className='' }: { children: ReactNode; className?: string }) {
  const { pathname,scene,previousScene }=usePresenceCamera()
  const reduceMotion=useReducedMotion()
  const direction=sceneDirection(previousScene,scene)

  return (
    <div className={`relative [perspective:1400px] ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={pathname}
          data-presence-scene={scene.key}
          data-presence-level={scene.level}
          initial={reduceMotion ? false : {
            opacity:0,
            x:direction * 22,
            y:8,
            scale:0.992,
            rotateY:direction * 1.35,
            rotateX:-0.55,
            filter:'blur(5px)',
          }}
          animate={{
            opacity:1,
            x:0,
            y:0,
            scale:1,
            rotateY:0,
            rotateX:0,
            filter:'blur(0px)',
          }}
          exit={reduceMotion ? undefined : {
            opacity:0,
            x:direction * -14,
            y:-4,
            scale:0.995,
            rotateY:direction * -0.8,
            filter:'blur(3px)',
          }}
          transition={{ duration:reduceMotion?0:0.42, ease:[0.22,1,0.36,1] }}
          style={{ transformStyle:'preserve-3d', transformOrigin:'50% 40%' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

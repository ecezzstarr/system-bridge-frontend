'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useEffect,useRef,useState,type PointerEvent} from 'react'
import {BookOpen,ChevronRight,X} from 'lucide-react'
import {roleOperatingGuideForPath} from '@/lib/weave-loading-guidance'

// A 48px movable bubble replaces the former auto-opening obstructive panel.
function RoleSmartGuide({userId,role}:{userId:string;role:'agent'|'bridger'}){
  const pathname=usePathname()||'/'
  const guide=roleOperatingGuideForPath(role,pathname)
  const [open,setOpen]=useState(false)
  const [side,setSide]=useState<'left'|'right'>('right')
  const [editing,setEditing]=useState(false)
  const ref=useRef<HTMLDivElement>(null)
  const gesture=useRef<{x:number;lastX:number;moved:boolean}|null>(null)
  const skipClick=useRef(false)

  useEffect(()=>setOpen(false),[pathname,userId,role])
  useEffect(()=>{
    const onFocus=(event:FocusEvent)=>{
      const target=event.target
      const input=target instanceof HTMLElement && Boolean(target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'))
      setEditing(input)
      if(input)setOpen(false)
    }
    const onBlur=()=>setEditing(false)
    const onOutside=(event:globalThis.PointerEvent)=>{
      if(ref.current && event.target instanceof Node && !ref.current.contains(event.target))setOpen(false)
    }
    const onKeyboard=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)}
    document.addEventListener('focusin',onFocus)
    document.addEventListener('focusout',onBlur)
    document.addEventListener('pointerdown',onOutside)
    document.addEventListener('keydown',onKeyboard)
    return ()=>{
      document.removeEventListener('focusin',onFocus)
      document.removeEventListener('focusout',onBlur)
      document.removeEventListener('pointerdown',onOutside)
      document.removeEventListener('keydown',onKeyboard)
    }
  },[])
  const start=(event:PointerEvent<HTMLButtonElement>)=>{
    if(event.pointerType==='mouse'&&event.button!==0)return
    gesture.current={x:event.clientX,lastX:event.clientX,moved:false}
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move=(event:PointerEvent<HTMLButtonElement>)=>{
    if(!gesture.current)return
    gesture.current.lastX=event.clientX
    if(Math.abs(event.clientX-gesture.current.x)>14)gesture.current.moved=true
  }
  const end=(event:PointerEvent<HTMLButtonElement>)=>{
    const current=gesture.current
    gesture.current=null
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
    if(current?.moved){
      skipClick.current=true
      setOpen(false)
      setSide(current.lastX<window.innerWidth/2?'left':'right')
    }
  }

  return <div ref={ref}
    className={'fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-40 flex flex-col gap-2 '+(side==='right'?'right-3 items-end':'left-3 items-start')+(editing?' pointer-events-none opacity-0':'')}
    data-weave-guide-bubble={role} data-agent-guide-location={pathname}>
    {open&&<section id="weave-role-guide-panel"
      className="max-h-[min(48svh,380px)] w-[min(19rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-xl border border-sky-300/30 bg-[#07121e] p-4 text-white shadow-lg"
      aria-label={role==='agent'?'Agent page guide':'Bridger page guide'}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-wide text-sky-200">WEAVE · {role.toUpperCase()}</p>
          <h2 className="mt-1 text-sm font-bold">{guide.title}</h2></div>
        <button type="button" onClick={()=>setOpen(false)} aria-label="Close WEAVE Guide"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15"><X className="h-4 w-4"/></button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-200">{guide.explanation}</p>
      <ol className="mt-3 space-y-2">{guide.steps.map((step,i)=><li key={i} className="flex gap-2 text-xs leading-5 text-slate-200">
        <span className="shrink-0 font-semibold text-sky-300">{i+1}.</span><span>{step}</span>
      </li>)}</ol>
      <Link href={guide.nextHref} onClick={()=>setOpen(false)} className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100">
        <span>{guide.nextLabel}</span><ChevronRight className="h-4 w-4 shrink-0"/>
      </Link>
      <p className="mt-3 text-[10px] leading-4 text-slate-400">A page visit does not confirm an order, payment or job appointment. Check the working record.</p>
    </section>}
    <button type="button" data-weave-guide-trigger="bubble" aria-expanded={open} aria-controls="weave-role-guide-panel"
      aria-label={open?'Close WEAVE Guide':'Open WEAVE Guide'} title="WEAVE Guide · drag horizontally to move"
      onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={()=>{gesture.current=null}}
      onClick={()=>{if(skipClick.current){skipClick.current=false;return}setOpen(previous=>!previous)}}
      className="flex h-12 w-12 touch-none items-center justify-center rounded-full border border-sky-300/50 bg-[#071c30] text-sky-100 shadow-[0_5px_18px_rgba(0,0,0,.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200">
      {open?<X className="h-5 w-5"/>:<BookOpen className="h-5 w-5"/>}
    </button>
  </div>
}
export function AgentSmartGuide({userId}:{userId:string}){return <RoleSmartGuide userId={userId} role="agent"/>}
export function BridgerSmartGuide({userId}:{userId:string}){return <RoleSmartGuide userId={userId} role="bridger"/>}

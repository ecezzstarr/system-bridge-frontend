'use client'

import Link from 'next/link'
import {useCallback,useEffect,useRef,useState,type CSSProperties,type MouseEvent as ReactMouseEvent,type PointerEvent as ReactPointerEvent,type TouchEvent as ReactTouchEvent,type KeyboardEvent as ReactKeyboardEvent} from 'react'
import {useRouter} from 'next/navigation'
import {Flame} from 'lucide-react'
import {useAuth} from '@/lib/auth-provider'
import styles from './grounds.module.css'

// The approved 1536 × 864 Company Grounds artwork, including the official logo,
// department guide and three public entrance labels, is one unedited image.
const OFFICIAL_GROUNDS_IMAGE = '/images/weave-official-hybrid-home.jpg'
const FALLBACK_GROUNDS_IMAGE = '/images/weave-open-world-home.jpg'

const buildings = [
  {name:'Hope',role:'bridger',workplace:'/bridger/dashboard',entrance:'/login',left:0,top:39,width:25,height:37,x:13,y:55,description:'Bridgers · outreach, prospects and client conversion'},
  {name:'Stability',role:'agent',workplace:'/agent/dashboard',entrance:'/login',left:6,top:26,width:36,height:28,x:24,y:39,description:'Agents · distribution, stores and everyday support'},
  {name:'Administrations · A Time',role:'admin',workplace:'/admin/dashboard',entrance:'/login?portal=admin',left:27,top:9,width:29,height:30,x:41,y:23,description:'Administrations · company systems, releases and oversight'},
  {name:'Dream Lovely',role:'client',workplace:'/client/dashboard',entrance:'/client/login',left:48,top:37,width:38,height:38,x:68,y:56,description:'Clients · File Folders, enterprises and Customer Doors'},
  {name:'File Folder',role:'client',workplace:'/client/system-switch',entrance:'/file-folder-preview',left:60,top:13,width:23,height:13,x:72,y:20,description:'Client estates · public File Folder previews'},
] as const

const publicActions = [
  {name:'Join Weave',href:'/register',left:14,top:89,width:21,height:10,x:24.5,y:94},
  {name:'File Folder previews',href:'/file-folder-preview',left:36.2,top:89,width:23.5,height:10,x:48,y:94},
  {name:'Explore Weave Open World',href:'/system-switch/world',left:61.1,top:89,width:24.3,height:10,x:73,y:94},
] as const

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value))

type Camera={zoom:number;panX:number;panY:number}
type PointerStart={id:number;x:number;y:number;baseX:number;baseY:number;moved:boolean}

export default function CompanyGrounds(){
  const router=useRouter()
  const {user,isInitialized}=useAuth()
  const entrances=useRef<HTMLDialogElement>(null)
  const denial=useRef<HTMLDialogElement>(null)
  const sceneRef=useRef<HTMLDivElement>(null)
  const pointer=useRef<PointerStart|null>(null)
  const pinch=useRef<{distance:number;zoom:number}|null>(null)
  const travelTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const camera=useRef<Camera>({zoom:1,panX:0,panY:0})
  const [exploring,setExploring]=useState(false)
  const [travelling,setTravelling]=useState('')
  const [attempted,setAttempted]=useState('')
  const [imageUnavailable,setImageUnavailable]=useState(false)
  const doors=isInitialized?buildings:[]
  const ownDepartment=buildings.find(door=>door.role===user?.role)
  const eventHref=user?.role==='client'?'/client/event'
    :['admin','bridger','agent'].includes(user?.role??'')?'/event':'/flame-event'

  const setCamera=useCallback((next:Partial<Camera>)=>{
    const value={...camera.current,...next}
    camera.current=value
    const element=sceneRef.current
    if(element){
      element.style.setProperty('--grounds-zoom',String(value.zoom))
      element.style.setProperty('--grounds-pan-x',value.panX+'px')
      element.style.setProperty('--grounds-pan-y',value.panY+'px')
    }
  },[])
  const resetCamera=useCallback(()=>{
    setCamera({zoom:1,panX:0,panY:0})
    setExploring(false)
    const scene=sceneRef.current
    scene?.style.setProperty('--grounds-focus-x','50%')
    scene?.style.setProperty('--grounds-focus-y','50%')
    scene?.style.setProperty('--grounds-look-x','0deg')
    scene?.style.setProperty('--grounds-look-y','0deg')
  },[setCamera])
  useEffect(()=>()=>{if(travelTimer.current!==null)clearTimeout(travelTimer.current)},[])

  const moveTo=(event:ReactMouseEvent<HTMLAnchorElement>,href:string,x:number,y:number)=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return
    event.preventDefault()
    if(travelling)return
    setTravelling(href)
    const scene=sceneRef.current
    scene?.style.setProperty('--grounds-focus-x',x+'%')
    scene?.style.setProperty('--grounds-focus-y',y+'%')
    setCamera({zoom:1.23,panX:0,panY:0})
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    travelTimer.current=setTimeout(()=>router.push(href),reduced?0:330)
  }
  const denied=(name:string,x:number,y:number)=>{
    entrances.current?.close()
    setAttempted(name)
    const scene=sceneRef.current
    scene?.style.setProperty('--grounds-focus-x',x+'%')
    scene?.style.setProperty('--grounds-focus-y',y+'%')
    setCamera({zoom:1.13,panX:0,panY:0})
    denial.current?.showModal()
  }
  const hotspotStyle=(place:{left:number;top:number;width:number;height:number}):CSSProperties=>({
    left:place.left+'%',top:place.top+'%',width:place.width+'%',height:place.height+'%',
  })
  function renderDoor(door:(typeof buildings)[number],panorama:boolean){
    const label=panorama?null:door.name
    const place=panorama?hotspotStyle(door):undefined
    const caption=door.description
    if(door.name==='File Folder'){
      return <Link key={door.name} href="/file-folder-preview" style={place}
        className={panorama?styles.hotspot:undefined} aria-label={caption}
        onClick={panorama?event=>moveTo(event,'/file-folder-preview',door.x,door.y):undefined}>{label}</Link>
    }
    if(user&&user.role!==door.role){
      return <button key={door.name} type="button" style={place} aria-haspopup="dialog"
        className={panorama?styles.hotspot:'min-h-11 rounded-full border border-[#a18147] px-4'}
        aria-label={'Check access to '+caption}
        onClick={()=>denied(door.name,door.x,door.y)}>{label}</button>
    }
    const href=user?door.workplace:door.entrance
    return <Link key={door.name} href={href} style={place} aria-label={'Enter '+caption}
      className={panorama?styles.hotspot:undefined}
      onClick={panorama?event=>moveTo(event,href,door.x,door.y):undefined}>{label}</Link>
  }

  const destinations=[
    {name:'Company Managements',href:!user?'/manager/login':user.role==='client'?'/client/staff-workspace':user.role==='admin'?'/admin/dashboard':'/weave/lifestyles',left:53,top:23,width:26,height:19,x:66,y:30},
    {name:'Burning River',href:eventHref,left:84,top:18,width:16,height:17,x:93,y:27},
    {name:'Sunshine · Mechanized Wealth',href:'/weave/lifestyles/sunshine',left:84,top:37,width:16,height:17,x:91,y:45},
    {name:'Open Market',href:'/market',left:85,top:55,width:15,height:30,x:92,y:68},
  ]

  const beginLook=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const target=event.target
    if(target instanceof Element&&target.closest('a,button'))return
    pointer.current={id:event.pointerId,x:event.clientX,y:event.clientY,baseX:camera.current.panX,baseY:camera.current.panY,moved:false}
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveLook=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const rect=event.currentTarget.getBoundingClientRect()
    if(!rect.width||!rect.height)return
    const scene=sceneRef.current
    const x=clamp((event.clientX-rect.left)/rect.width*2-1,-1,1)
    const y=clamp((event.clientY-rect.top)/rect.height*2-1,-1,1)
    scene?.style.setProperty('--grounds-look-x',(x*1.3)+'deg')
    scene?.style.setProperty('--grounds-look-y',(-y*1.1)+'deg')
    const start=pointer.current
    if(!start||event.pointerId!==start.id||!exploring||pinch.current)return
    const dx=event.clientX-start.x,dy=event.clientY-start.y
    if(Math.abs(dx)+Math.abs(dy)>6)start.moved=true
    if(start.moved){
      setCamera({panX:clamp(start.baseX+dx,-rect.width*.48,rect.width*.48),
        panY:clamp(start.baseY+dy,-rect.height*.35,rect.height*.35)})
    }
  }
  const endLook=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const start=pointer.current
    if(!start||start.id!==event.pointerId)return
    pointer.current=null
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
    if(start.moved||pinch.current)return
    if(exploring)resetCamera()
    else{setExploring(true);setCamera({zoom:1.9,panX:0,panY:0})}
  }
  const distance=(touches:ReactTouchEvent<HTMLDivElement>['touches'])=>{
    if(touches.length<2)return 0
    return Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY)
  }
  const startPinch=(event:ReactTouchEvent<HTMLDivElement>)=>{
    if(event.touches.length===2){
      pinch.current={distance:distance(event.touches),zoom:camera.current.zoom}
      pointer.current=null
      setExploring(true)
    }
  }
  const movePinch=(event:ReactTouchEvent<HTMLDivElement>)=>{
    const current=pinch.current
    if(!current||event.touches.length!==2||!current.distance)return
    setCamera({zoom:clamp(current.zoom*distance(event.touches)/current.distance,1,3)})
  }
  const endPinch=(event:ReactTouchEvent<HTMLDivElement>)=>{
    if(event.touches.length<2)pinch.current=null
  }
  const useKeyboard=(event:ReactKeyboardEvent<HTMLDivElement>)=>{
    if(event.target!==event.currentTarget)return
    if(event.key==='Escape'){resetCamera();return}
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault()
      if(exploring)resetCamera()
      else{setExploring(true);setCamera({zoom:1.9,panX:0,panY:0})}
      return
    }
    const changes:Record<string,[number,number]>={ArrowLeft:[30,0],ArrowRight:[-30,0],ArrowUp:[0,30],ArrowDown:[0,-30]}
    const change=changes[event.key]
    if(change){
      event.preventDefault()
      setExploring(true)
      setCamera({zoom:Math.max(1.5,camera.current.zoom),
        panX:clamp(camera.current.panX+change[0],-220,220),panY:clamp(camera.current.panY+change[1],-170,170)})
    }
  }

  return <main className={styles.grounds} aria-label="Weave Open World" data-weave-company-home="company-grounds"
    data-grounds-immersive="official-image-click-to-explore">
    <h1 className="sr-only">Weave of Presence · Company Grounds</h1>
    <div id="grounds-panorama" ref={undefined} className={styles.viewport} tabIndex={0}
      data-exploring={exploring?'true':'false'} data-travelling={travelling?'true':'false'}
      aria-label="Weave Company Grounds. Tap a building to enter, or tap the landscape to zoom. Drag to look and pinch to zoom. Escape restores the full view."
      onPointerDown={beginLook} onPointerMove={moveLook} onPointerUp={endLook}
      onPointerCancel={()=>{pointer.current=null}} onTouchStart={startPinch}
      onTouchMove={movePinch} onTouchEnd={endPinch}
      onDoubleClick={resetCamera} onKeyDown={useKeyboard}>
      <div ref={sceneRef} className={styles.scene}>
        <img src={imageUnavailable?FALLBACK_GROUNDS_IMAGE:OFFICIAL_GROUNDS_IMAGE}
          width={1536} height={864} draggable={false} fetchPriority="high"
          alt="Official WEAVE of Presence campus: Hope for Bridgers, Stability for Agents, Administrations as A Time and Dream Lovely for Clients. Company Grounds, Flame Event, market, Client estates and public entrances."
          onError={()=>setImageUnavailable(true)}/>
        <button type="button" className={styles.hotspot+' '+styles.companyMark}
          aria-label="Open Weave Company Grounds directory" aria-haspopup="dialog"
          style={{left:'38%',top:'68%',width:'24%',height:'12%'}}
          onClick={()=>entrances.current?.showModal()}/>
        {doors.map(door=>renderDoor(door,true))}
        {destinations.map(place=><Link key={place.name} href={place.href}
          className={styles.hotspot} style={hotspotStyle(place)}
          aria-label={'Open '+place.name}
          onClick={event=>moveTo(event,place.href,place.x,place.y)}/>)}
        <Link href={user?ownDepartment?.workplace??'/dashboard':'/login'}
          className={styles.hotspot+' '+styles.signIn}
          aria-label={user?'My workspace':'Sign in'}
          onClick={event=>moveTo(event,user?ownDepartment?.workplace??'/dashboard':'/login',88,4)}/>
        <button type="button" className={styles.hotspot+' '+styles.menu}
          aria-label="Open company directory" aria-haspopup="dialog"
          onClick={()=>entrances.current?.showModal()}/>
        {publicActions.map(action=><Link key={action.name}
          href={action.href} className={styles.hotspot+' '+styles.bottomAction}
          style={hotspotStyle(action)} aria-label={action.name}
          onClick={event=>moveTo(event,action.href,action.x,action.y)}/>)}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {exploring?'Landscape enlarged. Drag to look, pinch to zoom; tap a building to open it.':'Full Company Grounds in view.'}
      </span>
    </div>
    <dialog ref={entrances} className={styles.directory} aria-labelledby="grounds-directory-title">
      <header><h2 id="grounds-directory-title">Company entrances</h2>
        <button type="button" onClick={()=>entrances.current?.close()}>Close</button>
      </header>
      <nav id="grounds-entrances" aria-label="Company entrances" className={styles.entrances}>
        {doors.map(door=>renderDoor(door,false))}
        {destinations.map(place=><Link key={place.name} href={place.href}>{place.name}</Link>)}
        <Link href="/login">Sign in</Link>
        <Link href="/register">Join Weave</Link>
        <Link href="/client/register">Client registration</Link>
        <Link href="/file-folder">Purchase a File Folder</Link>
        <Link href="/file-folder-preview">Explore File Folders</Link>
        <Link href="/system-switch/world">Explore Weave Open World in 3D</Link>
        <Link href="/food-store">Food Store</Link>
        <Link href="/company-overview">Company services and Reach requests</Link>
        <Link href="/reach-delivery">Reach and Delivery</Link>
        <Link href="/lifestyle">Lifestyle</Link>
        <Link href="/enterprise">Enterprise</Link>
        <Link href="/stream">Streaming</Link>
        <Link href="/company">Company information</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/download">Download the Weave app</Link>
      </nav>
    </dialog>
    <dialog ref={denial} aria-labelledby="flame-access-title" aria-describedby="flame-access-message"
      onClose={resetCamera}
      className="fixed inset-0 m-auto w-[min(90vw,26rem)] rounded-2xl border border-[#b69a61] bg-[#fffaf0] p-6 text-[#302c23] shadow-xl backdrop:bg-black/45">
      <p className="flex items-center gap-2 text-sm text-[#805422]"><Flame size={18} aria-hidden="true"/> The Flame</p>
      <h2 id="flame-access-title" className="mt-2 font-serif text-2xl">{attempted} entrance</h2>
      <p id="flame-access-message" className="my-4">Your account does not have access to this entrance.
        {ownDepartment&&' Your department is '+ownDepartment.name+'.'}</p>
      <div className="flex flex-wrap gap-3">
        <Link className={styles.river} href={ownDepartment?.workplace??'/dashboard'}
          onClick={()=>denial.current?.close()}>Open {ownDepartment?.name??'my workspace'}</Link>
        <button type="button" className="min-h-11 px-2 underline"
          onClick={()=>denial.current?.close()}>Stay on the grounds</button>
      </div>
    </dialog>
  </main>
}

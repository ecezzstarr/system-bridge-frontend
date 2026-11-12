'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera, CameraOff, Copy, Mic, MicOff, MonitorUp, PhoneOff,
  RefreshCw, ShieldCheck, SwitchCamera, Volume2,
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/auth-client'
import HopeVideoFilterShop from '@/components/bridger/hope-video-filter-shop'
import type { HopeVideoFilter } from '@/lib/hope-video-filter-catalog'
import { prepareHopeVideoEffect, paintHopePremiumFrame, paintHopeFaceOverlay, type PreparedHopeEffect } from '@/lib/hope-video-premium-effects'

type Role='bridger'|'guest'
type CallInfo={id:string;status:string;guestName:string|null;expiresAt:string}
type VideoSignal={id:string;kind:'offer'|'answer'|'ice';payload:any}
type CallSnapshot={call:CallInfo;iceServers:RTCIceServer[];relayConfigured:boolean;signals:VideoSignal[]}
type Props={callId:string;role:Role;guestAccess?:string;inviteLink?:string;onClose?:()=>void}

export default function WeaveVideoRoom({callId,role,guestAccess,inviteLink,onClose}:Props) {
  const localVideo=useRef<HTMLVideoElement>(null)
  const remoteVideo=useRef<HTMLVideoElement>(null)
  const peer=useRef<RTCPeerConnection|null>(null)
  const local=useRef<MediaStream|null>(null)
  const lastSignal=useRef(0)
  const pendingIce=useRef<RTCIceCandidateInit[]>([])
  const pollBusy=useRef(false)
  const negotiating=useRef(false)
  const offerMade=useRef(false)
  const disposed=useRef(false)
  const screenTrack=useRef<MediaStreamTrack|null>(null)
  const selectedFilterRef=useRef<HopeVideoFilter|null>(null)
  const premiumEffectRef=useRef<PreparedHopeEffect|null>(null)
  const selectedFaceRef=useRef<HopeVideoFilter|null>(null)
  const faceEffectRef=useRef<PreparedHopeEffect|null>(null)
  const [selectedFace,setSelectedFace]=useState<HopeVideoFilter|null>(null)
  const processingRef=useRef<{video:HTMLVideoElement;canvas:HTMLCanvasElement;stream:MediaStream;track:MediaStreamTrack;frame:number}|null>(null)
  const [selectedFilter,setSelectedFilter]=useState<HopeVideoFilter|null>(null)
  const [call,setCall]=useState<CallInfo|null>(null)
  const [mediaReady,setMediaReady]=useState(false)
  const [mediaBusy,setMediaBusy]=useState(false)
  const [muted,setMuted]=useState(false)
  const [cameraOff,setCameraOff]=useState(false)
  const [sharing,setSharing]=useState(false)
  const [connected,setConnected]=useState(false)
  const [connection,setConnection]=useState('Waiting for participant')
  const [relayReady,setRelayReady]=useState<boolean|null>(null)
  const [error,setError]=useState('')
  const [copyNote,setCopyNote]=useState('')
  const [ended,setEnded]=useState(false)
  const [soundBlocked,setSoundBlocked]=useState(false)

  const authHeaders=useCallback(()=>role==='guest'
    ? {'x-weave-video-guest':guestAccess||''}
    : getAuthHeaders(),[role,guestAccess])

  const request=useCallback(async(method:string,body?:unknown,after?:number)=>{
    const url='/api/hope/video-calls/'+callId+(method==='GET'?'?after='+Number(after||0):'')
    const response=await fetch(url,{method,cache:'no-store',headers:{
      ...authHeaders(),...(body?{'Content-Type':'application/json'}:{})
    },...(body?{body:JSON.stringify(body)}:{})})
    const result=await response.json().catch(()=>({}))
    if(!response.ok)throw new Error(result.error||'Video call service unavailable')
    return result
  },[callId,authHeaders])

  const stopFilteredCamera=useCallback(()=>{
    const stage=processingRef.current
    processingRef.current=null
    premiumEffectRef.current=null
    faceEffectRef.current=null
    if(!stage)return
    window.cancelAnimationFrame(stage.frame)
    stage.stream.getTracks().forEach(track=>track.stop())
    stage.video.pause()
    stage.video.srcObject=null
  },[])

  const beginFilteredCamera=useCallback(async(stream:MediaStream)=>{
    const existing=processingRef.current
    if(existing)return existing.track
    const canvas=document.createElement('canvas')
    if(typeof canvas.captureStream!=='function')throw new Error('This browser cannot transmit video filters. Try an up-to-date browser before purchasing filters.')
    canvas.width=640;canvas.height=480
    const context=canvas.getContext('2d',{alpha:false})
    if(!context)throw new Error('Live camera effects are unavailable on this device.')
    const source=document.createElement('video')
    source.muted=true;source.autoplay=true;source.playsInline=true
    source.srcObject=stream
    try{await source.play()}catch(error){
      source.srcObject=null
      throw new Error('Camera effect could not start; check browser media permissions.')
    }
    const filtered=canvas.captureStream(24)
    const track=filtered.getVideoTracks()[0]
    if(!track){
      source.pause();source.srcObject=null;filtered.getTracks().forEach(t=>t.stop())
      throw new Error('This browser cannot provide a filtered video track.')
    }
    const stage={video:source,canvas,stream:filtered,track,frame:0}
    processingRef.current=stage
    let lastFrame=0
    const draw=(timestamp:number)=>{
      if(processingRef.current!==stage)return
      // Limit expensive foreground and face inference so it does not monopolize
      // the phone's main thread. Microphone audio stays on its own media track.
      if(timestamp-lastFrame<1000/24){
        stage.frame=window.requestAnimationFrame(draw)
        return
      }
      lastFrame=timestamp
      const camera=local.current?.getVideoTracks()[0]
      try{
        if(!camera?.enabled||source.readyState<2){
          context.filter='none'
          context.fillStyle='#000000'
          context.fillRect(0,0,canvas.width,canvas.height)
        }else{
          const active=selectedFilterRef.current
          if(active?.effectKind==='scene'||active?.effectKind==='remove'){
            const prepared=premiumEffectRef.current
            if(prepared && prepared.filter.id===active.id){
              context.filter='none'
              paintHopePremiumFrame(prepared,source,context,canvas.width,canvas.height,performance.now())
            }else{
              context.fillStyle='#263641'
              context.fillRect(0,0,canvas.width,canvas.height)
            }
          }else{
            context.filter=active?.css||'none'
            context.drawImage(source,0,0,canvas.width,canvas.height)
            context.filter='none'
          }
          // Apply a separately owned face treatment above the selected background.
          // The unmodified microphone track is not included in this processing.
          const mask=selectedFaceRef.current
          const preparedFace=faceEffectRef.current
          if(mask && preparedFace?.filter.id===mask.id){
            paintHopeFaceOverlay(preparedFace,source,context,canvas.width,canvas.height,performance.now())
          }
        }
      }catch(error){
        console.warn('[Hope video] visual effect could not process the current frame',error)
        // Never reveal private surroundings after a segmentation/face failure.
        context.filter='none'
        context.fillStyle='#263641'
        context.fillRect(0,0,canvas.width,canvas.height)
      }
      stage.frame=window.requestAnimationFrame(draw)
    }
    draw()
    return track
  },[])

  const effectiveCameraTrack=()=>{
    return processingRef.current?.track || local.current?.getVideoTracks()[0] || null
  }

  const stopMedia=useCallback(()=>{
    stopFilteredCamera()
    screenTrack.current?.stop()
    screenTrack.current=null
    local.current?.getTracks().forEach(track=>track.stop())
    local.current=null
    if(localVideo.current)localVideo.current.srcObject=null
    if(remoteVideo.current)remoteVideo.current.srcObject=null
    peer.current?.close()
    peer.current=null
  },[stopFilteredCamera])

  const sendSignal=useCallback(async(kind:'offer'|'answer'|'ice',payload:unknown)=>{
    return request('POST',{kind,payload})
  },[request])

  const flushIce=useCallback(async(pc:RTCPeerConnection)=>{
    if(!pc.remoteDescription)return
    const waiting=pendingIce.current.splice(0)
    for(const candidate of waiting) {
      try{await pc.addIceCandidate(candidate)}catch(e){console.warn('[Hope video] ICE candidate rejected',e)}
    }
  },[])

  const startPeer=useCallback((stream:MediaStream,iceServers:RTCIceServer[])=>{
    if(peer.current)peer.current.close()
    const pc=new RTCPeerConnection({iceServers,iceCandidatePoolSize:2})
    peer.current=pc
    offerMade.current=false
    pendingIce.current=[]
    pc.onicecandidate=event=>{
      if(event.candidate&&!disposed.current) {
        void sendSignal('ice',event.candidate.toJSON()).catch(()=>setError('Call signaling was interrupted. Check your connection.'))
      }
    }
    pc.ontrack=event=>{
      if(!remoteVideo.current)return
      const received=event.streams[0]||new MediaStream([event.track])
      remoteVideo.current.srcObject=received
      void remoteVideo.current.play().then(()=>setSoundBlocked(false)).catch(()=>setSoundBlocked(true))
    }
    pc.onconnectionstatechange=()=>{
      if(disposed.current)return
      const state=pc.connectionState
      setConnected(state==='connected')
      setConnection(state==='connected'?'Video connected':state==='failed'?'Connection failed — retry':state==='disconnected'?'Connection interrupted':state==='connecting'?'Connecting…':'Waiting for participant')
    }
    stream.getTracks().forEach(track=>pc.addTrack(track,stream))
    return pc
  },[sendSignal])

  const makeOffer=useCallback(async()=>{
    const pc=peer.current
    if(!pc || role!=='bridger' || negotiating.current || offerMade.current || pc.signalingState!=='stable')return
    negotiating.current=true
    try {
      const offer=await pc.createOffer()
      await pc.setLocalDescription(offer)
      await sendSignal('offer',{type:'offer',sdp:offer.sdp})
      offerMade.current=true
      setConnection('Calling invited participant…')
    }catch(e:any){
      setError(e?.message||'Unable to start the video connection')
    }finally{negotiating.current=false}
  },[role,sendSignal])

  const processSignal=useCallback(async(signal:VideoSignal)=>{
    const pc=peer.current
    if(!pc)return
    if(signal.kind==='offer' && role==='guest'){
      if(pc.signalingState==='have-local-offer')await pc.setLocalDescription({type:'rollback'})
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload))
      await flushIce(pc)
      const answer=await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await sendSignal('answer',{type:'answer',sdp:answer.sdp})
    }else if(signal.kind==='answer' && role==='bridger'){
      if(pc.signalingState==='have-local-offer'){
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload))
        await flushIce(pc)
      }
    }else if(signal.kind==='ice'){
      if(pc.remoteDescription) {
        try{await pc.addIceCandidate(signal.payload)}catch(e){console.warn('[Hope video] invalid ICE',e)}
      } else pendingIce.current.push(signal.payload)
    }
  },[role,sendSignal,flushIce])

  const poll=useCallback(async()=>{
    if(disposed.current || pollBusy.current || ended)return
    pollBusy.current=true
    try {
      const snapshot:CallSnapshot=await request('GET',undefined,lastSignal.current)
      if(disposed.current)return
      setCall(snapshot.call)
      setRelayReady(snapshot.relayConfigured)
      if(snapshot.call.status==='ended'||snapshot.call.status==='expired'){
        setEnded(true)
        setConnection(snapshot.call.status==='expired'?'Call time expired':'Call ended')
        stopMedia()
        return
      }
      // Keep signaling messages available until the user has granted media access.
      if(peer.current){
        for(const signal of snapshot.signals){
          await processSignal(signal)
          lastSignal.current=Math.max(lastSignal.current,Number(signal.id))
        }
        if(role==='bridger'&&snapshot.call.status==='joined'&&!offerMade.current)await makeOffer()
      }
    }catch(e:any){if(!disposed.current)setError(e?.message||'Could not reach video signaling')}
    finally{pollBusy.current=false}
  },[request,processSignal,role,makeOffer,stopMedia,ended])

  useEffect(()=>{
    disposed.current=false
    void poll()
    const timer=window.setInterval(()=>{void poll()},1500)
    return ()=>{
      disposed.current=true
      window.clearInterval(timer)
      stopMedia()
    }
  },[poll,stopMedia])

  const enableMedia=async()=>{
    if(mediaBusy||ended)return
    if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection) {
      setError('This browser does not support secure video calls. Open the HTTPS link in a current mobile browser.')
      return
    }
    setMediaBusy(true);setError('')
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}})
      if(disposed.current){stream.getTracks().forEach(track=>track.stop());return}
      local.current=stream
      if(localVideo.current)localVideo.current.srcObject=stream
      const snapshot:CallSnapshot=await request('GET')
      // Filtered video is the track sent through WebRTC, not merely a local CSS preview.
      const currentEffect=selectedFilterRef.current
      const currentFace=selectedFaceRef.current
      if(currentEffect&&currentEffect.effectKind!=='color' && premiumEffectRef.current?.filter.id!==currentEffect.id){
        premiumEffectRef.current=await prepareHopeVideoEffect(currentEffect)
      }
      if(currentFace&&faceEffectRef.current?.filter.id!==currentFace.id){
        faceEffectRef.current=await prepareHopeVideoEffect(currentFace)
      }
      const outgoingVideo=(currentEffect||currentFace)?await beginFilteredCamera(stream):stream.getVideoTracks()[0]
      if(currentEffect&&localVideo.current)localVideo.current.srcObject=new MediaStream([outgoingVideo])
      const outgoing=new MediaStream([...stream.getAudioTracks(),outgoingVideo].filter(Boolean))
      startPeer(outgoing,snapshot.iceServers)
      setMediaReady(true);setMuted(false);setCameraOff(false)
      // A guest can join before enabling camera: messages remain in the room.
      void poll()
    }catch(e:any){
      local.current?.getTracks().forEach(track=>track.stop())
      local.current=null
      setError(e?.name==='NotAllowedError'?'Camera or microphone permission was denied. Allow both permissions and try again.':e?.message||'Unable to start camera and microphone.')
    }finally{setMediaBusy(false)}
  }

  const mute=()=>{
    const next=!muted
    local.current?.getAudioTracks().forEach(track=>{track.enabled=!next})
    setMuted(next)
  }
  const toggleCamera=()=>{
    const next=!cameraOff
    local.current?.getVideoTracks().forEach(track=>{track.enabled=!next})
    setCameraOff(next)
  }
  const replaceVideo=async(track:MediaStreamTrack)=>{
    const pc=peer.current
    const sender=pc?.getSenders().find(item=>item.track?.kind==='video')
    if(sender)await sender.replaceTrack(track)
  }
  const flipCamera=async()=>{
    if(!local.current||screenTrack.current)return
    try{
      const current=local.current.getVideoTracks()[0]
      const facing=current?.getSettings().facingMode==='environment'?'user':'environment'
      const replacement=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing}}})
      const next=replacement.getVideoTracks()[0]
      if(!processingRef.current)await replaceVideo(next)
      local.current.removeTrack(current)
      current?.stop()
      local.current.addTrack(next)
      next.enabled=!cameraOff
      if(localVideo.current)localVideo.current.srcObject=processingRef.current?
        new MediaStream([processingRef.current.track]):local.current
      if(processingRef.current){
        processingRef.current.video.srcObject=null
        processingRef.current.video.srcObject=local.current
        await processingRef.current.video.play()
      }
    }catch(e:any){setError(e?.message||'Could not switch camera')}
  }
  const shareScreen=async()=>{
    if(!local.current)return
    if(screenTrack.current){
      const camera=effectiveCameraTrack()
      if(camera)await replaceVideo(camera)
      screenTrack.current.stop();screenTrack.current=null
      setSharing(false)
      return
    }
    const mediaDevices=navigator.mediaDevices as MediaDevices & {getDisplayMedia?: (options:DisplayMediaStreamOptions)=>Promise<MediaStream>}
    if(!mediaDevices?.getDisplayMedia){setError('Screen sharing is unavailable on this browser.');return}
    try {
      const capture=await mediaDevices.getDisplayMedia({video:true,audio:false})
      const track=capture.getVideoTracks()[0]
      await replaceVideo(track)
      screenTrack.current=track
      setSharing(true)
      track.onended=()=>{
        void (async()=>{
          const camera=effectiveCameraTrack()
          if(camera)await replaceVideo(camera)
          screenTrack.current=null
          setSharing(false)
        })().catch(()=>{})
      }
    }catch(e:any){if(e?.name!=='NotAllowedError')setError(e?.message||'Screen sharing unavailable')}
  }
  const retry=async()=>{
    if(!local.current || !call || call.status!=='joined')return
    setError('')
    const snapshot:CallSnapshot=await request('GET')
    const video=effectiveCameraTrack()
    const outgoing=new MediaStream([...local.current.getAudioTracks(),...(video?[video]:[])])
    startPeer(outgoing,snapshot.iceServers)
    if(role==='bridger')await makeOffer()
    else setConnection('Waiting for Bridger to reconnect')
  }

  const applyVideoFilter=async(filter:HopeVideoFilter|null,layer:'scene'|'face'='scene')=>{
    if(role!=='bridger'||ended)return
    if(filter){
      if((layer==='face')!==(filter.effectKind==='face')){
        throw new Error('That effect cannot be applied to this video layer.')
      }
      // Recheck saved ownership before every use of a paid feature.
      const response=await fetch('/api/hope/video-filters',{cache:'no-store',headers:getAuthHeaders()})
      const data=await response.json().catch(()=>({}))
      if(!response.ok||!Array.isArray(data.owned)||!data.owned.includes(filter.id)){
        throw new Error('Purchase this System Switch effect before applying it to a call.')
      }
    }
    const previous=selectedFilterRef.current
    const previousPrepared=premiumEffectRef.current
    const previousFace=selectedFaceRef.current
    const previousFacePrepared=faceEffectRef.current
    if((layer==='scene'?previous:previousFace)?.id===(filter?.id||undefined))return
    const source=local.current
    try{
      const prepared=filter&&filter.effectKind!=='color'?await prepareHopeVideoEffect(filter):null
      if(layer==='face'){
        selectedFaceRef.current=filter
        faceEffectRef.current=prepared
        setSelectedFace(filter)
      }else{
        selectedFilterRef.current=filter
        premiumEffectRef.current=prepared
        setSelectedFilter(filter)
      }
      const anyEffect=Boolean(selectedFilterRef.current||selectedFaceRef.current)
      if(source&&anyEffect){
        const track=await beginFilteredCamera(source)
        if(!screenTrack.current)await replaceVideo(track)
        if(localVideo.current)localVideo.current.srcObject=new MediaStream([track])
      }else if(source){
        const raw=source.getVideoTracks()[0]
        if(raw&&!screenTrack.current)await replaceVideo(raw)
        stopFilteredCamera()
        if(localVideo.current)localVideo.current.srcObject=source
      }
    }catch(error){
      selectedFilterRef.current=previous
      premiumEffectRef.current=previousPrepared
      selectedFaceRef.current=previousFace
      faceEffectRef.current=previousFacePrepared
      setSelectedFilter(previous)
      setSelectedFace(previousFace)
      if(!previous&&!previousFace)stopFilteredCamera()
      throw error
    }
  }

  const endCall=async()=>{
    setEnded(true)
    setConnection('Call ended')
    stopMedia()
    try{await request('DELETE')}catch(e:any){setError(e?.message||'Could not confirm hangup with WEAVE')}
    onClose?.()
  }

  const copyLink=async()=>{
    if(!inviteLink)return
    try{await navigator.clipboard.writeText(inviteLink);setCopyNote('Invitation copied')}
    catch{setCopyNote('Copy the invitation URL manually')}
  }

  return <section data-weave-hope-video-room="peer-to-peer" className="space-y-5 text-[#263841]">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#946c2b]">WEAVE · Hope Video Call</p>
        <h2 className="mt-1 text-xl font-semibold">{role==='bridger'?'Your private call':'Invited video conversation'}</h2>
        <p role="status" className="mt-1 text-sm">{connection}{call?.guestName?' · '+call.guestName:''}</p>
      </div>
      <span className="rounded-lg border border-[#d6bd8b] px-3 py-2 text-xs font-semibold">{connected?'Connected':ended?'Ended':call?.status==='joined'?'Guest joined':'Awaiting guest'}</span>
    </div>

    {role==='bridger'&&inviteLink&&!ended&&<div className="rounded-xl border border-[#dccba8] bg-[#fffaf0] p-4">
      <p className="text-sm font-semibold">Private invitation link</p>
      <p className="mt-1 text-sm leading-6">Share directly with the person who agrees to join. The first guest to accept claims the link; do not publish it publicly.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input aria-label="Invitation link" readOnly value={inviteLink} className="min-w-0 flex-1 rounded-lg border border-[#cdbb97] bg-white p-3 text-xs"/>
        <button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#254a58] px-4 text-sm font-semibold text-white"><Copy className="h-4 w-4"/> Copy link</button>
      </div>
      {copyNote&&<p role="status" className="mt-2 text-xs">{copyNote}</p>}
    </div>}

    <div className="relative grid gap-3 rounded-2xl bg-[#162632] p-3 sm:grid-cols-2">
      <div className="relative min-h-48 overflow-hidden rounded-xl bg-[#283d47]">
        <video ref={localVideo} autoPlay muted playsInline className="h-full min-h-48 w-full object-cover"  />
        {!mediaReady&&<div className="absolute inset-0 flex items-center justify-center text-sm text-white">Camera not enabled</div>}
        <p className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">You {muted?'· muted':''}</p>
      </div>
      <div className="relative min-h-48 overflow-hidden rounded-xl bg-[#283d47]">
        <video ref={remoteVideo} autoPlay playsInline className="h-full min-h-48 w-full object-cover"/>
        {!connected&&<div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-200">{call?.status==='joined'?'Connecting participant…':'Waiting for invitation to be accepted'}</div>}
        <p className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">{role==='bridger'?call?.guestName||'Guest':'WEAVE Bridger'}</p>
      </div>
    </div>
    {role==='bridger'&&!ended&&<HopeVideoFilterShop activeFilter={selectedFilter} activeFace={selectedFace} onFilterSelect={applyVideoFilter}/>}
    {soundBlocked&&<button onClick={()=>{void remoteVideo.current?.play().then(()=>setSoundBlocked(false)).catch(()=>{})}} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-100 px-4 text-sm"><Volume2 className="h-4 w-4"/> Tap to enable call audio</button>}
    {!mediaReady&&!ended?<button type="button" onClick={enableMedia} disabled={mediaBusy} className="min-h-12 w-full rounded-xl bg-[#235968] px-4 text-sm font-bold text-white disabled:opacity-50">
      {mediaBusy?'Requesting camera and microphone…':'Enable camera & microphone'}
    </button>:null}
    {mediaReady&&!ended&&<div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <button onClick={mute} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#cdbb97] p-2 text-sm">{muted?<MicOff size={17}/>:<Mic size={17}/>} {muted?'Unmute':'Mute'}</button>
      <button onClick={toggleCamera} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#cdbb97] p-2 text-sm">{cameraOff?<CameraOff size={17}/>:<Camera size={17}/>} {cameraOff?'Camera on':'Camera off'}</button>
      <button onClick={flipCamera} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#cdbb97] p-2 text-sm"><SwitchCamera size={17}/> Flip</button>
      <button onClick={()=>void shareScreen()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#cdbb97] p-2 text-sm"><MonitorUp size={17}/> {sharing?'Stop share':'Share'}</button>
      <button onClick={()=>void retry()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#cdbb97] p-2 text-sm"><RefreshCw size={17}/> Retry</button>
    </div>}
    {!ended&&<button onClick={()=>void endCall()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#9a3232] px-4 font-semibold text-white"><PhoneOff className="h-5 w-5"/> End call</button>}
    {error&&<p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {relayReady===false&&<p className="text-xs leading-5 text-[#76582d]">Network limitation: WEAVE TURN relay is not configured. Some mobile networks will not connect until Administrations adds TURN service.</p>}
    <p className="flex items-start gap-2 text-xs leading-5 text-[#5d6a6e]"><ShieldCheck size={16} className="mt-0.5 shrink-0"/> Call media is encrypted by WebRTC and is not recorded by this feature. The link is private, but anyone holding an unused invitation can join. AI is not part of this video call. No System Switch is charged.</p>
  </section>
}

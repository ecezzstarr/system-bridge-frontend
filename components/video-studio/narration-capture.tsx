'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Mic, MicOff, Upload } from 'lucide-react'

type Props = {
  uploadEndpoint: string
  onUploaded: (url: string) => Promise<void> | void
  existingUrl?: string | null
}

export function WeaveNarrationCapture({ uploadEndpoint, onUploaded, existingUrl }: Props) {
  const recorder = useRef<MediaRecorder | null>(null)
  const micStream = useRef<MediaStream | null>(null)
  const [recording,setRecording] = useState(false)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')

  async function upload(file: File) {
    setBusy(true)
    setMessage('')
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const form = new FormData()
      form.append('file',file)
      const response = await fetch(uploadEndpoint,{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body:form})
      const result = await response.json().catch(()=>({}))
      if (!response.ok || !result.success || result.mediaType!=='audio') throw new Error(result.error||'Narration upload failed')
      await onUploaded(result.url)
      setMessage('Narration saved inside WEAVE Studio.')
    } catch (error:any) {
      setMessage(error.message||'Narration upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function start() {
    setMessage('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==='undefined') {
      setMessage('This browser cannot record a microphone. Upload a WAV, MP3, M4A, OGG or WEBM voice file instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
      micStream.current=stream
      const types=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus']
      const mime = types.find(type=>MediaRecorder.isTypeSupported(type))
      const r = new MediaRecorder(stream,mime?{mimeType:mime}:undefined)
      const chunks:Blob[]=[]
      r.ondataavailable=(event)=>{if(event.data.size)chunks.push(event.data)}
      r.onstop=()=>{
        const type=r.mimeType.split(';')[0]||'audio/webm'
        const extension=type==='audio/ogg'?'ogg':'webm'
        micStream.current?.getTracks().forEach(track=>track.stop())
        micStream.current=null
        recorder.current=null
        setRecording(false)
        if(chunks.length)void upload(new File(chunks,`weave-narration.${extension}`,{type}))
        else setMessage('No audio was captured. Please record again.')
      }
      r.onerror=()=>setMessage('Microphone recording interrupted')
      recorder.current=r
      r.start(250)
      setRecording(true)
    } catch (error:any) {
      micStream.current?.getTracks().forEach(track=>track.stop())
      micStream.current=null
      setMessage(error?.name==='NotAllowedError'?'Microphone permission was denied. You can upload narration instead.':String(error?.message||'Could not start microphone'))
    }
  }

  function stop() {
    if(recorder.current?.state==='recording')recorder.current.stop()
  }

  async function choose(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0]
    if(file)await upload(file)
    event.target.value=''
  }

  return <div className="space-y-3 border border-cyan-300/20 bg-cyan-300/[0.04] p-4">
    <div><p className="text-xs font-black uppercase tracking-wider text-cyan-200">WEAVE Narration Track</p><p className="mt-1 text-xs leading-5 text-slate-400">Use a professional recording or record your own voice. Spoken narration stays separate from background music and remains louder in the final video.</p></div>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={recording?stop:start} disabled={busy} className="inline-flex items-center gap-2 border border-cyan-300/30 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50">{recording?<MicOff className="h-4 w-4"/>:<Mic className="h-4 w-4"/>}{recording?'STOP RECORDING':'RECORD VOICE'}</button>
      <label className="inline-flex cursor-pointer items-center gap-2 border border-white/20 px-3 py-2 text-xs font-bold text-white"><Upload className="h-4 w-4"/>{busy?'UPLOADING…':'UPLOAD NARRATION'}<input className="hidden" type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/ogg,audio/webm" disabled={busy||recording} onChange={choose}/></label>
      {recording&&<span role="status" className="text-xs text-red-300">Microphone recording active</span>}
    </div>
    {existingUrl&&<audio className="w-full" src={existingUrl} controls preload="metadata"/>}
    {message&&<p role="status" className="text-xs text-cyan-100">{message}</p>}
  </div>
}

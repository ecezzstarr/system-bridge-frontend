'use client'

import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {audioPeaks,beginMusicLoop,exportMusicWav,type LiveMusic} from '@/lib/music-loop-engine'
import type {MusicArrangement,MusicSound,MusicTrack,VoicePosition,WordCue} from '@/lib/music-workshop'
import {Headphones,Mic,MicOff,Music2,Pause,Play,Plus,Save,Trash2,Upload,Volume2,Download} from 'lucide-react'

export type MusicProject={id:string;title:string;arrangement:MusicArrangement;created_by:string;updated_at:string}
export type MusicAsset={id:string;original_name:string;media_type:string;size_bytes:number;created_at:string}
type Props={
 project:MusicProject;assets:MusicAsset[];fileNumber:string;
 onSaved:(next:MusicProject)=>Promise<void>;onAsset:(file:File)=>Promise<MusicAsset>;onClose:()=>void
}
const button='inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-200/20 bg-cyan-200/[.075] px-4 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-200/15 disabled:opacity-40'
const field='w-full rounded-lg border border-white/15 bg-slate-950/90 px-2 py-2 text-xs text-white outline-none focus:border-cyan-300/45'
const soundOptions:MusicSound[]=['ember','river','glass','bass','pulse','uploaded']
const titleCase=(str:string)=>str.charAt(0).toUpperCase()+str.slice(1)
const mediaEndpoint='/api/music-workshop/media'
const id=()=>Math.random().toString(36).slice(2,12)+Date.now().toString(36)
function SoundMeter({analyser}:{analyser:AnalyserNode|null}){
 const canvas=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{
  const element=canvas.current;if(!element)return
  const ctx=element.getContext('2d');if(!ctx)return
  const bins=new Uint8Array(64);let alive=true,frame=0
  const paint=()=>{
   if(!alive)return
   const w=element.width,h=element.height
   ctx.clearRect(0,0,w,h)
   if(analyser)analyser.getByteFrequencyData(bins)
   for(let index=0;index<64;index++){
    const level=analyser?bins[index]/255:0
    const bar=level*(h-10)
    const x=index*(w/64)
    ctx.fillStyle=index<20?'#74e8d5':index<44?'#67b9e4':'#eeb875'
    ctx.fillRect(x,h-bar,w/64-2,bar)
   }
   frame=requestAnimationFrame(paint)
  }
  paint()
  return()=>{alive=false;cancelAnimationFrame(frame)}
 },[analyser])
 return <canvas width={640} height={110} ref={canvas} className="h-24 w-full" aria-label="Live analyzer driven by the actual output audio"/>
}
function Waveform({samples}:{samples?:number[]}){
 if(!samples?.length)return <div className="flex h-12 items-center rounded-lg border border-white/5 bg-slate-950/50 px-3 text-[10px] text-slate-500">
  The synthesized sound is heard on playback; the meter above displays its actual signal.
 </div>
 return <svg viewBox="0 0 320 48" className="h-12 w-full" role="img" aria-label="Waveform measured from decoded recording">
  <line x1="0" y1="24" x2="320" y2="24" stroke="#516373" strokeWidth="1"/>
  {samples.map((v,i)=>{
   const height=Math.max(1.5,v*42)
   return <rect key={i} x={i*320/samples.length+.4} y={24-height/2}
    width={Math.max(1,320/samples.length-1.3)} height={height} fill="#8ad8ed"/>
  })}
 </svg>
}
export default function MusicConversationEditor({project,assets,fileNumber,onSaved,onAsset,onClose}:Props){
 const [draft,setDraft]=useState(project)
 const [beat,setBeat]=useState(0)
 const [playing,setPlaying]=useState(false)
 const [analyser,setAnalyser]=useState<AnalyserNode|null>(null)
 const [busy,setBusy]=useState('')
 const [message,setMessage]=useState('')
 const [peaks,setPeaks]=useState<Record<string,number[]>>({})
 const [recording,setRecording]=useState<string|null>(null)
 const session=useRef<LiveMusic|null>(null)
 const recorder=useRef<MediaRecorder|null>(null)
 const micStream=useRef<MediaStream|null>(null)
 const callbackRef=useRef(onAsset)
 callbackRef.current=onAsset
 const projectDuration=(draft.arrangement.bars*4*60/draft.arrangement.bpm).toFixed(1)
 const activeWords=useMemo(()=>draft.arrangement.words.filter(c=>c.beat===beat),[draft.arrangement.words,beat])
 const update=(patch:Partial<MusicArrangement>)=>setDraft(d=>({...d,arrangement:{...d.arrangement,...patch}}))
 const updateTrack=(key:string,patch:Partial<MusicTrack>)=>setDraft(d=>({...d,arrangement:{
  ...d.arrangement,tracks:d.arrangement.tracks.map(t=>t.id===key?{...t,...patch}:t)
 }}))
 const updateCue=(key:string,patch:Partial<WordCue>)=>setDraft(d=>({...d,arrangement:{
  ...d.arrangement,words:d.arrangement.words.map(c=>c.id===key?{...c,...patch}:c)
 }}))
 const stop=useCallback(async()=>{
  const active=session.current;session.current=null
  setPlaying(false);setAnalyser(null);setBeat(0)
  if(active)await active.stop()
 },[])
 useEffect(()=>()=>{void stop();if(recorder.current?.state==='recording')recorder.current.stop()
  micStream.current?.getTracks().forEach(t=>t.stop())},[stop])
 const fetchAudio=useCallback(async(assetId:string)=>{
  const token=localStorage.getItem('ssb_auth_token')
  const res=await fetch(mediaEndpoint+'?assetId='+encodeURIComponent(assetId)+'&file='+encodeURIComponent(fileNumber),
   {headers:token?{Authorization:'Bearer '+token}:{},cache:'no-store'})
  if(!res.ok)throw Error((await res.json().catch(()=>({}))).error||'Cannot read this Client sound.')
  return res.arrayBuffer()
 },[fileNumber])
 const run=async(key:string,fn:()=>Promise<void>)=>{
  setBusy(key);setMessage('')
  try{await fn()}catch(error){setMessage(error instanceof Error?error.message:'Music production failed.')}
  finally{setBusy('')}
 }
 const save=()=>void run('save',async()=>{
  await onSaved(draft);setMessage('Word and sound arrangement saved to the Client File Folder.')
 })
 const play=()=>void run('play',async()=>{
  if(draft.arrangement.tracks.filter(t=>!t.muted).length<2)throw Error('Arrange at least two active tracks for a real conversation loop.')
  await stop()
  const next=await beginMusicLoop(draft.arrangement,fetchAudio,setBeat)
  session.current=next;setAnalyser(next.analyser);setPlaying(true)
 })
 const bounce=()=>void run('export',async()=>{
  if(draft.arrangement.tracks.filter(t=>!t.muted).length<2)throw Error('Use two or more active tracks before exporting.')
  const output=await exportMusicWav(draft.arrangement,fetchAudio)
  const url=URL.createObjectURL(output)
  const a=document.createElement('a');a.href=url
  a.download=draft.title.replace(/[^a-z0-9_-]+/gi,'-').slice(0,100)+'.wav'
  a.click();window.setTimeout(()=>URL.revokeObjectURL(url),2000)
  setMessage('Real mixed WAV exported, with beats and sound levels from this arrangement.')
 })
 const upload=async(file:File,key:string)=>{
  await run('upload-'+key,async()=>{
   const asset=await onAsset(file)
   updateTrack(key,{sound:'uploaded',assetId:asset.id,sourceBpm:draft.arrangement.bpm,title:file.name.replace(/\.[^.]+$/,'').slice(0,100)})
   const context=new AudioContext()
   try{
    const buffer=await context.decodeAudioData(await fetchAudio(asset.id))
    setPeaks(p=>({...p,[asset.id]:audioPeaks(buffer)}))
   }finally{await context.close()}
   setMessage('The real audio waveform is loaded. Set its source BPM to match it with the project.')
  })
 }
 const startMic=async(key:string)=>{
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
   setMessage('This browser cannot record audio. Upload an MP3, WAV, OGG, M4A or WEBM instead.');return
  }
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})
   micStream.current=stream
   const format=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type))
   const capture=new MediaRecorder(stream,format?{mimeType:format}:undefined)
   recorder.current=capture;const chunks:Blob[]=[]
   capture.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
   capture.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());micStream.current=null;recorder.current=null;setRecording(null)
    if(!chunks.length)return setMessage('No voice was captured.')
    const mime=capture.mimeType.split(';')[0]||'audio/webm'
    void upload(new File(chunks,'self-voice.'+(mime==='audio/ogg'?'ogg':'webm'),{type:mime}),key)
   }
   capture.start(250);setRecording(key)
  }catch(e){micStream.current?.getTracks().forEach(t=>t.stop());setMessage(e instanceof Error?e.message:'Microphone not available.')}
 }
 const stopMic=()=>{if(recorder.current?.state==='recording')recorder.current.stop()}
 const addTrack=()=>{
  if(draft.arrangement.tracks.length>=12)return setMessage('Twelve tracks is the current limit.')
  const track:MusicTrack={id:id(),title:'New sound',position:'self',sound:'glass',assetId:null,
   startBeat:0,repeatBars:2,level:.6,pan:0,note:64,sourceBpm:draft.arrangement.bpm,muted:false}
  update({tracks:[...draft.arrangement.tracks,track]})
 }
 const addWord=()=>{
  if(draft.arrangement.words.length>=32)return setMessage('The word lane supports up to 32 phrases.')
  update({words:[...draft.arrangement.words,{id:id(),text:'',position:'self',beat:0}]})
 }
 const maxBeat=draft.arrangement.bars*4-1
 return <section className="space-y-5" data-weave-music-editor="real-audio">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-cyan-300">WEAVE MUSIC · Interaction in Motion</p>
    <input value={draft.title} maxLength={180} onChange={e=>setDraft(x=>({...x,title:e.target.value}))}
     aria-label="Project title" className="mt-2 w-full min-w-0 border-b border-cyan-300/25 bg-transparent py-2 text-2xl font-bold text-white outline-none"/>
    <p className="mt-2 text-xs text-slate-400">A conversation formed between the Self and the Environment. Arrange the words, give each sound a position, and hear their loop return.</p>
   </div><button className={button} onClick={onClose}>Return to productions</button>
  </div>
  <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
   <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#070e16]">
    <img src="https://upload.wikimedia.org/wikipedia/commons/1/19/Mixing_desk_at_the_Hipposonic_Recording_Studio.jpg"
      alt="Actual recording studio mixing console at Hipposonic Recording Studio"
      className="h-40 w-full object-cover opacity-90 sm:h-48"/>
    <div className="border-t border-cyan-200/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">The studio · Real recording equipment</p>
     <p className="mt-1 text-[10px] text-slate-500">Image: Hipposonic Studios, <a className="underline" target="_blank" rel="noreferrer" href="https://commons.wikimedia.org/wiki/File:Mixing_desk_at_the_Hipposonic_Recording_Studio.jpg">CC BY-SA 4.0</a> · unchanged</p>
    </div>
   </div>
   <div className="rounded-2xl border border-cyan-300/15 bg-[#081625] p-5">
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">Live sound meter</h3><Volume2 className="h-4 w-4 text-cyan-200"/></div>
    <SoundMeter analyser={analyser}/>
    <div className="min-h-14 border-l-2 border-cyan-300/35 pl-3">
     <p className="text-[10px] font-bold uppercase text-cyan-200">Beat {beat+1} · Current voice</p>
     <p className="mt-1 text-sm text-slate-200">{activeWords.map(c=>c.text).filter(Boolean).join(' / ')||'The music moves while the next words approach.'}</p>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
     <button disabled={Boolean(busy)} className={button} onClick={playing?()=>void stop():play}>
      {playing?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4"/>}{playing?'Stop loop':'Play conversation'}</button>
     <button disabled={Boolean(busy)} className={button} onClick={save}><Save className="h-4 w-4"/>Save</button>
     <button disabled={Boolean(busy)} className={button} onClick={bounce}><Download className="h-4 w-4"/>Export WAV</button>
    </div>
   </div>
  </div>
  <section className="rounded-2xl border border-white/10 bg-[#0b1520] p-4 sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h3 className="flex items-center gap-2 text-lg font-bold"><Music2 className="h-5 w-5 text-cyan-300"/> The loop pattern</h3>
     <p className="mt-1 text-xs text-slate-400">All tracks follow one shared beat clock. Self offers a phrase; Environment replies. Repeat the conversation every four or eight bars.</p></div>
    <div className="flex gap-3">
     <label className="text-xs text-slate-300">Tempo (BPM)<input aria-label="BPM" className={field+' mt-1 w-24'} type="number" min={50} max={180} value={draft.arrangement.bpm}
       onChange={e=>update({bpm:Math.max(50,Math.min(180,Number(e.target.value)||96))})}/></label>
     <label className="text-xs text-slate-300">Bars<select className={field+' mt-1'} value={draft.arrangement.bars} onChange={e=>update({bars:Number(e.target.value) as 4|8})}>
      <option value="4">4 bars</option><option value="8">8 bars</option></select></label>
    </div>
   </div>
   <p className="mt-3 text-[11px] text-slate-500">{draft.arrangement.bars*4} beats · {projectDuration}s loop · 4 beats per bar · Sources with different tempos are speed-aligned, which can change pitch.</p>
   <div className="mt-5 space-y-4">
    {draft.arrangement.tracks.map((track,index)=><div key={track.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3 sm:p-4">
     <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-md bg-cyan-300/10 px-2 py-1 text-xs font-bold text-cyan-200">{String(index+1).padStart(2,'0')}</span>
      <input aria-label="Track title" className={field+' min-w-36 flex-1'} value={track.title} maxLength={100} onChange={e=>updateTrack(track.id,{title:e.target.value})}/>
      <select aria-label="Self or environment lane" className={field+' max-w-40'} value={track.position}
       onChange={e=>updateTrack(track.id,{position:e.target.value as VoicePosition})}><option value="self">SELF · lead</option><option value="environment">ENVIRONMENT · answer</option></select>
      <button title="Mute or unmute" className={button} onClick={()=>updateTrack(track.id,{muted:!track.muted})}>{track.muted?'Unmute':'Mute'}</button>
      <button aria-label="Remove track" className={button} disabled={draft.arrangement.tracks.length<=2} onClick={()=>update({tracks:draft.arrangement.tracks.filter(t=>t.id!==track.id)})}><Trash2 className="h-4 w-4"/></button>
     </div>
     <Waveform samples={track.assetId?peaks[track.assetId]:undefined}/>
     <div className="mt-2 grid gap-1" style={{gridTemplateColumns:'repeat('+draft.arrangement.bars*4+',minmax(0,1fr))'}}>
      {Array.from({length:draft.arrangement.bars*4},(_,index)=><button
       key={index} title={'Begin sound on beat '+(index+1)} onClick={()=>updateTrack(track.id,{startBeat:index})}
       className={'h-8 min-w-0 rounded-[3px] border '+(track.startBeat===index?'border-amber-200 bg-amber-300/55':index%4===0?'border-cyan-300/15 bg-cyan-300/10':'border-white/5 bg-white/[.025]')}/>
      )}
     </div>
     <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <label className="text-[10px] text-slate-400">Sound<select className={field+' mt-1'} value={track.sound}
        onChange={e=>{const sound=e.target.value as MusicSound;updateTrack(track.id,{sound,assetId:sound==='uploaded'?assets[0]?.id||null:null})}}>
       {soundOptions.filter(s=>s!=='uploaded'||assets.length).map(s=><option key={s} value={s}>{titleCase(s)}</option>)}</select></label>
      <label className="text-[10px] text-slate-400">Repeat every<select className={field+' mt-1'} value={track.repeatBars}
        onChange={e=>updateTrack(track.id,{repeatBars:Number(e.target.value) as 1|2|4})}>
       <option value="1">1 bar</option><option value="2">2 bars</option><option value="4">4 bars</option></select></label>
      <label className="text-[10px] text-slate-400">Level {Math.round(track.level*100)}%<input aria-label="Track level" type="range" className="mt-3 w-full accent-cyan-300" min={0} max={1} step={.01}
       value={track.level} onChange={e=>updateTrack(track.id,{level:Number(e.target.value)})}/></label>
      <label className="text-[10px] text-slate-400">Stereo position<input aria-label="Stereo pan" type="range" className="mt-3 w-full accent-cyan-300" min={-1} max={1} step={.05}
       value={track.pan} onChange={e=>updateTrack(track.id,{pan:Number(e.target.value)})}/></label>
      {track.sound==='uploaded'?<label className="text-[10px] text-slate-400">Source BPM<input className={field+' mt-1'} type="number" min={50} max={180} value={track.sourceBpm}
        onChange={e=>updateTrack(track.id,{sourceBpm:Number(e.target.value)})}/></label>
       :<label className="text-[10px] text-slate-400">Note (MIDI)<input className={field+' mt-1'} type="number" min={36} max={96} value={track.note}
         onChange={e=>updateTrack(track.id,{note:Number(e.target.value)})}/></label>}
      {track.sound==='uploaded'&&<label className="text-[10px] text-slate-400">My recorded sounds<select className={field+' mt-1'} value={track.assetId||''}
       onChange={e=>updateTrack(track.id,{assetId:e.target.value})}>{assets.map(asset=><option key={asset.id} value={asset.id}>{asset.original_name}</option>)}</select></label>}
     </div>
     <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className={button+' cursor-pointer'}><Upload className="h-4 w-4"/>Upload sound
       <input type="file" className="sr-only" accept="audio/mp3,audio/mpeg,audio/ogg,audio/webm,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a"
        onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file,track.id);e.target.value=''}}/>
      </label>
      <button className={button} disabled={Boolean(busy)||(recording!==null&&recording!==track.id)}
       onClick={()=>recording===track.id?stopMic():void startMic(track.id)}>
       {recording===track.id?<MicOff className="h-4 w-4"/>:<Mic className="h-4 w-4"/>}{recording===track.id?'Stop and save voice':'Record words / sound'}</button>
      {track.assetId&&<span className="text-[10px] text-emerald-300">Recorded audio belongs to this Client File Folder</span>}
     </div>
    </div>)}
   </div>
   <button className={button+' mt-4'} disabled={draft.arrangement.tracks.length>=12} onClick={addTrack}><Plus className="h-4 w-4"/>Add sound track</button>
  </section>
  <section className="rounded-2xl border border-white/10 bg-[#0b1520] p-4 sm:p-5">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div><h3 className="text-lg font-bold">The words in motion</h3>
     <p className="mt-2 text-xs text-slate-400">Place the wording where each voice should enter. These are visible script cues, not synthetic spoken recordings. Record a Self voice track to hear words in the mix.</p></div>
    <button className={button} onClick={addWord}><Plus className="h-4 w-4"/>Add words</button>
   </div>
   <div className="mt-4 grid gap-3 md:grid-cols-2">
    {[...draft.arrangement.words].sort((a,b)=>a.beat-b.beat).map(cue=><div key={cue.id}
     className={'rounded-xl border p-3 '+(beat===cue.beat?'border-amber-200/50 bg-amber-300/[.06]':'border-white/10 bg-white/[.02]')}>
     <div className="flex items-center gap-2">
      <select aria-label="Who says these words" className={field} value={cue.position}
       onChange={e=>updateCue(cue.id,{position:e.target.value as VoicePosition})}>
       <option value="self">SELF speaks</option><option value="environment">ENVIRONMENT answers</option></select>
      <label className="shrink-0 text-[10px] text-slate-400">Beat<input type="number" className={field+' mt-1 w-16'} min={0} max={maxBeat} value={cue.beat}
       onChange={e=>updateCue(cue.id,{beat:Math.max(0,Math.min(maxBeat,Number(e.target.value)||0))})}/></label>
      <button aria-label="Remove words" className={button} onClick={()=>update({words:draft.arrangement.words.filter(w=>w.id!==cue.id)})}><Trash2 className="h-4 w-4"/></button>
     </div>
     <textarea className={field+' mt-2 min-h-20 resize-y'} maxLength={240} value={cue.text} placeholder="Enter the words of this voice…"
      onChange={e=>updateCue(cue.id,{text:e.target.value})}/>
    </div>)}
   </div>
  </section>
  <p className="text-xs leading-5 text-slate-400"><Headphones className="mr-1 inline h-4 w-4"/>Audio is actually synthesized or decoded in your browser and arranged on a Web Audio clock. Recording requires microphone permission. Save keeps the arrangement and uploaded recordings; WAV export renders the mixed loop locally. Use audio you recorded or have permission to use.</p>
  {message&&<p role="status" className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.05] px-4 py-3 text-sm text-cyan-100">{message}</p>}
 </section>
}

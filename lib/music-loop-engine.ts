import type {MusicArrangement,MusicTrack} from '@/lib/music-workshop'

export type AudioBuffers=Map<string,AudioBuffer>
export const barSeconds=(arr:MusicArrangement)=>60/arr.bpm*4
export const loopSeconds=(arr:MusicArrangement)=>barSeconds(arr)*arr.bars
const hz=(note:number)=>440*Math.pow(2,(note-69)/12)
const periodBeats=(track:MusicTrack)=>track.repeatBars*4
const isOnBeat=(track:MusicTrack,index:number)=>{
 const step=periodBeats(track)
 return index>=track.startBeat&&index%step===track.startBeat%step
}
function createNoise(context:BaseAudioContext,length:number){
 const sampleRate=context.sampleRate
 const buffer=context.createBuffer(1,Math.max(1,Math.ceil(length*sampleRate)),sampleRate)
 const data=buffer.getChannelData(0)
 let next=5381
 for(let n=0;n<data.length;n++){
  next=(Math.imul(next,1664525)+1013904223)>>>0
  data[n]=((next/4294967295)*2-1)*.6
 }
 return buffer
}
function emitTone(context:BaseAudioContext,destination:AudioNode,track:MusicTrack,when:number,duration:number,frequency:number){
 const gain=context.createGain()
 const noteLength=Math.max(.055,Math.min(duration,.85))
 const attack=Math.min(.028,noteLength*.12)
 gain.gain.setValueAtTime(.0001,when)
 gain.gain.linearRampToValueAtTime(track.sound==='bass'?.32:.24,when+attack)
 gain.gain.exponentialRampToValueAtTime(.0001,when+noteLength)
 const oscillator=context.createOscillator()
 oscillator.type=track.sound==='bass'?'sine':track.sound==='glass'?'sine':track.sound==='pulse'?'square':'triangle'
 oscillator.frequency.setValueAtTime(frequency,when)
 if(track.sound==='ember')oscillator.frequency.exponentialRampToValueAtTime(frequency*.997,when+noteLength)
 const filter=context.createBiquadFilter()
 filter.type='lowpass';filter.frequency.value=track.sound==='pulse'?1100:track.sound==='bass'?500:2400
 oscillator.connect(filter);filter.connect(gain);gain.connect(destination)
 oscillator.start(when);oscillator.stop(when+noteLength+.01)
}
function scheduleTrack(context:BaseAudioContext,track:MusicTrack,arr:MusicArrangement,
 buffers:AudioBuffers,when:number){
 if(track.muted||track.level<=0)return
 const unit=60/arr.bpm
 const phraseLength=periodBeats(track)*unit
 const volume=context.createGain()
 volume.gain.value=track.level*.72
 const pan=context.createStereoPanner()
 pan.pan.value=track.pan
 volume.connect(pan)
 const bus=(context as BaseAudioContext & {__weaveMusicBus?:AudioNode}).__weaveMusicBus
 if(!bus)return
 pan.connect(bus)
 if(track.sound==='uploaded'){
  const buffer=track.assetId?buffers.get(track.assetId):undefined
  if(!buffer)return
  const src=context.createBufferSource();src.buffer=buffer
  // Playback-rate matching aligns sample tempo; it also changes pitch.
  src.playbackRate.value=arr.bpm/track.sourceBpm
  src.connect(volume);src.start(when)
  src.stop(when+Math.min(phraseLength,buffer.duration/src.playbackRate.value))
  return
 }
 if(track.sound==='river'){
  const src=context.createBufferSource()
  src.buffer=createNoise(context,phraseLength)
  const filter=context.createBiquadFilter()
  filter.type='bandpass';filter.frequency.setValueAtTime(330,when)
  filter.frequency.linearRampToValueAtTime(870,when+phraseLength*.65)
  filter.Q.value=.48
  const swell=context.createGain()
  swell.gain.setValueAtTime(.0001,when)
  swell.gain.linearRampToValueAtTime(.34,when+Math.min(.28,phraseLength*.2))
  swell.gain.setValueAtTime(.34,when+phraseLength*.7)
  swell.gain.linearRampToValueAtTime(.0001,when+phraseLength)
  src.connect(filter);filter.connect(swell);swell.connect(volume)
  src.start(when);src.stop(when+phraseLength)
  return
 }
 const intervals=track.position==='self'?[0,3,7,5]:[7,5,3,0]
 const notes=track.sound==='pulse'?[0,0,5,0]:track.sound==='bass'?[0,0,3,0]:intervals
 const notesLength=track.sound==='bass'?.78:track.sound==='glass'?1.25:.4
 for(let beat=0;beat<4;beat++){
  const time=when+beat*(phraseLength/4)
  emitTone(context,volume,track,time,Math.min(notesLength,phraseLength/4*.96),hz(track.note+notes[beat]))
 }
}
export function renderBeat(context:BaseAudioContext,arr:MusicArrangement,buffers:AudioBuffers,beat:number,time:number){
 for(const track of arr.tracks)if(isOnBeat(track,beat))scheduleTrack(context,track,arr,buffers,time)
}
export async function loadMusicBuffers(
 context:BaseAudioContext,arr:MusicArrangement,
 fetchAsset:(id:string)=>Promise<ArrayBuffer>
){
 const buffers:AudioBuffers=new Map()
 const ids=[...new Set(arr.tracks.filter(t=>t.sound==='uploaded'&&t.assetId).map(t=>t.assetId!))]
 await Promise.all(ids.map(async id=>{
  const data=await fetchAsset(id)
  buffers.set(id,await context.decodeAudioData(data.slice(0)))
 }))
 return buffers
}
export type LiveMusic={
 context:AudioContext;analyser:AnalyserNode;stop:()=>Promise<void>;getBeat:()=>number
}
export async function beginMusicLoop(
 arr:MusicArrangement,fetchAsset:(id:string)=>Promise<ArrayBuffer>,
 tick:(beat:number)=>void
):Promise<LiveMusic>{
 // Create/resume immediately during the click gesture before asynchronous upload reads.
 const context=new AudioContext()
 try{
  await context.resume()
  const buffers=await loadMusicBuffers(context,arr,fetchAsset)
  const analyser=context.createAnalyser();analyser.fftSize=1024
  const master=context.createGain();master.gain.value=.77
  master.connect(analyser);analyser.connect(context.destination)
  ;(context as AudioContext & {__weaveMusicBus?:AudioNode}).__weaveMusicBus=master
  const unit=60/arr.bpm,totalBeats=arr.bars*4
  const start=context.currentTime+.2
  let next=0,active=true
  const nextPulse=()=>{
   if(!active)return
   while(start+next*unit<context.currentTime+.25){
    const when=start+next*unit
    renderBeat(context,arr,buffers,next%totalBeats,when)
    next++
   }
   const beat=Math.max(0,Math.floor((context.currentTime-start)/unit))
   tick(beat%totalBeats)
  }
  nextPulse()
  const timer=window.setInterval(nextPulse,45)
  window.dispatchEvent(new CustomEvent('weave:personal-dj',{detail:{active:true}}))
  return {context,analyser,getBeat:()=>Math.max(0,Math.floor((context.currentTime-start)/unit))%totalBeats,
   stop:async()=>{active=false;window.clearInterval(timer)
    window.dispatchEvent(new CustomEvent('weave:personal-dj',{detail:{active:false}}))
    await context.close().catch(()=>{})}}
 }catch(error){await context.close().catch(()=>{});throw error}
}
function exportWav(buffer:AudioBuffer){
 const channels=2,frames=buffer.length
 const raw=new ArrayBuffer(44+frames*channels*2)
 const view=new DataView(raw)
 let offset=0
 const chars=(text:string)=>{for(const c of text)view.setUint8(offset++,c.charCodeAt(0))}
 const u16=(value:number)=>{view.setUint16(offset,value,true);offset+=2}
 const u32=(value:number)=>{view.setUint32(offset,value,true);offset+=4}
 chars('RIFF');u32(raw.byteLength-8);chars('WAVE');chars('fmt ')
 u32(16);u16(1);u16(channels);u32(buffer.sampleRate)
 u32(buffer.sampleRate*channels*2);u16(channels*2);u16(16)
 chars('data');u32(frames*channels*2)
 const l=buffer.getChannelData(0),r=buffer.numberOfChannels>1?buffer.getChannelData(1):l
 for(let i=0;i<frames;i++)for(const sample of [l[i],r[i]]){
  const bounded=Math.max(-1,Math.min(1,sample))
  view.setInt16(offset,bounded<0?bounded*32768:bounded*32767,true);offset+=2
 }
 return new Blob([raw],{type:'audio/wav'})
}
export async function exportMusicWav(
 arrangement:MusicArrangement,fetchAsset:(id:string)=>Promise<ArrayBuffer>
){
 const seconds=loopSeconds(arrangement),sampleRate=44100
 const context=new OfflineAudioContext(2,Math.ceil((seconds+.2)*sampleRate),sampleRate)
 const buffers=await loadMusicBuffers(context,arrangement,fetchAsset)
 const master=context.createGain();master.gain.value=.7
 master.connect(context.destination)
 ;(context as OfflineAudioContext & {__weaveMusicBus?:AudioNode}).__weaveMusicBus=master
 for(let beat=0;beat<arrangement.bars*4;beat++)
  renderBeat(context,arrangement,buffers,beat,beat*60/arrangement.bpm)
 const rendered=await context.startRendering()
 return exportWav(rendered)
}
export function audioPeaks(buffer:AudioBuffer,bins=80){
 const data=buffer.getChannelData(0),output:number[]=[]
 for(let i=0;i<bins;i++){
  const first=Math.floor(i*data.length/bins),end=Math.min(data.length,Math.floor((i+1)*data.length/bins))
  let peak=0
  for(let index=first;index<end;index++)peak=Math.max(peak,Math.abs(data[index]))
  output.push(peak)
 }
 return output
}

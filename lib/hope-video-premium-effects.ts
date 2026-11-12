'use client'

import type { HopeVideoFilter } from '@/lib/hope-video-filter-catalog'

/**
 * Browser-only visual processing. MediaPipe WASM/ML assets download on first use;
 * frames and face landmarks are processed locally, not uploaded to WEAVE or Google.
 * These models are static resources, not a billable image/video-generation API.
 */
const SDK_VERSION='1.2.2'
const SDK_BASE='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@'+SDK_VERSION
const SEGMENTER_MODEL='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite'
const FACE_MODEL='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

type Landmark={x:number;y:number;z?:number}
type SegResult={categoryMask?:{width:number;height:number;getAsUint8Array():Uint8Array;close?():void}}
type SegModel={segmentForVideo(source:HTMLVideoElement,time:number):SegResult;close():void}
type FaceModel={detectForVideo(source:HTMLVideoElement,time:number):{faceLandmarks:Landmark[][]};close():void}
type VisionSDK={
 FilesetResolver:{forVisionTasks(url:string):Promise<unknown>}
 ImageSegmenter:{createFromOptions(fileset:unknown,options:unknown):Promise<SegModel>}
 FaceLandmarker:{createFromOptions(fileset:unknown,options:unknown):Promise<FaceModel>}
}
let sdkPromise:Promise<VisionSDK>|null=null
let segmentPromise:Promise<SegModel>|null=null
let facePromise:Promise<FaceModel>|null=null

function loadVisionSDK() {
  if(!sdkPromise)sdkPromise=(async()=>{
    const url=SDK_BASE+'/vision_bundle.mjs'
    // Browser dynamic import loads a pinned static ESM bundle, not the camera feed.
    const sdk=await import(/* webpackIgnore: true */ url) as VisionSDK
    if(!sdk?.ImageSegmenter||!sdk?.FaceLandmarker||!sdk?.FilesetResolver){
      throw new Error('Required live-video vision module is unavailable.')
    }
    return sdk
  })().catch(error=>{sdkPromise=null;throw error})
  return sdkPromise
}

async function segmentationModel():Promise<SegModel>{
  if(!segmentPromise)segmentPromise=(async()=>{
    const sdk=await loadVisionSDK()
    const fileset=await sdk.FilesetResolver.forVisionTasks(SDK_BASE+'/wasm')
    return sdk.ImageSegmenter.createFromOptions(fileset,{
      baseOptions:{modelAssetPath:SEGMENTER_MODEL,delegate:'CPU'},
      runningMode:'VIDEO',
      outputCategoryMask:true,outputConfidenceMasks:false,
    })
  })().catch(error=>{segmentPromise=null;throw error})
  return segmentPromise
}

async function faceModel():Promise<FaceModel>{
  if(!facePromise)facePromise=(async()=>{
    const sdk=await loadVisionSDK()
    const fileset=await sdk.FilesetResolver.forVisionTasks(SDK_BASE+'/wasm')
    return sdk.FaceLandmarker.createFromOptions(fileset,{
      baseOptions:{modelAssetPath:FACE_MODEL,delegate:'CPU'},
      runningMode:'VIDEO',numFaces:1,
      outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false,
    })
  })().catch(error=>{facePromise=null;throw error})
  return facePromise
}

async function getSceneImage(path:string) {
  if(!path.startsWith('/weave/'))throw new Error('Invalid company background')
  const image=new Image()
  image.decoding='async'
  image.src=path
  await image.decode()
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('The chosen background could not load')
  return image
}

export type PreparedHopeEffect={
 filter:HopeVideoFilter
 background?:HTMLImageElement
 segmenter?:SegModel
 face?:FaceModel
 personMask:HTMLCanvasElement
 personLayer:HTMLCanvasElement
 lastSegmentAt:number
 lastFaceAt:number
 faceLandmarks:Landmark[]|null
 havePersonMask:boolean
}

/** Must succeed before paying for a costly effect on a specific device. */
export async function prepareHopeVideoEffect(filter:HopeVideoFilter):Promise<PreparedHopeEffect>{
  const canvas=document.createElement('canvas')
  if(typeof canvas.captureStream!=='function'||!canvas.getContext('2d')){
    throw new Error('This device cannot transmit the effect. No purchase should be made.')
  }
  const kind=filter.effectKind
  if(kind==='color')return {filter,personMask:canvas,personLayer:document.createElement('canvas'),lastSegmentAt:0,lastFaceAt:0,faceLandmarks:null,havePersonMask:false}
  try {
    const [background,segmenter,face]=await Promise.all([
      kind==='scene'&&filter.sceneSrc?getSceneImage(filter.sceneSrc):Promise.resolve(undefined),
      (kind==='scene'||kind==='remove')?segmentationModel():Promise.resolve(undefined),
      kind==='face'?faceModel():Promise.resolve(undefined),
    ])
    return {filter,background,segmenter,face,personMask:canvas,personLayer:document.createElement('canvas'),
      lastSegmentAt:0,lastFaceAt:0,faceLandmarks:null,havePersonMask:false}
  }catch(error){
    console.warn('[WEAVE Hope premium vision] asset/model could not be prepared',error)
    throw new Error('This device could not load the live vision effect. No System Switch has been charged. Check your connection or use a supported browser.')
  }
}

function drawCover(ctx:CanvasRenderingContext2D,image:CanvasImageSource,iw:number,ih:number,w:number,h:number) {
  const scale=Math.max(w/iw,h/ih)
  const dw=iw*scale,dh=ih*scale
  ctx.drawImage(image,(w-dw)/2,(h-dh)/2,dw,dh)
}
function updatePersonMask(stage:PreparedHopeEffect,source:HTMLVideoElement,time:number){
  if(!stage.segmenter||time-stage.lastSegmentAt<120)return
  stage.lastSegmentAt=time
  const result=stage.segmenter.segmentForVideo(source,time)
  const mask=result.categoryMask
  if(!mask)return
  const bytes=mask.getAsUint8Array()
  const w=mask.width,h=mask.height
  if(bytes.length!==w*h||!w||!h)return
  const canvas=stage.personMask
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  const ctx=canvas.getContext('2d',{willReadFrequently:true})
  if(!ctx)return
  const image=ctx.createImageData(w,h)
  for(let i=0;i<bytes.length;i++){
    const o=i*4
    image.data[o]=255
    image.data[o+1]=255
    image.data[o+2]=255
    image.data[o+3]=bytes[i]===1?255:0
  }
  ctx.putImageData(image,0,0)
  stage.havePersonMask=true
  // The result owns the temporary mask; do not retain it between inference frames.
  mask.close?.()
}

function drawSyntheticFace(
 ctx:CanvasRenderingContext2D,
 landmarks:Landmark[],
 w:number,h:number,
 style:'cyber'|'gold'|'anonymous'
){
  if(landmarks.length<300)return
  const xs=landmarks.map(p=>p.x*w),ys=landmarks.map(p=>p.y*h)
  const minX=Math.min(...xs),maxX=Math.max(...xs)
  const minY=Math.min(...ys),maxY=Math.max(...ys)
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2
  const rx=Math.max(12,(maxX-minX)*.53)
  const ry=Math.max(18,(maxY-minY)*.55)
  const left=landmarks[33],right=landmarks[263]
  const tilt=left&&right?Math.atan2(right.y-left.y,right.x-left.x):0
  const palette=style==='gold'?['#c69a53','#fff4c3','#604422']:
    style==='anonymous'?['#1a2735','#d0dae5','#4b657e']:['#172b53','#54e4ef','#af79ff']
  ctx.save()
  ctx.translate(cx,cy)
  ctx.rotate(tilt)
  ctx.shadowColor=palette[1]
  ctx.shadowBlur=16
  ctx.fillStyle=palette[0]
  ctx.strokeStyle=palette[1]
  ctx.lineWidth=Math.max(2,rx*.045)
  ctx.beginPath()
  ctx.ellipse(0,0,rx*.95,ry*.98,0,0,Math.PI*2)
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur=0
  // The wholly synthetic visor conceals the original face rather than imitating someone.
  ctx.fillStyle=palette[2]
  ctx.beginPath()
  ctx.ellipse(0,-ry*.11,rx*.8,ry*.24,0,0,Math.PI*2)
  ctx.fill()
  ctx.strokeStyle=palette[1]
  ctx.lineWidth=Math.max(3,rx*.055)
  ctx.beginPath()
  ctx.moveTo(-rx*.61,-ry*.11)
  ctx.lineTo(-rx*.13,-ry*.2)
  ctx.moveTo(rx*.12,-ry*.2)
  ctx.lineTo(rx*.62,-ry*.11)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-rx*.25,ry*.54)
  ctx.lineTo(rx*.25,ry*.54)
  ctx.stroke()
  if(style==='cyber'){
    ctx.beginPath()
    ctx.moveTo(-rx*.5,ry*.11)
    ctx.lineTo(0,ry*.25)
    ctx.lineTo(rx*.5,ry*.11)
    ctx.stroke()
  }
  ctx.restore()
}

/** Render into the actual WebRTC canvas. No image frames leave the browser. */
export function paintHopePremiumFrame(
 stage:PreparedHopeEffect,
 source:HTMLVideoElement,
 ctx:CanvasRenderingContext2D,
 w:number,h:number,time:number
):void {
  const {filter}=stage
  if(source.readyState<2)return
  if(filter.effectKind==='face'){
    ctx.drawImage(source,0,0,w,h)
    if(stage.face && time-stage.lastFaceAt>=140){
      stage.lastFaceAt=time
      const detected=stage.face.detectForVideo(source,time)
      stage.faceLandmarks=detected.faceLandmarks[0]||null
    }
    if(stage.faceLandmarks)drawSyntheticFace(ctx,stage.faceLandmarks,w,h,filter.faceStyle||'anonymous')
    return
  }
  if(filter.effectKind!=='scene'&&filter.effectKind!=='remove')return
  // Never expose an unmasked background while model initialization is incomplete.
  if(filter.effectKind==='scene'&&stage.background){
    drawCover(ctx,stage.background,stage.background.naturalWidth,stage.background.naturalHeight,w,h)
  } else {
    ctx.fillStyle='#263641'
    ctx.fillRect(0,0,w,h)
  }
  updatePersonMask(stage,source,time)
  if(!stage.havePersonMask)return
  const person=stage.personLayer
  if(person.width!==w||person.height!==h){person.width=w;person.height=h}
  const layer=person.getContext('2d')
  if(!layer)return
  layer.clearRect(0,0,w,h)
  layer.drawImage(source,0,0,w,h)
  layer.globalCompositeOperation='destination-in'
  layer.filter='blur(1.1px)'
  layer.drawImage(stage.personMask,0,0,w,h)
  layer.filter='none'
  layer.globalCompositeOperation='source-over'
  ctx.drawImage(person,0,0,w,h)
}

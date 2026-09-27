export type WeaveMotionKind=
  |'presence'
  |'arrival'
  |'ignition'
  |'river'
  |'route'
  |'emergence'
  |'value'
  |'confirmation'
  |'interruption'

export type WeaveMotionDetail={
  kind:WeaveMotionKind
  label?:string
  intensity?:number
  x?:number
  y?:number
  source?:string
  confirmed?:boolean
}

const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value))

export function classifyWeaveMotion(label:string,type?:string):WeaveMotionKind{
  const value=String(label||'').toLowerCase()

  if(type==='arrival'||/arrived|enter territory|enter district|open .*world|open .*gate/.test(value))return 'arrival'
  if(/failed|error|unable|insufficient|locked|denied|unavailable|out of stock/.test(value))return 'interruption'
  if(/build|blueprint|foundation|structure|construction|commission|activate|system live|attach|install|module/.test(value))return 'emergence'
  if(/buy|purchase|deposit|withdraw|wallet|flame coin|payment|value|order|fund|credit/.test(value))return 'value'
  if(/route|movement|stream|broadcast|message|outreach|prospect|distribution|network/.test(value))return 'route'
  if(/publish|flame event|ignite|launch|ceremony/.test(value))return 'ignition'
  if(/verify|verified|confirm|confirmed|complete|completed|accept|approved|assigned|delivered/.test(value))return 'confirmation'
  if(/river|flow|continue|continuity|record|save/.test(value))return 'river'
  return type==='navigation'?'arrival':'presence'
}

export function emitWeaveMotion(detail:WeaveMotionDetail){
  if(typeof window==='undefined')return
  window.dispatchEvent(new CustomEvent<WeaveMotionDetail>('weave:system-motion',{
    detail:{
      ...detail,
      intensity:clamp(Number(detail.intensity||1),.15,2.5),
    },
  }))
}

export function emitWeaveActionMotion(
  action:string,
  options:Omit<WeaveMotionDetail,'kind'> & {kind?:WeaveMotionKind}={},
){
  emitWeaveMotion({
    ...options,
    kind:options.kind||classifyWeaveMotion(action),
    label:options.label||action,
  })
}

export function fileFolderMotion(action:string):WeaveMotionDetail{
  switch(action){
    case 'purchase_item':
      return {kind:'value',label:'Materials entered the File Folder',intensity:1.15,confirmed:true,source:'file-folder'}
    case 'start_build':
      return {kind:'emergence',label:'Construction started',intensity:1.55,confirmed:true,source:'file-folder'}
    case 'apply_item':
      return {kind:'emergence',label:'Build capability integrated',intensity:1.25,confirmed:true,source:'file-folder'}
    case 'library_start':
      return {kind:'river',label:'Knowledge movement opened',intensity:.75,confirmed:true,source:'file-folder'}
    case 'library_complete':
      return {kind:'confirmation',label:'Knowledge movement completed',intensity:1,confirmed:true,source:'file-folder'}
    case 'add_system_entry':
      return {kind:'river',label:'Live system movement recorded',intensity:.9,confirmed:true,source:'file-folder'}
    case 'toggle_system_entry':
      return {kind:'confirmation',label:'System movement changed state',intensity:.8,confirmed:true,source:'file-folder'}
    default:
      return {kind:'river',label:'File Folder movement recorded',intensity:.7,confirmed:true,source:'file-folder'}
  }
}

export function growthMotion(action:string):WeaveMotionDetail{
  switch(action){
    case 'create_business_route':
      return {kind:'route',label:'Business Route opened',intensity:1.45,confirmed:true,source:'growth-world'}
    case 'record_route_movement':
      return {kind:'route',label:'Business Route movement recorded',intensity:1.1,confirmed:true,source:'growth-world'}
    case 'close_business_route':
      return {kind:'confirmation',label:'Business Route closed',intensity:.7,confirmed:true,source:'growth-world'}
    case 'set_stream_live':
      return {kind:'ignition',label:'Streaming state changed',intensity:1.3,confirmed:true,source:'growth-world'}
    case 'add_stream_program':
      return {kind:'emergence',label:'Program formed',intensity:1,confirmed:true,source:'growth-world'}
    case 'save_stream_profile':
      return {kind:'river',label:'Streaming identity continued',intensity:.65,confirmed:true,source:'growth-world'}
    default:
      return {kind:'river',label:'Growth movement recorded',intensity:.75,confirmed:true,source:'growth-world'}
  }
}

import {trainingBriefsForRole,type WeaveLoadingBrief,type WeaveLoadingRole} from '@/lib/weave-loading-guidance'

export const LOADER_COPY_ROLES=['visitor','agent','bridger','client','admin','flame-event'] as const
export type LoaderCopyRole=typeof LOADER_COPY_ROLES[number]
const flameLessons:WeaveLoadingBrief[]=[
  {eyebrow:'FLAME EVENT · ARRIVAL',title:'The Burning River',body:'Flame Event is WEAVE’s shared world. Arrive through your actual position and discover the systems operating here.',movement:'Arrive → recognize → participate'},
  {eyebrow:'FLAME EVENT · CUSTOMER DOORS',title:'Discover living Client work.',body:'Visit public Customer Doors to inspect published Client products and services. Clients control what they offer and publish.',movement:'Discover → inspect → enter'},
  {eyebrow:'FLAME EVENT · REAL PARTICIPATION',title:'Continue into a working system.',body:'Orders, payments, applications and builds become verified only through their own operating systems. Choose one movement and confirm its real state.',movement:'Notice → recognize → solve → move'},
]
export const DEFAULT_LOADER_LESSONS=Object.fromEntries(
  LOADER_COPY_ROLES.map(role=>[role,(role==='flame-event'?flameLessons:trainingBriefsForRole(role as WeaveLoadingRole)).map(brief=>({...brief}))]),
) as Record<LoaderCopyRole,WeaveLoadingBrief[]>
export const DEFAULT_TRANSITION_NOTES:Record<WeaveLoadingRole,string>={visitor:'',agent:'',bridger:'',client:'',admin:''}

export type EnvironmentRuntimeConfig={
  loading:{
    bootMinMs:number
    transitMinMs:number
    settleQuietMs:number
    maxWaitMs:number
    waitForFonts:boolean
    waitForImages:boolean
    autoAdvanceMs:number
    lessons:Record<LoaderCopyRole,WeaveLoadingBrief[]>
    transitionNotes:Record<WeaveLoadingRole,string>
  }
  ambience:{
    enabled:boolean
    idleGain:number
    musicGain:number
    voiceGain:number
    footstepMinMs:number
    footstepMaxMs:number
    bellMinMs:number
    bellMaxMs:number
    movementMinMs:number
    movementMaxMs:number
  }
}

export const DEFAULT_ENVIRONMENT_RUNTIME_CONFIG:EnvironmentRuntimeConfig={
  loading:{
    bootMinMs:8000,
    transitMinMs:8000,
    settleQuietMs:420,
    maxWaitMs:18000,
    waitForFonts:true,
    waitForImages:true,
    autoAdvanceMs:2800,
    lessons:DEFAULT_LOADER_LESSONS,
    transitionNotes:DEFAULT_TRANSITION_NOTES,
  },
  ambience:{
    enabled:true,
    idleGain:0.024,
    musicGain:0.010,
    voiceGain:0.005,
    footstepMinMs:4200,
    footstepMaxMs:9800,
    bellMinMs:24000,
    bellMaxMs:50000,
    movementMinMs:8000,
    movementMaxMs:21000,
  },
}

const clamp=(value:unknown,min:number,max:number,fallback:number)=>{
  const n=Number(value)
  return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback
}

function loaderText(value:unknown,fallback:string,limit:number){
  if(typeof value!=='string')return fallback
  const text=value.trim()
  return text?text.slice(0,limit):fallback
}
function normalizeLoaderLessons(value:unknown):Record<LoaderCopyRole,WeaveLoadingBrief[]>{
  const source=value&&typeof value==='object'?value as Record<string,unknown>:{}
  return Object.fromEntries(LOADER_COPY_ROLES.map(role=>{
    const incoming=Array.isArray(source[role])?source[role]:[]
    const defaults=DEFAULT_LOADER_LESSONS[role]
    const lessons=defaults.map((fallback,index)=>{
      const candidate=incoming[index]&&typeof incoming[index]==='object'?incoming[index] as Partial<WeaveLoadingBrief>:{}
      return {
        eyebrow:loaderText(candidate.eyebrow,fallback.eyebrow,120),
        title:loaderText(candidate.title,fallback.title,160),
        body:loaderText(candidate.body,fallback.body,1200),
        movement:loaderText(candidate.movement,fallback.movement,240),
      }
    })
    return [role,lessons]
  })) as Record<LoaderCopyRole,WeaveLoadingBrief[]>
}
function normalizeTransitionNotes(value:unknown):Record<WeaveLoadingRole,string>{
  const source=value&&typeof value==='object'?value as Record<string,unknown>:{}
  return Object.fromEntries((['visitor','agent','bridger','client','admin'] as WeaveLoadingRole[]).map(role=>
    [role,typeof source[role]==='string'?source[role].trim().slice(0,500):'']
  )) as Record<WeaveLoadingRole,string>
}

export function normalizeEnvironmentRuntimeConfig(input:unknown):EnvironmentRuntimeConfig{
  const value=input&&typeof input==='object'?(input as any):{}
  const loading=value.loading&&typeof value.loading==='object'?value.loading:{}
  const ambience=value.ambience&&typeof value.ambience==='object'?value.ambience:{}

  const bootMinMs=Math.round(clamp(loading.bootMinMs,2000,30000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.loading.bootMinMs))
  const transitMinMs=Math.round(clamp(loading.transitMinMs,2000,30000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.loading.transitMinMs))
  const settleQuietMs=Math.round(clamp(loading.settleQuietMs,120,2000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.loading.settleQuietMs))
  const maxWaitFloor=Math.max(bootMinMs,transitMinMs)+500
  const requestedMaxWait=Math.round(clamp(
    loading.maxWaitMs,
    5000,
    60000,
    DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.loading.maxWaitMs,
  ))
  const maxWaitMs=Math.min(60000,Math.max(maxWaitFloor,requestedMaxWait))

  let footstepMinMs=Math.round(clamp(ambience.footstepMinMs,1800,30000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.ambience.footstepMinMs))
  let footstepMaxMs=Math.round(clamp(ambience.footstepMaxMs,footstepMinMs+500,45000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.ambience.footstepMaxMs))
  let bellMinMs=Math.round(clamp(ambience.bellMinMs,8000,120000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.ambience.bellMinMs))
  let bellMaxMs=Math.round(clamp(ambience.bellMaxMs,bellMinMs+2000,180000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.ambience.bellMaxMs))
  let movementMinMs=Math.round(clamp(ambience.movementMinMs,3000,60000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.ambience.movementMinMs))
  let movementMaxMs=Math.round(clamp(ambience.movementMaxMs,movementMinMs+1000,90000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.ambience.movementMaxMs))

  if(footstepMaxMs<=footstepMinMs)footstepMaxMs=footstepMinMs+500
  if(bellMaxMs<=bellMinMs)bellMaxMs=bellMinMs+2000
  if(movementMaxMs<=movementMinMs)movementMaxMs=movementMinMs+1000

  return {
    loading:{
      bootMinMs,
      transitMinMs,
      settleQuietMs,
      maxWaitMs,
      waitForFonts:loading.waitForFonts===undefined?DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.loading.waitForFonts:Boolean(loading.waitForFonts),
      waitForImages:loading.waitForImages===undefined?DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.loading.waitForImages:Boolean(loading.waitForImages),
      autoAdvanceMs:Math.round(clamp(loading.autoAdvanceMs,1500,12000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.loading.autoAdvanceMs)),
      lessons:normalizeLoaderLessons(loading.lessons),
      transitionNotes:normalizeTransitionNotes(loading.transitionNotes),
    },
    ambience:{
      enabled:ambience.enabled===undefined?DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.ambience.enabled:Boolean(ambience.enabled),
      idleGain:clamp(ambience.idleGain,0,0.08,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.ambience.idleGain),
      musicGain:clamp(ambience.musicGain,0,0.04,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.ambience.musicGain),
      voiceGain:clamp(ambience.voiceGain,0,0.025,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.ambience.voiceGain),
      footstepMinMs,
      footstepMaxMs,
      bellMinMs,
      bellMaxMs,
      movementMinMs,
      movementMaxMs,
    },
  }
}

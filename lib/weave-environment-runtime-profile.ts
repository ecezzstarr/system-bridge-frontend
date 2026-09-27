export type EnvironmentRuntimeConfig={
  loading:{
    bootMinMs:number
    transitMinMs:number
    settleQuietMs:number
    maxWaitMs:number
    waitForFonts:boolean
    waitForImages:boolean
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
    bootMinMs:3600,
    transitMinMs:900,
    settleQuietMs:420,
    maxWaitMs:8000,
    waitForFonts:true,
    waitForImages:true,
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

export function normalizeEnvironmentRuntimeConfig(input:unknown):EnvironmentRuntimeConfig{
  const value=input&&typeof input==='object'?(input as any):{}
  const loading=value.loading&&typeof value.loading==='object'?value.loading:{}
  const ambience=value.ambience&&typeof value.ambience==='object'?value.ambience:{}

  const bootMinMs=Math.round(clamp(loading.bootMinMs,1800,10000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.loading.bootMinMs))
  const transitMinMs=Math.round(clamp(loading.transitMinMs,350,5000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.loading.transitMinMs))
  const settleQuietMs=Math.round(clamp(loading.settleQuietMs,120,2000,DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.loading.settleQuietMs))
  const maxWaitFloor=Math.max(bootMinMs,transitMinMs)+500
  const requestedMaxWait=Math.round(clamp(
    loading.maxWaitMs,
    2500,
    15000,
    DEFAULT_ENVIRONMENT_RUNTIME_CONFIG.loading.maxWaitMs,
  ))
  const maxWaitMs=Math.min(15000,Math.max(maxWaitFloor,requestedMaxWait))

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

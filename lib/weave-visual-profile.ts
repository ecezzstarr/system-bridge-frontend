export const FLAME_ARTIFACT_PROFILE_KEY='flame-event-artifact' as const

export const FLAME_ARTIFACT_SURFACES=[
  'weave-hero',
  'bridge-radiance-core',
  'bridge-radiance-portals',
  'event-atmosphere',
  'client-event',
] as const

export type FlameArtifactSurface=typeof FLAME_ARTIFACT_SURFACES[number]

export type VisualWorldMode='normal'|'flame-event'|'quiet-river'|'ceremony'|'night-operations'

export type FlameArtifactVisualConfig={
  profileKey:typeof FLAME_ARTIFACT_PROFILE_KEY
  name:string
  enabled:boolean
  palette:{
    sky:string
    blue:string
    white:string
    red:string
    ember:string
    dark:string
  }
  motion:{
    enabled:boolean
    rotationSpeed:number
    floatStrength:number
  }
  appearance:{
    coreScale:number
    glow:number
    orbitOpacity:number
    wireframeOpacity:number
  }
  world:{
    enabled:boolean
    mode:VisualWorldMode
    flameEnabled:boolean
    riverEnabled:boolean
    flameIntensity:number
    flameFlow:number
    riverIntensity:number
    riverSpeed:number
    emberDensity:number
    heatDistortion:number
    routeCurrent:number
    emergence:number
    reflection:number
  }
  surfaces:Record<FlameArtifactSurface,boolean>
}

export const DEFAULT_FLAME_ARTIFACT_CONFIG:FlameArtifactVisualConfig={
  profileKey:FLAME_ARTIFACT_PROFILE_KEY,
  name:'Flame Event Artifact · 4D',
  enabled:true,
  palette:{
    sky:'#7dd3fc',
    blue:'#38bdf8',
    white:'#f8fafc',
    red:'#fb7185',
    ember:'#ef4444',
    dark:'#07111f',
  },
  motion:{
    enabled:true,
    rotationSpeed:1,
    floatStrength:0.055,
  },
  appearance:{
    coreScale:1,
    glow:1,
    orbitOpacity:1,
    wireframeOpacity:1,
  },
  world:{
    enabled:true,
    mode:'normal',
    flameEnabled:true,
    riverEnabled:true,
    flameIntensity:0.52,
    flameFlow:0.88,
    riverIntensity:0.22,
    riverSpeed:0.56,
    emberDensity:0.5,
    heatDistortion:0.2,
    routeCurrent:0.7,
    emergence:0.9,
    reflection:0.36,
  },
  surfaces:{
    'weave-hero':true,
    'bridge-radiance-core':true,
    'bridge-radiance-portals':true,
    'event-atmosphere':true,
    'client-event':true,
  },
}

const HEX=/^#[0-9a-fA-F]{6}$/
const clamp=(value:unknown,min:number,max:number,fallback:number)=>{
  const n=Number(value)
  return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback
}
const color=(value:unknown,fallback:string)=>typeof value==='string'&&HEX.test(value)?value.toLowerCase():fallback

export function normalizeFlameArtifactConfig(input:unknown):FlameArtifactVisualConfig{
  const value=input&&typeof input==='object'?(input as any):{}
  const palette=value.palette&&typeof value.palette==='object'?value.palette:{}
  const motion=value.motion&&typeof value.motion==='object'?value.motion:{}
  const appearance=value.appearance&&typeof value.appearance==='object'?value.appearance:{}
  const world=value.world&&typeof value.world==='object'?value.world:{}
  const surfaces=value.surfaces&&typeof value.surfaces==='object'?value.surfaces:{}
  const modes:VisualWorldMode[]=['normal','flame-event','quiet-river','ceremony','night-operations']
  const mode=modes.includes(world.mode as VisualWorldMode)
    ? world.mode as VisualWorldMode
    : DEFAULT_FLAME_ARTIFACT_CONFIG.world.mode

  return {
    profileKey:FLAME_ARTIFACT_PROFILE_KEY,
    name:typeof value.name==='string'&&value.name.trim()?value.name.trim().slice(0,120):DEFAULT_FLAME_ARTIFACT_CONFIG.name,
    enabled:value.enabled===undefined?DEFAULT_FLAME_ARTIFACT_CONFIG.enabled:Boolean(value.enabled),
    palette:{
      sky:color(palette.sky,DEFAULT_FLAME_ARTIFACT_CONFIG.palette.sky),
      blue:color(palette.blue,DEFAULT_FLAME_ARTIFACT_CONFIG.palette.blue),
      white:color(palette.white,DEFAULT_FLAME_ARTIFACT_CONFIG.palette.white),
      red:color(palette.red,DEFAULT_FLAME_ARTIFACT_CONFIG.palette.red),
      ember:color(palette.ember,DEFAULT_FLAME_ARTIFACT_CONFIG.palette.ember),
      dark:color(palette.dark,DEFAULT_FLAME_ARTIFACT_CONFIG.palette.dark),
    },
    motion:{
      enabled:motion.enabled===undefined?DEFAULT_FLAME_ARTIFACT_CONFIG.motion.enabled:Boolean(motion.enabled),
      rotationSpeed:clamp(motion.rotationSpeed,0,2.5,DEFAULT_FLAME_ARTIFACT_CONFIG.motion.rotationSpeed),
      floatStrength:clamp(motion.floatStrength,0,0.3,DEFAULT_FLAME_ARTIFACT_CONFIG.motion.floatStrength),
    },
    appearance:{
      coreScale:clamp(appearance.coreScale,0.55,1.7,DEFAULT_FLAME_ARTIFACT_CONFIG.appearance.coreScale),
      glow:clamp(appearance.glow,0,2,DEFAULT_FLAME_ARTIFACT_CONFIG.appearance.glow),
      orbitOpacity:clamp(appearance.orbitOpacity,0,1.4,DEFAULT_FLAME_ARTIFACT_CONFIG.appearance.orbitOpacity),
      wireframeOpacity:clamp(appearance.wireframeOpacity,0,1.4,DEFAULT_FLAME_ARTIFACT_CONFIG.appearance.wireframeOpacity),
    },
    world:{
      enabled:world.enabled===undefined?DEFAULT_FLAME_ARTIFACT_CONFIG.world.enabled:Boolean(world.enabled),
      mode,
      flameEnabled:world.flameEnabled===undefined?DEFAULT_FLAME_ARTIFACT_CONFIG.world.flameEnabled:Boolean(world.flameEnabled),
      riverEnabled:world.riverEnabled===undefined?DEFAULT_FLAME_ARTIFACT_CONFIG.world.riverEnabled:Boolean(world.riverEnabled),
      flameIntensity:clamp(world.flameIntensity,0,2,DEFAULT_FLAME_ARTIFACT_CONFIG.world.flameIntensity),
      flameFlow:clamp(world.flameFlow,0.1,2.5,DEFAULT_FLAME_ARTIFACT_CONFIG.world.flameFlow),
      riverIntensity:clamp(world.riverIntensity,0,2,DEFAULT_FLAME_ARTIFACT_CONFIG.world.riverIntensity),
      riverSpeed:clamp(world.riverSpeed,0.1,2.5,DEFAULT_FLAME_ARTIFACT_CONFIG.world.riverSpeed),
      emberDensity:clamp(world.emberDensity,0,1.5,DEFAULT_FLAME_ARTIFACT_CONFIG.world.emberDensity),
      heatDistortion:clamp(world.heatDistortion,0,1,DEFAULT_FLAME_ARTIFACT_CONFIG.world.heatDistortion),
      routeCurrent:clamp(world.routeCurrent,0,2,DEFAULT_FLAME_ARTIFACT_CONFIG.world.routeCurrent),
      emergence:clamp(world.emergence,0,2,DEFAULT_FLAME_ARTIFACT_CONFIG.world.emergence),
      reflection:clamp(world.reflection,0,1.5,DEFAULT_FLAME_ARTIFACT_CONFIG.world.reflection),
    },
    surfaces:Object.fromEntries(
      FLAME_ARTIFACT_SURFACES.map(key=>[
        key,
        surfaces[key]===undefined?DEFAULT_FLAME_ARTIFACT_CONFIG.surfaces[key]:Boolean(surfaces[key]),
      ])
    ) as Record<FlameArtifactSurface,boolean>,
  }
}

export const FLAME_ARTIFACT_SURFACE_LABELS:Record<FlameArtifactSurface,string>={
  'weave-hero':'Public WEAVE · 3D hero',
  'bridge-radiance-core':'Bridge Radiance · center artifact',
  'bridge-radiance-portals':'Bridge Radiance · position portals',
  'event-atmosphere':'Flame Event · global atmosphere',
  'client-event':'Client Flame Event · center artifact',
}

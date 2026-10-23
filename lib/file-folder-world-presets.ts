import { FILE_FOLDER_TIERS, type FileFolderTier } from '@/lib/file-folder-pricing'

/**
 * The official Plus visual reference is the approved white/gold Plus File
 * Folder artwork (23 October 2026). This is the operational 3D interpretation,
 * not an image used as a world wallpaper and not a representation of earnings.
 * Every station routes into an existing File Folder operating district.
 */
export const STANDARD_FILE_FOLDER_REFERENCE = {
  name: 'Official Standard File Folder World',
  approved: '2026-10-23',
  referenceImage: '383187.png',
  sha256: 'bdbd47223243d0996967087ef9733288dd9b863ab16b3b40be0d49e6b33f79cb',
  dimensions: '1536x864',
  composition: 'Mountain-and-river living business landscape; stone Customer Door; formation yard; farm, food, boutique, creative and software districts',
  progression: ['Recognize','Preview','Build','Activate','Operate'],
  operatingRule: 'Every verified Standard File Folder owner gets this actual interactive world, with businesses tied to their own records',
} as const

export const PLUS_FILE_FOLDER_REFERENCE = {
  name: 'Official Plus File Folder',
  approved: '2026-10-23',
  referenceImage: '389215.png',
  composition: 'A luminous white-and-gold open world unfolding from the central File Folder',
  sixFunctions: ['systems','modules','tools','people','operations','expansion'] as const,
  message: 'A completed set of systems for immediate uses',
} as const

export const FILE_FOLDER_EQUIPMENT_ZONES = [
  'systems','modules','tools','people','operations','expansion',
] as const
export type EquipmentZone = typeof FILE_FOLDER_EQUIPMENT_ZONES[number]

export const FILE_FOLDER_THEME_IDS = ['river-slate','standard-living-valley','radiant-blue','ember-gold','plus-white-gold'] as const
export type FileFolderThemeId = typeof FILE_FOLDER_THEME_IDS[number]
export const FILE_FOLDER_REALNESS = ['basic','refined','high'] as const
export type FileFolderRealness = typeof FILE_FOLDER_REALNESS[number]
export const FILE_FOLDER_EQUIPMENT_PACKS = [
  'formation','standard-business-districts','business-operations','enterprise-command','plus-complete-systems',
] as const
export type FileFolderEquipmentPack = typeof FILE_FOLDER_EQUIPMENT_PACKS[number]

export type FileFolderWorldAppearance = {
  theme:FileFolderThemeId
  equipmentPack:FileFolderEquipmentPack
  realness:FileFolderRealness
  equipmentZones:EquipmentZone[]
}
export const FILE_FOLDER_WORLD_APPEARANCES:Record<FileFolderTier,FileFolderWorldAppearance> = {
  standard:{theme:'standard-living-valley',equipmentPack:'standard-business-districts',realness:'high',equipmentZones:['systems','modules','tools','people','operations','expansion']},
  pro:{theme:'radiant-blue',equipmentPack:'business-operations',realness:'refined',equipmentZones:['systems','modules','tools','operations']},
  premium:{theme:'ember-gold',equipmentPack:'enterprise-command',realness:'high',equipmentZones:['systems','modules','tools','people','operations','expansion']},
  plus:{theme:'plus-white-gold',equipmentPack:'plus-complete-systems',realness:'high',equipmentZones:[...FILE_FOLDER_EQUIPMENT_ZONES]},
}
export const FILE_FOLDER_PALETTES:Record<FileFolderThemeId,{
  ground:string;structure:string;accent:string;glow:string;glass:string;sky:string
}> = {
  'river-slate':{ground:'#172936',structure:'#a8c2c5',accent:'#4ac3d1',glow:'#84e6f2',glass:'#b3e0e2',sky:'#10243e'},
  'standard-living-valley':{ground:'#678956',structure:'#d9ccb2',accent:'#b9a477',glow:'#eddfa3',glass:'#b9dae9',sky:'#b7d9ef'},
  'radiant-blue':{ground:'#243d57',structure:'#c7d9ec',accent:'#74cbe9',glow:'#a4e4ff',glass:'#e4f6ff',sky:'#264d77'},
  'ember-gold':{ground:'#3d2e35',structure:'#dbc19e',accent:'#e2ad63',glow:'#ffda92',glass:'#fff0dc',sky:'#4b3b51'},
  'plus-white-gold':{ground:'#eceaf1',structure:'#f8f5e9',accent:'#c69745',glow:'#ffe3a1',glass:'#f4faff',sky:'#dbeaff'},
}

export const FILE_FOLDER_EQUIPMENT:Record<EquipmentZone,{
  name:string;district:string;meaning:string;equipment:string;kind:'tower'|'lab'|'tools'|'people'|'command'|'globe'
}> = {
  systems:{name:'Systems',district:'active_systems',meaning:'Enter completed, operating Client systems',equipment:'Operating systems terminals',kind:'tower'},
  modules:{name:'Modules',district:'blueprint_foundry',meaning:'Design new modules and blueprints',equipment:'Blueprint and module foundry',kind:'lab'},
  tools:{name:'Tools',district:'parts_workshop',meaning:'Install real components and capabilities',equipment:'Assembly and equipment station',kind:'tools'},
  people:{name:'People',district:'workshop_core',meaning:'Organize real participation and work',equipment:'Participation coordination desks',kind:'people'},
  operations:{name:'Operations',district:'active_systems',meaning:'Operate commissioned systems and records',equipment:'Operations console',kind:'command'},
  expansion:{name:'Expansion',district:'library_district',meaning:'Connect completed capabilities and expand',equipment:'Global network observatory',kind:'globe'},
}

export function validateFileFolderAppearance(input:unknown):FileFolderWorldAppearance {
  if(!input || typeof input!=='object' || Array.isArray(input))
    throw new Error('A valid File Folder appearance is required')
  const row=input as Record<string,unknown>
  const theme=row.theme
  const equipmentPack=row.equipmentPack
  const realness=row.realness
  if(typeof theme!=='string'||!FILE_FOLDER_THEME_IDS.includes(theme as FileFolderThemeId))
    throw new Error('Select a supported environment theme')
  if(typeof equipmentPack!=='string'||!FILE_FOLDER_EQUIPMENT_PACKS.includes(equipmentPack as FileFolderEquipmentPack))
    throw new Error('Select a supported equipment pack')
  if(typeof realness!=='string'||!FILE_FOLDER_REALNESS.includes(realness as FileFolderRealness))
    throw new Error('Select a supported realness level')
  if(!Array.isArray(row.equipmentZones)||row.equipmentZones.length===0)
    throw new Error('At least one real equipment zone is required')
  const zones=row.equipmentZones
  if(zones.some(zone=>typeof zone!=='string'||!FILE_FOLDER_EQUIPMENT_ZONES.includes(zone as EquipmentZone)))
    throw new Error('Only existing File Folder equipment zones may be selected')
  return {theme:theme as FileFolderThemeId,equipmentPack:equipmentPack as FileFolderEquipmentPack,
    realness:realness as FileFolderRealness,equipmentZones:[...new Set(zones as EquipmentZone[])]}
}
export function resolveFileFolderAppearance(
  tier:FileFolderTier,config?:{tierVisuals?:Partial<Record<FileFolderTier,FileFolderWorldAppearance>>}|null,
):FileFolderWorldAppearance {
  const chosen=config?.tierVisuals?.[tier]
  if(!chosen)return FILE_FOLDER_WORLD_APPEARANCES[tier]
  // Existing published releases predate the approved Standard living landscape.
  // Seamlessly uplift their exact legacy defaults; never leave verified Standard
  // purchasers in the old abstract river-slate map after this code is released.
  if(tier==='standard'&&chosen.theme==='river-slate'&&
     chosen.equipmentPack==='formation'&&chosen.realness==='basic')
    return FILE_FOLDER_WORLD_APPEARANCES.standard
  try{return validateFileFolderAppearance(chosen)}
  catch{return FILE_FOLDER_WORLD_APPEARANCES[tier]}
}
export function isSupportedFileFolderTier(tier:unknown):tier is FileFolderTier {
  return typeof tier==='string'&&FILE_FOLDER_TIERS.includes(tier as FileFolderTier)
}

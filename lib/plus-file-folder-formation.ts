import {buildFormationProgress} from '@/lib/file-folder-world-runtime'
import {FILE_FOLDER_EQUIPMENT_ZONES,type EquipmentZone} from '@/lib/file-folder-world-presets'

/**
 * The Plus world starts as the complete, purchased white-and-gold operating
 * environment. Only additional construction and operating structures reflect
 * verified Client build/system records; no activity is inferred from the art.
 */
export type PlusBuildRecord = {
  id?:string;title?:string;blueprint_name?:string;blueprint_key?:string
  status?:string;system_type?:string;district?:string
  started_at?:string;created_at?:string;completes_at?:string
}
export type PlusSystemRecord = {
  id?:string;title?:string;name?:string;status?:string
  system_type?:string;district?:string
}
export type PlusZoneProgress={
  zone:EquipmentZone
  building:number
  live:number
  completed:number
  progress:number
  stage:'ready'|'building'|'commissioned'
}
export type PlusWorldFormation={
  zones:Record<EquipmentZone,PlusZoneProgress>
  activeBuilds:number
  liveSystems:number
  completedBuilds:number
  environmentStage:'formed'|'expanding'|'operating'
  expansionLevel:number
}

export function plusZoneFor(record:PlusBuildRecord|PlusSystemRecord):EquipmentZone{
  const text=[record.system_type,record.district,'blueprint_key' in record?record.blueprint_key:'',
    'blueprint_name' in record?record.blueprint_name:'',
    'title' in record?record.title:'',
    'name' in record?record.name:''].filter(Boolean).join(' ').toLowerCase()
  if(/legion|staff|employment|community|team|personnel|people|human|distribution_manager/.test(text))return 'people'
  if(/stream|media|order|customer|commerce|business|operation|delivery|logistic|payment|finance/.test(text))return 'operations'
  if(/network|route|international|expansion|territory|enterprise|growth/.test(text))return 'expansion'
  if(/blueprint|template|module|architecture|design|foundry/.test(text))return 'modules'
  if(/tool|studio|animation|music|instrument|hardware|material|part|equipment/.test(text))return 'tools'
  // An unclassified record remains actual Client work; it is not falsely
  // attributed to a more specific department or business capability.
  return 'systems'
}

export function derivePlusWorldFormation(
  builds:PlusBuildRecord[],
  systems:PlusSystemRecord[],
  now:number,
):PlusWorldFormation{
  const zones={} as Record<EquipmentZone,PlusZoneProgress>
  for(const zone of FILE_FOLDER_EQUIPMENT_ZONES){
    zones[zone]={zone,building:0,live:0,completed:0,progress:0,stage:'ready'}
  }
  const live=systems.filter(system=>system.status==='active')
  let activeBuilds=0
  let completedBuilds=0
  for(const build of builds){
    const zone=zones[plusZoneFor(build)]
    if(build.status==='building'){
      activeBuilds++
      zone.building++
      zone.progress=Math.max(zone.progress,buildFormationProgress(build,now))
      if(zone.stage!=='commissioned')zone.stage='building'
    }else if(build.status==='complete'){
      completedBuilds++
      zone.completed++
      zone.progress=100
    }
  }
  for(const system of live){
    const zone=zones[plusZoneFor(system)]
    zone.live++
    zone.progress=100
    zone.stage='commissioned'
  }
  return {
    zones,
    activeBuilds,
    completedBuilds,
    liveSystems:live.length,
    // The baseline approved Plus environment is present at purchase.
    // Extra skyline/detail grows only from recorded Client operations.
    environmentStage:live.length>0?'operating':activeBuilds>0||completedBuilds>0?'expanding':'formed',
    expansionLevel:Math.min(3,Math.floor(live.length/2)),
  }
}

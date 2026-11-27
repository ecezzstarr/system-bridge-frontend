import {FILE_FOLDER_PLATFORM_TEMPLATES} from './file-folder-platform-projects'
export const FLAME_INDUSTRIES=['flame_creative','flame_software','flame_research','flame_education','flame_support','flame_automation'] as const
export type FlameIndustry=typeof FLAME_INDUSTRIES[number]
export function isFlameIndustry(value:unknown):value is FlameIndustry{
 return typeof value==='string'&&FLAME_INDUSTRIES.includes(value as FlameIndustry)
}
type Row={ [key:string]:unknown }
type Snapshot={blueprints:Row[];inventory:Row[];builds:Row[];systems:Row[];customerDoor:Row|null}
export function flameEnterprisePlan(industry:FlameIndustry,world:Snapshot){
 const template=FILE_FOLDER_PLATFORM_TEMPLATES[industry]
 const stages=template.stages.map(key=>{
  const catalog=world.blueprints.find(b=>b.blueprint_key===key&&b.published===true)
  const active=world.systems.some(s=>s.status==='active'&&(s.system_type===key||(s.configuration as {blueprintKey?:string}|null)?.blueprintKey===key))
  const build=world.builds.find(b=>b.blueprint_key===key&&(b.status==='building'||b.status==='funding_gate'))
  const material=String(catalog?.required_item_key||'')
  const required=Math.max(0,Number(catalog?.required_item_quantity)||0)
  const owned=Math.max(0,Number(world.inventory.find(i=>i.item_key===material)?.quantity)||0)
  const missing=Math.max(0,required-owned)
  const state=active?'active_record':build?.status==='funding_gate'?'funding_gate':build?'building':!catalog?'unavailable':missing&&catalog.required_item_published!==true?'unavailable':'not_started'
  return {key,label:String(catalog?.name||key.replaceAll('_',' ')),state,baseHours:catalog?Number(catalog.build_hours)||null:null,
   material:material?String(catalog?.required_item_name||material):null,required,owned,
   missing:state==='not_started'?missing:0,
   next:state==='active_record'?'Review actual functionality.':state==='funding_gate'?'Review the existing funding gate.':state==='building'?'Inspect current construction.':state==='unavailable'?'Ask Administrations about catalog availability.':missing?'Review material requirements and current quote.':'Review and authorize construction in the File Folder.'}
 })
 const door=world.customerDoor
 const publicDoorRecorded=Boolean(door?.enabled===true&&door?.public_opened_at)
 return {industry,title:template.name,description:template.description,stages,
  nextStage:stages.find(s=>s.state!=='active_record')?.key||null,
  publicDoorRecorded,activeOffers:Math.max(0,Number(door?.active_offer_count)||0),
  productionGap:template.productionGap,modelStatus:'Weave One general native inference is not active in this runtime.',
  commercialLaunchVerified:false as const,
  owner:'client' as const,operator:'WEAVE Flame' as const,
  nextHref:'/client/system-switch' as const}
}
export type FlameEnterprisePlan=ReturnType<typeof flameEnterprisePlan>

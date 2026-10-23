/**
 * The Flame Event is not a war game: a File Folder is a persistent public
 * domain with a private owner workshop behind its Customer Door.
 * Locations are WEAVE world-map coordinates, NEVER the owner's GPS/address.
 * Purchased Client territory receives one permanent slot; a subsequent build,
 * system activation or accepted partnership develops that same place.
 */
export type DomainTier='standard'|'pro'|'premium'|'plus'|'unclassified'
export type DomainStage='foundation'|'forming'|'operating'|'expanding'
export type DomainRegion='ember_reach'|'radiant_heights'|'riverlands'|'green_valley'|'tidal_basin'|'starfall_ridge'

export type WorldDomainRow={
  id:string;slot:number|string;tier?:string|null;client_id?:string
  open_door?:boolean|null;public_slug?:string|null
  public_name?:string|null
  building_count?:number|string|null;completed_count?:number|string|null
  operating_count?:number|string|null;published_offers?:number|string|null
  accepted_connections?:number|string|null;linked_projects?:number|string|null;forming_progress?:number|string|null
  available_for_collaboration?:boolean|null
}
export type PublicWorldDomain={
  domainId:string
  location:{slot:number;x:number;z:number;region:DomainRegion}
  tier:DomainTier
  stage:DomainStage
  buildLevel:number
  building:boolean
  activity:{formation:'forming'|'constructed'|'operating';activeBuilds:number;buildProgress:number;operatingSystems:number;expansions:number;jointFormations:number}
  publicName:string
  customerDoor:{open:boolean;href:string|null}
  publishedOffers:number
  collaborationAvailable:boolean
  acceptedConnections:number
}
export const OPEN_WORLD_REGIONS:DomainRegion[]=[
  'ember_reach','radiant_heights','riverlands','green_valley','tidal_basin','starfall_ridge',
]
export function worldLocationForSlot(source:number):PublicWorldDomain['location']{
  const slot=Math.max(1,Math.min(1000000,Math.trunc(Number(source)||1)))
  // The golden-angle spiral gives each acquired File Folder a unique,
  // deterministic map location. It does not approximate a real-world address.
  const angle=(slot-1)*2.399963229728653
  const radius=13+Math.sqrt(slot)*5.5
  return {
    slot,
    x:Math.round(Math.cos(angle)*radius*100)/100,
    z:Math.round(Math.sin(angle)*radius*100)/100,
    region:OPEN_WORLD_REGIONS[(slot-1)%OPEN_WORLD_REGIONS.length],
  }
}
function boundedCount(raw:unknown):number{
  const n=Number(raw)
  return Number.isFinite(n)?Math.min(100000,Math.max(0,Math.trunc(n))):0
}
export function projectPublicWorldDomain(row:WorldDomainRow):PublicWorldDomain{
  const tier:DomainTier=['standard','pro','premium','plus'].includes(String(row.tier))
    ? row.tier as DomainTier:'unclassified'
  const building=boundedCount(row.building_count)
  const completed=boundedCount(row.completed_count)
  const operating=boundedCount(row.operating_count)
  const offers=boundedCount(row.published_offers)
  const accepted=boundedCount(row.accepted_connections)
  const linked=boundedCount(row.linked_projects)
  const progress=Math.min(100,Math.max(0,Number(row.forming_progress)||0))
  // An invitation, even once accepted, is a real human connection but is NOT
  // yet a joint system or a claim of business expansion. Only two separately
  // contributed, actively commissioned Client systems add partnership growth.
  const score=completed+operating*2+linked*3+building*progress/100
  const stage:DomainStage=linked>0||operating>=3?'expanding'
    :operating>0?'operating':building>0||completed>0?'forming':'foundation'
  const doorOpen=row.open_door===true && typeof row.public_slug==='string'&&
    /^[a-z0-9-]{1,160}$/.test(row.public_slug)
  const slot=worldLocationForSlot(Number(row.slot))
  return {
    domainId:String(row.id),
    location:slot,
    tier,
    stage,
    buildLevel:Math.max(0,Math.floor(score)),
    building:building>0,
    activity:{
      formation:operating>0?'operating':completed>0?'constructed':'forming',
      activeBuilds:building,
      buildProgress:building>0?Math.round(progress):0,
      operatingSystems:operating,
      expansions:accepted,
      jointFormations:linked,
    },
    // Unpublished private identity and File Numbers never enter the public API.
    publicName:doorOpen&&row.public_name?String(row.public_name).slice(0,100):
      'File Folder forming in '+slot.region.replaceAll('_',' '),
    customerDoor:{open:doorOpen,href:doorOpen?
      '/market/'+encodeURIComponent(row.public_slug!)+'?via=system-switch':null},
    publishedOffers:doorOpen?offers:0,
    collaborationAvailable:row.available_for_collaboration===true,
    acceptedConnections:accepted,
  }
}

export type WorldMovementKind='domain_formed'|'system_commissioned'|'build_completed'|'connection_accepted'
export type WorldMovement={domainId:string;kind:WorldMovementKind;occurredAt:string}
export function formatWorldMovement(kind:WorldMovementKind):string{
  switch(kind){
    case 'domain_formed':return 'A Client File Folder joined the company world'
    case 'system_commissioned':return 'A Client system entered operation'
    case 'build_completed':return 'A Client construction stage completed'
    case 'connection_accepted':return 'Two Clients formed a company-event connection'
  }
}

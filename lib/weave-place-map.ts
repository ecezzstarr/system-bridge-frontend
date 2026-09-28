export type WeavePlaceScope='shared'|'admin'|'agent'|'bridger'|'client'|'staff'

export type WeavePlaceSurface={
  surface_key:string
  label:string
  surface_kind:'district'|'place'|'station'
  route:string
  area:string
  scope:string
  is_visible:boolean
  sort_order:number
  is_protected:boolean
}

export type WeaveDistrictKey=
  |'presence'
  |'bridge'
  |'enterprise'
  |'participation'
  |'value-record'
  |'position'
  |'administration'
  |'system-switch'

export type WeaveDistrictDefinition={
  key:WeaveDistrictKey
  label:string
  subtitle:string
  order:number
  position:[number,number,number]
  rotation:number
}

export type BridgePlazaPlace={
  key:string
  label:string
  route:string
  district:WeaveDistrictKey
  order:number
  kind:'place'|'station'
}

export type BridgePlazaDistrict=WeaveDistrictDefinition&{
  places:BridgePlazaPlace[]
}

export const WEAVE_DISTRICTS:WeaveDistrictDefinition[]=[
  {key:'presence',label:'Presence District',subtitle:'PEOPLE · CADENCE · COMPANY MOVEMENT',order:10,position:[0,.1,6.3],rotation:Math.PI},
  {key:'bridge',label:'Bridge District',subtitle:'CONNECTION · SUPPORT · CONTINUITY',order:20,position:[-5.6,.1,3.4],rotation:2.05},
  {key:'enterprise',label:'Enterprise District',subtitle:'SYSTEMS · MARKET · OPPORTUNITY',order:30,position:[-6.3,.1,-2.5],rotation:.95},
  {key:'participation',label:'Participation District',subtitle:'LOOPS · ARENA · PATTERN · STREAM',order:40,position:[-2.1,.1,-6.2],rotation:.28},
  {key:'value-record',label:'Value + Record District',subtitle:'WALLET · LEDGER · RECEIPTS',order:50,position:[3.5,.1,-5.5],rotation:-.55},
  {key:'position',label:'Position District',subtitle:'ROLE · WORK · CONTINUANCE',order:60,position:[6.6,.1,-.8],rotation:-1.4},
  {key:'administration',label:'Administration District',subtitle:'AUTHORITY · INFRASTRUCTURE · CONTROL',order:70,position:[5.2,.1,4.3],rotation:-2.3},
  {key:'system-switch',label:'System Switch District',subtitle:'FILE FOLDERS · CLIENT WORLDS · BUILD',order:80,position:[1.7,.1,6.7],rotation:-2.9},
]

const clean=(route:string)=>String(route||'').split('?')[0].split('#')[0]||'/'

export function districtKeyForRoute(route:string,scope?:string):WeaveDistrictKey{
  const path=clean(route)

  if(path.startsWith('/client/system-switch')||path.startsWith('/weave/file-folder/'))return 'system-switch'
  if(path.startsWith('/admin')||path.startsWith('/authority'))return 'administration'

  if(
    path.startsWith('/wallet')||
    path.startsWith('/ledger')||
    path.startsWith('/fund-wall')||
    path.startsWith('/receipts')||
    path.includes('/deposit')||
    path.includes('/withdraw')||
    path.includes('/payments')
  )return 'value-record'

  if(
    path.startsWith('/marketplace')||
    path.startsWith('/agility')||
    path.startsWith('/echo')||
    path.startsWith('/video-feed')||
    path.startsWith('/market')||
    path.startsWith('/stream')||
    path.startsWith('/enterprise')
  )return 'enterprise'

  if(
    path.startsWith('/arena')||
    path.startsWith('/casino')||
    path.startsWith('/event')||
    path.startsWith('/company/loops')||
    path.startsWith('/client/loops')||
    path.startsWith('/client/event')
  )return 'participation'

  if(
    path.startsWith('/bridger/bridge-ai')||
    path.startsWith('/bridger/bridge-radiance')||
    path.startsWith('/agent/bridge-radiance')||
    path.startsWith('/weave/market/prospects')||
    path.startsWith('/bridger/clients')||
    path.startsWith('/bridger/numbers')||
    path.startsWith('/client-interactions')||
    path.startsWith('/clients')||
    path.startsWith('/company-chat')||
    path.startsWith('/lounge')||
    path.startsWith('/agent-chat')||
    path.startsWith('/client/chat')
  )return 'bridge'

  if(
    path.startsWith('/search')||
    path.startsWith('/profiles')||
    path.startsWith('/weave/standing')||
    path==='/'
  )return 'presence'

  if(
    path.includes('/dashboard')||
    path.includes('/functions')||
    path.startsWith('/agent/')||
    path.startsWith('/bridger/')||
    path.startsWith('/client/settings')||
    path==='/dashboard'
  )return 'position'

  if(scope==='admin')return 'administration'
  if(scope==='agent'||scope==='bridger'||scope==='client')return 'position'
  return 'presence'
}

export function roleCanEnterSurface(role:string|undefined|null,scope:string){
  if(scope==='shared')return true
  if(scope==='staff')return role==='admin'||role==='agent'||role==='bridger'
  return Boolean(role&&role===scope)
}

export function buildBridgePlazaDistricts(role:string|undefined|null,surfaces:WeavePlaceSurface[]):BridgePlazaDistrict[]{
  const places=surfaces
    .filter(surface=>surface.is_visible!==false)
    .filter(surface=>surface.surface_kind==='place')
    .filter(surface=>surface.route!=='/weave')
    .filter(surface=>roleCanEnterSurface(role,surface.scope))
    .filter(surface=>!surface.route.includes('['))
    .map<BridgePlazaPlace>(surface=>({
      key:surface.surface_key,
      label:surface.label,
      route:surface.route,
      district:districtKeyForRoute(surface.route,surface.scope),
      order:Number(surface.sort_order||1000),
      kind:'place',
    }))

  return WEAVE_DISTRICTS
    .map(district=>({
      ...district,
      places:places
        .filter(place=>place.district===district.key)
        .sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label)),
    }))
    .filter(district=>district.places.length>0)
    .sort((a,b)=>a.order-b.order)
}

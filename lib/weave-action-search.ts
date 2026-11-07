/**
 * WEAVE Search: a role-scoped finder over actual operating pages.
 * Navigation is descriptive, never a substitute for each route's own authorization,
 * payment, employment, order or financial verification.
 */
import {AGENT_SPACES} from '@/lib/agent-workplace-catalog'
import {BRIDGER_WORKPLACE_SPACES} from '@/lib/bridger-workplace-catalog'
import {ADMIN_SPACES} from '@/lib/admin-workplace-catalog'
import {getRoleDistricts} from '@/lib/weave-role-districts'
import {WEAVE_ENVIRONMENT_REGISTRY} from '@/lib/weave-environment-registry'
import {canAccessEnvironmentRoute} from '@/lib/company-guidance-access'

export type WeaveSearchRole='agent'|'bridger'|'client'|'admin'|'legion'
export type WeaveSearchDestination={
  title:string
  href:string
  description:string
  department:string
  requirements:string
  nextStep:string
  access:'available'|'approval'|'lifestyle'|'preview'
  keywords:string
}
type SearchEntry={title:string;href:string;description:string;department:string;access?:WeaveSearchDestination['access']}

const roleLabels:Record<WeaveSearchRole,string>={
  agent:'Stability · Agent',bridger:'Hope · Bridger',client:'Dream Lovely · Client',
  admin:'A Time · Administration',legion:'Client Legion · Assigned Employment',
}

/** Exact route notes apply in addition to the original company catalog. */
const TASKS:Record<string,{keywords:string;requirements:string;nextStep:string}>={
  '/agent/work':{
    keywords:'food sell products get started stock order supply shops customers distributor',
    requirements:'Active Agent position. Confirm current prices and stock requirements before committing money.',
    nextStep:'Choose one product; check the actual order, stock and payment status.',
  },
  '/agent/food-order':{
    keywords:'buy stock agility food carton order prepare supplier pay',
    requirements:'Agent access and an actual product order. Payment is not verified by submitting a request.',
    nextStep:'Review product quantities, submit the correct order and follow verified preparation and delivery.',
  },
  '/agent/distribution':{
    keywords:'sell food selling shops stores outlets restock cartons delivery stock sell to stores money collect payment supply retail',
    requirements:'Real received stock or a permitted stock commitment; an outlet and its payment terms.',
    nextStep:'Register an outlet, allocate available stock, record sales, and reconcile collected and outstanding amounts.',
  },
  '/agent/outlet-training':{
    keywords:'teach learn new beginner training how sell food to shops speak approach wholesale',
    requirements:'Agent position; no purchase is necessary to read the training.',
    nextStep:'Read the outlet approach and prices before speaking to an actual shop.',
  },
  '/agility':{
    keywords:'food agility breakfast order carton agent sell',
    requirements:'Check the published product and current payment/delivery requirements.',
    nextStep:'Choose the actual food order rather than assuming stock has arrived.',
  },
  '/electrolyte':{
    keywords:'food electrolyte bowls order stock carton sales',
    requirements:'Check the current item and verified fulfilment stage.',
    nextStep:'Start an order and confirm physical receipt before distribution.',
  },
  '/ember':{
    keywords:'food ember hot boxes meals sell supply evening',
    requirements:'Review actual variants, current price and availability.',
    nextStep:'Choose an available box and confirm payment and delivery.',
  },
  '/agent/cakes':{
    keywords:'cake bakery pastry pastries daisy quote customer order sell',
    requirements:'A real customer request; production and payment must be confirmed.',
    nextStep:'Record the order, inspect the quote and follow Administration fulfilment.',
  },
  '/agent/commissions':{
    keywords:'my money earning commission referral paid profits bonus income',
    requirements:'Qualified, verified activities rather than pending or assumed referrals.',
    nextStep:'Read the recorded commission and its verification status.',
  },
  '/weave/market/prospects':{
    keywords:'find customers leads contacts prospects whatsapp call reach people client find buyers sell file folder',
    requirements:'Bridger position and current candidate contact limits; leads are unverified.',
    nextStep:'Choose a candidate, contact respectfully and record the actual response.',
  },
  '/bridger/bridge-ai':{
    keywords:'what is weave introduce explain prospects file folder sell customer support invitation ai bridge',
    requirements:'A real responding person and an approved Bridge AI route; check actual displayed cost.',
    nextStep:'Explain ownership and the Client crossing before sharing an authorized invitation.',
  },
  '/bridger/crossing-notebook':{
    keywords:'learn how to be a bridger orientation prospect client what do I do',
    requirements:'No sale or appointment is proved by reading guidance.',
    nextStep:'Study the real contact-to-Client flow, then open your authorized prospect tool.',
  },
  '/bridger/email-outreach':{
    keywords:'email prospects send mail reach clients businesses leads outreach',
    requirements:'An authorized sender, available contacts and the stated usage costs.',
    nextStep:'Review candidate rules, prepare accurate outreach and check responses.',
  },
  '/distribution-studio':{
    keywords:'post social media tiktok facebook instagram content marketing business outreach schedule',
    requirements:'Authorized channel connection; a draft is not a published social post.',
    nextStep:'Prepare the content, review supported channels and confirm publishing status.',
  },
  '/weave/lifestyles':{
    keywords:'job work hiring salary application career employment positions manager lifestyle',
    requirements:'Position-specific eligibility, terms and explicit approval where required.',
    nextStep:'Read a vacancy or offered role, then apply through its existing process.',
  },
  '/weave/lifestyles/work':{
    keywords:'my job contract salary shift duty workplace assigned employment staff',
    requirements:'A confirmed appointment; applying is not employment.',
    nextStep:'Check the authorized job, duties and company instructions.',
  },
  '/weave/lifestyles/legion':{
    keywords:'work for client employee legion staff enterprise salary job',
    requirements:'A verified Client employment agreement and active exclusive Legion access.',
    nextStep:'Inspect assigned Client work and its actual status before acting.',
  },
  '/client/system-switch':{
    keywords:'my file folder build a business own systems store how earn make money open shop customers business world kingdom',
    requirements:'Verified Client File Folder ownership. Actual construction and payment conditions still apply.',
    nextStep:'Open your File Folder, inspect the unfinished build, then publish a real offer through Customer Door.',
  },
  '/client/system-store':{
    keywords:'publish technology sell system software distribute application platform product',
    requirements:'An authorized, active and independently verified system release.',
    nextStep:'Review existing built systems and the publication requirements.',
  },
  '/client/staff-workspace':{
    keywords:'cj dorado client pro regional manager my company salary appointment business expansion',
    requirements:'Administration-approved Client staff appointment; salary is separate from File Folder earnings.',
    nextStep:'Open the official workspace and inspect current duties, verified salary terms and business links.',
  },
  '/client/pro-activation':{
    keywords:'pro client activation manager verify file number proof agreement contract',
    requirements:'A genuine approved Pro appointment and independently verified activation.',
    nextStep:'Check required documents, signatures and actual payment confirmation.',
  },
  '/wallet':{
    keywords:'where is my money balance wallet flame coin funds see cash transactions',
    requirements:'Signed-in account; wallet balances are only as accurate as their verified records.',
    nextStep:'Read the actual balance and transaction history.',
  },
  '/ledger':{
    keywords:'payment history records money where funds transaction balance statement',
    requirements:'Your own authorized ledger records.',
    nextStep:'Compare entries and receipts before reporting a discrepancy.',
  },
  '/receipts':{
    keywords:'paid proof invoice receipt transaction deposit withdrawal confirmed',
    requirements:'A real recorded transaction. A submitted reference alone is not confirmation.',
    nextStep:'Check receipt number and recorded status.',
  },
  '/echo':{
    keywords:'what should I do next guidance advice help daily activity tasks learn',
    requirements:'Your active WEAVE position and accessible recorded signals.',
    nextStep:'Open immediate guidance and follow a verified next movement.',
  },
  '/admin/control-center':{
    keywords:'administration company control users approvals agents bridgers clients manage',
    requirements:'Administration role with authorization for the requested control.',
    nextStep:'Select the relevant company unit and inspect actual state before making a decision.',
  },
  '/admin/orders':{
    keywords:'customer payment order exception failed transaction approve investigate',
    requirements:'Recorded order and independent financial evidence.',
    nextStep:'Review the order and verify its source evidence.',
  },
  '/admin/customer-door-settlements':{
    keywords:'verify customer store payment deposit transfer settle forensics',
    requirements:'Administration permission and confirmed funds; never manually invent a wallet credit.',
    nextStep:'Inspect the transaction, source of funds and matching settlement record.',
  },
  '/admin/employment-applications':{
    keywords:'hire approve jobs salary applications staffing managers staff',
    requirements:'An existing application and approved employment authorization.',
    nextStep:'Read the applicant and the official terms before a decision.',
  },
  '/admin/release-workshop':{
    keywords:'website not working deploy update git fix production release rollback',
    requirements:'Authorized Administration release controls and a checked production candidate.',
    nextStep:'Review release checks and deployment state before acting.',
  },
  '/admin/environment-organizer':{
    keywords:'hide show pages role navigation sections menu organize app',
    requirements:'Administration permission; protected company surfaces cannot be removed.',
    nextStep:'Review visibility and ordering of the existing operating routes.',
  },
  '/search/cadences':{
    keywords:'thought experience story knowledge quote lesson human cadence research search records',
    requirements:'Published, public human records are distinct from company functions.',
    nextStep:'Search attributed human lessons or publish your own record.',
  },
}

const baseNotes={
  requirements:'Open with the correct company position. Any payment, job or other action needs its own verification.',
  nextStep:'Open the original operating page, read its current status and follow the displayed instructions.',
}

function normalize(value:string){
  return value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()
}
const stopWords=new Set(['i','me','my','we','a','an','the','is','are','how','do','can','could','would','want','need','please','show','tell','where','what','who','why','to','from','in','of','for','on','at','with','and','or','am','get','have','there','that','this','which','through','weave'])
function queryTokens(value:string){
  return [...new Set(normalize(value).split(' ').filter(w=>w.length>1&&!stopWords.has(w)))]
}
const roleStart:Record<WeaveSearchRole,string[]>={
  agent:['/agent/work','/agent/outlet-training','/agent/distribution','/agent/commissions','/weave/lifestyles','/echo'],
  bridger:['/bridger/crossing-notebook','/weave/market/prospects','/bridger/bridge-ai','/bridger/email-outreach','/weave/lifestyles','/echo'],
  client:['/client/system-switch','/client/system-store','/wallet','/ledger','/client/staff-workspace','/echo'],
  admin:['/admin/control-center','/admin/orders','/admin/employment-applications','/admin/customer-door-settlements','/admin/release-workshop','/admin/environment-organizer'],
  legion:['/weave/lifestyles/legion','/echo'],
}
const sharedPaths:SearchEntry[]=[
  {title:'Human Cadences',href:'/search/cadences',description:'Find recorded thoughts, lessons and experiences with their human authors.',department:'WEAVE · Shared Knowledge'},
  {title:'WEAVE Search',href:'/search',description:'Find real operating places by explaining what you need to do.',department:'WEAVE · Guidance'},
  {title:'Echo Guidance',href:'/echo',description:'See grounded next actions from your authorized recorded activity.',department:'WEAVE · Guidance'},
  {title:'Wallet',href:'/wallet',description:'Inspect actual balance and verified value movement.',department:'WEAVE · Records'},
  {title:'Receipts',href:'/receipts',description:'View transaction evidence and recorded receipt status.',department:'WEAVE · Records'},
  {title:'Ledger',href:'/ledger',description:'Review historical wallet entries and verify them.',department:'WEAVE · Records'},
]
function safeHref(href:string){
  return /^\/(?!\/)[a-zA-Z0-9_/#:.?=&-]*$/.test(href)
}
function entriesFor(role:WeaveSearchRole):SearchEntry[]{
  if(role==='legion')return [
    {title:'My Legion Employment',href:'/weave/lifestyles/legion',description:'Check your exclusive approved Client assignment and working instructions.',department:roleLabels[role],access:'approval'},
    {title:'Echo Guidance',href:'/echo',description:'Review next steps available under your current Client employment.',department:roleLabels[role]},
  ]
  const entries:SearchEntry[]=[]
  if(role==='agent')for(const space of AGENT_SPACES)for(const station of space.stations)entries.push({
    title:station.title,href:station.href,description:station.description,department:'Stability · '+space.title,access:station.access,
  })
  if(role==='bridger')for(const space of BRIDGER_WORKPLACE_SPACES)for(const place of space.places)entries.push({
    title:place.label,href:place.href,description:place.detail,department:'Hope · '+space.name,
    access:place.access==='core'?undefined:place.access,
  })
  if(role==='admin')for(const space of ADMIN_SPACES)for(const station of space.stations)entries.push({
    title:station.title,href:station.href,description:station.description,department:'A Time · '+space.title,
  })
  for(const district of getRoleDistricts(role))for(const place of district.places)entries.push({
    title:place.label,href:place.href,description:place.detail,department:roleLabels[role]+' · '+district.name,
  })
  // The same company registry is used for role worlds; adding a new registered
  // station automatically makes its official name discoverable.
  for(const surface of WEAVE_ENVIRONMENT_REGISTRY){
    const permitted=surface.scope===role||surface.scope==='shared'||
      (surface.scope==='agent-bridger'&&(role==='agent'||role==='bridger'))
    if(!permitted)continue
    entries.push({title:surface.label,href:surface.route,
      description:'Open the existing '+surface.label+' operating environment.',
      department:surface.area,
    })
  }
  entries.push(...sharedPaths)
  if(role==='client')entries.push(
    {title:'My Company Position',href:'/client/staff-workspace',description:'Review an independently approved Client staff appointment and salary terms.',department:'Dream Lovely · Client employment',access:'approval'},
    {title:'Pro File Folder Activation',href:'/client/pro-activation',description:'Verify Pro appointment, agreement and payment under Administration controls.',department:'Dream Lovely · Pro activation',access:'approval'},
    {title:'Customer Market',href:'/market',description:'See published Client businesses and Customer Doors.',department:'Dream Lovely · Commerce'},
  )
  if(role==='agent'||role==='bridger')entries.push(
    {title:'Pro Regional Manager',href:'/weave/lifestyles/pro-regional-manager',description:'Review the separate Pro position and File Folder application requirements.',department:roleLabels[role]+' · Employment',access:'approval'},
  )
  const unique=new Map<string,SearchEntry>()
  for(const e of entries){
    if(!safeHref(e.href)||!canAccessEnvironmentRoute(e.href,role))continue
    // Keep the original role-specific operating description before generic names.
    if(!unique.has(e.href))unique.set(e.href,e)
  }
  return [...unique.values()]
}

function rank(item:WeaveSearchDestination,query:string){
  const q=normalize(query)
  const terms=queryTokens(query)
  if(!q)return 0
  const title=normalize(item.title),description=normalize(item.description)
  const keywords=normalize(item.keywords),department=normalize(item.department)
  const all=title+' '+description+' '+keywords+' '+department+' '+normalize(item.requirements)
  if(!terms.length)return all.includes(q)?5:0
  let score=0,matched=0
  for(const token of terms){
    const inTitle=title.split(' ').some(part=>part===token||part.startsWith(token))
    const inKeywords=keywords.split(' ').some(part=>part===token||part.startsWith(token))
    const inDetails=description.split(' ').some(part=>part===token||part.startsWith(token))
    const inArea=department.split(' ').some(part=>part===token||part.startsWith(token))
    if(inTitle||inKeywords||inDetails||inArea){matched++;score+=inTitle?12:inKeywords?9:inDetails?4:2}
  }
  if(!matched)return 0
  if(matched===terms.length)score+=20
  if(title.includes(q))score+=32
  if(keywords.includes(q))score+=18
  return score
}

export function getWeaveSearchDirectory(role:WeaveSearchRole){
  return entriesFor(role).map(e=>{
    const notes=TASKS[e.href.split('#')[0]]
    return {...e,
      department:e.department,
      access:e.access||'available',
      requirements:notes?.requirements||baseNotes.requirements,
      nextStep:notes?.nextStep||baseNotes.nextStep,
      keywords:notes?.keywords||'',
    } as WeaveSearchDestination
  })
}

export function searchWeaveActions(role:WeaveSearchRole,query:string,limit=24){
  const directory=getWeaveSearchDirectory(role)
  const bounded=Math.max(1,Math.min(60,Math.floor(limit)||24))
  if(!normalize(query)){
    const preferred=roleStart[role]
    const order=(x:WeaveSearchDestination)=>preferred.indexOf(x.href)
    return directory.filter(x=>order(x)>=0).sort((a,b)=>order(a)-order(b)).slice(0,bounded)
  }
  return directory
    .map(item=>({...item,score:rank(item,query)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title))
    .slice(0,bounded)
    .map(({score,...item})=>item)
}
export function weaveRoleName(role:WeaveSearchRole){return roleLabels[role]}
export function isWeaveSearchRole(value:string):value is WeaveSearchRole{
  return ['agent','bridger','client','admin','legion'].includes(value)
}

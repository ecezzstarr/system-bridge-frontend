export type WeaveRole='client'|'agent'|'bridger'|'admin'
export type WeaveDistrictKey='presence'|'position'|'bridge'|'enterprise'|'participation'|'administration'

export type WeaveRolePlace={
  label:string
  detail:string
  href:string
  daily?:boolean
}

export type WeaveRoleDistrict={
  key:WeaveDistrictKey
  name:string
  subtitle:string
  purpose:string
  accent:string
  places:WeaveRolePlace[]
}

const sharedPresence:WeaveRolePlace[]=[
  {label:'Standing',detail:'Current position, recognition and access inside WEAVE.',href:'/weave/standing',daily:true},
  {label:'Presences',detail:'People and recognized presences participating across WEAVE.',href:'/profiles'},
  {label:'Human Cadences',detail:'Search human movement and attributed participation.',href:'/search'},
  {label:'Flame Coin Wallet',detail:'Value holding and current Flame Coin position.',href:'/wallet',daily:true},
  {label:'Record',detail:'Ledger of preserved movement and value history.',href:'/ledger'},
]

const sharedBridge:WeaveRolePlace[]=[
  {label:'Company Guidance',detail:'Company support and operational clarification.',href:'/company-chat'},
  {label:'Human Lounge',detail:'Shared communication with people inside WEAVE.',href:'/lounge'},
  {label:'Private Lounge',detail:'Private communication inside the human interaction layer.',href:'/lounge?view=private'},
]

const sharedParticipation:WeaveRolePlace[]=[
  {label:'Company Loops',detail:'Recurring company movement and participation.',href:'/company/loops',daily:true},
  {label:'Loop 1 Ground',detail:'Enter the current live company-event ground.',href:'/event'},
  {label:'Arena',detail:'Participant competition and recorded outcomes.',href:'/arena'},
  {label:'Pattern',detail:'Pattern play and recorded stakes.',href:'/casino'},
  {label:'Stream',detail:'Live and recorded WEAVE media movement.',href:'/video-feed'},
]

const clientDistricts:WeaveRoleDistrict[]=[
  {
    key:'presence',name:'Presence District',subtitle:'STANDING · IDENTITY · VALUE · RECORD',
    purpose:'Know where you stand before moving work.',accent:'#7dd3fc',places:sharedPresence,
  },
  {
    key:'position',name:'Client District',subtitle:'FILE FOLDER · BUILD · VALUE · SUPPORT',
    purpose:'The Client operating position and the world it owns.',accent:'#a78bfa',places:[
      {label:'Client World',detail:'Your role arrival world and daily movement.',href:'/client/dashboard',daily:true},
      {label:'Client Operating Room',detail:'Enter Client functions and continuing work.',href:'/client/functions',daily:true},
      {label:'Main File Folder',detail:'Build, activate and operate systems inside your persistent File Folder.',href:'/client/system-switch',daily:true},
      {label:'Client Loops',detail:'Company loops from the Client position.',href:'/client/loops'},
      {label:'Deposit',detail:'Move value into the Client operating world.',href:'/client/deposit'},
      {label:'Withdraw',detail:'Request controlled value release.',href:'/client/withdraw'},
    ],
  },
  {
    key:'bridge',name:'Bridge District',subtitle:'HUMAN SUPPORT · GUIDANCE · CONTINUITY',
    purpose:'Human connection and continuing support.',accent:'#67e8f9',places:[
      {label:'Your Bridger',detail:'Direct human support from your connected Bridger.',href:'/client/chat/bridger',daily:true},
      ...sharedBridge,
    ],
  },
  {
    key:'enterprise',name:'Enterprise District',subtitle:'SYSTEMS · MARKETS · CUSTOMERS',
    purpose:'Technology, systems and commercial movement.',accent:'#f59e0b',places:[
      {label:'Enterprise Systems Exchange',detail:'Million-scale software, infrastructure and enterprise systems.',href:'/marketplace',daily:true},
      {label:'Echo',detail:'AI-assisted routing and continuing interaction.',href:'/echo'},
    ],
  },
  {
    key:'participation',name:'Participation District',subtitle:'LOOPS · ARENA · PATTERN · STREAM',
    purpose:'Shared company movement, events and participation.',accent:'#fb7185',places:[
      {label:'Client Loops',detail:'Recurring company movement from the Client position.',href:'/client/loops',daily:true},
      {label:'Loop 1 Ground',detail:'Enter the current live company-event ground.',href:'/event'},
      {label:'Arena',detail:'Client participant competition and recorded outcomes.',href:'/client/arena'},
      {label:'Pattern',detail:'Client pattern play and recorded stakes.',href:'/client/casino'},
      {label:'Stream',detail:'Live and recorded WEAVE media movement.',href:'/video-feed'},
    ],
  },
]

const agentDistricts:WeaveRoleDistrict[]=[
  {
    key:'presence',name:'Presence District',subtitle:'STANDING · IDENTITY · VALUE · RECORD',
    purpose:'Current position, recognition and value.',accent:'#7dd3fc',places:sharedPresence,
  },
  {
    key:'position',name:'Agent District',subtitle:'STABILITY · BRIDGERS · CHANNELS · CONTINUANCE',
    purpose:'Daily Agent work that keeps participation moving.',accent:'#34d399',places:[
      {label:'Agent World',detail:'Your role arrival world and daily movement.',href:'/agent/dashboard',daily:true},
      {label:'Agent Operating Room',detail:'Enter the Agent working environment.',href:'/agent/functions',daily:true},
      {label:'My Bridgers',detail:'See Bridgers connected to your Agent position.',href:'/agent/bridgers',daily:true},
      {label:'Agent Channels',detail:'Authorized company positions and working channels.',href:'/agent/channels'},
      {label:'Agent Continuance',detail:'Commission, Bridger-linked participation and earnings.',href:'/agent/commissions',daily:true},
      {label:'Stability Supply',detail:'Prospect and number supply for Bridger participation.',href:'/agent/stability-supply'},
    ],
  },
  {
    key:'bridge',name:'Bridge District',subtitle:'BRIDGER SUPPORT · RADIANCE · GUIDANCE',
    purpose:'Support the connection movement carried by Bridgers.',accent:'#67e8f9',places:[
      {label:'Client File Folder Support',detail:'Enter Client File Folder worlds in read-only support mode.',href:'/weave?station=file-folders',daily:true},
      {label:'Bridge Radiance',detail:'Support active Prospect movement owned by assigned Bridgers.',href:'/agent/bridge-radiance',daily:true},
      ...sharedBridge,
    ],
  },
  {
    key:'enterprise',name:'Enterprise District',subtitle:'AGILITY · SYSTEMS · ECHO',
    purpose:'Commercial systems and real-world distribution.',accent:'#f59e0b',places:[
      {label:'Agility',detail:'Operate Agility food-package distribution and fulfillment.',href:'/agility',daily:true},
      {label:'Enterprise Systems Exchange',detail:'Large technology systems and infrastructure.',href:'/marketplace'},
      {label:'Echo',detail:'AI-assisted routing and continuing interaction.',href:'/echo'},
    ],
  },
  {
    key:'participation',name:'Participation District',subtitle:'LOOPS · ARENA · PATTERN · STREAM',
    purpose:'Shared company movement and participation.',accent:'#fb7185',places:sharedParticipation,
  },
]

const bridgerDistricts:WeaveRoleDistrict[]=[
  {
    key:'presence',name:'Presence District',subtitle:'STANDING · IDENTITY · VALUE · RECORD',
    purpose:'Current position, recognition and value.',accent:'#7dd3fc',places:sharedPresence,
  },
  {
    key:'position',name:'Bridger District',subtitle:'HOPE · NUMBERS · CLIENTS · CONTINUANCE',
    purpose:'Daily Bridger work from prospect movement through Client continuity.',accent:'#38bdf8',places:[
      {label:'Bridger World',detail:'Your role arrival world and daily movement.',href:'/bridger/dashboard',daily:true},
      {label:'Bridger Operating Room',detail:'Enter the Bridger working environment.',href:'/bridger/functions',daily:true},
      {label:'Worldwide Number Bay',detail:'Acquire numbers, receive delivery and verification movement.',href:'/bridger/numbers',daily:true},
      {label:'My Clients',detail:'Continue support for Clients already carried through the crossing.',href:'/bridger/clients',daily:true},
      {label:'Bridger Continuance',detail:'Partnership standing, subscription and renewal.',href:'/bridger/subscription',daily:true},
    ],
  },
  {
    key:'bridge',name:'Bridge District',subtitle:'PROSPECTS · BRIDGE AI · RADIANCE · GUIDANCE',
    purpose:'Connection movement from prospect to Client.',accent:'#67e8f9',places:[
      {label:'Client File Folder Support',detail:'Enter connected Client File Folder worlds in read-only support mode.',href:'/weave?station=file-folders',daily:true},
      {label:'Bridge AI',detail:'AI-assisted crossing and Client continuity support.',href:'/bridger/bridge-ai',daily:true},
      {label:'Bridge Radiance',detail:'Continue active Prospect conversations and movement.',href:'/bridger/bridge-radiance',daily:true},
      {label:'Prospect Market',detail:'Claim or purchase authorized Prospects.',href:'/weave/market/prospects',daily:true},
      ...sharedBridge,
    ],
  },
  {
    key:'enterprise',name:'Enterprise District',subtitle:'SYSTEMS · MARKETS · ECHO',
    purpose:'Technology and commercial movement.',accent:'#f59e0b',places:[
      {label:'Enterprise Systems Exchange',detail:'Software, infrastructure and enterprise systems.',href:'/marketplace'},
      {label:'Echo',detail:'AI-assisted routing and continuing interaction.',href:'/echo'},
    ],
  },
  {
    key:'participation',name:'Participation District',subtitle:'LOOPS · ARENA · PATTERN · STREAM',
    purpose:'Shared company movement and participation.',accent:'#fb7185',places:sharedParticipation,
  },
]

const administrationPlaces:WeaveRolePlace[]=[
  {label:'Administration World',detail:'Institutional arrival world and daily authority state.',href:'/admin/dashboard',daily:true},
  {label:'Administration Operating Room',detail:'Enter administrative systems and controls.',href:'/admin/functions',daily:true},
  {label:'Control Center',detail:'Deposits, people, wallets and institutional operations.',href:'/admin/control-center',daily:true},
  {label:'Message Hub',detail:'Institutional communication and staff movement.',href:'/admin/hub',daily:true},
  {label:'Prospect Engine',detail:'Prospect supply and opportunity control.',href:'/admin/prospect-engine'},
  {label:'WhatsApp Number Engine',detail:'Number Bay stock, delivery and verification authority.',href:'/admin/bridger-numbers',daily:true},
  {label:'Bridge Templates',detail:'Bridge operating templates and structured movement.',href:'/admin/bridge-templates'},
  {label:'File Number Engine',detail:'Client identity and File Number authority.',href:'/admin/file-number-engine'},
  {label:'Fulfillment Agent',detail:'Outreach fulfillment and operational delivery.',href:'/admin/outreach'},
  {label:'Agent Channel Requests',detail:'Approve and manage Agent channel movement.',href:'/admin/agent-channels'},
  {label:'Client Deposits',detail:'Review Client deposit requests.',href:'/admin/client-deposits',daily:true},
  {label:'Client Vaults',detail:'Client vault authority and balances.',href:'/admin/client-vault'},
  {label:'Enterprise Systems Workshop',detail:'Manage enterprise systems offered by WEAVE.',href:'/admin/enterprise-systems'},
  {label:'Agility Fulfillment',detail:'Operate Agility fulfillment and stock movement.',href:'/admin/agility'},
  {label:'Enterprise Dream',detail:'Lord/Lady applications, elevation and Legion authority.',href:'/admin/enterprise-dream'},
  {label:'Client Build Catalog',detail:'Manage File Folder systems, parts and build catalog.',href:'/admin/client-build-catalog'},
  {label:'Loop Workshop',detail:'Publish and operate company loops.',href:'/admin/loop-workshop'},
  {label:'Authority Workshop',detail:'Institutional workshops and authority systems.',href:'/authority/workshops'},
  {label:'Infrastructure',detail:'Cloud, maintenance and Divine Shield infrastructure.',href:'/admin/infrastructure',daily:true},
  {label:'Development Foundry',detail:'Eight and WEAVE development agents.',href:'/admin/development-agents',daily:true},
  {label:'DJ Workshop',detail:'Sound, broadcast and atmosphere control.',href:'/admin/dj-workshop'},
  {label:'Ad Workshop',detail:'Create, target and publish WEAVE advertising.',href:'/admin/ad-workshop'},
  {label:'Visual Systems',detail:'World-motion and visual runtime authority.',href:'/admin/visual-systems'},
  {label:'Environment Organizer',detail:'Withdraw, restore and order active environment surfaces.',href:'/admin/environment-organizer'},
  {label:'Flame Event · Loop 1',detail:'Company Loop 1 event authority.',href:'/admin/flame-event'},
]

const adminDistricts:WeaveRoleDistrict[]=[
  {
    key:'presence',name:'Presence District',subtitle:'STANDING · IDENTITY · VALUE · RECORD',
    purpose:'Institutional standing and shared human presence.',accent:'#7dd3fc',places:[
      ...sharedPresence,
      {label:'Reserve',detail:'Institutional reserve and fund position.',href:'/fund-wall'},
    ],
  },
  {
    key:'position',name:'Administration Position',subtitle:'WORLD · OPERATING ROOM · CONTROL',
    purpose:'The daily Administration position before entering specialized authority.',accent:'#fb923c',places:administrationPlaces.slice(0,4),
  },
  {
    key:'bridge',name:'Bridge District',subtitle:'GUIDANCE · LOUNGE · CLIENT SUPPORT',
    purpose:'Human communication, company guidance and Client support.',accent:'#67e8f9',places:[
      {label:'Client File Folder Support',detail:'Enter Client File Folder worlds in read-only support mode.',href:'/weave?station=file-folders',daily:true},
      ...sharedBridge,
    ],
  },
  {
    key:'enterprise',name:'Enterprise District',subtitle:'SYSTEMS · MARKETS · ECHO',
    purpose:'Commercial and enterprise movement.',accent:'#f59e0b',places:[
      {label:'Enterprise Systems Exchange',detail:'See the live market of WEAVE enterprise systems.',href:'/marketplace'},
      {label:'Echo',detail:'AI-assisted routing and continuing interaction.',href:'/echo'},
    ],
  },
  {
    key:'participation',name:'Participation District',subtitle:'LOOPS · ARENA · PATTERN · STREAM',
    purpose:'Shared company movement and participation.',accent:'#fb7185',places:sharedParticipation,
  },
  {
    key:'administration',name:'Administration District',subtitle:'AUTHORITY · VERIFICATION · INFRASTRUCTURE · DEVELOPMENT',
    purpose:'Specialized institutional systems that keep WEAVE operating.',accent:'#f97316',places:administrationPlaces.slice(4),
  },
]

const byRole:Record<WeaveRole,WeaveRoleDistrict[]>={
  client:clientDistricts,
  agent:agentDistricts,
  bridger:bridgerDistricts,
  admin:adminDistricts,
}

export function normalizeWeaveRole(role?:string|null):WeaveRole{
  if(role==='admin'||role==='agent'||role==='bridger'||role==='client')return role
  return 'client'
}

export function getRoleDistricts(role?:string|null){
  return byRole[normalizeWeaveRole(role)]
}

export function getRoleDistrict(role:string|undefined|null,key:string){
  return getRoleDistricts(role).find(district=>district.key===key)||null
}

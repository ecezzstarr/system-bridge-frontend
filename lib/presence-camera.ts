export type PresenceCameraLevel = 'world' | 'district' | 'system' | 'interaction'

export type PresenceScene = {
  key: string
  label: string
  district: string
  level: PresenceCameraLevel
  camera: {
    x: number
    y: number
    yaw: number
    pitch: number
    zoom: number
    depth: number
  }
}

const SCENES: Array<{ match: (path: string) => boolean; scene: PresenceScene }> = [
  {
    match: path => path === '/' || path === '/login' || path === '/register' || path === '/forgot-password' || path === '/reset-password' || path === '/client-register',
    scene: { key:'entry', label:'WEAVE Entrance', district:'Presence', level:'world', camera:{x:0,y:2,yaw:0,pitch:0.5,zoom:1.006,depth:8} },
  },
  {
    match: path => path === '/agent/presence',
    scene: { key:'agent-presence', label:'Agent Presence', district:'Presence', level:'district', camera:{x:-10,y:3,yaw:-1.5,pitch:0.8,zoom:1.014,depth:20} },
  },
  {
    match: path => path === '/bridger/presence',
    scene: { key:'bridger-presence', label:'Bridger Presence', district:'Presence', level:'district', camera:{x:0,y:4,yaw:0,pitch:1,zoom:1.015,depth:21} },
  },
  {
    match: path => path === '/client/presence',
    scene: { key:'client-presence', label:'Client Presence', district:'Presence', level:'district', camera:{x:10,y:3,yaw:1.5,pitch:0.8,zoom:1.014,depth:20} },
  },
  {
    match: path => path === '/admin/file-number-engine',
    scene: { key:'file-number-engine', label:'File Number Engine', district:'Institution', level:'system', camera:{x:24,y:-3,yaw:4,pitch:-1,zoom:1.03,depth:42} },
  },
  {
    match: path => path === '/client/loops',
    scene: { key:'client-loop-field', label:'Client Loop Field', district:'Client World', level:'district', camera:{x:-8,y:-7,yaw:-1.5,pitch:-1.8,zoom:1.033,depth:41} },
  },
  {
    match: path => path === '/bridger/numbers',
    scene: { key:'number-bay', label:'Number Bay', district:'Bridge', level:'system', camera:{x:-31,y:-4,yaw:-5,pitch:-1,zoom:1.035,depth:46} },
  },
  {
    match: path => path === '/bridger/subscription',
    scene: { key:'bridger-continuance', label:'Bridger Continuance', district:'Bridge', level:'system', camera:{x:-25,y:6,yaw:-4,pitch:1.5,zoom:1.027,depth:37} },
  },
  {
    match: path => path === '/agent/commissions',
    scene: { key:'agent-commissions', label:'Agent Commissions', district:'Agent Movement', level:'system', camera:{x:13,y:7,yaw:2,pitch:1.5,zoom:1.026,depth:36} },
  },
  {
    match: path => path === '/admin/loop-workshop',
    scene: { key:'loop-workshop', label:'Loop Formation Room', district:'Institution', level:'system', camera:{x:12,y:-9,yaw:2,pitch:-2,zoom:1.037,depth:49} },
  },
  {
    match: path => path === '/admin/bridger-numbers',
    scene: { key:'number-control', label:'Number Engine Control Bay', district:'Institution', level:'system', camera:{x:30,y:-5,yaw:5,pitch:-1,zoom:1.034,depth:47} },
  },
  {
    match: path => path === '/admin/infrastructure',
    scene: { key:'infrastructure', label:'Infrastructure Workshop', district:'Institution', level:'system', camera:{x:38,y:2,yaw:6,pitch:0.5,zoom:1.032,depth:44} },
  },
  {
    match: path => path === '/admin/visual-systems',
    scene: { key:'visual-systems', label:'Visual Systems Workshop', district:'Institution', level:'system', camera:{x:27,y:8,yaw:4.2,pitch:2,zoom:1.028,depth:39} },
  },
  {
    match: path => path === '/admin/environment-organizer',
    scene: { key:'environment-organizer', label:'Environment Organizer', district:'Institution', level:'system', camera:{x:31,y:5,yaw:4.8,pitch:1.2,zoom:1.03,depth:42} },
  },
  {
    match: path => path === '/admin/dj-workshop',
    scene: { key:'dj-workshop', label:'DJ Workshop', district:'Institution', level:'system', camera:{x:9,y:8,yaw:1.5,pitch:2,zoom:1.025,depth:35} },
  },
  {
    match: path => path === '/admin/client-deposits',
    scene: { key:'client-deposit-control', label:'Client Deposit Control', district:'Institution', level:'system', camera:{x:35,y:6,yaw:5.5,pitch:1.5,zoom:1.03,depth:42} },
  },
  {
    match: path => path === '/admin/enterprise-dream',
    scene: { key:'enterprise-dream-authority', label:'Enterprise Dream Authority', district:'Institution', level:'system', camera:{x:44,y:-1,yaw:7,pitch:0,zoom:1.032,depth:45} },
  },
  {
    match: path => path === '/market',
    scene: { key:'client-market', label:'WEAVE Client Market', district:'Enterprise', level:'world', camera:{x:42,y:-4,yaw:6.5,pitch:-0.4,zoom:1.038,depth:53} },
  },
  {
    match: path => path.startsWith('/market/'),
    scene: { key:'client-market-store', label:'Client Store Environment', district:'Enterprise', level:'interaction', camera:{x:46,y:-2,yaw:7,pitch:-0.5,zoom:1.042,depth:56} },
  },
  {
    match: path => path.startsWith('/store/'),
    scene: { key:'customer-door', label:'Customer Door', district:'Enterprise', level:'interaction', camera:{x:46,y:-2,yaw:7,pitch:-0.5,zoom:1.042,depth:56} },
  },
  {
    match: path => path === '/stream',
    scene: { key:'stream-network', label:'WEAVE Stream Network', district:'Enterprise', level:'world', camera:{x:47,y:5,yaw:7.5,pitch:1.2,zoom:1.034,depth:46} },
  },
  {
    match: path => path.startsWith('/stream/'),
    scene: { key:'streaming-gate', label:'Client Streaming Gate', district:'Enterprise', level:'interaction', camera:{x:51,y:-3,yaw:8,pitch:-0.8,zoom:1.044,depth:58} },
  },
  {
    match: path => path === '/enterprise',
    scene: { key:'enterprise-territory', label:'WEAVE Enterprise Territory', district:'Enterprise', level:'world', camera:{x:54,y:2,yaw:8.4,pitch:0.5,zoom:1.036,depth:49} },
  },
  {
    match: path => path.startsWith('/enterprise/'),
    scene: { key:'enterprise-door', label:'Client Enterprise Door', district:'Enterprise', level:'interaction', camera:{x:58,y:-2,yaw:9,pitch:-0.5,zoom:1.046,depth:60} },
  },
  {
    match: path => path.startsWith('/river/'),
    scene: { key:'river', label:'River Interaction', district:'Presence', level:'interaction', camera:{x:-18,y:-5,yaw:-3,pitch:-1,zoom:1.04,depth:54} },
  },
  {
    match: path => path === '/dashboard' || path.endsWith('/dashboard'),
    scene: { key:'home', label:'Role Home', district:'Presence', level:'world', camera:{x:0,y:0,yaw:0,pitch:0,zoom:1,depth:0} },
  },
  {
    match: path => path === '/weave' || path.startsWith('/weave/file-folder/'),
    scene: { key:'bridge-plaza', label:'Bridge Plaza', district:'Bridge', level:'district', camera:{x:-34,y:2,yaw:-5,pitch:1,zoom:1.018,depth:24} },
  },
  {
    match: path => path.includes('/system-switch'),
    scene: { key:'file-folder', label:'Main File Folder', district:'System Switch', level:'system', camera:{x:28,y:-3,yaw:5,pitch:-1,zoom:1.032,depth:42} },
  },
  {
    match: path => path.includes('/bridge-ai') || path.startsWith('/bridge/'),
    scene: { key:'bridge', label:'Bridge', district:'Bridge', level:'interaction', camera:{x:-44,y:-2,yaw:-7,pitch:0.5,zoom:1.04,depth:54} },
  },
  {
    match: path => path.includes('/market/prospects') || path.includes('/prospect-engine'),
    scene: { key:'prospects', label:'Prospect Movement', district:'Enterprise', level:'system', camera:{x:-22,y:5,yaw:-3,pitch:1.5,zoom:1.026,depth:36} },
  },
  {
    match: path => path.includes('/clients') || path.includes('/client-interactions'),
    scene: { key:'clients', label:'Client Movement', district:'Support', level:'system', camera:{x:18,y:3,yaw:3,pitch:1,zoom:1.024,depth:34} },
  },
  {
    match: path => path.includes('/communications') || path.includes('/company-chat') || path.includes('/chat/') || path.includes('/messages') || path.includes('/lounge'),
    scene: { key:'interaction', label:'Human Interaction', district:'Support', level:'interaction', camera:{x:8,y:-5,yaw:1.5,pitch:-1,zoom:1.045,depth:58} },
  },
  {
    match: path => path.includes('/wallet') || path.includes('/deposit') || path.includes('/ledger') || path.includes('/transactions') || path.includes('/earnings') || path.includes('/fund-wall'),
    scene: { key:'value', label:'Value Movement', district:'Presence', level:'system', camera:{x:34,y:4,yaw:6,pitch:1.5,zoom:1.028,depth:38} },
  },
  {
    match: path => path.includes('/marketplace') || path.includes('/agility'),
    scene: { key:'enterprise-exchange', label:'Enterprise Exchange', district:'Enterprise', level:'district', camera:{x:42,y:3,yaw:7,pitch:1,zoom:1.022,depth:30} },
  },
  {
    match: path => path.includes('/arena'),
    scene: { key:'arena', label:'Arena', district:'Weave', level:'district', camera:{x:-38,y:8,yaw:-6,pitch:2,zoom:1.025,depth:34} },
  },
  {
    match: path => path.includes('/casino'),
    scene: { key:'casino', label:'Pattern', district:'Weave', level:'district', camera:{x:38,y:8,yaw:6,pitch:2,zoom:1.025,depth:34} },
  },
  {
    match: path => path.includes('/event') || path.includes('/loops') || path.includes('/company/loops'),
    scene: { key:'loops', label:'Company Loops', district:'Presence', level:'district', camera:{x:0,y:-8,yaw:0,pitch:-2,zoom:1.035,depth:40} },
  },
  {
    match: path => path.includes('/functions') || path.includes('/authority') || path.includes('/admin/'),
    scene: { key:'operations', label:'Operating Room', district:'Institution', level:'system', camera:{x:16,y:-4,yaw:2.5,pitch:-1,zoom:1.03,depth:40} },
  },
  {
    match: path => path.includes('/search') || path.includes('/profiles') || path.includes('/standing'),
    scene: { key:'field', label:'Presence Field', district:'Presence', level:'district', camera:{x:-12,y:4,yaw:-2,pitch:1,zoom:1.016,depth:22} },
  },
]

export const DEFAULT_PRESENCE_SCENE: PresenceScene = {
  key:'weave',
  label:'WEAVE World',
  district:'Presence',
  level:'world',
  camera:{x:0,y:0,yaw:0,pitch:0,zoom:1,depth:0},
}

export function resolvePresenceScene(pathname: string): PresenceScene {
  const clean = pathname || '/'
  return SCENES.find(entry => entry.match(clean))?.scene || DEFAULT_PRESENCE_SCENE
}

export function sceneDirection(from: PresenceScene, to: PresenceScene) {
  const delta = to.camera.x - from.camera.x
  if (Math.abs(delta) < 5) return to.camera.depth >= from.camera.depth ? 1 : -1
  return delta > 0 ? 1 : -1
}

export type PresenceOutput = {
  id: string
  type: 'navigation' | 'action' | 'arrival'
  label: string
  fromPath: string
  toPath?: string | null
  fromScene: string
  toScene?: string | null
  at: string
}

export const PRESENCE_TRACE_KEY = 'weave_presence_trace_v1'
export const PRESENCE_TRACE_LIMIT = 80

const APP_SHELL_PREFIXES = [
  '/admin','/agent','/agility','/arena','/authority','/bridger','/casino',
  '/client-interactions','/clients','/company-chat','/company','/dashboard','/earnings',
  '/echo','/event','/fund-wall','/ledger','/lounge','/marketplace','/places',
  '/private-ground','/profiles','/roles','/search','/transactions','/video-feed',
  '/wallet','/weave',
]

export function isPresenceCameraShellManaged(pathname: string) {
  if (pathname === '/client' || pathname.startsWith('/client/')) return true
  if (pathname === '/admin/file-number-engine') return false
  return APP_SHELL_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

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
    match: path => path.includes('/company-chat') || path.includes('/chat/') || path.includes('/messages') || path.includes('/lounge'),
    scene: { key:'interaction', label:'Human Interaction', district:'Support', level:'interaction', camera:{x:8,y:-5,yaw:1.5,pitch:-1,zoom:1.045,depth:58} },
  },
  {
    match: path => path.includes('/wallet') || path.includes('/deposit') || path.includes('/ledger') || path.includes('/transactions') || path.includes('/earnings') || path.includes('/fund-wall'),
    scene: { key:'value', label:'Value Movement', district:'Presence', level:'system', camera:{x:34,y:4,yaw:6,pitch:1.5,zoom:1.028,depth:38} },
  },
  {
    match: path => path.includes('/marketplace') || path.includes('/agility'),
    scene: { key:'market', label:'Market', district:'Enterprise', level:'district', camera:{x:42,y:3,yaw:7,pitch:1,zoom:1.022,depth:30} },
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

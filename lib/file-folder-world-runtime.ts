// One spatial layout for geometry, collisions, entrances and the live map.
export const FILE_FOLDER_DISTRICT_POSITIONS = {
  command:[0,0,0], builds:[2.8,0,-1.8], business:[-4.5,0,-3.8],
  enterprise:[-3.6,0,4.15], sound:[3.75,0,4.1],
} satisfies Record<string,[number,number,number]>

export const DISTRICT_BODY_RADIUS = 1.6
export const FILE_FOLDER_WORLD_RADIUS = 28
export const FILE_FOLDER_STREET_COLUMNS=[-11,11]
export const FILE_FOLDER_STREET_ROWS=[-24,-12,12,24]
export type Presence = { x: number; z: number; yaw: number; heading?: number }
export type WorldObstacle = { x: number; z: number; radius: number; halfWidth?: number; halfDepth?: number; height?: number }

// Shared host blocks: physical scenery, never projected as Client-owned systems.
export const FILE_FOLDER_CITY_BLOCKS = [-18,-6,6,18].flatMap((z,row)=>[-18,18].map((x,column)=>({
  x,z,width:5,depth:6,height:4+((row*3+column*2)%5),
})))
export const FILE_FOLDER_CITY_OBSTACLES:WorldObstacle[]=[...FILE_FOLDER_CITY_BLOCKS.map(b=>({
  x:b.x,z:b.z,radius:0,halfWidth:b.width/2,halfDepth:b.depth/2,height:b.height,
})),{x:0,z:-10.8,radius:0,halfWidth:1.85,halfDepth:1.35,height:7.8},
...[-2.2,2.2].map(x=>({x,z:5.4,radius:0,halfWidth:.12,halfDepth:.175,height:2.1}))]

function obstructed(x:number,z:number,obstacles:WorldObstacle[]){
  return Math.hypot(x,z)>FILE_FOLDER_WORLD_RADIUS || obstacles.some(o=>o.halfWidth!==undefined&&o.halfDepth!==undefined
    ? Math.abs(x-o.x)<o.halfWidth+.2&&Math.abs(z-o.z)<o.halfDepth+.2
    : Math.hypot(x-o.x,z-o.z)<o.radius+.2)
}

/** Pull the chase camera forward before it crosses a facade behind the Client. */
export function safeFollowCamera(p:Presence,desired:{x:number;y:number;z:number},obstacles:WorldObstacle[]){
  let safe={x:p.x,y:1.7,z:p.z}
  for(let step=1;step<=32;step++){
    const t=step/32
    const point={x:p.x+(desired.x-p.x)*t,y:1.7+(desired.y-1.7)*t,z:p.z+(desired.z-p.z)*t}
    const relevant=obstacles.filter(o=>point.y<(o.height??2.7)+.25)
    if(obstructed(point.x,point.z,relevant))return safe
    safe=point
  }
  return desired
}


export const FILE_FOLDER_PARK_TREES=Array.from({length:20},(_,i)=>{
  const angle=i/20*Math.PI*2,radius=9.1+(i%4)*.4
  return {x:Math.cos(angle)*radius,z:Math.sin(angle)*radius}
}).filter(p=>!(Math.abs(p.x)<2&&p.z>5))
export function aiTerritoryWorldPosition(index:number,total:number):[number,number,number]{
  const angle=index/Math.max(1,total)*Math.PI*2-Math.PI/2,radius=10.15+(index%2)*.55
  return [Math.cos(angle)*radius,0,Math.sin(angle)*radius]
}

// Session-local presence: never changes ownership, build state or wallet state.
export function movePresence(p: Presence, forward: number, turn: number, seconds: number, obstacles: WorldObstacle[] = [], strafe = 0, running = false): Presence {
  const dt = Math.max(0, Math.min(.05, seconds))
  const yaw = p.yaw + Math.max(-1, Math.min(1, turn)) * dt * 2
  const f=Math.max(-1,Math.min(1,forward)),s=Math.max(-1,Math.min(1,strafe))
  const normalize=Math.max(1,Math.hypot(f,s))
  const distance = f/normalize * dt * (running?5.4:3)
  const lateral = s/normalize * dt * (running?5.4:3)
  const x = p.x - Math.sin(yaw) * distance + Math.cos(yaw) * lateral
  const z = p.z - Math.cos(yaw) * distance + Math.sin(yaw) * lateral
  // Resolve each axis independently so a diagonal approach slides along walls.
  const nextX=obstructed(x,p.z,obstacles)?p.x:x
  const nextZ=obstructed(nextX,z,obstacles)?p.z:z
  const moved=Math.hypot(nextX-p.x,nextZ-p.z)>.00001
  return {x:nextX,z:nextZ,yaw,heading:moved?Math.atan2(-(nextX-p.x),-(nextZ-p.z)):p.heading??p.yaw}
}

export function systemWorldPosition(index: number, total: number): [number, number, number] {
  const radius = 7.05 + (index % 2) * .42
  const angle = index / Math.max(1, total) * Math.PI * 2
  return [Math.cos(angle)*radius, 0, Math.sin(angle)*radius]
}

export function canEnter(p: Presence, position: [number, number, number]) {
  return Math.hypot(p.x-position[0],p.z-position[2]) <= 2
}

/**
 * One authoritative visual progress function for both 3D construction and the
 * touch build console. Purchased acceleration changes the stored completion
 * date; the two surfaces must never show different construction percentages.
 */
export function buildFormationProgress(build: {
  started_at?: string | number | Date | null;
  created_at?: string | number | Date | null;
  completes_at?: string | number | Date | null;
}, now: number): number {
  const started = new Date(build.started_at || build.created_at || now).getTime()
  const completed = new Date(build.completes_at || now).getTime()
  if (!Number.isFinite(started) || !Number.isFinite(completed)) return 0
  if (completed <= started) return now >= completed ? 100 : 0
  return Math.max(0, Math.min(100, ((now - started) / (completed - started)) * 100))
}

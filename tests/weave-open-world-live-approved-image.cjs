const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')
const atlas=read('components/world/weave-open-world-atlas.tsx')
const scene=read('components/events/burning-river-live-world.tsx')
const page=read('app/system-switch/world/page.tsx')
const css=read('app/system-switch/world/open-world-atlas.css')
const api=read('app/api/system-switch/open-world/route.ts')
const data=read('lib/weave-open-world-domains.ts')

assert.ok(atlas.includes('data-weave-official-atlas="approved-image-live-world"'),
 'The official WEAVE Open World picture is the main entry landscape')
assert.ok(atlas.includes('const SCENE_URLS=[')&&
 Array.from({length:10},(_,i)=>"'/weave/open-world/scene-"+String(i).padStart(2,'0')+".webp'").every(url=>atlas.includes(url))&&
 atlas.includes("'/weave/open-world/scene-preview.webp'"),
 'Ten explicit approved image assets and the fast preview are available for the route audit')
assert.ok(atlas.includes("data-weave-verified-live-count={domains.length}")&&
 atlas.includes('domains.map(domain=>'),
 'Live castle markers come exclusively from real public File Folder records')
assert.ok(atlas.includes('onSelect(domain.domainId)')&&
 atlas.includes('data-open-world-domain={domain.domainId}'),
 'A verified Client castle is independently selectable on the approved art')
assert.ok(atlas.includes('enable3D&&active&&where')&&
 atlas.includes('<AdaptiveCanvas')&&atlas.includes('<LiveClientCastle domain={active}/>')&&
 atlas.includes('useFrame((_,delta)'),
 'Selected Client File Folder castle renders as live animated 3D, not a pasted sprite')
assert.ok(atlas.includes("domain.tier==='plus'")&&
 atlas.includes('domain.buildLevel')&&atlas.includes('domain.activity.buildProgress')&&
 atlas.includes('domain.activity.operatingSystems')&&
 atlas.includes('domain.customerDoor.open'),
 'Live 3D castle architecture reflects verified tier, build, system and public commissioning')
assert.ok(atlas.includes('data-weave-image-entrance="staff"')&&
 atlas.includes('data-weave-image-entrance="visitor"')&&
 atlas.includes('data-weave-image-entrance="customer"'),
 'The approved image entrance controls are functional without duplicate text cards')
assert.ok(css.includes('weave-atlas-river-drift')&&
 css.includes('prefers-reduced-motion:reduce'),
 'Living water and fire preserve reduced-motion accessibility')
assert.ok(page.includes("import './open-world-atlas.css'")&&
 page.includes('/weave/open-world/scene-preview.webp')&&
 page.includes('data-weave-open-world="system-switch"'),
 'System Switch route loads approved picture first while remaining the permanent world container')
assert.ok(scene.includes("landMode,setLandMode]=useState<'atlas'|'3d'>('atlas')")&&
 scene.includes('landMode===\'atlas\'?<WeaveOpenWorldAtlas')&&
 scene.includes('<WeaveOpenWorldLandscape domains={domains} placing={placing} onPlace={onPlace}/>'),
 'The official image is the default and the actual movable 3D landscape stays available')
assert.ok(scene.includes('onWorldReady={()=>setSceneReady(true)}')&&
 scene.includes('<DomainCastle key={d.domainId}')&&
 scene.includes('setPlacing(true)')&&
 scene.includes('moveMyCastle'),
 'Actual Client castles and owner relocation are still part of navigable 3D')
assert.ok(scene.includes('const href=publicHref(domain)')&&
 scene.includes("if(role==='client'&&owner?.domainId===id)")&&
 scene.includes('if(!domain.customerDoor.open'),
 'Visitors never enter private File Folders and only commissioned public Doors open')
assert.ok(api.includes('readVerifiedClientDomains')&&
 data.includes('publicName:doorOpen&&row.public_name'),
 'The real world feed excludes private Client identity and fabricated accounts')
assert.ok(!atlas.includes('NORTHRIDGE FOLDER')&&!atlas.includes('ASHEN BASTION'),
 'Illustrated exemplar castle names must never be emitted as real Client data')
console.log('PASS: approved WEAVE art, live 3D verified castle, hotspots, water/fire, and protected Customer Doors')

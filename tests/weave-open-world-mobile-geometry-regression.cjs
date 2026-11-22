const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')

const atlas=read('components/events/weave-world-atlas.tsx')
const css=read('components/events/weave-world-atlas.css')
const world=read('components/events/burning-river-live-world.tsx')

assert.ok(atlas.includes("/weave/open-world/weave-open-world-official.jpg"),'Approved exact artwork remains unchanged')
assert.ok(atlas.includes('width={1024} height={1536}'),'Use real 2:3 picture aspect ratio')
assert.ok(atlas.includes('object-fit')===false,'Do not warp the official image from JSX')
assert.ok(css.includes('object-fit: contain'),'No stretched poster on narrow phone')
assert.ok(css.includes('filter: none !important')&&css.includes('opacity: 1 !important'),'No accidental dark/blurred poster')
assert.ok(!css.includes('[data-atlas-utility]'),'No fake navigation pills covering the title and castle')
assert.ok(!atlas.includes('weave-atlas-owner-label'),'Do not label an imaginary landmark as an actual Client purchase')
assert.ok(atlas.includes('data-client-owned-world-control="verified-only"'),'Owner is identified beside the picture')
assert.ok(atlas.includes('onFindOwnDomain'),'Owner control opens their real verified world slot')
assert.ok(!atlas.includes('ownerHere'),'A landmark must not secretly redirect to the Client domain')
assert.ok(atlas.includes('eventHref'),'The Loop 1 event entrance is connected')
assert.ok(world.includes('eventHref={eventHref}'),'Loop entrance preserves the actual event route')
assert.ok(css.includes('min-height: 44px'),'Mobile hotspots must be touch sized')

const areas=[...atlas.matchAll(/(?:rect:\s*|hotspot\()\[\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\]/g)]
 .map(m=>m.slice(1,5).map(Number))
assert.equal(areas.length,12,'Six regions, Plus, Bridge, event and three navigation positions')
for(const [x,y,w,h] of areas)assert.ok(w>0&&h>0&&x>=0&&y>=0&&x+w<=1024&&y+h<=1536,
 'A location must remain within the approved picture: '+[x,y,w,h])
for(let i=0;i<areas.length;i++)for(let j=i+1;j<areas.length;j++){
 const [ax,ay,aw,ah]=areas[i]
 const [bx,by,bw,bh]=areas[j]
 const ox=Math.min(ax+aw,bx+bw)-Math.max(ax,bx)
 const oy=Math.min(ay+ah,by+bh)-Math.max(ay,by)
 assert.ok(ox<=0||oy<=0,'Mobile hotspots overlap and can misroute visitors: '+i+','+j)
}
for(const width of [320,360,393,430]){
 const height=width*1536/1024
 const mainButtons=areas.filter(([x,y])=>y>=1400)
 assert.equal(mainButtons.length,3,'Three lower entrances are kept')
 for(const [x,y,w,h] of mainButtons){
  const top=Math.min(y/1536*height,height-44)
  const bottom=top+Math.max(44,h/1536*height)
  assert.ok(top>=0&&bottom<=height+.01,'Lower map targets must remain inside the image on a '+width+'px phone')
  assert.ok(w/1024*width>=44,'Each main action needs a safe minimum width on a '+width+'px phone')
 }
}
for(const label of ['Northridge','Verdant Keep','Rivergate Marketplace','Ember Hold','Starfall Spire','Tidemoor','The Plus Citadel','Bridge of Radiance','Burning River','Customer Door','Explore','Domains','Staff Entrance','Community','Guide']){
 assert.ok(atlas.includes(label),'Working Open World destination missing: '+label)
}
console.log('PASS: official Open World image, non-overlapping tap controls, owner truthfulness and mobile sizing')

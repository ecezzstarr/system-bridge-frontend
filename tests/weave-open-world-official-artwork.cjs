const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')

const filename='public/weave/open-world/weave-open-world-official.jpg'
const jpeg=fs.readFileSync(path.join(__dirname,'..',filename))
assert.equal(crypto.createHash('sha256').update(jpeg).digest('hex'),
 'c91ed877872ce1176c7c34bdbafb571ea54b1a9f7f5f2c688b161c91f0d83f5e',
 'Do not replace the Client-approved Open World picture with a similar one')
assert.equal(jpeg[0],0xff)
assert.equal(jpeg[1],0xd8)

// JPEG SOF segment contains the actual encoded raster dimensions.
function dimensions(bytes){
 let offset=2
 while(offset<bytes.length-4){
  if(bytes[offset]!==0xff){offset++;continue}
  while(bytes[offset]===0xff)offset++
  const marker=bytes[offset++]
  if(marker===0xd9||marker===0xda)break
  if(marker>=0xd0&&marker<=0xd7||marker===0x01)continue
  const length=bytes.readUInt16BE(offset)
  if((marker>=0xc0&&marker<=0xc3)||(marker>=0xc5&&marker<=0xc7)){
   return {height:bytes.readUInt16BE(offset+3),width:bytes.readUInt16BE(offset+5)}
  }
  offset+=length
 }
 throw Error('No readable JPEG size')
}
assert.deepEqual(dimensions(jpeg),{width:1024,height:1536})

const atlas=read('components/events/weave-world-atlas.tsx')
const css=read('components/events/weave-world-atlas.css')
const world=read('components/events/burning-river-live-world.tsx')
assert.ok(atlas.includes("const WORLD_ATLAS_ART = '/weave/open-world/weave-open-world-official.jpg'"))
assert.ok(atlas.includes('width={1024} height={1536}'))
assert.ok(atlas.includes('x / 1024 * 100')&&atlas.includes('y / 1536 * 100'))
assert.ok(world.includes('data-weave-official-open-world-reference="weave-open-world-official.jpg"'))
assert.ok(atlas.includes('data-client-owned-map-name="verified-only"'))
assert.ok(atlas.includes('onFindOwnDomain'))
assert.ok(css.includes('[data-atlas-utility]'))

// A mis-sized transparent hotspot is a broken mobile entrance even when clickable.
const hitAreas=[...atlas.matchAll(/(?:rect:\s*|hotspot\()\[\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\]/g)]
  .map(hit=>hit.slice(1,5).map(Number))
assert.ok(hitAreas.length>=16,'The picture has all landmark and navigation hit areas')
for(const [x,y,w,h] of hitAreas){
 assert.ok(w>0&&h>0&&x>=0&&y>=0&&x+w<=1024&&y+h<=1536,
  'Image hotspot must remain inside official raster: '+[x,y,w,h])
}
for(const landmark of ['Northridge','Verdant Keep','Rivergate Marketplace','Ember Hold','Starfall Spire','Tidemoor','The Plus Citadel','Bridge of Radiance']){
 assert.ok(atlas.includes(landmark),'Official artwork landmark must be interactive: '+landmark)
}
for(const entrance of ['Visitor Entrance','Staff Entrance','Customer Door','World Map','Domains','Explore','Community','Guide']){
 assert.ok(atlas.includes(entrance),'Navigation continuity: '+entrance)
}
assert.ok(atlas.includes('onError={() => setArtFailed(true)}'),'Keep accessible map fallback when image cannot load')
console.log('PASS: exact official WEAVE Open World image, accurate 1024x1536 hotspots and Client-owned nameplates')

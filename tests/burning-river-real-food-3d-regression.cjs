const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const catalog=read('lib/burning-river-food-catalog.ts')
const scene=read('components/events/burning-river-food-store-3d.tsx')
const preview=read('components/events/flame-event-public-preview.tsx')
const staffScene=read('components/events/flame-event-mobile-scene.tsx')
const arrival=read('components/events/flame-event-public-mobile.tsx')
const publicApi=read('app/api/public/client-market/route.ts')
const clientRoute=read('app/market/[slug]/page.tsx')
const carrier=read('app/carrier/food/[code]/page.tsx')

for(const p of [
  'public/weave-food/electrolyte.jpeg',
  'public/weave-food/agility.jpeg',
  'public/weave-food/ember.jpg',
  'public/weave-food/daisy-pastries-original.png',
  'public/weave-food/weave-family-products.avif',
]){
  assert.ok(fs.statSync(path.join(root,p)).size>1000,'Existing product asset missing: '+p)
  assert.ok(catalog.includes('/'+p.replace(/^public\//,'')),'3D catalogue must use existing image: '+p)
}
assert.ok(catalog.includes('branded-illustration'),'Family graphic may not claim to be actual in-stock inventory')
assert.ok(catalog.includes('BURNING_RIVER_FARM')&&!catalog.includes('farm-produce.jpg'),'Farm listings stay live; no invented stock photograph')
assert.ok(catalog.includes("encodeURIComponent(carrierCode)+'?checkout=1#'+anchor"),'Each product keeps referring Agent code through real checkout')
assert.ok(scene.includes('useTexture(')&&scene.includes('<meshBasicMaterial map={textures[i]}'),'Existing imagery is mapped onto actual 3D geometry')
assert.ok(scene.includes('texture.repeat.set(1,1)')&&scene.includes('texture.offset.set(0,0)'),'Images are center-cropped, not stretched')
assert.ok(scene.includes('window.location.assign(burningRiverFoodHref(carrierCode,item.anchor))'),'Touching a 3D food image enters its real order route')
assert.ok(scene.includes('data-flame-food-order={item.id}')&&scene.includes('data-flame-food-order="farm"'),'Photo board and farm entrance retain accessible links')
assert.ok(scene.includes('<Suspense fallback={<PhotoLoading/>}>'),'Image loading cannot suspend the entire 3D river')
assert.ok(preview.includes('<RiverSurface quiet={false}/>')&&preview.includes('<BurningRiverFoodStore3D carrierCode={carrierCode}/>'),'River and food occupy one 3D scene')
assert.ok(staffScene.includes('<BurningRiverFoodStore3D/>'),'Staff sees the identical existing-photo 3D storefront inside Burning River')
assert.ok(preview.includes('File Folder ·')&&preview.includes("door.level==='market_hall'"),'Client structures reflect real File Folder public tiers')
assert.ok(preview.includes('data-flame-preview-no-avatar="true"')&&!preview.includes('data-flame-mobile-joystick'),'Public 3D view has no avatar or joystick')
assert.ok(preview.includes('<FlameEventFoodStore carrierCode={carrierCode}/>'),'Real image fallback remains available when WebGL is absent')
assert.ok(arrival.includes('<FlameEventPublicPreview enterprises={enterprises} status={doorStatus} carrierCode={carrierCode}/>'),'Agent identity reaches the real in-world food storefront')
assert.ok(!arrival.includes('<FlameEventFoodStore carrierCode={carrierCode}/>'),'Do not stack another food webpage under the open world')
assert.ok(publicApi.includes("p.enabled=true AND b.status='active'"),'Client File Folder structures require published active systems')
assert.ok(clientRoute.includes("query.checkout!=='1'")&&carrier.includes("query.checkout!=='1'"),'Public Client and food checkout boundaries remain in place')
console.log('3D WEAVE food uses original repository images, one open world, valid Agent links, and real Client publication tiers')

const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..')
const read=file=>fs.readFileSync(path.join(root,file),'utf8')
const visual=read('components/world/weave-existing-page-image.tsx')
const app=read('app/(app)/layout.tsx')
const client=read('app/client/layout.tsx')
const agentWork=read('app/(app)/agent/work/page.tsx')
const bridge=read('public/weave/bridge-of-radiance-portrait.svg')
const river=read('public/weave/flame-event/burning-river-world.svg')

const originalSources=[
 'public/weave/bridge-of-radiance-portrait.svg',
 'public/weave/flame-event/burning-river-world.svg',
 'public/weave-food/agility.jpeg',
 'public/weave-food/electrolyte.jpeg',
 'public/weave-food/ember.jpg',
 'public/weave-food/daisy-pastries-original.png',
 'public/weave-food/weave-family-products.avif',
]
for(const asset of originalSources){
 const image=fs.readFileSync(path.join(root,asset))
 assert.ok(image.length>1000,'Existing referenced WEAVE image must exist: '+asset)
}
assert.ok(bridge.includes('Bridge of Radiance')&&river.includes('id="fire"')&&river.includes('id="river"'),'Page imagery reuses approved Bridge and flowing River')
for(const route of [
 '/weave/lifestyles','/weave/carrier','/weave/lifestyles/food-preparation',
 '/agent/work','/agent/distribution','/agent/presence','/agent/stability-supply',
 '/bridger/presence','/bridger/bridge-ai','/bridger/email-outreach','/bridger/numbers',
 '/client/presence','/roles','/echo','/admin/flame-event','/admin/visual-systems'
]){
 assert.ok(visual.includes("'"+route+"':{"),'Route has specific image and wording: '+route)
}
assert.ok(visual.includes('data-weave-page-original-visual={pathname}'),'Route visual remains testable')
assert.ok(visual.includes('visual.eyebrow')&&visual.includes('visual.title')&&visual.includes('visual.meaning'),'Each image carries contextual wording')
assert.ok(visual.includes('if(!visual)return null'),'Unmapped views keep their existing layout and interactive worlds')
assert.ok(!visual.includes('Math.random')&&!visual.includes('fake order'),'No invented customer counts or fake ordering in page image')
assert.ok(app.includes('<EnvironmentPageGuard><WeaveExistingPageImage/>{children}</EnvironmentPageGuard>'),'Operating pages show image only within authorized app guard')
assert.ok(client.includes('<EnvironmentPageGuard><WeaveExistingPageImage/>{children}</EnvironmentPageGuard>'),'Client Presence can use image without replacing Client File Folder world')
for(const image of ['agility.jpeg','electrolyte.jpeg','ember.jpg']){
 assert.ok(agentWork.includes(image),'Agent Work existing product card shows '+image)
}
assert.ok(agentWork.includes('DAISY_PASTRIES_IMAGE_SRC'),'Daisy Pastries retained')
console.log('Existing Weave page images and role-aware contextual words: source regression passed')

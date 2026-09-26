const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')

const room=read('components/world/weave-system-room.tsx')
assert.ok(room.includes('data-weave-room={roomKey}'),'Reusable WEAVE room exposes room identity')
assert.ok(room.includes('usePresenceCamera'),'Reusable WEAVE room stays attached to Presence Camera')
assert.ok(room.includes('System pulse'),'Reusable WEAVE room exposes live system pulse')

const converted=[
 ['app/client/loops/page.tsx','client-loop-field'],
 ['app/(app)/admin/loop-workshop/page.tsx','administration-loop-workshop'],
 ['app/(app)/bridger/subscription/page.tsx','bridger-continuance'],
 ['app/(app)/bridger/numbers/page.tsx','bridger-number-bay'],
 ['app/(app)/admin/bridger-numbers/page.tsx','administration-number-engine'],
]
for(const [file,key] of converted){
 const source=read(file)
 assert.ok(source.includes('WeaveSystemRoom'),file+' uses the shared environment room')
 assert.ok(source.includes('roomKey="'+key+'"'),file+' preserves its spatial room identity')
 assert.ok(!source.includes('min-h-screen bg-slate-950'),file+' does not recreate an opaque standalone page')
}

const bridgerNumbers=read('app/(app)/bridger/numbers/page.tsx')
const bridgerNumbersApi=read('app/api/bridger/numbers/route.ts')
const adminNumbers=read('app/(app)/admin/bridger-numbers/page.tsx')
assert.ok(!bridgerNumbers.includes('n.acquisition_cost'),'Bridger Number Bay never renders provider acquisition cost')
assert.ok(!bridgerNumbersApi.includes('acquisition_cost'),'Bridger Number API never returns provider acquisition cost')
assert.ok(adminNumbers.includes('n.acquisition_cost'),'Administration retains internal acquisition cost')
assert.ok(adminNumbers.includes('price_flame_coin'),'Administration retains Bridger Flame Coin price')

const continuance=read('app/(app)/bridger/subscription/page.tsx')
assert.ok(!continuance.includes('bg-white shadow-sm'),'Bridger Continuance no longer uses generic white web cards')
assert.ok(!continuance.includes('text-gray-'),'Bridger Continuance uses WEAVE environment language')

const camera=read('lib/presence-camera.ts')
for(const key of ['client-loop-field','number-bay','bridger-continuance','loop-workshop','number-control','infrastructure','dj-workshop','client-deposit-control','enterprise-dream-authority']){
 assert.ok(camera.includes("key:'"+key+"'"),key+' has a distinct Presence Camera scene')
}

const css=read('app/globals.css')
assert.ok(css.includes('Environment-first enforcement.'),'Authenticated legacy roots are absorbed into the persistent world')

const rootLayout=read('app/layout.tsx')
assert.equal((rootLayout.match(/<PresenceCameraProvider>/g)||[]).length,1,'Exactly one Presence Camera provider owns the application')
assert.equal((rootLayout.match(/<WeaveWorldEnvironment\s*\/>/g)||[]).length,1,'Exactly one persistent WEAVE world owns the application')
assert.ok(rootLayout.includes('<WeaveEnvironmentTransit>'),'Global environment transit remains active')
assert.ok(rootLayout.includes('<InteractionMotionLayer />'),'Interaction output remains globally visible')

console.log('environment-grade regression checks passed')

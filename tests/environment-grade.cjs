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
for(const key of ['client-loop-field','number-bay','bridger-continuance','loop-workshop','number-control','infrastructure','visual-systems','dj-workshop','client-deposit-control','enterprise-dream-authority']){
 assert.ok(camera.includes("key:'"+key+"'"),key+' has a distinct Presence Camera scene')
}

const css=read('app/globals.css')
assert.ok(css.includes('Environment-first enforcement.'),'Authenticated legacy roots are absorbed into the persistent world')

const rootLayout=read('app/layout.tsx')
assert.equal((rootLayout.match(/<PresenceCameraProvider>/g)||[]).length,1,'Exactly one Presence Camera provider owns the application')
assert.equal((rootLayout.match(/<WeaveWorldEnvironment\s*\/>/g)||[]).length,1,'Exactly one persistent WEAVE world owns the application')
assert.ok(rootLayout.includes('<WeaveEnvironmentTransit>'),'Global environment transit remains active')
assert.ok(rootLayout.includes('<InteractionMotionLayer />'),'Interaction output remains globally visible')

const artifact=read('components/events/flame-event-artifact.tsx')
const bridgePlaza=read('components/world/bridge-plaza-map.tsx')
const weaveHero=read('components/weave-hero-3d.tsx')
const bridgeRadiance=read('components/bridge/bridge-radiance-world.tsx')
const eventDecor=read('components/events/flame-event-world-decorations.tsx')
const clientEvent=read('components/events/client-flame-event-dashboard.tsx')
assert.ok(artifact.includes('FlameEventArtifact3D'),'Canonical Flame Event 4D artifact exists')
assert.ok(artifact.includes('FlameEventArtifactMark'),'Canonical Flame Event interface mark exists')
assert.ok(bridgePlaza.includes('FlameEventArtifact3D'),'Bridge Plaza uses the canonical artifact')
assert.ok(!bridgePlaza.includes('torusKnotGeometry'),'Bridge Plaza no longer uses the old gold/green woven ring object')
assert.ok(!bridgePlaza.includes("color='#e8b93f'") && !bridgePlaza.includes('color="#e8b93f"'),'Bridge Plaza no longer hard-codes the old gold ring identity')
assert.ok(!bridgePlaza.includes("color='#14b8a6'") && !bridgePlaza.includes('color="#14b8a6"'),'Bridge Plaza no longer hard-codes the old teal ring identity')
assert.ok(weaveHero.includes('FlameEventArtifact3D'),'Homepage 3D hero uses the same canonical artifact')
assert.ok(!weaveHero.includes('torusKnotGeometry'),'Homepage no longer revives the old woven ring motif')
assert.ok(bridgeRadiance.includes('FlameEventArtifact3D'),'Bridge Radiance portals use the same artifact language')
assert.ok(!bridgeRadiance.includes('torusGeometry'),'Bridge Radiance no longer uses generic torus portals')
assert.ok(eventDecor.includes('FlameEventArtifactMark'),'Global Flame Event atmosphere uses the canonical artifact')
assert.ok(clientEvent.includes('FlameEventArtifactMark'),'Client Flame Event center uses the canonical artifact')

const visualProfile=read('lib/weave-visual-profile.ts')
const visualRuntime=read('lib/weave-visual-runtime.ts')
const visualAdminApi=read('app/api/admin/visual-systems/route.ts')
const visualPublicApi=read('app/api/visual-runtime/route.ts')
const visualWorkshop=read('app/(app)/admin/visual-systems/page.tsx')
const adminWorkshop=read('app/(app)/admin/workshop/page.tsx')
const appSidebar=read('components/app-sidebar.tsx')
const operatingRoom=read('components/world/role-operating-room.tsx')
const dashboardWorld=read('components/world/weave-dashboard-world.tsx')
assert.ok(visualProfile.includes('FLAME_ARTIFACT_SURFACES'),'Visual runtime has an explicit surface registry')
assert.ok(visualProfile.includes("red:'#fb7185'") && visualProfile.includes("sky:'#7dd3fc'"),'Published visual profile preserves Flame Event red/sky signature')
assert.ok(visualProfile.includes("'bridge-plaza-core'")&&visualProfile.includes("'client-event'"),'Visual runtime covers Bridge Plaza through Client Flame Event')
assert.ok(visualRuntime.includes('weave_visual_profiles')&&visualRuntime.includes('weave_visual_profile_history'),'Visual runtime persists draft, published state and history')
assert.ok(visualRuntime.includes('rollbackVisualProfile'),'Visual runtime supports published rollback')
assert.ok(visualAdminApi.includes("user.role!=='admin'"),'Only Administration can publish visual runtime changes')
assert.ok(visualAdminApi.includes("action==='publish'")&&visualAdminApi.includes("action==='rollback'"),'Administration API exposes publish and rollback actions')
assert.ok(visualPublicApi.includes('getPublishedVisualProfile'),'Public runtime exposes published visual state only')
assert.ok(visualPublicApi.includes('DEFAULT_FLAME_ARTIFACT_CONFIG'),'Public runtime has a compiled safe fallback')
assert.ok(artifact.includes("fetch('/api/visual-runtime'"),'Canonical artifact reads its published runtime profile')
assert.ok(artifact.includes('15000'),'Mounted artifacts refresh published runtime state without deployment')
assert.ok(artifact.includes('surface?:FlameArtifactSurface'),'Artifact applies per-surface runtime placement controls')
assert.ok(visualWorkshop.includes('Visual Systems Workshop')&&visualWorkshop.includes('Publish Live'),'Administration has a live Visual Systems Workshop')
assert.ok(visualWorkshop.includes("run('rollback'"),'Visual Systems Workshop can roll back a published revision')
assert.ok(visualWorkshop.includes('configOverride={draft}'),'Visual Systems Workshop previews draft state before publishing')
for(const source of [adminWorkshop,appSidebar,operatingRoom,dashboardWorld]){
 assert.ok(source.includes('/admin/visual-systems'),'Administration navigation exposes Visual Systems Workshop')
}
assert.ok(fs.existsSync(path.join(root,'db/migrations/20260926_visual_systems_workshop.sql')),'Visual Systems Workshop migration exists')

console.log('environment-grade regression checks passed')

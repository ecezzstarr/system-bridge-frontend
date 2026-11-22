const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')

const ownerApi=read('app/api/client/company-loop-connections/route.ts')
const publicApi=read('app/api/events/flame/open-world/route.ts')
const source=read('lib/weave-open-world-store.ts')
const projection=read('lib/weave-open-world-domains.ts')
const atlas=read('components/events/weave-world-atlas.tsx')
const atlasCss=read('components/events/weave-world-atlas.css')
const world=read('components/events/burning-river-live-world.tsx')
const scene=read('components/events/weave-world-scene.tsx')
const purchase=read('lib/file-folder-purchase-activation.ts')

// Owner name comes only through a server-verified, uncached Client connection response.
assert.ok(ownerApi.includes('const {sql,domain,error}=await clientDomain(request)'))
assert.ok(ownerApi.includes('f.client_name AS owner_name'))
assert.ok(ownerApi.includes('ownerName:String(domain.owner_name||\'\').trim().slice(0,100)'))
assert.ok(ownerApi.includes('ownerTier:String(domain.tier||\'unclassified\')'))
assert.ok(ownerApi.includes("'Cache-Control':'private, no-store'"))
assert.ok(ownerApi.includes("u.role='client'")&&ownerApi.includes("f.status='active'"))

// Public world feed continues to hide personal identities before Customer Door publication.
assert.ok(projection.includes('publicName:doorOpen&&row.public_name'))
assert.ok(!projection.includes('ownerName')&&!projection.includes('client_name'))
assert.ok(source.includes('CASE WHEN s.enabled=true AND s.world_host_customer_market=true'))
assert.ok(!publicApi.includes('owner_name'))
assert.ok(!publicApi.includes('client_name'))

// A verified purchase or issued folder already provisions a durable Client world.
assert.ok(purchase.includes('provisionPurchasedWorldDomain('))
assert.ok(source.includes('ON CONFLICT(file_number) DO UPDATE SET'))
assert.ok(source.includes("f.status='active' AND u.role='client'"))

// Client names follow the authenticated world ID; image art stays unchanged.
assert.ok(world.includes("role==='client'&&owner?"))
assert.ok(world.includes('ownDomainId={role===\'client\'?owner?.domainId:null}'))
assert.ok(world.includes('ownDomainName={role===\'client\'?owner?.ownerName:null}'))
assert.ok(atlas.includes('data-client-owned-world-control="verified-only"'))
assert.ok(atlas.includes('onFindOwnDomain'))
assert.ok(!atlas.includes('ownerHere') && !atlas.includes('worldLocationForSlot(ownWorld.worldSlot).region'),
 'A private Client domain may never impersonate a fixed illustrated landmark')
assert.ok(atlasCss.includes('.weave-atlas-owner-label'))
assert.ok(atlas.includes("/weave/open-world/weave-open-world-official.jpg"))

// Three-dimensional Client structures grow from actual operating-system counts.
assert.ok(scene.includes('ownDomainId===d.domainId?ownDomainName:null'))
assert.ok(scene.includes("data-verified-world-nameplate={ownerName?'owner':'public'}"))
assert.ok(scene.includes('verified-active-business-systems'))
assert.ok(scene.includes('Math.min(3,domain.activity.operatingSystems)'))
assert.ok(scene.includes('domain.customerDoor.open'))

// Parse all edited TS/TSX modules; this does not replace production typecheck.
for(const filename of [
 'app/api/client/company-loop-connections/route.ts',
 'components/events/burning-river-live-world.tsx',
 'components/events/weave-world-atlas.tsx',
 'components/events/weave-world-scene.tsx',
]){
 const parsed=ts.createSourceFile(filename,read(filename),ts.ScriptTarget.Latest,true,filename.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 assert.equal(parsed.parseDiagnostics.length,0,filename+' has syntax errors')
}
console.log('PASS: verified personal File Folder nameplates, public privacy, persistent owner, active-system visual growth')

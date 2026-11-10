const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const assert=require('node:assert/strict')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const typescriptFiles=[
 'lib/weave-image-sample-art.ts',
 'lib/weave-image-sample-commerce.ts',
 'app/api/image-workshop/samples/route.ts',
 'app/api/image-workshop/samples/export/route.ts',
 'app/api/image-service/[code]/route.ts',
 'app/image-service/[code]/page.tsx',
 'app/(app)/image-workshop/page.tsx',
]
for(const name of typescriptFiles){
 const file=ts.createSourceFile(name,read(name),ts.ScriptTarget.Latest,true,name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 assert.equal(file.parseDiagnostics.length,0,name+' has no TS/JSX parse errors')
}
const src=read('lib/weave-image-sample-art.ts')
const mod={exports:{}}
vm.runInNewContext(ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,
 {exports:mod.exports,require:name=>{throw Error('Offline art must not import '+name)}},{filename:'lib/weave-image-sample-art.ts'})
const {WEAVE_IMAGE_SAMPLES,WEAVE_SAMPLE_FORMATS,defaultSampleEdits,normalizeSampleEdits,renderWeaveSampleSvg}=mod.exports
assert.ok(WEAVE_IMAGE_SAMPLES.length>=47,'Original Image House now includes the new merchandise, packaging and artist editions')
assert.ok(new Set(WEAVE_IMAGE_SAMPLES.map(x=>x.category)).size>=15,'Business visual categories extend beyond original catalogue')
assert.equal(new Set(WEAVE_IMAGE_SAMPLES.map(x=>x.id)).size,WEAVE_IMAGE_SAMPLES.length,'Every sample has an independent ID')
assert.ok(new Set(WEAVE_IMAGE_SAMPLES.map(x=>x.motif)).size>=21,'All material mockups have distinct original vector scenes')
for(const sample of WEAVE_IMAGE_SAMPLES){
 const edits=defaultSampleEdits(sample)
 const preview=renderWeaveSampleSvg(sample,edits,true)
 const licensed=renderWeaveSampleSvg(sample,edits,false)
 assert.ok(preview.includes('WEAVE SAMPLE · PREVIEW'),sample.id+' preview carries a watermark')
 assert.ok(!licensed.includes('WEAVE SAMPLE · PREVIEW'),sample.id+' licensed work is unwatermarked')
 assert.ok(licensed.includes('MADE WITH WEAVE'),sample.id+' retains creator provenance')
 assert.ok(licensed.includes('<svg')&&licensed.includes('<g>'),sample.id+' is actual vector artwork')
}
const shirt=findImageSampleForTest('brand-tee-classic')
function findImageSampleForTest(id){return WEAVE_IMAGE_SAMPLES.find(x=>x.id===id)}
assert.ok(shirt,'Branding shirts are real samples in the company catalogue')
const plain=normalizeSampleEdits(shirt,defaultSampleEdits(shirt))
assert.ok(!Object.hasOwn(plain,'artworkHash'),'Legacy licensing fingerprints remain unchanged when no artwork is uploaded')
const withArt=normalizeSampleEdits(shirt,{...defaultSampleEdits(shirt),artworkHash:'a'.repeat(64),printText:'ARTIST MERCH',printX:30,printY:-10,printScale:.75,printRotation:5,printColor:'#ffffff'})
assert.equal(withArt.artworkHash,'a'.repeat(64),'Uploaded artwork changes the license fingerprint')
assert.equal(withArt.printText,'ARTIST MERCH')
assert.notDeepEqual(plain,withArt,'Distinct customer artwork is tracked separately')

const sample=WEAVE_IMAGE_SAMPLES[0]
const unsafe=normalizeSampleEdits(sample,{headline:'<script>alert(1)</script>',brand:'<svg onload="bad">',format:'wide',accent:'#ca2121'})
const safe=renderWeaveSampleSvg(sample,unsafe,false)
assert.ok(safe.includes('&lt;script&gt;')&&!safe.includes('<script>')&&!safe.includes('<svg onload='),'Customer text cannot inject SVG markup')
assert.ok(safe.includes('width="1600" height="900"'),'Wide exports use real export resolution')
assert.ok(WEAVE_SAMPLE_FORMATS.story.height===1920,'Portrait story-format deliverables are supported')

const commerce=read('lib/weave-image-sample-commerce.ts')
const api=read('app/api/image-workshop/samples/route.ts')
const exportApi=read('app/api/image-workshop/samples/export/route.ts')
const publicApi=read('app/api/image-service/[code]/route.ts')
const page=read('app/(app)/image-workshop/page.tsx')
const publicPage=read('app/image-service/[code]/page.tsx')
const registry=read('lib/weave-environment-registry.ts')
const authority=read('app/(app)/authority/workshops/page.tsx')
assert.ok(commerce.includes('BEGIN')&&commerce.includes('FOR UPDATE')&&commerce.includes('COMMIT')&&commerce.includes('ROLLBACK'),'License payment is transactional')
assert.ok(commerce.includes('balance_trx=balance_trx-$1')&&commerce.includes('SYSTEM_SWITCH'),'Company System Switch production fees are debited and labeled correctly')
assert.ok(commerce.includes("'image_sample_workshop'")&&commerce.includes('weave_receipts'),'Company purchase receipts persist')
assert.ok(commerce.includes('user_id=$1::uuid AND content_hash=$2'),'Identical checkout retries are idempotent')
assert.ok(commerce.includes('sampleFingerprint(sampleId,edits,serviceOrderId)'), 'Commercial licenses are scoped to specific customer jobs')
assert.ok(commerce.includes('serviceOrderId:string|null=null'),'Separate customer commissions have separate license keys')
assert.ok(commerce.includes("role==='admin'?0"),'Official Administrations artwork does not count as a paid sale')
assert.ok(commerce.includes('weave_image_sample_requests')&&commerce.includes('weave_image_sample_providers'),'Service identity and customer requests persist')
assert.ok(api.includes("action==='admin_set_fee'")&&api.includes("user.role!=='admin'"),'Only Administrations publishes production fee')
assert.ok(api.includes('companyDaily')||commerce.includes('companyDaily'),'Administrations see actual daily sales')
assert.ok(exportApi.includes('user_id=$2::uuid')&&exportApi.includes('svg_snapshot'),'Only the owner downloads the paid exact SVG')
assert.ok(exportApi.includes('Content-Disposition')&&exportApi.includes('nosniff'),'Licensed media is served with hardened headers')
assert.ok(publicApi.includes('customer_brief')&&publicApi.includes('24 hours'),'Public customer requests are recorded and rate-limited')
assert.ok(publicPage.includes('No payment is collected on this page.'),'Customer door does not falsely claim payment')
assert.ok(page.includes('renderWeaveSampleSvg')&&page.includes('data:image/svg+xml'),'Previews run without remote AI or asset providers')
assert.ok(page.includes("send('checkout'")&&page.includes('canvas.toBlob'),'User approves a paid licence before PNG export')
assert.ok(page.includes('serviceDoorUrl')&&page.includes('customerOrderId'),'Users can get commissions and tie deliverables to orders')
assert.ok(page.includes('companyDaily')&&page.includes('admin_set_fee'),'Daily sales and fee configuration accessible to Administrations')
assert.ok(registry.includes("route:'/image-workshop'"),'The Image House is an actual WEAVE environment')
assert.ok(authority.includes("href: '/image-workshop'"),'Administrations workshop door is present')
console.log('WEAVE Image House: 36 original samples, no-API preview, payment, licenses, customer door and daily company accounting verified')

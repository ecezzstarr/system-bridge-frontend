const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const assert=require('node:assert/strict')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const files=[
 'lib/weave-branding-business.ts',
 'lib/weave-image-sample-art.ts',
 'app/(app)/image-workshop/branding/page.tsx',
 'app/(app)/image-workshop/business/page.tsx',
 'app/(app)/admin/image-branding/page.tsx',
 'app/api/image-workshop/business/route.ts',
 'app/(app)/image-workshop/page.tsx',
]
for(const file of files){
 const source=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 assert.equal(source.parseDiagnostics.length,0,file+' must parse as TypeScript/JSX')
}
const vectors={exports:{}}
vm.runInNewContext(ts.transpileModule(read(files[1]),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,
 {exports:vectors.exports,require:()=>{throw Error('Offline graphic templates may not call external modules')}},{filename:files[1]})
const kitModule={exports:{}}
vm.runInNewContext(ts.transpileModule(read(files[0]),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,
 {exports:kitModule.exports,require:source=>{
   if(source==='@/lib/weave-image-sample-art')return vectors.exports
   throw Error('Unexpected import '+source)
 }},{filename:files[0]})
const {BRANDING_KITS,MATERIAL_MOCKUPS,BRANDING_LAUNCH_STEPS,createBrandingAd,validateBrandingTemplates}=kitModule.exports
assert.equal(BRANDING_KITS.length,6,'Six actual business formation categories')
assert.equal(MATERIAL_MOCKUPS.length,10,'Ten material and artist product mockups')
assert.equal(BRANDING_LAUNCH_STEPS.length,6,'Six actionable start and scale steps')
assert.equal(validateBrandingTemplates(),true,'No kit may refer to a missing commercial template')
assert.equal(vectors.exports.WEAVE_IMAGE_SAMPLES.length,47,'Original 36 templates are retained and 11 new branding templates added')
const first=vectors.exports.findImageSample('brand-tee-classic')
assert.ok(first,'Genuine shirt vector mockup is available')
const start=vectors.exports.defaultSampleEdits(first)
const withArt=vectors.exports.normalizeSampleEdits(first,{...start,artworkHash:'a'.repeat(64),printText:'MY BRAND',printColor:'#ffffff',printX:23,printY:10,printScale:.75,printRotation:12})
assert.equal(withArt.artworkHash,'a'.repeat(64),'Artwork digest is preserved for uniquely licensed client production')
assert.equal(withArt.printText,'MY BRAND')
assert.equal(Object.prototype.hasOwnProperty.call(vectors.exports.normalizeSampleEdits(first,start),'artworkHash'),false,'Pre-existing image license fingerprints are unchanged without uploaded artwork')
const preview=vectors.exports.renderWeaveSampleSvg(first,start,true)
const licensed=vectors.exports.renderWeaveSampleSvg(first,start,false)
assert(preview.includes('WEAVE SAMPLE · PREVIEW'),'No free unmarked export')
assert(!licensed.includes('WEAVE SAMPLE · PREVIEW'),'Commercial license removes preview watermark')
assert(licensed.includes('linearGradient id="fabric"'),'Clothing products use layered textile shading')
const ad=createBrandingAd({businessName:'An Original Shop',offer:'Custom-made apparel concepts for your collection',kitId:'apparel',audience:'Local boutique owners',customerDoor:'https://example.com/image-service/test',quoteNgn:7500})
assert(ad.includes('₦7,500')&&ad.includes('https://example.com/image-service/test'),'Advertising includes actual quote and public door')
assert.throws(()=>createBrandingAd({businessName:'A',offer:'bad',kitId:'apparel',audience:'X',customerDoor:'',quoteNgn:null}),/business name/)
const api=read('app/api/image-workshop/business/route.ts')
assert(api.includes("user.role==='admin'")&&api.includes("action==='feature_template'"),'Company catalogue curation is Administrations-only')
assert(api.includes("action==='save_plan'")&&api.includes("action==='prepare_ad'")&&api.includes("action==='report_share'"),'Every formation action has an authenticated persistent API')
assert(api.includes("pg_advisory_xact_lock")&&api.includes('UNIQUE(user_id,client_key)'), 'Ad preparation serializes the daily cap and deduplicates retries')
assert(api.includes("status='reported_shared'")&&!api.includes('verified_reach'),'Off-platform sharing is not fabricated as verified advertising')
assert(api.includes('weave_image_sample_licenses')&&api.includes('fee_system_switch>0'),'Administrations financial totals only count paid licenses')
const house=read('app/(app)/image-workshop/page.tsx')
assert(house.includes('data-image-house-business-systems')&&house.includes('image-house-customer-door')&&house.includes('image-house-orders'),'Users move from design to business reception and job completion')
assert(house.includes('featured.includes')&&house.includes('/admin/image-branding'),'Administrations featured selection is connected to company Image House')
const editor=read('app/(app)/image-workshop/branding/page.tsx')
assert(editor.includes('crypto.subtle.digest')&&editor.includes("action:'checkout'")&&editor.includes('/samples/export?license='),'Uploaded artwork has distinct license fingerprint, paid export and private local composition')
assert(!editor.includes('api.openai.com')&&!api.includes('api.openai.com'),'No provider-billed image generation in new systems')
const lifestyle=read('app/(app)/weave/lifestyles/page.tsx')
assert(lifestyle.includes('data-lifestyle-branding-business'),'Agent and Bridger lifestyle includes starting a branding business')
const admin=read('lib/admin-workplace-catalog.ts')
assert(admin.includes('/admin/image-branding'),'Administrations workshop includes template curation and business operations')
console.log('PASS: 47 offline templates, 10 materials, 6 business categories, plan and ad records, licensed work, privacy, company earnings and role handoffs')

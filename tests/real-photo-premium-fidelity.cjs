const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=name=>fs.readFileSync(path.join(root,name),'utf8')
const paths=[
  'lib/weave-image-photo-library.ts',
  'app/(app)/image-workshop/page.tsx',
  'app/(app)/image-workshop/business/page.tsx',
  'app/(app)/image-workshop/branding/page.tsx',
  'app/(app)/admin/image-branding/page.tsx',
  'lib/weave-image-sample-art.ts',
  'app/client/dashboard/page.tsx',
  'components/client/client-premium-estate.tsx',
  'components/world/client-kingdom-dashboard-scene.tsx',
  'components/system-switch/file-folder-premium-world.tsx',
  'app/client/system-switch/file-folder-phone.css',
]
for(const file of paths.filter(f=>f.endsWith('.tsx')||f.endsWith('.ts'))){
  const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  assert.equal(parsed.parseDiagnostics.length,0,file+' must be valid TypeScript/JSX')
}
const photo=read(paths[0])
const editor=read(paths[3])
const art=read(paths[5])
const estate=read(paths[7])
const owner=read(paths[8])
const premium=read(paths[9])
const premiumCss=read(paths[10])
const pricing=read('lib/file-folder-pricing.ts')
assert(photo.includes('images.unsplash.com/')&&photo.includes('source:'),'Photographic examples are traceable actual photography, not drawn vector art.')
assert(photo.includes('WEAVE original product photograph'),'Existing WEAVE food photos remain available.')
assert(photo.includes("brand-tee-classic")&&photo.includes("brand-hoodie-studio")&&photo.includes("brand-tote-atelier")&&photo.includes("brand-cap-original")&&photo.includes("brand-mug-personal"),'Actual clothing and merchandise photographs are available.')
assert(!photo.includes("sampleId:'brand-canvas-art',url:img('photo-160832"),'Unrelated records are not used as deceptive product images.')
assert(editor.includes('data-photo-material-origin="real"')&&editor.includes('uploadProduct'),'An actual product photograph is the editing source; own photos replace samples.')
assert(editor.includes("image.crossOrigin='anonymous'")&&editor.includes('ctx.getImageData(0,0,1,1)'),'Photo-CORS errors are detected before a wallet charge.')
assert(editor.includes("ready||!usingRealPhotograph")&&editor.includes("if(!edits||!sample||!accepted||!ready||!usingRealPhotograph)return"),'Photo must be loaded and exportable before company licensing.')
assert(editor.includes('crypto.subtle.digest')&&art.includes('photoHash?:string')&&art.includes("src.photoHash"),'Each uploaded product photo has a distinct production-license fingerprint.')
assert(editor.includes('/api/image-workshop/samples/export?license='),'Download remains private and tied to the licensed company receipt.')
assert(!editor.includes('fetch(\"https://api.openai.com')&&!editor.includes('data:image/svg+xml;charset=utf-8,'),'Actual photo material editor no longer renders a vector base or pays an AI provider.')
assert(read(paths[1]).includes('photoForSample')&&read(paths[2]).includes('photoForSample')&&read(paths[4]).includes('photoForSample'),'Real photographs appear in the Image House, startup ads, and Administrations.')
assert(read(paths[6]).includes('<ClientPremiumEstate />'),'Premium Client account has an estate entrance.')
assert(estate.includes("identity.tier!=='premium'")&&estate.includes("data.file_folder_tier!=='premium'")&&estate.includes("data.verified"),'Premium estate is shown only to verified Premium Client owners.')
assert(estate.includes('/api/client/system-switch')&&estate.includes('file_folder_world'),'Premium account status is derived from persistent owner data.')
assert(estate.includes('doorPublished')&&estate.includes("status==='building'")&&estate.includes("status==='active'"),'No fabricated construction, commissioned systems or published customer doors.')
assert(owner.includes("tier==='premium'?<PremiumKingdomArchitecture/>"),'Premium owner account has a unique detailed citadel, not the generic castle.')
assert(owner.includes('premium-ceremonial-column')||premium.includes('premium-ceremonial-column'),'Premium architecture has premium-specific geometry.')
assert(premium.includes('data-premium-file-folder-world="official-black-gold"')&&premium.includes('data-premium-district-navigation="six-active-workshops"')&&premium.includes('data-premium-private-estate-identity="monumental-obsidian-gold"'),'Private Premium world has an enhanced, legible estate interface.')
assert(premium.includes('Premium3DRecoveryBoundary')&&premium.includes('data-premium-3d-recovery="webgl-unavailable"'),'The purchased estate is still usable if WebGL fails.')
assert(premium.includes("['selling','ready_for_offer']")&&premium.includes('stationStatus:Record<StationKey,string>'),'Customer Door and real workshop states remain record-driven.')
assert(premiumCss.includes('.ff-environment[data-file-folder-tier="premium"] .ff-workspace-frame'),'Premium styling applies to business interiors as well as the 3D world.')
assert(read('components/world/kingdom-theme.css').includes('data-kingdom-tier="premium"'),'Client account theme is tier-scoped and never global.')
assert(pricing.includes('premiumFlameCoin: 35800'),'This change does not silently reprice or recategorize the purchase.')
const workflows=read('.github/workflows/production-check.yml')
assert(workflows.includes('node tests/real-photo-premium-fidelity.cjs'),'Source release enforces photographic fidelity and Premium access.')
console.log('PASS: sourced product photos and owner-photo editing, no wallet debit on unusable source, Premium Client account and private estate, unchanged pricing and access')

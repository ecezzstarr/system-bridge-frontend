const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=filename=>fs.readFileSync(path.join(root,filename),'utf8')
const files=[
  'lib/hope-video-studio-bundles.ts',
  'lib/hope-video-studio-schema.ts',
  'lib/hope-video-studio-purchase.ts',
  'app/api/hope/video-bundles/route.ts',
  'components/bridger/hope-video-studio-packages.tsx',
  'app/(app)/bridger/video-studio/page.tsx',
]
for(const file of files){
  const source=read(file)
  const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  assert.equal(parsed.parseDiagnostics.length,0,file+' parses cleanly')
}
const bundles=read(files[0]),commerce=read(files[2]),endpoint=read(files[3]),packages=read(files[4]),store=read(files[5])
const single=read('lib/hope-video-filter-purchase.ts')
const shop=read('components/bridger/hope-video-filter-shop.tsx')
const admin=read('app/api/admin/company-movement/route.ts')
const adminPage=read('app/(app)/admin/company-movement/page.tsx')
assert(bundles.includes('studio-starter')&&bundles.includes('presence-pro')&&bundles.includes('full-studio'))
assert(bundles.includes('quoteHopeStudioBundle'))
assert(bundles.includes('Math.ceil(bundle.priceSystemSwitch*missingListValue/totalValue)'),'Existing owned effects lower package checkout')
assert(commerce.includes('SELECT id,role,is_active FROM users WHERE id=$1::uuid FOR UPDATE'),'Serialize user purchasing')
assert(commerce.includes('FROM weave_hope_video_bundle_grants'),'Check already-owned individual and bundle licenses')
assert(commerce.includes('balance_trx >= $1'),'Atomic safe wallet debit')
assert(commerce.includes('ON CONFLICT(bridger_id,filter_id) DO NOTHING'),'Grant is unique per user/filter')
assert(commerce.includes('hope_video_studio_bundle'),'Track company proceeds in ledger and receipt')
assert(commerce.includes('await client.query(\'COMMIT\')'),'Commit wallet debit and grants together')
assert(single.includes('FROM weave_hope_video_bundle_grants'),'Single item purchase honors package-granted entitlement')
assert(single.includes('SELECT filter_id,MAX(purchased_at)'),'Return combined licenses in buyer gallery')
assert(endpoint.includes('user.role!==\'bridger\''),'Only Bridgers can purchase')
assert(endpoint.includes('quoteHopeStudioBundle(bundle,ownedIds)'),'Show current quoted price')
assert(endpoint.includes('purchaseHopeStudioBundle(user.id,body.bundleId)'),'Server calculates price')
assert(packages.includes('window.confirm('),'Explicit approval before checkout')
assert(packages.includes('await prepareHopeVideoEffect(effect)'),'Preview-check premium support before paying')
assert(packages.includes("method:'POST'"),'Package purchase is real')
assert(store.includes('data-hope-video-studio="commercial-workshop"'),'Own pre-call marketplace')
assert(store.includes('<HopeVideoFilterShop/>'),'Marketplace shares the same entitlement catalog')
assert(shop.includes('<HopeVideoStudioPackages onPurchase={refresh}/>'),'Package purchases refresh individual gallery licenses')
assert(read('lib/weave-page-directory.ts').includes('/bridger/video-studio'),'Page is recognized by company loader')
assert(read('lib/bridger-workplace-catalog.ts').includes('Hope Video Studio'),'Bridger can navigate to paid shop')
assert(admin.includes('const videoBundles=await read('),'Company income source includes bundle sales')
assert(adminPage.includes('money(\'videoBundles\',\'earned_system_switch\')'),'Administrations sees bundle proceeds')
console.log('PASS: modern WEAVE Hope Studio standalone store, permanently owned packages, server-quoted discounts, atomic wallet sales, and Administrations reporting')

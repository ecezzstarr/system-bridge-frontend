const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=path=>fs.readFileSync(require('node:path').join(root,path),'utf8')
const source='lib/weave-payment-region.ts'
const tsFiles=[
 source,
 'app/api/payments/region/route.ts',
 'components/payments/payment-region-selector.tsx',
 'app/file-folder/page.tsx',
 'app/(app)/wallet/deposit-withdraw/page.tsx',
 'app/api/bridge/file-folder/purchase/route.ts',
 'app/api/deposit/paystack/route.ts'
]
for(const file of tsFiles){
 const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 assert.equal(tree.parseDiagnostics.length,0,'Invalid TypeScript/JSX syntax: '+file)
}
const code=ts.transpileModule(read(source),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText
const exportsObject={}
vm.runInNewContext(code,{exports:exportsObject})
const {validWeaveCountry,suggestCountryFromLocale,paymentRegion}=exportsObject
assert.equal(suggestCountryFromLocale('en-NG'),'NG')
assert.equal(suggestCountryFromLocale('en-GB'),'GB')
assert.equal(suggestCountryFromLocale('es-ES'),'ES')
assert.equal(suggestCountryFromLocale('en-US'),'US')
assert.equal(suggestCountryFromLocale('en'),null)
assert.equal(validWeaveCountry('ng'),'NG')
assert.equal(validWeaveCountry('XX'),null)
const nigeria=paymentRegion('NG','wallet_deposit')
assert.equal(nigeria.localCurrency,'NGN')
assert.equal(nigeria.defaultRail,'paystack_ngn')
assert.ok(nigeria.methods.find(m=>m.id==='paystack_ngn').available)
assert.ok(!nigeria.methods.find(m=>m.id==='flutterwave_ngn').available)
const ghana=paymentRegion('GH','file_folder')
assert.equal(ghana.localCurrency,'GHS')
assert.equal(ghana.defaultRail,'tron_trx')
assert.ok(ghana.methods.find(m=>m.id==='tron_trx').available)
const otherWallet=paymentRegion('US','wallet_deposit')
assert.equal(otherWallet.localCurrency,'USD')
assert.equal(otherWallet.defaultRail,'tron_trx')
assert.ok(!otherWallet.methods.find(m=>m.id==='tron_trx').available,'Retired wallet TRX deposits stay disabled')
assert.equal(paymentRegion(null,'file_folder').countryConfirmed,false)
assert.equal(ghana.peg.rate,1,'One TRX is one System Switch accounting unit')
const api=read('app/api/payments/region/route.ts')
assert.ok(api.includes('weave_payment_country_preferences'),'Country choice saved to account')
assert.ok(api.includes("body.confirmedByUser!==true"),'No silent country registration')
assert.ok(api.includes("const selected=confirmed||(!user?requestedCountry:null)"),'Authenticated country cannot be spoofed by URL')
assert.ok(api.includes("rate.source==='live'"),'No fallback exchange rate for paid quote')
assert.ok(api.includes('paymentReady:Boolean(quote)'),'No readiness without quote')
const selector=read('components/payments/payment-region-selector.tsx')
assert.ok(selector.includes('suggestCountryFromLocale'),'Country auto-suggested from locale, not imposed')
assert.ok(selector.includes('Confirm payment country'),'Explicit correction and confirmation')
assert.ok(selector.includes("region.rail")===false,'No bypassed direct payout call')
const wallet=read('app/(app)/wallet/deposit-withdraw/page.tsx')
assert.ok(wallet.includes('purpose="wallet_deposit"'),'Wallet uses shared route')
assert.ok(wallet.includes("fundingRail==='paystack_ngn'"),'Only selected NGN rail can initialize wallet payments')
assert.ok(wallet.includes('data-weave-international-rail-hold'),'Unavailable wallet TRX rail is not fake funding')
const folder=read('app/file-folder/page.tsx')
assert.ok(folder.includes('purpose="file_folder"'),'File Folder uses same route')
assert.ok(folder.includes('paymentCountryReady'),'Country confirmed before purchase')
assert.ok(folder.includes("paymentCountry!=='NG'"),'Naira checkout restricted to Nigerian chosen region')
const paystack=read('app/api/deposit/paystack/route.ts')
const bridge=read('app/api/bridge/file-folder/purchase/route.ts')
assert.ok(paystack.includes("rateSource!=='live'"),'Wallet Paystack cannot silently fallback')
assert.ok(bridge.includes("rate.source!=='live'"),'Public File Folder Paystack cannot silently fallback')
assert.ok(read('app/api/deposit/tron/route.ts').includes('CLIENT_TRON_FUNDING_ENABLED'),'Separate Client TRX wallet funding is administratively gated')
console.log('PASS: country-linked NGN checkout, international TRX purchases, separate gated Client TRX deposits, consent and live quotes')

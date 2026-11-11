const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const postcss=require('postcss')
const root=path.join(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const page=read('app/client/pro-verification/page.tsx')
const css=read('app/client/pro-verification/pro-verification.css')
const publicRoute=read('app/api/public/pro-file-number-verification/route.ts')
const activation=read('lib/pro-file-folder-activation.ts')
const official=read('lib/file-folder-world-presets.ts')
const parsed=ts.transpileModule(page,{fileName:'page.tsx',reportDiagnostics:true,
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}})
assert.deepEqual((parsed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error),[],
 'The public Pro verification page must remain syntactically valid TSX')
postcss.parse(css,{from:'app/client/pro-verification/pro-verification.css'})
assert.ok(official.includes("pro:{theme:'radiant-blue'"),'Pro theme must remain official Radiant Blue')
assert.ok(page.includes("import './pro-verification.css'")&&
 page.includes('id="weave-pro-verification"')&&
 page.includes('data-pro-file-folder-theme="radiant-blue"')&&
 css.includes('#weave-pro-verification.pv-shell')&&
 css.includes('.pv-folder'), 'Dedicated Pro Folder identity and company-first hero render on the verification route')
for(const text of ['System Switch · Bridge of Radiance','Company Staff Verification',
 'The Company of Time','Dream Lovely','One Pro standard. Your own business.',
 'Your own business world','Administrations + Forensics','pv-masthead',
 'pv-hero','pv-process','pv-side-panel','data-pro-stage="file-number"',
 'data-pro-stage="business-plan"','data-pro-stage="verification-status"'])
 assert.ok(page.includes(text),text+' must be present in the company verification presentation')
for(const text of ["action:'submit_plan'","action:'submit_payment'",
 "action:'send_registration_invite'",'await refresh(ticket)',"sessionStorage.setItem(SESSION_KEY,json.ticket)",
 'companyPosition','Monthly salary:','680 USDT','payment_required',
 'pending_forensics','paid_pending_account','signedName','termsAccepted:accepted',
 'operatingCountry','operatingRegion','operatingCity','contactAddress'])
 assert.ok(page.includes(text),'Existing verified Pro client flow must remain intact: '+text)
assert.ok(publicRoute.includes('submitProFileNumberPayment')&&
 activation.includes('getReceivingWallet')&&
 activation.includes('pro_activation_wallet_config'),'Official wallet is administered by existing verified server-side path')
assert.ok(!page.includes('TFT8e4EbMTvfQUGBHSz6LWTi4wokRBBz32')&&
 !css.includes('TFT8e4EbMTvfQUGBHSz6LWTi4wokRBBz32'),'No receiving wallet is hardcoded into the public UI')
assert.ok(css.includes('@media(max-width:700px)')&&
 css.includes('@media(prefers-reduced-motion:reduce)'), 'Mobile and reduced-motion accessible presentation')
console.log('Radiant Blue Pro Client company verification appearance, preserved API, gated payment, TSX and CSS checks passed')

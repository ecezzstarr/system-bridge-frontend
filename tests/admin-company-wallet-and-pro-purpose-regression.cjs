const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.join(__dirname,'..')
const read=source=>fs.readFileSync(path.join(root,source),'utf8')
const files=[
 'lib/pro-file-folder-activation.ts',
 'lib/pro-regional-manager-language.ts',
 'app/api/admin/company-active-wallet/route.ts',
 'app/(app)/admin/company-active-wallet/page.tsx',
 'app/(app)/admin/control-center/page.tsx',
 'lib/admin-workplace-catalog.ts',
 'app/api/admin/pro-activations/route.ts',
 'app/(app)/admin/pro-activations/page.tsx',
 'app/(app)/admin/pro-file-number-verifications/page.tsx',
 'app/(app)/admin/pro-regional-manager-applications/page.tsx',
 'app/client/pro-verification/page.tsx',
 'app/client/pro-activation/page.tsx',
 'app/(app)/weave/lifestyles/pro-regional-manager/page.tsx',
 'app/(app)/weave/lifestyles/pro-regional-manager/activation/page.tsx',
]
for(const file of files){
 const parsed=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal((parsed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,
  'Invalid TypeScript or TSX in '+file)
}
const endpoint=read('app/api/admin/company-active-wallet/route.ts')
const helper=read('lib/pro-file-folder-activation.ts')
const configUi=read('app/(app)/admin/company-active-wallet/page.tsx')
const legacyApi=read('app/api/admin/pro-activations/route.ts')
const legacyUi=read('app/(app)/admin/pro-activations/page.tsx')
const language=read('lib/pro-regional-manager-language.ts')
const publicUi=read('app/client/pro-verification/page.tsx')
const clientActivation=read('app/client/pro-activation/page.tsx')
const lifestyle=read('app/(app)/weave/lifestyles/pro-regional-manager/page.tsx')
const managerActivation=read('app/(app)/weave/lifestyles/pro-regional-manager/activation/page.tsx')
assert.ok(endpoint.includes("user?.role==='admin'")&&
 endpoint.includes("body.confirmation!=='SET COMPANY PRO WALLET'")&&
 endpoint.includes("body.controlVerified!==true")&&
 endpoint.includes("Object.prototype.hasOwnProperty.call(body,'expectedCurrentWallet')"),
 'Admin authenticated, explicit approval and fresh active-address check required for any wallet change')
assert.ok(endpoint.includes('WORLD_RULES.COMPANY_TRX_WALLET')&&
 endpoint.includes('configureProReceivingWallet(')&&
 endpoint.includes('getReceivingWallet()'),
 'Pro USDT administration uses shared server wallet while leaving independent TRX funding untouched')
assert.ok(helper.includes('pro_activation_wallet_change_audit')&&
 helper.includes('pg_advisory_xact_lock')&&
 helper.includes('FOR UPDATE')&&
 helper.includes('expectedCurrent!==current')&&
 helper.includes("await db.query('COMMIT')")&&
 helper.includes("db.query('ROLLBACK')"),
 'Wallet changes are serialized, conflict checked, audited and transactional')
assert.ok(configUi.includes('data-admin-company-active-wallet="true"')&&
 configUi.includes('Current active destination')&&
 configUi.includes('Separate company TRX funding rail')&&
 configUi.includes('Wallet change history')&&
 configUi.includes('controlVerified')&&
 configUi.includes('SET COMPANY PRO WALLET'),
 'Administrations has a usable explicit company active-wallet form, clear rail distinctions and history')
assert.ok(read('app/(app)/admin/control-center/page.tsx').includes('/admin/company-active-wallet')&&
 read('lib/admin-workplace-catalog.ts').includes('/admin/company-active-wallet')&&
 read('app/(app)/admin/pro-file-number-verifications/page.tsx').includes('/admin/company-active-wallet')&&
 read('app/(app)/admin/pro-regional-manager-activations/page.tsx').includes('/admin/company-active-wallet'),
 'Company wallet entry is linked from the Control Center, catalog and both Pro forensic queues')
assert.ok(legacyApi.includes("action==='configure_wallet'")&&
 legacyApi.includes('audited Administrations Company Active Wallet workspace')&&
 !legacyApi.includes('ON CONFLICT(id) DO UPDATE SET wallet_address=EXCLUDED.wallet_address'),
 'Previous Pro activation route cannot bypass new audited wallet configuration')
assert.ok(legacyUi.includes('/admin/company-active-wallet')&&
 !legacyUi.includes("act('configure_wallet'"),'Legacy Pro activation page links to central settings instead of changing wallets')
assert.ok(language.includes('Weave grows through the success')&&
 language.includes('real customers')&&language.includes('My success and the growth of Weave')&&
 language.includes('Employees, customers and accountability')&&
 language.includes('Employment, salary and commercial income')&&
 language.includes('Activation, identity and verified payments')&&
 language.includes('Truthful records and responsible operation'),
 'Professional agreement defines reciprocal company growth, owner operations and independent payment obligations')
assert.ok(publicUi.includes('PRO_MANAGER_AGREEMENT_SECTIONS.map')&&
 publicUi.includes('PRO_MANAGER_PLAN_QUESTIONS')&&
 publicUi.includes('data-pro-reciprocal-company-purpose="true"')&&
 publicUi.includes("action:'submit_payment'")&&publicUi.includes('requestRegistrationInvite'),
 'Client Pro File Number onboarding retains real signature, payment and account-registration flow with clear text')
assert.ok(clientActivation.includes('PRO_MANAGER_AGREEMENT_SECTIONS.map')&&
 clientActivation.includes('PRO_MANAGER_COMPANY_PURPOSE')&&
 clientActivation.includes('PRO_MANAGER_PLAN_QUESTIONS')&&
 clientActivation.includes("submit('sign_agreement')"),
 'Authenticated Client terms and business plan have the same Weave purpose and signing controls')
assert.ok(lifestyle.includes('PRO_MANAGER_PLAN_QUESTIONS')&&
 lifestyle.includes('PRO_MANAGER_COMPANY_PURPOSE')&&
 managerActivation.includes('PRO_MANAGER_AGREEMENT_SECTIONS.map')&&
 managerActivation.includes("action:'sign_agreement'"),
 'Agent and Bridger applications and signed Pro activation share the business-growth principle')
assert.ok(helper.includes('PRO_ACTIVATION_FEE_USDT = 680')&&
 !publicUi.includes('TFT8e4EbMTvfQUGBHSz6LWTi4wokRBBz32')&&
 !configUi.includes("action:'approve_payment'"),
 'Company wallet is not hardcoded into the public form, fee remains unchanged, and config never authorizes payments')
console.log('Company active-wallet controls, audit and Pro business/agreement language regressions passed')

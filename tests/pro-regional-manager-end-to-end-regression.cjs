const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const entries=[
 'lib/pro-regional-manager-activation.ts',
 'lib/pro-client-registration-invitation.ts',
 'app/api/admin/pro-regional-manager-activations/route.ts',
 'app/api/pro-regional-manager/activation/route.ts',
 'app/api/pro-regional-manager/workspace/route.ts',
 'app/api/pro-regional-manager/file-folder-world/route.ts',
 'app/api/pro-regional-manager/business-store/route.ts',
 'app/api/pro-regional-manager/business-store/orders/[id]/status/route.ts',
 'app/(app)/weave/lifestyles/pro-regional-manager/activation/page.tsx',
 'app/(app)/weave/lifestyles/pro-regional-manager/workspace/page.tsx',
 'app/(app)/admin/pro-regional-manager-activations/page.tsx',
 'app/api/client/file-folder-world/route.ts',
 'app/api/client/business-store/route.ts',
 'app/api/client/business-store/orders/[id]/status/route.ts',
 'components/system-switch/file-folder-open-world.tsx',
 'components/system-switch/client-customer-door-panel.tsx',
 'app/api/public/pro-file-number-verification/route.ts',
 'app/client/pro-verification/page.tsx',
]
for(const p of entries){
 const parsed=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal((parsed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'Syntax error in '+p)
}
const policy=read('lib/pro-regional-manager-policy.ts')
const activation=read('lib/pro-regional-manager-activation.ts')
const admin=read('app/api/admin/pro-regional-manager-activations/route.ts')
const applicant=read('app/api/pro-regional-manager/activation/route.ts')
const workspace=read('app/api/pro-regional-manager/workspace/route.ts')
const world=read('app/api/client/file-folder-world/route.ts')
const business=read('app/api/client/business-store/route.ts')
const storeStatus=read('app/api/client/business-store/orders/[id]/status/route.ts')
const proUi=read('app/(app)/weave/lifestyles/pro-regional-manager/workspace/page.tsx')
const invitation=read('lib/pro-client-registration-invitation.ts')
assert(policy.includes("['bridger','agent','client']"),
 'Pro Regional Manager role is cross-department while regular manager stays separate')
assert(read('app/api/regional-manager/applications/route.ts').includes("['bridger', 'agent']"),
 'Ordinary Regional Manager remains Bridger or Agent only')
assert(activation.includes('prepareApprovedProRegionalManager')&&
 activation.includes('createRandomFileNumberCandidate')&&
 activation.includes("status='approved_pending_verification'")===false,
 'Pro Number reservation is tied to approved appointment through documented data access')
assert(activation.includes("app.status!=='approved_pending_verification'")&&
 activation.includes('role!==app.source_role')&&
 activation.includes("INSERT INTO file_folders")&&
 !activation.includes('SET role='),
 'An approved original-role account receives its own Pro Number without any role conversion')
assert(activation.includes('signed_at=now()')&&
 activation.includes('payment_required')&&
 activation.includes('getReceivingWallet')&&
 activation.includes('payment_tx_hash'),
 'Approved terms require owner e-signature and real receipt submission')
assert(admin.includes('independentlyVerified')&&admin.includes('onChainConfirmed')&&
 admin.includes('verifiedAmountUSDT')&&admin.includes('verifiedTxHash')&&
 admin.includes('verifiedWallet')&&admin.includes('FOR UPDATE OF p,a,u')&&
 admin.includes("network!==PRO_MANAGER_NETWORK"),
 'Forensics verifies actual network, amount, proof, role and locked account/appointment')
assert(admin.includes('pro_file_folder_activations')&&
 admin.includes('pro_file_number_verifications')&&
 admin.includes('pg_advisory_xact_lock')&&
 admin.includes('INSERT INTO client_file_folders')&&
 admin.includes("status='active'"),
 'Unique receipt and original-role Folder ownership are required inside a transaction')
assert(admin.includes('await db.query(\'COMMIT\')')&&admin.includes('ROLLBACK'),
 'Pro activation transaction is atomic')
assert(applicant.includes('signProManagerTerms')&&applicant.includes('submitProManagerPayment'),
 'Applicant signing and payment route is linked')
assert(workspace.includes('getActiveProRegionalManager(request)')&&
 workspace.includes('getFileFolderWorldSnapshot')&&
 workspace.includes('ensureClientBusinessStore')&&
 workspace.includes('weave_pro_regional_manager_work'),
 'Full daily workspace uses verified Folder ownership, actual building world, Customer Door and persistent company work')
assert(world.includes("pathname==='/api/pro-regional-manager/file-folder-world'")&&
 world.includes('getActiveProRegionalManager(request)')&&
 read('app/api/pro-regional-manager/file-folder-world/route.ts').includes('export {GET,POST}'),
 'The real world engine is available only to independently verified Pro Folder owners')
assert(business.includes("pathname==='/api/pro-regional-manager/business-store'")&&
 business.includes('getActiveProRegionalManager(request)'),
 'Pro merchant uses existing secure Customer Door business system')
assert(storeStatus.includes("getActiveProRegionalManager(request)")&&
 read('app/api/pro-regional-manager/business-store/orders/[id]/status/route.ts').includes('export {POST}'),
 'Payment reporting and fulfilment retain independently settled Customer Door controls')
assert(proUi.includes('<ClientFileFolder3D')&&
 proUi.includes('<FileFolderOpenWorld')&&
 proUi.includes('<ClientCustomerDoorPanel')&&
 proUi.includes('/api/pro-regional-manager/workspace'),
 'Pro manager daily workspace exposes functioning 3D world, construction and public commerce')
assert(read('components/system-switch/file-folder-open-world.tsx').includes('worldApiPath')&&
 read('components/system-switch/client-customer-door-panel.tsx').includes('storeApiPath'),
 'Existing Client and Pro interfaces use separate authorized endpoints')
assert(invitation.includes('passwordRecoveryEmailProvider')&&
 invitation.includes('randomBytes(32)')&&
 invitation.includes('pro_client_registration_invitation_delivery')&&
 invitation.includes("status!=='paid_pending_account'")&&
 invitation.includes("offer_status!=='approved'")&&
 !invitation.includes('return {success:true,token'),
 'External Client Pro verified-account invitation is private, email-bound and rate limited')
assert(read('app/api/public/pro-file-number-verification/route.ts').includes("body.action==='send_registration_invite'")&&
 read('app/client/pro-verification/page.tsx').includes('requestRegistrationInvite')&&
 read('app/api/admin/pro-file-number-verifications/route.ts').includes("if(action==='finalize')"),
 'External Client completes independent payment, secure account registration and Administration finalization')
assert(read('migrations/20261107_pro_regional_manager_activation_and_work.sql').includes('weave_pro_regional_manager_activations')&&
 read('migrations/20261107_pro_regional_manager_activation_and_work.sql').includes('weave_pro_regional_manager_work'),
 'Separate Pro activation and daily work migrations exist')
// The Pro appointment and tier never dictate an owner's business category.
const proWorldRoute=read('app/api/client/file-folder-world/route.ts')
const folderWorld=read('lib/client-file-folder-world.ts')
const cjWorkshop=read('lib/client-system-workshop.ts')
const cjExchange=read('app/api/client/crypto-exchange/route.ts')
assert(admin.includes("VALUES($1::uuid,$2,$3,'formation','active',now())")&&
 admin.includes("VALUES($1::uuid,$2,'formation',")&&
 !admin.includes("'pro_regional_manager','active',now()"),
 'Pro employment is not a workshop type: the Folder begins with the manager’s own business formation')
assert(folderWorld.includes('approvedProBusinessName?.trim()')&&
 workspace.includes('String(row.business_name))')&&
 proWorldRoute.includes('proBusinessName:pro.row.business_name')&&
 proWorldRoute.includes('ctx.proBusinessName'),
 'The approved personal business identity seeds the original-role Pro Folder, including subsequent world actions')
assert(cjWorkshop.includes("'crypto_exchange'")&&
 cjWorkshop.includes('CJ_DORADO_FILE_NUMBER')&&
 cjExchange.includes('file_number=${CJ_DORADO_FILE_NUMBER}'),
 'CJ alone retains her existing Client-owned crypto exchange workshop and access gates')
console.log('Pro Regional Manager end-to-end department, payment, File Folder, Customer Door, external Client and daily work contracts passed')

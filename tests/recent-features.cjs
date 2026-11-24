Warning: truncated output (original token count: 52771)
Total output lines: 1768

const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
const root=path.resolve(__dirname,'..'),originalLoad=Module._load
let auth={user:{id:'admin-test',name:'Admin',role:'admin'},token:'test-token',isLoading:false,isInitialized:true},tab='workshops'
const Box=({children,...props})=>React.createElement('div',{},children)
Module._load=function(id,parent,isMain){
 if(id==='@/lib/auth-provider')return {useAuth:()=>auth}
 if(id==='next/navigation')return {useRouter:()=>({replace(){},push(){}}),useSearchParams:()=>new URLSearchParams({tab}),usePathname:()=>'/'}
 if(id==='next/link')return {__esModule:true,default:({children,href})=>React.createElement('a',{href},children)}
 if(id==='@/components/ecosystem-nav')return {EcosystemNav:()=>null}
 if(id.startsWith('@/components/ui/'))return new Proxy({},{get:(_,name)=>name==='__esModule'?true:Box})
 if(id.startsWith('@/'))id=path.join(root,id.slice(2))
 return originalLoad.call(this,id,parent,isMain)
}
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,file)
const {getRoleDistricts,getRolePlaces}=require('../lib/weave-role-districts.ts')
const roleHas=(role,href)=>getRolePlaces(role).some(place=>place.href===href)
const roleLabel=(role,label)=>getRolePlaces(role).some(place=>place.label===label)
const prospectMarketSource=fs.readFileSync(path.join(root,'app/(app)/weave/market/prospects/page.tsx'),'utf8')
const initialAuth=auth
auth=initialAuth
const Workshop=require('../app/(app)/authority/workshops/page.tsx').default
auth={...auth,isInitialized:false};assert.match(renderToStaticMarkup(React.createElement(Workshop)),/Loading Authority Workshop/)
auth={...auth,isInitialized:true};const html=renderToStaticMarkup(React.createElement(Workshop))
for(const label of ['Authority Workshop','Company Loop Workshop','Client Workshop Support','WEAVE Integrity Engine','Client Vault','Campaign Flame'])assert.ok(html.includes(label),label)
for(const route of ['/admin/loop-workshop','/admin/bridge-ai','/admin/dev-workshop','/admin/client-vault','/admin/campaign-flame']){assert.ok(html.includes(`href="${route}"`),route);assert.ok(fs.existsSync(path.join(root,'app/(app)',route,'page.tsx')),route+' exists')}
tab='ai-foundry';assert.match(renderToStaticMarkup(React.createElement(Workshop)),/Bridge AI Reports/)
auth={...auth,user:{id:'client-test',role:'client'}};assert.ok(!renderToStaticMarkup(React.createElement(Workshop)).includes('Company Loop Workshop'))
const World=require('../components/system-switch/client-workshop-world.tsx').default
for(const section of ['Business Store','International Payments']){const markup=renderToStaticMarkup(React.createElement(World,{client:{name:'Fixture',file_number:'TEST',business_name:'Fixture'},folder:{status:'active'},vault:{balance:0,currency:'TRX'},bridge:null,approvedAgents:[],workshop:{title:'Fixture',purpose:'Test',modules:[section],type:'formation'},bridgeAi:{name:'Bridge AI',purpose:'Test'},businessStore:null}));assert.ok(markup.includes(section));if(section==='International Payments')assert.ok(markup.includes('Show international payment option'))}
const {matchesVerifiedPayment}=require('../lib/payment-verification.ts')
const valid={status:'successful',tx_ref:'test-ref',currency:'USD',amount:20}
assert.equal(matchesVerifiedPayment(valid,'test-ref',20),true)
for(const change of [{currency:'NGN'},{amount:1},{status:'failed'},{tx_ref:'other'}])assert.equal(matchesVerifiedPayment({...valid,...change},'test-ref',20),false)
assert.equal(matchesVerifiedPayment(valid,'test-ref',NaN),false)
const {
  AGILITY_VARIANTS,
  AGILITY_RETAIL_UNIT_PRICE_NGN,
  AGILITY_PACKAGES_PER_BOX,
  AGILITY_RETAIL_BOX_VALUE_NGN,
  AGILITY_AGENT_BOX_PRICE_NGN,
  AGILITY_AGENT_UNIT_COST_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN,
  AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN,
  AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN,
  AGILITY_OPAY_ACCOUNT_NUMBER,
}=require('../lib/agility-catalog.ts')
assert.equal(AGILITY_RETAIL_UNIT_PRICE_NGN,4000)
assert.equal(AGILITY_PACKAGES_PER_BOX,10)
assert.equal(AGILITY_RETAIL_BOX_VALUE_NGN,40000)
assert.equal(AGILITY_AGENT_BOX_PRICE_NGN,30000)
assert.equal(AGILITY_AGENT_UNIT_COST_NGN,3000)
assert.equal(AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN,1000)
assert.equal(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,10000)
assert.equal(AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN,21000)
assert.equal(AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN,9000)
assert.equal(AGILITY_OPAY_ACCOUNT_NUMBER,'8136003459')
assert.ok(AGILITY_VARIANTS.length>=4,'Agility variants')
const {getAgilityTotals,getAgilityCompanyEconomics,isValidAgilityCompanyCost,nextAgilityAdminStage}=require('../lib/agility.ts')
assert.deepEqual(getAgilityTotals(2),{
 boxCount:2,
 packageCount:20,
 packagesPerBox:10,
 retailUnitPriceNgn:4000,
 retailBoxValueNgn:40000,
 agentBoxPriceNgn:30000,
 agentUnitCostNgn:3000,
 agentPayableNgn:60000,
 retailValueNgn:80000,
 agentExpectedGrossProfitNgn:20000,
})
assert.deepEqual(getAgilityCompanyEconomics(2,21000),{
 wholesaleRevenueNgn:60000,
 totalPlannedCostNgn:42000,
 grossProfitNgn:18000,
 grossProfitPerBoxNgn:9000,
})
assert.equal(getAgilityCompanyEconomics(1,31000).grossProfitNgn,-1000)
assert.equal(isValidAgilityCompanyCost(21000),true)
assert.equal(isValidAgilityCompanyCost(20000),false)
assert.equal(isValidAgilityCompanyCost(21001),false)
assert.equal(nextAgilityAdminStage('paid'),'heating')
assert.equal(nextAgilityAdminStage('heating'),'packed')
assert.equal(nextAgilityAdminStage('packed'),'boxed')
assert.equal(nextAgilityAdminStage('boxed'),'dispatched')
assert.equal(nextAgilityAdminStage('dispatched'),'delivered')
assert.equal(nextAgilityAdminStage('delivered'),null)
auth={...auth,user:{id:'agent-test',name:'Agent',role:'agent'},token:'test-token'}
const Agility=require('../app/(app)/agility/page.tsx').default
const agilityHtml=renderToStaticMarkup(React.createElement(Agility))
for(const label of ['AGILITY','Intelligence in Action','Agent Store','₦4,000','10 packages','₦30,000','₦10,000','₦9,000','Wholesaler','Retailer','OPay'])assert.ok(agilityHtml.includes(label),label)
for(const route of [
 '/api/agility/payment/opay/receipt/route.ts',
 '/api/admin/agility/payment/opay/verify/route.ts',
 '/api/agility/receive/route.ts',
 '/api/agility/sales/route.ts',
 '/api/admin/agility/stock/route.ts',
])assert.ok(fs.existsSync(path.join(root,'app',route)),route+' exists')
assert.ok(!fs.existsSync(path.join(root,'app/api/agility/payment/callback/route.ts')),'Agility Flutterwave callback removed')
assert.ok(!fs.existsSync(path.join(root,'app/api/agility/payment/webhook/route.ts')),'Agility Flutterwave webhook removed')
assert.ok(!fs.existsSync(path.join(root,'app/api/deposit/flutterwave/route.ts')),'Retired Flutterwave deposit initializer removed')
assert.ok(!fs.existsSync(path.join(root,'app/api/deposit/callback/route.ts')),'Retired Flutterwave verification callback removed')
assert.ok(!fs.existsSync(path.join(root,'lib/flutterwave.ts')),'Retired Flutterwave library removed')
assert.ok(!fs.existsSync(path.join(root,'app/api/deposit/opay/route.ts.failed-backup')),'Stale OPay failed-backup source stays out of the repository')
const packageManifestSource=fs.readFileSync(path.join(root,'package.json'),'utf8')
const packageLockSource=fs.readFileSync(path.join(root,'package-lock.json'),'utf8')
const eightRuntimeSource=fs.readFileSync(path.join(root,'lib/eight.ts'),'utf8')
assert.ok(!packageManifestSource.includes('flutterwave-node-v3')&&!packageLockSource.includes('node_modules/flutterwave-node-v3'),'Flutterwave dependency removed from manifest and lockfile')
assert.ok(!eightRuntimeSource.includes('services.flutterwave')&&!eightRuntimeSource.includes('api.flutterwave.com'),'Eight health check no longer depends on Flutterwave')
assert.ok(fs.existsSync(path.join(root,'gcp-migration/agility.sql')),'Agility production migration exists')
const fneSource=fs.readFileSync(path.join(root,'lib/fne.ts'),'utf8')
assert.match(fneSource,/randomInt/)
assert.match(fneSource,/100_000_000_000/)
assert.match(fneSource,/1_000_000_000_000/)
assert.ok(!fneSource.includes('let sequence = 1'),'FNE must not use sequential File Numbers')
assert.ok(!fneSource.includes('ORDER BY file_number DESC'),'FNE must not derive the next File Number from the previous one')
const clientLoginSource=fs.readFileSync(path.join(root,'app/client/login/page.tsx'),'utf8')
assert.ok(clientLoginSource.includes('WEAVE-583104927361'),'Client login shows random File Number format')
const healthRouteSource=fs.readFileSync(path.join(root,'app/api/health/route.ts'),'utf8')
const passwordRecoveryEngineSource=fs.readFileSync(path.join(root,'lib/password-recovery.ts'),'utf8')
const passwordRecoveryRequestSource=fs.readFileSync(path.join(root,'app/api/auth/forgot-password/route.ts'),'utf8')
const passwordRecoveryResetSource=fs.readFileSync(path.join(root,'app/api/auth/reset-password/route.ts'),'utf8')
const passwordRecoveryPageSource=fs.readFileSync(path.join(root,'app/(auth)/forgot-password/page.tsx'),'utf8')
const sharedLoginRecoverySource=fs.readFileSync(path.join(root,'app/(auth)/login/page.tsx'),'utf8')
const adminAccessRecoveryEngineSource=fs.readFileSync(path.join(root,'lib/admin-access-recovery.ts'),'utf8')
const adminAccessRecoveryApiSource=fs.readFileSync(path.join(root,'app/api/admin/access-recovery/route.ts'),'utf8')
const adminAccessRecoveryPageSource=fs.readFileSync(path.join(root,'app/(app)/admin/access-recovery/page.tsx'),'utf8')
assert.ok(passwordRecoveryRequestSource.includes('sendPasswordRecoveryCode'),'Forgot-password API sends an actual recovery message instead of only logging a link')
assert.ok(passwordRecoveryRequestSource.includes("role IN ('agent','bridger','client','admin')"),'Recovery request covers every WEAVE account role')
assert.ok(!passwordRecoveryRequestSource.includes('[PASSWORD RESET] Link')&&!passwordRecoveryRequestSource.includes('resetLink'),'Production recovery no longer pretends that a console-only reset link was emailed')
assert.ok(passwordRecoveryEngineSource.includes('RESEND_API_KEY')&&passwordRecoveryEngineSource.includes('sendResendFallback'),'Recovery delivery uses the existing WEAVE mail transport')
assert.ok(!passwordRecoveryEngineSource.includes('PASSWORD_RECOVERY_GMAIL_USER')&&!passwordRecoveryEngineSource.includes('PASSWORD_RECOVERY_GMAIL_APP_PASSWORD')&&!passwordRecoveryEngineSource.includes('sendGmailSmtp')&&!passwordRecoveryEngineSource.includes('smtp.gmail.com'),'Gmail SMTP and app-password recovery path stays removed')
const deployWeaveSource=fs.readFileSync(path.join(root,'scripts/deploy-weave.py'),'utf8')
assert.ok(passwordRecoveryEngineSource.includes('PASSWORD_RECOVERY_REPLY_TO'),'Recovery mail keeps the Administrations email as the reply address')
assert.ok(deployWeaveSource.includes("'PASSWORD_RECOVERY_EMAIL_FROM':'WEAVE Access <access@weavingsystem.online>'")&&deployWeaveSource.includes("'PASSWORD_RECOVERY_REPLY_TO':'ecezzstarr@gmail.com'"),'Cloud Run deployment preserves the WEAVE recovery sender and reply identity')
assert.ok(!deployWeaveSource.includes('weave-gmail-app-password')&&!deployWeaveSource.includes('getpass.getpass')&&!deployWeaveSource.includes("'PASSWORD_RECOVERY_GMAIL_USER':'")&&!deployWeaveSource.includes("'PASSWORD_RECOVERY_GMAIL_FROM_NAME':'"),'Deployment has no Gmail Secret Manager or app-password dependency')
assert.ok(deployWeaveSource.includes("env[:]=[e for e in env if e.get('name') not in ['PASSWORD_RECOVERY_GMAIL_USER','PASSWORD_RECOVERY_GMAIL_APP_PASSWORD','PASSWORD_RECOVERY_GMAIL_FROM_NAME']]"),'Candidate strips stale Gmail recovery variables inherited from older revisions')
assert.ok(healthRouteSource.includes('WEAVE_RELEASE_SHA')&&healthRouteSource.includes('passwordRecoveryEmailProvider'),'Health reports the served Git release and active recovery provider')
assert.ok(deployWeaveSource.includes("'WEAVE_RELEASE_SHA':sha"),'Candidate receives the exact canonical Git SHA as runtime identity')
assert.ok(deployWeaveSource.includes("health.get('releaseSha')==expected_sha")&&deployWeaveSource.includes("health.get('passwordRecoveryDesk') is True"),'Candidate and live smoke require exact release identity and active recovery desk')
assert.ok(deployWeaveSource.includes("smoke(production_url,sha)")&&deployWeaveSource.includes("service['status']['url']")&&deployWeaveSource.includes("rollback_revision")&&deployWeaveSource.includes("'update-traffic'"),'Promotion verifies the public domain or explicit trusted Cloud Run service address and retains automatic rollback')
assert.ok(deployWeaveSource.includes("url+'/api/auth/recovery-desk'")&&deployWeaveSource.includes("recovery_smoke(url)")&&deployWeaveSource.includes("status_request"),'Candidate and promotion exercise recovery desk request and status without notifying a real user')
assert.ok(deployWeaveSource.includes("print('LIVE VERIFIED',rev,sha,'at',production_url)"),'Deployment only declares verified after production checks finish and identifies the verified address')
assert.ok(passwordRecoveryEngineSource.includes('PASSWORD_RECOVERY_CODE_TTL_MINUTES = 15')&&passwordRecoveryEngineSource.includes('PASSWORD_RECOVERY_MAX_ATTEMPTS = 5'),'Recovery codes are short-lived and attempt-limited')
assert.ok(passwordRecoveryResetSource.includes('timingSafeEqual')&&passwordRecoveryResetSource.includes('c.delivered_at IS NOT NULL')&&passwordRecoveryResetSource.includes('DELETE FROM sessions WHERE user_id'),'Code verification accepts only delivered challenges, is timing-safe, and closes existing sessions')
assert.ok(passwordRecoveryPageSource.includes('Request recovery passcode')&&passwordRecoveryPageSource.includes('Use Administrations recovery code')&&passwordRecoveryPageSource.includes('autoComplete="one-time-code"'),'Recovery entrance requests Administrations approval and accepts one-time access')
assert.ok(clientLoginSource.includes('/forgot-password?portal=client'),'Client File Number login exposes password recovery')
assert.ok(sharedLoginRecoverySource.includes("/forgot-password?portal=admin"),'Administrations login preserves its recovery entrance')
assert.ok(fs.existsSync(path.join(root,'migrations/20260930_password_recovery.sql')),'Password recovery schema migration exists')
assert.ok(adminAccessRecoveryEngineSource.includes('ADMIN_RECOVERY_TTL_MINUTES=15')&&adminAccessRecoveryEngineSource.includes('ADMIN_RECOVERY_MAX_ATTEMPTS=5'),'Administrations recovery grants are short-lived and attempt-limited')
assert.ok(adminAccessRecoveryEngineSource.includes('randomInt(100000,1000000)')&&adminAccessRecoveryEngineSource.includes('code_hash'),'Administrations issues a six-digit code but stores only its hash')
assert.ok(adminAccessRecoveryEngineSource.includes("target.role==='admin'")&&adminAccessRecoveryEngineSource.includes("target.id)!==String(input.adminId"),'One Administrator cannot issue recovery access for another Administrator')
assert.ok(adminAccessRecoveryApiSource.includes("admin.role!=='admin'")&&adminAccessRecoveryApiSource.includes("action==='issue'")&&adminAccessRecoveryApiSource.includes("action==='revoke'"),'Only Administrations can issue or revoke Access Recovery grants')
assert.ok(adminAccessRecoveryPageSource.includes('Access Recovery Desk')&&adminAccessRecoveryPageSource.includes('Identity verification record')&&adminAccessRecoveryPageSource.includes('Copy code'),'Administrations has a visible audited recovery operating place')
assert.ok(passwordRecoveryResetSource.includes('admin_access_recovery_grants')&&passwordRecoveryResetSource.includes("authority=adminValid?'administration':'email'"),'Password reset accepts an Administrations grant without replacing the normal email path')
assert.ok(passwordRecoveryResetSource.includes("UPDATE admin_access_recovery_grants")&&passwordRecoveryResetSource.includes('DELETE FROM sessions WHERE user_id'),'Successful recovery consumes grants and closes all previous WEAVE sessions')
assert.ok(fs.existsSync(path.join(root,'migrations/20261002_admin_access_recovery.sql')),'Administrations access recovery schema migration exists')
const opayApiSource=fs.readFileSync(path.join(root,'app/api/deposit/opay/route.ts'),'utf8')
assert.match(opayApiSource,/Manual OPay wallet funding is retired/)
assert.match(opayApiSource,/status:\s*410/)
assert.match(opayApiSource,/\/api\/deposit\/paystack/)
const paystackApiSource=fs.readFileSync(path.join(root,'app/api/deposit/paystack/route.ts'),'utf8')
assert.match(paystackApiSource,/RETURNING id/)
assert.match(paystackApiSource,/inserted\.rows\[0\]\.id/)
assert.match(paystackApiSource,/\['admin','agent','bridger','client'\]/)
assert.match(paystackApiSource,/getPaystackConfig/)
const agilityLoginAdSource=fs.readFileSync(path.join(root,'components/agility-agent-login-ad.tsx'),'utf8')
const weaveAssistantSource=fs.readFileSync(path.join(root,'components/weave-assistant.tsx'),'utf8')
const agilityTutorialSource=fs.readFileSync(path.join(root,'lib/agility-tutorial.ts'),'utf8')
const riverSource=fs.readFileSync(path.join(root,'lib/river-assistant.ts'),'utf8')
const chatRouteSource=fs.readFileSync(path.join(root,'app/api/chat/route.ts'),'utf8')
for(const label of ['How Agility works','Choose how you want to sell','Create the order and pay with OPay','Confirm that you received the stock','Sell and record the movement'])assert.ok(agilityTutorialSource.includes(label),label+' tutorial')
assert.ok(weaveAssistantSource.includes("tab === 'guide'"),'WEAVE Assistant guide tab')
assert.ok(weaveAssistantSource.includes('Ask River what to do next'),'WEAVE Assistant River handoff')
assert.ok(riverSource.includes('Agility Agent Store facts'),'River Agility grounding')
assert.ok(chatRouteSource.includes("return 'Agility Agent Store'"),'River Agility page context')
const loginSource=fs.readFileSync(path.join(root,'app/(auth)/login/page.tsx'),'utf8')
const agentDashboardSource=fs.readFileSync(path.join(root,'app/(app)/agent/dashboard/page.tsx'),'utf8')
for(const label of ['AGILITY','For Wholesalers','For Retailers','₦10,000','₦20,000','Buy Agility'])assert.ok(agilityLoginAdSource.includes(label),label+' login ad')
assert.ok(!loginSource.includes('AGILITY_AGENT_LOGIN_AD_KEY'), 'Agent login does not queue an Agility advertisement')
assert.ok(!agentDashboardSource.includes('AgilityAgentLoginAd'), 'Agent work opens without the Agility arrival advertisement')
const agilityStockSource=fs.readFileSync(path.join(root,'app/api/agility/stock/route.ts'),'utf8')
const agilitySalesSource=fs.readFileSync(path.join(root,'app/api/agility/sales/route.ts'),'utf8')
assert.match(agilityStockSource,/distributionMode/)
assert.ok(agilityStockSource.includes('deliveryAddress'))
assert.ok(agilityStockSource.includes('deliveryPhone'))
assert.match(agilityStockSource,/wholesaler/)
assert.match(agilityStockSource,/retailer/)
assert.match(agilitySalesSource,/wholesale_box/)
assert.match(agilitySalesSource,/retail_package/)
assert.ok(agilitySalesSource.includes('order.retail_unit_price_ngn'))
assert.ok(agilitySalesSource.includes('order.retail_box_value_ngn'))
assert.ok(agilitySalesSource.includes('order.agent_unit_cost_ngn'))
const departmentEntrySource=fs.readFileSync(path.join(root,'components/department-entry-ticket-gate.tsx'),'utf8')
const departmentTicketLibSource=fs.readFileSync(path.join(root,'lib/department-entry-tickets.ts'),'utf8')
const departmentRegisterSource=fs.readFileSync(path.join(root,'app/(auth)/register/page.tsx'),'utf8')
const departmentAdminPanelSource=fs.readFileSync(path.join(root,'components/admin/department-entry-tickets-panel.tsx'),'utf8')
assert.ok(departmentEntrySource.includes('Open Entry Ticket') && departmentEntrySource.includes('void startRequiredMusic().catch') && !departmentEntrySource.includes('if (!musicStarted)'), 'Department Entry uses the shared DJ without locking Agent or Bridger loan registration when audio is blocked')
assert.ok(departmentEntrySource.includes("window.dispatchEvent(new CustomEvent('weave:dj-request-play'")&&departmentEntrySource.includes("'weave:dj-playback-result'"),'Department Entry starts the one persistent WEAVE DJ player through the global sound bus')
assert.ok(!departmentEntrySource.includes('new Audio(')&&!departmentEntrySource.includes('AudioContextCtor')&&!departmentEntrySource.includes('startFallbackMusic'),'Department Entry never mounts a private song or synthetic fallback that breaks sound continuity')
assert.ok(departmentEntrySource.includes('ticket.priceUsd.toFixed(2)'),'Department Entry ticket price shown')
assert.ok(departmentEntrySource.includes('WEAVE Payment Center · Paystack'),'Department Entry Paystack center shown')
assert.ok(departmentEntrySource.includes('/api/department-entry/ticket/paystack'),'Department Entry starts Paystack checkout')
assert.ok(!departmentEntrySource.includes('Company OPay Account')&&!departmentEntrySource.includes('form.paymentReference'),'Department Entry has no legacy OPay/manual-reference UI')
assert.ok(departmentEntrySource.includes('Use Code & Continue Registration'),'Departmental code release flow shown')
assert.ok(departmentTicketLibSource.includes('departmentEntryTicketPrice(department)'),'Department Entry uses role-specific USD prices')
assert.ok(departmentTicketLibSource.includes('priceUsd * rateNgnPerUsd * 100'),'Department Entry locks the live USD quote in naira')
assert.ok(departmentTicketLibSource.includes("'department_entry'"),'Administrations notifications created for Department Entry')
assert.ok(departmentTicketLibSource.includes('issueDepartmentalCode'),'Code is issued from verified ticket flow')
assert.ok(departmentRegisterSource.includes('DepartmentEntryTicketGate'),'Agent/Bridger registration uses paid ticket gate')
assert.ok(!departmentRegisterSource.includes('Chat Administrations'),'Old manual visitor code-request gate removed')
assert.ok(departmentAdminPanelSource.includes('Awaiting Verification'),'Administrations can verify entry payments')
for(const route of [
 'app/api/department-entry/ticket/route.ts',
 'app/api/department-entry/music/route.ts',
 'app/api/admin/department-entry/tickets/route.ts',
 'migrations/20260924_department_entry_tickets.sql',
])assert.ok(fs.existsSync(path.join(root,route)),route+' exists')
const depositNotificationSource=fs.readFileSync(path.join(root,'lib/deposit-notifications.ts'),'utf8')
const opayDepositSource=fs.readFileSync(path.join(root,'app/api/deposit/opay/route.ts'),'utf8')
const opayVerifySource=fs.readFileSync(path.join(root,'app/api/admin/deposit/opay/verify/route.ts'),'utf8')
const tronDepositSource=fs.readFileSync(path.join(root,'app/api/deposit/tron/route.ts'),'utf8')
const tronVerifySource=fs.readFileSync(path.join(root,'app/api/admin/deposit/tron/verify/route.ts'),'utf8')
const bridgeDepositSource=fs.readFileSync(path.join(root,'app/api/bridge/[code]/deposit/route.ts'),'utf8')
const bridgeVerifySource=fs.readFileSync(path.join(root,'app/api/admin/bridge-deposits/verify/route.ts'),'utf8')
const notificationsApiSource=fs.readFileSync(path.join(root,'app/api/notifications/route.ts'),'utf8')
const notificationBellSource=fs.readFileSync(path.join(root,'components/notification-bell.tsx'),'utf8')
const adminDashboardNotificationSource=fs.readFileSync(path.join(root,'components/admin/administration-control-terminal.tsx'),'utf8')
assert.ok(depositNotificationSource.includes('deposit_pending'),'Deposit submissions create Admin notifications')
assert.ok(depositNotificationSource.includes('deposit_approved'),'Approved deposits notify originating users')
assert.ok(depositNotificationSource.includes('deposit_rejected'),'Rejected deposits notify originating users')
assert.ok(opayDepositSource.includes("status: 410")&&opayDepositSource.includes('/api/deposit/paystack'),'Manual OPay wallet deposit initialization is retired')
const paystackDepositSource=fs.readFileSync(path.join(root,'app/api/deposit/paystack/route.ts'),'utf8')
assert.ok(paystackDepositSource.includes('notifyDepositSubmitted'),'Paystack deposits notify Administrations')
assert.ok(opayVerifySource.includes('manual_deposit_approval_retired')&&!opayVerifySource.includes('UPDATE wallets'),'Retired manual OPay approvals cannot credit Paystack wallets')
assert.ok(tronDepositSource.includes("status: 410")&&tronDepositSource.includes('/api/deposit/paystack'),'Manual Client TRX wallet deposit submission is retired')
assert.ok(tronDepositSource.includes("method IN ('tron','paystack')"),'Client history preserves old TRX and new Paystack deposit records')
assert.ok(tronVerifySource.includes('notifyDepositDecision'),'TRX decisions notify Client')
assert.ok(bridgeDepositSource.includes('notifyDepositSubmitted'),'Bridge File Folder payments notify Administrations')
assert.ok(bridgeVerifySource.includes('notifyUser'),'Bridge payment decisions notify the responsible Bridger')
const bridgePendingSource=fs.readFileSync(path.join(root,'app/api/admin/bridge-deposits/pending/route.ts'),'utf8')
assert.ok(bridgePendingSource.includes('file_folder_purchases'),'Administrations sees direct Bridge of Radiance File Folder purchases in the verification queue')
assert.ok(bridgeVerifySource.includes('verifyBridgeRadiancePurchase'),'Administrations can verify direct Bridge of Radiance prospect purchases')
assert.ok(bridgeVerifySource.includes('generateFileNumber(null'),'Administrations verification is the authority that issues the direct Bridge of Radiance File Number')
assert.ok(bridgeVerifySource.includes("crossing_state='file_number_issued'"),'Administrations verification advances the originating Bridge crossing only after File Number issuance')
assert.ok(bridgeVerifySource.includes('registerUrl'),'Verification returns the Client registration crossing')
assert.ok(notificationsApiSource.includes('getAuthUser'),'Notification inbox requires authenticated identity')
assert.ok(!notificationsApiSource.includes("searchParams.get('userId')"),'Notification inbox cannot select another user by query parameter')
assert.ok(notificationBellSource.includes("visiblePoll(fetchNotifications, 5000)"),'Notification bell polls promptly while visible without overlapping requests')
assert.ok(paystackApiSource.includes("adminLink:'/admin/control-center#deposits'"),'Paystack deposit notification deep-links to the canonical Control Center deposit station')
assert.ok(tronDepositSource.includes("status: 410")&&tronDepositSource.includes('/api/deposit/paystack'),'Retired TRX deposit endpoint directs users to the current Paystack funding rail')
assert.ok(bridgeDepositSource.includes('/admin/control-center#bridge'),'Bridge notification deep-links to the canonical Control Center Bridge deposit station')
assert.ok(adminDashboardNotificationSource.includes("hash === '#deposits'"),'Administrations Control Center handles Paystack notification hash')
assert.ok(adminDashboardNotificationSource.includes("hash === '#tron'")&&adminDashboardNotificationSource.includes("window.location.replace('/admin/client-deposits')"),'Legacy TRX Control Center hash resolves to the dedicated Client Deposits place')
assert.ok(adminDashboardNotificationSource.includes("hash === '#bridge'"),'Administrations Control Center handles Bridge notification hash')
const enterpriseDreamLibSource=fs.readFileSync(path.join(root,'lib/enterprise-dream.ts'),'utf8')
const enterpriseClientSource=fs.readFileSync(path.join(root,'app/api/client/enterprise/route.ts'),'utf8')
const enterpriseAdminSource=fs.readFileSync(path.join(root,'app/api/admin/enterprise/route.ts'),'utf8')
const enterpriseSystemSwitchSource=fs.readFileSync(path.join(root,'app/api/client/system-switch/route.ts'),'utf8')
const enterprisePanelSource=fs.readFileSync(path.join(root,'components/system-switch/enterprise-dream-panel.tsx'),'utf8')
assert.ok(enterpriseDreamLibSource.includes('enterprise_applications'),'Enterprise Dream application schema exists')
assert.ok(enterpriseDreamLibSource.includes('enterprise_legions'),'Enterprise Legion schema exists')
assert.ok(enterpriseClientSource.includes("['lord', 'lady']"),'Client may request only Lord or Lady elevation')
assert.ok(enterpriseClientSource.includes('sustainabilityPlan'),'Elevation requires a life-sustainability plan')
assert.ok(enterpriseClientSource.includes('notifyAdministrators'),'Administrations is notified of enterprise-plan submission')
assert.ok(enterpriseAdminSource.includes("workshop_type='enterprise_dream'"),'Approval changes the File Folder workshop to Enterprise Dream')
assert.ok(enterpriseAdminSource.includes('notifyUser'),'Client is notified after Administrations decision')
assert.ok(enterpriseSystemSwitchSource.includes('getEnterpriseDream'),'Client System Switch returns Enterprise Dream state')
assert.ok(enterpriseSystemSwitchSource.includes("'Legions'"),'Approved Enterprise Dream exposes Legions module')
assert.ok(enterprisePanelSource.includes('Add Legion'),'Approved Lord/Lady can add Legion participation')
assert.ok(roleHas('admin','/admin/enterprise-dream'),'Administrations can reach Enterprise Dream authority')
for(const file of [
 'app/(app)/admin/enterprise-dream/page.tsx',
 'app/api/client/enterprise/legions/route.ts',
 'migrations/20260923_enterprise_dream_workshop.sql',
])assert.ok(fs.existsSync(path.join(root,file)),file+' exists')
const djEngineSource=fs.readFileSync(path.join(root,'lib/dj-broadcast.ts'),'utf8')
const djPublicSource=fs.readFileSync(path.join(root,'app/api/dj/broadcast/route.ts'),'utf8')
const djAdminSource=fs.readFileSync(path.join(root,'app/api/admin/dj/broadcast/route.ts'),'utf8')
const djPlayerSource=fs.readFileSync(path.join(root,'components/dj-broadcast-player.tsx'),'utf8')
const homePageSource=fs.readFileSync(path.join(root,'app/company-overview/page.tsx'),'utf8')
assert.match(fs.readFileSync(path.join(root,'app/page.tsx'),'utf8'),/return <CompanyGrounds\s*\/>/,'Only Company Grounds renders at the root, with old services on their own page')
const djWorkshopSource=fs.readFileSync(path.join(root,'app/(app)/admin/dj-workshop/page.tsx'),'utf8')
const djTracksSource=fs.readFileSync(path.join(root,'app/api/admin/dj/tracks/route.ts'),'utf8')
const djPlaylistsSource=fs.readFileSync(path.join(root,'app/api/admin/dj/playlists/route.ts'),'utf8')
const departmentMusicSource=fs.readFileSync(path.join(root,'app/api/department-entry/music/route.ts'),'utf8')
assert.ok(djEngineSource.includes('CREATE TABLE IF NOT EXISTS dj_broadcast_state'),'DJ broadcast state self-bootstraps')
assert.ok(djEngineSource.includes("VALUES (1, false)"),'DJ singleton broadcast row is guaranteed')
assert.ok(djEngineSource.includes('getFlameEvent'),'DJ uses the live Flame Event store')
assert.ok(djEngineSource.includes('manual_stop_event_key'),'DJ remembers an intentional Admin event stop')
assert.ok(djEngineSource.includes('elapsedSeconds % cycleDuration'),'DJ playlist timing catches up after inactivity')
assert.ok(djPublicSource.includes("['admin', 'agent', 'bridger', 'client']"),'All four WEAVE roles can receive live DJ sound')
assert.ok(!djPublicSource.includes('FLAME_EVENT_START'),'DJ public route no longer hard-codes Flame Event dates')
assert.ok(djAdminSource.includes("action === 'stop'"),'Admin can stop the live broadcast')
assert.ok(djAdminSource.includes('manual_stop_event_key'),'Admin stop suppresses event auto-restart')
assert.ok(djPlayerSource.includes('<audio'),'Live audio engine is mounted by the global player')
assert.ok(djPlayerSource.includes("const publicSoundEligible = pathname === '/register'")&&djPlayerSource.includes("'weave:dj-request-play'"),'Global DJ remains mounted and controllable during staff visitor Department Entry')
assert.ok(djPublicSource.includes('const signedInRole = Boolean')&&djPublicSource.includes('signedInRole ? state.announcement_text : null'),'Public registration may read the live track while Administrations announcements remain signed-in only')
assert.ok(!djPlayerSource.includes("user?.role !== 'client'"),'Clients are not excluded from ordinary live DJ broadcasts')
assert.ok(djPlayerSource.includes('visiblePoll(() => syncBroadcast(), 6000)'),'Live player synchronizes serially on the reduced six-second cadence only while visible')
assert.ok(djPlayerSource.includes('startHarmonyAudience'),'DJ music carries the Harmony audience layer')
assert.ok(djPlayerSource.includes("trackTypeRef.current !== 'music'"),'Harmony audience stays off voice and announcement tracks')
assert.ok(djPlayerSource.includes('createBiquadFilter'),'Harmony audience uses a shaped crowd ambience rather than a second song')
assert.ok(djPlayerSource.includes("visiblePoll"),'Live player polling pauses while hidden and resumes without overlap')
assert.ok(djPlayerSource.includes("USER_PAUSED_KEY"),'DJ player persists the user pause preference')
assert.ok(djPlayerSource.includes("handlePause"),'DJ player exposes personal pause control')
assert.ok(djPlayerSource.includes("handleResume"),'DJ player exposes personal resume control')
assert.ok(djPlayerSource.includes("userPausedRef.current"),'Broadcast synchronization respects personal pause state')
assert.ok(djPlayerSource.includes('audio.muted = true'),'Personal pause also mutes the media element')
assert.ok(djPlayerSource.includes("window.addEventListener('storage'"),'Personal pause propagates across WEAVE tabs on the same device')
assert.ok(djPlayerSource.includes('onPlaying'),'Unexpected media restart is guarded while personally paused')
assert.ok(djPlayerSource.includes('applyPersonalPause'),'Pause enforcement is centralized and reused')
const weaveLiveFlameSource=fs.readFileSync(path.join(root,'components/world/weave-live-flame-field.tsx'),'utf8')
const weaveDashboardWorldSource=fs.readFileSync(path.join(root,'components/world/weave-dashboard-world.tsx'),'utf8')
assert.ok(weaveLiveFlameSource.includes('<InteractionMotionField'),'WEAVE viewport is generated by the live Interaction Motion field')
assert.ok(weaveLiveFlameSource.includes("window.addEventListener('weave:system-motion'")&&weaveLiveFlameSource.includes("window.addEventListener('pointerdown'"),'Live flame responds to system motion and human presence instead of a static wallpaper')
assert.ok(weaveDashboardWorldSource.includes('backdrop-blur-xl')&&weaveDashboardWorldSource.includes('data-world-theme-source="shared-live-flame"'),'Compact dashboard Home keeps mirror controls over the one shared moving Flame world')
assert.ok(djWorkshopSource.includes('visiblePoll(() => refreshBroadcast(), 4000)'),'DJ Workshop live status refreshes serially while visible')
assert.ok(djWorkshopSource.includes('Duration unknown · manual skip'),'DJ Workshop warns about unschedulable tracks')
assert.ok(djTracksSource.includes('ensureDjSchema'),'Track library bootstraps the DJ schema')
assert.ok(djPlaylistsSource.includes('ensureDjSchema'),'Playlist library bootstraps the DJ schema')
assert.ok(departmentMusicSource.includes('ensureDjSchema'),'Department Entry sound shares the DJ library safely')
assert.ok(fs.existsSync(path.join(root,'migrations/20260924_dj_live_broadcast.sql')),'DJ live migration exists')
assert.ok(!homePageSource.includes('<WeaveWorldEnvironment'),'Public homepage does not mount a duplicate WEAVE world')
assert.ok(homePageSource.includes('Interaction in Motion presents')&&homePageSource.includes('The Company of Time'),'Homepage uses founder-approved Company of Time introduction')
const weaveSystemMapSource=fs.readFileSync(path.join(root,'lib/weave-system-map.ts'),'utf8')
assert.ok(homePageSource.includes('One company. Many people. Work moving through time.')&&homePageSource.includes('System Switch — Bridge of Radiance'),'Homepage introduces the four-department institution using its approved wording')
assert.ok(weaveSystemMapSource.includes('An interactional company where human participation can become organized work, value, systems and opportunity.'),'Canonical system map identifies WEAVE as an interactional company')
assert.ok(homePageSource.includes("title: 'Services'") && homePageSource.includes("title: 'Instruments'") && homePageSource.includes("title: 'Systems'"),'Homepage explains WEAVE services, instruments and systems')
assert.ok(homePageSource.includes('Client Access Point'),'Homepage contains a dedicated Client access surface')
assert.ok(homePageSource.includes('href="/client/login"'),'Homepage directs existing Clients to the Client Portal')
const clientGuardSource=fs.readFileSync(path.join(root,'components/client/client-route-guard.tsx'),'utf8')
const clientRegisterSource2=fs.readFileSync(path.join(root,'app/client/register/page.tsx'),'utf8')
const walletBalanceSource=fs.readFileSync(path.join(root,'app/api/wallet/balance/route.ts'),'utf8')
const clientBridgerSource=fs.readFileSync(path.join(root,'app/api/client/bridger/route.ts'),'utf8')
assert.ok(clientGuardSource.includes("router.replace('/client/login')"),'Protected Client routes send unauthenticated visitors to Client login')
assert.ok(walletBalanceSource.includes('getAuthUser'),'Wallet balance derives identity from authenticated session')
assert.ok(clientBridgerSource.includes('getAuthUser'),'Client Bridger lookup derives identity from authenticated session')
assert.ok(!fs.existsSync(path.join(root,'components/client/client-terminal-legacy.tsx')),'Retired Client terminal surface is removed')
assert.ok(clientRegisterSource2.includes('WEAVE-583104927361'),'Client registration shows random File Number format')
const dailyProspectRouteSource=fs.readFileSync(path.join(root,'app/api/bridger/daily-prospect/route.ts'),'utf8')
const dailyProspectEngineSource=fs.readFileSync(path.join(root,'lib/bridger-daily-prospect-engine.ts'),'utf8')
const fulfillmentAgentSource=fs.readFileSync(path.join(root,'lib/fulfillment-agent.ts'),'utf8')
const integrityEngineSource=fs.readFileSync(path.join(root,'lib/weave-integrity-engine.ts'),'utf8')
const integrityApiSource=fs.readFileSync(path.join(root,'app/api/admin/integrity-engine/route.ts'),'utf8')
const devWorkshopSource=fs.readFileSync(path.join(root,'app/(app)/admin/dev-workshop/page.tsx'),'utf8')
const adminWorkshopSource=fs.readFileSync(path.join(root,'app/(app)/admin/workshop/page.tsx'),'utf8')
const dailyProspectUiSource=fs.readFileSync(path.join(root,'components/bridger/daily-prospect-claim.tsx'),'utf8')
const bridgerDashboardSource=fs.readFileSync(path.join(root,'app/(app)/bridger/dashboard/page.tsx'),'utf8')
assert.ok(dailyProspectRouteSource.includes('market_prospect_contacts'),'Daily claim uses the active Prospect Engine contacts')
assert.ok(dailyProspectRouteSource.includes('market_prospect_outreach'),'Daily claim creates the normal Bridger outreach record')
assert.ok(dailyProspectRouteSource.includes('FOR UPDATE SKIP LOCKED'),'Daily claim prevents two Bridgers from receiving the same Prospect')
assert.ok(dailyProspectRouteSource.includes("status = 'contacted'"),'Claimed Prospect is removed from free marketplace inventory')
assert.ok(dailyProspectRouteSource.includes("'daily_free_claim'"),'Daily free claims are audited')
assert.ok(dailyProspectRouteSource.includes('repairDailyProspectState'),'Daily claim repairs provably inconsistent inventory before failing')
assert.ok(dailyProspectRouteSource.includes('reserveTarget:1'),'Daily claim restores one claimable Prospect only when a new claim is needed')
assert.ok(dailyProspectRouteSource.includes("gate:'daily_pool_empty'"),'Daily claim returns a specific reserve diagnostic instead of a generic broken-button failure')
assert.ok(dailyProspectEngineSource.includes('DAILY_PROSPECT_RESERVE = 3'),'Daily Prospect Engine maintains a dedicated free reserve')
assert.ok(dailyProspectEngineSource.includes("p.status='published'")&&dailyProspectEngineSource.includes('p.purchased_by IS NULL'),'Reserve repair may rebalance only unsold published Prospect packages')
assert.ok(dailyProspectEngineSource.includes('FOR UPDATE SKIP LOCKED'),'Reserve repair locks package/contact inventory against purchase races')
assert.ok(dailyProspectEngineSource.includes('adjustedPrice'),'Rebalancing a free Prospect proportionally corrects the remaining unsold package price')
assert.ok(fulfillmentAgentSource.includes('DAILY_PROSPECT_RESERVE'),'Marketplace fulfillment knows about the free Daily Prospect reserve')
assert.ok(fulfillmentAgentSource.includes('availableCount < limit + DAILY_PROSPECT_RESERVE'),'Marketplace packaging cannot consume the protected daily reserve')
assert.ok(integrityEngineSource.includes('runWeaveIntegrityEngine'),'WEAVE has a reusable business-state Integrity Engine')
assert.ok(integrityEngineSource.includes('daily_prospect_reserve')&&integrityEngineSource.includes('number_prices')&&integrityEngineSource.includes('bridger_wallets'),'Integrity Engine covers Prospect, Number Bay and Bridger prerequisites')
assert.ok(integrityEngineSource.includes('repairDailyProspectState'),'Integrity safe repair reuses the canonical Daily Prospect repair engine')
assert.ok(integrityApiSource.includes("user.role!=='admin'"),'Only Administrations can run WEAVE Integrity repairs')
assert.ok(integrityApiSource.includes("action==='scan'?'scan':'repair'"),'Integrity API separates scan from safe mutation')
assert.ok(integrityApiSource.includes('INTEGRITY_API_TIMEOUT_MS=18000')&&integrityApiSource.includes('runWithDeadline'),'Integrity API has a bounded live-state deadline')
assert.ok(integrityEngineSource.includes('integrityBootstrapPromise')&&integrityEngineSource.includes("SET statement_timeout = '12000ms'"),'Integrity runtime caches dependency bootstrap and bounds database statements')
assert.ok(devWorkshopSource.includes('/api/admin/integrity-engine')&&devWorkshopSource.includes('data-weave-integrity-engine="focused"'),'The Integrity Engine route is a focused live integrity environment')
assert.ok(devWorkshopSource.includes('Integrity Scan')&&devWorkshopSource.includes('Safe Repair')&&devWorkshopSource.includes('AbortController'),'Integrity Engine exposes scan, bounded repair and a visible timeout instead of hanging')
assert.ok(!devWorkshopSource.includes('Fixing path alignment...'),'Old fake EIGHT repair output is removed')
assert.ok(adminWorkshopSource.includes("redirect('/district/administration')"),'Retired Admin Workshop menu redirects to the canonical Workshops district')
assert.ok(!dailyProspectRouteSource.includes('FROM prospects p'),'Daily claim must not use the legacy prospects table')
assert.ok(dailyProspectUiSource.includes('Daily Prospect Claim'),'Daily claim UI uses Prospect wording')
assert.ok(dailyProspectUiSource.includes('next free prospect'),'Daily reset wording uses Prospect')
assert.ok(!dailyProspectUiSource.includes('Daily Project Claim'),'Project typo removed from daily claim')
assert.ok(!bridgerDashboardSource.includes('DailyProspectClaim'),'Bridger Home stays a compact world instead of duplicating Prospect intake')
assert.ok(fs.existsSync(path.join(root,'migrations/20260925_bridger_daily_prospect_claim.sql')),'Daily Prospect claim migration exists')
for(const file of [
 'lib/bridger-daily-prospect-engine.ts',
 'lib/weave-integrity-engine.ts',
 'app/api/admin/integrity-engine/route.ts',
]){
 const source=fs.readFileSync(path.join(root,file),'utf8')
 const compiled=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}})
 const syntaxErrors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
 assert.equal(syntaxErrors.length,0,file+' Integrity Engine syntax/transpile check')
}
const loop1AgentAdSource=fs.readFileSync(path.join(root,'components/agent/loop1-agent-login-ad.tsx'),'utf8')
const agentContinuanceSource=fs.readFileSync(path.join(root,'app/(app)/agent/commissions/page.tsx'),'utf8')
const agentCommissionsApiSource…30771 tokens truncated…)
 assert.equal(markup.includes('Company Guidance Router'),allowed,'Guidance page renders only for Agent/Bridger: '+role)
 if(allowed){
  assert.ok(markup.includes(role==='agent'?'Agent · Connection &amp; Event':'Bridger · Continuity'),'Guidance carries authenticated role context')
  const places=getRolePlaces(role).filter(place=>place.href==='/company-chat')
  assert.equal(places.length,1,'One guidance place per authorized role')
  assert.equal(places[0].district,role==='agent'?'Connection & Event':'Continuity')
 }
}
auth=guidanceAuth
assert.equal(isCompanyGuidanceRoute('/company-chatty'),false,'Guidance guard respects route boundaries')
assert.equal(canAccessEnvironmentRoute('/admin/agent-channels','admin'),true,'Admin retains channel workflow')
assert.ok(roleHas('admin','/admin/agent-channels'),'Admin navigation exposes existing channel application workflow')
for(const role of ['admin','client'])assert.ok(!roleHas(role,'/company-chat'),'Unauthorized role catalog/search omits guidance: '+role)
const guidanceRegistry=require('../lib/weave-environment-registry.ts').WEAVE_ENVIRONMENT_REGISTRY.filter(item=>item.route==='/company-chat')
assert.equal(guidanceRegistry.length,1,'One existing guidance environment')
assert.equal(guidanceRegistry[0].scope,'agent-bridger','Guidance registry restricts scope to Agent and Bridger')
const guidanceLayout=fs.readFileSync(path.join(root,'app/(app)/layout.tsx'),'utf8')
assert.ok(guidanceLayout.includes('if (!routeAllowed) return null'),'Layout blocks guidance before rendering environment wrappers')
assert.ok(guidanceLayout.includes("router.replace(ownDashboard)") &&
  guidanceLayout.includes("user?.role === 'admin' ? '/admin/dashboard'"),
  'Denied department entry returns to the user\'s own authorized dashboard')
const guidanceProvider=fs.readFileSync(path.join(root,'components/world/environment-organizer-provider.tsx'),'utf8')
assert.ok(guidanceProvider.includes('canAccessEnvironmentRoute(item.route,user?.role)'),'Cached runtime items are filtered by current role')
assert.ok(guidanceProvider.includes('if(!canAccessEnvironmentRoute(route,user?.role))return false'),'Navigation visibility remains denied without runtime items')
for(const file of ['app/api/environment-organizer/route.ts','app/api/admin/environment-organizer/route.ts']){
 assert.ok(fs.readFileSync(path.join(root,file),'utf8').includes('canAccessEnvironmentRoute(item.route,'),'Environment API filters guidance: '+file)
}
assert.ok(companyLoopsMatureSource.includes('Company Loop Registry'),'Company Loops is an operating registry')
assert.ok(profileMatureSource.includes('Presence Record'),'Profiles exposes one structural Presence record')
assert.ok(profileMatureSource.includes('<ClientBuildPull'),'Agent/Bridger profile keeps the Client build path visible')
assert.ok(walletCanonicalSource.includes("redirect('/wallet/deposit-withdraw')"),'Wallet base route resolves directly to canonical Value Movement')
assert.ok(valueMovementSource.includes('Value Movement Engine'),'Wallet is a recorded value lifecycle')
assert.ok(valueMovementSource.includes("const isOpayRole = user?.role === 'admin' || user?.role === 'agent' || user?.role === 'bridger'"),'Only OPay positions receive Naira funding fields; Clients use TRX')
assert.ok(valueMovementSource.includes("if (!user || !isOpayRole) {") && valueMovementSource.includes("fetch('/api/rate/flame-coin-ngn')"),'NGN exchange rate is fetched only when an OPay role is active')
assert.ok(valueMovementSource.includes("fetch('/api/bridge/file-folder')") && valueMovementSource.includes('setCompanyTrxWallet(data.companyTrxWallet'), 'Client wallet address loads independently from NGN rate quotes')
assert.ok(!valueMovementSource.includes("fetch('/api/rate/trx-payment-ngn')") && !valueMovementSource.includes('trxPaymentRate') && !valueMovementSource.includes('NGN value ≈'), 'Client TRX conversion never requests or renders a Naira estimate')
assert.ok(valueMovementSource.includes("fetch('/api/deposit/paystack'") && valueMovementSource.includes('Paystack checkout could not be initialized'), 'Client funding uses the shared verified Paystack checkout rather than the retired TRX conversion flow')
assert.ok(!valueMovementSource.includes('Your Referral Link'),'Wallet no longer mixes referral UI with financial movement')
assert.ok(reserveEngineSource.includes('Reserve Engine'),'Creator Fund Wall is a coherent Reserve Engine')
assert.ok(!reserveEngineSource.includes('data?.wallet.address'),'Reserve no longer reads a nonexistent wallet shape')
assert.ok(roleWorldReturnSource.includes("router.replace(roleHome(user?.role))"),'Retired /weave route returns each authenticated position to its own world')
assert.ok(!roleWorldReturnSource.includes('Bridge Plaza'),'Retired /weave route does not expose Bridge Plaza')
assert.ok(fs.readFileSync(path.join(root,'components/events/position-event-world.tsx'),'utf8').includes('<BurningRiverOfficialGateway staff staffHref=') &&
  fs.readFileSync(path.join(root,'components/events/burning-river-live-world.tsx'),'utf8').includes('/api/system-switch/open-world'),
  'Staff Flame Event shows an explicit crossing into the live purchased Client world instead of a joystick scene')
assert.ok(cadenceEngineSource.includes('WEAVE · Company Search'),'Global search finds real role-specific workstations')
const attributedHumanCadenceSource=fs.readFileSync(path.join(root,'app/(app)/search/cadences/page.tsx'),'utf8')
assert.ok(attributedHumanCadenceSource.includes('Human Cadence Engine'),'Human Cadences retain their distinct attributed knowledge section')
assert.ok(attributedHumanCadenceSource.includes('Results are human cadences, not generated answers'),'Cadence search preserves human attribution')

for(const file of [
 'app/(app)/roles/page.tsx',
 'app/(app)/places/page.tsx',
 'app/(app)/clients/page.tsx',
 'app/(app)/private-ground/page.tsx',
 'app/(app)/video-feed/page.tsx',
 'app/(app)/company-chat/page.tsx',
 'app/(app)/company/loops/page.tsx',
 'app/(app)/profiles/page.tsx',
 'app/(app)/wallet/page.tsx',
 'app/(app)/wallet/deposit-withdraw/page.tsx',
 'app/(app)/fund-wall/page.tsx',
 'app/(app)/weave/page.tsx',
 'app/(app)/search/page.tsx',
]){
 const source=fs.readFileSync(path.join(root,file),'utf8')
 const compiled=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}})
 const syntaxErrors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
 assert.equal(syntaxErrors.length,0,file+' PhD-maturity syntax/transpile check')
}

const legacyClientAdminChatSource=fs.readFileSync(path.join(root,'app/client/admin-chat/page.tsx'),'utf8')
const adminAgentYieldApiSource=fs.readFileSync(path.join(root,'app/api/admin/agent-yields/route.ts'),'utf8')
const adminAgentYieldPageSource=fs.readFileSync(path.join(root,'app/(app)/admin/payments/page.tsx'),'utf8')
const adminChannelAuthoritySource=fs.readFileSync(path.join(root,'app/(app)/admin/agent-channels/page.tsx'),'utf8')
const adminContinuanceSource=fs.readFileSync(path.join(root,'app/(app)/admin/subscriptions/page.tsx'),'utf8')
const adminOutreachSource=fs.readFileSync(path.join(root,'app/(app)/admin/outreach/page.tsx'),'utf8')
const adminOutreachApiSource=fs.readFileSync(path.join(root,'app/api/admin/market/prospects/outreach/pending/route.ts'),'utf8')
const adminVaultAuthoritySource=fs.readFileSync(path.join(root,'app/(app)/admin/client-vault/page.tsx'),'utf8')
const legacyAdminHubSource=fs.readFileSync(path.join(root,'app/(app)/admin/hub/page.tsx'),'utf8')
const directCommunicationMatureSource=fs.readFileSync(path.join(root,'components/communication/weave-communication-hub.tsx'),'utf8')

assert.ok(legacyClientAdminChatSource.includes("redirect('/client/chat/admin')"),'Legacy mock Client Admin chat resolves to canonical Client Administrations chat')
assert.ok(!legacyClientAdminChatSource.includes('mockSessions'),'Legacy Client Admin chat no longer fabricates conversations')
assert.ok(adminAgentYieldApiSource.includes("user.role !== 'admin'"),'Agent Yield registry endpoint is Administrations-only')
assert.ok(adminAgentYieldApiSource.includes('getAllAgentSalaries'),'Agent Yield registry derives state from live salary logic')
assert.ok(adminAgentYieldPageSource.includes('Agent Yield Registry'),'Administrations payments route exposes live Yield state')
assert.ok(!adminAgentYieldPageSource.includes("from '@/lib/mock-db'"),'Administrations financial surface no longer writes mock Agent payments')
assert.ok(!adminAgentYieldPageSource.includes('Record Payment via EIGHT'),'Mock EIGHT payment claim is removed')
assert.ok(adminChannelAuthoritySource.includes('Channel Authority Engine'),'Agent channel review is an authority state engine')
assert.ok(adminChannelAuthoritySource.includes('Approval changes what an Agent is authorized to do'),'Agent channel approval exposes its actual consequence')
assert.ok(adminContinuanceSource.includes('Bridger Continuance Retired')&&adminContinuanceSource.includes('read-only'),'Old Bridger payments are kept only for historical reconciliation')
assert.ok(adminOutreachSource.includes('Outreach Movement Registry'),'Outreach is a recorded movement registry')
assert.ok(adminOutreachSource.includes('Bridge of Radiance'),'Prospects remain in Bridge of Radiance before Client conversion')
assert.ok(!adminOutreachSource.includes('Entered System Switch'),'Outreach no longer describes Prospects as System Switch users')
assert.ok(adminOutreachApiSource.includes("authUser.role !== 'admin'"),'Outreach funnel enforces Administrations authority')
assert.ok(adminOutreachApiSource.includes("status: 403"),'Non-Admin outreach access is forbidden')
assert.ok(adminVaultAuthoritySource.includes('Client Vault Authority Engine'),'Client Vault is an Administrations authority system')
assert.ok(adminVaultAuthoritySource.includes('ready for manual settlement'),'Withdrawal approval is distinguished from completed settlement')
assert.ok(legacyAdminHubSource.includes("redirect('/communications')"),'Legacy Administrations Message Hub resolves to Direct Communication')
assert.ok(directCommunicationMatureSource.includes('Direct Communication'),'Canonical role communication is one causal environment')
assert.ok(directCommunicationMatureSource.includes("const isAgent = user?.role === 'agent'")&&directCommunicationMatureSource.includes("const isBridger = user?.role === 'bridger'")&&directCommunicationMatureSource.includes("const isAdmin = user?.role === 'admin'"),'Direct Communication recognizes Agent Bridger and Administrations positions')
assert.ok(directCommunicationMatureSource.includes("const pos = isAdmin ? position : threadPosition"),'Administrations selects Prospect position while Agent and Bridger stay on their authorized thread')
assert.ok(directCommunicationMatureSource.includes('/api/bridger/support-inbox')&&directCommunicationMatureSource.includes('/api/client/messages')&&directCommunicationMatureSource.includes('/api/lounge/management-contacts'),'Direct Communication joins Prospect Client and role-to-role channels without another chat backend')
assert.ok(managementContactsSource.includes("role = 'admin'")&&managementContactsSource.includes("assigned_agent_id = ${authUser.id}::uuid"),'Agent and Bridger relationship contacts include Administrations and their authorized Agent-Bridger link')
assert.ok(bridgerSupportDirectSource.includes('LEFT JOIN bridge_support_messages'),'Bridger can initiate with an owned Prospect before the Prospect sends first')
assert.ok(clientMessagesDirectSource.includes("'bridger'::text AS position")&&clientMessagesDirectSource.includes("'admin'::text AS position"),'Bridger and Administrations can initiate direct Client channels')
assert.ok(roleHas('admin','/admin/control-center'),'Administrations Continuance verification lives inside the canonical Control Center')
assert.ok(!roleHas('admin','/admin/control-center#users'),'Administrations no longer advertises internal Control Center tabs as separate places')

for(const file of [
 'app/client/admin-chat/page.tsx',
 'app/api/admin/agent-yields/route.ts',
 'app/(app)/admin/payments/page.tsx',
 'app/(app)/admin/agent-channels/page.tsx',
 'app/(app)/admin/subscriptions/page.tsx',
 'app/(app)/admin/outreach/page.tsx',
 'app/api/admin/market/prospects/outreach/pending/route.ts',
 'app/(app)/admin/client-vault/page.tsx',
 'app/(app)/admin/hub/page.tsx',
 'components/communication/weave-communication-hub.tsx',
 'app/(app)/communications/page.tsx',
 'app/(app)/settings/page.tsx',
]){
 const source=fs.readFileSync(path.join(root,file),'utf8')
 const compiled=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}})
 const syntaxErrors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
 assert.equal(syntaxErrors.length,0,file+' Administrations-maturity syntax/transpile check')
}

console.log('PASS: Agent Loop 1 commission awareness, separate Agility ad, Bridger Prospect visibility;  Bridger daily free Prospect claim, active outreach integration, Prospect wording;  Client portal entry isolation, authenticated Client identity, System Switch dashboard;  DJ Workshop and institutional live sound operation;  Lord/Lady Enterprise Dream integration, Legion access, enterprise notifications;  Deposit lifecycle notifications, authenticated inbox, review deep links;  Department Entry tickets, music gate, OPay verification, paid code release;  Authority hydration, admin panels, destination routes, client workshop rendering, payment verification, random File Numbers, shared OPay rail, Agility economics, delivery, historical pricing, fulfillment, login advertisement, tutorial, and River assistance')

const numberEngineSource=fs.readFileSync(path.join(root,'lib/bridger-number-engine.ts'),'utf8')
const numberAdminSource=fs.readFileSync(path.join(root,'app/api/admin/bridger-numbers/route.ts'),'utf8')
const numberBridgerSource=fs.readFileSync(path.join(root,'app/api/bridger/numbers/route.ts'),'utf8')
const numberAdminPage=fs.readFileSync(path.join(root,'app/(app)/admin/bridger-numbers/page.tsx'),'utf8')
const numberBridgerPage=fs.readFileSync(path.join(root,'app/(app)/bridger/numbers/page.tsx'),'utf8')
const numberOrderMigrationSource=fs.readFileSync(path.join(root,'migrations/20260927_bridger_number_country_orders.sql'),'utf8')
assert.ok(numberEngineSource.includes('phone_e164 varchar(32) NOT NULL UNIQUE'),'Number Engine prevents duplicate provisioned numbers')
assert.ok(numberEngineSource.includes('assigned_to uuid REFERENCES users(id)'),'Number Engine preserves Bridger ownership')
assert.ok(numberAdminSource.includes("user.role!=='admin'"),'Only Administrations can manage Number Engine inventory')
assert.ok(numberBridgerSource.includes("user.role!=='bridger'"),'Only Bridgers can purchase Number Engine inventory')
assert.ok(numberBridgerSource.includes("FOR UPDATE"),'Number purchase locks scarce inventory and wallet rows')
assert.ok(numberBridgerSource.includes("status='assigned'"),'Successful purchase permanently assigns the number')
assert.ok(numberBridgerSource.includes("issueWeaveReceipt"),'Number purchases issue canonical WEAVE receipts')
assert.ok(!numberAdminPage.toLowerCase().includes('password'),'Administrations Number Engine never collects WhatsApp passwords')
assert.ok(numberBridgerPage.includes('exact phone number is revealed only after assignment'),'Available inventory does not expose numbers before purchase or delivery')
assert.ok(!numberBridgerSource.includes('acquisition_cost'),'Bridger Number Engine API keeps Administrations acquisition cost private')
assert.ok(!numberBridgerPage.includes('n.acquisition_cost'),'Bridger Number Engine never renders Administrations acquisition cost')
assert.ok(fs.existsSync(path.join(root,'migrations/20260926_bridger_whatsapp_number_engine.sql')),'Number Engine migration exists')
assert.ok(numberEngineSource.includes('bridger_number_country_offers'),'Number Engine persists country offers independently from physical stock')
assert.ok(numberEngineSource.includes('bridger_number_orders'),'Number Engine persists out-of-stock Bridger orders')
assert.ok(numberEngineSource.includes("interval '30 minutes'"),'Number orders carry a 30-minute Administrations delivery deadline')
assert.ok(numberEngineSource.includes('delivery_minutes BETWEEN 5 AND 30'),'Runtime country-offer schema cannot promise beyond the 30-minute delivery SLA')
assert.ok(numberAdminSource.includes('const deliveryMinutes=BRIDGER_NUMBER_ORDER_DELIVERY_MINUTES'),'Administrations cannot publish a longer country-order SLA')
assert.ok(numberAdminPage.includes('Delivery SLA · fixed 30 minutes'),'Administrations UI makes the fixed delivery SLA explicit')
assert.ok(numberEngineSource.includes('ensureBridgerNumberPosition'),'Number purchase repairs missing legacy Bridger profiles at the engine boundary')
assert.ok(numberEngineSource.includes('ensurePrimaryWallet'),'Number purchase repairs a missing primary Bridger wallet instead of failing generically')
assert.ok(numberEngineSource.includes("CASE WHEN status='active' THEN 0"),'Number purchase prefers an active Bridger profile when legacy duplicate profile rows exist')
assert.ok(numberEngineSource.includes("profile.status==='active'")||numberEngineSource.includes("profiles.some(profile=>profile.status==='active')"),'An active Bridger profile is sufficient for Number Bay purchase')
assert.ok(numberBridgerPage.includes("action:'purchase_country'"),'Stocked Number Bay purchase sends the visible country to the server')
assert.ok(numberBridgerPage.includes('buyCountry(offer.country)'),'Clicking current stock always enters the purchase flow without requiring a hidden client-side inventory id')
assert.ok(!numberBridgerPage.includes('stockedNumber.id')&&!numberBridgerPage.includes('available.find('),'Number Bay no longer depends on the capped inventory mirror to make a stock button purchasable')
assert.ok(numberBridgerSource.includes("action==='purchase_country'"),'Server supports atomic current-stock purchase by country')
assert.ok(numberBridgerSource.includes("ORDER BY created_at ASC")&&numberBridgerSource.includes("LIMIT 1")&&numberBridgerSource.includes("FOR UPDATE"),'Server selects and locks current country stock inside the purchase transaction')
assert.ok(numberBridgerSource.includes('balance_trx=balance_trx-$1'),'Number purchase debits System Switch atomically')
assert.ok(numberBridgerSource.includes('AND balance_trx >= $1'),'Number purchase cannot overdraw the Bridger wallet during concurrent movement')
assert.ok(numberBridgerSource.includes("gate:'stock_changed'"),'Number purchase safely rejects a stock race without charging the Bridger')
assert.ok(numberBridgerSource.includes('fallbackOffer'),'Legacy zero-price stock is repaired from the published country price')
assert.ok(numberBridgerSource.includes('FILTER (WHERE n.price_flame_coin>0)'),'Number Bay display ignores invalid legacy zero-price stock when choosing the visible price')
assert.ok(numberBridgerSource.includes('[Bridger Number receipt after completed purchase]'),'Receipt failure after commit cannot report a completed number assignment as a failed purchase')
assert.ok(numberBridgerSource.includes("action==='order_country'"),'Bridgers can place an out-of-stock country order')
assert.ok(numberBridgerSource.includes("gate:'stock_available'"),'Country ordering redirects Bridgers to instant purchase when stock is present')
assert.ok(numberBridgerSource.includes("entry_type,'whatsapp_number_order'")||numberBridgerSource.includes("'whatsapp_number_order'"),'Country orders debit System Switch through the ledger')
assert.ok(numberBridgerSource.includes("subject:'Bridger Number Bay country order'")&&numberBridgerSource.includes('notifyAdminOrder({'),'Country orders notify Administrations for fulfillment')
assert.ok(numberAdminSource.includes("'deliver_order'")&&numberAdminSource.includes("status='delivered'")&&numberAdminSource.includes('number_id=$2::uuid'),'Administrations can deliver a timed number order through the engine')
assert.ok(numberAdminSource.includes("action==='cancel_order'"),'Administrations can cancel an unfulfilled number order')
assert.ok(numberAdminSource.includes("'whatsapp_number_order_refund'"),'Cancelled number orders return System Switch through the ledger')
assert.ok(numberAdminPage.includes('30-minute delivery dock'),'Administrations has a dedicated timed number-order fulfillment dock')
assert.ok(numberAdminPage.includes('Deliver newly acquired number'),'Administrations can fulfill an order even when the bay was initially out of stock')
assert.ok(numberBridgerPage.includes('Choose country')&&numberBridgerPage.includes('Country'),'Bridger sees the country before purchase')
assert.ok(numberBridgerPage.includes('const stockedCount=offers.reduce'),'Number Bay stock count comes from the same country-offer inventory source that drives purchase availability')
assert.ok(numberBridgerPage.includes('Order · ')&&numberBridgerPage.includes('min delivery'),'Out-of-stock countries expose the timed delivery order action')
assert.ok(numberBridgerPage.includes('Promise.allSettled'),'Number Bay core inventory is isolated from verification-service faults')
assert.ok(numberBridgerPage.includes('applyNumberBayState'),'Number Bay ownership state has an independent application path')
assert.ok(numberBridgerPage.includes('setMine(prev=>[d.number'),'Successful purchase is reflected immediately before background reload')
assert.ok(numberBridgerSource.includes('[Bridger Number order receipt after completed order]'),'Committed Number Bay orders cannot become false failures when receipt persistence is unavailable')
assert.ok(numberOrderMigrationSource.includes('bridger_number_country_offers')&&numberOrderMigrationSource.includes('bridger_number_orders'),'Production migration persists country offers and number orders')


const numberVerificationSource=fs.readFileSync(path.join(root,'app/api/bridger/number-verifications/route.ts'),'utf8')
assert.ok(numberEngineSource.includes("provider varchar(160) NOT NULL DEFAULT 'Aphone'"),'Number Engine stock is explicitly Aphone')
assert.ok(numberEngineSource.includes('acquisition_cost'),'Administrations can track Aphone acquisition cost')
assert.ok(numberVerificationSource.includes("interval '10 minutes'")||numberEngineSource.includes("interval '10 minutes'"),'Manual verification opens a timed code window')
assert.ok(numberVerificationSource.includes("status IN ('requested','pending')"),'Administrations can return to pending Aphone requests')
assert.ok(numberVerificationSource.includes("status='verified'"),'Bridger can complete the verification movement')
assert.ok(numberVerificationSource.includes('verification_code=NULL'),'Completed verification clears the code')
assert.ok(numberAdminPage.includes('Load battery'),'Administrations loads Aphone numbers as battery stock')
assert.ok(numberBridgerPage.includes('Request SMS')&&numberBridgerPage.includes('Request Call'),'Bridger can request either Aphone verification method')

const numberBridgerApiBoundary=fs.readFileSync(path.join(root,'app/api/bridger/numbers/route.ts'),'utf8')
const numberVerificationBoundary=fs.readFileSync(path.join(root,'app/api/bridger/number-verifications/route.ts'),'utf8')
assert.ok(!numberBridgerApiBoundary.includes('SELECT id,country,provider,price_flame_coin'),'Bridger available inventory does not expose supplier')
assert.ok(!numberBridgerApiBoundary.includes('phone_e164,country,provider,provider_reference'),'Assigned-number API does not expose supplier reference')
assert.ok(!numberBridgerApiBoundary.includes('bridger_number_inbox'),'Bridger API uses the manual Administrations fulfillment workflow only')
assert.ok(numberBridgerApiBoundary.includes('number:publicNumber'),'Purchase response returns an explicit public projection instead of the raw inventory row')
assert.ok(!numberEngineSource.includes('bridger_number_inbox'),'Number Engine schema has no obsolete automatic provider inbox')
assert.ok(numberBridgerApiBoundary.includes("product:'WEAVE Worldwide WhatsApp Number'"),'Receipt identifies the WEAVE product rather than its supplier')
assert.ok(!numberBridgerPage.includes('Aphone'),'Bridger Number Engine never exposes the Administrations supply source')
assert.ok(numberBridgerPage.includes('Worldwide Number Bay'),'Bridger sees the WEAVE worldwide product identity')
assert.ok(!numberVerificationBoundary.includes('received from Aphone'),'Verification API language remains supplier-neutral')


for(const file of [
 'lib/bridger-number-engine.ts',
 'app/api/bridger/numbers/route.ts',
 'app/api/admin/bridger-numbers/route.ts',
 'app/(app)/bridger/numbers/page.tsx',
 'app/(app)/admin/bridger-numbers/page.tsx',
]){
 const source=fs.readFileSync(path.join(root,file),'utf8')
 const compiled=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}})
 const syntaxErrors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
 assert.equal(syntaxErrors.length,0,file+' Number Bay purchase/order syntax/transpile check')
}

const roleWorldReturnRepairSource=fs.readFileSync(path.join(root,'app/(app)/weave/page.tsx'),'utf8')
const weaveReadabilityRepairSource=fs.readFileSync(path.join(root,'app/weave-readability.css'),'utf8')
const customerMarketApiRepairSource=fs.readFileSync(path.join(root,'app/api/public/client-market/route.ts'),'utf8')
const flameEventEnterpriseSource=fs.readFileSync(path.join(root,'components/events/position-event-world.tsx'),'utf8')
assert.ok(!fs.existsSync(path.join(root,'components/world/bridge-plaza-map.tsx')),'Retired Bridge Plaza implementation stays removed')
assert.ok(roleWorldReturnRepairSource.includes('Opening your role world'),'Retired /weave route provides a role-world handoff')
assert.ok(customerMarketApiRepairSource.includes("formation_status IN ('selling','ready_for_offer')"),'Public enterprise discovery is limited to opened Customer Doors')
assert.ok(flameEventEnterpriseSource.includes('<BurningRiverOfficialGateway staff staffHref='),'Flame Event retains its Customer Door and living-world entrance through the official gateway')
assert.ok(weaveReadabilityRepairSource.includes('.truncate:not([data-allow-truncate="true"])'),'WEAVE has a default no-clipping guardrail for operational copy')
assert.ok(weaveReadabilityRepairSource.includes('[class*="line-clamp-"]'),'WEAVE prevents accidental line-clamp text loss by default')

const weaveEnvironmentTransitSource=fs.readFileSync(path.join(root,'components/world/weave-environment-transit.tsx'),'utf8')
const weaveEnvironmentSurfaceSource=fs.readFileSync(path.join(root,'components/world/weave-environment-surface.tsx'),'utf8')
const weaveEnvironmentMapSource=fs.readFileSync(path.join(root,'lib/weave-environments.ts'),'utf8')
const rootEnvironmentLayoutSource=fs.readFileSync(path.join(root,'app/layout.tsx'),'utf8')
const appEnvironmentLayoutSource=fs.readFileSync(path.join(root,'app/(app)/layout.tsx'),'utf8')
const clientEnvironmentLayoutSource=fs.readFileSync(path.join(root,'app/client/layout.tsx'),'utf8')
const authEnvironmentLayoutSource=fs.readFileSync(path.join(root,'app/(auth)/layout.tsx'),'utf8')

assert.ok(weaveEnvironmentTransitSource.includes("first.current?'boot':'transit'")&&weaveEnvironmentTransitSource.includes('waitForEnvironmentReadiness(mode,configRef.current,controller.signal)'),'Boot and route entry use cancellable environment readiness')
assert.ok(weaveEnvironmentTransitSource.includes('Math.min(loading.maxWaitMs,60000)'),'Readiness has an Administrations-configurable bounded fallback for stalled assets')
assert.ok(weaveEnvironmentTransitSource.includes('document.fonts.ready'),'Environment readiness waits for typography before reveal')
assert.ok(weaveEnvironmentTransitSource.includes('document.images'),'Environment readiness can wait for current media before reveal')
assert.ok(weaveEnvironmentTransitSource.includes('MutationObserver'),'Environment readiness waits for DOM component formation to become quiet')
assert.ok(weaveEnvironmentTransitSource.includes('Welcome to The Company of Time'),'Boot language presents WEAVE as an environment instead of page loading')
assert.ok(rootEnvironmentLayoutSource.includes('<WeaveEnvironmentTransit>'),'Root layout applies environment boot to the whole app')
assert.ok(appEnvironmentLayoutSource.includes('<WeaveEnvironmentSurface role={user?.role}'),'Authenticated staff/partner surfaces inherit environment framing')
assert.ok(clientEnvironmentLayoutSource.includes('<WeaveEnvironmentSurface role="client">'),'Client surfaces inherit one Client world framing')
assert.ok(authEnvironmentLayoutSource.includes('<WeaveEnvironmentSurface compact>'),'Authentication is framed as a WEAVE entry environment')
assert.ok(weaveEnvironmentSurfaceSource.includes('data-weave-environment'),'Environment identity is explicit in the rendered shell')
assert.ok(weaveEnvironmentMapSource.includes("'Client Access Gate'"),'Client login has explicit world-entry language')
assert.ok(!weaveEnvironmentMapSource.includes("'Bridger Operating Room'"),'Bridger environment map has no duplicate Operating Room layer')
assert.ok(!weaveEnvironmentMapSource.includes("'Agent Operating Room'"),'Agent environment map has no duplicate Operating Room layer')
assert.ok(!weaveEnvironmentMapSource.includes("'Administrations Operating Room'"),'Administrations environment map has no duplicate Operating Room layer')

for(const file of [
  'lib/weave-development-agents.ts',
  'app/api/admin/development-agents/route.ts',
  'app/(app)/admin/development-agents/page.tsx',
  'lib/weave-interaction-motion.ts',
  'lib/weave-visual-profile.ts',
  'components/world/use-visual-runtime.ts',
  'components/world/interaction-motion-field.tsx',
  'app/(app)/admin/visual-systems/page.tsx',
  'components/world/weave-live-flame-field.tsx',
  'components/events/flame-event-artifact.tsx',
  'lib/weave-environment-runtime-profile.ts',
  'components/world/use-environment-runtime-config.ts',
  'components/admin/environment-runtime-controls.tsx',
  'components/world/weave-presence-ambience.tsx',
  'components/world/weave-environment-transit.tsx',
  'components/world/weave-environment-surface.tsx',
  'lib/weave-environments.ts',
  'app/layout.tsx',
  'app/(app)/layout.tsx',
  'app/client/layout.tsx',
  'app/(auth)/layout.tsx',
]){
 const source=fs.readFileSync(path.join(root,file),'utf8')
 const compiled=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}})
 const syntaxErrors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
 assert.equal(syntaxErrors.length,0,file+' environment-world syntax/transpile check')
}


const bridgerCrossingNotebookSource=fs.readFileSync(path.join(root,'components/bridger/crossing-notebook-world.tsx'),'utf8')
const bridgerCrossingNotebookDataSource=fs.readFileSync(path.join(root,'lib/bridger-crossing-notebook.ts'),'utf8')
const bridgerRoleDistrictSource=fs.readFileSync(path.join(root,'lib/weave-role-districts.ts'),'utf8')
const bridgerProspectApiSource=fs.readFileSync(path.join(root,'app/api/bridger/prospects/route.ts'),'utf8')
const bridgerProspectMarketSource=fs.readFileSync(path.join(root,'app/(app)/weave/market/prospects/page.tsx'),'utf8')
const bridgerProspectPurchaseSource=fs.readFileSync(path.join(root,'app/api/market/prospects/purchase/route.ts'),'utf8')
const bridgerDailyProspectSource=fs.readFileSync(path.join(root,'app/api/bridger/daily-prospect/route.ts'),'utf8')
for(const file of [
 'components/bridger/crossing-notebook-world.tsx',
 'lib/bridger-crossing-notebook.ts',
 'app/(app)/bridger/crossing-notebook/page.tsx',
 'app/api/bridger/prospects/route.ts',
 'app/(app)/weave/market/prospects/page.tsx',
 'app/api/market/prospects/purchase/route.ts',
 'app/api/bridger/daily-prospect/route.ts',
]){
 const source=fs.readFileSync(path.join(root,file),'utf8')
 const compiled=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}})
 const syntaxErrors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
 assert.equal(syntaxErrors.length,0,file+' Bridger Crossing Notebook syntax/transpile check')
}
assert.ok(bridgerCrossingNotebookSource.includes('<AdaptiveCanvas'),'Crossing Notebook is a real 3D WEAVE place')
assert.ok(bridgerCrossingNotebookSource.includes('No automatic page advance'),'Crossing Notebook states manual reading')
assert.ok(bridgerCrossingNotebookSource.includes('Next step'),'Crossing Notebook advances only through the Bridger control')
assert.ok(bridgerCrossingNotebookDataSource.includes("title: 'Meet the Human'"),'Crossing Notebook begins with the human rather than price')
assert.ok(bridgerCrossingNotebookDataSource.includes("title: 'Remain the Bridger'"),'Crossing Notebook carries the relationship beyond conversion')
assert.ok(bridgerCrossingNotebookDataSource.includes('Do not promise customers, sales or profit.'),'Crossing Notebook blocks false outcome promises')
assert.ok(bridgerRoleDistrictSource.includes("name:'Prospect & Crossing'")&&bridgerRoleDistrictSource.includes("href:'/bridger/crossing-notebook'"),'Prospect & Crossing exposes Crossing Notebook')
assert.ok(weaveEnvironmentMapSource.includes("'bridger-crossing-notebook'"),'Crossing Notebook has a registered WEAVE environment identity')
assert.ok(bridgerProspectPurchaseSource.includes("Can I ask what you currently do, or what you're trying to make work better?"),'Purchased Prospect first message is human-first')
assert.ok(bridgerDailyProspectSource.includes("Can I ask what you currently do, or what you're trying to make work better?"),'Daily Prospect first message is human-first')
assert.ok(!bridgerProspectPurchaseSource.includes("I'm connecting you with Bridge AI from Weave. You can continue here"),'Purchased Prospect no longer receives a cold Bridge link')
assert.ok(!bridgerDailyProspectSource.includes("I'm connecting you with Bridge AI from Weave. You can continue here"),'Daily Prospect no longer receives a cold Bridge link')
assert.ok(bridgerProspectApiSource.includes('bridgeUrl'),'Bridger prospect API preserves the assigned Bridge as a separate next movement')
assert.ok(bridgerProspectMarketSource.includes('Send Bridge When Ready'),'Prospect Market separates first contact from Bridge handoff')
assert.ok(bridgerProspectMarketSource.includes('Open Crossing Notebook'),'Prospect Market points Bridgers back to the manual before outreach')
assert.ok(!bridgerProspectMarketSource.includes('Acquire qualified leads for your Bridge AI.'),'Prospect Market does not claim unproven lead qualification')
assert.ok(!bridgerProspectMarketSource.includes('Verified WhatsApp Numbers'),'Prospect Market does not claim contact verification before real outreach')


const referralEngineSource=fs.readFileSync(path.join(root,'lib/user-referral.ts'),'utf8')
const referralApiSource=fs.readFileSync(path.join(root,'app/api/referral/me/route.ts'),'utf8')
const referralPanelSource=fs.readFileSync(path.join(root,'components/referral-code-panel.tsx'),'utf8')
const staffRegistrationReferralSource=fs.readFileSync(path.join(root,'app/api/auth/register/route.ts'),'utf8')
const clientRegistrationReferralSource=fs.readFileSync(path.join(root,'app/api/client/weave-register/route.ts'),'utf8')
const staffSettingsReferralSource=fs.readFileSync(path.join(root,'app/(app)/roles/page.tsx'),'utf8')
const clientSettingsReferralSource=fs.readFileSync(path.join(root,'app/client/settings/page.tsx'),'utf8')
const companyGuidanceApiSource=fs.readFileSync(path.join(root,'app/api/company-guidance/route.ts'),'utf8')
const companyGuidanceThreadSource=fs.readFileSync(path.join(root,'app/(app)/company-chat/[position]/page.tsx'),'utf8')
const adminCompanyGuidanceSource=fs.readFileSync(path.join(root,'app/(app)/admin/company-guidance/page.tsx'),'utf8')
assert.ok(referralEngineSource.includes('buildUserReferralCode')&&referralEngineSource.includes('ensureUserReferralCode'),'Referral identity has one canonical generator and lazy hydration path')
assert.ok(referralApiSource.includes("['agent','bridger','client']")&&referralApiSource.includes('sharePath'),'Agent Bridger and Client can retrieve a stable referral identity')
assert.ok(referralPanelSource.includes('/api/referral/me')&&staffSettingsReferralSource.includes('ReferralCodePanel')&&clientSettingsReferralSource.includes('ReferralCodePanel'),'Referral identity is visible from staff and Client settings')
assert.ok(staffRegistrationReferralSource.includes('resolveReferralOwnerByCode')&&staffRegistrationReferralSource.includes('referral_code'),'Staff registration accepts the visible referral code instead of requiring an internal UUID')
assert.ok(clientRegistrationReferralSource.includes("buildUserReferralCode(userId, 'client')")&&clientRegistrationReferralSource.includes('referral_code'),'Client registration assigns referral identity at account creation')
assert.ok(referralEngineSource.includes('referral_code IS NULL')&&referralEngineSource.includes('SUBSTRING(REPLACE(id::text'), 'Legacy active Agent, Bridger, and Client accounts resolve their canonical referral code even before it is persisted')
assert.ok(clientRegistrationReferralSource.includes('resolveReferralOwnerByCode')&&clientRegistrationReferralSource.includes('referralOwner?.id || bridgerId'), 'Client registration preserves universal referral attribution while retaining the File Folder Bridger fallback')
assert.ok(fs.readFileSync(path.join(root,'app/client/register/page.tsx'),'utf8').includes("referredBy: searchParams.get('ref') || undefined"), 'Client registration carries the referral code from its shared referral link into account creation')
assert.ok(companyGuidanceApiSource.includes("cg:")&&companyGuidanceApiSource.includes("['agent','bridger','admin']"),'Company Guidance uses authenticated Agent Bridger and Administrations messaging')
assert.ok(companyGuidanceThreadSource.includes('/api/company-guidance')&&!companyGuidanceThreadSource.includes("redirect('/company-chat?position="),'Company Guidance position routes are live threads instead of a redirect loop')
assert.ok(adminCompanyGuidanceSource.includes('/api/company-guidance')&&roleHas('admin','/admin/company-guidance'),'Administrations has a discoverable Company Guidance reply endpoint')
assert.ok(weaveEnvironmentMapSource.includes("'administration-company-guidance'"),'Administrations Company Guidance has a registered WEAVE environment identity')


// Agent Food Distribution employment remains independent from Bridger distribution
// and Food Preparation, with a separate Administrations approval desk.
const foodDistributionFiles=[
  'lib/food-distribution-employment.ts',
  'app/api/food-distribution/employment/route.ts',
  'app/api/admin/food-distribution-employment/route.ts',
  'app/(app)/weave/lifestyles/food-distribution/page.tsx',
  'app/(app)/admin/food-distribution-employment/page.tsx',
  'app/api/employment/workspace/route.ts',
  'app/(app)/weave/lifestyles/work/page.tsx',
  'app/(app)/weave/lifestyles/page.tsx',
  'lib/weave-lifestyle-catalog.ts',
  'components/app-header.tsx',
];
for(const file of foodDistributionFiles){
  const source=fs.readFileSync(path.join(root,file),'utf8')
  const compiled=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}})
  const syntaxErrors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
  assert.equal(syntaxErrors.length,0,file+' Food Distribution / Administrations syntax check')
}
const foodDistributionSchemaSource=fs.readFileSync(path.join(root,'lib/food-distribution-employment.ts'),'utf8')
const foodDistributionApiSource=fs.readFileSync(path.join(root,'app/api/food-distribution/employment/route.ts'),'utf8')
const foodDistributionAdminApiSource=fs.readFileSync(path.join(root,'app/api/admin/food-distribution-employment/route.ts'),'utf8')
const foodDistributionAdminPageSource=fs.readFileSync(path.join(root,'app/(app)/admin/food-distribution-employment/page.tsx'),'utf8')
const foodDistributionWorkspaceSource=fs.readFileSync(path.join(root,'app/api/employment/workspace/route.ts'),'utf8')
const foodDistributionLifestyleSource=fs.readFileSync(path.join(root,'app/(app)/weave/lifestyles/page.tsx'),'utf8')
const adminHeaderSource=fs.readFileSync(path.join(root,'components/app-header.tsx'),'utf8')
assert.ok(foodDistributionSchemaSource.includes('weave_food_distribution_employment')&&foodDistributionSchemaSource.includes("position IN ('manager','assistant')"),'Food Distribution has its own employment records and role types')
assert.ok(foodDistributionApiSource.includes("user.role!=='agent'")&&foodDistributionApiSource.includes('getActiveLegionEmployment')&&foodDistributionApiSource.includes('An Agent submitted a '),'Food Distribution applications are Agent-only, respect exclusive Legion service and notify Administrations')
assert.ok(foodDistributionApiSource.includes("position==='assistant'")&&foodDistributionApiSource.includes("position='manager' AND e.status='approved'"),'Assistant Food Distribution applicants must select an approved Food Distribution Manager')
assert.ok(foodDistributionAdminApiSource.includes("user?.role!=='admin'")&&foodDistributionAdminApiSource.includes("action==='approve'?'approved':'rejected'")&&foodDistributionAdminApiSource.includes("status='pending'"),'Administrations alone reviews pending Food Distribution applications')
assert.ok(foodDistributionAdminPageSource.includes('Approve appointment')&&foodDistributionAdminPageSource.includes('Decline')&&foodDistributionAdminPageSource.includes('Food Distribution Employment'),'Administrations has an actual decision desk for the new appointment path')
assert.ok(foodDistributionWorkspaceSource.includes('food_distribution_manager')&&foodDistributionWorkspaceSource.includes('food_distribution_assistant_manager'),'Only approved Food Distribution appointments enter the staff workspace')
assert.ok(foodDistributionLifestyleSource.includes('FOOD DISTRIBUTION MANAGER')&&foodDistributionLifestyleSource.includes('/weave/lifestyles/food-distribution'),'Agent Lifestyle exposes the separate Food Distribution application')
assert.ok(adminHeaderSource.includes('A Time · Administrations')&&adminHeaderSource.includes("? 'A Time'")&&!adminHeaderSource.includes('A Cat · Administrations'),'The notification-bearing global header labels Administrations as A Time, not A Cat')
console.log('Food Distribution employment and Administrations identity regression checks passed')

const bridgerWorkingManualSource=fs.readFileSync(path.join(root,'app/(app)/bridger/working-manual/page.tsx'),'utf8')
assert.ok(bridgerWorkingManualSource.includes('at least two prospects every working hour'),'Bridger manual defines the hourly two-prospect contact requirement')
assert.ok(bridgerWorkingManualSource.includes('2 × working hours'),'Bridger daily contact target scales with working hours')
assert.ok(bridgerWorkingManualSource.includes('A sent message is an outreach attempt'),'Bridger manual distinguishes outreach from response and conversion')
assert.ok(roleHas('bridger','/bridger/working-manual'),'Bridger world exposes the Working Manual')
assert.ok(prospectMarketSource.includes('/bridger/working-manual')||bridgerWorkingManualSource.includes('/weave/market/prospects'),'Prospect Marketplace and Working Manual are connected')

// A departmental Work Desk now hosts the buildings; prevent a second navigation tree.
require('./company-workdesk-building-unification.cjs')

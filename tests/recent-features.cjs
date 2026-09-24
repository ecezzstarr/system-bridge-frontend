const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
const root=path.resolve(__dirname,'..'),originalLoad=Module._load
let auth={user:{id:'admin-test',name:'Admin',role:'admin'},token:'test-token',isLoading:false,isInitialized:true},tab='workshops'
const Box=({children,...props})=>React.createElement('div',{},children)
Module._load=function(id,parent,isMain){
 if(id==='@/lib/auth-provider')return {useAuth:()=>auth}
 if(id==='next/navigation')return {useRouter:()=>({replace(){},push(){}}),useSearchParams:()=>new URLSearchParams({tab})}
 if(id==='next/link')return {__esModule:true,default:({children,href})=>React.createElement('a',{href},children)}
 if(id==='@/components/ecosystem-nav')return {EcosystemNav:()=>null}
 if(id.startsWith('@/components/ui/'))return new Proxy({},{get:(_,name)=>name==='__esModule'?true:Box})
 if(id.startsWith('@/'))id=path.join(root,id.slice(2))
 return originalLoad.call(this,id,parent,isMain)
}
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,file)
const Workshop=require('../app/(app)/authority/workshops/page.tsx').default
auth={...auth,isInitialized:false};assert.match(renderToStaticMarkup(React.createElement(Workshop)),/Loading Authority Workshop/)
auth={...auth,isInitialized:true};const html=renderToStaticMarkup(React.createElement(Workshop))
for(const label of ['Authority Workshop','Company Loop Workshop','Client Workshop Support','EIGHT Developer Workshop','Client Vault','Campaign Flame'])assert.ok(html.includes(label),label)
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
assert.equal(AGILITY_RETAIL_UNIT_PRICE_NGN,3000)
assert.equal(AGILITY_PACKAGES_PER_BOX,10)
assert.equal(AGILITY_RETAIL_BOX_VALUE_NGN,30000)
assert.equal(AGILITY_AGENT_BOX_PRICE_NGN,28000)
assert.equal(AGILITY_AGENT_UNIT_COST_NGN,2800)
assert.equal(AGILITY_AGENT_GROSS_PROFIT_PER_PACKAGE_NGN,200)
assert.equal(AGILITY_AGENT_GROSS_PROFIT_PER_BOX_NGN,2000)
assert.equal(AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN,21000)
assert.equal(AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN,7000)
assert.equal(AGILITY_OPAY_ACCOUNT_NUMBER,'8136003459')
assert.ok(AGILITY_VARIANTS.length>=4,'Agility variants')
const {getAgilityTotals,getAgilityCompanyEconomics,isValidAgilityCompanyCost,nextAgilityAdminStage}=require('../lib/agility.ts')
assert.deepEqual(getAgilityTotals(2),{
 boxCount:2,
 packageCount:20,
 packagesPerBox:10,
 retailUnitPriceNgn:3000,
 retailBoxValueNgn:30000,
 agentBoxPriceNgn:28000,
 agentUnitCostNgn:2800,
 agentPayableNgn:56000,
 retailValueNgn:60000,
 agentExpectedGrossProfitNgn:4000,
})
assert.deepEqual(getAgilityCompanyEconomics(2,21000),{
 wholesaleRevenueNgn:56000,
 totalPlannedCostNgn:42000,
 grossProfitNgn:14000,
 grossProfitPerBoxNgn:7000,
})
assert.equal(getAgilityCompanyEconomics(1,29000).grossProfitNgn,-1000)
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
for(const label of ['AGILITY','Intelligence in Action','Agent Store','₦3,000','10 packages','₦28,000','₦2,000','₦7,000','Wholesaler','Retailer','OPay'])assert.ok(agilityHtml.includes(label),label)
for(const route of [
 '/api/agility/payment/opay/receipt/route.ts',
 '/api/admin/agility/payment/opay/verify/route.ts',
 '/api/agility/receive/route.ts',
 '/api/agility/sales/route.ts',
 '/api/admin/agility/stock/route.ts',
])assert.ok(fs.existsSync(path.join(root,'app',route)),route+' exists')
assert.ok(!fs.existsSync(path.join(root,'app/api/agility/payment/callback/route.ts')),'Agility Flutterwave callback removed')
assert.ok(!fs.existsSync(path.join(root,'app/api/agility/payment/webhook/route.ts')),'Agility Flutterwave webhook removed')
assert.ok(fs.existsSync(path.join(root,'gcp-migration/agility.sql')),'Agility production migration exists')
const fneSource=fs.readFileSync(path.join(root,'lib/fne.ts'),'utf8')
assert.match(fneSource,/randomInt/)
assert.match(fneSource,/100_000_000_000/)
assert.match(fneSource,/1_000_000_000_000/)
assert.ok(!fneSource.includes('let sequence = 1'),'FNE must not use sequential File Numbers')
assert.ok(!fneSource.includes('ORDER BY file_number DESC'),'FNE must not derive the next File Number from the previous one')
const clientLoginSource=fs.readFileSync(path.join(root,'app/client/login/page.tsx'),'utf8')
assert.ok(clientLoginSource.includes('WEAVE-583104927361'),'Client login shows random File Number format')
const opayApiSource=fs.readFileSync(path.join(root,'app/api/deposit/opay/route.ts'),'utf8')
assert.match(opayApiSource,/deposit:\s*result\[0\]/)
assert.match(opayApiSource,/admin', 'agent', 'bridger/)
assert.match(opayApiSource,/WEAVE_OPAY_ACCOUNT_NUMBER/)
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
assert.match(loginSource,/sessionStorage\.setItem\(AGILITY_AGENT_LOGIN_AD_KEY, '1'\)/)
assert.match(agentDashboardSource,/AgilityAgentLoginAd/)
assert.match(agentDashboardSource,/sessionStorage\.removeItem\(AGILITY_AGENT_LOGIN_AD_KEY\)/)
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
assert.ok(departmentEntrySource.includes('Enter With Music'),'Department Entry is music-gated')
assert.ok(departmentEntrySource.includes('3 Flame Coin'),'Department Entry ticket price shown')
assert.ok(departmentEntrySource.includes('WEAVE Payment Center · OPay'),'Department Entry OPay center shown')
assert.ok(departmentEntrySource.includes('Use Code & Continue Registration'),'Departmental code release flow shown')
assert.ok(departmentTicketLibSource.includes('DEPARTMENT_ENTRY_TICKET_PRICE_FLAME_COIN = 3'),'Department Entry ticket costs 3 Flame Coin')
assert.ok(departmentTicketLibSource.includes('getTrxPaymentNgnRate'),'Department Entry converts Flame Coin/TRX value to Naira')
assert.ok(departmentTicketLibSource.includes("'department_entry'"),'Administration notifications created for Department Entry')
assert.ok(departmentTicketLibSource.includes('issueDepartmentalCode'),'Code is issued from verified ticket flow')
assert.ok(departmentRegisterSource.includes('DepartmentEntryTicketGate'),'Agent/Bridger registration uses paid ticket gate')
assert.ok(!departmentRegisterSource.includes('Chat Administration'),'Old manual visitor code-request gate removed')
assert.ok(departmentAdminPanelSource.includes('Awaiting Verification'),'Administration can verify entry payments')
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
const adminDashboardNotificationSource=fs.readFileSync(path.join(root,'app/(app)/admin/dashboard/page.tsx'),'utf8')
assert.ok(depositNotificationSource.includes('deposit_pending'),'Deposit submissions create Admin notifications')
assert.ok(depositNotificationSource.includes('deposit_approved'),'Approved deposits notify originating users')
assert.ok(depositNotificationSource.includes('deposit_rejected'),'Rejected deposits notify originating users')
assert.ok(opayDepositSource.includes('notifyDepositSubmitted'),'Agent/Bridger OPay deposits notify Administration')
assert.ok(opayVerifySource.includes('notifyDepositDecision'),'OPay decisions notify Agent/Bridger')
assert.ok(tronDepositSource.includes('notifyDepositSubmitted'),'Client TRX deposits notify Administration')
assert.ok(tronVerifySource.includes('notifyDepositDecision'),'TRX decisions notify Client')
assert.ok(bridgeDepositSource.includes('notifyDepositSubmitted'),'Bridge File Folder payments notify Administration')
assert.ok(bridgeVerifySource.includes('notifyUser'),'Bridge payment decisions notify the responsible Bridger')
assert.ok(notificationsApiSource.includes('getAuthUser'),'Notification inbox requires authenticated identity')
assert.ok(!notificationsApiSource.includes("searchParams.get('userId')"),'Notification inbox cannot select another user by query parameter')
assert.ok(notificationBellSource.includes("setInterval(fetchNotifications, 5000)"),'Notification bell polls promptly')
assert.ok(opayDepositSource.includes('/admin/dashboard#deposits'),'OPay notification deep-links to OPay review')
assert.ok(tronDepositSource.includes('/admin/dashboard#tron'),'TRX notification deep-links to TRX review')
assert.ok(bridgeDepositSource.includes('/admin/dashboard#bridge'),'Bridge notification deep-links to Bridge review')
assert.ok(adminDashboardNotificationSource.includes("hash === '#deposits'"),'Admin dashboard handles OPay notification hash')
assert.ok(adminDashboardNotificationSource.includes("hash === '#tron'"),'Admin dashboard handles TRX notification hash')
assert.ok(adminDashboardNotificationSource.includes("hash === '#bridge'"),'Admin dashboard handles Bridge notification hash')
const enterpriseDreamLibSource=fs.readFileSync(path.join(root,'lib/enterprise-dream.ts'),'utf8')
const enterpriseClientSource=fs.readFileSync(path.join(root,'app/api/client/enterprise/route.ts'),'utf8')
const enterpriseAdminSource=fs.readFileSync(path.join(root,'app/api/admin/enterprise/route.ts'),'utf8')
const enterpriseSystemSwitchSource=fs.readFileSync(path.join(root,'app/api/client/system-switch/route.ts'),'utf8')
const enterprisePanelSource=fs.readFileSync(path.join(root,'components/system-switch/enterprise-dream-panel.tsx'),'utf8')
const enterpriseSidebarSource=fs.readFileSync(path.join(root,'components/app-sidebar.tsx'),'utf8')
assert.ok(enterpriseDreamLibSource.includes('enterprise_applications'),'Enterprise Dream application schema exists')
assert.ok(enterpriseDreamLibSource.includes('enterprise_legions'),'Enterprise Legion schema exists')
assert.ok(enterpriseClientSource.includes("['lord', 'lady']"),'Client may request only Lord or Lady elevation')
assert.ok(enterpriseClientSource.includes('sustainabilityPlan'),'Elevation requires a life-sustainability plan')
assert.ok(enterpriseClientSource.includes('notifyAdministrators'),'Administration is notified of enterprise-plan submission')
assert.ok(enterpriseAdminSource.includes("workshop_type='enterprise_dream'"),'Approval changes the File Folder workshop to Enterprise Dream')
assert.ok(enterpriseAdminSource.includes('notifyUser'),'Client is notified after Administration decision')
assert.ok(enterpriseSystemSwitchSource.includes('getEnterpriseDream'),'Client System Switch returns Enterprise Dream state')
assert.ok(enterpriseSystemSwitchSource.includes("'Legions'"),'Approved Enterprise Dream exposes Legions module')
assert.ok(enterprisePanelSource.includes('Add Legion'),'Approved Lord/Lady can add Legion participation')
assert.ok(enterpriseSidebarSource.includes('/admin/enterprise-dream'),'Administration can reach Enterprise Dream authority')
for(const file of [
 'app/(app)/admin/enterprise-dream/page.tsx',
 'app/api/client/enterprise/legions/route.ts',
 'migrations/20260923_enterprise_dream_workshop.sql',
])assert.ok(fs.existsSync(path.join(root,file)),file+' exists')
console.log('PASS: Lord/Lady Enterprise Dream integration, Legion access, enterprise notifications;  Deposit lifecycle notifications, authenticated inbox, review deep links;  Department Entry tickets, music gate, OPay verification, paid code release;  Authority hydration, admin panels, destination routes, client workshop rendering, payment verification, random File Numbers, shared OPay rail, Agility economics, delivery, historical pricing, fulfillment, login advertisement, tutorial, and River assistance')

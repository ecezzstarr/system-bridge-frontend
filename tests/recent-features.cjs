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
const {AGILITY_VARIANTS,AGILITY_UNIT_PRICE_NGN,AGILITY_PACKAGES_PER_BOX,AGILITY_BOX_PRICE_NGN}=require('../lib/agility-catalog.ts')
assert.equal(AGILITY_UNIT_PRICE_NGN,3000)
assert.equal(AGILITY_PACKAGES_PER_BOX,10)
assert.equal(AGILITY_BOX_PRICE_NGN,30000)
assert.ok(AGILITY_VARIANTS.length>=4,'Agility variants')
const {getAgilityTotals,nextAgilityAdminStage}=require('../lib/agility.ts')
assert.deepEqual(getAgilityTotals(2),{boxCount:2,packageCount:20,packagesPerBox:10,unitPriceNgn:3000,boxPriceNgn:30000,totalNgn:60000})
assert.equal(nextAgilityAdminStage('paid'),'heating')
assert.equal(nextAgilityAdminStage('heating'),'packed')
assert.equal(nextAgilityAdminStage('packed'),'boxed')
assert.equal(nextAgilityAdminStage('boxed'),'dispatched')
assert.equal(nextAgilityAdminStage('dispatched'),'delivered')
assert.equal(nextAgilityAdminStage('delivered'),null)
auth={...auth,user:{id:'agent-test',name:'Agent',role:'agent'},token:'test-token'}
const Agility=require('../app/(app)/agility/page.tsx').default
const agilityHtml=renderToStaticMarkup(React.createElement(Agility))
for(const label of ['AGILITY','Intelligence in Action','Agent Store','₦3,000','10 packages','₦30,000','Pay first'])assert.ok(agilityHtml.includes(label),label)
for(const route of ['/api/agility/payment/callback/route.ts','/api/agility/payment/webhook/route.ts','/api/agility/receive/route.ts','/api/agility/sales/route.ts','/api/admin/agility/stock/route.ts'])assert.ok(fs.existsSync(path.join(root,'app',route)),route+' exists')
console.log('PASS: Authority hydration, admin panels, destination routes, client workshop rendering, payment verification, Agility paid-order workflow')

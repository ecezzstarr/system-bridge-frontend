const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
const root=path.resolve(__dirname,'..'),read=x=>fs.readFileSync(path.join(root,x),'utf8'),exists=x=>fs.existsSync(path.join(root,x))
const src={
 bridger:read('components/bridger/bridger-workplace.tsx'),agent:read('components/agent/agent-workplace.tsx'),
 market:read('app/(app)/weave/market/prospects/page.tsx'),email:read('app/(app)/bridger/email-outreach/page.tsx'),
 river:read('app/(app)/bridger/river-call-outreach/page.tsx'),numbers:read('app/(app)/bridger/numbers/page.tsx'),
 social:read('app/(app)/distribution-studio/page.tsx'),dist:read('app/(app)/agent/distribution/page.tsx'),
 profile:read('app/api/bridger/prospects/route.ts'),distApi:read('app/api/agent/distribution/route.ts'),
 stock:read('app/api/agility/stock/route.ts'),
}
for(const [name,code] of Object.entries(src)){
 const jsx=['bridger','agent','market','email','river','numbers','social','dist'].includes(name)
 const tree=ts.createSourceFile(name,code,ts.ScriptTarget.Latest,true,jsx?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 assert.equal(tree.parseDiagnostics.length,0,name+' parses')
}
for(const role of ['bridger','agent']){
 const catalog=read('lib/'+role+'-workplace-catalog.ts')
 const hrefs=[...catalog.matchAll(/href:\s*'(\/[^']+)'/g)].map(m=>m[1])
 const missing=[...new Set(hrefs)].filter(u=>!exists('app/(app)'+u+'/page.tsx')&&!exists('app'+u+'/page.tsx'))
 assert.deepEqual(missing,[],role+' links existing workstations')
 for(const route of ['/image-workshop/business','/image-workshop/branding','/weave/lifestyles/support'])assert(catalog.includes(route),role+' includes '+route)
}
const checks=[
 [src.bridger,'data-bridger-daily-job-guide','Bridger onboarding'],
 [src.agent,'data-agent-daily-job-guide','Agent onboarding'],
 [src.bridger,"place.href+'?tab=mine'",'Direct My Prospects link'],
 [src.market,"URLSearchParams(window.location.search).get('tab')==='mine'",'My Prospects tab deep link'],
 [src.market,'data-whatsapp-send-requires-confirmation','Explicit message confirmation'],
 [src.market,'purchaseCompleted','Completed purchases with pending reconciliation'],
 [src.market,'Retry my records','Prospect load error retry'],
 [src.profile,'Enter a real international WhatsApp number','E.164 number check'],
 [src.email,'data-bridger-email-outreach-steps','Email outreach help'],
 [src.email,'data.providerConfigured&&data.sender','Email actual provider readiness'],
 [src.river,'!ownWhatsAppReady||!state?.enabled||!state.providerReady','River provider and owner settings prerequisites'],
 [src.numbers,'System Switch','Number Bay pricing names'],
 [src.social,'data-social-outreach-actual-delivery','Real publishing and authorization workflow'],
 [src.dist,'data-agent-distribution-quick-start','Agent real distribution guide'],
 [src.dist,'/api/agility/stock?scope=distribution','Combined stock loading explicit'],
 [src.stock,"searchParams.get('scope')==='distribution'",'Combined scope no referrer dependency'],
 [src.dist,'/api/ember/receive','Ember receipt route'],
 [src.dist,'/api/electrolyte/receive','Electrolyte receipt route'],
 [src.dist,'/api/agility/receive','Agility receipt route'],
 [src.distApi,'packages_reported_sold=packages_reported_sold+','Atomic sold increment'],
 [src.distApi,'packages_reported_sold+','Stock availability constraint'],
 [src.distApi,'FOR UPDATE','Serialized collections'],
 [src.distApi,'const officialAmountNgn = packageCount * Number(order.retail_unit_price_ngn)','Official supply price'],
 [src.dist,'only the money you have collected','Agent records actual collections'],
 [src.dist,'Retry stock and outlet records','Agent failed records are not zero'],
 [read('app/api/bridger/email-outreach/route.ts'),"status='acquired'",'Email lead persistent acquisition'],
 [read('app/api/bridger/river-calls/route.ts'),'confirmedRequestedCall','River explicit consent'],
 [read('app/api/bridger/river-calls/route.ts'),'balance_trx','River primary wallet charge'],
 [read('app/(app)/bridger/ai-video-call/page.tsx'),'data-bridger-ai-video-call="peer-to-peer"','Private WEAVE video room connected to Hope'],
 [read('app/(app)/bridger/bridge-ai/page.tsx'),'BRIDGE_AI_TEMPLATE_PRICE','Bridge AI real price'],
 [read('app/api/distribution-studio/route.ts'),"action === 'request_connection'",'Social channel provider authorization'],
 [read('app/api/market/prospects/purchase/route.ts'),'finalizeProspectPurchase','Prospect commission reconciliation'],
 [read('app/api/agent/cakes/route.ts'),'getAuthUser','Cake role access'],
 [read('app/api/agent/commissions/route.ts'),'getAuthUser','Commission role access'],
]
for(const [body,fragment,desc] of checks)assert(body.includes(fragment),desc)
assert(!src.numbers.includes(' FC<'),'Old FC names absent from Number Bay')
console.log('PASS: '+checks.length+' workflow checks, all Agent and Bridger route links, priced services, provider readiness, receipts, stock, consent and truthful records')

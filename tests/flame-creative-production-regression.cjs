const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8'),out={}
const engine=read('lib/weave-creative-production.ts')
const js=ts.transpileModule(engine,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const env={}
let upstream=0,db=0
const modules={
 'node:crypto':{randomUUID:()=> 'id'},
 'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}},
 '@/lib/db':{getPool:()=>{db++;throw Error('Unexpected DB')}},
 '@/lib/weave-media-storage':{},
 '@/lib/weave-image-workshop':{IMAGE_MODELS:['gpt-image-2.5-flare'],IMAGE_PRESETS:{cinematic:'Cinematic'},IMAGE_SIZES:['1024x1024'],IMAGE_WORKSHOP_ROLES:new Set(['admin','client'])},
 '@/lib/flame-usage':{},
 '@/lib/flame-usage-policy':{FLAME_USAGE_COST:{creative_image:50,creative_text:5}},
}
vm.runInNewContext(js,{exports:out,require:p=>modules[p],process:{env},fetch:()=>{upstream++;throw Error('Unexpected provider')}})
async function run(){
 assert.equal(out.creativeAvailability('client').image,false)
 assert.equal(out.creativeAvailability('admin').costs.image,0)
 assert.equal(out.creativeAvailability('client').costs.image,50)
 assert.equal(out.flameCreativeIntent('generate image: sunset'),null)
 assert.equal(out.flameCreativeIntent('do not generate image with provider: sunset'),null)
 assert.equal(out.flameCreativeIntent('generate image with provider: sunset').kind,'image')
 assert.equal(out.flameCreativeIntent('write content with provider: an introduction').kind,'text')
 const id='12345678-1234-4234-8234-123456789abc'
 const body={kind:'image',prompt:'A sunset landscape',requestId:id,allowProvider:true}
 assert.equal((await out.runCreativeProduction({id,role:'visitor'},body)).status,403)
 assert.equal((await out.runCreativeProduction({id,role:'client'},{...body,allowProvider:false})).status,400)
 assert.equal((await out.runCreativeProduction({id,role:'client'},{...body,preset:'__proto__'})).status,400)
 assert.equal((await out.runCreativeProduction({id,role:'client'},{...body,prompt:'password: abc'})).status,400)
 assert.equal((await out.runCreativeProduction({id,role:'client'},body)).status,503)
 assert.equal(db,0);assert.equal(upstream,0)
 env.WEAVE_CREATIVE_API_KEY='test-only';env.WEAVE_CREATIVE_IMAGE_MODEL='gpt-image-2.5-flare'
 assert.equal(out.creativeAvailability('client').image,false)
 env.WEAVE_CREATIVE_ENABLED='true'
 assert.equal(out.creativeAvailability('client').image,true)
 assert(engine.includes("pg_advisory_xact_lock(hashtext('weave-creative-budget'))"))
 assert(engine.includes("old.status==='completed'"))
 assert(engine.includes("weave-private/images/"))
 assert(engine.includes("withFlameUsage(user.id,user.role"))
 assert(engine.includes("redirect:'error'")&&engine.includes("store:false"))
 for(const p of ['app/api/personal-flame/route.ts','app/api/client/bridge-ai/route.ts','app/api/image-workshop/production/route.ts'])assert(read(p).includes('runCreativeProduction('))
 for(const p of ['lib/weave-creative-production.ts','app/(app)/image-workshop/production/page.tsx','app/api/image-workshop/production/route.ts']){
  const file=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  assert.deepEqual(file.parseDiagnostics,[],p+' parses')
 }
 console.log('Creative production consent, disabled state and private workshop contract passed')
}
run().catch(e=>{console.error(e);process.exitCode=1})

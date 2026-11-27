const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8'),f={}
const code=ts.transpileModule(read('lib/flame-web-search.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
let sent=[],queries=[]
const conn={query:async(text,args)=>{queries.push({text,args});return {rowCount:1}},release(){}}
const env={WEAVE_WEB_SEARCH_API_KEY:'test-only'}
vm.runInNewContext(code,{exports:f,require:()=>({sql:async()=>[],getPool:()=>({connect:async()=>conn})}),process:{env},URL,TextDecoder,AbortSignal,fetch:async(url,options)=>{sent.push({url:String(url),options});return new Response(JSON.stringify({web:{results:[{title:'<b>Public source</b>',url:'https://example.com/a',description:'<em>Public excerpt</em>'}]}}))}})
async function run(){
 assert.equal(f.flameWebQuery('Could you search the web for cassava processing?'),'cassava processing?')
 assert.equal(f.flameWebQuery('web search: solar power'),'solar power')
 assert.equal(f.flameWebQuery('how can I search the web for solar power'),null)
 assert.equal(f.flameWebQuery('do not search the web for my account'),null)
 assert.throws(()=>f.validateFlameWebQuery('password: test'))
 assert.throws(()=>f.validateFlameWebQuery('a'.repeat(401)))
 const records=f.normalizeFlameSearch({web:{results:[{title:'bad',url:'javascript:alert(1)'},{title:'bad',url:'https://user:password@example.com'},{title:'<b>Title</b>',url:'https://example.com',description:'<i>Text</i>'}]}})
 assert.equal(records.length,1)
 assert.equal(records[0].title,'Title')
 assert.equal(records[0].description,'Text')
 const result=await f.flameWebSearchReply('test-actor','solar power')
 assert.match(result,/https:\/\/example\.com\/a/)
 assert.match(result,/not independently verified/)
 assert.equal(sent.length,1)
 assert.equal(new URL(sent[0].url).origin,'https://api.search.brave.com')
 assert.equal(new URL(sent[0].url).searchParams.get('q'),'solar power')
 assert.equal(sent[0].options.redirect,'error')
 assert.equal(sent[0].options.headers['X-Subscription-Token'],'test-only')
 assert(!sent[0].url.includes('test-actor'))
 assert(queries.some(q=>q.args?.[0]==='company'))
 assert(queries.some(q=>q.args?.[0]==='account:test-actor'))
 delete env.WEAVE_WEB_SEARCH_API_KEY
 await assert.rejects(f.searchFlameWeb('test-actor','solar power'),/not configured/)
 assert.equal(sent.length,1)
 for(const path of ['app/api/personal-flame/route.ts','app/api/client/bridge-ai/route.ts','app/api/eight/dev/route.ts'])assert(read(path).includes('await flameWebSearchReply('))
 console.log('Native Flame web search contract passed')
}
run().catch(error=>{console.error(error);process.exitCode=1})

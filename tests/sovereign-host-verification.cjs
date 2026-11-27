const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {stripTypeScriptTypes}=require('node:module')
const root=path.resolve(__dirname,'..')
const sha='a'.repeat(40)
const plan={node_id:'weave-owned-01',target_ipv4:'8.8.4.4',release_sha:sha}
const source=fs.readFileSync(path.join(root,'app/api/admin/sovereign-host-transition/route.ts'),'utf8')
const compiled=stripTypeScriptTypes(source.replace(/^import .*\n/gm,'').replace(/^export /gm,''),{mode:'transform'})

async function verify({ipv4=[plan.target_ipv4],ipv6=[],body,fetchFails=false,dnsFails=false}={}){
 let fetched=false
 const check=new Function('resolve4','resolve6','fetch','isIP',compiled+'\nreturn verifyPublicDestination')(
  async()=>ipv4,
  async()=>{if(dnsFails)throw Object.assign(Error('DNS timed out'),{code:'ETIMEOUT'});return ipv6},
  async()=>{fetched=true;if(fetchFails)throw Error('Unreachable');return {
   ok:true,json:async()=>body??{status:'ready',releaseSha:sha,
    checks:{database:true,accounts:true,media:true},host:{provider:'weave-owned',nodeId:plan.node_id}},
  }},require('node:net').isIP,
 )
 await check(plan)
 return fetched
}

;(async()=>{
 assert.equal(await verify(),true)
 await assert.rejects(verify({ipv4:[]}),/Every public IPv4/)
 await assert.rejects(verify({ipv4:[plan.target_ipv4,'8.8.8.8']}),/mixed Oracle\/candidate/)
 await assert.rejects(verify({ipv6:['2606:4700::1111']}),/IPv6/)
 await assert.rejects(verify({dnsFails:true}),/DNS timed out/)
 await assert.rejects(verify({fetchFails:true}),/Unreachable/)
 const ready={status:'ready',releaseSha:sha,checks:{database:true,accounts:true,media:true}}
 await assert.rejects(verify({body:ready}),/approved host identity/)
 await assert.rejects(verify({body:{...ready,host:{provider:'oracle',nodeId:plan.node_id}}}),/approved host identity/)
 await assert.rejects(verify({body:{...ready,host:{provider:'weave-owned',nodeId:'another-host'}}}),/approved host identity/)
 await assert.rejects(verify({body:{...ready,releaseSha:'b'.repeat(40),host:{provider:'weave-owned',nodeId:plan.node_id}}}),/exact release/)
 await assert.rejects(verify({body:{...ready,checks:{database:true,accounts:true,media:false},host:{provider:'weave-owned',nodeId:plan.node_id}}}),/media/)
 const probeSource=fs.readFileSync(path.join(root,'app/api/infrastructure/sovereign-probe/route.ts'),'utf8')
 const probeCode=stripTypeScriptTypes(probeSource.replace(/^import .*\n/gm,'').replace(/^export /gm,''),{mode:'transform'})
 const rows=[
  {node_id:'weave-owned-01',release_sha:sha,ready:true,database_fingerprint:'current-db',received_at:new Date()},
  {node_id:'weave-old-02',release_sha:'b'.repeat(40),ready:true,database_fingerprint:'current-db',received_at:new Date()},
  {node_id:'weave-staging-03',release_sha:sha,ready:true,database_fingerprint:'staging-db',received_at:new Date()},
  {node_id:'weave-stale-04',release_sha:sha,ready:true,database_fingerprint:'current-db',received_at:new Date(Date.now()-16*60*1000)},
 ]
 const get=new Function('getPool','requireWorkshopAuthorization','currentDatabaseEndpointFingerprint','NextResponse','process',probeCode+'\nreturn GET')(
  ()=>({query:async sql=>({rows:sql.includes('SELECT DISTINCT')?rows:[]})}),
  async()=>({authorized:true}),()=> 'current-db', {json:body=>body},
  {env:{WEAVE_RELEASE_SHA:sha,WEAVE_SOVEREIGN_PROBE_TOKEN:'private-probe-value'.repeat(3)}},
 )
 const state=await get({})
 assert.deepEqual(state.nodes.map(n=>n.ready),[true,false,false,false])
 assert.equal(state.setup.reportingConfigured,true)
 assert.equal(state.setup.productionDatabaseIdentified,true)
 assert.equal(state.setup.productionReleaseSha,sha)
 assert.ok(!JSON.stringify(state).includes('private-probe-value'))
 console.log('Sovereign host verification: approved identity, exclusive routing, IPv6, network failures, media and pinned release passed')
})().catch(error=>{console.error(error);process.exitCode=1})

const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {stripTypeScriptTypes}=require('node:module')
const crypto=require('node:crypto')
const root=path.resolve(__dirname,'..')
const read=file=>fs.readFileSync(path.join(root,file),'utf8')
function load(pool,trainingExchange){
 const source=stripTypeScriptTypes(read('lib/weave-laptop-worker.ts').replace(/\r\n/g,'\n').replace(/^import .*\n/gm,'').replace(/^export /gm,''),{mode:'transform'})
 return new Function('getPool','createHash','randomBytes','trainingExchange',source+'\nreturn {cleanLaptopSnapshot,readLaptopJson,queueLaptopJob,createLaptopPairing,pairLaptop,laptopExchange,revokeLaptop,laptopState,operatorIds}')(
  ()=>pool,crypto.createHash,crypto.randomBytes,trainingExchange)
}
module.exports={load}
if(require.main===module)(async()=>{
 const lib=load({query:()=>{throw Error('Unexpected DB access')}})
 assert.deepEqual(lib.cleanLaptopSnapshot({windows:true,wslInstalled:false,memoryGiB:7.94,logicalProcessors:4,
  token:'never-transmit',hostname:'private-device',address:'private-ip',freeDiskGiB:Infinity,administrator:'true'}),
  {windows:true,wslInstalled:false,logicalProcessors:4,memoryGiB:7.9})
 assert.throws(()=>lib.cleanLaptopSnapshot([]),/status report/)
 assert.deepEqual(await lib.readLaptopJson(new Request('https://local.test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"action":"poll"}'})),{action:'poll'})
 await assert.rejects(lib.readLaptopJson(new Request('https://local.test',{method:'POST',body:'{}'})),e=>e.status===415)
 await assert.rejects(lib.readLaptopJson(new Request('https://local.test',{method:'POST',headers:{'Content-Type':'application/json'},body:'[]'})),e=>e.status===400)
 await assert.rejects(lib.readLaptopJson(new Request('https://local.test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'x'.repeat(9000)})})),e=>e.status===413)
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 await assert.rejects(lib.queueLaptopJob(id,id,'run_command','RUN'),/supported operation/)
 await assert.rejects(lib.queueLaptopJob(id,id,'__proto__','RUN'),/supported operation/)
 await assert.rejects(lib.queueLaptopJob(id,id,'install_linux','CHECK LAPTOP'),/exact operation/)
 await assert.rejects(lib.createLaptopPairing(id,'Laptop','YES'),/CONNECT LAPTOP/)
 await assert.rejects(lib.pairLaptop('guess'),e=>e.status===401)
 await assert.rejects(lib.laptopExchange('a'.repeat(64),{action:'exec',command:'anything'}),/Unsupported worker/)
 const saved=process.env.WEAVE_WORKSHOP_ADMIN_IDS
 try{
  process.env.WEAVE_WORKSHOP_ADMIN_IDS='not-a-uuid';assert.deepEqual(lib.operatorIds(),[])
  process.env.WEAVE_WORKSHOP_ADMIN_IDS=id;assert.deepEqual(lib.operatorIds(),[id])
 }finally{if(saved===undefined)delete process.env.WEAVE_WORKSHOP_ADMIN_IDS;else process.env.WEAVE_WORKSHOP_ADMIN_IDS=saved}
 const worker=read('public/host/weave-laptop-worker.ps1')
 const wiring=read('tests/wiring.cjs')
 const normalizeSource=wiring.slice(wiring.indexOf('function normalizeLocal('),wiring.indexOf('\nfunction matches('))
 const normalize=new Function('fs','path','root',normalizeSource+'\nreturn normalizeLocal')(fs,path,root)
 assert.equal(normalize('/host/weave-laptop-worker.ps1'),null,'Existing worker download is a public asset')
 assert.equal(normalize('/host/weave-laptop-worker.ps1?v=1'),null)
 assert.equal(normalize('/host/definitely-missing-worker.ps1'),'/host/definitely-missing-worker.ps1','Missing downloads must still fail wiring')
 const denied={status:401}
 const adminSource=stripTypeScriptTypes(read('app/api/admin/laptop-worker/route.ts').replace(/\r\n/g,'\n').replace(/^import .*\n/gm,'').replace(/^export /gm,''),{mode:'transform'})
 const admin=new Function('requireWorkshopAuthorization',adminSource+'\nreturn {GET,POST}')(
  async()=>({authorized:false,response:denied}))
 const malicious={get body(){throw Error('An unauthorized request body must not be consumed')}}
 assert.equal(await admin.GET(malicious),denied)
 assert.equal(await admin.POST(malicious),denied)
 assert.doesNotMatch(worker,/Invoke-Expression|Invoke-Command|ScriptBlock::Create|DownloadString|Set-ExecutionPolicy|Restart-Computer|\$job\.(command|script|arguments|url)/i)
 assert.match(worker,/-MaximumRedirection 0/)
 assert.match(worker,/Export-Clixml/)
 assert.match(worker,/SetAccessRuleProtection\(\$true,\$false\)/)
 assert.match(worker,/param\(\[switch\]\$Pair,\[switch\]\$AllowSetup/)
 if(process.platform!=='win32'){
  const normalized=worker.replace(/\r\n/g,'\n')
  const dockerSetup=normalized.split("$DockerSetup=@'\n")[1]?.split("\n'@")[0]
  assert.ok(dockerSetup,'Fixed Docker installation script is present')
  require('node:child_process').execFileSync('bash',['-n'],{input:dockerSetup,timeout:10000})
 }
 for(const route of ['app/api/admin/laptop-worker/route.ts','app/api/system/laptop-worker/route.ts']){
  assert.doesNotMatch(read(route),/execSync|spawn\(|child_process/)
 }
 assert.match(read('app/api/admin/laptop-worker/route.ts'),/requireWorkshopAuthorization/)
 assert.match(read('proxy.ts'),/pathname==='\/api\/system\/laptop-worker'/)
 assert.match(read('lib/weave-code-workshop.ts'),/weave-laptop-worker/)
 console.log('Laptop worker: bounded input, private telemetry, strict operations, authorization and credential boundaries passed')
})().catch(error=>{console.error(error);process.exitCode=1})

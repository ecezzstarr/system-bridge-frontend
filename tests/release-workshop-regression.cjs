const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const {execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')

const source=read('lib/weave-release-workshop.ts')
const code=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText
const stub={exports:{}}
vm.runInNewContext(code,{
  exports:stub.exports,
  require:name=>{
    if(name==='node:crypto')return {randomUUID:()=> '00000000-0000-4000-8000-000000000001'}
    if(name==='@/lib/db')return {sql:()=>Promise.reject(Error('DB must never run for pure contract checks'))}
    if(name==='@/lib/weave-deployment-records')return {listWeaveDeploymentRecords:()=>[]}
    throw Error('Unexpected import: '+name)
  },
}, {filename:'lib/weave-release-workshop.ts'})
const sha='0123456789abcdef0123456789abcdef01234567'
assert.equal(stub.exports.fullReleaseSha(sha),true)
for(const invalid of ['',null,'main','rm -rf /',sha+'a','../secrets','abc1234']){
  assert.equal(stub.exports.fullReleaseSha(invalid),false)
}

const api=read('app/api/admin/release-workshop/route.ts')
const workerApi=read('app/api/system/release-worker/route.ts')
const webPage=read('app/(app)/admin/release-workshop/page.tsx')
const script=read('selfhost/deploy-production.sh')
const worker=read('selfhost/release-worker.py')
const flow=read('.github/workflows/weave-selfhost-deploy.yml')
const nav=read('lib/weave-role-districts.ts')
const audit=read('lib/weave-deployment-records.ts')
assert.match(source,/WHERE status IN \('queued','running'\)/,'Only one running or queued job per host')
assert.match(source,/FOR UPDATE SKIP LOCKED/,'Concurrent pollers cannot claim the same request')
assert.match(source,/status IN \('healthy','rolled_back'\)/,'Rollback is restricted to known good releases')
assert.match(source,/lease_token=\$\{input.leaseToken\}/,'Completion is tied to the claimed job')
assert.match(api,/user.role!=='admin'/,'Only Administration can queue a release')
assert.match(api,/requestReleaseJob/,'Submission persists a request instead of running shell')
assert.match(workerApi,/WEAVE_RELEASE_CONTROL_TOKEN/,'Only host-controlled token can execute')
assert.match(workerApi,/timingSafeEqual/,'Worker token comparison is constant time')
assert.match(workerApi,/completeReleaseJob/,'Host reports verified completion')
assert.match(webPage,/ROLL BACK/,'Manual rollbacks require explicit confirmation')
assert.match(webPage,/Request verified deployment/,'Production release is requested, not claimed successful')
assert.match(nav,/href:'\/admin\/release-workshop'/,'Administration contains Release Workshop')
assert.match(script,/WEAVE_DEPLOY_ROLLBACK_SHA/,'Host accepts only an exact rollback SHA')
assert.match(script,/merge-base --is-ancestor/,'Rollback remains inside canonical main history')
assert.match(script,/docker image inspect "weave-release:\$TARGET_SHA"/,'Retained historical image takes priority')
assert.match(script,/wait_for_health "https:\/\/\$\{DOMAIN\}\/api\/health"/,'Public release SHA must match')
assert.match(worker,/def is_good_ci/,'Host itself verifies CI evidence')
assert.match(worker,/head_branch.*main/,'CI belongs to main')
assert.match(worker,/subprocess.run/,'Execution stays outside the Next.js app')
assert.match(worker,/leaseToken/,'Host completion is authenticated against lease')
assert.match(flow,/workflow_dispatch/,'Deployment no longer runs automatically on every commit')
assert.doesNotMatch(flow,/workflow_run:/,'CI does not trigger an unapproved production deployment')
assert.match(audit,/flame_system_records/,'Flame retains real deployment state')
assert.match(audit,/eight_scroll/,'Sovereign retains authority and rollback history')

execFileSync('bash',['-n',path.join(root,'selfhost/deploy-production.sh')])
execFileSync('python3',['-c',
  'import ast, pathlib; ast.parse(pathlib.Path('+JSON.stringify(path.join(root,'selfhost/release-worker.py'))+').read_text())'
])
console.log('PASS: Sovereign release queue, verified deploy, host control, rollback and portable scripts')

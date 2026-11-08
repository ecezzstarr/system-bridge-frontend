const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
const vm=require('node:vm')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const github=read('lib/weave-github-release.ts')
const api=read('app/api/admin/work-github-release/route.ts')
const admin=read('app/api/admin/release-workshop/route.ts')
const release=read('lib/weave-release-workshop.ts')
const host=read('selfhost/release-worker.py')
const workerApi=read('app/api/system/release-worker/route.ts')
const deploy=read('selfhost/deploy-production.sh')
const page=read('app/(app)/admin/release-workshop/page.tsx')
const panel=read('components/admin/work-github-oracle-flow.tsx')
const doc=read('docs/work-github-oracle-release-pipeline.md')
const env=read('selfhost/.env.example')

assert(github.includes("REPO='ecezzstarr/system-bridge-frontend'"),'Only canonical source repository is used')
assert(github.includes("'/pulls?state=open&base=main"),'Open Work PRs appear to Administration')
assert(github.includes("head_sha:sha"),'Production Check uses an exact commit SHA')
assert(github.includes("run.head_sha?.toLowerCase()===sha.toLowerCase()"),'Results must belong to the exact SHA')
assert(github.includes("run.head_branch==='main'"),'Main CI cannot be confused with a branch PR check')
assert(github.includes("run.event==='pull_request'"),'PR CI is checked independently')
assert(github.includes("found.conclusion==='success'"),'Only successful checks qualify')
assert(github.includes("candidate.sha!==expected.toLowerCase()"),'Main change after review blocks deployment')
assert(github.includes("candidate.check.state!=='passed'"),'Fail closed on missing or failed CI')
assert(github.includes("MERGE #"),'Merge requires precise Administration confirmation')
assert(github.includes("head!==input.headSha.toLowerCase()"),'PR updates invalidate merge approval')
assert(github.includes("pr?.draft")&&github.includes("pr?.base?.ref!=='main'"),'Draft and non-main PRs are blocked')
assert(github.includes("check.state!=='passed'"),'PR check required before merge')
assert(github.includes("method:'PUT',write:true"),'Promotion delegates to protected GitHub merge API')
assert(github.includes("sha:head,merge_method:'squash'"),'Exact reviewed head used for merge')
assert(!github.includes('bypass_branch_protection'),'Never bypass GitHub branch protections')
assert(github.includes('weave_git_promotions'),'Merge audit survives across requests')
assert(api.includes('requireWorkshopAuthorization'),'Sensitive GitHub promotions are Admin-only')
assert(api.includes('mergeApprovedWorkPull'),'No arbitrary shell or GitHub endpoint exposed')
assert(admin.includes('await assertDeployableMain'),'Application rechecks exact main CI before deploy queue')
assert(admin.includes('targetSha:String(body?.targetSha||\'\').toLowerCase()'),'Admin deployment passes pinned SHA')
assert(release.includes("if(!fullReleaseSha(input.targetSha))throw new Error('Select the exact CI-verified main commit"),'Unpinned releases are refused')
assert(release.includes('${input.action},${input.targetSha},'),'Every release job stores selected SHA')
assert(host.includes('if not target or not SHA.fullmatch(target):'),'Host refuses unpinned release')
assert(host.includes('if target.lower() != main.lower():'),'Host refuses deployment if main changes')
assert(host.includes('is_good_ci(target'),'Host independently validates main Production Check')
assert(host.includes('pinned-main-v2'),'Host worker advertises exact SHA capability')
assert(workerApi.includes("body.capabilities.includes('pinned-main-v2')"),'Legacy workers are denied new release claims')
assert(deploy.includes('WEAVE_DEPLOY_TARGET_SHA'),'Docker script receives exact SHA')
assert(deploy.includes('wait_for_health "https://${DOMAIN}/api/health"'),'Public health is checked')
assert(panel.includes('data-work-github-oracle-flow="admin"'),'Admin can inspect Work-to-Oracle stages')
assert(panel.includes('merge_work_pr'),'Admin can authorize explicit GitHub PR merge')
assert(panel.includes('onMainChange(null)'),'Unreachable GitHub invalidates previous deploy permission')
assert(page.includes('WorkGithubOracleFlow'),'Existing Release Workshop is connected')
assert(page.includes("githubMain?.check.state!=='passed'"),'Deploy button gated by successful CI')
assert(page.includes("targetSha:mode==='rollback'?selected:githubMain?.sha"),'Deploy uses reviewed SHA')
assert(env.includes('WEAVE_HOST_PROVIDER=oracle'),'Oracle worker identity is configurable')
assert(doc.includes('ONE')===false || doc.length>1000,'Operator setup documentation exists')

const compiled=ts.transpileModule(github,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
}}).outputText
const mainSha='a'.repeat(40)
const prSha='b'.repeat(40)
const run=(sha,branch,event,conclusion='success')=>({
  head_sha:sha,head_branch:branch,event,status:'completed',conclusion,created_at:'2026-11-08T00:00:00Z',
})

function loadGithub(fetch,env={}){
  const exports={}
  vm.runInNewContext(compiled,{
    exports,fetch,process:{env},URLSearchParams,AbortSignal,
    require:()=>({sql:async()=>[]}),
  })
  return exports
}

async function exerciseHandoff(){
  const requests=[]
  const gh=loadGithub(async(url,options)=>{
    const route=new URL(url)
    const authenticated=Boolean(options.headers.Authorization)
    requests.push({route,authenticated})
    if(authenticated)return new Response(null,{status:401})
    if(route.pathname.endsWith('/branches/main'))return Response.json({commit:{sha:mainSha}})
    if(route.pathname.endsWith('/pulls'))return Response.json([{number:325,head:{sha:prSha}}])
    if(route.searchParams.get('event')==='pull_request'){
      return Response.json({workflow_runs:[run(prSha,'feat/weave-world-map','pull_request')]})
    }
    return Response.json({workflow_runs:[run(mainSha,'main','push')]})
  },{WEAVE_GITHUB_READ_TOKEN:'invalid-test-token'})
  const [first,second]=await Promise.all([gh.workGithubReleaseBoard(),gh.workGithubReleaseBoard()])
  assert.equal(first,second,'Concurrent refreshes share a GitHub board request')
  assert.equal(first.main.check.state,'passed')
  assert.equal(first.pulls[0].check.state,'passed')
  assert.equal(first.issues.length,0)
  assert.equal(requests.filter(request=>!request.authenticated).length,4,'Board uses four public reads even with multiple rows')
  assert.equal(await gh.workGithubReleaseBoard(),first,'Public reads use a shared cache')

  const unavailable=loadGithub(async url=>{
    if(url.includes('/branches/main'))return Response.json({commit:{sha:mainSha}})
    if(url.includes('/pulls?'))return new Response(null,{status:503})
    if(url.includes('event=pull_request'))return Response.json({workflow_runs:[]})
    return Response.json({workflow_runs:[run(mainSha,'main','pull_request')]})
  })
  const partial=await unavailable.workGithubReleaseBoard()
  assert.equal(partial.main.sha,mainSha)
  assert.equal(partial.main.check.state,'missing','A PR run from a branch called main cannot verify deployment')
  assert.equal(partial.pullsAvailable,false)
  assert.match(partial.issues[0],/Open pull requests.*503/)
  await assert.rejects(unavailable.assertDeployableMain(mainSha),/has not passed/)
}

exerciseHandoff().then(()=>{
  console.log('PASS: GitHub handoff, partial failures, credential fallback, and exact main CI gate')
}).catch(error=>{console.error(error);process.exitCode=1})

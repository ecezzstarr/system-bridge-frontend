import {sql} from '@/lib/db'

const REPO='ecezzstarr/system-bridge-frontend'
const REPO_API='https://api.github.com/repos/'+REPO
export const githubReleaseSha=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{40}$/i.test(value)

function token(write=false){
  if(write)return process.env.WEAVE_GITHUB_PROMOTION_TOKEN?.trim()||''
  return process.env.WEAVE_GITHUB_READ_TOKEN?.trim()
    ||process.env.WEAVE_GITHUB_CODE_TOKEN?.trim()
    ||process.env.WEAVE_GITHUB_PROMOTION_TOKEN?.trim()
    ||''
}

let publicReadsUntil=0
const publicReadTtl=10*60*1000

async function github(path:string,opts:{method?:'GET'|'PUT';body?:unknown;write?:boolean}={}){
  if(!path.startsWith('/')||path.startsWith('//')||path.includes('..')||!/^\/[a-zA-Z0-9_?&=.%\/-]+$/.test(path))
    throw new Error('Invalid fixed GitHub resource')
  const credential=opts.write||Date.now()>=publicReadsUntil?token(opts.write):''
  if(opts.write&&!credential)throw new Error('GitHub promotion has not been configured in the Oracle server environment')
  const request=(auth:string)=>fetch(REPO_API+path,{
    method:opts.method||'GET',
    headers:{
      Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
      ...(auth?{Authorization:'Bearer '+auth}:{}),
      ...(opts.body?{'Content-Type':'application/json'}:{}),
    },
    ...(opts.body?{body:JSON.stringify(opts.body)}:{}),
    cache:'no-store',
    signal:AbortSignal.timeout(16000),
  }).catch(()=>{throw new Error('The release server could not reach GitHub. Check Oracle network access.')})
  let response=await request(credential)
  if(!opts.write&&credential&&[401,403,404].includes(response.status)){
    await response.body?.cancel().catch(()=>{})
    response=await request('')
    if(response.ok)publicReadsUntil=Date.now()+publicReadTtl
  }
  if(!response.ok){
    if(response.status===429||response.headers.get('x-ratelimit-remaining')==='0')
      throw new Error('GitHub rate limit reached. Configure a scoped GitHub read token or retry after the limit resets.')
    if(response.status===401||response.status===403)throw new Error('GitHub denied access. Check the release server credential and repository permissions.')
    if(response.status===404)throw new Error('The GitHub repository, workflow or pull request is unavailable to the release server.')
    if(response.status===405||response.status===409||response.status===422)throw new Error('GitHub refused this merge. Review checks, approvals and branch protection in GitHub.')
    throw new Error('GitHub returned HTTP '+response.status)
  }
  return response.json().catch(()=>{throw new Error('GitHub returned an unreadable response.')})
}

type Run={id:number;head_sha?:string;head_branch?:string;event?:string;status?:string;conclusion?:string;created_at?:string;html_url?:string}
export type GithubCheck={state:'passed'|'pending'|'failed'|'missing'|'unavailable';runUrl:string|null;sha:string}
const productionRuns='/actions/workflows/production-check.yml/runs?'

async function readWorkflowRuns(search:string|URLSearchParams):Promise<Run[]>{
  const data=await github(productionRuns+search)
  if(!Array.isArray(data?.workflow_runs))throw new Error('GitHub did not return workflow runs.')
  return data.workflow_runs
}

function checkFromRuns(runs:Run[],sha:string,branch:'main'|'pull_request'):GithubCheck{
  const found=runs
    .filter(run=>run.head_sha?.toLowerCase()===sha.toLowerCase()
      &&(branch==='main'?run.head_branch==='main'&&(run.event==='push'||run.event==='workflow_dispatch'):run.event==='pull_request'))
    .sort((a,b)=>Date.parse(b.created_at||'')-Date.parse(a.created_at||''))[0]
  return {
    state:!found?'missing':found.status!=='completed'?'pending':found.conclusion==='success'?'passed':'failed',
    runUrl:typeof found?.html_url==='string'?found.html_url:null,sha,
  }
}

export async function releaseProductionCheck(sha:string,branch:'main'|'pull_request'){
  if(!githubReleaseSha(sha))throw new Error('A full Git commit SHA is required')
  const search=new URLSearchParams({
    head_sha:sha,per_page:'30',...(branch==='main'?{branch:'main'}:{event:'pull_request'}),
  })
  return checkFromRuns(await readWorkflowRuns(search),sha,branch)
}

async function githubMainSha(){
  const branch=await github('/branches/main')
  const sha=String(branch?.commit?.sha||'').toLowerCase()
  if(!githubReleaseSha(sha))throw new Error('GitHub did not provide a verified main commit')
  return sha
}

export async function githubMainCandidate(){
  const sha=await githubMainSha()
  return {sha,check:await releaseProductionCheck(sha,'main')}
}

export async function assertDeployableMain(expected:string){
  if(!githubReleaseSha(expected))throw new Error('Select the full GitHub main commit SHA')
  const candidate=await githubMainCandidate()
  if(candidate.sha!==expected.toLowerCase())throw new Error('main changed since it was inspected. Refresh the GitHub release board.')
  if(candidate.check.state!=='passed')throw new Error('Current main has not passed GitHub Production Check')
  return candidate
}

export type GithubWorkPull={
  number:number;title:string;url:string;headSha:string;branch:string;draft:boolean;
  author:string;check:GithubCheck;mergeReady:boolean;
}

type ReleaseBoard=Awaited<ReturnType<typeof buildReleaseBoard>>
let releaseBoardCache:{data:ReleaseBoard;expiresAt:number}|null=null
let releaseBoardRefresh:Promise<ReleaseBoard>|null=null
let releaseBoardVersion=0
type MainStatus=Awaited<ReturnType<typeof readMainStatus>>
let mainCache:{data:MainStatus;expiresAt:number}|null=null
let mainRefresh:Promise<MainStatus>|null=null
let lastManualMainCheck=0

export async function workGithubReleaseBoard(refreshMain=false){
  const [board,main]=await Promise.all([readReleaseBoard(),readCachedMain(refreshMain)])
  return {...board,main:main.candidate,
    issues:main.issue?[main.issue,...board.issues]:board.issues,
    mainCheckedAt:main.checkedAt}
}

function usesAuthenticatedReads(){
  return Boolean(token(false)&&Date.now()>=publicReadsUntil)
}

function readCachedMain(manual:boolean){
  if(mainRefresh)return mainRefresh
  const now=Date.now()
  const manualDue=manual&&now-lastManualMainCheck>=(usesAuthenticatedReads()?5000:15000)
  if(mainCache&&mainCache.expiresAt>now&&!manualDue)return mainCache.data
  if(manual)lastManualMainCheck=now
  const version=releaseBoardVersion
  const refresh=readMainStatus().then(data=>{
    const ttl=usesAuthenticatedReads()?20000:3*60*1000
    if(version===releaseBoardVersion)mainCache={data,expiresAt:Date.now()+ttl}
    return data
  }).finally(()=>{if(mainRefresh===refresh)mainRefresh=null})
  mainRefresh=refresh
  return refresh
}

async function readMainStatus(){
  const checkedAt=new Date().toISOString()
  let sha:string
  try{sha=await githubMainSha()}
  catch(error){return {candidate:null,issue:githubIssue('GitHub main',error),checkedAt}}
  try{return {candidate:{sha,check:await releaseProductionCheck(sha,'main')},issue:null,checkedAt}}
  catch(error){return {candidate:{sha,check:{state:'unavailable',sha,runUrl:null} as GithubCheck},
    issue:githubIssue('Main Production Check',error),checkedAt}}
}

async function readReleaseBoard(){
  if(releaseBoardCache&&releaseBoardCache.expiresAt>Date.now())return releaseBoardCache.data
  if(releaseBoardRefresh)return releaseBoardRefresh
  const version=releaseBoardVersion
  const refresh=buildReleaseBoard().then(data=>{
    const ttl=data.issues.length||usesAuthenticatedReads()?60000:publicReadTtl
    if(version===releaseBoardVersion)releaseBoardCache={data,expiresAt:Date.now()+ttl}
    return data
  }).finally(()=>{if(releaseBoardRefresh===refresh)releaseBoardRefresh=null})
  releaseBoardRefresh=refresh
  return refresh
}
async function buildReleaseBoard(){
  const [pulls,checks,promotions]=await Promise.allSettled([
    github('/pulls?state=open&base=main&per_page=12&sort=updated&direction=desc'),
    readWorkflowRuns('event=pull_request&per_page=100'),
    recentWorkPromotions(),
  ])
  const issues:string[]=[]
  if(pulls.status==='rejected')issues.push(githubIssue('Open pull requests',pulls.reason))
  else if(!Array.isArray(pulls.value))issues.push('Open pull requests · GitHub did not return a pull request list.')
  if(checks.status==='rejected')issues.push(githubIssue('Pull request Production Checks',checks.reason))
  const list=pulls.status==='fulfilled'&&Array.isArray(pulls.value)?pulls.value:[]
  const pending=list.slice(0,12).map((pull:any)=>{
    const headSha=String(pull.head?.sha||'').toLowerCase()
    const check:GithubCheck=githubReleaseSha(headSha)&&checks.status==='fulfilled'
      ?checkFromRuns(checks.value,headSha,'pull_request')
      :{state:'unavailable',sha:headSha,runUrl:null}
    const draft=Boolean(pull.draft)
    return {
      number:Number(pull.number),title:String(pull.title||'GitHub change').slice(0,180),
      url:String(pull.html_url||''),headSha,branch:String(pull.head?.ref||'').slice(0,160),
      author:String(pull.user?.login||'GitHub').slice(0,100),draft,check,
      mergeReady:!draft&&check.state==='passed',
    } satisfies GithubWorkPull
  })
  return {
    repository:REPO,repositoryUrl:'https://github.com/'+REPO,
    pulls:pending,pullsAvailable:pulls.status==='fulfilled'&&Array.isArray(pulls.value),issues,
    promotions:promotions.status==='fulfilled'?promotions.value:[],promotionConfigured:Boolean(token(true)),
    fetchedAt:new Date().toISOString(),
  }
}

function githubIssue(section:string,error:unknown){
  return section+' · '+(error instanceof Error?error.message:'GitHub read unavailable.')
}

let auditReady:Promise<void>|null=null
function ensurePromotionAudit(){
  if(!auditReady)auditReady=(async()=>{
    await sql`CREATE TABLE IF NOT EXISTS weave_git_promotions(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pr_number integer NOT NULL,
      head_sha varchar(40) NOT NULL,
      result_sha varchar(40),
      requested_by uuid NOT NULL REFERENCES users(id),
      status varchar(24) NOT NULL DEFAULT 'requested'
        CHECK(status IN ('requested','merged','refused')),
      note varchar(500),
      created_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz
    )`
    await sql`CREATE INDEX IF NOT EXISTS weave_git_promotions_recent ON weave_git_promotions(created_at DESC)`
  })().catch(error=>{auditReady=null;throw error})
  return auditReady
}

export async function recentWorkPromotions(){
  await ensurePromotionAudit()
  return sql`SELECT id,pr_number,head_sha,result_sha,status,created_at
    FROM weave_git_promotions ORDER BY created_at DESC LIMIT 12`
}

export async function mergeApprovedWorkPull(input:{number:number;headSha:string;adminId:string;confirmation:string}){
  if(!Number.isSafeInteger(input.number)||input.number<=0||input.number>1000000)
    throw new Error('Invalid GitHub pull request number')
  if(!githubReleaseSha(input.headSha))throw new Error('Exact GitHub PR commit is required')
  if(input.confirmation!==('MERGE #'+input.number))
    throw new Error('Type MERGE #'+input.number+' to authorize the GitHub change')
  if(!token(true))throw new Error('Server GitHub promotion credential is not configured')
  const pr=await github('/pulls/'+input.number)
  const head=String(pr?.head?.sha||'').toLowerCase()
  if(pr?.state!=='open'||pr?.merged||pr?.draft||pr?.base?.ref!=='main')
    throw new Error('This pull request is not an open, non-draft change targeting main')
  if(head!==input.headSha.toLowerCase())
    throw new Error('The pull request changed after review. Refresh before authorizing.')
  const check=await releaseProductionCheck(head,'pull_request')
  if(check.state!=='passed')throw new Error('This pull request has not passed its Production Check')
  if(pr?.mergeable===false || pr?.mergeable_state==='blocked'||pr?.mergeable_state==='dirty')
    throw new Error('GitHub reports conflicts or required reviews/checks are still blocking the merge')
  await ensurePromotionAudit()
  const [audit]=await sql`INSERT INTO weave_git_promotions(pr_number,head_sha,requested_by,status)
    VALUES(${input.number},${head},${input.adminId}::uuid,'requested') RETURNING id`
  let result:any
  try{
    // GitHub enforces branch protection and required reviews. No force push or bypass option.
    result=await github('/pulls/'+input.number+'/merge',{
      method:'PUT',write:true,body:{sha:head,merge_method:'squash',
        commit_title:String(pr.title||'WEAVE reviewed release').slice(0,180)},
    })
    if(!result.merged||!githubReleaseSha(String(result.sha||'')))
      throw new Error('GitHub did not confirm a successful merge')
  }catch(error:any){
    await sql`UPDATE weave_git_promotions SET status='refused',
      note=${String(error?.message||'GitHub merge refused').slice(0,500)},completed_at=now()
      WHERE id=${audit.id}::uuid`.catch(()=>{})
    throw error
  }
  releaseBoardCache=null // The GitHub write succeeded; re-read main and PR status.
  releaseBoardRefresh=null
  mainCache=null
  mainRefresh=null
  lastManualMainCheck=0
  releaseBoardVersion++
  const mergedSha=String(result.sha).toLowerCase()
  let auditRecorded=true
  try{
    await sql`UPDATE weave_git_promotions SET status='merged',result_sha=${mergedSha},
      note='GitHub confirmed the protected main merge',completed_at=now()
      WHERE id=${audit.id}::uuid`
  }catch(error){
    auditRecorded=false
    // A database read/write failure cannot turn a completed GitHub merge into
    // a claimed refusal. The requested audit row remains for reconciliation.
    console.error('[GitHub release] merged on GitHub but audit update failed',error)
  }
  return {
    prNumber:input.number,mergedSha,auditRecorded,
    checkRequired:'A new successful main Production Check is required before Oracle deployment',
  }
}

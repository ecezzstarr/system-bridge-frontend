import {sql} from '@/lib/db'

const REPO='ecezzstarr/system-bridge-frontend'
const REPO_API='https://api.github.com/repos/'+REPO
export const githubReleaseSha=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{40}$/i.test(value)

function token(write=false){
  const specific=write?process.env.WEAVE_GITHUB_PROMOTION_TOKEN:process.env.WEAVE_GITHUB_READ_TOKEN||process.env.WEAVE_GITHUB_PROMOTION_TOKEN
  return (specific||'').trim()
}

async function github(path:string,opts:{method?:'GET'|'PUT';body?:unknown;write?:boolean}={}){
  if(!path.startsWith('/')||path.startsWith('//')||path.includes('..')||!/^\/[a-zA-Z0-9_?&=.%\/-]+$/.test(path))
    throw new Error('Invalid fixed GitHub resource')
  const credential=token(opts.write)
  if(opts.write&&!credential)throw new Error('GitHub promotion has not been configured in the Oracle server environment')
  const response=await fetch(REPO_API+path,{
    method:opts.method||'GET',
    headers:{
      Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
      ...(credential?{Authorization:'Bearer '+credential}:{}),
      ...(opts.body?{'Content-Type':'application/json'}:{}),
    },
    ...(opts.body?{body:JSON.stringify(opts.body)}:{}),
    cache:'no-store',
    signal:AbortSignal.timeout(16000),
  })
  const result=await response.json().catch(()=>({}))
  if(!response.ok){
    if(response.status===403||response.status===429)throw new Error('GitHub access, rate limits or branch protection blocked this operation')
    if(response.status===404)throw new Error('GitHub repository or pull request unavailable')
    if(response.status===405||response.status===409||response.status===422)throw new Error('GitHub refused this merge. Review checks, approvals and branch protection in GitHub.')
    throw new Error('GitHub returned HTTP '+response.status)
  }
  return result
}

type Run={id:number;head_sha?:string;head_branch?:string;event?:string;status?:string;conclusion?:string;created_at?:string;html_url?:string}
export type GithubCheck={state:'passed'|'pending'|'failed'|'missing';runUrl:string|null;sha:string}
export async function releaseProductionCheck(sha:string,branch:'main'|'pull_request'){
  if(!githubReleaseSha(sha))throw new Error('A full Git commit SHA is required')
  const search=new URLSearchParams({
    head_sha:sha,per_page:'30',...(branch==='main'?{branch:'main'}:{event:'pull_request'}),
  })
  const runs=(await github('/actions/workflows/production-check.yml/runs?'+search))?.workflow_runs as Run[]|undefined
  const found=(Array.isArray(runs)?runs:[])
    .filter(run=>run.head_sha?.toLowerCase()===sha.toLowerCase()
      &&(branch==='main'?run.head_branch==='main':run.event==='pull_request'))
    .sort((a,b)=>Date.parse(b.created_at||'')-Date.parse(a.created_at||''))[0]
  return {
    state:!found?'missing':found.status!=='completed'?'pending':found.conclusion==='success'?'passed':'failed',
    runUrl:typeof found?.html_url==='string'?found.html_url:null,sha,
  } as GithubCheck
}

export async function githubMainCandidate(){
  const branch=await github('/branches/main')
  const sha=String(branch?.commit?.sha||'').toLowerCase()
  if(!githubReleaseSha(sha))throw new Error('GitHub did not provide a verified main commit')
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

export async function workGithubReleaseBoard(){
  const [main,pulls]=await Promise.all([
    githubMainCandidate(),
    github('/pulls?state=open&base=main&per_page=12&sort=updated&direction=desc'),
  ])
  const list=Array.isArray(pulls)?pulls:[]
  const pending=await Promise.all(list.slice(0,12).map(async(pull:any)=>{
    const headSha=String(pull.head?.sha||'').toLowerCase()
    const check=githubReleaseSha(headSha)
      ?await releaseProductionCheck(headSha,'pull_request').catch(()=>({state:'missing',sha:headSha,runUrl:null} as GithubCheck))
      :{state:'missing',sha:headSha,runUrl:null} as GithubCheck
    const draft=Boolean(pull.draft)
    return {
      number:Number(pull.number),title:String(pull.title||'GitHub change').slice(0,180),
      url:String(pull.html_url||''),headSha,branch:String(pull.head?.ref||'').slice(0,160),
      author:String(pull.user?.login||'GitHub').slice(0,100),draft,check,
      mergeReady:!draft&&check.state==='passed',
    } satisfies GithubWorkPull
  }))
  return {
    repository:REPO,repositoryUrl:'https://github.com/'+REPO,main,
    pulls:pending,promotionConfigured:Boolean(token(true)),
    fetchedAt:new Date().toISOString(),
  }
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
  try{
    // GitHub enforces branch protection and required reviews. No force push or bypass option.
    const result=await github('/pulls/'+input.number+'/merge',{
      method:'PUT',write:true,body:{sha:head,merge_method:'squash',
        commit_title:String(pr.title||'WEAVE reviewed release').slice(0,180)},
    })
    const mergedSha=String(result.sha||'').toLowerCase()
    if(!result.merged||!githubReleaseSha(mergedSha))
      throw new Error('GitHub did not confirm a successful merge')
    await sql`UPDATE weave_git_promotions SET status='merged',result_sha=${mergedSha},
      note='GitHub confirmed the protected main merge',completed_at=now() WHERE id=${audit.id}::uuid`
    return {prNumber:input.number,mergedSha,checkRequired:'A new successful main Production Check is required before Oracle deployment'}
  }catch(error:any){
    await sql`UPDATE weave_git_promotions SET status='refused',
      note=${String(error?.message||'GitHub merge refused').slice(0,500)},completed_at=now()
      WHERE id=${audit.id}::uuid`.catch(()=>{})
    throw error
  }
}

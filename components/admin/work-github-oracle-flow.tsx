'use client'

import {useEffect,useState} from 'react'
import {ArrowUpRight,CheckCircle2,GitMerge,GitPullRequest,RefreshCw,ShieldCheck,Server} from 'lucide-react'

export type WorkMainCandidate={
  sha:string
  check:{state:'passed'|'pending'|'failed'|'missing';runUrl:string|null;sha:string}
}
type WorkPull={
  number:number;title:string;url:string;headSha:string;branch:string;draft:boolean;author:string
  check:WorkMainCandidate['check'];mergeReady:boolean
}
type Board={
  repository:string;repositoryUrl:string;main:WorkMainCandidate;pulls:WorkPull[]
  promotions:Array<{id:string;pr_number:number;head_sha:string;result_sha:string|null;status:string;created_at:string}>
  promotionConfigured:boolean;fetchedAt:string
}
const short=(sha:string)=>sha.slice(0,12)
const stateLabel=(value:WorkMainCandidate['check']['state'])=>({
  passed:'Passed',pending:'Running',failed:'Failed',missing:'Not found',
})[value]

export default function WorkGithubOracleFlow({
  token,onMainChange,workerOnline,activeRelease,
}:{
  token:string|null
  onMainChange:(main:WorkMainCandidate|null)=>void
  workerOnline:boolean
  activeRelease:string|null
}){
  const [board,setBoard]=useState<Board|null>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [selectedPr,setSelectedPr]=useState<number|null>(null)
  const [mergePhrase,setMergePhrase]=useState('')
  const [notice,setNotice]=useState('')

  const refresh=async(silent=false)=>{
    if(!token)return
    if(!silent)setLoading(true)
    try{
      const response=await fetch('/api/admin/work-github-release',{
        headers:{Authorization:'Bearer '+token},cache:'no-store',
      })
      const body=await response.json()
      if(!response.ok||!body.success)throw new Error(body.error||'GitHub status unavailable')
      const next:Board=body
      setBoard(next)
      setError('')
      onMainChange(next.main)
    }catch(reason){
      setError(reason instanceof Error?reason.message:'GitHub status unavailable')
      onMainChange(null) // fail closed: cannot authorize a release with stale CI evidence
    }finally{if(!silent)setLoading(false)}
  }
  useEffect(()=>{
    void refresh()
    const timer=window.setInterval(()=>{
      if(document.visibilityState==='visible')void refresh(true)
    },20000)
    return()=>window.clearInterval(timer)
  },[token])

  const merge=async(pull:WorkPull)=>{
    if(busy||!board?.promotionConfigured||!pull.mergeReady)return
    if(mergePhrase!=='MERGE #'+pull.number){setError('Type MERGE #'+pull.number+' exactly');return}
    if(!window.confirm('Merge PR #'+pull.number+' into GitHub main? Production will not deploy until new main checks pass and you separately authorize Oracle.'))return
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/admin/work-github-release',{
        method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({
          action:'merge_work_pr',number:pull.number,headSha:pull.headSha,
          confirmation:mergePhrase,
        }),
      })
      const body=await response.json()
      if(!response.ok||!body.success)throw new Error(body.error||'Merge refused')
      setNotice('GitHub accepted PR #'+pull.number+' into main. Await a new successful Production Check before authorizing Oracle.')
      setMergePhrase('');setSelectedPr(null)
      await refresh(true)
    }catch(reason){setError(reason instanceof Error?reason.message:'GitHub merge refused')}
    finally{setBusy(false)}
  }
  const main=board?.main
  const mainPassed=main?.check.state==='passed'
  const current=Boolean(mainPassed&&activeRelease?.toLowerCase()===main?.sha.toLowerCase())
  const process=[
    ['1','ChatGPT Work','Commit code and create a GitHub pull request',true],
    ['2','GitHub review','Review, approve and merge the requested PR',Boolean(board?.pulls.length===0)],
    ['3','Production Check','Full test and build pass for exact main SHA',Boolean(mainPassed)],
    ['4','Oracle release worker','Available to execute an Administration-approved SHA',workerOnline],
    ['5','Production health','Deployed SHA matches verified main',current],
  ] as const
  return <section className="mt-5 rounded-2xl border border-sky-300/20 bg-[#081825] p-5" data-work-github-oracle-flow="admin">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-sky-200">Administration · Work → GitHub → Oracle</p>
        <h2 className="mt-2 text-lg font-black text-white">Complete deployment movement</h2>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">
          After ChatGPT Work commits code to GitHub, review the pull request here. A reviewed merge produces a new main commit.
          GitHub checks that exact commit; Administration then authorizes the independent Oracle host worker to deploy it.
          Successful production health, not the GitHub merge, closes the movement.
        </p>
      </div>
      <button type="button" disabled={!token||loading||busy} onClick={()=>void refresh()}
        className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-black text-sky-100 disabled:opacity-50">
        <RefreshCw className={loading?'h-4 w-4 animate-spin':'h-4 w-4'}/> Refresh GitHub
      </button>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-5">
      {process.map(([order,label,detail,ready])=><div key={order} className="rounded-xl border border-white/10 bg-white/[.025] px-3 py-4">
        <div className="flex items-center gap-2"><span className="text-sm font-black text-sky-200">{order}</span>
          {ready?<CheckCircle2 className="h-3.5 w-3.5 text-emerald-300"/>:<span className="text-[10px] text-amber-200">Check</span>}</div>
        <p className="mt-2 text-xs font-bold text-white">{label}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">{detail}</p>
      </div>)}
    </div>
    {error&&<p role="alert" className="mt-4 rounded-lg border border-rose-300/20 bg-rose-400/5 p-3 text-xs text-rose-200">{error}</p>}
    {notice&&<p role="status" className="mt-4 rounded-lg border border-emerald-300/20 p-3 text-xs text-emerald-200">{notice}</p>}
    {loading&&!board?<p className="mt-4 text-sm text-slate-300">Reading GitHub release state…</p>:board&&<>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-xs font-black text-sky-200"><GitPullRequest className="h-4 w-4"/> Canonical GitHub main</div>
          <p className="mt-3 break-all font-mono text-xs text-white">{main?.sha}</p>
          <p className="mt-2 text-xs text-slate-300">Production Check: <strong>{main?stateLabel(main.check.state):'Unavailable'}</strong></p>
          <div className="mt-2 flex flex-wrap gap-3">
            <a href={board.repositoryUrl+'/commits/main'} target="_blank" rel="noreferrer noopener" className="text-xs text-sky-200 underline">View commits</a>
            {main?.check.runUrl&&<a href={main.check.runUrl} target="_blank" rel="noreferrer noopener" className="text-xs text-sky-200 underline">View CI</a>}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-xs font-black text-amber-200"><Server className="h-4 w-4"/> Oracle execution readiness</div>
          <p className="mt-3 text-sm font-bold text-white">{workerOnline?'Host worker connected':'Host worker not reporting'}</p>
          <p className="mt-2 text-xs text-slate-300">
            {mainPassed?current?'The reported live release matches this main SHA.':'This main SHA can be selected below for an explicit deploy request.':'A main Production Check must pass before deployment is enabled.'}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-white">GitHub changes awaiting review · {board.pulls.length}</h3>
          <p className="text-[10px] text-slate-400">Only open pull requests against main are shown</p>
        </div>
        {board.pulls.length===0?<p className="mt-3 text-xs text-slate-400">No open pull requests. If Work committed directly to main, wait for the main Production Check above.</p>:
          <div className="mt-3 space-y-3">
            {board.pulls.map(pr=><article key={pr.number} className="rounded-xl border border-white/10 bg-black/15 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-white">#{pr.number} · {pr.title}</p>
                  <p className="mt-2 break-all text-[10px] text-slate-400">{pr.author} · {pr.branch} · {short(pr.headSha)} · {pr.draft?'Draft':'Reviewable'}</p>
                  <p className="mt-2 text-xs text-slate-300">Pull request check: {stateLabel(pr.check.state)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a target="_blank" rel="noreferrer noopener" href={pr.url} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs text-sky-200">Review code <ArrowUpRight className="h-3.5 w-3.5"/></a>
                  {pr.check.runUrl&&<a target="_blank" rel="noreferrer noopener" href={pr.check.runUrl} className="rounded-lg border border-white/20 px-3 py-2 text-xs text-slate-200">Checks</a>}
                </div>
              </div>
              {pr.mergeReady&&board.promotionConfigured?
                <div className="mt-3 border-t border-white/10 pt-3">
                  {selectedPr===pr.number?<>
                    <p className="text-xs text-amber-100">After reviewing the exact code and required GitHub approvals, type <strong>MERGE #{pr.number}</strong>. This does not deploy to Oracle.</p>
                    <input value={mergePhrase} onChange={e=>setMergePhrase(e.target.value)} autoComplete="off"
                      aria-label={'Confirm merge of PR '+pr.number}
                      className="mt-2 w-full max-w-sm rounded-lg border border-white/20 bg-[#0a1a25] px-3 py-3 text-xs text-white"
                      placeholder={'MERGE #'+pr.number}/>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" disabled={busy||mergePhrase!=='MERGE #'+pr.number}
                        onClick={()=>void merge(pr)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-200 px-3 text-xs font-black text-[#0c1924] disabled:opacity-40"><GitMerge className="h-4 w-4"/> Authorize protected merge</button>
                      <button type="button" onClick={()=>{setSelectedPr(null);setMergePhrase('')}} className="px-3 text-xs text-slate-300">Cancel</button>
                    </div>
                  </>:<button type="button" onClick={()=>{setSelectedPr(pr.number);setMergePhrase('')}} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200/30 px-3 text-xs font-bold text-emerald-200"><ShieldCheck className="h-4 w-4"/> Review merge authorization</button>}
                </div>:<p className="mt-3 text-xs leading-5 text-amber-100">{pr.draft?'Work has not marked the pull request ready for review.':pr.check.state!=='passed'?'Successful pull request checks are required.':!board.promotionConfigured?'In-app merge is unavailable until WEAVE_GITHUB_PROMOTION_TOKEN is configured on the server. Review and merge in GitHub instead.':'Merge is unavailable.'}</p>}
            </article>)}
          </div>}
      </div>
      {board.promotions?.length>0&&<details className="mt-5 border-t border-white/10 pt-4" data-github-promotion-audit="persistent">
        <summary className="cursor-pointer text-xs font-black text-white">GitHub merge authorization history · {board.promotions.length}</summary>
        <div className="mt-3 space-y-2">
          {board.promotions.map(item=><div key={item.id} className="rounded-lg border border-white/10 bg-black/15 p-3">
            <p className="text-xs font-bold text-slate-100">PR #{item.pr_number} · {item.status}</p>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-400">{item.result_sha||item.head_sha}</p>
            <p className="mt-1 text-[10px] text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
          </div>)}
        </div>
      </details>}
      <p className="mt-4 text-[10px] leading-5 text-slate-500">
        GitHub may still reject a merge for branch protection, missing human reviews, conflicts or token permissions. No GitHub code is deployed just by clicking Merge. Last checked {new Date(board.fetchedAt).toLocaleString()}.
      </p>
    </>}
  </section>
}

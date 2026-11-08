import {randomUUID} from 'node:crypto'
import {getPool} from '@/lib/db'
import {isWeaveWorkArea,WEAVE_WORK_AREAS} from '@/lib/weave-workshop-purpose'

/**
 * WEAVE Code Workshop. Source editing only on personally owned GitHub draft
 * branches. This module cannot spawn a process, write host files, move main,
 * bypass GitHub CI or invoke the Oracle production executor.
 */
const REPO='ecezzstarr/system-bridge-frontend'
const API='https://api.github.com/repos/'+REPO
const MAX_BYTES=96*1024
const EDIT_ROOTS=['app/','components/','lib/','tests/','docs/','public/'] as const
const PROTECTED=[
 /^app\/api\//, /^app\/\(auth\)\//,
 /^lib\/(?:auth|workshop-auth|weave-github-release|weave-code-workshop|weave-workshop-purpose|weave-release|db(?:\.|\/)|pg-neon|payment|paystack|wallet|pro-file-folder-activation)/i,
 /^components\/admin\/(?:code-workshop|work-github-oracle-flow)/,
 /^app\/\(app\)\/admin\/(?:code-workshop|release-workshop)/,
 /^tests\/(?:code-workshop|work-github-oracle-release|release-workshop)/,
 /^docs\/(?:sovereign-release-workshop|work-github-oracle-release-pipeline)/,
]
export const CODE_WORKSHOP_POLICY={
 repository:REPO,maxBytes:MAX_BYTES,roots:EDIT_ROOTS,stage:'draft_branch_only',
 protectedFiles:'Authentication, finance, security, production and workshop authority require independent engineering review.'
}
const sha=/^[a-f0-9]{40}$/i
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
function credential(write=false){
 const value=write?process.env.WEAVE_GITHUB_CODE_TOKEN:
 (process.env.WEAVE_GITHUB_READ_TOKEN||process.env.WEAVE_GITHUB_CODE_TOKEN||process.env.WEAVE_GITHUB_PROMOTION_TOKEN)
 return String(value||'').trim()
}
export function isCodeWorkshopWritable(){return Boolean(credential(true))}
function validOwner(id:string){if(!uuid.test(id))throw Error('Invalid Administration account');return id.toLowerCase()}
function draftFor(id:string,branch:string){
 const prefix='weave-admin/'+validOwner(id)+'/'
 if(!branch.startsWith(prefix)||!/^[a-f0-9]{16}$/.test(branch.slice(prefix.length)))
  throw Error('Use a draft branch issued to your own Administration identity')
 return branch
}
function refFor(id:string,branch:string){return branch==='main'?'main':draftFor(id,branch)}
export function safeCodePath(value:unknown){
 const file=String(value||'').trim().replaceAll('\\','/')
 if(!file||file.length>220||file.startsWith('/')||file.endsWith('/')||
  file.includes('..')||file.includes('//')||/[?#%\u0000-\u001f]/.test(file)||
  !/^[a-zA-Z0-9_./()\-]+$/.test(file)||file.split('/').some(part=>!part||part.startsWith('.')))
  throw Error('Use a valid repository-relative source path')
 if(!EDIT_ROOTS.some(root=>file.startsWith(root)))
  throw Error('Only company source, tests, documentation and safe assets can be edited')
 if(PROTECTED.some(rule=>rule.test(file)))throw Error('Protected file: use independently reviewed engineering workflow')
 if(!/\.(?:ts|tsx|js|jsx|css|md|json|svg|txt)$/.test(file))
  throw Error('This file type cannot be edited here')
 if(file.startsWith('public/')&&!/\.(?:svg|txt)$/.test(file))
  throw Error('Public asset editing here supports SVG and plain text only')
 return file
}
function safeDirectory(value:unknown){
 const directory=String(value||'').trim().replaceAll('\\','/')
 if(!directory||directory.length>160||directory.startsWith('/')||directory.includes('..')||
  directory.includes('//')||!/^[-a-zA-Z0-9_/()]+$/.test(directory)||
  directory.split('/').some(segment=>!segment))
  throw Error('Use a normal source directory')
 if(!EDIT_ROOTS.some(root=>directory===root.slice(0,-1)||directory.startsWith(root)))
  throw Error('Directory unavailable from this workshop')
 if(PROTECTED.some(rule=>rule.test(directory+'/')))throw Error('Protected source directory')
 return directory
}
function message(value:unknown,min=12,max=160){
 const text=String(value||'').trim().replace(/[\x00-\x1f\x7f]+/g,' ')
 if(text.length<min||text.length>max)throw Error('Enter a clear description between '+min+' and '+max+' characters')
 return text
}
async function github(url:string,options:{method?:'GET'|'POST'|'PUT';write?:boolean;body?:unknown}={}){
 if(!url.startsWith('/')||url.startsWith('//')||url.includes('..'))throw Error('Invalid GitHub resource')
 const token=credential(Boolean(options.write))
 if(options.write&&!token)throw Error('WEAVE_GITHUB_CODE_TOKEN must be configured on the private server')
 const response=await fetch(API+url,{
  method:options.method||'GET',
  headers:{
   Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
   ...(token?{Authorization:'Bearer '+token}:{}),
   ...(options.body?{'Content-Type':'application/json'}:{}),
  },
  ...(options.body?{body:JSON.stringify(options.body)}:{}),
  cache:'no-store',signal:AbortSignal.timeout(16000),
 })
 if(response.status===404&&options.method!=='POST')return null
 const result:any=await response.json().catch(()=>({}))
 if(!response.ok){
  if([401,403,429].includes(response.status))throw Error('GitHub permissions, authentication or rate limits blocked this operation')
  if([409,412,422].includes(response.status))throw Error('GitHub refused a stale, conflicting or unapproved change. Refresh before proceeding.')
  throw Error('GitHub returned HTTP '+response.status)
 }
 return result
}
function contentsUrl(path:string,branch:string){
 return '/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(branch)
}
async function remoteFile(path:string,branch:string){
 const item=await github(contentsUrl(path,branch))
 if(!item)return null
 if(item.type!=='file'||typeof item.sha!=='string'||typeof item.content!=='string'||item.encoding!=='base64')
  throw Error('Source path is not a readable text file')
 if(Number(item.size)>MAX_BYTES)throw Error('File is too large for this editor')
 const bytes=Buffer.from(item.content.replace(/\s+/g,''),'base64')
 if(bytes.length>MAX_BYTES)throw Error('Source exceeds the file size limit')
 const content=bytes.toString('utf8')
 if(!Buffer.from(content,'utf8').equals(bytes)||content.includes('\u0000'))
  throw Error('Source must be UTF-8 text')
 return {path,sha:String(item.sha),content,branch}
}
export async function readWorkshopSource(input:{actorId:string;branch?:string;path?:string;directory?:string}){
 const branch=refFor(input.actorId,String(input.branch||'main'))
 if(input.directory){
  const directory=safeDirectory(input.directory)
  const items=await github(contentsUrl(directory,branch))
  if(!Array.isArray(items))throw Error('Directory is unavailable in this branch')
  return {kind:'directory',branch,directory,entries:items.slice(0,120)
   .filter((v:any)=>['dir','file'].includes(v.type)&&typeof v.path==='string'&&!v.name.startsWith('.'))
   .map((v:any)=>({name:String(v.name).slice(0,130),path:String(v.path).slice(0,220),
    type:v.type,size:Number(v.size||0)}))}
 }
 const path=safeCodePath(input.path||'app/page.tsx')
 const data=await remoteFile(path,branch)
 return {kind:'file',branch,path,sha:data?.sha||null,exists:Boolean(data),content:data?.content||''}
}
let ensured:Promise<void>|null=null
async function ensureAudit(){
 if(!ensured)ensured=(async()=>{
  const pool=getPool()
  await pool.query("CREATE TABLE IF NOT EXISTS weave_code_workshop_events ("+
   "id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES users(id),"+
   "event varchar(36) NOT NULL CHECK(event IN ('branch_created','file_saved','pull_request_opened')),"+
   "branch varchar(160) NOT NULL, file_path varchar(220), commit_sha varchar(40),"+
   "pull_request integer, message varchar(500), created_at timestamptz NOT NULL DEFAULT now())")
  await pool.query("CREATE INDEX IF NOT EXISTS weave_code_workshop_events_recent "+
   "ON weave_code_workshop_events(actor_id,created_at DESC)")
 })().catch(e=>{ensured=null;throw e})
 return ensured
}
async function audit(actorId:string,event:string,branch:string,path:string|null,commit:string|null,pr:number|null,note:string){
 await ensureAudit()
 await getPool().query(
  "INSERT INTO weave_code_workshop_events(actor_id,event,branch,file_path,commit_sha,pull_request,message) "+
  "VALUES($1::uuid,$2,$3,$4,$5,$6,$7)",
  [validOwner(actorId),event,branch,path,commit,pr,note.slice(0,500)])
}
export async function workshopActivity(actorId:string){
 await ensureAudit()
 const result=await getPool().query(
  "SELECT event,branch,file_path,commit_sha,pull_request,message,created_at "+
  "FROM weave_code_workshop_events WHERE actor_id=$1::uuid ORDER BY created_at DESC LIMIT 18",
  [validOwner(actorId)])
 return result.rows
}
export async function createWorkshopBranch(actorId:string,confirmation:string){
 if(confirmation!=='CREATE DRAFT')throw Error('Type CREATE DRAFT to begin a reviewable source branch')
 if(!isCodeWorkshopWritable())throw Error('Server source-writing permission is not configured')
 const main=await github('/branches/main')
 const baseSha=String(main?.commit?.sha||'')
 if(!sha.test(baseSha))throw Error('Canonical main is unavailable')
 const branch='weave-admin/'+validOwner(actorId)+'/'+randomUUID().replaceAll('-','').slice(0,16)
 await ensureAudit()
 await github('/git/refs',{method:'POST',write:true,body:{ref:'refs/heads/'+branch,sha:baseSha}})
 await audit(actorId,'branch_created',branch,null,baseSha,null,'Private source branch created')
 return {branch,baseSha,notice:'Private draft created; GitHub main and Oracle production are unchanged.'}
}
function inspectContent(content:string){
 if(!content.trim()||Buffer.byteLength(content,'utf8')>MAX_BYTES||content.includes('\u0000'))
  throw Error('Enter UTF-8 source text within the file limit')
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)||
  /(?:WEAVE_GITHUB_CODE_TOKEN|WEAVE_GITHUB_PROMOTION_TOKEN|DATABASE_URL|PAYSTACK_SECRET_KEY)\s*[:=]\s*["'][^"'\n]{8,}/.test(content))
  throw Error('Credential-like material cannot be committed from the workshop')
}
export async function commitWorkshopFile(input:{
 actorId:string;branch:string;path:string;content:string;expectedSha:string|null;message:string;confirmation:string
}){
 const branch=draftFor(input.actorId,input.branch)
 const path=safeCodePath(input.path)
 if(input.confirmation!=='SAVE DRAFT')throw Error('Type SAVE DRAFT before committing code')
 if(typeof input.content!=='string')throw Error('Source content must be text')
 inspectContent(input.content)
 const title=message(input.message)
 const previous=await remoteFile(path,branch)
 if((previous?.sha||null)!==(input.expectedSha||null))
  throw Error('File has changed since your review; reload before saving to avoid data loss')
 await ensureAudit()
 const result=await github('/contents/'+path.split('/').map(encodeURIComponent).join('/'),{
  method:'PUT',write:true,body:{message:title,content:Buffer.from(input.content,'utf8').toString('base64'),
   branch,...(previous?{sha:previous.sha}:{})},
 })
 const commit=String(result?.commit?.sha||'')
 if(!sha.test(commit))throw Error('GitHub did not confirm the commit. Inspect the draft before repeating.')
 await audit(input.actorId,'file_saved',branch,path,commit,null,title)
 return {branch,path,commit,sha:String(result?.content?.sha||''),
  notice:'Source committed to the draft branch; main and production remain unchanged.'}
}
export async function createWorkshopReview(input:{
 actorId:string;branch:string;title:string;summary:string;confirmation:string;attestations:boolean[];workArea?:unknown
}){
 const branch=draftFor(input.actorId,input.branch)
 const title=message(input.title,12,130)
 const summary=message(input.summary,60,3000)
 const workArea=input.workArea
 if(workArea!=null&&workArea!==''&&!isWeaveWorkArea(workArea))throw Error('Choose a valid Weave work area')
 if(input.confirmation!=='OPEN REVIEW')throw Error('Type OPEN REVIEW to create the GitHub PR')
 if(!Array.isArray(input.attestations)||input.attestations.length!==4||input.attestations.some(v=>v!==true))
  throw Error('Complete all four source governance attestations')
 const comparison=await github('/compare/main...'+encodeURIComponent(branch))
 const files=Array.isArray(comparison?.files)?comparison.files:[]
 if(!files.length)throw Error('No code changes are present on this branch')
 if(files.length>25)throw Error('Split this change into smaller reviewable pull requests')
 files.forEach((file:any)=>safeCodePath(file.filename))
 await ensureAudit()
 const workContext=isWeaveWorkArea(workArea)
  ?'<!-- weave-work-area: '+workArea+' -->\n\n### Weave work affected\n'+
   WEAVE_WORK_AREAS[workArea].label+'\n\n'+WEAVE_WORK_AREAS[workArea].review+'\n\n'
  :''
 const body=workContext+summary+'\n\n### WEAVE Code Workshop attestations\n'+
  '- This branch was authored without executing host commands.\n'+
  '- Role, customer, financial, privacy and employee boundaries were reviewed.\n'+
  '- Production changes require separate GitHub CI and human release authorization.\n'+
  '- The exact diff and tests require independent review before any main merge.\n'
 const result=await github('/pulls',{method:'POST',write:true,body:{
  title,head:branch,base:'main',body,draft:false,
 }})
 if(!Number.isSafeInteger(result?.number)||result.number<=0)
  throw Error('GitHub PR was not confirmed; inspect branch history before retrying')
 await audit(input.actorId,'pull_request_opened',branch,null,String(result?.head?.sha||''),result.number,title)
 return {number:result.number,url:String(result.html_url||''),
  headSha:String(result?.head?.sha||''),
  notice:'GitHub review opened. Tests, approvals, protected main merge and independent release remain required.'}
}

const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{Pool}=require('pg')
const rootUri=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if(!rootUri||new URL(rootUri).pathname!=='/weave_switch_test')throw Error('Disposable weave_switch_test connection required')
const uri=new URL(rootUri);uri.pathname='/weave_mandate_test'
const pool=new Pool({connectionString:uri.toString(),max:10,connectionTimeoutMillis:10000})
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9}}).outputText,{exports,require:n=>{if(n in deps)return deps[n];throw Error(n)},console,Date,Math,Set});return exports}
const sql=async(strings,...values)=>(await pool.query(strings.reduce((s,part,i)=>s+(i?'$'+i:'')+part,''),values)).rows
const db={getPool:()=>pool,sql}
const catalog=load('lib/weave-lifestyle-catalog.ts')
const lifestyle=load('lib/weave-lifestyle.ts',{'@/lib/db':db,'@/lib/weave-lifestyle-catalog':catalog,'@/lib/client-monthly-subscription':{getClientMonthlyStanding:async()=>({active:false,hasPayment:false,paidUntil:null})},'@/lib/agentic-bridger-purchase':{getAgenticBridgerPurchase:async()=>null}})
const departments=load('lib/weave-guidance-departments.ts',{'@/lib/db':db,'@/lib/weave-lifestyle':lifestyle})
const auth=load('lib/auth-api.ts',{'next-auth/next':{getServerSession:async()=>null},'./auth':{authOptions:{}},'./db':db,'./weave-infrastructure':{getDivineShieldState:async()=>({active:false})}})
const deps={'next/server':{NextResponse:{json:(body,options)=>new Response(JSON.stringify(body),options)}},'@/lib/auth-api':auth,'@/lib/db':db,'@/lib/weave-lifestyle':lifestyle,'@/lib/weave-guidance-departments':departments}
const apply=load('app/api/weave/lifestyles/mandate/route.ts',deps),review=load('app/api/admin/guidance-staff/route.ts',deps),staff=load('app/api/company-guidance/staff/route.ts',deps),original=load('app/api/company-guidance/route.ts',deps)
const ids={admin:'10000000-0000-4000-8000-000000000001',worker:'10000000-0000-4000-8000-000000000002',requester:'10000000-0000-4000-8000-000000000003',due:'10000000-0000-4000-8000-000000000004',client:'10000000-0000-4000-8000-000000000005',unopened:'10000000-0000-4000-8000-000000000006'}
function request(method,who,body,query=''){const req=new Request('http://localhost/test'+query,{method,headers:who?{Authorization:'Bearer qa-mandate-'+who}: {},...(body?{body:JSON.stringify(body)}:{})});req.nextUrl=new URL(req.url);return req}
const application={department:'forensic',note:'I can support careful record review and escalate unresolved business questions.',status:'approved',role:'admin'}
const decision=(id,state)=>({applicationId:id,decision:state,reviewNote:'QA review: assignment verified for synthetic test only.'})
const reply=()=>staff.POST(request('POST','worker',{department:'forensic',requesterId:ids.requester,content:'QA forensic reply from the real assigned Agent identity.'}))
async function run(){
 const admin=new Pool({connectionString:rootUri});try{await admin.query('CREATE DATABASE weave_mandate_test')}catch(e){if(e.code!=='42P04')throw e}finally{await admin.end()}
 await pool.query(`DROP TABLE IF EXISTS weave_guidance_staff_applications,arena_ace_accounts,arena_live_predictions,arena_matches,enterprise_legions,lounge_messages,notifications,sessions,users CASCADE;
 CREATE TABLE users(id uuid PRIMARY KEY,name text,username text,email text,role text,is_active boolean DEFAULT true,created_at timestamptz DEFAULT NOW(),avatar_url text,subscription_status text DEFAULT 'active',subscription_expiry timestamptz,is_subscription_exempt boolean DEFAULT false);
 CREATE TABLE sessions(token text,user_id uuid,expires_at timestamptz);
 CREATE TABLE arena_matches(id uuid PRIMARY KEY);
 CREATE TABLE enterprise_legions(id uuid,client_id uuid,source_user_id uuid,active boolean,employment_status text,accepted_at timestamptz,created_at timestamptz);
 CREATE TABLE notifications(id uuid DEFAULT gen_random_uuid(),user_id uuid,type text,title text,content text,from_user_id uuid,from_user_name text,link text,created_at timestamptz DEFAULT NOW())`)
 for(const [who,id] of Object.entries(ids)){
  await pool.query('INSERT INTO users(id,name,username,email,role,subscription_status) VALUES($1,$2,$3,$4,$5,$6)',[id,'QA '+who,who,who+'@example.invalid',who==='admin'?'admin':who==='due'?'bridger':who==='client'?'client':'agent',who==='due'?'due':'active'])
  await pool.query("INSERT INTO sessions VALUES($1,$2,NOW()+INTERVAL '1 hour')",['qa-mandate-'+who,id])
 }
 const migration=fs.readFileSync('migrations/20261019_weave_mandate_guidance_staff.sql','utf8');await pool.query(migration);await pool.query(migration)
 assert.equal((await apply.POST(request('POST',null,application))).status,403)
 assert.equal((await apply.POST(request('POST','client',application))).status,403)
 assert.equal((await apply.POST(request('POST','due',application))).status,403,'Expired Bridger standing prevents applications')
 let res=await apply.POST(request('POST','worker',application));assert.equal(res.status,201);const item=(await res.json()).application;assert.equal(item.status,'pending','Payload cannot self-appoint')
 assert.equal((await apply.POST(request('POST','worker',application))).status,409)
 assert.equal((await staff.GET(request('GET','worker',null,'?department=forensic'))).status,403,'Pending application cannot read requester messages')
 assert.equal((await review.PATCH(request('PATCH','worker',decision(item.id,'approved')))).status,403)
 assert.equal((await review.PATCH(request('PATCH','admin',decision(item.id,'approved')))).status,200)
 assert.equal((await review.PATCH(request('PATCH','admin',decision(item.id,'approved')))).status,409)
 res=await original.POST(request('POST','requester',{position:'forensic',content:'QA requester opened a real Company Guidance records question.'}));assert.equal(res.status,201)
 res=await staff.GET(request('GET','worker',null,'?department=forensic&requesterId='+ids.requester));assert.equal(res.status,200);assert.equal((await res.json()).messages.length,1)
 assert.equal((await staff.GET(request('GET','worker',null,'?department=lawyer'))).status,403)
 assert.equal((await staff.GET(request('GET','worker',null,'?department=admin'))).status,400)
 assert.equal((await staff.POST(request('POST','worker',{department:'forensic',requesterId:ids.unopened,content:'Cannot invent a requester thread.'}))).status,404)
 res=await reply();assert.equal(res.status,201);const sent=(await res.json()).message;assert.equal(sent.userId,ids.worker);assert.equal(sent.senderRole,'agent');assert.match(sent.sender,/Forensics/)
 res=await original.GET(request('GET','requester',null,'?position=forensic'));assert((await res.json()).messages.some(m=>m.id===sent.id),'The original requester sees the assigned reply')
 res=await original.GET(request('GET','admin',null,'?requesterId='+ids.requester+'&position=forensic'));assert((await res.json()).messages.some(m=>m.id===sent.id),'Administration sees the same original conversation')
 await pool.query('ALTER TABLE notifications RENAME TO qa_notifications_unavailable');try{assert.equal((await reply()).status,201,'Notification failure never falsely rolls back a committed reply')}finally{await pool.query('ALTER TABLE qa_notifications_unavailable RENAME TO notifications')}
 // Revoke inside a held transaction while a previously authorized request reaches
 // its final assignment lock. It must re-evaluate the new status before inserting.
 const lock=await pool.connect();await lock.query('BEGIN');await lock.query("UPDATE weave_guidance_staff_applications SET status='revoked' WHERE id=$1",[item.id])
 const inFlight=reply();let blocked=false
 try{
  for(let i=0;i<150;i++){
   const waiting=await pool.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%FOR SHARE OF a,u%'")
   if(waiting.rows.length){blocked=true;break}await new Promise(r=>setTimeout(r,100))
  }
  await lock.query('COMMIT')
 }finally{await lock.query('ROLLBACK');lock.release()}
 assert(blocked,'Reply reaches the final assignment lock');assert.equal((await inFlight).status,403,'Committed revocation prevents the in-flight reply')
 assert.equal((await staff.GET(request('GET','worker',null,'?department=forensic'))).status,403)
 assert.equal((await reply()).status,403)
 assert.equal((await apply.POST(request('POST','worker',application))).status,201,'Revoked users can reapply but need a new review')
 assert.equal((await review.PATCH(request('PATCH','admin',decision(item.id,'approved')))).status,200)
 await pool.query("UPDATE users SET role='bridger' WHERE id=$1",[ids.worker]);assert.equal((await staff.GET(request('GET','worker',null,'?department=forensic'))).status,403,'An appointment cannot silently transfer to another base role')
 await pool.query("UPDATE users SET role='agent',is_active=false WHERE id=$1",[ids.worker]);assert.equal((await reply()).status,403)
 await pool.query('UPDATE users SET is_active=true WHERE id=$1',[ids.worker])
 assert.equal((await review.PATCH(request('PATCH','admin',decision(item.id,'revoked')))).status,200,'Administration revokes through its normal review API')
 assert.equal((await reply()).status,403)
 console.log('PASS: Mandate migration idempotency, real bearer and Lifestyle checks, pending/approved/revoked lifecycle, cross-department isolation, original requester/Admin replies, role binding, notification failure and revocation race')
}
run().then(()=>pool.end()).catch(async error=>{console.error(error);await pool.end();process.exitCode=1})

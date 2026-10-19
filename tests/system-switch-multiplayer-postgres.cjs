// Runs against an explicitly named disposable database, never the application database.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{Pool}=require('pg')
const uri=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if(!uri||new URL(uri).pathname!=='/weave_switch_test')throw Error('Set WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL to the disposable weave_switch_test database')
const pool=new Pool({connectionString:uri,max:8}),secondPool=new Pool({connectionString:uri,max:4})
const compiled=process.env.SYSTEM_SWITCH_COMPILED_SOURCES?JSON.parse(fs.readFileSync(process.env.SYSTEM_SWITCH_COMPILED_SOURCES,'utf8')):null
function load(file,deps={}){const exports={};const source=compiled?compiled[file]:require('typescript').transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9}}).outputText;vm.runInNewContext(source,{exports,require:n=>{if(n in deps)return deps[n];throw Error(n)},Math,Number,WeakMap,console});return exports}
const runtime=load('lib/file-folder-world-runtime.ts'),presence=load('lib/system-switch-presence.ts',{'./file-folder-world-runtime':runtime})
const sql=async(strings,...values)=>(await pool.query(strings.reduce((s,part,i)=>s+(i?'$'+i:'')+part,''),values)).rows
let shield=false
const auth=load('lib/auth-api.ts',{'next-auth/next':{getServerSession:async()=>null},'./auth':{authOptions:{}},'./db':{sql},'./weave-infrastructure':{getDivineShieldState:async()=>({active:shield})}})
const response={json:(body,options)=>new Response(JSON.stringify(body),options)}
const routes=load('app/api/system-switch/world/route.ts',{'next/server':{NextResponse:response},'@/lib/auth-api':auth,'@/lib/db':{getPool:()=>pool},'@/lib/system-switch-presence':presence})
const secondPresence=load('lib/system-switch-presence.ts',{'./file-folder-world-runtime':runtime})
const secondRoutes=load('app/api/system-switch/world/route.ts',{'next/server':{NextResponse:response},'@/lib/auth-api':auth,'@/lib/db':{getPool:()=>secondPool},'@/lib/system-switch-presence':secondPresence})
const client='11111111-1111-4111-8111-111111111111',staff='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333'
const connection='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',staffConnection='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const clientToken='qa-client-token-only-00000000000000000000000000000000',staffToken='qa-staff-token-only-00000000000000000000000000000000',otherToken='qa-other-token-only-00000000000000000000000000000000'
function request(method,token,body,query='',origin='http://localhost'){const req=new Request('http://localhost/api/system-switch/world'+query,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),Origin:origin},...(body?{body:JSON.stringify(body)}:{})});req.nextUrl=new URL(req.url);return req}
const body=(id,sequence,x=0,z=8.2)=>({room:presence.SYSTEM_SWITCH_ROOM,connectionId:id,sequence,position:{x,z,yaw:0,heading:0},role:'admin',name:'SPOOFED OWNER'})
const age=()=>pool.query("UPDATE system_switch_presence SET updated_at=NOW()-INTERVAL '1 second'")
async function run(){
 await pool.query(`DROP TABLE IF EXISTS system_switch_presence,enterprise_legions,client_file_folders,sessions,users CASCADE;
 CREATE TABLE users(id uuid PRIMARY KEY,name text,username text,email text,role text,business_name text,is_active boolean DEFAULT true);
 CREATE TABLE sessions(token text,user_id uuid,expires_at timestamptz);
 CREATE TABLE client_file_folders(client_id uuid,status text);
 CREATE TABLE enterprise_legions(id uuid,client_id uuid,source_user_id uuid,active boolean,employment_status text,accepted_at timestamptz,created_at timestamptz)`)
 await pool.query(`INSERT INTO users(id,name,username,email,role,business_name) VALUES($1,'QA Client','qa-client','private-client@example.invalid','client','QA Published Business'),($2,'QA Bridger','qa-staff','private-staff@example.invalid','bridger',NULL),($3,'QA Unowned Client','qa-unowned','private-other@example.invalid','client',NULL)`,[client,staff,other])
 await pool.query("INSERT INTO sessions VALUES($1,$2,NOW()+INTERVAL '1 hour'),($3,$4,NOW()+INTERVAL '1 hour'),($5,$6,NOW()+INTERVAL '1 hour')",[clientToken,client,staffToken,staff,otherToken,other])
 await pool.query("INSERT INTO client_file_folders VALUES($1,'active')",[client])
 assert.equal((await routes.GET(request('GET'))).status,401)
 assert.equal((await routes.POST(request('POST',otherToken,body(connection,1)))).status,403,'Unowned Client cannot enter')
 assert.equal((await routes.POST(request('POST',clientToken,body(connection,1),'','https://untrusted.invalid'))).status,403)
 assert.equal((await routes.POST(request('POST',clientToken,{...body(connection,1),room:'private-client-folder'}))).status,400)
 let res=await routes.POST(request('POST',clientToken,body(connection,1,20,0)));assert.equal(res.status,200);let first=await res.json()
 assert.equal(first.self.role,'client');assert.equal(first.self.name,'QA Published Business');assert.equal(first.self.position.x,presence.spawnForUser(client).x,'Initial join starts at server spawn')
 res=await routes.POST(request('POST',staffToken,body(staffConnection,1)));assert.equal(res.status,200);let second=await res.json()
 assert.equal(second.people.length,1);assert.equal(second.people[0].id,first.self.id,'Both roles see the same room')
 assert(!JSON.stringify(second).includes('@example.invalid')&&!JSON.stringify(second).includes(client),'No email or private account identifier is exposed')
 await age();res=await routes.POST(request('POST',clientToken,body(connection,2,3)));assert.equal(res.status,200)
 let snapshot=await (await secondRoutes.GET(request('GET',staffToken))).json();assert.equal(snapshot.people[0].position.x,3,'Movement crosses API instances through PostgreSQL')
 assert.equal((await routes.POST(request('POST',clientToken,body(connection,2)))).status,409,'Out-of-order movement cannot overwrite newer movement')
 await age();res=await routes.POST(request('POST',clientToken,body(connection,3,26)));assert.equal(res.status,200);assert((await res.json()).self.position.x<=15.151,'Teleport is limited')
 await age();const concurrent=await Promise.all([routes.POST(request('POST',clientToken,body(connection,4,10))),routes.POST(request('POST',clientToken,body(connection,5,11)))])
 assert(concurrent.some(r=>r.status===200),'At least one concurrent movement commits')
 const committed=[];for(const response of concurrent){if(response.status===200)committed.push((await response.json()).sequence)}
 const latest=await pool.query('SELECT sequence FROM system_switch_presence WHERE user_id=$1 AND connection_id=$2',[client,connection]);assert.equal(Number(latest.rows[0].sequence),Math.max(...committed),'A stale concurrent update never overwrites a newer sequence')
 assert(concurrent.every(r=>[200,409,429].includes(r.status)))
 await routes.DELETE(request('DELETE',staffToken,null,'?connectionId='+connection))
 snapshot=await (await routes.GET(request('GET',staffToken))).json();assert.equal(snapshot.people.length,1,'Staff cannot delete another person’s connection')
 await pool.query("UPDATE system_switch_presence SET updated_at=NOW()-INTERVAL '21 seconds' WHERE user_id=$1",[client])
 snapshot=await (await routes.GET(request('GET',staffToken))).json();assert.equal(snapshot.people.length,0,'Disconnected avatars expire')
 res=await routes.POST(request('POST',clientToken,body(connection,6,26)));assert.equal((await res.json()).self.position.x,presence.spawnForUser(client).x,'Expired presence rejoins at spawn')
 await routes.DELETE(request('DELETE',clientToken,null,'?connectionId='+connection))
 snapshot=await (await routes.GET(request('GET',staffToken))).json();assert.equal(snapshot.people.length,0,'Leave removes the avatar')
 shield=true;assert.equal((await routes.GET(request('GET',staffToken))).status,401,'Divine Shield remains authoritative');shield=false
 await pool.query("UPDATE sessions SET expires_at=NOW()-INTERVAL '1 second' WHERE token=$1",[clientToken])
 assert.equal((await routes.GET(request('GET',clientToken))).status,401,'Expired sessions cannot enter')
 console.log('PASS: real PostgreSQL, real bearer-session auth logic, two roles, shared movement, concurrency, spoof rejection, ownership isolation, expiry, disconnect and Divine Shield')
}
run().then(()=>Promise.all([pool.end(),secondPool.end()])).catch(async error=>{console.error(error);await Promise.all([pool.end(),secondPool.end()]);process.exitCode=1})

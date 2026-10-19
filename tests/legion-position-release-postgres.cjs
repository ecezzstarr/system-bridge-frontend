const assert=require('node:assert/strict')
const fs=require('node:fs')
const ts=require('typescript')
const vm=require('node:vm')
const {Pool}=require('pg')
const workerApi=fs.readFileSync('app/api/weave/lifestyles/legion/route.ts','utf8')
const clientApi=fs.readFileSync('app/api/client/enterprise/legions/release/route.ts','utf8')
const workerUi=fs.readFileSync('app/(app)/weave/lifestyles/legion/page.tsx','utf8')
const clientUi=fs.readFileSync('app/(app)/client/enterprise/legions/page.tsx','utf8')
const runtimeAuth=fs.readFileSync('lib/auth-api.ts','utf8')
assert.ok(workerApi.indexOf("action==='release_legion'")<workerApi.indexOf("if(!access.active)"),'Resignation must remain possible despite expired Continuance')
assert.ok(clientApi.includes("actorPosition:'client'")&&!clientApi.includes('getClientMonthlyStanding'),'Client release is not gated by subscription')
assert.ok(workerUi.includes('Release my Legion position')&&workerUi.includes('window.location.assign'),'Agent/Bridger gets a mobile exit that clears cached role restriction')
assert.ok(clientUi.includes('Release Legion')&&clientUi.includes('/api/client/enterprise/legions/release'),'Client can end appointments')
assert.ok(runtimeAuth.includes("return {...user,baseRole:user.role,role:'legion'}"),'Failed employment lookup must never grant unverified Agent/Bridger work')

const base=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if(!base||new URL(base).pathname!=='/weave_switch_test')throw Error('Disposable PostgreSQL test URL required')
const url=new URL(base);url.pathname='/weave_legion_release_test'
const owner=new Pool({connectionString:base,max:1})
const pool=new Pool({connectionString:url.toString(),max:5})
const compiled=ts.transpileModule(fs.readFileSync('lib/legion-employment.ts','utf8'),{compilerOptions:{module:1,target:9}}).outputText
const mod={exports:{}}
vm.runInNewContext(compiled,{
  exports:mod.exports,
  require(name){
    if(name==='@/lib/db')return {getPool:()=>pool}
    if(['@/lib/enterprise-dream','@/lib/client-business-store','@/lib/legion-commerce'].includes(name)){
      return {ensureEnterpriseDreamSchema:async()=>{},ensureClientBusinessStoreSchema:async()=>{},
        ensureLegionCommerceSchema:async()=>{},legionCarrierPath:(a,b)=>a+'/'+b}
    }
    throw Error('Unexpected dependency '+name)
  },console,Number,String,Error,Promise
})
const {releaseLegionEmployment}=mod.exports
const sql=async(strings,...values)=>{
  let text=''
  for(let i=0;i<strings.length;i++){text+=strings[i];if(i<values.length)text+='$'+(i+1)}
  return (await pool.query(text,values)).rows
}
const u=n=>'60000000-0000-4000-8000-'+String(n).padStart(12,'0')
const client=u(1),worker=u(2),outsider=u(3),otherWorker=u(4),legion=u(10),secondLegion=u(11),order=u(20)
async function run(){
  try{await owner.query('CREATE DATABASE weave_legion_release_test')}
  catch(e){if(e.code!=='42P04')throw e}
  await pool.query(`
    DROP TABLE IF EXISTS legion_employment_releases,legion_lifestyle_applications,client_store_orders,enterprise_legions,notifications CASCADE;
    CREATE TABLE enterprise_legions(
      id uuid PRIMARY KEY,client_id uuid NOT NULL,source_user_id uuid,source_role varchar(20),
      name varchar(255),employment_status varchar(30) DEFAULT 'active',accepted_at timestamptz DEFAULT NOW(),
      created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),
      active boolean DEFAULT true,sales_enabled boolean DEFAULT true,sales_code varchar(80)
    );
    CREATE TABLE client_store_orders(
      id uuid PRIMARY KEY,legion_id uuid NOT NULL,status varchar(30) NOT NULL,
      payment_status varchar(30) NOT NULL,amount numeric(20,2) DEFAULT 0
    );
    CREATE TABLE notifications(id uuid DEFAULT gen_random_uuid(),user_id uuid NOT NULL,type text,title text,
      content text,from_user_name text,link text);
  `)
  await pool.query('INSERT INTO enterprise_legions(id,client_id,source_user_id,source_role,name,sales_code) VALUES($1,$2,$3,\'agent\',\'Worker A\',\'LG-01\')',[legion,client,worker])
  await pool.query('INSERT INTO enterprise_legions(id,client_id,source_user_id,source_role,name,sales_code) VALUES($1,$2,$3,\'bridger\',\'Worker B\',\'LG-02\')',[secondLegion,client,otherWorker])
  await pool.query('INSERT INTO client_store_orders(id,legion_id,status,payment_status,amount) VALUES($1,$2,\'requested\',\'awaiting_payment\',120)',[order,legion])
  let res=await releaseLegionEmployment(sql,{legionId:legion,actorUserId:outsider,actorPosition:'client',reason:'Unauthorized release attempt'})
  assert.equal(res.success,false)
  assert.equal(res.status,403)
  res=await releaseLegionEmployment(sql,{legionId:legion,actorUserId:worker,actorPosition:'worker',reason:'Voluntary end of employment'})
  assert.equal(res.success,true,JSON.stringify(res))
  assert.equal(res.pendingOrders,1)
  assert.equal(res.unpaidOrders,1)
  const row=(await pool.query('SELECT * FROM enterprise_legions WHERE id=$1',[legion])).rows[0]
  assert.equal(row.active,false)
  assert.equal(row.sales_enabled,false)
  assert.equal(row.employment_status,'released')
  assert.equal(String(row.released_by),worker)
  const oldOrder=(await pool.query('SELECT * FROM client_store_orders WHERE id=$1',[order])).rows[0]
  assert.equal(String(oldOrder.legion_id),legion,'Client keeps unfinished attributed orders')
  assert.equal(oldOrder.status,'requested')
  res=await releaseLegionEmployment(sql,{legionId:legion,actorUserId:worker,actorPosition:'worker',reason:'Repeated mobile tap'})
  assert.equal(res.alreadyReleased,true)
  assert.equal(Number((await pool.query('SELECT count(*)::int AS count FROM legion_employment_releases WHERE legion_id=$1',[legion])).rows[0].count),1)
  assert.equal(Number((await pool.query('SELECT count(*)::int AS count FROM notifications')).rows[0].count),2)
  res=await releaseLegionEmployment(sql,{legionId:secondLegion,actorUserId:client,actorPosition:'client',reason:'Enterprise changes operational arrangement'})
  assert.equal(res.success,true)
  assert.equal(Number((await pool.query("SELECT count(*)::int AS count FROM enterprise_legions WHERE active=true AND employment_status='active'")).rows[0].count),0)
  console.log('PASS: voluntary and Client Legion release, owner authorization, saved orders, once-only audit and role restoration')
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await pool.end();await owner.end()})

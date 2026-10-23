// Real PostgreSQL verification of two private Client File Folders represented
// as noncombat public domains. Never points at the production database.
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const {Pool}=require('pg')

const input=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if(!input||new URL(input).pathname!=='/weave_switch_test')
  throw Error('Only disposable /weave_switch_test PostgreSQL is permitted')
const db=new URL(input)
db.pathname='/weave_open_world_test'
const admin=new Pool({connectionString:input,max:1})
const pool=new Pool({connectionString:db.toString(),max:4})
const uuid=n=>'48000000-0000-4000-8000-'+String(n).padStart(12,'0')
const idA=uuid(1),idB=uuid(2),idC=uuid(3)
function load(file,deps={}){
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
  }).outputText
  const out={}
  vm.runInNewContext(code,{exports:out,require:name=>{
    if(name in deps)return deps[name]
    throw Error('Unexpected import: '+name)
  },Number,Math,Date,String,Error,console})
  return out
}
const domainModel=load('lib/weave-open-world-domains.ts')
const sql=async(parts,...values)=>{
  const text=parts.reduce((out,part,i)=>out+(i?'$'+i:'')+part,'')
  return (await pool.query(text,values)).rows
}
const store=load('lib/weave-open-world-store.ts',{
  '@/lib/client-business-store':{getBusinessDb:()=>sql},
  '@/lib/weave-open-world-domains':domainModel,
})
async function run(){
  try{await admin.query('CREATE DATABASE weave_open_world_test')}
  catch(e){if(e.code!=='42P04')throw e}
  await pool.query(`
    DROP TABLE IF EXISTS weave_open_world_project_contributions,
      weave_open_world_projects,weave_open_world_connections,
      weave_open_world_domains,client_store_items,client_business_stores,
      client_file_folder_builds,client_built_systems,
      file_folder_purchases,company_client_staff_offers,
      client_file_folders,users CASCADE;
    CREATE TABLE users(id uuid PRIMARY KEY,role text,is_active boolean DEFAULT true);
    CREATE TABLE client_file_folders(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid NOT NULL,
      file_number varchar(120) NOT NULL,status text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE client_file_folder_builds(
      id uuid PRIMARY KEY,client_id uuid NOT NULL,file_number text NOT NULL,
      status text NOT NULL,started_at timestamptz NOT NULL,
      completes_at timestamptz NOT NULL
    );
    CREATE TABLE client_built_systems(
      id uuid PRIMARY KEY,client_id uuid NOT NULL,file_number text NOT NULL,
      status text NOT NULL,system_type text NOT NULL,title text NOT NULL
    );
    CREATE TABLE client_business_stores(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid NOT NULL,
      file_number text NOT NULL,enabled boolean DEFAULT true,
      world_host_customer_market boolean DEFAULT false,
      formation_status text NOT NULL DEFAULT 'forming',
      name text,public_slug text
    );
    CREATE TABLE client_store_items(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),store_id uuid,
      enabled boolean DEFAULT true
    );
    CREATE TABLE file_folder_purchases(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid,file_number text,file_folder_tier text,status text,
      confirmed_at timestamptz,created_at timestamptz DEFAULT now()
    );
    CREATE TABLE company_client_staff_offers(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid,file_number text,folder_tier text,status text
    );
  `)
  // The migration itself must execute against a clean, real PostgreSQL 16.
  await pool.query(fs.readFileSync('migrations/20261023_burning_river_open_world_domains.sql','utf8'))
  await store.ensureWeaveOpenWorldSchema(sql)
  await pool.query("INSERT INTO users(id,role,is_active) VALUES($1,'client',true),($2,'client',true),($3,'client',false)",[idA,idB,idC])
  await pool.query(`
    INSERT INTO client_file_folders(client_id,file_number,status)
    VALUES ($1,'PRIVATE-A','active'),($2,'PRIVATE-B','active'),($3,'PRIVATE-C','active')
  `,[idA,idB,idC])
  await pool.query(`
    INSERT INTO file_folder_purchases(client_id,file_number,file_folder_tier,status,confirmed_at)
    VALUES ($1,'PRIVATE-A','plus','confirmed',now())
  `,[idA])
  await pool.query(`
    INSERT INTO company_client_staff_offers(client_id,file_number,folder_tier,status)
    VALUES ($1,'PRIVATE-A','pro','approved'),
      ($2,'PRIVATE-B','premium','approved')
  `,[idA,idB])
  assert.equal(await store.reconcileExistingWorldDomains(sql),2)
  assert.equal(await store.reconcileExistingWorldDomains(sql),0,'Replay cannot create new castles')
  const [a]=await sql`SELECT id,world_slot,tier FROM weave_open_world_domains WHERE client_id=${idA}::uuid`
  const [b]=await sql`SELECT id,world_slot,tier FROM weave_open_world_domains WHERE client_id=${idB}::uuid`
  assert.equal(a.tier,'plus','Verified retail entitlement outranks older staff offer')
  assert.equal(b.tier,'premium','Employee Client receives their actual granted File Folder tier')
  assert.notEqual(a.world_slot,b.world_slot)
  const replay=await store.provisionPurchasedWorldDomain({sql,clientId:idA,fileNumber:'PRIVATE-A',tier:'plus'})
  assert.equal(replay.slot,Number(a.world_slot),'Purchase replay cannot relocate world map domain')
  await pool.query(`
    INSERT INTO client_file_folder_builds(id,client_id,file_number,status,started_at,completes_at)
    VALUES ($1,$2,'PRIVATE-A','building',now()-interval '1 hour',now()+interval '1 hour')
  `,[uuid(101),idA])
  await pool.query(`
    INSERT INTO client_built_systems(id,client_id,file_number,status,system_type,title)
    VALUES ($1,$3,'PRIVATE-A','active','customer_door','PRIVATE DOOR BUILD'),
      ($2,$4,'PRIVATE-B','active','media_studio','PRIVATE SYSTEM BLUEPRINT')
  `,[uuid(201),uuid(202),idA,idB])
  await pool.query(`
    INSERT INTO client_business_stores(id,client_id,file_number,enabled,world_host_customer_market,
      formation_status,name,public_slug)
    VALUES ($1,$2,'PRIVATE-A',true,true,'ready_for_offer','Published Client Enterprise','published-company-door'),
      ($3,$4,'PRIVATE-B',false,false,'forming','HIDDEN BUSINESS','hidden-business')
  `,[uuid(301),idA,uuid(302),idB])
  const first=await store.getPublicBurningRiverWorld(sql,0)
  assert.equal(first.domains.length,2)
  const worldA=first.domains.find(d=>d.domainId===String(a.id))
  const worldB=first.domains.find(d=>d.domainId===String(b.id))
  assert.ok(worldA&&worldB)
  assert.equal(worldA.customerDoor.open,true)
  assert.equal(worldA.customerDoor.href,'/market/published-company-door?via=system-switch')
  assert.equal(worldA.activity.activeBuilds,1)
  assert.equal(worldB.customerDoor.open,false)
  assert.equal(worldB.customerDoor.href,null)
  assert.ok(!JSON.stringify(first).includes('PRIVATE SYSTEM BLUEPRINT'))
  assert.ok(!JSON.stringify(first).includes('PRIVATE-A'))
  assert.ok(!JSON.stringify(first).includes('HIDDEN BUSINESS'))
  assert.ok(!JSON.stringify(first).includes(String(idA)))
  assert.ok(!JSON.stringify(first).includes(String(idB)))
  const pair=[String(a.id),String(b.id)].sort()
  const [connection]=await sql`
    INSERT INTO weave_open_world_connections(
      loop_key,domain_a,domain_b,requested_by,status,responded_at
    ) VALUES('flame-event-01',${pair[0]}::uuid,${pair[1]}::uuid,${a.id}::uuid,'accepted',now())
    RETURNING id
  `
  const [project]=await sql`
    INSERT INTO weave_open_world_projects(
      connection_id,created_by_domain,kind,title,status,accepted_at
    ) VALUES(${connection.id}::uuid,${a.id}::uuid,'shared_service','Verified Client Service','active',now())
    RETURNING id
  `
  const connectedOnly=await store.getPublicBurningRiverWorld(sql,0)
  assert.equal(connectedOnly.domains.find(d=>d.domainId===String(a.id)).activity.jointFormations,0,
    'An accepted invitation is not a fabricated operating business')
  await sql`
    INSERT INTO weave_open_world_project_contributions(project_id,domain_id,system_id)
    VALUES(${project.id}::uuid,${a.id}::uuid,${uuid(201)}::uuid),
      (${project.id}::uuid,${b.id}::uuid,${uuid(202)}::uuid)
  `
  const connected=await store.getPublicBurningRiverWorld(sql,0)
  assert.equal(connected.domains.find(d=>d.domainId===String(a.id)).activity.jointFormations,1)
  assert.equal(connected.domains.find(d=>d.domainId===String(b.id)).activity.jointFormations,1)
  assert.equal(connected.links.length,1,'Only accepted partnerships draw links between castles')
  await sql`UPDATE client_built_systems SET status='paused' WHERE id=${uuid(202)}::uuid`
  const paused=await store.getPublicBurningRiverWorld(sql,0)
  assert.equal(paused.domains.find(d=>d.domainId===String(a.id)).activity.jointFormations,0,
    'Suspending a partner system must reverse the claimed joint formation')
  assert.equal(paused.domains.find(d=>d.domainId===String(b.id)).activity.jointFormations,0)
  console.log('PASS: real PostgreSQL two-Client map, verified purchase/employee entitlement, public privacy, replay safety and live joint-system reversal')
}
run().catch(error=>{console.error(error);process.exitCode=1})
  .finally(async()=>{await pool.end();await admin.end()})

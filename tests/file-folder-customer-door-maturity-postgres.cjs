const assert=require('node:assert/strict')
const fs=require('node:fs')
const ts=require('typescript')
const vm=require('node:vm')
const {Pool}=require('pg')

const original=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if(!original || new URL(original).pathname!=='/weave_switch_test')throw Error('Disposable /weave_switch_test Postgres required')
const uri=new URL(original);uri.pathname='/weave_customer_door_test'
const owner=new Pool({connectionString:original,max:1})
const pool=new Pool({connectionString:uri.toString(),max:4})
const src=ts.transpileModule(fs.readFileSync('lib/customer-door-maturity.ts','utf8'),{compilerOptions:{module:1,target:9}}).outputText
const mod={exports:{}}
vm.runInNewContext(src,{exports:mod.exports,require(name){throw Error('Unexpected dependency '+name)},console,Number})
const {matureElapsedCustomerDoors}=mod.exports
const sql=async(strings,...values)=>{
  assert.equal(values.length,0,'Maturity statement should remain fully parameter-free')
  return (await pool.query(strings.join(''))).rows
}
const items=['door_foundation_frame','door_identity_facade','door_customer_intake','door_service_interface','door_fulfilment_interface','door_public_commissioning']
const uuid=n=>'40000000-0000-4000-8000-'+String(n).padStart(12,'0')

async function run(){
  try{await owner.query('CREATE DATABASE weave_customer_door_test')}
  catch(e){if(e.code!=='42P04')throw e}
  await pool.query(`
    DROP TABLE IF EXISTS client_file_folder_build_parts,client_built_systems,client_file_folder_builds,client_business_stores,client_file_folders CASCADE;
    CREATE TABLE client_file_folders(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid NOT NULL,file_number text NOT NULL,status text NOT NULL
    );
    CREATE TABLE client_business_stores(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),client_id uuid NOT NULL,file_number text NOT NULL,enabled boolean NOT NULL DEFAULT true,
      formation_status text NOT NULL DEFAULT 'forming',first_offer_published_at timestamptz,public_opened_at timestamptz,updated_at timestamptz DEFAULT NOW()
    );
    CREATE TABLE client_file_folder_builds(
      id uuid PRIMARY KEY,client_id uuid NOT NULL,file_number text NOT NULL,title text NOT NULL,blueprint_key text NOT NULL,
      system_type text NOT NULL,status text NOT NULL,completes_at timestamptz NOT NULL,completed_at timestamptz,updated_at timestamptz DEFAULT NOW()
    );
    CREATE TABLE client_file_folder_build_parts(build_id uuid NOT NULL,item_key text NOT NULL,quantity integer NOT NULL);
    CREATE TABLE client_built_systems(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),build_id uuid UNIQUE NOT NULL,
      client_id uuid NOT NULL,file_number text NOT NULL,system_type text NOT NULL,title text NOT NULL,
      configuration jsonb NOT NULL,status text DEFAULT 'active',activated_at timestamptz NOT NULL DEFAULT NOW()
    );
  `)
  for(const [n,due,partCount,opened,withOffer] of [
    [1,true,6,false,false],[2,true,5,false,false],[3,false,6,false,false],[4,true,6,true,true],[5,true,6,false,true]
  ]){
    const client=uuid(n),build=uuid(n+100),name='W-'+n
    await pool.query('INSERT INTO client_file_folders(client_id,file_number,status) VALUES($1,$2,$3)',[client,name,'active'])
    await pool.query(`
      INSERT INTO client_business_stores(client_id,file_number,formation_status,public_opened_at,first_offer_published_at)
      VALUES($1,$2,$3,$4,$5)
    `,[client,name,opened?'selling':'forming',opened?new Date('2026-10-01T00:00:00Z'):null,withOffer?new Date('2026-10-01T00:00:00Z'):null])
    await pool.query(`
      INSERT INTO client_file_folder_builds(id,client_id,file_number,title,blueprint_key,system_type,status,completes_at)
      VALUES($1,$2,$3,'Customer Door','customer_door','customer_door',$4,NOW() + ($5::int * INTERVAL '1 day'))
    `,[build,client,name,opened?'complete':'building',due?-1:1])
    for(const item of items.slice(0,partCount))await pool.query(
      'INSERT INTO client_file_folder_build_parts(build_id,item_key,quantity) VALUES($1,$2,1)',[build,item]
    )
    if(opened)await pool.query(`
      INSERT INTO client_built_systems(build_id,client_id,file_number,system_type,title,configuration)
      VALUES($1,$2,$3,'customer_door','Customer Door','{}')
    `,[build,client,name])
  }
  assert.equal(await matureElapsedCustomerDoors(sql),2)
  assert.equal(await matureElapsedCustomerDoors(sql),0,'Replay cannot reopen Customer Doors or create duplicates')
  const stores=(await pool.query('SELECT file_number,formation_status,public_opened_at FROM client_business_stores ORDER BY file_number')).rows
  assert.equal(stores[0].formation_status,'ready_for_offer','Elapsed complete door is publicly enterable without first offer')
  assert.ok(stores[0].public_opened_at)
  assert.equal(stores[1].formation_status,'forming','Missing parts cannot be commissioned')
  assert.equal(stores[2].formation_status,'forming','Unfinished construction cannot be accelerated')
  assert.equal(stores[3].formation_status,'selling','Already live businesses cannot be reset')
  assert.equal(stores[3].public_opened_at.toISOString(),'2026-10-01T00:00:00.000Z')
  assert.equal(stores[4].formation_status,'selling','Finished Client with offer is immediately selling')
  const count=Number((await pool.query('SELECT COUNT(*)::int AS c FROM client_built_systems')).rows[0].c)
  assert.equal(count,3,'Exactly one commissioned record per mature door')
  console.log('PASS: Client Customer Doors mature on public read after elapsed time; missing parts, future builds and live businesses remain protected')
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await pool.end();await owner.end()})

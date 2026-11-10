import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {Pool} from 'pg'

async function main(){
  const base=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
  if(!base||new URL(base).pathname!=='/weave_switch_test')throw Error('Disposable WEAVE PostgreSQL test URL required')
  const schema='weave_branding_test_'+process.pid
  const root=path.resolve(process.cwd())
  const owner=new Pool({connectionString:base,max:1})
  let pool:Pool|null=null
  let created=false
  try{
    await owner.query('CREATE SCHEMA "'+schema+'"');created=true
    const url=new URL(base)
    url.searchParams.set('options','-c search_path='+schema)
    pool=new Pool({connectionString:url.toString(),max:3})
    await pool.query('CREATE TABLE users(id uuid PRIMARY KEY,role text,name text)')
    await pool.query(readFileSync(path.join(root,'migrations/20261110_branding_business_launch.sql'),'utf8'))
    const agent=randomUUID(),bridger=randomUUID()
    await pool.query("INSERT INTO users(id,role,name) VALUES($1::uuid,'agent','An Agent'),($2::uuid,'bridger','A Bridger')",[agent,bridger])
    await pool.query("INSERT INTO weave_branding_launch_plans(user_id,role,kit_id,business_name,offer_text,audience,daily_outreach_goal) VALUES($1::uuid,'agent','apparel','Artist Merchandise','Custom shirt designs','Customers',2)",[agent])
    await assert.rejects(pool.query("INSERT INTO weave_branding_launch_plans(user_id,role,kit_id,business_name,offer_text,audience,daily_outreach_goal) VALUES($1::uuid,'admin','ads','Invalid','Bad offer','Anyone',2)",[bridger]),/check constraint/i)
    await assert.rejects(pool.query("UPDATE weave_branding_launch_plans SET customer_quote_ngn=-5 WHERE user_id=$1::uuid",[agent]),/check constraint/i)
    await assert.rejects(pool.query("UPDATE weave_branding_launch_plans SET daily_outreach_goal=0 WHERE user_id=$1::uuid",[agent]),/check constraint/i)
    const clientKey=randomUUID()
    const ad=await pool.query("INSERT INTO weave_branding_ad_campaigns(user_id,client_key,kit_id,sample_id,channel,headline,message) VALUES($1::uuid,$2::uuid,'apparel','brand-tee-classic','whatsapp_status','New shirts available','Customer advertisement') RETURNING id,status,created_at",[agent,clientKey])
    assert.equal(ad.rows[0].status,'prepared')
    await assert.rejects(pool.query("INSERT INTO weave_branding_ad_campaigns(user_id,client_key,kit_id,sample_id,channel,headline,message) VALUES($1::uuid,$2::uuid,'apparel','brand-tee-classic','whatsapp_status','Duplicate','Must not duplicate')",[agent,clientKey]),/unique constraint/i)
    await pool.query("UPDATE weave_branding_ad_campaigns SET status='reported_shared',reported_shared_at=now() WHERE id=$1::uuid",[ad.rows[0].id])
    const state=(await pool.query("SELECT status,reported_shared_at FROM weave_branding_ad_campaigns WHERE id=$1::uuid",[ad.rows[0].id])).rows[0]
    assert.equal(state.status,'reported_shared')
    assert.ok(state.reported_shared_at)
    await pool.query("INSERT INTO weave_branding_template_features(sample_id,featured) VALUES('brand-tee-classic',true) ON CONFLICT(sample_id) DO UPDATE SET featured=EXCLUDED.featured")
    assert.equal((await pool.query("SELECT featured FROM weave_branding_template_features WHERE sample_id='brand-tee-classic'")).rows[0].featured,true)
    const noCash=(await pool.query("SELECT COUNT(*)::int AS count FROM information_schema.columns WHERE table_schema=$1 AND table_name='weave_branding_ad_campaigns' AND column_name='revenue_ngn'",[schema])).rows[0].count
    assert.equal(noCash,0,'Prepared ads never create fictional cash revenue')
    console.log('PASS: isolated PostgreSQL branding plans, role checks, idempotent ad keys, honest shares and Admin template features')
  }finally{
    if(pool)await pool.end()
    if(created)await owner.query('DROP SCHEMA "'+schema+'" CASCADE')
    await owner.end()
  }
}
main().catch(error=>{console.error(error);process.exitCode=1})

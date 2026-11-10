import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Pool} from 'pg'

/** Disposable PostgreSQL test of real WEAVE Image House purchases and refunds on failure. */
async function main(){
  const base=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
  if(!base||new URL(base).pathname!=='/weave_switch_test')throw Error('Disposable PostgreSQL test URL required')
  const schema='weave_sample_shop_'+process.pid
  const admin=new Pool({connectionString:base,max:1})
  let pool:Pool|null=null
  let commercePool:Pool|null=null
  let schemaCreated=false
  try{
    await admin.query('CREATE SCHEMA "'+schema+'"')
    schemaCreated=true
    const url=new URL(base)
    url.searchParams.set('options','-c search_path='+schema)
    process.env.DATABASE_URL=url.toString()
    pool=new Pool({connectionString:url.toString(),max:4})
    await pool.query('CREATE TABLE users(id uuid PRIMARY KEY,name text,username text,role text,is_active boolean DEFAULT true)')
    await pool.query('CREATE TABLE wallets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),is_primary boolean NOT NULL DEFAULT true,balance_trx numeric(30,8) NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now())')
    const a=randomUUID(),b=randomUUID(),adminId=randomUUID()
    for(const [id,role,name] of [[a,'agent','Agent Demo'],[b,'bridger','Bridger Demo'],[adminId,'admin','A Time']] as const){
      await pool.query('INSERT INTO users(id,role,name,username) VALUES($1::uuid,$2,$3,$4)',[id,role,name,id.slice(0,8)])
    }
    await pool.query('INSERT INTO wallets(user_id,balance_trx) VALUES($1::uuid,5),($2::uuid,5)',[a,b])
    const {ensureSampleCommerceSchema,purchaseSampleLicense,readSampleStudio}=await import('../lib/weave-image-sample-commerce')
    const {findImageSample,defaultSampleEdits}=await import('../lib/weave-image-sample-art')
    const {getPool}=await import('../lib/db')
    commercePool=getPool()
    await ensureSampleCommerceSchema()
    const sample=findImageSample('citadel-office')
    assert.ok(sample)
    const edits=defaultSampleEdits(sample)
    const first=await purchaseSampleLicense(a,'agent',sample.id,edits)
    assert.equal(first.existing,false)
    assert.equal(first.paid,1)
    assert.equal(Number((await pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid',[a])).rows[0].balance_trx),4)
    const again=await purchaseSampleLicense(a,'agent',sample.id,edits)
    assert.equal(again.existing,true)
    assert.equal(again.paid,0)
    assert.equal(again.license.id,first.license.id)
    assert.equal(Number((await pool.query("SELECT count(*)::int AS n FROM weave_receipts WHERE source='image_sample_workshop'")).rows[0].n),1)

    const jobId=randomUUID()
    await pool.query("INSERT INTO weave_image_sample_requests(id,provider_user_id,customer_name,customer_contact,customer_brief,status) VALUES($1::uuid,$2::uuid,'Customer','customer@example.invalid','Custom new image for a business promotion','accepted')",[jobId,a])
    const sold=await purchaseSampleLicense(a,'agent',sample.id,edits,jobId)
    assert.equal(sold.existing,false,'Distinct customer job pays company again')
    assert.equal(sold.paid,1)
    assert.notEqual(sold.license.id,first.license.id)
    assert.equal(Number((await pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid',[a])).rows[0].balance_trx),3)
    await assert.rejects(purchaseSampleLicense(b,'bridger',sample.id,edits,jobId),/accepted customer request/)
    assert.equal(Number((await pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid',[b])).rows[0].balance_trx),5)

    await pool.query("UPDATE weave_image_sample_settings SET export_fee=2.5 WHERE key='company'")
    const other=await purchaseSampleLicense(a,'agent','golden-residence',defaultSampleEdits(findImageSample('golden-residence')!))
    assert.equal(other.paid,2.5)
    const after=Number((await pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid',[a])).rows[0].balance_trx)
    assert.equal(after,0.5)
    await assert.rejects(purchaseSampleLicense(a,'agent','garden-retreat',defaultSampleEdits(findImageSample('garden-retreat')!)),/Not enough System Switch/)
    assert.equal(Number((await pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid',[a])).rows[0].balance_trx),0.5,'Failed checkout never takes money')

    const official=await purchaseSampleLicense(adminId,'admin',sample.id,edits)
    assert.equal(official.paid,0)
    const count=Number((await pool.query("SELECT count(*)::int AS n FROM weave_receipts WHERE source='image_sample_workshop'")).rows[0].n)
    assert.equal(count,3,'Only paid production records generate company receipts')
    const day=await readSampleStudio(adminId,'A Time','admin')
    const values=day.companyDaily as {sales:number;companyEarned:number}[]
    assert.equal(values[0].sales,3)
    assert.equal(values[0].companyEarned,4.5)
    assert.equal(Number((await pool.query('SELECT count(*)::int AS n FROM weave_image_sample_licenses')).rows[0].n),4)
    console.log('PASS: System Switch image licensing: paid company receipts, commission fee, idempotence, isolation, insufficient balance and daily earnings')
  }finally{
    if(pool)await pool.end()
    if(commercePool)await commercePool.end()
    if(schemaCreated)await admin.query('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE')
    await admin.end()
  }
}
main().catch(e=>{console.error(e);process.exitCode=1})

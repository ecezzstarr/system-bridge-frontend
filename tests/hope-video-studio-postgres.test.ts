import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Pool} from 'pg'

async function main(){
  const base=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
  if(!base||new URL(base).pathname!=='/weave_switch_test')throw Error('Disposable WEAVE PostgreSQL test URL required')
  const schema='weave_hope_studio_test_'+process.pid
  const owner=new Pool({connectionString:base,max:1})
  let pool:Pool|null=null
  let created=false
  try{
    await owner.query('CREATE SCHEMA "'+schema+'"')
    created=true
    const url=new URL(base);url.searchParams.set('options','-c search_path='+schema)
    process.env.DATABASE_URL=url.toString()
    pool=new Pool({connectionString:url.toString(),max:10})
    await pool.query('CREATE TABLE users(id uuid PRIMARY KEY,role text NOT NULL,is_active boolean NOT NULL DEFAULT true)')
    await pool.query('CREATE TABLE bridger_profiles(user_id uuid PRIMARY KEY REFERENCES users(id),status text NOT NULL)')
    await pool.query('CREATE TABLE wallets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),is_primary boolean NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),balance_trx numeric(20,8) NOT NULL)')
    await pool.query('CREATE TABLE ledger_entries(id uuid PRIMARY KEY,user_id uuid NOT NULL,entry_type text,amount numeric(20,8),currency text,description text,balance_before numeric(20,8),balance_after numeric(20,8),metadata jsonb,created_at timestamptz)')
    const bridger=randomUUID(),agent=randomUUID(),poor=randomUUID()
    await pool.query("INSERT INTO users(id,role) VALUES($1::uuid,'bridger'),($2::uuid,'agent'),($3::uuid,'bridger')",[bridger,agent,poor])
    await pool.query("INSERT INTO bridger_profiles(user_id,status) VALUES($1::uuid,'active'),($2::uuid,'active')",[bridger,poor])
    await pool.query('INSERT INTO wallets(user_id,is_primary,balance_trx) VALUES($1::uuid,true,250),($2::uuid,true,1)',[bridger,poor])
    const {purchaseHopeVideoFilter,ownedHopeVideoFilters}=await import('../lib/hope-video-filter-purchase')
    const {purchaseHopeStudioBundle,ownedHopeStudioBundles}=await import('../lib/hope-video-studio-purchase')
    const {getHopeStudioBundle,quoteHopeStudioBundle}=await import('../lib/hope-video-studio-bundles')
    const initial=await purchaseHopeVideoFilter(bridger,'radiance-warm')
    assert(initial.success&&!initial.alreadyOwned)
    const expected=quoteHopeStudioBundle(getHopeStudioBundle('studio-starter')!,['radiance-warm'])
    assert(expected.chargedSystemSwitch>0&&expected.chargedSystemSwitch<36,'Owned single item reduces package charge')
    const results=await Promise.all([
      purchaseHopeStudioBundle(bridger,'studio-starter'),
      purchaseHopeStudioBundle(bridger,'studio-starter'),
      purchaseHopeStudioBundle(bridger,'studio-starter'),
    ])
    assert(results.every(x=>x.success),'Concurrent buyers receive a successful response')
    assert.equal(results.filter(x=>x.success&&!x.alreadyOwned).length,1,'Concurrent purchase charged only once')
    const charged=results.find(x=>x.success&&!x.alreadyOwned)
    assert.equal(charged?.chargedSystemSwitch,expected.chargedSystemSwitch)
    assert.equal((await pool.query('SELECT COUNT(*)::int AS total FROM weave_hope_video_bundle_purchases WHERE bridger_id=$1::uuid',[bridger])).rows[0].total,1)
    assert.equal((await pool.query('SELECT COUNT(*)::int AS total FROM weave_hope_video_bundle_grants WHERE bridger_id=$1::uuid',[bridger])).rows[0].total,4,'One preowned item is not redundantly granted')
    assert.equal((await ownedHopeVideoFilters(bridger)).length,5,'Bundle entitlements appear in the original gallery')
    const alreadySingle=await purchaseHopeVideoFilter(bridger,'background-hide')
    assert(alreadySingle.success&&alreadySingle.alreadyOwned&&alreadySingle.chargedSystemSwitch===0,'Bundle-owned item cannot be charged again')
    const fullBundle=await purchaseHopeStudioBundle(bridger,'full-studio')
    assert(fullBundle.success&&!fullBundle.alreadyOwned,'Bridger can upgrade collection')
    const all=await ownedHopeVideoFilters(bridger)
    assert.equal(all.length,28,'All available effects are licensed')
    assert.equal(new Set(all.map(row=>row.filter_id)).size,28)
    const finalBalance=Number((await pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid',[bridger])).rows[0].balance_trx)
    assert.equal(finalBalance,250-2-expected.chargedSystemSwitch-fullBundle.chargedSystemSwitch)
    assert.equal((await ownedHopeStudioBundles(bridger)).length,2)
    assert.equal((await pool.query('SELECT COUNT(*)::int AS total FROM ledger_entries WHERE user_id=$1::uuid',[bridger])).rows[0].total,3)
    assert.equal((await pool.query('SELECT COUNT(*)::int AS total FROM weave_receipts WHERE user_id=$1::uuid',[bridger])).rows[0].total,3)
    const noBalance=await purchaseHopeStudioBundle(poor,'studio-starter')
    assert(!noBalance.success&&noBalance.reason==='insufficient_balance')
    const notBridger=await purchaseHopeStudioBundle(agent,'studio-starter')
    assert(!notBridger.success&&notBridger.reason==='bridger_unavailable')
    const badProduct=await purchaseHopeStudioBundle(bridger,'not-a-product')
    assert(!badProduct.success&&badProduct.reason==='invalid_bundle')
    console.log('PASS: Concurrent permanent Hope Studio package purchases, fair price for owned effects, zero double charges, all 28 owned and receipts reconciled')
  }finally{
    if(pool)await pool.end()
    if(created)await owner.query('DROP SCHEMA "'+schema+'" CASCADE')
    await owner.end()
  }
}
main().catch(error=>{console.error(error);process.exitCode=1})

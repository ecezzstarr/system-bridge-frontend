import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Pool} from 'pg'

async function main(){
  const base=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
  if(!base||new URL(base).pathname!=='/weave_switch_test')throw Error('Disposable WEAVE PostgreSQL test URL required')
  const schema='weave_video_filter_test_'+process.pid
  const owner=new Pool({connectionString:base,max:1})
  let pool:Pool|null=null
  let created=false
  try{
    await owner.query('CREATE SCHEMA "'+schema+'"')
    created=true
    const url=new URL(base)
    url.searchParams.set('options','-c search_path='+schema)
    process.env.DATABASE_URL=url.toString()
    pool=new Pool({connectionString:url.toString(),max:5})
    await pool.query('CREATE TABLE users(id uuid PRIMARY KEY,role text NOT NULL,is_active boolean NOT NULL DEFAULT true)')
    await pool.query('CREATE TABLE bridger_profiles(user_id uuid PRIMARY KEY REFERENCES users(id),status text NOT NULL)')
    await pool.query('CREATE TABLE wallets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),is_primary boolean NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),balance_trx numeric(20,8) NOT NULL)')
    await pool.query('CREATE TABLE ledger_entries(id uuid PRIMARY KEY,user_id uuid NOT NULL,entry_type text,amount numeric(20,8),currency text,description text,balance_before numeric(20,8),balance_after numeric(20,8),metadata jsonb,created_at timestamptz)')
    const person=randomUUID(),agent=randomUUID()
    await pool.query("INSERT INTO users(id,role) VALUES($1::uuid,'bridger'),($2::uuid,'agent')",[person,agent])
    await pool.query("INSERT INTO bridger_profiles(user_id,status) VALUES($1::uuid,'active')",[person])
    await pool.query('INSERT INTO wallets(user_id,is_primary,balance_trx) VALUES($1::uuid,true,8)',[person])
    // Dynamic import after the disposable database URL is set.
    const {purchaseHopeVideoFilter,ownedHopeVideoFilters}=await import('../lib/hope-video-filter-purchase')
    const [a,b,c]=await Promise.all([
      purchaseHopeVideoFilter(person,'radiance-warm'),
      purchaseHopeVideoFilter(person,'radiance-warm'),
      purchaseHopeVideoFilter(person,'radiance-warm'),
    ])
    assert([a,b,c].every(x=>x.success))
    assert.equal([a,b,c].filter(x=>x.success&&!x.alreadyOwned).length,1,'Concurrent purchase charged only once')
    let current=(await pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid',[person])).rows[0]
    assert.equal(Number(current.balance_trx),6)
    assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM weave_hope_video_filter_purchases WHERE bridger_id=$1::uuid',[person])).rows[0].n,1)
    assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM ledger_entries WHERE user_id=$1::uuid',[person])).rows[0].n,1)
    const second=await purchaseHopeVideoFilter(person,'dream-violet')
    assert(second.success&&!second.alreadyOwned)
    current=(await pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid',[person])).rows[0]
    assert.equal(Number(current.balance_trx),3)
    const refused=await purchaseHopeVideoFilter(person,'soft-portrait')
    assert(refused.success,'Available balance still permits a priced filter')
    const insufficient=await purchaseHopeVideoFilter(person,'ocean-cool')
    assert(!insufficient.success&&insufficient.reason==='insufficient_balance')
    const invalid=await purchaseHopeVideoFilter(person,'free-unlisted')
    assert(!invalid.success&&invalid.reason==='invalid_filter')
    const other=await purchaseHopeVideoFilter(agent,'radiance-warm')
    assert(!other.success&&other.reason==='bridger_unavailable')
    assert.equal((await ownedHopeVideoFilters(person)).length,3)
    const all=(await pool.query('SELECT SUM(amount)::numeric AS spent FROM ledger_entries WHERE user_id=$1::uuid',[person])).rows[0]
    assert.equal(Number(all.spent),8)
    assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM weave_receipts WHERE user_id=$1::uuid',[person])).rows[0].n,3)
    console.log('PASS: PostgreSQL concurrent filter purchase charges once, entitlements persist, transactions reconcile and unauthorized requests do not charge')
  }finally{
    if(pool)await pool.end()
    if(created)await owner.query('DROP SCHEMA "'+schema+'" CASCADE')
    await owner.end()
  }
}
main().catch(e=>{console.error(e);process.exitCode=1})

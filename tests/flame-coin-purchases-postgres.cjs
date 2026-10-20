const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const {Pool}=require('pg')
const crypto=require('node:crypto')

const rootUri=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if(!rootUri||new URL(rootUri).pathname!=='/weave_switch_test')
  throw Error('Disposable weave_switch_test database URL required')
const url=new URL(rootUri)
url.pathname='/weave_flame_coin_test'
const pool=new Pool({connectionString:url.toString(),max:6,connectionTimeoutMillis:10000})

function load(file,deps){
  const mod={exports:{}}
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9}}).outputText
  vm.runInNewContext(js,{exports:mod.exports,require:name=>{
    if(name in deps)return deps[name]
    if(name==='node:crypto')return crypto
    throw Error('Unexpected import: '+name)
  },console,process:{env:{...process.env,
    WEAVE_VASP_AUTHORIZED:'true',WEAVE_CRYPTO_PAYMENTS_AUTHORIZED:'true',
    WEAVE_TRON_WALLET_OWNERSHIP_VERIFIED:'true'
  }},Date,Math})
  return mod.exports
}
const rows=async(text,args=[])=>(await pool.query(text,args)).rows
const ensureReceipt=async()=>pool.query(`
  CREATE TABLE IF NOT EXISTS weave_receipts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number varchar(80) UNIQUE NOT NULL,
    user_id uuid NOT NULL,
    kind varchar(30) NOT NULL,
    source varchar(80) NOT NULL,
    source_id text,
    amount numeric(30,8) NOT NULL,
    currency varchar(20) NOT NULL,
    status varchar(30) NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT NOW()
  )
`)
const sale=load('lib/weave-flame-coin-sales.ts',{
  '@/lib/db':{getPool:()=>pool},
  '@/lib/weave-receipts':{ensureWeaveReceiptSchema:ensureReceipt},
  '@/lib/world/constants':{WORLD_RULES:{COMPANY_TRX_WALLET:'TFT8e4EbMTvfQUGBHSz6LWTi4wokRBBz32'}}
})
const admin='20000000-0000-4000-8000-000000000001'
const buyer='20000000-0000-4000-8000-000000000002'
const other='20000000-0000-4000-8000-000000000003'
const id=(n)=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0')

async function seed(){
  const owner=new Pool({connectionString:rootUri})
  try{await owner.query('CREATE DATABASE weave_flame_coin_test')}
  catch(e){if(e.code!=='42P04')throw e}
  finally{await owner.end()}
  await pool.query(`
    DROP TABLE IF EXISTS weave_flame_coin_orders,weave_receipts,ledger_entries,notifications,wallets,users CASCADE;
    CREATE TABLE users(
      id uuid PRIMARY KEY,role text NOT NULL,email text NOT NULL,is_active boolean DEFAULT true
    );
    CREATE TABLE wallets(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id),balance_trx numeric(30,8) NOT NULL,
      is_primary boolean DEFAULT true,updated_at timestamptz DEFAULT NOW()
    );
    CREATE TABLE ledger_entries(
      id uuid PRIMARY KEY,user_id uuid NOT NULL,entry_type text,amount numeric(30,8),currency text,
      description text,balance_before numeric(30,8),balance_after numeric(30,8),
      metadata jsonb,created_at timestamptz
    );
    CREATE TABLE notifications(
      id uuid DEFAULT gen_random_uuid(),user_id uuid,type text,title text,content text,
      from_user_name text,link text,created_at timestamptz DEFAULT NOW()
    );
  `)
  for(const [user,role,email,balance] of [
    [admin,'admin','admin@example.test',500],
    [buyer,'client','buyer@example.test',0],
    [other,'agent','wrong@example.test',0]
  ]){
    await pool.query('INSERT INTO users(id,role,email) VALUES($1,$2,$3)',[user,role,email])
    await pool.query('INSERT INTO wallets(user_id,balance_trx,is_primary) VALUES($1,$2,true)',[user,balance])
  }
  await sale.ensureFlameCoinSalesSchema()
}
async function insertOrder(n,amount,status,mail='buyer@example.test'){
  const key=String(n).padStart(64,'a').slice(-64).replace(/[^a-f0-9]/g,'a')
  const order=id(n)
  await pool.query(`
    INSERT INTO weave_flame_coin_orders
    (id,buyer_name,buyer_email,flame_coin_amount,payment_method,bank_reference,
      status,verified_at,verification_evidence,provider)
    VALUES($1,'Buyer',$2,$3,'trx',$4,$5::text,
      CASE WHEN $5::text='payment_verified' THEN NOW() ELSE NULL END,
      CASE WHEN $5::text='payment_verified' THEN 'Independently verified TRON payment: correct sender and receiver, transaction hash, confirmed chain, exact asset and final value.' ELSE NULL END,
      'manual_crypto_receipt')
  `,[order,mail,amount,key,status])
  return order
}
const balance=async(user)=>{
  const result=await rows('SELECT balance_trx FROM wallets WHERE user_id=$1',[user])
  return Number(result[0].balance_trx)
}
async function run(){
  await seed()
  assert.equal(sale.flameCoinMethodEnabled('trx'),true)
  assert.equal(sale.flameCoinMethodEnabled('usdt'),false,'USDT address and custody must be configured')
  assert.equal(sale.flameCoinMethodEnabled('btc'),false,'BTC address and custody must be configured')
  const order=await insertOrder(1,10,'payment_verified')
  let paid=await sale.creditVerifiedFlameCoinPurchase({orderId:order,adminId:admin,recipientId:buyer})
  assert.equal(paid.success,true,JSON.stringify(paid))
  assert.equal(paid.amountFlameCoin,10)
  assert.equal(await balance(admin),490)
  assert.equal(await balance(buyer),10)
  paid=await sale.creditVerifiedFlameCoinPurchase({orderId:order,adminId:admin,recipientId:buyer})
  assert.equal(paid.alreadyCredited,true,'Repeated credit should not charge twice')
  assert.equal(await balance(admin),490)
  assert.equal(await balance(buyer),10)
  assert.equal(Number((await rows('SELECT count(*)::int AS count FROM weave_receipts'))[0].count),1)
  assert.equal(Number((await rows('SELECT count(*)::int AS count FROM ledger_entries'))[0].count),2)
  const incorrect=await insertOrder(2,15,'payment_verified')
  let fail=await sale.creditVerifiedFlameCoinPurchase({orderId:incorrect,adminId:admin,recipientId:other})
  assert.equal(fail.success,false,'Wrong buyer email cannot receive coin')
  assert.equal(await balance(other),0)
  const unfunded=await insertOrder(3,1000,'payment_verified')
  fail=await sale.creditVerifiedFlameCoinPurchase({orderId:unfunded,adminId:admin,recipientId:buyer})
  assert.equal(fail.success,false,'No unbacked coins on insufficient reserve')
  assert.equal(await balance(admin),490)
  const unverified=await insertOrder(4,5,'proof_submitted')
  fail=await sale.creditVerifiedFlameCoinPurchase({orderId:unverified,adminId:admin,recipientId:buyer})
  assert.equal(fail.success,false,'Buyer-submitted hash is not verified payment')
  const concurrent=await insertOrder(5,12,'payment_verified')
  const both=await Promise.all([
    sale.creditVerifiedFlameCoinPurchase({orderId:concurrent,adminId:admin,recipientId:buyer}),
    sale.creditVerifiedFlameCoinPurchase({orderId:concurrent,adminId:admin,recipientId:buyer})
  ])
  assert.equal(both.every(x=>x.success),true,'Both retry responses succeed with one transfer')
  assert.equal(both.filter(x=>x.alreadyCredited).length,1,'One transaction only')
  assert.equal(await balance(admin),478)
  assert.equal(await balance(buyer),22)
  const receipts=await rows('SELECT count(*)::int AS count FROM weave_receipts')
  assert.equal(receipts[0].count,2)
  console.log('PASS: funded Flame Coin credit, matching buyer, independent verification, insufficient reserve, receipt, and concurrent idempotency PostgreSQL checks')
}
run().then(()=>pool.end()).catch(async e=>{console.error(e);await pool.end();process.exitCode=1})

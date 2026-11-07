import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'

/**
 * End-to-end SQL settlement test. Uses the PostgreSQL service in Production
 * Check, with an isolated schema and no real payments or production wallets.
 */
async function main() {
const databaseUrl = process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if (!databaseUrl) throw new Error('WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL is required')

const schema = 'weave_paystack_manual_' + process.pid
const adminPool = new Pool({ connectionString:databaseUrl })
let transactionPool: Pool | null = null
let servicePool: Pool | null = null
let schemaCreated = false
try {
  await adminPool.query(`CREATE SCHEMA "${schema}"`)
  schemaCreated = true
  const url = new URL(databaseUrl)
  url.searchParams.set('options', '-c search_path=' + schema)
  process.env.DATABASE_URL = url.toString()
  transactionPool = new Pool({ connectionString:url.toString() })
  await transactionPool.query(`CREATE TABLE users (
    id uuid PRIMARY KEY, name text, email text, role text
  )`)
  await transactionPool.query(`CREATE TABLE deposits (
    id uuid PRIMARY KEY, user_id uuid REFERENCES users(id),
    method text, receipt_data text, amount_usd numeric(20,2),
    amount_trx numeric(30,8), status text, verified_at timestamptz,
    created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW()
  )`)
  await transactionPool.query(`CREATE TABLE wallets (
    user_id uuid REFERENCES users(id), is_primary boolean,
    balance_trx numeric(30,8) DEFAULT 0, updated_at timestamptz DEFAULT NOW()
  )`)
  await transactionPool.query(`CREATE TABLE ledger_entries (
    id serial PRIMARY KEY, user_id uuid REFERENCES users(id), entry_type text,
    amount numeric(30,8), currency text, description text,
    metadata jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT NOW()
  )`)
  await transactionPool.query(`CREATE TABLE notifications (
    user_id uuid, type text, title text, content text,
    from_user_id uuid, from_user_name text, link text
  )`)
  const adminId=randomUUID(), bridgerId=randomUUID(), agentId=randomUUID()
  const victims=[bridgerId,agentId]
  for (const [id,name,role] of [
    [adminId,'A TIME','admin'],[bridgerId,'Bridger fixture','bridger'],[agentId,'Agent fixture','agent'],
  ]) {
    await transactionPool.query('INSERT INTO users(id,name,email,role) VALUES($1,$2,$3,$4)', [
      id,name,name.replace(/ /g,'').toLowerCase()+'@example.invalid',role,
    ])
  }
  for (const userId of victims) {
    await transactionPool.query('INSERT INTO wallets(user_id,is_primary,balance_trx) VALUES($1,true,0)',[userId])
  }
  const insert = async (userId:string, status:string, ngn:number, coin:number, reference:string) => {
    const id=randomUUID()
    await transactionPool!.query(
      'INSERT INTO deposits(id,user_id,method,receipt_data,amount_usd,amount_trx,status) VALUES($1,$2,\'paystack\',$3,$4,$5,$6)',
      [id,userId,reference,ngn,coin,status],
    )
    return id
  }
  const { manualCreditStuckPaystack, ManualPaystackCreditError } = await import('../lib/manual-paystack-recovery')
  const { getPool } = await import('../lib/db')
  servicePool = getPool()
  const request = (depositId:string, transactionId='') => ({
    depositId,adminId,confirmedInPaystackDashboard:true,
    evidenceNote:'Success confirmed in the Paystack merchant transaction dashboard.',
    paystackTransactionId:transactionId,
  })
  const refBridger='BRIDGER-test-'+randomUUID().slice(0,8)
  const bridgerDeposit=await insert(bridgerId,'rejected',2200,5.141,refBridger)
  // Regression: the historic form incorrectly required all duplicate inputs,
  // and approval attempted CREATE TABLE at runtime. Only one recorded checkout
  // plus active Administrations affirmation is now needed.
  const bridgerResult=await manualCreditStuckPaystack(request(bridgerDeposit,'1234567'))
  assert.equal(bridgerResult.credited,true)
  assert.equal(bridgerResult.flameCoin,5.141)
  const bridgerWallet=await transactionPool.query('SELECT balance_trx FROM wallets WHERE user_id=$1',[bridgerId])
  assert.equal(Number(bridgerWallet.rows[0].balance_trx),5.141)
  const confirmed=await transactionPool.query('SELECT status,verified_at FROM deposits WHERE id=$1',[bridgerDeposit])
  assert.equal(confirmed.rows[0].status,'approved')
  assert.equal(confirmed.rows[0].verified_at,null)
  const ledger=await transactionPool.query(
    "SELECT amount,metadata FROM ledger_entries WHERE metadata->>'deposit_id'=$1 AND amount>0",[bridgerDeposit],
  )
  assert.equal(ledger.rowCount,1)
  assert.equal(ledger.rows[0].metadata.event_type,'paystack.manual_admin_credit')
  assert.equal(ledger.rows[0].metadata.approved_by,adminId)
  const notices=await transactionPool.query("SELECT type FROM notifications WHERE user_id=$1",[bridgerId])
  assert.equal(notices.rows.some(row=>row.type==='deposit_approved'),true)
  await assert.rejects(manualCreditStuckPaystack(request(bridgerDeposit,'1234567')),ManualPaystackCreditError)
  // Same merchant transaction cannot be applied to another checkout.
  const refAgent='AGENT-test-'+randomUUID().slice(0,8)
  const agentDeposit=await insert(agentId,'rejected',1000,2.334,refAgent)
  await assert.rejects(manualCreditStuckPaystack(request(agentDeposit,'1234567')), /already used/)
  const agentBefore=await transactionPool.query('SELECT balance_trx FROM wallets WHERE user_id=$1',[agentId])
  assert.equal(Number(agentBefore.rows[0].balance_trx),0)
  // Optional numeric transaction ID: manual approval still works when the
  // merchant interface shows only the original Paystack reference.
  const resultAgent=await manualCreditStuckPaystack(request(agentDeposit))
  assert.equal(resultAgent.credited,true)
  const agentBalance=await transactionPool.query('SELECT balance_trx FROM wallets WHERE user_id=$1',[agentId])
  assert.equal(Number(agentBalance.rows[0].balance_trx),2.334)
  // Two simultaneous Administrations requests for one checkout: exactly once.
  const raceDeposit=await insert(bridgerId,'pending',200,0.4,'BRIDGER-race-'+randomUUID().slice(0,8))
  const race=await Promise.allSettled([
    manualCreditStuckPaystack(request(raceDeposit,'7654321')),
    manualCreditStuckPaystack(request(raceDeposit,'7654321')),
  ])
  assert.equal(race.filter(x=>x.status==='fulfilled').length,1)
  assert.equal(race.filter(x=>x.status==='rejected').length,1)
  const raceLedger=await transactionPool.query(
    "SELECT count(*)::int AS count FROM ledger_entries WHERE metadata->>'deposit_id'=$1 AND amount>0",[raceDeposit],
  )
  assert.equal(raceLedger.rows[0].count,1)
  const afterRace=await transactionPool.query('SELECT balance_trx FROM wallets WHERE user_id=$1',[bridgerId])
  assert.equal(Number(afterRace.rows[0].balance_trx),5.541)
  // Recorded reversal/refund prevents credit, even if Administrations affirms.
  const refundDeposit=await insert(agentId,'rejected',100,0.2,'AGENT-refund-'+randomUUID().slice(0,8))
  await transactionPool.query(
    "INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,metadata) VALUES($1,'deposit',0,'Flame Coin','refund',$2::jsonb)",
    [agentId,JSON.stringify({deposit_id:refundDeposit,event_type:'refund.processed'})],
  )
  await assert.rejects(manualCreditStuckPaystack(request(refundDeposit)),/credit or refund/)
  await assert.rejects(manualCreditStuckPaystack({...request(refundDeposit),confirmedInPaystackDashboard:false}),/personally checked/)
  const finalBalance=await transactionPool.query('SELECT balance_trx FROM wallets WHERE user_id=$1',[agentId])
  assert.equal(Number(finalBalance.rows[0].balance_trx),2.334)
  console.log('PASS: real PostgreSQL manual Paystack credit, ledger, notifications, concurrency, duplicates and refund controls')
} finally {
  if (servicePool) await servicePool.end().catch(()=>{})
  if (transactionPool) await transactionPool.end().catch(()=>{})
  if (schemaCreated) await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(()=>{})
  await adminPool.end()
}

}
void main().catch(error => { console.error(error); process.exitCode = 1 })

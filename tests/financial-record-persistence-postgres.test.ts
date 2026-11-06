import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'

async function main() {
  const source=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
  if (!source) throw new Error('PostgreSQL integration test URL is required')
  const schema='weave_financial_records_'+process.pid
  const root=new Pool({connectionString:source})
  let pool:Pool|null=null
  let shared:Pool|null=null
  let created=false
  try {
    await root.query(`CREATE SCHEMA "${schema}"`)
    created=true
    const url=new URL(source)
    url.searchParams.set('options','-c search_path='+schema)
    process.env.DATABASE_URL=url.toString()
    pool=new Pool({connectionString:url.toString()})
    await pool.query(`CREATE TABLE users (id uuid PRIMARY KEY,role text,name text)`)
    await pool.query(`CREATE TABLE wallets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id),
      is_primary boolean DEFAULT true,balance_trx numeric(20,6) DEFAULT 0,
      balance_usdt numeric(20,6) DEFAULT 0,created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )`)
    await pool.query(`CREATE TABLE ledger_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id),
      transaction_id uuid,escrow_id uuid,entry_type varchar(50) NOT NULL,
      amount numeric(20,6) NOT NULL,currency varchar(16),
      balance_before numeric(20,6),balance_after numeric(20,6),
      description text,metadata jsonb,created_at timestamptz DEFAULT now()
    )`)
    await pool.query(`CREATE TABLE escrow (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),transaction_id uuid,
      user_id uuid REFERENCES users(id),amount numeric(20,6),
      currency text,status text,locked_at timestamptz DEFAULT now()
    )`)
    const userId=randomUUID()
    await pool.query("INSERT INTO users(id,role,name) VALUES($1,'bridger','Persistent funds fixture')",[userId])
    await pool.query(
      'INSERT INTO wallets(user_id,is_primary,balance_trx) VALUES($1,true,$2)',[userId,5.141],
    )
    const {
      createLedgerEntry,getUserLedger,getUserTotalBalance,getFinancialRecordPage,
    }=await import('../lib/ledger')
    const {getPool}=await import('../lib/db')
    shared=getPool()

    const first=await getFinancialRecordPage(userId,2)
    assert.equal(first.balance.available,5.141)
    assert.equal(first.balance.total,5.141)
    assert.deepEqual(first.ledger,[])
    // A committed money movement must change wallet and ledger atomically.
    const credited=await createLedgerEntry({
      userId,entryType:'deposit',amount:2.334,currency:'Flame Coin',
      description:'Persisted Paystack deposit',metadata:{deposit_id:randomUUID()},
    })
    assert.equal(credited.balance_before,5.141)
    assert.equal(credited.balance_after,7.475)
    const walletAfter=await pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1',[userId])
    assert.equal(Number(walletAfter.rows[0].balance_trx),7.475)
    assert.equal((await getUserLedger(userId)).length,1)

    const escrowId=randomUUID()
    await pool.query(
      `INSERT INTO escrow(id,transaction_id,user_id,amount,currency,status)
       VALUES($1,$2,$3,1.5,'Flame Coin','locked')`,
      [escrowId,randomUUID(),userId],
    )
    const snapshot=await getFinancialRecordPage(userId,2)
    assert.deepEqual(snapshot.balance,{available:7.475,locked:1.5,total:8.975})
    assert.equal(snapshot.ledger.length,1)
    assert.equal(snapshot.ledger[0].balance_after,7.475)
    assert.equal((await getUserTotalBalance(userId)).total,8.975)

    // A failed ledger insertion must roll back the balance update.
    await pool.query('ALTER TABLE ledger_entries ADD CONSTRAINT test_amount CHECK(amount < 100)')
    await assert.rejects(
      createLedgerEntry({userId,entryType:'deposit',amount:101}),
      /violates check constraint/,
    )
    const still=await pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1',[userId])
    assert.equal(Number(still.rows[0].balance_trx),7.475)
    assert.equal((await getUserLedger(userId)).length,1)
    await pool.query('ALTER TABLE ledger_entries DROP CONSTRAINT test_amount')

    // Financial history is saved in PostgreSQL, not capped at 20 client items.
    for(let i=0;i<55;i++) {
      await pool.query(
        `INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,created_at)
         VALUES($1,'earning',0.25,'Flame Coin',$2,NOW()-($3::int * INTERVAL '1 minute'))`,
        [userId,'Archived entry '+i,55-i],
      )
    }
    let cursor:string|null=null
    const seen=new Set<string>()
    let pages=0
    do {
      const page=await getFinancialRecordPage(userId,15,cursor)
      assert.equal(page.balance.available,7.475)
      for(const row of page.ledger) {
        assert.equal(seen.has(row.id),false,'No repeated rows across pages')
        seen.add(row.id)
      }
      cursor=page.nextCursor
      pages++
      assert.ok(pages<20,'Pagination terminates')
    } while(cursor)
    assert.equal(seen.size,56,'All 56 historical rows remain accessible')

    // On SQL failure no financial read may return a fictitious zero balance or
    // an empty ledger as if it were the real record.
    await pool.query('ALTER TABLE wallets RENAME TO missing_wallets')
    await assert.rejects(getFinancialRecordPage(userId,20))
    await assert.rejects(getUserTotalBalance(userId))
    await pool.query('ALTER TABLE missing_wallets RENAME TO wallets')
    await pool.query('ALTER TABLE ledger_entries RENAME TO missing_ledger_entries')
    await assert.rejects(getUserLedger(userId))
    await pool.query('ALTER TABLE missing_ledger_entries RENAME TO ledger_entries')
    const final=await getFinancialRecordPage(userId,20)
    assert.equal(final.balance.available,7.475)
    console.log('PASS: PostgreSQL persistence, atomic ledger, rollback, snapshot, precision, paginated history and fail-closed reads')
  } finally {
    if (shared) await shared.end().catch(()=>{})
    if (pool) await pool.end().catch(()=>{})
    if (created) await root.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(()=>{})
    await root.end()
  }
}
void main().catch(error=>{console.error(error);process.exitCode=1})

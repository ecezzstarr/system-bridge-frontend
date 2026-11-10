import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Pool} from 'pg'

async function main(){
 const source=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
 if(!source)throw new Error('Company support PostgreSQL test connection is required')
 const schema='weave_company_support_'+process.pid
 const root=new Pool({connectionString:source})
 let working:Pool|null=null
 let opened=false
 try{
  await root.query('CREATE SCHEMA "'+schema+'"')
  opened=true
  const url=new URL(source)
  url.searchParams.set('options','-c search_path='+schema)
  process.env.DATABASE_URL=url.toString()
  working=new Pool({connectionString:url.toString()})
  await working.query(`CREATE TABLE users(
   id uuid PRIMARY KEY,name text,username text,role text,is_active boolean DEFAULT true)`)
  await working.query(`CREATE TABLE weave_regional_manager_appointments(
   user_id uuid PRIMARY KEY REFERENCES users(id),status text)`)
  await working.query(`CREATE TABLE wallets(
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id),
   is_primary boolean DEFAULT true,balance_trx numeric(18,6) NOT NULL DEFAULT 0,
   updated_at timestamptz DEFAULT now())`)
  await working.query(`CREATE TABLE ledger_entries(
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id),
   entry_type text NOT NULL,amount numeric(18,6),currency varchar(16),
   description text,balance_before numeric(18,6),balance_after numeric(18,6),
   metadata jsonb,created_at timestamptz DEFAULT now())`)
  const managerId=randomUUID(),workerId=randomUUID(),caseId=randomUUID()
  await working.query("INSERT INTO users(id,name,username,role) VALUES($1,'Manager','manager','bridger'),($2,'Worker','worker','bridger')",[managerId,workerId])
  await working.query("INSERT INTO weave_regional_manager_appointments(user_id,status) VALUES($1,'active')",[managerId])
  await working.query("INSERT INTO wallets(user_id,balance_trx) VALUES($1,100),($2,5)",[managerId,workerId])
  const {getPool}=await import('../lib/db')
  const {ensureCompanySupportSchema,managerAssignedTo,consumeProspectSupport,recoverSupportAdvanceFromEarning}=await import('../lib/company-support')
  await ensureCompanySupportSchema()
  await getPool().query("INSERT INTO weave_company_support_assignments(worker_id,manager_id,assigned_by) VALUES($1,$2,$1)",[workerId,managerId])
  assert.equal(await managerAssignedTo(workerId,managerId),true)
  assert.equal(await managerAssignedTo(managerId,workerId),false)
  await getPool().query(`INSERT INTO weave_company_support_cases
    (id,worker_id,manager_id,purpose,description,status,requested_amount,offered_amount,terms,accepted_at,funded_at)
    VALUES($1,$2,$3,'system_switch','Verified prospect marketing','funded',50,50,
     'Interest free, recover from confirmed company earnings, never from unrelated third party customer funds',now(),now())`,[caseId,workerId,managerId])
  await getPool().query(`INSERT INTO weave_company_support_advances
    (case_id,worker_id,funder_id,currency,principal,funding_reference)
    VALUES($1,$2,$3,'SYSTEM_SWITCH',50,$4)`,[caseId,workerId,managerId,'test:'+caseId])
  // Funding is a reserve: only manager's real wallet loses 50.
  await getPool().query('UPDATE wallets SET balance_trx=50 WHERE user_id=$1',[managerId])
  const before=await getPool().query('SELECT balance_trx FROM wallets WHERE user_id=$1',[workerId])
  assert.equal(Number(before.rows[0].balance_trx),5,'Support must never mint unrestricted worker wallet value')
  const db=await getPool().connect()
  const prospectId=randomUUID()
  try{
   await db.query('BEGIN')
   const purchase=await consumeProspectSupport(db,workerId,40,prospectId)
   assert.ok(purchase?.advanceId,'A restricted prospect purchase spends approved support')
   const next=await consumeProspectSupport(db,workerId,15,randomUUID())
   assert.equal(next,null,'Spending cannot exceed the reserved support')
   await db.query('COMMIT')
  }catch(e){await db.query('ROLLBACK');throw e}
  finally{db.release()}
  let balances=await getPool().query('SELECT user_id,balance_trx FROM wallets')
  assert.equal(Number(balances.rows.find(x=>x.user_id===workerId).balance_trx),5)
  const payout=await getPool().connect()
  try{
   await payout.query('BEGIN')
   await payout.query('UPDATE wallets SET balance_trx=balance_trx+30 WHERE user_id=$1',[workerId])
   const repaid=await recoverSupportAdvanceFromEarning(payout,workerId,30,'commission:'+randomUUID())
   assert.equal(repaid,30)
   await payout.query('COMMIT')
  }catch(e){await payout.query('ROLLBACK');throw e}
  finally{payout.release()}
  const recover=await getPool().query('SELECT principal,spent,refunded,repaid FROM weave_company_support_advances WHERE case_id=$1',[caseId])
  assert.equal(Number(recover.rows[0].spent),40)
  assert.equal(Number(recover.rows[0].repaid),30)
  balances=await getPool().query('SELECT user_id,balance_trx FROM wallets')
  assert.equal(Number(balances.rows.find(x=>x.user_id===workerId).balance_trx),5)
  assert.equal(Number(balances.rows.find(x=>x.user_id===managerId).balance_trx),80)
  const dup=await getPool().connect()
  try{
   await dup.query('BEGIN')
   const original=await getPool().query("SELECT earning_source FROM weave_company_support_recoveries LIMIT 1")
   assert.equal(await recoverSupportAdvanceFromEarning(dup,workerId,30,original.rows[0].earning_source),0)
   await dup.query('COMMIT')
  }catch(e){await dup.query('ROLLBACK');throw e}
  finally{dup.release()}
  const final=await getPool().query('SELECT COUNT(*)::int AS count FROM weave_company_support_recoveries')
  assert.equal(final.rows[0].count,1,'Duplicate commission must not double-repay the advance')
  console.log('Company Support: approved assignments, restricted spending, funded balances and idempotent repayment passed')
  await getPool().end()
 }finally{
  if(working)await working.end().catch(()=>{})
  if(opened)await root.query('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE').catch(()=>{})
  await root.end()
 }
}
main().catch(e=>{console.error(e);process.exitCode=1})

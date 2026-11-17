const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const vm=require('node:vm')
const {Client}=require('pg')
const root=path.resolve(__dirname,'..')
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8')
const dbUrl=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if(!dbUrl)throw new Error('WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL required for Sunshine finance PostgreSQL schema test')

async function main(){
 const client=new Client({connectionString:dbUrl})
 const schema='sunshine_contract_'+process.pid
 await client.connect()
 try{
  await client.query('CREATE SCHEMA '+schema)
  await client.query('SET search_path TO '+schema+',public')
  await client.query('CREATE TABLE users(id uuid PRIMARY KEY,role text NOT NULL)')
  await client.query('CREATE TABLE weave_regional_manager_appointments(user_id uuid PRIMARY KEY REFERENCES users(id))')
  const pool={query:(...args)=>client.query(...args)}
  const bankProducts=[...read('lib/sunshine-bank-products.ts').matchAll(/id:'([^']+)'/g)]
    .map(match=>({id:match[1]}))
  assert.ok(bankProducts.length>=10)
  const load=(name,imports)=>{
   const mod={exports:{}}
   const code=ts.transpileModule(read(name),{compilerOptions:{
     target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS
   }}).outputText
   vm.runInNewContext(code,{module:mod,exports:mod.exports,
     require:(key)=>imports[key]||{},process:{env:{}},console},
     {filename:name})
   return mod.exports
  }
  const sunshine=load('lib/sunshine-continuity.ts',{
    '@/lib/db':{getPool:()=>pool},
    '@/lib/sunshine-bank-products':{SUNSHINE_BANK_PRODUCTS:bankProducts}
  })
  await sunshine.ensureSunshineSchema()
  // A new user may apply before saving the 1m System Switch goal.
  const borrower=(await client.query("INSERT INTO users(id,role) VALUES(gen_random_uuid(),'client') RETURNING id")).rows[0].id
  const manager=(await client.query("INSERT INTO users(id,role) VALUES(gen_random_uuid(),'agent') RETURNING id")).rows[0].id
  const admin=(await client.query("INSERT INTO users(id,role) VALUES(gen_random_uuid(),'admin') RETURNING id")).rows[0].id
  await client.query('INSERT INTO weave_regional_manager_appointments(user_id) VALUES($1::uuid)',[manager])
  await client.query(`INSERT INTO weave_sunshine_savings_plans
    (user_id,declared_capital_ngn,declared_capital_trx,capital_basis,bank_product)
    VALUES($1::uuid,0,0,'TRX','ecobank_super_savers')`,[borrower])
  const finance=load('lib/sunshine-finance.ts',{
    '@/lib/db':{getPool:()=>pool},
    '@/lib/sunshine-continuity':{SUNSHINE_ENROLLMENT_TARGET_SS:1000000},
    '@/lib/regional-manager-operations':{ensureRegionalOperationsSchema:async()=>{}}
  })
  await finance.ensureSunshineFinanceSchema()
  await client.query(`INSERT INTO weave_sunshine_manager_assignments
    (user_id,manager_id,assigned_by) VALUES($1::uuid,$2::uuid,$3::uuid)`,[borrower,manager,admin])
  const quote=finance.calculateSunshineSupport(60000,400)
  assert.equal(quote.maximumAdvanceSwitch,105)
  assert.equal(quote.companyInterestShareSwitch,15)
  await client.query(`INSERT INTO weave_sunshine_support_advances
    (request_id,user_id,manager_id,bank_product,interest_period,
      expected_net_interest_ngn,rate_ngn_per_switch,bank_interest_switch,
      maximum_advance_switch,company_fee_switch,repayment_switch,evidence_reference,
      purchase_kind,purchase_detail)
    VALUES(gen_random_uuid(),$1::uuid,$2::uuid,'ecobank_super_savers','monthly',
      60000,400,$3,$4,$5,$6,'BANK-INTEREST-REF-2026-11',
      'weave_food','Electrolyte carton')`,
    [borrower,manager,quote.bankInterestSwitch,quote.maximumAdvanceSwitch,
      quote.companyInterestShareSwitch,quote.repaymentSwitch])
  await assert.rejects(()=>client.query(`INSERT INTO weave_sunshine_support_advances
    (request_id,user_id,manager_id,bank_product,interest_period,
      expected_net_interest_ngn,rate_ngn_per_switch,bank_interest_switch,
      maximum_advance_switch,company_fee_switch,repayment_switch,evidence_reference)
    VALUES(gen_random_uuid(),$1::uuid,$2::uuid,'ecobank_super_savers','monthly',
      60000,400,150,105,15,120,'ANOTHER-REF-2026-11')`,[borrower,manager]),
    /duplicate key/i,'One active advance per borrower')
  const row=await client.query("SELECT maximum_advance_switch,company_fee_switch,repayment_switch,status,purchase_kind,purchase_detail FROM weave_sunshine_support_advances WHERE user_id=$1::uuid",[borrower])
  assert.equal(Number(row.rows[0].maximum_advance_switch),105)
  assert.equal(Number(row.rows[0].company_fee_switch),15)
  assert.equal(Number(row.rows[0].repayment_switch),120)
  assert.equal(row.rows[0].status,'requested')
  assert.equal(row.rows[0].purchase_kind,'weave_food')
  assert.equal(row.rows[0].purchase_detail,'Electrolyte carton')
  // An annual-interest product may also request Sunshine support.
  const annualBorrower=(await client.query("INSERT INTO users(id,role) VALUES(gen_random_uuid(),'client') RETURNING id")).rows[0].id
  await client.query(`INSERT INTO weave_sunshine_savings_plans
    (user_id,declared_capital_ngn,declared_capital_trx,capital_basis,bank_product)
    VALUES($1::uuid,0,0,'TRX','ecobank_super_savers')`,[annualBorrower])
  await client.query(`INSERT INTO weave_sunshine_support_advances
    (request_id,user_id,manager_id,bank_product,interest_period,
      expected_net_interest_ngn,rate_ngn_per_switch,bank_interest_switch,
      maximum_advance_switch,company_fee_switch,repayment_switch,evidence_reference,
      purchase_kind,purchase_detail)
    VALUES(gen_random_uuid(),$1::uuid,$2::uuid,'ecobank_super_savers','annual',
      60000,400,150,105,15,120,'ANNUAL-INTEREST-REF-2026-11',
      'file_folder','Standard Client File Folder')`,[annualBorrower,manager])
  const annual=(await client.query('SELECT interest_period,purchase_kind FROM weave_sunshine_support_advances WHERE user_id=$1::uuid',[annualBorrower])).rows[0]
  assert.equal(annual.interest_period,'annual')
  assert.equal(annual.purchase_kind,'file_folder')
  await client.query(`INSERT INTO weave_sunshine_monthly_living_money
    (user_id,month_key,net_interest_credited_ngn,spent_from_interest_ngn)
    VALUES($1::uuid,'2026-11',60000,12000)`,[borrower])
  console.log('PASS: Sunshine PostgreSQL enrollment from zero, Client TRX basis, monthly and annual interest records, staged 70/10 loan and single active advance')
 }finally{
  await client.query('ROLLBACK').catch(()=>{})
  await client.query('RESET search_path').catch(()=>{})
  await client.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{})
  await client.end()
 }
}
main().catch(e=>{console.error(e);process.exitCode=1})

const assert = require('node:assert/strict')
const {randomUUID, createHash} = require('node:crypto')
const {readFileSync} = require('node:fs')
const {setTimeout: delay} = require('node:timers/promises')
const {runInNewContext} = require('node:vm')
const {Pool} = require('pg')
const ts = require('typescript')

const source = process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if (!source) throw new Error('PostgreSQL integration test URL is required')
const schema = 'weave_company_repairs_' + process.pid
const root = new Pool({connectionString:source})
const url = new URL(source)
url.searchParams.set('options','-c search_path='+schema)
const pool = new Pool({connectionString:url.toString(),application_name:schema})
const actor = randomUUID()
const sql = async (strings, ...values) => (await pool.query(
  strings.reduce((query, part, index) => query + (index ? '$' + index : '') + part, ''), values,
)).rows
const dependencies = {
  'next/server':{NextResponse:{json: (body, options) => Response.json(body, options)}},
  '@/lib/db':{getPool:() => pool,sql},
  '@/lib/auth-api':{getAuthUser:async () => ({id:actor,role:'agent'})},
  '@/lib/admin-order-notifications':{notifyAdminOrder:async () => {}},
  '@/lib/agility':{ensureAgilitySchema:async () => {}},
  '@/lib/agent-distribution':{ensureAgentDistributionSchema:async () => {}},
  '@/lib/weave-food-economics':{},
  '@/lib/client-file-folder':{getFileFolderDb:() => sql},
  '@/lib/client-vault':{resolveClientToken:async () => actor},
  '@/lib/pro-regional-manager-activation':{},
  '@/lib/client-business-store':{ensureClientBusinessStoreSchema:async () => {}},
  '@/lib/customer-door-settlement':{ensureCustomerDoorSettlementSchema:async () => {},validDoorUuid:() => true},
  '@/lib/paystack':{verifyPaystackWebhookSignature:async () => true},
  '@/lib/paystack-deposits':{settlePaystackDeposit:async () => ({settled:false,reason:'Amount mismatch'})},
  '@/lib/deposit-notifications':{},
  '@/lib/department-entry-paystack':{},
  '@/lib/file-folder-paystack':{},
  '@/lib/market':{ensureMarketTables:async () => true},
}
function load(path, overrides = {}, globals = {}) {
  const exports = {}
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText
  runInNewContext(compiled, {
    exports, console, require:name => overrides[name] ?? dependencies[name] ?? require(name), ...globals,
  })
  return exports
}
const payload = body => ({json:async () => body})

async function main() {
  await root.query('CREATE SCHEMA ' + schema)
  await pool.query(`
    CREATE TABLE agility_outlet_placements (id uuid PRIMARY KEY,agent_id uuid,supply_mode text,
      package_count int,agreed_amount_ngn numeric,packages_reported_sold int DEFAULT 0,
      amount_collected_ngn numeric DEFAULT 0,status text DEFAULT 'with_outlet',updated_at timestamptz,settled_at timestamptz);
    CREATE TABLE agility_outlet_collections (placement_id uuid,agent_id uuid,amount_ngn numeric,note text);
    CREATE TABLE agility_outlet_operations (placement_id uuid,request_id uuid,action text,amount numeric,
      PRIMARY KEY(placement_id,request_id));
    CREATE TABLE client_business_stores (id uuid PRIMARY KEY,client_id uuid,file_number text);
    CREATE TABLE client_store_orders (id uuid PRIMARY KEY,store_id uuid,status text,payment_status text,
      payment_reference text,updated_at timestamptz);
    CREATE TABLE client_customer_door_settlements (order_id uuid PRIMARY KEY);
    CREATE TABLE users (id uuid PRIMARY KEY,role text,is_active boolean,email text);
    CREATE TABLE deposits (id uuid PRIMARY KEY,user_id uuid,method text,receipt_data text,status text,updated_at timestamptz);
    CREATE TABLE ledger_entries (user_id uuid,entry_type text,amount numeric,currency text,description text,metadata jsonb);
    CREATE TABLE notifications (user_id uuid,type text,title text,content text,from_user_name text,link text);
    CREATE TABLE market_prospect_outreach (id uuid PRIMARY KEY,bridger_id uuid,status text,sent_at timestamptz,
      last_activity_at timestamptz,whatsapp_handoff_at timestamptz);
  `)

  const placementId = randomUUID()
  await pool.query("INSERT INTO agility_outlet_placements(id,agent_id,supply_mode,package_count,agreed_amount_ngn) VALUES($1,$2,'pay_after_sale',10,15.01)",[placementId,actor])
  const distribution = load('app/api/agent/distribution/route.ts')
  const sale = {action:'report_sales',placementId,soldPackages:3,requestId:randomUUID()}
  const collection = {action:'record_collection',placementId,amountNgn:15.01,requestId:randomUUID()}
  const results = await Promise.all([sale,{...sale,requestId:randomUUID(),soldPackages:2},collection,sale,collection]
    .map(body => distribution.POST(payload(body))))
  assert.ok(results.every(response => response.status === 200))
  const {rows:[placement]} = await pool.query('SELECT * FROM agility_outlet_placements WHERE id=$1',[placementId])
  assert.equal(placement.packages_reported_sold,5)
  assert.equal(placement.amount_collected_ngn,'15.01')
  assert.equal(placement.status,'settled')
  assert.equal((await pool.query('SELECT * FROM agility_outlet_collections')).rowCount,1)

  const store = randomUUID(), order = randomUUID()
  await pool.query('INSERT INTO client_business_stores(id,client_id) VALUES($1,$2)',[store,actor])
  await pool.query("INSERT INTO client_store_orders(id,store_id,status,payment_status) VALUES($1,$2,'requested','awaiting_payment')",[order,store])
  const door = load('app/api/client/business-store/orders/[id]/status/route.ts')
  const settle = await pool.connect()
  try {
    await settle.query('BEGIN')
    await settle.query('SELECT id FROM client_store_orders WHERE id=$1 FOR UPDATE',[order])
    const cancellation = door.POST({
      ...payload({action:'cancelled'}),headers:new Headers(),nextUrl:{pathname:'/api/client/business-store/orders/test/status'},
    },{params:Promise.resolve({id:order})})
    let waiting = false
    for (let attempt=0; attempt<100 && !waiting; attempt++) {
      const {rows:[row]} = await pool.query(
        "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock' AND query LIKE '%client_store_orders%') AS waiting",
        [schema],
      )
      waiting = row.waiting
      if (!waiting) await delay(10)
    }
    assert.equal(waiting,true,'Cancellation waits on the settlement row lock')
    await settle.query('INSERT INTO client_customer_door_settlements(order_id) VALUES($1)',[order])
    await settle.query("UPDATE client_store_orders SET status='payment_received',payment_status='received' WHERE id=$1",[order])
    await settle.query('COMMIT')
    assert.equal((await cancellation).status,409)
    assert.equal((await pool.query('SELECT status FROM client_store_orders WHERE id=$1',[order])).rows[0].status,'payment_received')
  } finally {
    await settle.query('ROLLBACK')
    settle.release()
  }

  await pool.query("INSERT INTO users(id,role,is_active) VALUES($1,'admin',true)",[actor])
  await pool.query("INSERT INTO deposits VALUES($1,$2,'paystack','AGENT-QA','pending',NOW())",[randomUUID(),actor])
  const webhook = load('app/api/deposit/paystack/webhook/route.ts')
  const events = [
    {event:'refund.processed',data:{transaction_reference:'AGENT-QA',refund_reference:'refund-001',amount:2500}},
    {event:'charge.success',data:{reference:'AGENT-QA',id:311,amount:2500}},
  ]
  for (const event of [...events,...events]) {
    assert.equal((await webhook.POST({text:async () => JSON.stringify(event),headers:new Headers()})).status,200)
  }
  const {rows:eventsSaved} = await pool.query("SELECT metadata->>'event_type' AS type,amount FROM ledger_entries ORDER BY type")
  assert.deepEqual(eventsSaved,[{type:'charge.success.review',amount:'0'},{type:'refund.processed',amount:'0'}])
  assert.equal((await pool.query('SELECT * FROM notifications')).rowCount,2)

  const outreachId = randomUUID()
  await pool.query("INSERT INTO market_prospect_outreach(id,bridger_id,status) VALUES($1,$2,'pending')",[outreachId,actor])
  const outreach = load('app/api/bridger/prospects/[outreachId]/send/route.ts',{
    '@/lib/auth-api':{getAuthUser:async () => ({id:actor,role:'bridger'})},
  })
  const params = {params:Promise.resolve({outreachId})}
  assert.equal((await outreach.POST(payload({confirmedSent:true}),params)).status,409)
  assert.equal((await outreach.POST(payload({action:'handoff'}),params)).status,200)
  const {rows:[pending]} = await pool.query('SELECT * FROM market_prospect_outreach WHERE id=$1',[outreachId])
  assert.equal(pending.status,'pending')
  assert.equal(pending.sent_at,null)
  assert.equal((await outreach.POST(payload({confirmedSent:true}),params)).status,200)
  assert.equal((await (await outreach.POST(payload({confirmedSent:true}),params)).json()).alreadySent,true)

  await pool.query(`
    CREATE TABLE pro_file_number_verifications (id uuid PRIMARY KEY,file_number text,status text,signed_name text,
      identity_verified_at timestamptz,payment_verified_at timestamptz,payment_verified_amount_usdt numeric,access_token_hash text);
    CREATE TABLE company_client_staff_offers (id uuid PRIMARY KEY,file_number text,candidate_name text,candidate_email text,
      status text,folder_tier text,client_id uuid,monthly_salary_usdt numeric,token_hash text,updated_at timestamptz);
  `)
  const ticket = 'a'.repeat(64)
  const hash = token => createHash('sha256').update(token).digest('hex')
  await pool.query("INSERT INTO pro_file_number_verifications VALUES($1,'QA-FOLDER','paid_pending_account','Test Client',NOW(),NOW(),680,$2)",[randomUUID(),hash(ticket)])
  await pool.query("INSERT INTO company_client_staff_offers VALUES($1,'QA-FOLDER','Test Client','candidate@example.invalid','approved','pro',NULL,100,'working-link',NOW())",[randomUUID()])
  let mailWorks = false
  const invitation = load('lib/pro-client-registration-invitation.ts',{
    '@/lib/pro-file-number-verification':{ensureProFileNumberVerificationSchema:async () => {}},
    '@/lib/company-client-staff':{staffOfferTokenHash:hash,ensureCompanyClientStaffSchema:async () => {}},
    '@/lib/password-recovery':{passwordRecoveryEmailProvider:async () => 'resend'},
    '@/lib/weave-mail':{},
    '@/lib/weave-mailbox':{},
  },{
    URL, AbortSignal, process:{env:{RESEND_API_KEY:'fixture',PASSWORD_RECOVERY_EMAIL_FROM:'fixture@example.invalid'}},
    fetch:async () => ({ok:mailWorks}),
  })
  await assert.rejects(invitation.sendVerifiedProClientRegistrationInvite(ticket,'https://example.invalid'), /could not be delivered/)
  assert.equal((await pool.query('SELECT token_hash FROM company_client_staff_offers')).rows[0].token_hash,'working-link')
  assert.equal((await pool.query('SELECT * FROM pro_client_registration_invitation_delivery')).rowCount,0)
  mailWorks = true
  assert.equal((await invitation.sendVerifiedProClientRegistrationInvite(ticket,'https://example.invalid')).success,true)
  assert.notEqual((await pool.query('SELECT token_hash FROM company_client_staff_offers')).rows[0].token_hash,'working-link')

  console.log('Company operational repairs passed with PostgreSQL')
}

main().catch(error => {console.error(error);process.exitCode=1}).finally(async () => {
  await pool.end()
  await root.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE')
  await root.end()
})

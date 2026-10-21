const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{Pool}=require('pg')
const uri=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if(!uri||new URL(uri).pathname!=='/weave_switch_test')throw Error('Use disposable weave_switch_test connection only')
const rootPool=new Pool({connectionString:uri}),testUri=new URL(uri);testUri.pathname='/weave_food_test'
const pool=new Pool({connectionString:testUri.toString()})
function load(file,deps={}){const exports={};vm.runInNewContext(require('typescript').transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:1,target:9,esModuleInterop:true}}).outputText,{exports,require:n=>n in deps?deps[n]:require(n),console,URL,Response,Error,Math});return exports}
const db={'@/lib/db':{getPool:()=>pool}}
const bridge=load('lib/food-bridge.ts',{...db,'@/lib/food-bridge-states':{}})
const fee=load('lib/farm-service-fee.ts')
const escrow=load('lib/food-escrow.ts',{...db,'@/lib/opay-config':{WEAVE_OPAY_ACCOUNT_NUMBER:'QA-ONLY'},'@/lib/food-bridge':bridge,'@/lib/farm-service-fee':fee})
const prep=load('lib/food-preparation-manager.ts',{...db,'@/lib/weave-lifestyle':{},'@/lib/agility':{},'@/lib/electrolyte-catalog':{},'@/lib/ember-catalog':{nextEmberAdminStage:()=>null,emberMoneySplit:()=>null},'@/lib/carrier-cakes':{}})
const forensic=load('lib/food-forensic-settlement.ts')
const routing=load('lib/food-preparation-routing.ts',{'@/lib/food-forensic-settlement':forensic})
const admin='70000000-0000-4000-8000-000000000001',worker='70000000-0000-4000-8000-000000000002',buyer='70000000-0000-4000-8000-000000000003'
const response={json:(data,opts)=>new Response(JSON.stringify(data),opts)}
const route=load('app/api/admin/food-escrow/route.ts',{...db,'next/server':{NextResponse:response},'@/lib/auth-api':{getAuthUser:async req=>req.user},'@/lib/food-bridge':bridge})
const req=(body,role='admin')=>({user:{id:admin,role},json:async()=>body})
async function run(){
 await rootPool.query('CREATE DATABASE weave_food_test').catch(e=>{if(e.code!=='42P04')throw e})
 await pool.query('DROP SCHEMA public CASCADE;CREATE SCHEMA public;CREATE TABLE users(id uuid PRIMARY KEY,role text,is_active boolean DEFAULT true,name text);CREATE TABLE notifications(id uuid DEFAULT gen_random_uuid(),user_id uuid,type text,title text,content text,from_user_id uuid,from_user_name text,link text)')
 await pool.query("INSERT INTO users(id,role,name) VALUES($1,'admin','QA Admin'),($2,'agent','QA Worker'),($3,'bridger','QA Buyer')",[admin,worker,buyer])
 await bridge.ensureFoodBridgeSchema();await load('lib/food-bridge.ts',{...db,'@/lib/food-bridge-states':{}}).ensureFoodBridgeSchema()
 await prep.ensureFoodPreparationManagerSchema()
 const farmer=(await pool.query("INSERT INTO weave_food_farmers(agent_id,farm_name,contact_private,state,community,status,payout_bank_name,payout_account_number,payout_account_name) VALUES($1,'QA Farm','QA phone','Lagos','QA Area','approved','QA Bank','QA Account','QA ONLY') RETURNING id",[worker])).rows[0].id
 const listing=(await pool.query("INSERT INTO weave_food_surplus(farmer_id,produce,unit,original_quantity,available_quantity,minimum_quantity,unit_price_ngn) VALUES($1,'QA Rice','kg',10,10,1,4000) RETURNING id",[farmer])).rows[0].id
 const order=(await pool.query("INSERT INTO weave_food_direct_orders(buyer_user_id,listing_id,farmer_id,buyer_name,buyer_phone_private,destination_state,destination_area,quantity,unit_price_ngn,food_subtotal_ngn,delivery_quote_ngn,status) VALUES($1,$2,$3,'QA Buyer','QA phone','Lagos','QA Area',2,4000,8000,2000,'quoted') RETURNING id",[buyer,listing,farmer])).rows[0].id
 const client=await pool.connect()
 try{await client.query('BEGIN');await escrow.initializeFarmEscrow(client,order);await escrow.initializeFarmEscrow(client,order);await client.query('COMMIT');await assert.rejects(()=>escrow.submitFarmEscrowProof(client,order,'QA-BANK-PROOF-ONLY'));await pool.query("UPDATE weave_food_direct_orders SET status='accepted' WHERE id=$1",[order]);await client.query('BEGIN');await escrow.submitFarmEscrowProof(client,order,'QA-BANK-PROOF-ONLY');await client.query('COMMIT')}finally{client.release()}
 let state=(await pool.query('SELECT * FROM weave_food_escrow WHERE order_id=$1',[order])).rows[0];assert.equal(state.status,'proof_submitted');assert.equal(Number(state.seller_payout_ngn),9000);assert.equal(Number(state.weave_commission_ngn),1000)
 const review={orderId:order,action:'verify_payment',bankReference:'QA-RECONCILED-ONLY',verifiedAmountNgn:9999,note:'QA only synthetic bank verification'}
 assert.equal((await route.PATCH(req(review,'agent'))).status,403);assert.equal((await route.PATCH(req(review))).status,409)
 review.verifiedAmountNgn=10000;assert.equal((await route.PATCH(req(review))).status,200);assert.equal((await route.PATCH(req(review))).status,409)
 const payout={orderId:order,action:'record_payout',bankReference:'QA-PAYOUT-ONLY',confirmedBankTransfer:true,note:'QA only no actual bank transfer'}
 assert.equal((await route.PATCH(req(payout))).status,409)
 await pool.query("UPDATE weave_food_direct_orders SET status='delivered' WHERE id=$1",[order]);await pool.query("UPDATE weave_food_escrow SET status='release_due' WHERE order_id=$1",[order])
 payout.confirmedBankTransfer=false;assert.equal((await route.PATCH(req(payout))).status,409);payout.confirmedBankTransfer=true;assert.equal((await route.PATCH(req(payout))).status,200);assert.equal((await route.PATCH(req(payout))).status,409)
 await pool.query("INSERT INTO weave_food_preparation_managers(agent_id,application_note,status) VALUES($1,'QA appointment only','approved')",[worker])
 const work={id:require('node:crypto').randomUUID(),payment_status:'pending',agent_id:worker,variant_id:'agility',box_count:1,package_count:10,total_ngn:30000,retail_unit_price_ngn:4000,agent_unit_cost_ngn:3000,delivery_address:'QA destination',delivery_phone:'QA phone'}
 const tx=await pool.connect();try{await assert.rejects(()=>routing.assignPaidOrderToPreparationManager(tx,'agility',work,admin));work.payment_status='paid';await tx.query('BEGIN');assert.equal((await routing.assignPaidOrderToPreparationManager(tx,'agility',work,admin)).assigned,true);assert.equal((await routing.assignPaidOrderToPreparationManager(tx,'agility',work,admin)).assigned,false);await tx.query('COMMIT')}finally{tx.release()}
 assert.equal(Number((await pool.query("SELECT count(*) FROM notifications WHERE type='food_preparation_start'")).rows[0].count),1)
 assert.equal(Number((await pool.query("SELECT count(*) FROM weave_food_forensic_stock_splits")).rows[0].count),1,'One allocation per verified stock order')
 const {rows:finance}=await pool.query("SELECT administration_ngn,family_support_ngn,lead_preparation_ngn,agent_expected_margin_ngn FROM weave_food_forensic_stock_splits LIMIT 1")
 assert.equal(Number(finance[0].administration_ngn),8000,'Ten packages allocate ₦8,000 to Administration')
 assert.equal(Number(finance[0].family_support_ngn),2000,'Ten packages allocate ₦2,000 to Child/Parents Support')
 assert.equal(Number(finance[0].lead_preparation_ngn),20000,'Remaining ₦20,000 goes to the Stability Lead preparation budget')
 assert.equal(Number(finance[0].agent_expected_margin_ngn),10000,'Agent can later earn ₦10,000 from 10 Carrier sales')
 assert.equal(Number((await pool.query("SELECT count(*) FROM weave_food_forensic_payouts")).rows[0].count),3,'Exactly three beneficiary payout entries')
 await pool.query("UPDATE weave_food_preparation_managers SET status='revoked'");work.id=require('node:crypto').randomUUID();const tx2=await pool.connect();try{assert.equal((await routing.assignPaidOrderToPreparationManager(tx2,'agility',work,admin)).reason,'no_active_manager')}finally{tx2.release()}
 console.log('PASS: real PostgreSQL food migration idempotency, fixed seller fee, proof/held/payout guards, Admin isolation, duplicate settlement prevention, unpaid kitchen blocking and one-time manager notification')
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await pool.end();await rootPool.end()})

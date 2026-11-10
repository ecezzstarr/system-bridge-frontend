import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {Pool} from 'pg'

async function main(){
 const dbUrl=process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
 if(!dbUrl||new URL(dbUrl).pathname!=='/weave_switch_test')
   throw Error('Use the disposable company PostgreSQL test database only')
 const schema='weave_agent_distribution_'+process.pid
 const owner=new Pool({connectionString:dbUrl,max:1})
 let pool:Pool|null=null,created=false
 try{
  await owner.query('CREATE SCHEMA "'+schema+'"')
  created=true
  const url=new URL(dbUrl)
  url.searchParams.set('options','-c search_path='+schema)
  pool=new Pool({connectionString:url.toString(),max:3})
  await pool.query("CREATE TABLE agility_outlet_placements(id uuid PRIMARY KEY,agent_id uuid NOT NULL,supply_mode text NOT NULL,packages_reported_sold int NOT NULL DEFAULT 0,package_count int NOT NULL,amount_collected_ngn numeric NOT NULL,agreed_amount_ngn numeric NOT NULL,status text NOT NULL,settled_at timestamptz,updated_at timestamptz DEFAULT now())")
  const agent=randomUUID(),stranger=randomUUID(),id=randomUUID()
  await pool.query("INSERT INTO agility_outlet_placements(id,agent_id,supply_mode,packages_reported_sold,package_count,amount_collected_ngn,agreed_amount_ngn,status) VALUES($1,$2,'pay_after_sale',2,6,0,12000,'with_outlet')",[id,agent])
  const report=async(actor:string,count:number)=>pool!.query(
   "UPDATE agility_outlet_placements SET packages_reported_sold=packages_reported_sold+$3,status=CASE WHEN packages_reported_sold+$3>=package_count AND amount_collected_ngn>=agreed_amount_ngn THEN 'settled' WHEN packages_reported_sold+$3>=package_count THEN 'sold_out_awaiting_settlement' ELSE 'with_outlet' END,settled_at=CASE WHEN packages_reported_sold+$3>=package_count AND amount_collected_ngn>=agreed_amount_ngn THEN COALESCE(settled_at,NOW()) ELSE settled_at END,updated_at=NOW() WHERE id=$1::uuid AND agent_id=$2::uuid AND supply_mode='pay_after_sale' AND packages_reported_sold+$3<=package_count RETURNING packages_reported_sold,status,settled_at",
   [id,actor,count])
  assert.equal((await report(stranger,2)).rows.length,0,'Another Agent cannot record this stock')
  const both=await Promise.all([report(agent,2),report(agent,2)])
  assert(both.every(r=>r.rows.length===1),'Two parallel sales reports each record once')
  const row=(await pool.query('SELECT * FROM agility_outlet_placements WHERE id=$1',[id])).rows[0]
  assert.equal(row.packages_reported_sold,6,'Parallel increments cannot overwrite each other')
  assert.equal(row.status,'sold_out_awaiting_settlement','A sold-out stock is not settled until money is collected')
  assert.equal((await report(agent,1)).rows.length,0,'Cannot report more packs than physically assigned')
  const id2=randomUUID()
  await pool.query("INSERT INTO agility_outlet_placements(id,agent_id,supply_mode,packages_reported_sold,package_count,amount_collected_ngn,agreed_amount_ngn,status) VALUES($1,$2,'pay_after_sale',0,1,1000,1000,'with_outlet')",[id2,agent])
  const complete=await pool.query(
   "UPDATE agility_outlet_placements SET packages_reported_sold=packages_reported_sold+1,status=CASE WHEN packages_reported_sold+1>=package_count AND amount_collected_ngn>=agreed_amount_ngn THEN 'settled' ELSE 'with_outlet' END,settled_at=CASE WHEN packages_reported_sold+1>=package_count AND amount_collected_ngn>=agreed_amount_ngn THEN COALESCE(settled_at,NOW()) ELSE settled_at END WHERE id=$1 RETURNING status,settled_at",
   [id2])
  assert.equal(complete.rows[0].status,'settled','Only fully paid and sold-out stock can be settled')
  assert(complete.rows[0].settled_at,'Settlement timestamp is durable')
  console.log('PASS: Agent distribution simultaneous reports, owner scope, stock cap and only earned settlement')
 }finally{
  if(pool)await pool.end()
  if(created)await owner.query('DROP SCHEMA "'+schema+'" CASCADE')
  await owner.end()
 }
}
main().catch(error=>{console.error(error);process.exitCode=1})

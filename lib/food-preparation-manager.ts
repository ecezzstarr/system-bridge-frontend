import { getPool } from '@/lib/db'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import { ensureAgilitySchema, getAgilityCompanyEconomics, AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN, AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN, nextAgilityAdminStage } from '@/lib/agility'
import { nextElectrolyteAdminStage } from '@/lib/electrolyte-catalog'
import { ensureCarrierCakeSchema, nextCakeAdministrationStatus } from '@/lib/carrier-cakes'

export const FOOD_PREPARATION_MANAGER_SALARY_NGN=60000
export const FOOD_PREPARATION_MANAGER_TITLE='Food Preparation Manager'
export const FOOD_PREPARATION_PRODUCTS=['agility','electrolyte','daisy'] as const
export type PreparationProduct=typeof FOOD_PREPARATION_PRODUCTS[number]
export const FOOD_PREPARATION_DUTIES=[
  'Prepare approved Agility and Electrolyte orders and Daisy Pastries cakes.',
  'Package, seal and label each order to match its authorized quantity and destination.',
  'Dispatch orders to customers and restocking Agents using recorded delivery details.',
  'Record each preparation, packaging and dispatch handoff; report shortages or safety concerns.',
] as const
export const FOOD_PREPARATION_WORKFLOW:Record<PreparationProduct,readonly string[]>={
  agility:['paid','heating','packed','boxed','dispatched'],
  electrolyte:['paid','preparing','packed','dispatched'],
  daisy:['paid','preparing','ready','dispatched'],
}
export function isPreparationProduct(value:unknown):value is PreparationProduct {
  return typeof value==='string' && FOOD_PREPARATION_PRODUCTS.some(p=>p===value)
}
export const validUuid=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s)
export class PreparationAccessError extends Error {
  constructor(message:string,public status=403){super(message)}
}
let schemaPromise:Promise<void>|null=null
export async function ensureFoodPreparationManagerSchema(){
  if(!schemaPromise) schemaPromise=(async()=>{
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS weave_food_preparation_managers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        application_note text NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
        monthly_salary_ngn numeric(12,2) NOT NULL DEFAULT 60000,
        review_note text,
        reviewed_by uuid REFERENCES users(id),
        reviewed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS weave_food_preparation_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        manager_id uuid NOT NULL REFERENCES weave_food_preparation_managers(id),
        product varchar(20) NOT NULL CHECK (product IN ('agility','electrolyte','daisy')),
        source_order_id uuid NOT NULL,
        assigned_by uuid NOT NULL REFERENCES users(id),
        assigned_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE(product,source_order_id)
      );
      CREATE TABLE IF NOT EXISTS weave_food_preparation_task_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id uuid NOT NULL REFERENCES weave_food_preparation_tasks(id),
        manager_id uuid NOT NULL REFERENCES weave_food_preparation_managers(id),
        stage varchar(32) NOT NULL,
        note varchar(800) NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS weave_food_preparation_tasks_manager_idx
        ON weave_food_preparation_tasks(manager_id,assigned_at DESC);
      CREATE INDEX IF NOT EXISTS weave_food_preparation_events_idx
        ON weave_food_preparation_task_events(task_id,occurred_at DESC);
    `)
  })().catch(e=>{schemaPromise=null;throw e})
  await schemaPromise
}
export async function ensurePreparationOrderSources(){
  await Promise.all([ensureAgilitySchema(),ensureCarrierCakeSchema()])
}
export async function getActiveFoodPreparationManager(user:{id:string;role:string}){
  if(user.role!=='agent')throw new PreparationAccessError('Only a current Agent may work as Food Preparation Manager.')
  const access=await getLifestyleAccess(user.id)
  if(!access.active)throw new PreparationAccessError('An active Agent position is required.')
  await ensureFoodPreparationManagerSchema()
  const {rows}=await getPool().query(`
    SELECT m.id,m.agent_id,m.status,m.monthly_salary_ngn
    FROM weave_food_preparation_managers m
    JOIN users u ON u.id=m.agent_id
    WHERE m.agent_id=$1::uuid AND m.status='approved' AND u.role='agent' AND u.is_active=true
    LIMIT 1
  `,[user.id])
  if(!rows.length)throw new PreparationAccessError('Administration has not approved your Food Preparation Manager appointment.')
  return rows[0]
}
export async function getPreparationSourceOrder(product:PreparationProduct,id:string){
  if(product==='daisy'){
    const {rows}=await getPool().query(`
      SELECT id,agent_id,customer_name,customer_phone,delivery_location,delivery_mode,
        preparation_released_at,payment_status,status,flavor,occasion,cake_type,size_option,event_date,total_ngn
      FROM carrier_cake_orders WHERE id=$1::uuid LIMIT 1
    `,[id])
    return rows[0]||null
  }
  const {rows}=await getPool().query(`
    SELECT id,agent_id,variant_id,box_count,package_count,delivery_address,
      delivery_phone,payment_status,fulfillment_status,total_ngn,planned_company_cost_per_box_ngn
    FROM agility_stock_orders WHERE id=$1::uuid
      AND (( $2='electrolyte' AND variant_id IN ('electrolyte','electrolyte-medium'))
        OR ($2='agility' AND variant_id NOT IN ('electrolyte','electrolyte-medium')))
    LIMIT 1
  `,[id,product])
  return rows[0]||null
}
export function preparationNextStage(product:PreparationProduct,status:string){
  const proposed=product==='agility'?nextAgilityAdminStage(status)
    :product==='electrolyte'?nextElectrolyteAdminStage(status)
    :nextCakeAdministrationStatus(status)
  return proposed && FOOD_PREPARATION_WORKFLOW[product].includes(proposed)?proposed:null
}
export async function moveAssignedPreparationStage(agentId:string,taskId:string,stage:string,note:string){
  if(!validUuid(taskId)||note.trim().length<12||note.length>800){
    throw new PreparationAccessError('A valid task and handoff note (12–800 characters) are required.',400)
  }
  await ensurePreparationOrderSources()
  const manager=await getActiveFoodPreparationManager({id:agentId,role:'agent'})
  const client=await getPool().connect()
  try {
    await client.query('BEGIN')
    const {rows:tasks}=await client.query(`
      SELECT id,product,source_order_id FROM weave_food_preparation_tasks
      WHERE id=$1::uuid AND manager_id=$2::uuid FOR UPDATE
    `,[taskId,manager.id])
    const task=tasks[0]
    if(!task || !isPreparationProduct(task.product)){
      await client.query('ROLLBACK')
      throw new PreparationAccessError('This order was not assigned to your preparation desk.',404)
    }
    const cake=task.product==='daisy'
    const {rows:orders}=cake
      ?await client.query('SELECT * FROM carrier_cake_orders WHERE id=$1::uuid FOR UPDATE',[task.source_order_id])
      :await client.query('SELECT * FROM agility_stock_orders WHERE id=$1::uuid FOR UPDATE',[task.source_order_id])
    const order=orders[0]
    if(!order||order.payment_status!=='paid'){
      await client.query('ROLLBACK')
      throw new PreparationAccessError('Preparation requires a verified paid source order.',409)
    }
    const oldStage=cake?String(order.status):String(order.fulfillment_status)
    const next=preparationNextStage(task.product,oldStage)
    if(next!==stage){
      await client.query('ROLLBACK')
      throw new PreparationAccessError(next?`The next permitted stage is ${next}.`:'This order requires Administration or recipient confirmation for its next step.',409)
    }
    let updated
    if(task.product==='agility'){
      const cost=AGILITY_COMPANY_STANDARD_PREPARATION_COST_PER_BOX_NGN
      const econ=getAgilityCompanyEconomics(Number(order.box_count),cost)
      if(next==='heating' && econ.grossProfitPerBoxNgn!==AGILITY_COMPANY_TARGET_GROSS_PROFIT_PER_BOX_NGN)
        throw new PreparationAccessError('Agility company cost policy does not balance.',409)
      if(next!=='heating'&&!order.planned_company_cost_per_box_ngn)
        throw new PreparationAccessError('Administration production cost must exist before processing.',409)
      const result=await client.query(`
        UPDATE agility_stock_orders
        SET fulfillment_status=$1,
          planned_company_cost_per_box_ngn=CASE WHEN $1='heating' THEN $2 ELSE planned_company_cost_per_box_ngn END,
          planned_company_total_cost_ngn=CASE WHEN $1='heating' THEN $3 ELSE planned_company_total_cost_ngn END,
          planned_company_gross_profit_ngn=CASE WHEN $1='heating' THEN $4 ELSE planned_company_gross_profit_ngn END,
          heated_at=CASE WHEN $1='heating' THEN COALESCE(heated_at,NOW()) ELSE heated_at END,
          packed_at=CASE WHEN $1='packed' THEN COALESCE(packed_at,NOW()) ELSE packed_at END,
          boxed_at=CASE WHEN $1='boxed' THEN COALESCE(boxed_at,NOW()) ELSE boxed_at END,
          dispatched_at=CASE WHEN $1='dispatched' THEN COALESCE(dispatched_at,NOW()) ELSE dispatched_at END,
          updated_at=NOW()
        WHERE id=$5::uuid AND payment_status='paid' AND fulfillment_status=$6
        RETURNING id,agent_id,fulfillment_status
      `,[next,cost,econ.totalPlannedCostNgn,econ.grossProfitNgn,task.source_order_id,oldStage])
      updated=result.rows[0]
    }else if(task.product==='electrolyte'){
      const result=await client.query(`
        UPDATE agility_stock_orders SET fulfillment_status=$1,
          prepared_at=CASE WHEN $1='preparing' THEN COALESCE(prepared_at,NOW()) ELSE prepared_at END,
          packed_at=CASE WHEN $1='packed' THEN COALESCE(packed_at,NOW()) ELSE packed_at END,
          dispatched_at=CASE WHEN $1='dispatched' THEN COALESCE(dispatched_at,NOW()) ELSE dispatched_at END,
          updated_at=NOW()
        WHERE id=$2::uuid AND payment_status='paid' AND fulfillment_status=$3
        RETURNING id,agent_id,fulfillment_status
      `,[next,task.source_order_id,oldStage])
      updated=result.rows[0]
    }else{
      const result=await client.query(`
        UPDATE carrier_cake_orders SET status=$1,
          preparing_at=CASE WHEN $1='preparing' THEN COALESCE(preparing_at,NOW()) ELSE preparing_at END,
          ready_at=CASE WHEN $1='ready' THEN COALESCE(ready_at,NOW()) ELSE ready_at END,
          dispatched_at=CASE WHEN $1='dispatched' THEN COALESCE(dispatched_at,NOW()) ELSE dispatched_at END,
          updated_at=NOW()
        WHERE id=$2::uuid AND payment_status='paid' AND status=$3 AND preparation_released_at IS NOT NULL
        RETURNING id,agent_id,status
      `,[next,task.source_order_id,oldStage])
      updated=result.rows[0]
    }
    if(!updated)throw new PreparationAccessError('Order changed; refresh your preparation desk.',409)
    await client.query(`
      INSERT INTO weave_food_preparation_task_events(task_id,manager_id,stage,note)
      VALUES($1::uuid,$2::uuid,$3,$4)
    `,[task.id,manager.id,next,note])
    await client.query('COMMIT')
    // Failure to notify cannot undo the recorded handoff.
    await getPool().query(`
      INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
      VALUES($1::uuid,'food_preparation','Food preparation updated',$2,'WEAVE Food Preparation Manager',$3)
    `,[updated.agent_id,`Your ${task.product} order moved to ${next}.`,
       task.product==='daisy'?'/agent/cakes':task.product==='electrolyte'?'/electrolyte':'/agility']).catch(()=>{})
    return {taskId:task.id,orderId:updated.id,product:task.product,status:next}
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}

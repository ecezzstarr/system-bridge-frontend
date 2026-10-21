import type { PoolClient } from 'pg'
import { FOOD_PREPARATION_ADMIN_PER_ORDER_NGN,type PreparationProduct } from '@/lib/food-preparation-manager'

type PaidOrder = {
  id:string;payment_status:string;agent_id:string;
  variant_id?:string;box_count?:number|string;package_count?:number|string;
  delivery_address?:string|null;delivery_phone?:string|null;
  customer_name?:string|null;customer_phone?:string|null;
  delivery_location?:string|null;delivery_mode?:string|null;
  occasion?:string|null;size_option?:string|null;flavor?:string|null;
  cake_type?:string|null;event_date?:string|null;
}
type AssignmentResult={assigned:true;managerId:string;managerAgentId:string;taskId:string}|{assigned:false;reason:'no_active_manager'|'already_assigned'}

function notificationDetails(product:PreparationProduct,order:PaidOrder) {
  const name=product==='agility'?'Agility':product==='electrolyte'?'Electrolyte':product==='ember'?'Ember':'Daisy Pastries'
  const item=product==='daisy'?String(order.cake_type||'Cake')+' · '+String(order.size_option||'')
    :String(order.variant_id||name)
  const amount=product==='daisy'?'1 cake':String(order.package_count||'')+' packages ('+String(order.box_count||'')+' cartons)'
  const destination=String((product==='daisy'?order.delivery_location:order.delivery_address)||'Address pending Administration verification')
  const phone=String((product==='daisy'?order.customer_phone:order.delivery_phone)||'Contact through Administration')
  const receivingName=product==='daisy'?String(order.customer_name||'Customer'):'Receiving Agent'
  return [
    name+' · '+item,
    'Order '+order.id,
    'Quantity: '+amount,
    'Recipient: '+receivingName,
    'Delivery: '+destination,
    'Phone: '+phone,
    product==='daisy'?'Event date: '+String(order.event_date||'Confirm with Administration'):'',
    'Open your WEAVE Food Preparation Manager desk to begin and record each handoff.',
  ].filter(Boolean).join('\n').slice(0,1800)
}

/**
 * Called INSIDE the Administration payment/release transaction after a
 * server-side paid transition. The task and notification commit with the
 * verified payment, so a manager is never told to prepare unpaid food.
 *
 * Automatically route paid food orders to the single approved Manager.
 * Assistants work on orders assigned exclusively by the Stability lead Manager.
 */
export async function assignPaidOrderToPreparationManager(
  client:PoolClient,product:PreparationProduct,order:PaidOrder,adminId:string
):Promise<AssignmentResult> {
  if(order.payment_status!=='paid') throw new Error('Unpaid order cannot enter kitchen preparation')
  // A single non-disbursing Administration allocation per verified food order,
  // never per package or carton. Unique product/order key prevents repeat fees.
  await client.query(`
    INSERT INTO weave_food_administration_allocations(product,source_order_id,amount_ngn)
    VALUES($1,$2::uuid,$3)
    ON CONFLICT (product,source_order_id) DO NOTHING
  `,[product,order.id,FOOD_PREPARATION_ADMIN_PER_ORDER_NGN])
  const {rows:existing}=await client.query(`
    SELECT t.id,t.manager_id,m.agent_id FROM weave_food_preparation_tasks t
    JOIN weave_food_preparation_managers m ON m.id=t.manager_id
    WHERE t.product=$1 AND t.source_order_id=$2::uuid LIMIT 1
  `,[product,order.id])
  if(existing.length)return {assigned:false,reason:'already_assigned'}

  const {rows:choices}=await client.query(`
    SELECT m.id,m.agent_id
    FROM weave_food_preparation_managers m
    JOIN users u ON u.id=m.agent_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS jobs FROM weave_food_preparation_tasks t
      WHERE t.manager_id=m.id
    ) workload ON TRUE
    WHERE m.status='approved' AND m.position='manager' AND u.role='agent' AND u.is_active=true
    ORDER BY workload.jobs ASC,m.reviewed_at ASC,m.id ASC
    LIMIT 1
  `)
  const selected=choices[0]
  if(!selected){
    await client.query(`
      INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
      VALUES($1::uuid,'food_preparation_unassigned','Paid food needs a Preparation Manager',
        $2,'WEAVE Food Operations','/admin/food-preparation-manager')
    `,[adminId,product+' order '+order.id+' is verified/authorized for preparation but no approved active manager is available. Notify WEAVE Stability to appoint a lead Manager.'])
    return {assigned:false,reason:'no_active_manager'}
  }

  const {rows:tasks}=await client.query(`
    INSERT INTO weave_food_preparation_tasks(manager_id,product,source_order_id,assigned_by)
    VALUES($1::uuid,$2,$3::uuid,$4::uuid)
    ON CONFLICT (product,source_order_id) DO NOTHING
    RETURNING id
  `,[selected.id,product,order.id,adminId])
  if(!tasks.length)return {assigned:false,reason:'already_assigned'}
  const taskId=String(tasks[0].id)
  await client.query(`
    INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)
    VALUES($1::uuid,'food_preparation_start','START PREPARATION · VERIFIED FOOD ORDER',
      $2,$3::uuid,'WEAVE Stability Lead',$4)
  `,[
    selected.agent_id,
    notificationDetails(product,order),
    adminId,
    '/weave/lifestyles/food-preparation?taskId='+encodeURIComponent(taskId),
  ])
  return {assigned:true,managerId:selected.id,managerAgentId:selected.agent_id,taskId}
}

/** Notify a manually appointed or reassigned manager only when the current
 * source order is paid and the authorization came from WEAVE Stability. */
export async function notifyManualFoodPreparationAssignment(
  client:PoolClient,managerAgentId:string,leadAgentId:string,product:PreparationProduct,
  order:PaidOrder,taskId:string
) {
  if(order.payment_status!=='paid')throw new Error('Cannot notify manager about unpaid preparation')
  await client.query(`
    INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)
    VALUES($1::uuid,'food_preparation_start','START PREPARATION · ASSIGNED ORDER',
      $2,$3::uuid,'WEAVE Administration',$4)
  `,[managerAgentId,notificationDetails(product,order),leadAgentId,
    '/weave/lifestyles/food-preparation?taskId='+encodeURIComponent(taskId)])
}

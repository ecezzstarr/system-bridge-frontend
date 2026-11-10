import { getPool } from '@/lib/db'
import type { PoolClient } from 'pg'
import type { AuthUser } from '@/lib/auth-api'

/** Company Support: assigned, auditable human conversations and funded advances.
 * System Switch is an internal ledger unit, not a publicly traded cryptoasset.
 * Naira stock aid is tracked separately; off-platform customer payments are
 * NEVER treated as automatic repayments.
 */
export type SupportKind = 'regional'|'distribution_lead'|'distribution_assistant'|'food_distribution_lead'|'food_distribution_assistant'|'food_preparation_lead'|'food_preparation_assistant'
export type SupportPurpose = 'guidance'|'system_switch'|'food_stock'
const uuid = (s: unknown):s is string => typeof s==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
const schema = [
  `CREATE TABLE IF NOT EXISTS weave_company_support_assignments(
    worker_id uuid NOT NULL REFERENCES users(id), manager_id uuid NOT NULL REFERENCES users(id),
    assigned_by uuid NOT NULL REFERENCES users(id), active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(worker_id, manager_id))`,
  `CREATE TABLE IF NOT EXISTS weave_company_support_cases(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES users(id), manager_id uuid NOT NULL REFERENCES users(id),
    purpose text NOT NULL CHECK(purpose IN ('guidance','system_switch','food_stock')),
    description text NOT NULL, task_reference text,
    status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','offered','accepted','funded','resolved','declined','cancelled')),
    requested_amount numeric(18,6) NOT NULL DEFAULT 0 CHECK(requested_amount>=0),
    offered_amount numeric(18,6) CHECK(offered_amount>0),
    terms text, offered_by uuid REFERENCES users(id), offered_at timestamptz,
    accepted_at timestamptz, funded_at timestamptz, funding_reference text,
    resolved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS weave_company_support_worker_idx ON weave_company_support_cases(worker_id,created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS weave_company_support_manager_idx ON weave_company_support_cases(manager_id,created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS weave_company_support_messages(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES weave_company_support_cases(id),
    author_id uuid NOT NULL REFERENCES users(id), message text NOT NULL CHECK(length(message)<=2500),
    created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS weave_company_support_messages_case_idx ON weave_company_support_messages(case_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS weave_company_support_advances(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL UNIQUE REFERENCES weave_company_support_cases(id),
    worker_id uuid NOT NULL REFERENCES users(id), funder_id uuid NOT NULL REFERENCES users(id),
    currency text NOT NULL CHECK(currency IN ('SYSTEM_SWITCH','NGN')),
    principal numeric(18,6) NOT NULL CHECK(principal>0),
    spent numeric(18,6) NOT NULL DEFAULT 0 CHECK(spent>=0 AND spent<=principal),
    refunded numeric(18,6) NOT NULL DEFAULT 0 CHECK(refunded>=0 AND refunded<=principal),
    repaid numeric(18,6) NOT NULL DEFAULT 0 CHECK(repaid>=0 AND repaid<=principal),
    status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','repaid','disputed')),
    funding_reference text NOT NULL UNIQUE, verified_by uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `ALTER TABLE weave_company_support_advances ADD COLUMN IF NOT EXISTS spent numeric(18,6) NOT NULL DEFAULT 0`,
  `ALTER TABLE weave_company_support_advances ADD COLUMN IF NOT EXISTS refunded numeric(18,6) NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS weave_company_support_advances_worker_idx ON weave_company_support_advances(worker_id,status,created_at)`,
  `CREATE TABLE IF NOT EXISTS weave_company_support_recoveries(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), advance_id uuid NOT NULL REFERENCES weave_company_support_advances(id),
    earning_source text NOT NULL, amount numeric(18,6) NOT NULL CHECK(amount>0),
    recorded_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(advance_id,earning_source))`
]
let ready:Promise<void>|null=null
export function ensureCompanySupportSchema():Promise<void>{
  if(!ready)ready=(async()=>{const db=getPool();for(const statement of schema)await db.query(statement)})().catch(e=>{ready=null;throw e})
  return ready
}
export async function managerKinds(id:string):Promise<SupportKind[]>{
  const db=getPool()
  const found:SupportKind[]=[]
  const tables=await db.query("SELECT to_regclass('weave_regional_manager_appointments') AS regional, to_regclass('manager_employment') AS distribution, to_regclass('weave_distribution_assistants') AS assistant, to_regclass('weave_food_distribution_employment') AS food, to_regclass('weave_food_preparation_managers') AS preparation")
  const t=tables.rows[0]||{}
  if(t.regional&&(await db.query("SELECT 1 FROM weave_regional_manager_appointments WHERE user_id=$1::uuid AND status='active'",[id])).rowCount)found.push('regional')
  if(t.distribution&&(await db.query("SELECT 1 FROM manager_employment WHERE user_id=$1::uuid AND status IN ('probation','active')",[id])).rowCount)found.push('distribution_lead')
  if(t.assistant&&(await db.query("SELECT 1 FROM weave_distribution_assistants WHERE user_id=$1::uuid AND status='approved'",[id])).rowCount)found.push('distribution_assistant')
  if(t.food){
    const r=await db.query("SELECT position FROM weave_food_distribution_employment WHERE user_id=$1::uuid AND status='approved'",[id])
    if(r.rows[0]?.position==='manager')found.push('food_distribution_lead')
    if(r.rows[0]?.position==='assistant')found.push('food_distribution_assistant')
  }
  if(t.preparation){
    const r=await db.query("SELECT position FROM weave_food_preparation_managers WHERE agent_id=$1::uuid AND status='approved'",[id])
    if(r.rows[0]?.position==='manager')found.push('food_preparation_lead')
    if(r.rows[0]?.position==='assistant')found.push('food_preparation_assistant')
  }
  return found
}
export async function managerAssignedTo(workerId:string,managerId:string):Promise<boolean>{
  if(!uuid(workerId)||!uuid(managerId)||workerId===managerId)return false
  const kinds=await managerKinds(managerId)
  if(!kinds.length)return false
  await ensureCompanySupportSchema()
  const db=getPool()
  const explicit=await db.query('SELECT 1 FROM weave_company_support_assignments WHERE worker_id=$1::uuid AND manager_id=$2::uuid AND active=true',[workerId,managerId])
  if(explicit.rowCount)return true
  if(kinds.includes('regional')){
    const t=await db.query("SELECT to_regclass('weave_regional_manager_bridgers') AS bridgers,to_regclass('weave_regional_manager_distribution_managers') AS leads")
    if(t.rows[0]?.bridgers&&(await db.query("SELECT 1 FROM weave_regional_manager_bridgers WHERE bridger_user_id=$1::uuid AND regional_manager_user_id=$2::uuid AND status='active'",[workerId,managerId])).rowCount)return true
    if(t.rows[0]?.leads&&(await db.query("SELECT 1 FROM weave_regional_manager_distribution_managers WHERE distribution_manager_user_id=$1::uuid AND regional_manager_user_id=$2::uuid AND status='active'",[workerId,managerId])).rowCount)return true
    const assistantTable=await db.query("SELECT to_regclass('weave_distribution_assistants') AS relation")
    if(t.rows[0]?.leads&&assistantTable.rows[0]?.relation&&(await db.query(`SELECT 1 FROM weave_regional_manager_distribution_managers r
      JOIN weave_distribution_assistants a ON a.manager_user_id=r.distribution_manager_user_id AND a.status='approved'
      WHERE a.user_id=$1::uuid AND r.regional_manager_user_id=$2::uuid AND r.status='active'`,[workerId,managerId])).rowCount)return true
  }
  if(kinds.includes('distribution_lead')){
    const t=await db.query("SELECT to_regclass('weave_distribution_assistants') AS assistants")
    if(t.rows[0]?.assistants&&(await db.query("SELECT 1 FROM weave_distribution_assistants WHERE user_id=$1::uuid AND manager_user_id=$2::uuid AND status='approved'",[workerId,managerId])).rowCount)return true
  }
  if(kinds.includes('food_distribution_lead')){
    const t=await db.query("SELECT to_regclass('weave_food_distribution_employment') AS food")
    if(t.rows[0]?.food&&(await db.query("SELECT 1 FROM weave_food_distribution_employment WHERE user_id=$1::uuid AND manager_user_id=$2::uuid AND position='assistant' AND status='approved'",[workerId,managerId])).rowCount)return true
  }
  return false
}
export async function eligibleManagers(workerId:string){
  await ensureCompanySupportSchema()
  const db=getPool()
  const options=await db.query(`SELECT DISTINCT u.id,u.name FROM users u
    WHERE u.is_active=true AND u.id<>$1::uuid AND (
      EXISTS(SELECT 1 FROM weave_company_support_assignments a
        WHERE a.worker_id=$1::uuid AND a.manager_id=u.id AND a.active=true)
      OR EXISTS(SELECT 1 FROM weave_company_support_cases c
        WHERE c.worker_id=$1::uuid AND c.manager_id=u.id AND c.status NOT IN ('resolved','cancelled','declined')))
    ORDER BY u.name LIMIT 100`,[workerId])
  const active=[]
  for(const row of options.rows)if(await managerAssignedTo(workerId,row.id))active.push(row)
  // Existing direct relationships remain valid even before an explicit support assignment.
  const tables=await db.query("SELECT to_regclass('weave_regional_manager_bridgers') AS bridgers,to_regclass('weave_regional_manager_distribution_managers') AS leads,to_regclass('weave_distribution_assistants') AS assistants,to_regclass('weave_food_distribution_employment') AS food")
  const t=tables.rows[0]||{}
  const relations:{sql:string}[]=[]
  if(t.bridgers)relations.push({sql:"SELECT regional_manager_user_id AS id FROM weave_regional_manager_bridgers WHERE bridger_user_id=$1::uuid AND status='active'"})
  if(t.leads)relations.push({sql:"SELECT regional_manager_user_id AS id FROM weave_regional_manager_distribution_managers WHERE distribution_manager_user_id=$1::uuid AND status='active'"})
  if(t.assistants)relations.push({sql:"SELECT manager_user_id AS id FROM weave_distribution_assistants WHERE user_id=$1::uuid AND status='approved' AND manager_user_id IS NOT NULL"})
  if(t.assistants&&t.leads)relations.push({sql:"SELECT r.regional_manager_user_id AS id FROM weave_distribution_assistants a JOIN weave_regional_manager_distribution_managers r ON r.distribution_manager_user_id=a.manager_user_id AND r.status='active' WHERE a.user_id=$1::uuid AND a.status='approved'"})
  if(t.food)relations.push({sql:"SELECT manager_user_id AS id FROM weave_food_distribution_employment WHERE user_id=$1::uuid AND status='approved' AND manager_user_id IS NOT NULL"})
  for(const relation of relations){
    const ids=await db.query(relation.sql,[workerId])
    for(const row of ids.rows){
      if(active.some(x=>x.id===row.id)||!(await managerAssignedTo(workerId,row.id)))continue
      const u=await db.query("SELECT id,name FROM users WHERE id=$1::uuid AND is_active=true",[row.id])
      if(u.rows[0])active.push(u.rows[0])
    }
  }
  return active
}
export async function listSupportCases(user:AuthUser){
  await ensureCompanySupportSchema()
  const db=getPool()
  const isAdmin=user.role==='admin'
  const cases=await db.query(`SELECT c.*,w.name AS worker_name,m.name AS manager_name,
    a.id AS advance_id,a.principal,a.spent,a.refunded,a.repaid,a.currency,a.status AS advance_status
    FROM weave_company_support_cases c
    JOIN users w ON w.id=c.worker_id JOIN users m ON m.id=c.manager_id
    LEFT JOIN weave_company_support_advances a ON a.case_id=c.id
    WHERE ($2::boolean OR c.worker_id=$1::uuid OR c.manager_id=$1::uuid)
    ORDER BY c.updated_at DESC LIMIT 120`,[user.id,isAdmin])
  if(isAdmin)return cases.rows
  if(user.role==='legion')return []
  const isManager=(await managerKinds(user.id)).length>0
  return cases.rows.filter(x=>x.worker_id===user.id || isManager)
}
export async function readSupportMessages(user:AuthUser,caseId:string){
  await ensureCompanySupportSchema()
  if(!uuid(caseId))throw new Error('Invalid case identifier')
  const db=getPool()
  const row=await db.query('SELECT * FROM weave_company_support_cases WHERE id=$1::uuid',[caseId])
  const item=row.rows[0]
  if(!item || (user.role!=='admin' && user.id!==item.worker_id && (user.id!==item.manager_id || !(await managerKinds(user.id)).length)))throw new Error('Support case unavailable')
  const messages=await db.query(`SELECT m.id,m.message,m.created_at,m.author_id,u.name AS author_name
    FROM weave_company_support_messages m JOIN users u ON u.id=m.author_id
    WHERE m.case_id=$1::uuid ORDER BY m.created_at ASC LIMIT 250`,[caseId])
  return {case:item,messages:messages.rows}
}
export async function notifySupport(userId:string,title:string,content:string){
  await getPool().query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
    VALUES($1::uuid,'company_support',$2,$3,'WEAVE Administrations','/weave/lifestyles/support')`,[userId,title,content.slice(0,300)]).catch(e=>console.error('[company-support] notification',e))
}
export async function recoverSupportAdvanceFromEarning(db:PoolClient,workerId:string,earning:number,sourceKey:string){
  if(!uuid(workerId)||!sourceKey||!Number.isFinite(earning)||earning<=0)return 0
  // This runs INSIDE the original earning's transaction, after wallet credit
  // and before COMMIT. A duplicate earning source therefore cannot repay twice.
  const existing=await db.query("SELECT to_regclass('weave_company_support_advances') AS advances")
  if(!existing.rows[0]?.advances)return 0
  const outstanding=await db.query(`SELECT id,funder_id,principal,spent,repaid FROM weave_company_support_advances
    WHERE worker_id=$1::uuid AND currency='SYSTEM_SWITCH' AND status='active' AND repaid<spent
    ORDER BY created_at ASC,id ASC FOR UPDATE`,[workerId])
  let remaining=Math.round(earning*1e6)/1e6,recovered=0
  for(const a of outstanding.rows){
    if(remaining<=0)break
    const due=Math.max(0,Number(a.spent)-Number(a.repaid))
    const take=Math.round(Math.min(due,remaining)*1e6)/1e6
    if(take<=0)continue
    const previous=await db.query('SELECT 1 FROM weave_company_support_recoveries WHERE advance_id=$1::uuid AND earning_source=$2',[a.id,sourceKey])
    if(previous.rowCount)continue
    const wallets=await db.query(`SELECT id,user_id,balance_trx FROM wallets
      WHERE user_id=ANY($1::uuid[]) AND is_primary=true ORDER BY user_id FOR UPDATE`,[[workerId,a.funder_id]])
    const buyer=wallets.rows.find(w=>String(w.user_id)===workerId)
    const funder=wallets.rows.find(w=>String(w.user_id)===String(a.funder_id))
    if(!buyer||!funder||Number(buyer.balance_trx)<take)continue // Keep earning credited; retry after account repair.
    await db.query('UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=now() WHERE id=$2::uuid',[take,buyer.id])
    await db.query('UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=now() WHERE id=$2::uuid',[take,funder.id])
    await db.query(`INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
      VALUES($1::uuid,'debit',$2,'System Switch',$3,$4,$5,$6::jsonb,now())`,
      [workerId,take,'Agreed work support advance repayment',Number(buyer.balance_trx),Number(buyer.balance_trx)-take,JSON.stringify({commerce_type:'company_support_repayment',advance_id:a.id,source_key:sourceKey})])
    await db.query(`INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
      VALUES($1::uuid,'earning',$2,'System Switch',$3,$4,$5,$6::jsonb,now())`,
      [a.funder_id,take,'Company work support advance recovered',Number(funder.balance_trx),Number(funder.balance_trx)+take,JSON.stringify({commerce_type:'company_support_recovery',advance_id:a.id,source_key:sourceKey})])
    await db.query('INSERT INTO weave_company_support_recoveries(advance_id,earning_source,amount) VALUES($1::uuid,$2,$3)',[a.id,sourceKey,take])
    await db.query("UPDATE weave_company_support_advances SET repaid=repaid+$2,status=CASE WHEN repaid+$2>=spent AND spent+refunded>=principal THEN 'repaid' ELSE 'active' END,updated_at=now() WHERE id=$1::uuid",[a.id,take])
    remaining-=take;recovered+=take
  }
  return recovered
}
/** Apply only an approved, fully funded System Switch reserve to an eligible
 * Prospect Market purchase. Caller owns a SQL transaction and locks the
 * market package before this call. No general wallet spending is authorized.
 */
export async function consumeProspectSupport(db:PoolClient,workerId:string,price:number,sourceId:string){
 if(!uuid(workerId)||!uuid(sourceId)||!Number.isFinite(price)||price<=0)return null
 const relation=await db.query("SELECT to_regclass('weave_company_support_advances') AS relation")
 if(!relation.rows[0]?.relation)return null
 const r=await db.query(`SELECT a.id,a.case_id,a.principal,a.spent,a.refunded
  FROM weave_company_support_advances a JOIN weave_company_support_cases c ON c.id=a.case_id
  WHERE a.worker_id=$1::uuid AND a.currency='SYSTEM_SWITCH' AND a.status='active'
    AND c.purpose='system_switch' AND c.status='funded' AND a.principal-a.spent-a.refunded>=$2
  ORDER BY a.created_at ASC,a.id ASC FOR UPDATE OF a`,[workerId,price])
 const advance=r.rows[0]
 if(!advance)return null
 await db.query('UPDATE weave_company_support_advances SET spent=spent+$2,updated_at=now() WHERE id=$1::uuid',[advance.id,price])
 await db.query(`INSERT INTO weave_company_support_messages(case_id,author_id,message)
   VALUES($1::uuid,$2::uuid,$3)`,[advance.case_id,workerId,'Used '+price+' System Switch from funded work support on prospect package '+sourceId])
 return {advanceId:String(advance.id),caseId:String(advance.case_id),price}
}
export {uuid}

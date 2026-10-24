import { getPool } from '@/lib/db'
import { ensureChildSupportOrdersSchema, childSupportAccess } from '@/lib/child-support-orders'
import { getGuidanceStaffDepartments } from '@/lib/weave-guidance-departments'

let schema:Promise<void>|null=null
export async function ensureFamilySupportSchema(){
  await ensureChildSupportOrdersSchema()
  if(!schema)schema=getPool().query([
    "CREATE TABLE IF NOT EXISTS weave_family_support_beneficiaries (",
    "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),",
    "sender_id uuid NOT NULL REFERENCES users(id),",
    "kind varchar(12) NOT NULL CHECK(kind IN ('child','parent')),",
    "display_name varchar(160) NOT NULL,",
    "bank_name varchar(120) NOT NULL,",
    "account_number varchar(20) NOT NULL,",
    "purpose varchar(32) NOT NULL DEFAULT 'education_food_activities',",
    "monthly_amount_ngn numeric(14,2) NOT NULL CHECK(monthly_amount_ngn>0),",
    "recurring boolean NOT NULL DEFAULT false,active boolean NOT NULL DEFAULT true,",
    "created_at timestamptz NOT NULL DEFAULT NOW(),updated_at timestamptz NOT NULL DEFAULT NOW(),",
    "UNIQUE(sender_id,bank_name,account_number));",
    "ALTER TABLE weave_child_support_orders ADD COLUMN IF NOT EXISTS beneficiary_id uuid REFERENCES weave_family_support_beneficiaries(id);",
    "ALTER TABLE weave_child_support_orders ADD COLUMN IF NOT EXISTS support_kind varchar(12) NOT NULL DEFAULT 'child';",
    "ALTER TABLE weave_child_support_orders ADD COLUMN IF NOT EXISTS purpose varchar(32) NOT NULL DEFAULT 'education_food_activities';",
    "ALTER TABLE weave_child_support_orders DROP CONSTRAINT IF EXISTS weave_child_support_orders_status_check;",
    "ALTER TABLE weave_child_support_orders ADD CONSTRAINT weave_child_support_orders_status_check",
    " CHECK(status IN ('awaiting_funding','submitted','funds_verified','transferred','rejected'));",
    "CREATE UNIQUE INDEX IF NOT EXISTS weave_family_support_monthly_once",
    "ON weave_child_support_orders(beneficiary_id,period_month) WHERE beneficiary_id IS NOT NULL;",
    "CREATE TABLE IF NOT EXISTS weave_family_support_guidance(",
    "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),",
    "order_id uuid NOT NULL REFERENCES weave_child_support_orders(id) ON DELETE CASCADE,",
    "author_id uuid NOT NULL REFERENCES users(id),",
    "department varchar(16) NOT NULL CHECK(department IN ('mandate','lawyer')),",
    "guidance_note varchar(1000) NOT NULL,",
    "created_at timestamptz NOT NULL DEFAULT NOW());",
    "CREATE INDEX IF NOT EXISTS weave_family_support_guidance_order_idx",
    "ON weave_family_support_guidance(order_id,created_at);",
  ].join('\n')).then(()=>{}).catch(e=>{schema=null;throw e})
  await schema
}
export async function familySupportAccess(user:{id:string;role:string}){
  const access=await childSupportAccess(user)
  if(!access.canSubmit)return {...access,canGuide:[] as string[]}
  if(user.role==='admin')return {...access,canGuide:['mandate','lawyer']}
  if(!['agent','bridger'].includes(user.role))return {...access,canGuide:[] as string[]}
  const departments=await getGuidanceStaffDepartments(user)
  return {...access,canGuide:departments.filter(item=>item==='mandate'||item==='lawyer')}
}
// An order is a monthly instruction only. No wallet debit or bank transfer occurs.
export async function generateCurrentMonthSupportInstructions(){
  await ensureFamilySupportSchema()
  const month=new Date().toISOString().slice(0,7)
  const {rowCount}=await getPool().query([
    "INSERT INTO weave_child_support_orders",
    "(requester_id,requester_role,period_month,amount_ngn,source_reference,",
    "recipient_account_name,recipient_bank,recipient_account_number,",
    "beneficiary_id,support_kind,purpose,status,note)",
    "SELECT b.sender_id,u.role,$1,b.monthly_amount_ngn,",
    "'scheduled:'||b.id::text||':'||$1,b.display_name,b.bank_name,b.account_number,",
    "b.id,b.kind,b.purpose,'awaiting_funding','Recurring support instruction awaiting actual funding'",
    "FROM weave_family_support_beneficiaries b JOIN users u ON u.id=b.sender_id",
    "WHERE b.recurring=true AND b.active=true AND u.is_active=true",
    "AND u.role IN ('admin','client','agent','bridger')",
    "ON CONFLICT DO NOTHING",
  ].join('\n'),[month])
  return {month,created:rowCount||0}
}
export function validSupportMonth(v:unknown):v is string{
 return typeof v==='string'&&/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(v)
 && Number(v.slice(0,4))>=2025&&Number(v.slice(0,4))<=2100
}

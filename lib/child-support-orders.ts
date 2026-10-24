import { getPool } from '@/lib/db'
import { getGuidanceStaffDepartments } from '@/lib/weave-guidance-departments'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'

export const CHILD_SUPPORT_ORDER_STATUSES=['submitted','funds_verified','transferred','rejected'] as const
export const CHILD_SUPPORT_FIXED_ADMIN_RESERVE_NGN=200
export const CHILD_SUPPORT_ADMIN_RECEIPT_UNIT_NGN=1000
export const CHILD_SUPPORT_MONTHLY_RULE='Administration reserves ₦200 of each ₦1,000 received through Stability. This is one total reserve, not ₦200 per child.'
export const childSupportUuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

let schemaPromise:Promise<void>|null=null
export async function ensureChildSupportOrdersSchema(){
  if(!schemaPromise){
    schemaPromise=getPool().query([
      'CREATE TABLE IF NOT EXISTS weave_child_support_orders (',
      'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),',
      'requester_id uuid NOT NULL REFERENCES users(id),',
      "requester_role varchar(16) NOT NULL CHECK (requester_role IN ('admin','client','agent','bridger')),",
      "period_month varchar(7) NOT NULL CHECK (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),",
      'amount_ngn numeric(14,2) NOT NULL CHECK (amount_ngn > 0),',
      'source_reference varchar(160) NOT NULL,',
      'recipient_account_name varchar(160) NOT NULL,',
      'recipient_bank varchar(120) NOT NULL,',
      'recipient_account_number varchar(20) NOT NULL,',
      "note varchar(800) NOT NULL DEFAULT '',",
      "status varchar(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','funds_verified','transferred','rejected')),",
      'verification_reference varchar(160),',
      'transfer_reference varchar(160),',
      'review_note varchar(800),',
      'verified_by uuid REFERENCES users(id),',
      'verified_at timestamptz,',
      'transferred_by uuid REFERENCES users(id),',
      'transferred_at timestamptz,',
      'created_at timestamptz NOT NULL DEFAULT NOW(),',
      'updated_at timestamptz NOT NULL DEFAULT NOW(),',
      'UNIQUE(requester_id,source_reference),',
      "CHECK (status <> 'funds_verified' OR verification_reference IS NOT NULL),",
      "CHECK (status <> 'transferred' OR (verification_reference IS NOT NULL AND transfer_reference IS NOT NULL))",
      ');',
      'CREATE INDEX IF NOT EXISTS weave_child_support_queue_idx ON weave_child_support_orders(status,created_at DESC);',
      'CREATE INDEX IF NOT EXISTS weave_child_support_requester_idx ON weave_child_support_orders(requester_id,created_at DESC);',
    ].join('\n')).then(()=>{}).catch(error=>{schemaPromise=null;throw error})
  }
  await schemaPromise
}

export async function childSupportAccess(user:{id:string;role:string}){
  if(!['admin','agent','bridger','client'].includes(user.role))return {canSubmit:false,canReview:false}
  const lifestyle=await getLifestyleAccess(user.id)
  if(!lifestyle.active)return {canSubmit:false,canReview:false}
  if(user.role==='admin')return {canSubmit:true,canReview:true}
  if(user.role==='client')return {canSubmit:true,canReview:false}
  const departments=await getGuidanceStaffDepartments(user)
  return {canSubmit:true,canReview:departments.includes('forensic')}
}

export function validChildSupportMonth(input:unknown):input is string {
  if(typeof input!=='string'||!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(input))return false
  const year=Number(input.slice(0,4))
  return year>=2025&&year<=2100
}

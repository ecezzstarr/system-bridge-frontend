import { sql } from '@/lib/db'

// Retired Continuance compatibility functions. No Bridger member owes any
// recurring subscription and these legacy paths must never debit a wallet.
export type ContinuanceStatus = 'active' | 'due' | 'suspended'
export async function ensureContinuanceTables() { return true }
export async function getBridgerSubscription(userId:string) {
  const rows=await sql`SELECT id,role,is_active FROM users WHERE id=${userId}::uuid`
  const row=rows[0]
  if(!row)return null
  return {id:row.id,role:row.role,status:'not_required',expiry:null,is_exempt:true,last_paid_at:null}
}
export async function payContinuance(_userId:string,_amount:number,_reference:string) { return false }
export async function setExemptStatus(_userId:string,_isExempt:boolean) { return true }
export async function submitContinuancePayment(_userId:string,_amount:number,_reference:string,_paymentMethod:string) { return null }
export async function getPendingContinuancePayments() {
  // Existing historical pending claims should be reviewed for refunds,
  // never newly activated under a retired subscription rule.
  try {
    return await sql`SELECT sp.id,sp.user_id,sp.amount,sp.payment_method,sp.transaction_reference,sp.created_at,u.email,u.name
                     FROM subscription_payments sp JOIN users u ON u.id=sp.user_id
                     WHERE sp.status='pending' ORDER BY sp.created_at ASC`
  } catch { return [] }
}
export async function approveContinuancePayment(_paymentId:string) { return false }
export async function rejectContinuancePayment(paymentId:string) {
  await sql`UPDATE subscription_payments SET status='rejected' WHERE id=${paymentId}::uuid AND status='pending'`
}
export async function autoDeductContinuance(_userId:string) {
  return {success:false as const,reason:'retired' as const}
}
export async function getBridgersNeedingAttention() {
  return {dueForReminder:[],dueForDeduction:[]}
}

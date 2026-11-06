import { sql, getPool } from '@/lib/db'
import { CJ_DORADO_FILE_NUMBER } from '@/lib/client-file-folder'

/**
 * One-time PRO folder activation. This is a service activation fee, NOT a loan
 * or a wallet deposit. Existing live Pro folders are not retroactively charged:
 * the gate applies only to explicitly prepared enrollments and the reserved
 * CJ Dorado File Number, which is pending formal onboarding.
 */
export const PRO_ACTIVATION_FEE_USDT = 680
export const PRO_ACTIVATION_NETWORK = 'TRON (TRC-20)'
export const isTronAddress = (value: string) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value)
const txHashValid = (value: string) => /^[a-f0-9]{64}$/.test(value)
const publicHeaders = { 'Cache-Control': 'private, no-store' }

export async function ensureProActivationSchema() {
  await sql`CREATE TABLE IF NOT EXISTS pro_file_folder_activations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL UNIQUE REFERENCES users(id),
    file_number varchar(120) NOT NULL UNIQUE,
    status varchar(36) NOT NULL DEFAULT 'awaiting_signature'
      CHECK (status IN ('awaiting_signature','business_plan_required','payment_required',
                       'pending_forensics','rejected','active')),
    signed_agreement_reference varchar(255),
    signed_agreement_verified_at timestamptz,
    signed_agreement_verified_by uuid REFERENCES users(id),
    business_plan jsonb,
    business_plan_submitted_at timestamptz,
    wallet_address varchar(64),
    payment_tx_hash char(64) UNIQUE,
    payment_submitted_at timestamptz,
    rejection_reason text,
    verified_amount_usdt numeric(16,2),
    verified_by uuid REFERENCES users(id),
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    activated_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`
  await sql`CREATE TABLE IF NOT EXISTS pro_activation_wallet_config (
    id int PRIMARY KEY CHECK(id=1),
    wallet_address varchar(64) NOT NULL,
    updated_by uuid NOT NULL REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`
  await sql`CREATE TABLE IF NOT EXISTS pro_activation_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_id uuid NOT NULL REFERENCES pro_file_folder_activations(id),
    action varchar(80) NOT NULL,
    actor_id uuid NOT NULL REFERENCES users(id),
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`
}
export async function getReceivingWallet() {
  const [config] = await sql`SELECT wallet_address FROM pro_activation_wallet_config WHERE id=1 LIMIT 1`
  const address = String(config?.wallet_address || process.env.WEAVE_PRO_USDT_TRC20_WALLET || '').trim()
  return isTronAddress(address) ? address : null
}
export async function getProActivationState(clientId: string, fileNumber: string) {
  const [table] = await sql`SELECT to_regclass('public.pro_file_folder_activations') AS name`
  if (!table?.name) return fileNumber === CJ_DORADO_FILE_NUMBER
    ? {status:'awaiting_preparation',fileNumber,feeUSDT:PRO_ACTIVATION_FEE_USDT,tier:'pro'} : null
  const [row] = await sql`SELECT id,client_id,file_number,status,signed_agreement_reference,
    signed_agreement_verified_at,business_plan,business_plan_submitted_at,wallet_address,
    payment_tx_hash,payment_submitted_at,rejection_reason,verified_at,activated_at
    FROM pro_file_folder_activations WHERE client_id=${clientId}::uuid AND file_number=${fileNumber} LIMIT 1`
  if (!row) return fileNumber === CJ_DORADO_FILE_NUMBER
    ? {status:'awaiting_preparation',fileNumber,feeUSDT:PRO_ACTIVATION_FEE_USDT,tier:'pro'} : null
  return {...row,tier:'pro',feeUSDT:PRO_ACTIVATION_FEE_USDT,
    network:PRO_ACTIVATION_NETWORK, walletAddress:row.wallet_address||null}
}
export async function ensureProActivationForNewClient(clientId:string,fileNumber:string,fromTier:string) {
  if(fromTier!=='pro')return
  await ensureProActivationSchema()
  const [owner] = await sql`SELECT id FROM users WHERE id=${clientId}::uuid AND role='client'
    AND is_active=true AND file_number=${fileNumber} LIMIT 1`
  if(!owner)throw new Error('Pro activation owner and File Number mismatch')
  await sql`INSERT INTO pro_file_folder_activations(client_id,file_number)
    VALUES(${clientId}::uuid,${fileNumber}) ON CONFLICT DO NOTHING`
}
export async function requireProActivationClient(user:{id:string;role:string;file_number?:string}) {
  if(user.role!=='client'||!user.file_number)return null
  return getProActivationState(user.id,user.file_number)
}
export async function submitProBusinessPlan(clientId:string,fileNumber:string,plan:Record<string,unknown>) {
  const fields=['businessName','businessActivity','customers','revenueModel','operations']
  const cleaned:Record<string,string>={}
  for(const field of fields) {
    const value=String(plan[field]||'').trim()
    if(value.length<10||value.length>3000)throw new Error('Complete every business-plan section (10–3000 characters).')
    cleaned[field]=value
  }
  await ensureProActivationSchema()
  const [row]=await sql`UPDATE pro_file_folder_activations
    SET business_plan=${JSON.stringify(cleaned)}::jsonb,
        business_plan_submitted_at=now(),status='payment_required',updated_at=now()
    WHERE client_id=${clientId}::uuid AND file_number=${fileNumber}
      AND signed_agreement_verified_at IS NOT NULL
      AND status IN ('business_plan_required','payment_required')
    RETURNING id`
  if(!row)throw new Error('The signed Pro agreement must be verified before the business plan can be submitted.')
  return {success:true,status:'payment_required'}
}
export async function submitProPayment(clientId:string,fileNumber:string,txHashInput:string,expectedWalletInput:string) {
  const txHash=txHashInput.trim().toLowerCase()
  if(!txHashValid(txHash))throw new Error('Enter the 64-character TRON transaction hash.')
  await ensureProActivationSchema()
  const receivingWallet=await getReceivingWallet()
  if(!receivingWallet)throw new Error('Forensics has not configured a verified TRC-20 receiving wallet.')
  const expectedWallet=expectedWalletInput.trim()
  // Client must confirm exactly the address shown before they transferred USDT.
  // A changed destination never silently rewrites evidence to a new wallet.
  if(!isTronAddress(expectedWallet)||expectedWallet!==receivingWallet)
    throw new Error('The official receiving wallet has changed. Do not send again; contact Forensics to reconcile the existing transfer.')
  const [row]=await sql`UPDATE pro_file_folder_activations
    SET wallet_address=COALESCE(wallet_address,${expectedWallet}),payment_tx_hash=${txHash},
      payment_submitted_at=now(),status='pending_forensics',rejection_reason=NULL,updated_at=now()
    WHERE client_id=${clientId}::uuid AND file_number=${fileNumber}
      AND (wallet_address IS NULL OR wallet_address=${expectedWallet})
      AND business_plan_submitted_at IS NOT NULL AND signed_agreement_verified_at IS NOT NULL
      AND status IN ('payment_required','rejected') AND activated_at IS NULL
    RETURNING id`
  if(!row)throw new Error('Business plan, signature, wallet match and a non-pending activation are required.')
  return {success:true,status:'pending_forensics'}
}
export async function writeProActivationAudit(activationId:string,action:string,actorId:string,details:object={}){
  await sql`INSERT INTO pro_activation_audit(activation_id,action,actor_id,details)
    VALUES(${activationId}::uuid,${action},${actorId}::uuid,${JSON.stringify(details)}::jsonb)`
}
export {publicHeaders}

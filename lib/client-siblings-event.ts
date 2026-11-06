import { sql } from '@/lib/db'
import { CJ_DORADO_FILE_NUMBER } from '@/lib/client-file-folder'
import { getProActivationState } from '@/lib/pro-file-folder-activation'

/**
 * CJ's 9,000 USDT is a reported Siblings Event Mandate-earnings claim,
 * NOT an independently confirmed wallet credit or a payable balance.
 * Showing the reported amount must never create spendable funds.
 */
export const CJ_SIBLINGS_EVENT_REPORTED_USDT = 9000

export async function ensureSiblingsEventSchema(){
 await sql`CREATE TABLE IF NOT EXISTS client_siblings_event_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES users(id),
  file_number varchar(120) NOT NULL UNIQUE,
  event_name varchar(64) NOT NULL DEFAULT 'Siblings Event',
  reported_amount_usdt numeric(16,2) NOT NULL DEFAULT 0 CHECK(reported_amount_usdt>=0),
  verified_amount_usdt numeric(16,2) NOT NULL DEFAULT 0 CHECK(verified_amount_usdt>=0),
  status varchar(36) NOT NULL DEFAULT 'pending_mandate_verification'
    CHECK(status IN ('pending_mandate_verification','mandate_verified','disputed')),
  source varchar(80) NOT NULL DEFAULT 'administration_report',
  mandate_evidence_reference varchar(255),
  verified_by uuid REFERENCES users(id),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
 )`
}

/** Only the named, authenticated CJ Client can see her provisional event claim. */
export async function getCjSiblingsEvent(clientId:string,fileNumber:string){
 if(fileNumber!==CJ_DORADO_FILE_NUMBER)return null
 const [owner]=await sql`SELECT id,name FROM users WHERE id=${clientId}::uuid
  AND file_number=${CJ_DORADO_FILE_NUMBER} AND role='client'
  AND COALESCE(is_active,true)=true LIMIT 1`
 if(!owner||!/\bcj\s+dorado\b/i.test(String(owner.name||'')))return null
 await ensureSiblingsEventSchema()
 // Not a wallet credit. Never touch deposits, ledgers, withdrawable balance or prior records.
 await sql`INSERT INTO client_siblings_event_claims
   (client_id,file_number,reported_amount_usdt,source)
   VALUES(${clientId}::uuid,${CJ_DORADO_FILE_NUMBER},
     ${CJ_SIBLINGS_EVENT_REPORTED_USDT},'administration_report')
   ON CONFLICT(client_id) DO NOTHING`
 const [claim]=await sql`SELECT id,event_name,reported_amount_usdt,verified_amount_usdt,
  status,mandate_evidence_reference,verified_at FROM client_siblings_event_claims
  WHERE client_id=${clientId}::uuid AND file_number=${CJ_DORADO_FILE_NUMBER} LIMIT 1`
 const activation=await getProActivationState(clientId,fileNumber)
 // Private folder controls are separate from legal ownership of verified business earnings.
 const proActive=activation?.status==='active'
 return {
  eventName:'Siblings Event',
  reportedAmountUSDT:Number(claim?.reported_amount_usdt||0),
  verifiedAmountUSDT:Number(claim?.verified_amount_usdt||0),
  currency:'USDT',
  source:'Mandate business earnings · Administration-reported, subject to independent reconciliation',
  status:String(claim?.status||'pending_mandate_verification'),
  proActivated:proActive,
  workspaceAccess:proActive,
  fundsVerified:claim?.status==='mandate_verified'&&Number(claim.verified_amount_usdt)>0,
  availableForWithdrawal:false,
  notice:proActive
    ? 'The Pro Folder is active. Any Siblings Event earnings must still be independently reconciled against Mandate and wallet records; this reported claim is not a withdrawable balance.'
    : 'Your reported Siblings Event earnings are visible for review. The private Pro Folder opens after its own activation; earnings are subject to separate verification and are not contingent on paying an activation fee.',
 }
}

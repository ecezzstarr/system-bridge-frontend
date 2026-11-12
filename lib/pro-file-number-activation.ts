import {isProRegionalManagerPosition} from '@/lib/pro-regional-manager-policy'

/** Called inside the Forensics receipt transaction, before registration opens. */
export async function activateVerifiedProFileNumber(db:any,row:any,adminId:string){
 const {rows:offers}=await db.query(`SELECT id,candidate_name,position_title,client_id,monthly_salary_usdt
  FROM company_client_staff_offers WHERE file_number=$1 AND status='approved' AND folder_tier='pro'
  FOR UPDATE`,[row.file_number])
 const offer=offers[0]
 if(offers.length!==1||Number(offer.monthly_salary_usdt)<=0||
   String(offer.candidate_name||'').trim().toLowerCase()!==String(row.signed_name||'').trim().toLowerCase()||
   (row.file_number==='WEAVE-2026-0907-0001'&&!isProRegionalManagerPosition(offer.position_title,row.file_number)))
  throw new Error('The verified current Client details and approved Pro appointment are required for activation.')
 const {rows:existing}=await db.query(`SELECT id,client_id,status FROM pro_file_folder_activations
  WHERE file_number=$1 FOR UPDATE`,[row.file_number])
 if(existing.length&&(existing[0].status==='active'||
   existing[0].client_id&&String(existing[0].client_id)!==String(offer.client_id)))
  throw new Error('This File Number already has an active or differently owned Pro activation.')
 const values=[offer.client_id||null,row.file_number,row.signed_name,row.terms_accepted_at,
  row.identity_reference,row.identity_verified_by,row.identity_verified_at,
  JSON.stringify(row.business_plan),row.created_at,String(row.payment_tx_hash).trim(),
  row.payment_wallet,row.payment_submitted_at,adminId]
 const result=existing.length
  ?await db.query(`UPDATE pro_file_folder_activations SET status='active',client_signature_name=$3,
   client_signature_at=$4,client_terms_version='PRO-680-USDT-2026-11',signed_agreement_reference=$5,
   signed_agreement_verified_by=$6::uuid,signed_agreement_verified_at=$7,business_plan=$8::jsonb,
   business_plan_submitted_at=$9,payment_tx_hash=$10,wallet_address=$11,payment_submitted_at=$12,
   verified_amount_usdt=680,verified_by=$13::uuid,verified_at=now(),activated_at=now(),updated_at=now()
   WHERE file_number=$2 AND (client_id IS NULL OR client_id=$1::uuid) RETURNING id`,values)
  :await db.query(`INSERT INTO pro_file_folder_activations(client_id,file_number,status,
   client_signature_name,client_signature_at,client_terms_version,signed_agreement_reference,
   signed_agreement_verified_by,signed_agreement_verified_at,business_plan,business_plan_submitted_at,
   payment_tx_hash,wallet_address,payment_submitted_at,verified_amount_usdt,verified_by,verified_at,activated_at)
   VALUES($1::uuid,$2,'active',$3,$4,'PRO-680-USDT-2026-11',$5,$6::uuid,$7,$8::jsonb,$9,$10,$11,$12,680,$13::uuid,now(),now())
   RETURNING id`,values)
 if(result.rows.length!==1)throw new Error('Unable to activate the verified Pro File Number.')
 await db.query(`INSERT INTO pro_activation_audit(activation_id,action,actor_id,details)
  VALUES($1::uuid,'file_number_activated_before_registration',$2::uuid,$3::jsonb)`,
  [result.rows[0].id,adminId,JSON.stringify({verificationId:row.id,fileNumber:row.file_number,signedName:row.signed_name})])
 return result.rows[0].id
}

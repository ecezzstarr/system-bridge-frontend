import {randomBytes} from 'node:crypto'
import {getPool,sql} from '@/lib/db'
import {ensureClientFileFolderSchema,ensureCjDoradoFolder,CJ_DORADO_FILE_NUMBER} from '@/lib/client-file-folder'
import {ensureFneTables} from '@/lib/fne'
import {ensureCompanyClientStaffSchema,staffOfferTokenHash} from '@/lib/company-client-staff'
import {ensureProFileNumberVerificationSchema} from '@/lib/pro-file-number-verification'

/** Record independently approved employment, without asserting a paid ticket. */
export async function reconcileProStaffAppointment(id:string,adminId:string,input:{
 candidateEmail?:unknown;monthlySalaryUSDT?:unknown;appointmentReference?:unknown;independentlyVerified?:unknown
}){
 const email=String(input.candidateEmail||'').trim().toLowerCase()
 const salary=Number(input.monthlySalaryUSDT)
 const reference=String(input.appointmentReference||'').trim()
 if(input.independentlyVerified!==true||!Number.isFinite(salary)||salary<=0||salary>100000||
   Math.abs(salary*100-Math.round(salary*100))>0.000001||
   !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||email.length>255||reference.length<8||reference.length>255)
  throw new Error('Record the verified company email, agreed monthly salary and approved appointment reference.')
 await ensureCompanyClientStaffSchema()
 await ensureProFileNumberVerificationSchema()
 await ensureClientFileFolderSchema(sql)
 if(!await ensureFneTables())throw new Error('The File Number register is unavailable. Try again after the register is restored.')
 const db=await getPool().connect()
 try{
  await db.query('BEGIN')
  const {rows}=await db.query(`SELECT id,file_number,signed_name,status FROM pro_file_number_verifications
   WHERE id=$1::uuid FOR UPDATE`,[id])
  const application=rows[0]
  if(!application||application.status!=='pending_identity')throw new Error('Select an application awaiting identity review.')
  // The company reserved CJ's original Pro number in client_file_folders before
  // the generic registration register existed. Reconcile that same entitlement,
  // rather than rejecting it or asking her to buy a replacement number.
  if(application.file_number===CJ_DORADO_FILE_NUMBER){
   const transactionSql=async(strings:TemplateStringsArray,...values:any[])=>(await db.query(
    strings.reduce((query,part,index)=>query+(index?'$'+index:'')+part,''),values)).rows
   await ensureCjDoradoFolder(transactionSql as typeof sql)
  }
  const entitlement=await db.query('SELECT id,client_id,status FROM file_folders WHERE file_number=$1 FOR UPDATE',[application.file_number])
  const reserved=await db.query('SELECT id,client_id FROM client_file_folders WHERE file_number=$1 FOR UPDATE',[application.file_number])
  if(!entitlement.rows.length&&!reserved.rows.length)
   throw new Error('No issued or company-reserved File Folder is recorded for this File Number. Reconcile its original entitlement first.')
  // Never overwrite an existing offer, rejected appointment, or another owner.
  const offers=await db.query('SELECT id FROM company_client_staff_offers WHERE file_number=$1 FOR UPDATE',[application.file_number])
  if(offers.rows.length)throw new Error('An employment offer already exists for this File Number. Reconcile that original offer in Company Staff Offers.')
  const owners=await db.query(`SELECT id,name,email,file_number,role FROM users
   WHERE file_number=$1 OR lower(email)=$2 FOR UPDATE`,[application.file_number,email])
  if(owners.rows.length>1)throw new Error('Conflicting company email or File Number ownership; reconcile the existing accounts first.')
  const owner=owners.rows[0]
  if(owner&&(owner.role!=='client'||owner.file_number!==application.file_number||
    String(owner.email||'').toLowerCase()!==email||
    String(owner.name||'').trim().toLowerCase()!==String(application.signed_name).trim().toLowerCase()))
   throw new Error('The verified employee must match the existing Client name, email and File Number.')
  for(const folder of [...entitlement.rows,...reserved.rows]){
   if(folder.client_id&&String(folder.client_id)!==String(owner?.id||''))
    throw new Error('The issued or reserved File Folder belongs to another Client account.')
  }
  if(entitlement.rows[0]?.status==='registered'&&!owner)
   throw new Error('This File Number is already registered. Reconcile the existing Client account first.')
  if(!entitlement.rows.length){
   await db.query(`INSERT INTO file_folders(file_number,client_id,identity_data,status)
    VALUES($1,$2::uuid,$3::jsonb,$4)`,[application.file_number,owner?.id||null,
    JSON.stringify({name:application.signed_name,email,phone:'',origin:'reserved_pro_staff_reconciliation',
     originalFolderId:reserved.rows[0].id,verificationId:application.id,appointmentReference:reference}),
    owner?'registered':'pending'])
  }
  // No token is disclosed. Registration remains blocked while status=accepted;
  // only Forensics can mark this offer approved after the actual Pro receipt.
  await db.query(`INSERT INTO company_client_staff_offers
   (token_hash,candidate_name,candidate_email,position_title,monthly_salary_usdt,
    ticket_amount_usdt,applicant_contribution_usdt,folder_tier,status,file_number,client_id,
    created_by,accepted_at,appointment_approved_at,appointment_approved_by,appointment_reference)
   VALUES($1,$2,$3,'Pro Regional Manager',$4,680,680,'pro','accepted',$5,$6::uuid,
    $7::uuid,now(),now(),$7::uuid,$8)`,
   [staffOfferTokenHash(randomBytes(32).toString('hex')),application.signed_name,email,salary,
    application.file_number,owner?.id||null,adminId,reference])
  await db.query('COMMIT')
  return {success:true,status:'appointment_approved'}
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}
 finally{db.release()}
}

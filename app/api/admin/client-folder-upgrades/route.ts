import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool,sql } from '@/lib/db'
import { CJ_PRO_FOLDER_NUMBER,clientUpgradePublicView,ensureClientFolderUpgrades } from '@/lib/client-folder-upgrade'
import { CJ_EMPLOYEE_LOAN_USDT } from '@/lib/cj-dorado-loan'
import { ensureFneTables } from '@/lib/fne'
import { ensureCjDoradoFolder } from '@/lib/client-file-folder'
import { ensureCompanyClientStaffSchema } from '@/lib/company-client-staff'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
async function admin(request:NextRequest){
 const user=await getAuthUser(request)
 return user?.role==='admin'?user:null
}
async function notify(clientId:string,title:string,message:string){
 try{await sql`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
 VALUES(${clientId}::uuid,'file_folder_upgrade',${title},${message},'WEAVE Administration','/client/system-switch')`}
 catch(error){console.error('[file-folder upgrade notification]',error)}
}
export async function GET(request:NextRequest){
 const user=await admin(request)
 if(!user)return NextResponse.json({error:'Administration required'},{status:403})
 try{
  await ensureClientFolderUpgrades()
  const clients=await sql`SELECT id,name,email,file_number FROM users
    WHERE file_number=${CJ_PRO_FOLDER_NUMBER} AND role='client' AND COALESCE(is_active,true)=true LIMIT 2`
  const rows=await sql`SELECT u.id,u.client_id,u.file_number,u.tier,u.status,u.loan_principal_usdt,
    u.loan_agreed_at,u.loan_funded_at,u.repayment_verified_usdt,u.construction_note,u.updated_at,
    u.loan_funding_reference,u.loan_agreement_reference
    FROM client_folder_upgrades u WHERE u.file_number=${CJ_PRO_FOLDER_NUMBER} LIMIT 1`
  const repayments=rows[0]?await sql`SELECT amount_usdt,network,reference,verified_at
    FROM client_folder_loan_repayments WHERE upgrade_id=${rows[0].id} ORDER BY verified_at DESC LIMIT 30`:[]
  return NextResponse.json({success:true,fileNumber:CJ_PRO_FOLDER_NUMBER,clients,
    upgrade:rows[0]||null,publicView:clientUpgradePublicView(rows[0]),repayments},{headers})
 }catch(error){console.error('[admin folder upgrade GET]',error);return NextResponse.json({error:'Upgrade register unavailable'},{status:500})}
}
export async function POST(request:NextRequest){
 const user=await admin(request)
 if(!user)return NextResponse.json({error:'Administration required'},{status:403})
 const body=await request.json().catch(()=>({}))
 const action=String(body.action||'')
 try{
  await ensureClientFolderUpgrades()

  if(action==='prepare_employee_file_number'){
    if(body.confirmation!=='PREPARE CJ FILE NUMBER')
      return NextResponse.json({error:'Confirm PREPARE CJ FILE NUMBER'},{status:400})
    await ensureCompanyClientStaffSchema()
    if(!await ensureFneTables())throw new Error('File Number Engine is unavailable')
    const offers=await sql`SELECT id,candidate_name,candidate_email,candidate_phone,client_id,status
      FROM company_client_staff_offers WHERE file_number=${CJ_PRO_FOLDER_NUMBER} LIMIT 2`
    if(offers.length!==1||offers[0].status!=='approved'||
      offers[0].client_id||!/\bcj\s+dorado\b/i.test(String(offers[0].candidate_name||'')))
      return NextResponse.json({error:'Exactly one approved, unclaimed CJ employee offer is required before preparing the existing File Number.'},{status:409})
    const owner=await sql`SELECT id FROM users WHERE file_number=${CJ_PRO_FOLDER_NUMBER}
      OR lower(email)=lower(${offers[0].candidate_email}) LIMIT 2`
    if(owner.length)return NextResponse.json({error:'An existing Client account must be reconciled; no second employee identity or File Number was created.'},{status:409})
    const folders=await sql`SELECT file_number,client_id,status FROM file_folders
      WHERE file_number=${CJ_PRO_FOLDER_NUMBER} LIMIT 1`
    if(folders[0]&&(folders[0].client_id||folders[0].status!=='pending'))
      return NextResponse.json({error:'Existing File Number Engine record is not an unclaimed pending record; manual ownership review required.'},{status:409})
    // Unique File Number and approved private staff invitation are both necessary;
    // never publish an independent open registration claim for this employee.
    if(!folders.length){
      await sql`INSERT INTO file_folders(file_number,status,identity_data)
        VALUES(${CJ_PRO_FOLDER_NUMBER},'pending',
        ${JSON.stringify({name:offers[0].candidate_name,phone:offers[0].candidate_phone||''})}::jsonb)
        ON CONFLICT (file_number) DO NOTHING`
    }
    const folder=await ensureCjDoradoFolder()
    if(folder?.client_id)return NextResponse.json({error:'File Folder belongs to an existing Client; no replacement was created.'},{status:409})
    return NextResponse.json({success:true,fileNumber:CJ_PRO_FOLDER_NUMBER,
      status:'pending_employee_registration',
      notice:'Use only the approved private employee invitation. Registration establishes the Client identity but cannot open a session before the verified 680 USDT loan is paid.'},
      {headers})
  }
  if(action==='prepare_cj_pro'){
    if(body.confirmation!=='PREPARE CJ PRO')return NextResponse.json({error:'Confirm PREPARE CJ PRO'},{status:400})
    const clients=await sql`SELECT id,name,file_number FROM users
      WHERE file_number=${CJ_PRO_FOLDER_NUMBER} AND role='client' AND COALESCE(is_active,true)=true LIMIT 2`
    if(clients.length!==1||!/\bcj\s+dorado\b/i.test(String(clients[0].name||'')))
      return NextResponse.json({error:'CJ Dorado ownership cannot be independently confirmed in the active Client register'},{status:409})
    const [folder]=await sql`SELECT client_id,status FROM client_file_folders
      WHERE file_number=${CJ_PRO_FOLDER_NUMBER} LIMIT 1`
    if(!folder||String(folder.client_id)!==String(clients[0].id))
      return NextResponse.json({error:'Existing File Folder must be owned by this Client; no second folder will be created'},{status:409})
    const [upgrade]=await sql`
      INSERT INTO client_folder_upgrades(client_id,file_number,tier,status,loan_principal_usdt,
        construction_note,prepared_by)
      VALUES(${clients[0].id}::uuid,${CJ_PRO_FOLDER_NUMBER},'pro','construction',${CJ_EMPLOYEE_LOAN_USDT},
        'Pro File Folder world is in construction while personal-loan terms and funding are verified.',
        ${user.id}::uuid)
      ON CONFLICT(file_number) DO NOTHING
      RETURNING id,client_id,file_number,tier,status
    `
    if(!upgrade)return NextResponse.json({error:'Upgrade already exists; inspect its status instead of replacing the loan ledger'},{status:409})
    await notify(clients[0].id,'Pro File Folder · World in construction',
      'Your existing File Folder is being prepared at Pro level. A proposed 680 USDT personal loan requires accepted terms and verified funding before repayment can be due.')
    return NextResponse.json({success:true,upgrade},{status:201,headers})
  }
  if(!['revise_cj_loan','confirm_loan','verify_repayment','finish_construction'].includes(action))
    return NextResponse.json({error:'Unknown upgrade action'},{status:400})
  const connection=await getPool().connect()
  let response:any
  let notifyClient:string|null=null
  let notifyTitle=''
  let notifyMessage=''
  try{
   await connection.query('BEGIN')
   const q=await connection.query('SELECT * FROM client_folder_upgrades WHERE file_number=$1 FOR UPDATE',[CJ_PRO_FOLDER_NUMBER])
   const row=q.rows[0]
   if(!row)throw new Error('Prepare a verified CJ Pro upgrade before recording an obligation')
   if(action==='revise_cj_loan'){
     if(body.confirmation!=='SET CJ LOAN 680'||row.status!=='construction'||
       row.loan_agreed_at||row.loan_funded_at||Number(row.repayment_verified_usdt)>0)
       throw new Error('Only an unsigned, unfunded, unpaid proposal may be revised. An existing funded loan requires a separately reviewed amendment.')
     await connection.query(`UPDATE client_folder_upgrades
       SET loan_principal_usdt=$1,construction_note=$2,updated_at=now()
       WHERE id=$3`,[CJ_EMPLOYEE_LOAN_USDT,
       'Pro File Folder under construction; revised 680 USDT personal loan requires independently verified agreement and funding before repayment.',row.id])
     notifyTitle='Pro File Folder · Loan proposal revised'
     notifyMessage='The proposed personal loan is now 680 USDT. This is not an accepted or funded debt until signed terms and actual funding are verified.'
   }else if(action==='confirm_loan'){
     const agreementRef=String(body.agreementReference||'').trim()
     const fundingRef=String(body.fundingReference||'').trim()
     if(row.status!=='construction'||Number(row.loan_principal_usdt)!==CJ_EMPLOYEE_LOAN_USDT||!body.loanAccepted||!body.loanFundingChecked||
         agreementRef.length<6||fundingRef.length<6||fundingRef.length>255)
       throw new Error('Signed loan acceptance and independently verified 680 USDT loan funding are required')
     const [existing]=await Promise.all([connection.query('SELECT 1 FROM client_folder_loan_repayments WHERE reference=$1 LIMIT 1',[fundingRef])])
     if(existing.rows.length)throw new Error('Funding reference already used as a repayment')
     await connection.query(`UPDATE client_folder_upgrades
       SET loan_agreed_at=now(),loan_funded_at=now(),loan_agreement_reference=$1,
         loan_funding_reference=$2,status='repayment_required',updated_at=now()
       WHERE id=$3`,[agreementRef,fundingRef,row.id])
     notifyTitle='Pro File Folder · Remaining personal loan'
     notifyMessage='Your accepted and funded personal loan has an outstanding balance of 680.00 USDT. Account entry requires verified repayment; Pro world entry also requires construction release.'
   }else if(action==='verify_repayment'){
     const amount=Number(body.amountUSDT)
     const reference=String(body.repaymentReference||'').trim()
     const network=String(body.paymentNetwork||'').trim()
     const outstanding=Number(row.loan_principal_usdt)-Number(row.repayment_verified_usdt)
     if(!row.loan_funded_at||!row.loan_agreed_at||
        !Number.isFinite(amount)||amount<=0||Math.round(amount*100)!==amount*100||
        Math.round(amount*100)>Math.round(outstanding*100)||reference.length<6||network.length<2)
       throw new Error('Verify a real repayment reference and amount not exceeding the accepted funded loan balance')
     await connection.query(`INSERT INTO client_folder_loan_repayments
       (upgrade_id,amount_usdt,network,reference,verified_by)
       VALUES($1,$2,$3,$4,$5::uuid)`,[row.id,amount,network,reference,user.id])
     await connection.query(`UPDATE client_folder_upgrades
       SET repayment_verified_usdt=repayment_verified_usdt+$1,updated_at=now() WHERE id=$2`,[amount,row.id])
     notifyTitle='Pro File Folder · Loan repayment verified'
     notifyMessage='Administration verified a '+amount.toFixed(2)+' USDT repayment. Your world will open only after the full balance is paid and construction is approved.'
   }else{
     if(row.status!=='repayment_required'||!row.loan_agreed_at||!row.loan_funded_at||
        Number(row.repayment_verified_usdt)<Number(row.loan_principal_usdt))
       throw new Error('Construction may finish only after the accepted personal loan is fully repaid')
     if(body.confirmation!=='RELEASE PRO')
       throw new Error('Type RELEASE PRO to open the Pro File Folder')
     await connection.query(`UPDATE client_folder_upgrades
       SET status='ready',approved_by=$1::uuid,updated_at=now() WHERE id=$2`,[user.id,row.id])
     notifyTitle='Your Pro File Folder is ready'
     notifyMessage='Administration has verified repayment and completed the Pro File Folder construction gate. You may now enter your world.'
   }
   notifyClient=String(row.client_id)
   response={success:true,action,fileNumber:CJ_PRO_FOLDER_NUMBER}
   await connection.query('COMMIT')
  }catch(error){await connection.query('ROLLBACK').catch(()=>{});throw error}
  finally{connection.release()}
  if(notifyClient)await notify(notifyClient,notifyTitle,notifyMessage)
  return NextResponse.json(response,{headers})
 }catch(error:any){console.error('[admin folder upgrade]',error);return NextResponse.json({error:error?.message||'Upgrade action unavailable'},{status:409})}
}

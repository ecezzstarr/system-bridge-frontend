import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool,sql } from '@/lib/db'
import { CJ_PRO_FOLDER_NUMBER,clientUpgradePublicView,ensureClientFolderUpgrades } from '@/lib/client-folder-upgrade'
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
      VALUES(${clients[0].id}::uuid,${CJ_PRO_FOLDER_NUMBER},'pro','construction',100,
        'Pro File Folder world is in construction while personal-loan terms and funding are verified.',
        ${user.id}::uuid)
      ON CONFLICT(file_number) DO NOTHING
      RETURNING id,client_id,file_number,tier,status
    `
    if(!upgrade)return NextResponse.json({error:'Upgrade already exists; inspect its status instead of replacing the loan ledger'},{status:409})
    await notify(clients[0].id,'Pro File Folder · World in construction',
      'Your existing File Folder is being prepared at Pro level. A proposed 100 USDT personal loan requires accepted terms and verified funding before repayment can be due.')
    return NextResponse.json({success:true,upgrade},{status:201,headers})
  }
  if(!['confirm_loan','verify_repayment','finish_construction'].includes(action))
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
   if(action==='confirm_loan'){
     const agreementRef=String(body.agreementReference||'').trim()
     const fundingRef=String(body.fundingReference||'').trim()
     if(row.status!=='construction'||!body.loanAccepted||!body.loanFundingChecked||
         agreementRef.length<6||fundingRef.length<6||fundingRef.length>255)
       throw new Error('Signed loan acceptance evidence and independently checked 100 USDT loan funding are required')
     const [existing]=await Promise.all([connection.query('SELECT 1 FROM client_folder_loan_repayments WHERE reference=$1 LIMIT 1',[fundingRef])])
     if(existing.rows.length)throw new Error('Funding reference already used as a repayment')
     await connection.query(`UPDATE client_folder_upgrades
       SET loan_agreed_at=now(),loan_funded_at=now(),loan_agreement_reference=$1,
         loan_funding_reference=$2,status='repayment_required',updated_at=now()
       WHERE id=$3`,[agreementRef,fundingRef,row.id])
     notifyTitle='Pro File Folder · Remaining personal loan'
     notifyMessage='Your accepted and funded personal loan has an outstanding balance of 100.00 USDT. Your Pro File Folder remains in construction and entry stays closed until verified repayment and Administration release.'
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

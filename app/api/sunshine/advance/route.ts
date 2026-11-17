import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool,sql} from '@/lib/db'
import {getTrxPaymentNgnRate} from '@/lib/trx-payment'
import {ensureSunshineSchema} from '@/lib/sunshine-continuity'
import {
  ensureSunshineFinanceSchema,calculateSunshineSupport,
  SUNSHINE_CREDIT_RELEASE_ENABLED,SUNSHINE_PURCHASE_KINDS
} from '@/lib/sunshine-finance'
import {ensureRegionalOperationsSchema,regionalTeam} from '@/lib/regional-manager-operations'
import {notifySunshineMovement} from '@/lib/sunshine-movement-notifications'
import {getGuidanceStaffDepartments} from '@/lib/weave-guidance-departments'

export const dynamic='force-dynamic'
const noStore={'Cache-Control':'private, no-store','Vary':'Authorization'}
const reply=(data:object,status=200)=>NextResponse.json(data,{status,headers:noStore})
const fail=(error:string,status=400)=>reply({success:false,error},status)
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const maxNgn=1e12
const normalized=(x:unknown,max=160)=>String(x||'').trim().slice(0,max)

async function currentManager(userId:string,role:string):Promise<string|null>{
  if(role==='client'){
    const assigned=await getPool().query(`SELECT m.manager_id FROM weave_sunshine_manager_assignments m
      JOIN weave_regional_manager_appointments r ON r.user_id=m.manager_id AND r.status='active'
      JOIN users u ON u.id=r.user_id AND u.is_active=true AND u.role IN ('agent','bridger')
      WHERE m.user_id=$1::uuid AND m.active=true LIMIT 1`,[userId])
    return assigned.rows[0]?.manager_id||null
  }
  if(!['agent','bridger'].includes(role))return null
  await ensureRegionalOperationsSchema()
  const members=await regionalTeam(null,userId)
  return members[0]?.manager_id||null
}
async function activeRegionalManager(userId:string):Promise<boolean>{
  await ensureRegionalOperationsSchema()
  const rows=await getPool().query(`SELECT 1 FROM weave_regional_manager_appointments r
    JOIN users u ON u.id=r.user_id AND u.is_active=true AND u.role IN ('agent','bridger')
    WHERE r.user_id=$1::uuid AND r.status='active'`,[userId])
  return rows.rowCount===1
}
async function sendNotice(userId:string,title:string,description:string){
  try{
    await getPool().query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
      VALUES($1::uuid,'regional_work',$2,$3,'WEAVE · A Time',
        '/weave/lifestyles/sunshine')`,[userId,title,description.slice(0,500)])
  }catch(err){console.error('[Sunshine finance notice]',err)}
}
async function memberCase(id:string){
  const result=await getPool().query(`SELECT a.* FROM weave_sunshine_support_advances a WHERE a.id=$1::uuid`,[id])
  return result.rows[0]||null
}
function shape(r:Record<string,any>){
  return {id:r.id,status:r.status,interestPeriod:r.interest_period,
    bankProduct:r.bank_product,purchaseKind:r.purchase_kind,purchaseDetail:r.purchase_detail,
    expectedNetInterestNgn:Number(r.expected_net_interest_ngn),
    rateNgnPerSwitch:Number(r.rate_ngn_per_switch),
    bankInterestSwitch:Number(r.bank_interest_switch),
    advanceSwitch:Number(r.maximum_advance_switch),
    companyFeeSwitch:Number(r.company_fee_switch),
    totalRepaymentSwitch:Number(r.repayment_switch),
    evidenceReference:r.evidence_reference,managerId:r.manager_id,userId:r.user_id,
    termsAccepted:Boolean(r.terms_accepted_at),
    fundedAt:r.funded_at||null,repaidAt:r.repaid_at||null,
    reason:r.rejection_reason||null,createdAt:r.created_at}
}
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return fail('Sign in required',401)
  try{
    await ensureSunshineSchema()
    await ensureSunshineFinanceSchema()
    const db=getPool()
    const manager=await activeRegionalManager(user.id)
    const departments=['agent','bridger'].includes(user.role)
      ? await getGuidanceStaffDepartments(user):[]
    // Authorized guidance staff see only their own stage notifications, not
    // savings balances, bank evidence, interest values or applicant identities.
    const departmentNotices=user.role==='admin'||departments.length>0
      ?(await db.query(`SELECT type,title,content,link,created_at
          FROM notifications WHERE user_id=$1::uuid
          AND type LIKE 'sunshine_support_%'
          ORDER BY created_at DESC LIMIT 30`,[user.id])).rows
      :[]
    const rows=await db.query(`SELECT a.*,u.name AS worker_name FROM weave_sunshine_support_advances a
      JOIN users u ON u.id=a.user_id
      WHERE $1::text='admin' OR a.user_id=$2::uuid
         OR (a.manager_id=$2::uuid AND $3::boolean=true)
      ORDER BY a.created_at DESC LIMIT 50`,[user.role,user.id,manager])
    return reply({success:true,creditReleaseEnabled:SUNSHINE_CREDIT_RELEASE_ENABLED &&
      Boolean(process.env.SUNSHINE_LENDING_AUTHORIZATION_ID) &&
      Boolean(process.env.SUNSHINE_TREASURY_USER_ID),
      support:rows.rows.map(r=>({...shape(r),workerName:user.role==='admin'||manager?r.worker_name:null})),
      managerCanReview:manager,departmentNotices,departmentLabels:departments})
  }catch(error){
    console.error('[Sunshine finance GET]',error)
    return fail('Sunshine support records unavailable',503)
  }
}
export async function POST(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return fail('Sign in required',401)
 const body=await request.json().catch(()=>({}))
 const action=normalized(body.action,45)
 try{
  await ensureSunshineSchema()
  await ensureSunshineFinanceSchema()
  const db=getPool()
  if(action==='assign_client_manager'){
    if(user.role!=='admin')return fail('Administrations must authorize Client Sunshine assignments',403)
    const clientId=normalized(body.clientId,50),managerId=normalized(body.managerId,50)
    if(!uuid.test(clientId)||!uuid.test(managerId)||!await activeRegionalManager(managerId))
      return fail('Active regional manager and Client account identifiers are required',422)
    const valid=await db.query(`SELECT 1 FROM users u
      JOIN weave_sunshine_savings_plans p ON p.user_id=u.id
      WHERE u.id=$1::uuid AND u.role='client' AND u.is_active=true`,[clientId])
    if(!valid.rows.length)return fail('Client needs an active Sunshine plan before assignment',409)
    await db.query(`INSERT INTO weave_sunshine_manager_assignments(user_id,manager_id,assigned_by)
      VALUES($1::uuid,$2::uuid,$3::uuid) ON CONFLICT(user_id) DO UPDATE
      SET manager_id=EXCLUDED.manager_id,assigned_by=EXCLUDED.assigned_by,
        active=true,updated_at=now()`,[clientId,managerId,user.id])
    await sendNotice(clientId,'Sunshine · regional support assigned',
      'An authorized Regional Manager is available to assist your Sunshine work; your personal savings remain your own.')
    return reply({success:true,managerId})
  }
  if(action==='request'){
    if(!['agent','bridger','client'].includes(user.role))return fail('Weave participant required',403)
    const planResult=await db.query(`SELECT bank_product,manager_visibility FROM weave_sunshine_savings_plans
      WHERE user_id=$1::uuid`,[user.id])
    const plan=planResult.rows[0]
    if(!plan||!plan.manager_visibility)return fail('Enroll in Sunshine and enable manager visibility first',409)
    const managerId=await currentManager(user.id,user.role)
    if(!managerId)return fail('No authorized Regional Manager assigned for Sunshine support',409)
    const interest=Number(body.expectedNetInterestNgn)
    const period=normalized(body.interestPeriod,20)
    const reference=normalized(body.evidenceReference,160)
    const requestId=normalized(body.requestId,50)
    const purchaseKind=normalized(body.purchaseKind,36)
    const purchaseDetail=normalized(body.purchaseDetail,180)
    if(!SUNSHINE_PURCHASE_KINDS.includes(purchaseKind as typeof SUNSHINE_PURCHASE_KINDS[number])||
       purchaseDetail.length<4||purchaseDetail.length>160)
      return fail('Choose the Weave product and describe the purchase you need supported',422)
    if(!uuid.test(requestId)||!['daily','monthly'].includes(period)||
      !Number.isFinite(interest)||interest<=0||interest>maxNgn||
      Math.abs(Math.round(interest*100)-interest*100)>0.0001||
      reference.length<12||body.bankOwnershipConfirmed!==true)
      return fail('Provide daily/monthly net bank interest, a non-sensitive bank evidence reference and your consent',422)
    const market=await getTrxPaymentNgnRate()
    if(market.source!=='live')return fail('Live TRX/NGN price unavailable; no financial support quote can be created',503)
    const quote=calculateSunshineSupport(interest,market.rateNgnPerTrx)
    if(quote.maximumAdvanceSwitch<10)
      return fail('Calculated maximum support is below 10 System Switch',422)
    const created=await db.query(`INSERT INTO weave_sunshine_support_advances
      (request_id,user_id,manager_id,bank_product,interest_period,expected_net_interest_ngn,
       rate_ngn_per_switch,bank_interest_switch,maximum_advance_switch,company_fee_switch,
       repayment_switch,evidence_reference,purchase_kind,purchase_detail)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT(request_id) DO NOTHING RETURNING *`,
      [requestId,user.id,managerId,plan.bank_product,period,interest,
       quote.rateNgnPerSystemSwitch,quote.bankInterestSwitch,
       quote.maximumAdvanceSwitch,quote.companyInterestShareSwitch,
       quote.repaymentSwitch,reference,purchaseKind,purchaseDetail])
    if(!created.rows.length){
      const existing=await db.query('SELECT * FROM weave_sunshine_support_advances WHERE request_id=$1::uuid AND user_id=$2::uuid',[requestId,user.id])
      if(!existing.rows.length)return fail('Request ID already belongs to a different user',409)
      return reply({success:true,alreadyRequested:true,support:shape(existing.rows[0])})
    }
    await notifySunshineMovement('requested',String(created.rows[0].id))
    return reply({success:true,support:shape(created.rows[0]),notice:'Request recorded; no funds advanced'},201)
  }
  const id=normalized(body.id,50)
  if(!uuid.test(id))return fail('Choose a valid Sunshine support request',422)
  const item=await memberCase(id)
  if(!item)return fail('Sunshine request not found',404)
  const own=String(item.user_id)===user.id
  const admin=user.role==='admin'
  const manager=String(item.manager_id)===user.id&&await activeRegionalManager(user.id)
  if(!own&&!admin&&!manager)return fail('Not authorized to view or change this request',403)
  if(action==='verify_interest'){
    if(!admin)return fail('Only Administrations may independently verify the bank interest',403)
    if(item.status!=='requested')return fail('Only new requests can be verified',409)
    const evidence=normalized(body.verificationReference,180)
    if(body.independentBankVerification!==true||evidence.length<12||
      Number(body.verifiedNetInterestNgn)!==Number(item.expected_net_interest_ngn))
      return fail('Administrations must independently confirm the stated net bank interest and evidence reference',422)
    const result=await db.query(`UPDATE weave_sunshine_support_advances
      SET status='interest_verified',interest_verified_by=$2::uuid,verification_reference=$3,
        updated_at=now()
      WHERE id=$1::uuid AND status='requested' RETURNING *`,[id,user.id,evidence])
    if(!result.rows.length)return fail('Request changed',409)
    await notifySunshineMovement('interest_verified',id)
    return reply({success:true,support:shape(result.rows[0])})
  }
  if(action==='accept_terms'){
    if(!own||item.status!=='interest_verified')return fail('Verified terms available only to the borrower',409)
    if(body.acceptFullRepayment!==true||body.acceptCompanyInterestShare!==true||
       body.confirmNoBankAccess!==true)return fail('Explicit informed consent is required',422)
    const result=await db.query(`UPDATE weave_sunshine_support_advances
      SET status='terms_accepted',terms_accepted_at=now(),updated_at=now()
      WHERE id=$1::uuid AND status='interest_verified' RETURNING *`,[id])
    if(!result.rows.length)return fail('Support state changed',409)
    await notifySunshineMovement('terms_accepted',id)
    return reply({success:true,support:shape(result.rows[0])})
  }
  if(action==='reject'){
    if(!manager&&!admin)return fail('Manager or Administrations required',403)
    if(!['requested','interest_verified','terms_accepted'].includes(item.status))return fail('This request cannot be rejected after funding',409)
    const why=normalized(body.reason,700)
    if(why.length<12)return fail('Provide a specific reason',422)
    const result=await db.query(`UPDATE weave_sunshine_support_advances
      SET status='rejected',rejected_by=$2::uuid,rejection_reason=$3,updated_at=now()
      WHERE id=$1::uuid AND status IN ('requested','interest_verified','terms_accepted')
      RETURNING *`,[id,user.id,why])
    if(!result.rows.length)return fail('Support state changed',409)
    await notifySunshineMovement('rejected',id)
    return reply({success:true,support:shape(result.rows[0])})
  }
  if(action==='fund'){
    if(!manager)return fail('Assigned authorized Regional Manager required',403)
    if(!SUNSHINE_CREDIT_RELEASE_ENABLED||!process.env.SUNSHINE_LENDING_AUTHORIZATION_ID)
      return fail('Sunshine lending is disabled until licensing, agreements and release approval are complete',403)
    if(!process.env.SUNSHINE_TREASURY_USER_ID||!uuid.test(process.env.SUNSHINE_TREASURY_USER_ID))
      return fail('Company treasury wallet is not configured for audited repayment',503)
    if(item.status!=='terms_accepted'||!item.interest_verified_by||!item.terms_accepted_at)
      return fail('Independent verification and borrower consent required',409)
    const ownManager=await currentManager(String(item.user_id),
      String((await db.query('SELECT role FROM users WHERE id=$1::uuid',[item.user_id])).rows[0]?.role||''))
    if(ownManager!==user.id)return fail('Regional Manager assignment changed; funding prohibited',403)
    const treasury=await db.query(`SELECT u.id FROM users u JOIN wallets w ON w.user_id=u.id AND w.is_primary=true
      WHERE u.id=$1::uuid AND u.role='admin' AND u.is_active=true`,[process.env.SUNSHINE_TREASURY_USER_ID])
    if(!treasury.rows.length)return fail('Independent approved company treasury unavailable',503)
    const tx=await db.connect()
    try{
      await tx.query('BEGIN')
      const locked=await tx.query("SELECT * FROM weave_sunshine_support_advances WHERE id=$1::uuid AND status='terms_accepted' FOR UPDATE",[id])
      if(!locked.rows.length)throw new Error('Support already funded or terms changed')
      const advance=Number(locked.rows[0].maximum_advance_switch)
      const wallets=await tx.query(`SELECT id,user_id,balance_trx FROM wallets
        WHERE user_id=ANY($1::uuid[]) AND is_primary=true ORDER BY user_id FOR UPDATE`,
        [[user.id,item.user_id]])
      const funder=wallets.rows.find(w=>String(w.user_id)===user.id)
      const borrower=wallets.rows.find(w=>String(w.user_id)===String(item.user_id))
      if(!funder||!borrower||funder.id===borrower.id||wallets.rows.length!==2)
        throw new Error('Exactly one primary wallet is required for each party')
      const pending=await tx.query(`SELECT COALESCE(SUM(amount_trx),0)::numeric AS reserved
        FROM withdrawal_requests WHERE user_id=$1::uuid AND status IN ('pending','approved')`,[user.id])
      if(Number(funder.balance_trx)-Number(pending.rows[0]?.reserved||0)<advance)
        throw new Error('Manager funded wallet lacks available System Switch')
      await tx.query('UPDATE wallets SET balance_trx=balance_trx-$2,updated_at=now() WHERE id=$1::uuid',[funder.id,advance])
      await tx.query('UPDATE wallets SET balance_trx=balance_trx+$2,updated_at=now() WHERE id=$1::uuid',[borrower.id,advance])
      await tx.query(`INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,
        balance_before,balance_after,metadata)
        VALUES($1::uuid,'debit',$2,'Flame Coin','Sunshine backed support funding',$3,$4,$5::jsonb)`,
        [user.id,advance,Number(funder.balance_trx),Number(funder.balance_trx)-advance,
          JSON.stringify({commerce_type:'sunshine_advance',advance_id:id,role:'funder'})])
      await tx.query(`INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,
        balance_before,balance_after,metadata)
        VALUES($1::uuid,'transfer',$2,'Flame Coin','Sunshine repayable credit (not earnings)',$3,$4,$5::jsonb)`,
        [item.user_id,advance,Number(borrower.balance_trx),Number(borrower.balance_trx)+advance,
          JSON.stringify({commerce_type:'sunshine_advance',advance_id:id,role:'borrower',repayable:true})])
      await tx.query(`UPDATE weave_sunshine_support_advances
        SET status='funded',funded_by=$2::uuid,funded_at=now(),updated_at=now()
        WHERE id=$1::uuid AND status='terms_accepted'`,[id,user.id])
      await tx.query('COMMIT')
    }catch(error){
      await tx.query('ROLLBACK').catch(()=>{})
      return fail(error instanceof Error?error.message:'Funding failed',409)
    }finally{tx.release()}
    await notifySunshineMovement('funded',id)
    return reply({success:true,status:'funded',supportAmountSwitch:Number(item.maximum_advance_switch)})
  }
  if(action==='confirm_interest_received'){
    if(!admin)return fail('Administrations must independently verify the actual bank interest',403)
    if(item.status!=='funded')return fail('Only funded support can be confirmed after interest receipt',409)
    const reference=normalized(body.settlementReference,180)
    if(body.verifiedBankCredit!==true||reference.length<12||
       Number(body.receivedNetInterestNgn)!==Number(item.expected_net_interest_ngn))
      return fail('Confirm actual credited net interest and independent evidence. Differing payouts require manual adjustment, not automatic collection',422)
    const updated=await db.query(`UPDATE weave_sunshine_support_advances
      SET status='interest_received',settlement_verified_by=$2::uuid,settlement_reference=$3,updated_at=now()
      WHERE id=$1::uuid AND status='funded' RETURNING *`,[id,user.id,reference])
    if(!updated.rows.length)return fail('Support state changed',409)
    await notifySunshineMovement('interest_received',id)
    return reply({success:true,support:shape(updated.rows[0])})
  }
  if(action==='repay'){
    if(!own)return fail('Only the borrower can authorize repayment',403)
    if(item.status!=='interest_received'||!item.settlement_verified_by)
      return fail('The bank interest must be independently confirmed before repayment',409)
    if(body.authorizeRepayment!==true)return fail('Explicit authorization of the full principal and company share is required',422)
    const treasuryId=process.env.SUNSHINE_TREASURY_USER_ID
    if(!treasuryId||!uuid.test(treasuryId)||treasuryId===user.id||treasuryId===item.manager_id)
      return fail('Independent company treasury is not configured',503)
    const managerId=String(item.funded_by||'')
    const tx=await db.connect()
    try{
      await tx.query('BEGIN')
      const locked=await tx.query("SELECT * FROM weave_sunshine_support_advances WHERE id=$1::uuid AND status='interest_received' FOR UPDATE",[id])
      if(!locked.rows.length)throw new Error('Repayment already recorded or approval changed')
      const [validTreasury]= (await tx.query(`SELECT u.id FROM users u
        WHERE u.id=$1::uuid AND u.role='admin' AND u.is_active=true`,[treasuryId])).rows
      if(!validTreasury||!uuid.test(managerId))throw new Error('Valid funder and independent treasury required')
      const people=[user.id,managerId,treasuryId]
      if(new Set(people).size!==3)throw new Error('Borrower, original funder and company treasury must be distinct')
      const wallets=await tx.query(`SELECT id,user_id,balance_trx FROM wallets
        WHERE user_id=ANY($1::uuid[]) AND is_primary=true ORDER BY user_id FOR UPDATE`,[people])
      const find=(id:string)=>wallets.rows.find(w=>String(w.user_id)===id)
      const from=find(user.id),funder=find(managerId),treasury=find(treasuryId)
      if(!from||!funder||!treasury||wallets.rows.length!==3)
        throw new Error('Exactly one primary wallet is required for borrower, funder and treasury')
      const principal=Number(locked.rows[0].maximum_advance_switch)
      const companyFee=Number(locked.rows[0].company_fee_switch)
      const due=Math.round((principal+companyFee)*1e6)/1e6
      const reserved=await tx.query(`SELECT COALESCE(SUM(amount_trx),0)::numeric AS reserved FROM withdrawal_requests
        WHERE user_id=$1::uuid AND status IN ('pending','approved')`,[user.id])
      if(Number(from.balance_trx)-Number(reserved.rows[0]?.reserved||0)<due)
        throw new Error('Available System Switch is insufficient for consented repayment')
      for(const [wallet,delta] of [[from,-due],[funder,principal],[treasury,companyFee]] as const){
        if(delta!==0)await tx.query('UPDATE wallets SET balance_trx=balance_trx+$2,updated_at=now() WHERE id=$1::uuid',[wallet.id,delta])
      }
      for(const [who,amount,description,kind,before] of [
        [user.id,due,'Sunshine principal plus agreed company return','borrower_repayment',Number(from.balance_trx)],
        [managerId,principal,'Sunshine original funded principal returned','funder_recovery',Number(funder.balance_trx)],
        [treasuryId,companyFee,'Sunshine interest-based company service revenue','company_revenue',Number(treasury.balance_trx)]
      ] as const){
        if(amount===0)continue
        await tx.query(`INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,
          balance_before,balance_after,metadata) VALUES($1::uuid,$2,$3,'Flame Coin',$4,$5,$6,$7::jsonb)`,
          [who,kind==='company_revenue'?'earning':'transfer',amount,description,
          before,before+(kind==='borrower_repayment'?-amount:amount),
          JSON.stringify({commerce_type:'sunshine_support_settlement',advance_id:id,kind})])
      }
      await tx.query(`UPDATE weave_sunshine_support_advances
        SET status='repaid',repaid_at=now(),updated_at=now() WHERE id=$1::uuid
        AND status='interest_received'`,[id])
      await tx.query('COMMIT')
    }catch(error){
      await tx.query('ROLLBACK').catch(()=>{})
      return fail(error instanceof Error?error.message:'Repayment failed',409)
    }finally{tx.release()}
    await notifySunshineMovement('repaid',id)
    return reply({success:true,status:'repaid',principalReturnedSwitch:Number(item.maximum_advance_switch),
      companyIncomeSwitch:Number(item.company_fee_switch)})
  }
  return fail('Unsupported Sunshine credit operation',400)
 }catch(error){
  console.error('[Sunshine credit]',error)
  if((error as {code?:string}).code==='23505')return fail('One pending or funded Sunshine advance per user; settle or close the existing request',409)
  return fail('Sunshine finance action could not be completed',503)
 }
}

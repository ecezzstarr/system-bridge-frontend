import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {eligibleManagers,ensureCompanySupportSchema,listSupportCases,managerAssignedTo,managerKinds,notifySupport,readSupportMessages,uuid} from '@/lib/company-support'
export const dynamic='force-dynamic'
const ok=(data:object,status=200)=>NextResponse.json({success:true,...data},{status,headers:{'Cache-Control':'private, no-store'}})
const fail=(error:string,status=400)=>NextResponse.json({success:false,error},{status,headers:{'Cache-Control':'private, no-store'}})
const limitText=(x:unknown,n:number)=>String(x||'').trim().slice(0,n)

export async function GET(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return fail('Sign in required',401)
 if(!['agent','bridger','admin'].includes(user.role))return fail('Authorized company account required',403)
 try{
  await ensureCompanySupportSchema()
  const id=request.nextUrl.searchParams.get('caseId')
  if(id)return ok(await readSupportMessages(user,id))
  const cases=await listSupportCases(user)
  const managers=user.role==='admin'?[]:await eligibleManagers(user.id)
  const kinds=user.role==='admin'?[]:await managerKinds(user.id)
  const db=getPool()
  const team:{id:string;name:string;role:string}[]=kinds.length?(await db.query(`SELECT a.worker_id AS id,u.name,u.role FROM weave_company_support_assignments a
   JOIN users u ON u.id=a.worker_id WHERE a.manager_id=$1::uuid AND a.active=true AND u.is_active=true
   ORDER BY u.name LIMIT 150`,[user.id])).rows:[]
  if(kinds.length){
   const relations=await db.query("SELECT to_regclass('weave_regional_manager_bridgers') AS bridgers,to_regclass('weave_regional_manager_distribution_managers') AS leads,to_regclass('weave_regional_manager_agents') AS agents,to_regclass('weave_regional_manager_food_distribution_leads') AS food_leads,to_regclass('weave_distribution_assistants') AS assistants,to_regclass('weave_food_distribution_employment') AS food")
   const t=relations.rows[0]||{}
   const queries:string[]=[]
   if(kinds.includes('regional')){
    if(t.bridgers)queries.push("SELECT u.id,u.name,u.role FROM weave_regional_manager_bridgers a JOIN users u ON u.id=a.bridger_user_id WHERE a.regional_manager_user_id=$1::uuid AND a.status='active' AND u.is_active=true")
    if(t.agents)queries.push("SELECT u.id,u.name,u.role FROM weave_regional_manager_agents a JOIN users u ON u.id=a.agent_user_id AND u.role='agent' AND u.is_active=true WHERE a.regional_manager_user_id=$1::uuid AND a.status='active'")
    if(t.food_leads&&t.food)queries.push("SELECT u.id,u.name,u.role FROM weave_regional_manager_food_distribution_leads f JOIN weave_food_distribution_employment e ON e.user_id=f.food_manager_user_id AND e.position='manager' AND e.status='approved' JOIN users u ON u.id=e.user_id AND u.is_active=true AND u.role='agent' WHERE f.regional_manager_user_id=$1::uuid AND f.status='active'")
    if(t.food_leads&&t.food)queries.push("SELECT u.id,u.name,u.role FROM weave_regional_manager_food_distribution_leads f JOIN weave_food_distribution_employment lead ON lead.user_id=f.food_manager_user_id AND lead.position='manager' AND lead.status='approved' JOIN weave_food_distribution_employment a ON a.manager_user_id=f.food_manager_user_id AND a.position='assistant' AND a.status='approved' JOIN users u ON u.id=a.user_id AND u.is_active=true AND u.role='agent' WHERE f.regional_manager_user_id=$1::uuid AND f.status='active'")
    if(t.leads)queries.push("SELECT u.id,u.name,u.role FROM weave_regional_manager_distribution_managers a JOIN users u ON u.id=a.distribution_manager_user_id WHERE a.regional_manager_user_id=$1::uuid AND a.status='active' AND u.is_active=true")
    if(t.leads&&t.assistants)queries.push("SELECT u.id,u.name,u.role FROM weave_regional_manager_distribution_managers r JOIN weave_distribution_assistants a ON a.manager_user_id=r.distribution_manager_user_id JOIN users u ON u.id=a.user_id WHERE r.regional_manager_user_id=$1::uuid AND r.status='active' AND a.status='approved' AND u.is_active=true")
   }
   if(kinds.includes('distribution_lead')&&t.assistants)queries.push("SELECT u.id,u.name,u.role FROM weave_distribution_assistants a JOIN users u ON u.id=a.user_id WHERE a.manager_user_id=$1::uuid AND a.status='approved' AND u.is_active=true")
   if(kinds.includes('food_distribution_lead')&&t.food)queries.push("SELECT u.id,u.name,u.role FROM weave_food_distribution_employment a JOIN users u ON u.id=a.user_id WHERE a.manager_user_id=$1::uuid AND a.position='assistant' AND a.status='approved' AND u.is_active=true")
   for(const q of queries){const r=await db.query(q,[user.id]);for(const row of r.rows)if(!team.some(t=>t.id===row.id))team.push(row)}
  }
  let candidates:unknown[]=[]
  if(user.role==='admin'){
   const name=limitText(request.nextUrl.searchParams.get('search'),80)
   if(name.length>=2){
    const list=await db.query("SELECT id,name,role FROM users WHERE is_active=true AND role IN ('agent','bridger') AND (name ILIKE $1 OR username ILIKE $1) ORDER BY name LIMIT 30",['%'+name+'%'])
    candidates=await Promise.all(list.rows.map(async row=>({...row,managerKinds:await managerKinds(row.id)})))
   }
  }
  return ok({cases,managers,kinds,team,candidates})
 }catch(e){console.error('[company-support] GET',e);return fail('Support workspace unavailable',503)}
}

export async function POST(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return fail('Sign in required',401)
 if(!['agent','bridger','admin'].includes(user.role))return fail('Authorized company account required',403)
 const body=await request.json().catch(()=>null)
 if(!body||typeof body!=='object')return fail('Invalid request')
 const action=limitText(body.action,48)
 const db=getPool()
 try{
  await ensureCompanySupportSchema()
  if(action==='assign'){
   if(user.role!=='admin')return fail('Administrations approval required',403)
   const workerId=limitText(body.workerId,50),managerId=limitText(body.managerId,50)
   if(!uuid(workerId)||!uuid(managerId)||workerId===managerId)return fail('Select distinct valid worker and manager accounts')
   const [worker,manager]=await Promise.all([
    db.query("SELECT role FROM users WHERE id=$1::uuid AND is_active=true",[workerId]),
    db.query("SELECT role FROM users WHERE id=$1::uuid AND is_active=true",[managerId])
   ])
   if(!['agent','bridger'].includes(worker.rows[0]?.role)||!manager.rows.length||!(await managerKinds(managerId)).length)
    return fail('An active Agent/Bridger and approved company manager are required',422)
   const active=body.active!==false
   await db.query(`INSERT INTO weave_company_support_assignments(worker_id,manager_id,assigned_by,active)
    VALUES($1::uuid,$2::uuid,$3::uuid,$4)
    ON CONFLICT(worker_id,manager_id) DO UPDATE SET active=EXCLUDED.active,assigned_by=EXCLUDED.assigned_by,updated_at=now()`,
    [workerId,managerId,user.id,active])
   if(active)await notifySupport(workerId,'Your company support manager is available','Open your Lifestyle support workspace to ask for help with a real task.')
   return ok({assignment:{workerId,managerId,active}})
  }
  if(action==='start_case'){
   if(user.role==='admin'||!(await managerKinds(user.id)).length)return fail('Verified manager appointment required',403)
   const workerId=limitText(body.workerId,50),description=limitText(body.description,1800),taskReference=limitText(body.taskReference,200)
   const purpose=limitText(body.purpose||'guidance',24),amount=Number(body.amount||0)
   if(!uuid(workerId)||description.length<15||!(await managerAssignedTo(workerId,user.id)))
    return fail('Choose an assigned employee and describe the obstacle',403)
   const who=await db.query("SELECT role FROM users WHERE id=$1::uuid AND is_active=true",[workerId])
   const workerRole=String(who.rows[0]?.role||'')
   if(!['guidance','system_switch','food_stock'].includes(purpose)||
     (purpose==='food_stock'&&workerRole!=='agent')||
     (purpose==='system_switch'&&workerRole!=='bridger')||
     !Number.isFinite(amount)||(purpose==='guidance'&&amount!==0)||
     (purpose!=='guidance'&&(amount<=0||amount>1000000)))
    return fail('Choose guidance, Bridger prospect-work System Switch, or Agent food-stock support with a valid amount',422)
   const created=await db.query(`INSERT INTO weave_company_support_cases(worker_id,manager_id,purpose,description,task_reference,requested_amount)
     VALUES($1::uuid,$2::uuid,$3,$4,$5,$6) RETURNING *`,
     [workerId,user.id,purpose,description,taskReference||null,amount])
   const item=created.rows[0]
   await db.query('INSERT INTO weave_company_support_messages(case_id,author_id,message) VALUES($1::uuid,$2::uuid,$3)',[item.id,user.id,description])
   await notifySupport(workerId,'Your manager opened a private work conversation','Open Company Support to discuss your task, obstacles or work progress.')
   return ok({case:item},201)
  }
  if(action==='create'){
   if(!['agent','bridger'].includes(user.role))return fail('Active Agent or Bridger required',403)
   const managerId=limitText(body.managerId,50),purpose=limitText(body.purpose,24)
   const description=limitText(body.description,1800),taskReference=limitText(body.taskReference,200)
   const amount=Number(body.amount||0)
   if(!uuid(managerId)||!(await managerAssignedTo(user.id,managerId)))return fail('Choose your assigned active manager',403)
   if(!['guidance','system_switch','food_stock'].includes(purpose)||description.length<15)return fail('Describe the obstacle and support type')
   if((purpose==='system_switch'&&user.role!=='bridger')||(purpose==='food_stock'&&user.role!=='agent'))
     return fail('System Switch advance is for assigned Bridger Prospect work; NGN food-stock support is for verified Agents. Other services require guidance until a restricted funding workflow is approved.',422)
   if(!Number.isFinite(amount)||amount<0||(purpose==='guidance'&&amount!==0)
     ||(purpose!=='guidance'&&(amount<=0||amount>1000000)))return fail('Enter a valid amount for the requested support')
   const created=await db.query(`INSERT INTO weave_company_support_cases(worker_id,manager_id,purpose,description,task_reference,requested_amount)
    VALUES($1::uuid,$2::uuid,$3,$4,$5,$6) RETURNING *`,
    [user.id,managerId,purpose,description,taskReference||null,amount])
   const item=created.rows[0]
   await db.query('INSERT INTO weave_company_support_messages(case_id,author_id,message) VALUES($1::uuid,$2::uuid,$3)',[item.id,user.id,description])
   await notifySupport(managerId,'Employee requests work support','A worker needs guidance or a funded work advance. Open Company Support to review the task.')
   return ok({case:item},201)
  }
  const caseId=limitText(body.caseId,50)
  if(!uuid(caseId))return fail('Choose a valid support case')
  const c=await db.query('SELECT * FROM weave_company_support_cases WHERE id=$1::uuid',[caseId])
  const item=c.rows[0]
  if(!item)return fail('Support case not found',404)
  const worker=user.id===item.worker_id,manager=user.id===item.manager_id && (await managerKinds(user.id)).length>0 && await managerAssignedTo(String(item.worker_id),user.id)
  const admin=user.role==='admin'
  if(!worker&&!manager&&!admin)return fail('Case belongs to another employee or manager',403)
  if(action==='message'){
   const message=limitText(body.message,2500)
   if(message.length<2)return fail('Write a message')
   await db.query('INSERT INTO weave_company_support_messages(case_id,author_id,message) VALUES($1::uuid,$2::uuid,$3)',[caseId,user.id,message])
   await db.query('UPDATE weave_company_support_cases SET updated_at=now() WHERE id=$1::uuid',[caseId])
   await notifySupport(worker?item.manager_id:item.worker_id,'Company work support reply',message)
   return ok({sent:true})
  }
  if(action==='offer'){
   if(!manager&&!admin)return fail('Assigned manager required',403)
   if(item.status!=='open')return fail('Only open cases can be offered support',409)
   const amount=Number(body.amount||0),terms=limitText(body.terms,1600)
   const recoveryDisclosure=item.purpose==='system_switch'
     ?'INTERNAL SYSTEM SWITCH CREDIT: The agreed amount is reserved from the funder wallet for eligible Prospect Market purchases only. Unused reserves can be returned to the funder. On verified use, the worker owes only the amount actually spent. Up to the full amount of each future eligible platform commission or referral earning may automatically repay the outstanding used principal, until paid. No interest; no unrelated wallet deposits, salary, external customer receipts or third-party funds are collected.'
     :item.purpose==='food_stock'
       ?'REAL NGN STOCK SUPPORT: A support offer is not proof of funding. Administrations must independently verify actual supplier funding before any stock advance is active. Platform wallet earnings are not converted or seized for NGN repayment. Repayments require separately verified real-world money received, with an auditable reference. No automatic access to external bank accounts or customer cash.'
       :'Guidance only: No money is advanced or repayable.'
   const writtenTerms=recoveryDisclosure+'\\n\\nManager work terms: '+(terms||'No additional financial terms.')
   if(item.purpose!=='guidance'&&(!Number.isFinite(amount)||amount<=0||amount>1000000||terms.length<40))
    return fail('Specify a positive amount and clear written repayment terms (40 characters minimum)')
   const offered=await db.query(`UPDATE weave_company_support_cases
    SET status='offered',offered_amount=$2,terms=$3,offered_by=$4::uuid,offered_at=now(),updated_at=now()
    WHERE id=$1::uuid AND status='open' RETURNING *`,[caseId,item.purpose==='guidance'?null:amount,writtenTerms,user.id])
   if(!offered.rows.length)return fail('Case changed before approval',409)
   await notifySupport(item.worker_id,'Manager support offer','Review and accept or decline the terms in Company Support. No financial advance has been issued.')
   return ok({case:offered.rows[0]})
  }
  if(action==='accept'||action==='decline'){
   if(!worker)return fail('Only the supported worker can accept or decline terms',403)
   if(item.status!=='offered')return fail('No outstanding offer to accept',409)
   if(action==='accept'&&item.purpose!=='guidance'&&body.consentToRecovery!==true)return fail('Explicit agreement to the stated repayment and verification terms is required',422)
   const status=action==='accept'?'accepted':'declined'
   const changed=await db.query(`UPDATE weave_company_support_cases
    SET status=$2,accepted_at=CASE WHEN $2='accepted' THEN now() ELSE null END,updated_at=now()
    WHERE id=$1::uuid AND status='offered' RETURNING *`,[caseId,status])
   if(!changed.rows.length)return fail('Offer has changed',409)
   await notifySupport(item.manager_id,'Worker responded to support terms',status==='accepted'?'The worker accepted the written terms. Funding is not yet completed.':'The worker declined the offer.')
   return ok({case:changed.rows[0]})
  }
  if(action==='fund'){
   if(!manager&&!admin)return fail('Only the approved manager or Administrations can provide verified funding',403)
   if(item.purpose!=='system_switch')return fail('Only System Switch ledger credits can be funded by wallet transfer. Stock needs independently verified real-world funding.',422)
   const conn=await db.connect()
   try{
    await conn.query('BEGIN')
    const locked=await conn.query('SELECT * FROM weave_company_support_cases WHERE id=$1::uuid FOR UPDATE',[caseId])
    const current=locked.rows[0]
    if(current?.status!=='accepted'||!current.accepted_at)throw new Error('The worker must accept the offer before funding')
    const amount=Number(current.offered_amount)
    if(amount<=0)throw new Error('Invalid agreed principal')
    // The funder pays from their existing, funded System Switch wallet.
    // Nobody may mint platform credits or debit a third party.
    const wallets=await conn.query(`SELECT id,user_id,balance_trx FROM wallets
      WHERE user_id=ANY($1::uuid[]) AND is_primary=true ORDER BY user_id FOR UPDATE`,[[user.id,current.worker_id]])
    const funder=wallets.rows.find(w=>String(w.user_id)===user.id)
    if(!funder||Number(funder.balance_trx)<amount)throw new Error('Funding wallet is missing or has insufficient verified balance')
    const reference='company-support:'+caseId
    await conn.query('UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=now() WHERE id=$2::uuid',[amount,funder.id])
    await conn.query(`INSERT INTO weave_company_support_advances(case_id,worker_id,funder_id,currency,principal,funding_reference,verified_by)
      VALUES($1::uuid,$2::uuid,$3::uuid,'SYSTEM_SWITCH',$4,$5,$3::uuid)`,[caseId,current.worker_id,user.id,amount,reference])
    await conn.query(`INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
      VALUES($1::uuid,'debit',$2,'System Switch',$3,$4,$5,$6::jsonb,now())`,
      [user.id,amount,'Funded restricted prospect-work support reserve',Number(funder.balance_trx),Number(funder.balance_trx)-amount,
       JSON.stringify({commerce_type:'company_support_reserve',case_id:caseId,reference})])
    await conn.query("UPDATE weave_company_support_cases SET status='funded',funded_at=now(),funding_reference=$2,updated_at=now() WHERE id=$1::uuid",[caseId,reference])
    await conn.query('COMMIT')
    await notifySupport(current.worker_id,'Restricted work credit funded','Your manager funded a restricted System Switch reserve for eligible prospect purchases. Repayment begins only when support is used.')
    return ok({funded:true,amount,reference})
   }catch(e){await conn.query('ROLLBACK').catch(()=>{});return fail(e instanceof Error?e.message:'Funding failed',409)}
   finally{conn.release()}
  }
  if(action==='record_stock_funding'){
   if(!admin)return fail('Independent Administrations verification required for real-money stock assistance',403)
   if(item.status!=='accepted'||item.purpose!=='food_stock')return fail('Only accepted stock support can be recorded as funded',409)
   const reference=limitText(body.reference,180)
   const funderId=limitText(body.funderId,50)||String(item.manager_id)
   if(!uuid(funderId)||!([String(item.manager_id),user.id].includes(funderId)))
    return fail('The funder must be the assigned manager or Administrations',422)
   if(reference.length<12||body.confirmedVerified!==true)return fail('Administrations must independently verify the supplier payment and explicitly confirm the evidence before recording funding')
   const conn=await db.connect()
   try{
    await conn.query('BEGIN')
    const locked=await conn.query("SELECT * FROM weave_company_support_cases WHERE id=$1::uuid AND status='accepted' FOR UPDATE",[caseId])
    if(!locked.rows.length)throw new Error('Case was already funded or changed')
    await conn.query(`INSERT INTO weave_company_support_advances(case_id,worker_id,funder_id,currency,principal,spent,funding_reference,verified_by)
     VALUES($1::uuid,$2::uuid,$3::uuid,'NGN',$4,$4,$5,$6::uuid)`,
     [caseId,item.worker_id,funderId,item.offered_amount,reference,user.id])
    await conn.query("UPDATE weave_company_support_cases SET status='funded',funding_reference=$2,funded_at=now(),updated_at=now() WHERE id=$1::uuid",[caseId,reference])
    await conn.query('COMMIT')
    await notifySupport(item.worker_id,'Stock support verified','Administrations recorded verified stock funding. Repayments require actual verified naira settlements.')
    return ok({funded:true,reference})
   }catch(e){await conn.query('ROLLBACK').catch(()=>{});return fail(e instanceof Error?e.message:'Stock verification failed',409)}
   finally{conn.release()}
  }
  if(action==='record_stock_repayment'){
   if(!admin)return fail('Administrations must verify actual naira repayments',403)
   const amount=Number(body.amount),reference=limitText(body.reference,180)
   if(!Number.isFinite(amount)||amount<=0||reference.length<12||body.confirmedVerified!==true)return fail('Confirm the actual received repayment in Administrations records and supply its unique evidence reference')
   const conn=await db.connect()
   try{
    await conn.query('BEGIN')
    const a=await conn.query("SELECT * FROM weave_company_support_advances WHERE case_id=$1::uuid AND currency='NGN' FOR UPDATE",[caseId])
    const advance=a.rows[0]
    if(!advance||advance.status==='repaid'||amount>Number(advance.principal)-Number(advance.repaid))throw new Error('Repayment exceeds outstanding balance or advance not found')
    await conn.query('INSERT INTO weave_company_support_recoveries(advance_id,earning_source,amount,recorded_by) VALUES($1::uuid,$2,$3,$4::uuid)',[advance.id,'NGN:'+reference,amount,user.id])
    await conn.query("UPDATE weave_company_support_advances SET repaid=repaid+$2,status=CASE WHEN repaid+$2>=principal THEN 'repaid' ELSE 'active' END,updated_at=now() WHERE id=$1::uuid",[advance.id,amount])
    await conn.query('COMMIT')
    await notifySupport(item.worker_id,'Stock advance repayment verified','A real-world repayment has been recorded against your work support balance.')
    return ok({repaid:amount})
   }catch(e){await conn.query('ROLLBACK').catch(()=>{});return fail(e instanceof Error?e.message:'Repayment verification failed',409)}
   finally{conn.release()}
  }
  if(action==='refund_unused'){
   if(!manager&&!admin)return fail('Only the assigned manager or Administrations can release unused support',403)
   const conn=await db.connect()
   try{
    await conn.query('BEGIN')
    const rec=await conn.query("SELECT * FROM weave_company_support_advances WHERE case_id=$1::uuid AND currency='SYSTEM_SWITCH' AND status='active' FOR UPDATE",[caseId])
    const a=rec.rows[0]
    if(!a)throw new Error('There is no funded System Switch reserve to release')
    if(!admin&&String(a.funder_id)!==user.id)throw new Error('Only the original funder or Administrations can return this reserve')
    const unused=Number(a.principal)-Number(a.spent)-Number(a.refunded)
    if(unused<=0)throw new Error('No unused reserved credit remains')
    const w=await conn.query("SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE",[a.funder_id])
    if(!w.rows[0])throw new Error('Original funding wallet is unavailable')
    const before=Number(w.rows[0].balance_trx)
    await conn.query('UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=now() WHERE id=$2::uuid',[unused,w.rows[0].id])
    await conn.query(`INSERT INTO ledger_entries(user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at)
     VALUES($1::uuid,'earning',$2,'System Switch','Unused company work reserve returned',$3,$4,$5::jsonb,now())`,
     [a.funder_id,unused,before,before+unused,JSON.stringify({commerce_type:'company_support_refund',advance_id:a.id,case_id:caseId})])
    await conn.query("UPDATE weave_company_support_advances SET refunded=refunded+$2,status=CASE WHEN repaid>=spent THEN 'repaid' ELSE 'active' END,updated_at=now() WHERE id=$1::uuid",[a.id,unused])
    await conn.query('COMMIT')
    await notifySupport(item.worker_id,'Unused support returned','Unspent reserved support was returned to its original funder. Used support remains repayable under the agreed terms.')
    return ok({refunded:unused})
   }catch(e){await conn.query('ROLLBACK').catch(()=>{});return fail(e instanceof Error?e.message:'Refund failed',409)}
   finally{conn.release()}
  }
  if(action==='resolve'){
   if(!worker&&!manager&&!admin)return fail('Unauthorized',403)
   const a=await db.query('SELECT principal,spent,refunded,repaid FROM weave_company_support_advances WHERE case_id=$1::uuid',[caseId])
   if(a.rows[0]&&(Number(a.rows[0].spent)>Number(a.rows[0].repaid)||Number(a.rows[0].principal)>Number(a.rows[0].spent)+Number(a.rows[0].refunded)))return fail('Unused reserves must be refunded and used advances repaid before closing',409)
   const changed=await db.query(`UPDATE weave_company_support_cases SET status='resolved',resolved_at=now(),updated_at=now()
    WHERE id=$1::uuid AND status IN ('open','accepted','funded') RETURNING id`,[caseId])
   if(!changed.rows.length)return fail('This support case cannot be closed',409)
   return ok({resolved:true})
  }
  return fail('Unknown support action')
 }catch(e){console.error('[company-support] POST',e);return fail('Company Support transaction could not be completed',503)}
}

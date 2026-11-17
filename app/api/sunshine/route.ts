import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool,sql} from '@/lib/db'
import {getActiveLegionEmployment} from '@/lib/legion-employment'
import {ensureRegionalOperationsSchema,regionalTeam,type RegionalTeamMember} from '@/lib/regional-manager-operations'
import {ensureSunshineSchema,SUNSHINE_PRODUCTS,SUNSHINE_OBSTACLES,validSunshineCapital,SUNSHINE_ENROLLMENT_TARGET_SS} from '@/lib/sunshine-continuity'
import {ensureSunshineFinanceSchema} from '@/lib/sunshine-finance'
import {getTrxPaymentNgnRate} from '@/lib/trx-payment'
import {ngnToFlameCoin} from '@/lib/flame-coin'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Authorization'}
const json=(payload:unknown,status=200)=>NextResponse.json(payload,{status,headers})
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const monthExpr="to_char(NOW() AT TIME ZONE 'Africa/Lagos','YYYY-MM')"

async function managerTeam(user:{id:string;role:string}):Promise<RegionalTeamMember[]|null>{
  if(!['agent','bridger'].includes(user.role))return null
  await ensureRegionalOperationsSchema()
  const [active,legion]=await Promise.all([
    getPool().query(`SELECT 1 FROM weave_regional_manager_appointments a
      JOIN users u ON u.id=a.user_id AND u.is_active=true
      WHERE a.user_id=$1::uuid AND a.status='active'`,[user.id]),
    getActiveLegionEmployment(sql,user.id)
  ])
  if(!active.rows.length||legion.active)return null
  return regionalTeam(user.id,null)
}

async function assignedManager(user:{id:string;role:string}){
  if(user.role==='client'){
    await ensureSunshineFinanceSchema()
    const a=await getPool().query(`SELECT a.manager_id FROM weave_sunshine_manager_assignments a
      JOIN weave_regional_manager_appointments r ON r.user_id=a.manager_id AND r.status='active'
      WHERE a.user_id=$1::uuid AND a.active=true LIMIT 1`,[user.id])
    return a.rows[0]?.manager_id||null
  }
  if(!['agent','bridger'].includes(user.role))return null
  await ensureRegionalOperationsSchema()
  const memberships=await regionalTeam(null,user.id)
  return memberships[0]?.manager_id||null
}

async function notifyWithdrawalTarget(managerId:string,workerId:string){
  try{
    const linkExpr="'/weave/lifestyles/sunshine?withdrawalMember=' || $2::text || '&month=' || "+monthExpr
    await getPool().query(`INSERT INTO notifications
      (user_id,type,title,content,from_user_name,link)
      SELECT $1::uuid,'sunshine_withdrawal_goal',
        'Sunshine · withdrawal target reached',
        'A consenting assigned participant reported two withdrawals in the current month. Offer authorized work support without access to private bank funds.',
        'WEAVE · A Time',${linkExpr}
      WHERE NOT EXISTS (SELECT 1 FROM notifications n
        WHERE n.user_id=$1::uuid AND n.type='sunshine_withdrawal_goal' AND n.link=${linkExpr})`,
      [managerId,workerId])
  }catch(error){console.error('[Sunshine withdrawal notice unavailable]',error)}
}

async function notifyManager(managerId:string,workerId:string){
  try{
    await getPool().query(`INSERT INTO notifications
      (user_id,type,title,content,from_user_name,link)
      SELECT $1::uuid,'sunshine_work_obstacle','Sunshine · continuity support requested',
        'An assigned participant reported a work obstacle. Review the consenting Sunshine team queue and offer documented Company Support.',
        'WEAVE · A Time','/weave/lifestyles/sunshine?workMember=' || $2::text
      WHERE NOT EXISTS (SELECT 1 FROM notifications n
        WHERE n.user_id=$1::uuid AND n.type='sunshine_work_obstacle'
          AND n.link='/weave/lifestyles/sunshine?workMember=' || $2::text
          AND n.created_at >= NOW() - INTERVAL '1 day')`,[managerId,workerId])
  }catch(error){console.error('[Sunshine support notification unavailable]',error)}
}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return json({error:'Authentication required'},401)
  try{
    await ensureSunshineSchema()
    await ensureSunshineFinanceSchema()
    if(request.nextUrl.searchParams.get('view')==='team'){
      const team=await managerTeam(user)
      if(!team)return json({error:'Active ordinary Regional Manager appointment required'},403)
      const clients=await getPool().query(`SELECT a.user_id,u.name FROM weave_sunshine_manager_assignments a
        JOIN users u ON u.id=a.user_id AND u.role='client' AND u.is_active=true
        WHERE a.manager_id=$1::uuid AND a.active=true`,[user.id])
      const teamMembers=[...team,...clients.rows.map(c=>({
        manager_id:user.id,user_id:String(c.user_id),name:String(c.name),role:'client',
        position:'Client · Sunshine',level:'direct' as const,lead_user_id:null
      }))]
      const unique=[...new Set(teamMembers.map(member=>member.user_id))]
      if(!unique.length)return json({success:true,team:[],withdrawalTarget:2})
      const records=await getPool().query(`SELECT p.user_id,p.needs_help,p.obstacle_kind,
        COALESCE(w.withdrawal_count,0)::int AS withdrawal_count
        FROM weave_sunshine_savings_plans p
        LEFT JOIN weave_sunshine_monthly_withdrawals w
          ON w.user_id=p.user_id AND w.month_key=${monthExpr}
        WHERE p.manager_visibility=true AND p.user_id=ANY($1::uuid[])`,[unique])
      const byUser=new Map(records.rows.map(row=>[String(row.user_id),row]))
      return json({success:true,withdrawalTarget:2,team:teamMembers.filter(person=>byUser.has(person.user_id)).map(person=>{
        const record=byUser.get(person.user_id)
        return {userId:person.user_id,name:person.name,position:person.position,
          withdrawalCount:Number(record.withdrawal_count),
          needsHelp:record.needs_help===true,obstacleKind:record.obstacle_kind||null}
      })})
    }
    const [planResult,withdrawalResult,livingResult,managerId]=await Promise.all([
      getPool().query(`SELECT declared_capital_ngn,declared_capital_trx,capital_basis,bank_product,manager_visibility,
        needs_help,obstacle_kind,created_at FROM weave_sunshine_savings_plans
        WHERE user_id=$1::uuid`,[user.id]),
      getPool().query(`SELECT withdrawal_count FROM weave_sunshine_monthly_withdrawals
        WHERE user_id=$1::uuid AND month_key=${monthExpr}`,[user.id]),
      getPool().query(`SELECT net_interest_credited_ngn,spent_from_interest_ngn
        FROM weave_sunshine_monthly_living_money WHERE user_id=$1::uuid
        AND month_key=${monthExpr}`,[user.id]),
      assignedManager(user)
    ])
    const plan=planResult.rows[0]||null
    // Declared capital is returned only to its owner, never to Regional Manager views.
    const living=livingResult.rows[0]
    const currencyQuote=plan&&plan.capital_basis==='NGN'?await getTrxPaymentNgnRate():null
    const capitalProgressSwitch=plan?(plan.capital_basis==='TRX'
      ?Number(plan.declared_capital_trx)
      :currencyQuote?.source==='live'
        ?ngnToFlameCoin(Number(plan.declared_capital_ngn),currencyQuote.rateNgnPerTrx):null):null
    return json({success:true,managerId,withdrawalTarget:2,
      savingsGoalSwitch:SUNSHINE_ENROLLMENT_TARGET_SS,capitalProgressSwitch,
      capitalProgressRateSource:currencyQuote?.source||null,
      rateNgnPerSystemSwitch:currencyQuote?.source==='live'?currencyQuote.rateNgnPerTrx:null,
      withdrawalCount:Number(withdrawalResult.rows[0]?.withdrawal_count||0),
      monthlyLivingMoney:living?{
        netInterestCreditedNgn:Number(living.net_interest_credited_ngn),
        spentFromInterestNgn:Number(living.spent_from_interest_ngn)
      }:null,
      plan:plan?{
        declaredCapitalNgn:Number(plan.declared_capital_ngn),
        declaredCapitalTrx:Number(plan.declared_capital_trx||0),
        capitalBasis:plan.capital_basis||'NGN',
        bankProduct:plan.bank_product,managerVisibility:plan.manager_visibility,
        needsHelp:plan.needs_help,obstacleKind:plan.obstacle_kind,
        createdAt:plan.created_at
      }:null})
  }catch(error){
    console.error('[Sunshine GET]',error)
    return json({error:'Savings continuity records are temporarily unavailable'},503)
  }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return json({error:'Authentication required'},401)
  try{
    await ensureSunshineSchema()
    const body=await request.json().catch(()=>({}))
    const action=String(body.action||'')
    const db=getPool()
    if(action==='enroll'){
      const basis=user.role==='client'?'TRX':'NGN'
      const capital=validSunshineCapital(basis==='TRX'?(body.capitalTrx??body.capital):(body.capitalNgn??body.capital),basis)
      const product=String(body.bankProduct||'')
      if(capital===null||!SUNSHINE_PRODUCTS.includes(product as typeof SUNSHINE_PRODUCTS[number]))
        return json({error:'Choose a bank product and record current savings, including zero when just starting'},422)
      if(body.acknowledgeBankOwnership!==true)
        return json({error:'Confirm that you control your external savings account, not WEAVE'},422)
      const managerId=await assignedManager(user)
      const visibility=body.managerVisibility===true && Boolean(managerId)
      await db.query(`INSERT INTO weave_sunshine_savings_plans
        (user_id,declared_capital_ngn,declared_capital_trx,capital_basis,bank_product,manager_visibility)
        VALUES($1::uuid,$2,$3,$4,$5,$6)
        ON CONFLICT(user_id) DO UPDATE SET
          declared_capital_ngn=EXCLUDED.declared_capital_ngn,
          declared_capital_trx=EXCLUDED.declared_capital_trx,
          capital_basis=EXCLUDED.capital_basis,
          bank_product=EXCLUDED.bank_product,manager_visibility=EXCLUDED.manager_visibility,
          updated_at=NOW()`,[user.id,basis==='NGN'?capital:0,basis==='TRX'?capital:0,basis,product,visibility])
      return json({success:true,managerSupportEnabled:visibility,managerAssigned:Boolean(managerId),
        savingsGoalSwitch:SUNSHINE_ENROLLMENT_TARGET_SS,applicationFeeSwitch:0,
        notice:'Savings stay in your bank; no System Switch is paid for Sunshine enrollment.'})
    }
    if(action==='record_living_money'){
      const interest=Number(body.netInterestCreditedNgn)
      const spent=Number(body.spentFromInterestNgn)
      if(!Number.isFinite(interest)||!Number.isFinite(spent)||
         interest<0||spent<0||spent>interest||
         interest>999_999_999_999||Math.abs(Math.round(interest*100)-interest*100)>0.00001||
         Math.abs(Math.round(spent*100)-spent*100)>0.00001)
        return json({error:'Enter nonnegative net credited interest and spending no greater than the interest'},422)
      const record=await db.query(`INSERT INTO weave_sunshine_monthly_living_money
        (user_id,month_key,net_interest_credited_ngn,spent_from_interest_ngn)
        SELECT $1::uuid,${monthExpr},$2,$3
        WHERE EXISTS(SELECT 1 FROM weave_sunshine_savings_plans WHERE user_id=$1::uuid)
        ON CONFLICT(user_id,month_key) DO UPDATE SET
          net_interest_credited_ngn=EXCLUDED.net_interest_credited_ngn,
          spent_from_interest_ngn=EXCLUDED.spent_from_interest_ngn,
          updated_at=NOW()
        RETURNING user_id`,[user.id,interest,spent])
      if(!record.rows.length)return json({error:'Start Sunshine before recording living money'},409)
      return json({success:true,capitalRetainedNgn:interest-spent})
    }
    if(action==='withdrawal'||action==='correct_withdrawal'){
      const requestId=String(body.requestId||'')
      if(!uuid.test(requestId))return json({error:'A valid request identifier is required'},422)
      const conn=await db.connect()
      try{
        await conn.query('BEGIN')
        const owner=await conn.query('SELECT user_id FROM weave_sunshine_savings_plans WHERE user_id=$1::uuid FOR UPDATE',[user.id])
        if(!owner.rows.length){await conn.query('ROLLBACK');return json({error:'Start Sunshine before tracking withdrawals'},409)}
        const auditAction=action==='withdrawal'?'record':'correct'
        const existing=await conn.query('SELECT action FROM weave_sunshine_withdrawal_audit WHERE user_id=$1::uuid AND request_id=$2::uuid',[user.id,requestId])
        if(existing.rows.length){
          await conn.query('COMMIT')
          return json({success:true,alreadyRecorded:true})
        }
        if(auditAction==='correct'){
          const changed=await conn.query(`UPDATE weave_sunshine_monthly_withdrawals
            SET withdrawal_count=withdrawal_count-1,updated_at=NOW()
            WHERE user_id=$1::uuid AND month_key=${monthExpr}
              AND withdrawal_count>0 RETURNING withdrawal_count`,[user.id])
          if(!changed.rows.length){await conn.query('ROLLBACK');return json({error:'No withdrawal report to correct this month'},409)}
        }else{
          await conn.query(`INSERT INTO weave_sunshine_monthly_withdrawals(user_id,month_key,withdrawal_count)
            VALUES($1::uuid,${monthExpr},1)
            ON CONFLICT(user_id,month_key) DO UPDATE SET
            withdrawal_count=weave_sunshine_monthly_withdrawals.withdrawal_count+1,
            updated_at=NOW()`,[user.id])
        }
        await conn.query(`INSERT INTO weave_sunshine_withdrawal_audit
          (user_id,month_key,action,request_id)
          VALUES($1::uuid,${monthExpr},$2,$3::uuid)`,[user.id,auditAction,requestId])
        const active=await conn.query(`SELECT withdrawal_count
          FROM weave_sunshine_monthly_withdrawals WHERE user_id=$1::uuid
            AND month_key=${monthExpr}`,[user.id])
        const reportedCount=Number(active.rows[0]?.withdrawal_count||0)
        const consent=await conn.query(`SELECT manager_visibility FROM weave_sunshine_savings_plans
          WHERE user_id=$1::uuid`,[user.id])
        await conn.query('COMMIT')
        if(auditAction==='record'&&reportedCount===2&&consent.rows[0]?.manager_visibility===true){
          const managerId=await assignedManager(user)
          if(managerId)await notifyWithdrawalTarget(managerId,user.id)
        }
        return json({success:true,withdrawalCount:reportedCount})
      }catch(error){
        await conn.query('ROLLBACK').catch(()=>{})
        throw error
      }finally{conn.release()}
    }
    if(action==='request_help'||action==='resolve_help'){
      const managerId=await assignedManager(user)
      if(!managerId)return json({error:'An active assigned Regional Manager is required for company assistance'},409)
      const kind=String(body.obstacleKind||'')
      if(action==='request_help'&&!SUNSHINE_OBSTACLES.includes(kind as typeof SUNSHINE_OBSTACLES[number]))
        return json({error:'Choose the work obstacle that needs support'},422)
      const updated=await db.query(`UPDATE weave_sunshine_savings_plans
        SET needs_help=$2,obstacle_kind=$3,updated_at=NOW()
        WHERE user_id=$1::uuid AND manager_visibility=true RETURNING user_id`,
        [user.id,action==='request_help',action==='request_help'?kind:null])
      if(!updated.rows.length)return json({error:'Enable voluntary manager support in your Sunshine plan first'},409)
      if(action==='request_help')await notifyManager(managerId,user.id)
      return json({success:true})
    }
    return json({error:'Unsupported Sunshine action'},400)
  }catch(error){
    console.error('[Sunshine POST]',error)
    return json({error:'Unable to save Sunshine continuity record'},503)
  }
}

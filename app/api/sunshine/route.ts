import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {ensureRegionalOperationsSchema,regionalTeam} from '@/lib/regional-manager-operations'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Authorization'}
const monthSql="date_trunc('month', NOW() AT TIME ZONE 'Africa/Lagos')::date"

/** Sunshine records are participant declarations, never a bank feed or account custody. */
async function ensureSchema(){
  const db=getPool()
  await db.query(`CREATE TABLE IF NOT EXISTS weave_sunshine_participants(
    user_id uuid PRIMARY KEY REFERENCES users(id),
    minimum_declared boolean NOT NULL DEFAULT false,
    share_with_manager boolean NOT NULL DEFAULT false,
    started_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS weave_sunshine_months(
    user_id uuid NOT NULL REFERENCES weave_sunshine_participants(user_id),
    month_start date NOT NULL,
    withdrawals_used integer NOT NULL DEFAULT 0 CHECK(withdrawals_used BETWEEN 0 AND 31),
    obstacle_note varchar(400) NOT NULL DEFAULT '',
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,month_start)
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS weave_sunshine_month_history(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES weave_sunshine_participants(user_id),
    month_start date NOT NULL,
    withdrawals_used integer NOT NULL,
    obstacle_present boolean NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT NOW()
  )`)
}
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers})

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return fail('Authentication required',401)
  try{
    await ensureSchema()
    const db=getPool()
    if(new URL(request.url).searchParams.get('view')==='manager'){
      if(!['agent','bridger'].includes(user.role))return fail('Regional Manager authorization required',403)
      await ensureRegionalOperationsSchema()
      const appointment=await db.query(`SELECT 1 FROM weave_regional_manager_appointments
        WHERE user_id=$1::uuid AND status='active'`,[user.id])
      if(!appointment.rowCount)return fail('Active Regional Manager appointment required',403)
      const team=await regionalTeam(user.id,null)
      // Managers receive only voluntary monthly withdrawal reports and obstacles.
      // They cannot access balances, bank identity, account numbers or statements.
      const visible=team.filter(member=>member.user_id!==user.id)
      if(!visible.length)return NextResponse.json({mode:'manager',participants:[]},{headers})
      const ids=visible.map(member=>member.user_id)
      const rows=await db.query(`SELECT p.user_id,m.withdrawals_used,m.obstacle_note,m.updated_at
        FROM weave_sunshine_participants p
        LEFT JOIN weave_sunshine_months m
          ON m.user_id=p.user_id AND m.month_start=${monthSql}
        WHERE p.user_id=ANY($1::uuid[]) AND p.minimum_declared=true
          AND p.share_with_manager=true ORDER BY p.started_at DESC`,[ids])
      const names=new Map(visible.map(member=>[member.user_id,member.name]))
      return NextResponse.json({mode:'manager',participants:rows.rows.map(item=>({
        userId:item.user_id,name:names.get(item.user_id)||'Assigned participant',
        withdrawalsUsed:item.withdrawals_used==null?null:Number(item.withdrawals_used),
        obstacleNote:item.obstacle_note||'',updatedAt:item.updated_at||null,
        source:'self_reported'
      }))},{headers})
    }
    const result=await db.query(`SELECT p.minimum_declared,p.share_with_manager,p.started_at,
      m.withdrawals_used,m.obstacle_note,m.updated_at
      FROM weave_sunshine_participants p LEFT JOIN weave_sunshine_months m
        ON m.user_id=p.user_id AND m.month_start=${monthSql}
      WHERE p.user_id=$1::uuid`,[user.id])
    const item=result.rows[0]||null
    return NextResponse.json({mode:'participant',active:!!item,
      participant:item?{
        minimumDeclared:!!item.minimum_declared,shareWithManager:!!item.share_with_manager,
        startedAt:item.started_at,
        withdrawalsUsed:item.withdrawals_used==null?null:Number(item.withdrawals_used),
        obstacleNote:item.obstacle_note||'',updatedAt:item.updated_at||null
      }:null,source:'self_reported',limit:2},{headers})
  }catch(error){
    console.error('[Sunshine GET]',error)
    return fail('Sunshine records unavailable; no bank information has been accessed',503)
  }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return fail('Authentication required',401)
  const body=await request.json().catch(()=>null)
  if(!body||typeof body!=='object')return fail('Invalid request',400)
  const action=String(body.action||'')
  try{
    await ensureSchema()
    const db=getPool()
    if(action==='enrol'){
      if(body.minimumDeclared!==true||body.shareWithManager!==true){
        return fail('Confirm at least ₦1 million held in your own savings account and consent to manager continuity reports',422)
      }
      await db.query(`INSERT INTO weave_sunshine_participants(user_id,minimum_declared,share_with_manager)
        VALUES($1::uuid,true,true)
        ON CONFLICT(user_id) DO UPDATE SET minimum_declared=true,share_with_manager=true,
          updated_at=NOW()`,[user.id])
      return NextResponse.json({success:true,source:'self_reported'},{headers})
    }
    if(action==='stop_sharing'){
      await db.query(`UPDATE weave_sunshine_participants
        SET share_with_manager=false,updated_at=NOW() WHERE user_id=$1::uuid`,[user.id])
      return NextResponse.json({success:true},{headers})
    }
    if(action==='report'){
      const count=body.withdrawalsUsed
      const note=typeof body.obstacleNote==='string'?body.obstacleNote.trim():''
      if(!Number.isInteger(count)||count<0||count>31||note.length>400){
        return fail('Provide the number of withdrawals this month (0–31) and a note of up to 400 characters',422)
      }
      const client=await db.connect()
      try{
        await client.query('BEGIN')
        const enrol=await client.query(`SELECT user_id FROM weave_sunshine_participants
          WHERE user_id=$1::uuid AND minimum_declared=true FOR UPDATE`,[user.id])
        if(!enrol.rowCount){
          await client.query('ROLLBACK')
          return fail('Enrol in Sunshine first',403)
        }
        await client.query(`INSERT INTO weave_sunshine_months(user_id,month_start,withdrawals_used,obstacle_note)
          VALUES($1::uuid,${monthSql},$2,$3)
          ON CONFLICT(user_id,month_start) DO UPDATE
          SET withdrawals_used=excluded.withdrawals_used,obstacle_note=excluded.obstacle_note,
            updated_at=NOW()`,[user.id,count,note])
        await client.query(`INSERT INTO weave_sunshine_month_history
          (user_id,month_start,withdrawals_used,obstacle_present)
          VALUES($1::uuid,${monthSql},$2,$3)`,[user.id,count,note.length>0])
        await client.query('COMMIT')
      }catch(error){
        await client.query('ROLLBACK')
        throw error
      }finally{client.release()}
      return NextResponse.json({success:true,withdrawalsUsed:count,
        remaining:Math.max(0,2-count),withinGoal:count<=2,
        source:'self_reported'},{headers})
    }
    return fail('Unknown Sunshine action',400)
  }catch(error){
    console.error('[Sunshine POST]',error)
    return fail('Unable to save Sunshine continuity record',503)
  }
}

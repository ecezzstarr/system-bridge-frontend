import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {ensureRegionalOperationsSchema,regionalTeam} from '@/lib/regional-manager-operations'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Authorization'}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request:NextRequest){
  const admin=await getAuthUser(request)
  if(!admin||admin.role!=='admin')
    return NextResponse.json({error:'Administrations access required'},{status:403,headers})
  try{
    await ensureRegionalOperationsSchema()
    const pool=getPool()
    const [manager,team,bridger,distribution,food,foodLinks,daily,staffCheckins]=await Promise.all([
      pool.query(`SELECT rm.user_id AS manager_id,u.name,rm.source_role,rm.appointed_at
        FROM weave_regional_manager_appointments rm JOIN users u ON u.id=rm.user_id
        WHERE rm.status='active' AND u.is_active=true ORDER BY rm.appointed_at DESC LIMIT 150`),
      regionalTeam(null,null),
      pool.query(`SELECT id AS user_id,name FROM users
        WHERE role='bridger' AND is_active=true ORDER BY name LIMIT 250`),
      pool.query(`SELECT e.user_id,u.name FROM manager_employment e
        JOIN users u ON u.id=e.user_id
        WHERE e.status IN ('probation','active') AND u.is_active=true
        ORDER BY u.name LIMIT 150`),
      pool.query(`SELECT e.user_id,u.name FROM weave_food_distribution_employment e
        JOIN users u ON u.id=e.user_id
        WHERE e.status='approved' AND e.position='manager' AND u.role='agent'
          AND u.is_active=true ORDER BY u.name LIMIT 150`),
      pool.query(`SELECT food_manager_user_id,regional_manager_user_id,status
        FROM weave_regional_manager_food_distribution_leads WHERE status='active'`),
      pool.query(`SELECT regional_manager_user_id AS manager_id,
          COUNT(*) FILTER(WHERE status='completed')::int AS tasks_completed,
          COUNT(*) FILTER(WHERE status<>'completed')::int AS tasks_open
        FROM weave_regional_daily_tasks
        WHERE work_date=((NOW() AT TIME ZONE 'Africa/Lagos')::date)
        GROUP BY regional_manager_user_id`),
      pool.query(`SELECT c.regional_manager_user_id AS manager_id,
          COUNT(*)::int AS checkins,
          COUNT(*) FILTER (WHERE support_status IN ('open','acknowledged'))::int AS needs_help
        FROM weave_regional_daily_checkins c
        WHERE c.work_date=((NOW() AT TIME ZONE 'Africa/Lagos')::date)
        GROUP BY c.regional_manager_user_id`),
    ])
    const report=manager.rows.map(m=>{
      const members=team.filter(x=>x.manager_id===m.manager_id)
      const work=daily.rows.find(x=>x.manager_id===m.manager_id)
      const checkin=staffCheckins.rows.find(x=>x.manager_id===m.manager_id)
      return {...m,staff:members.length,
        direct:members.filter(x=>x.level==='direct').length,
        assistants:members.filter(x=>x.level==='assistant').length,
        tasks_completed:work?.tasks_completed||0,tasks_open:work?.tasks_open||0,
        checkins:checkin?.checkins||0,needs_help:checkin?.needs_help||0}
    })
    return NextResponse.json({success:true,managers:report,team,
      candidates:{bridgers:bridger.rows,distributionManagers:distribution.rows,
        foodDistributionManagers:food.rows},
      foodAssignments:foodLinks.rows,generatedAt:new Date().toISOString()
    },{headers})
  }catch(error){
    console.error('[Administrations regional operations GET]',error)
    return NextResponse.json({error:'Unable to read regional operations'},{status:503,headers})
  }
}

/** Administrations alone assigns approved Food Distribution leads to regions.
 * Assistants inherit only the lead relationship, never a new appointment.
 */
export async function POST(request:NextRequest){
  const admin=await getAuthUser(request)
  if(!admin||admin.role!=='admin')
    return NextResponse.json({error:'Administrations access required'},{status:403,headers})
  try{
    await ensureRegionalOperationsSchema()
    const body=await request.json().catch(()=>({}))
    const action=String(body.action||'')
    const foodId=String(body.foodManagerId||'')
    if(!uuid.test(foodId)||!['assign_food_lead','unassign_food_lead'].includes(action))
      return NextResponse.json({error:'Choose a verified Food Distribution Manager'},{status:422,headers})
    const pool=getPool(), db=await pool.connect()
    try{
      await db.query('BEGIN')
      if(action==='assign_food_lead'){
        const regionId=String(body.regionalManagerId||'')
        if(!uuid.test(regionId)){
          await db.query('ROLLBACK')
          return NextResponse.json({error:'Choose an appointed Regional Manager'},{status:422,headers})
        }
        await db.query(`SELECT pg_advisory_xact_lock(hashtext('weave_regional_food_assignment'))`)
        const [rm,food]=await Promise.all([
          db.query(`SELECT a.user_id FROM weave_regional_manager_appointments a
            JOIN users u ON u.id=a.user_id AND u.is_active=true
            WHERE a.user_id=$1::uuid AND a.status='active'
              AND u.role IN ('agent','bridger')`,[regionId]),
          db.query(`SELECT e.user_id FROM weave_food_distribution_employment e
            JOIN users u ON u.id=e.user_id AND u.is_active=true AND u.role='agent'
            WHERE e.user_id=$1::uuid AND e.status='approved' AND e.position='manager'`,[foodId])
        ])
        if(!rm.rowCount||!food.rowCount){
          await db.query('ROLLBACK')
          return NextResponse.json({error:'Both appointments must be active and verified'},{status:422,headers})
        }
        const result=await db.query(`INSERT INTO weave_regional_manager_food_distribution_leads
          (food_manager_user_id,regional_manager_user_id,assigned_by,status)
          VALUES($1::uuid,$2::uuid,$3::uuid,'active')
          ON CONFLICT(food_manager_user_id) DO UPDATE SET
            regional_manager_user_id=EXCLUDED.regional_manager_user_id,
            assigned_by=EXCLUDED.assigned_by,status='active',
            assigned_at=NOW(),updated_at=NOW()
          RETURNING *`,[foodId,regionId,admin.id])
        await db.query('COMMIT')
        return NextResponse.json({success:true,assignment:result.rows[0]},{headers})
      }
      const result=await db.query(`UPDATE weave_regional_manager_food_distribution_leads
        SET status='ended',updated_at=NOW()
        WHERE food_manager_user_id=$1::uuid AND status='active' RETURNING *`,[foodId])
      if(!result.rowCount){
        await db.query('ROLLBACK')
        return NextResponse.json({error:'Active Food Distribution assignment not found'},{status:404,headers})
      }
      await db.query('COMMIT')
      return NextResponse.json({success:true,assignment:result.rows[0]},{headers})
    }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error}
    finally{db.release()}
  }catch(error){
    console.error('[Administrations regional operations POST]',error)
    return NextResponse.json({error:'Regional team assignment was not saved'},{status:503,headers})
  }
}

import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool,sql} from '@/lib/db'
import {getLifestyleAccess} from '@/lib/weave-lifestyle'
import {getActiveLegionEmployment} from '@/lib/legion-employment'
import {ensureFoodPreparationManagerSchema} from '@/lib/food-preparation-manager'

export const dynamic='force-dynamic'
const KINDS=['message','plan','progress','handoff'] as const
let schemaPromise:Promise<void>|null=null
async function ensureTeamMessages(){
  if(!schemaPromise)schemaPromise=(async()=>{
    await ensureFoodPreparationManagerSchema()
    await getPool().query(`CREATE TABLE IF NOT EXISTS weave_food_team_messages(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind varchar(16) NOT NULL CHECK (kind IN ('message','plan','progress','handoff')),
      content text NOT NULL CHECK (char_length(content) BETWEEN 2 AND 2000),
      created_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS weave_food_team_messages_date_idx
      ON weave_food_team_messages(created_at DESC)`)
  })().catch(error=>{schemaPromise=null;throw error})
  return schemaPromise
}
async function authorized(user:{id:string;role:string}){
  if(user.role!=='agent')return false
  const access=await getLifestyleAccess(user.id)
  if(!access.active||(await getActiveLegionEmployment(sql,user.id)).active)return false
  const {rows}=await getPool().query(`SELECT 1 FROM weave_food_preparation_managers
    WHERE agent_id=$1::uuid AND status='approved' LIMIT 1`,[user.id])
  return rows.length>0
}
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Sign in required'},{status:401})
  try{
    await ensureTeamMessages()
    if(!await authorized(user))return NextResponse.json({success:false,error:'Approved Food Preparation appointment required'},{status:403})
    const pool=getPool()
    const [staff,messages]=await Promise.all([
      pool.query(`SELECT u.id,u.name,m.position FROM weave_food_preparation_managers m
        JOIN users u ON u.id=m.agent_id
        WHERE m.status='approved' AND u.is_active=true AND u.role='agent'
        ORDER BY CASE WHEN m.position='manager' THEN 0 ELSE 1 END,u.name LIMIT 3`),
      pool.query(`SELECT t.id,t.kind,t.content,t.created_at,t.author_id,u.name AS author_name,
        m.position AS author_position FROM weave_food_team_messages t
        JOIN users u ON u.id=t.author_id
        JOIN weave_food_preparation_managers m ON m.agent_id=t.author_id
        ORDER BY t.created_at DESC,t.id DESC LIMIT 100`),
    ])
    return NextResponse.json({success:true,staff:staff.rows,messages:messages.rows.reverse()},
      {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[food team] read',error)
    return NextResponse.json({success:false,error:'Food team messages unavailable'},{status:500})}
}
export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Sign in required'},{status:401})
  const body=await request.json().catch(()=>({}))
  const kind=String(body.kind||'')
  const content=typeof body.content==='string'?body.content.trim():''
  if(!KINDS.some(value=>value===kind)||content.length<2||content.length>2000)
    return NextResponse.json({success:false,error:'Choose a valid message kind and enter 2–2000 characters'},{status:400})
  try{
    await ensureTeamMessages()
    if(!await authorized(user))return NextResponse.json({success:false,error:'Approved Food Preparation appointment required'},{status:403})
    const pool=getPool()
    const {rows}=await pool.query(`INSERT INTO weave_food_team_messages(author_id,kind,content)
      SELECT $1::uuid,$2,$3 FROM weave_food_preparation_managers m
      JOIN users u ON u.id=m.agent_id
      WHERE m.agent_id=$1::uuid AND m.status='approved' AND u.is_active=true
      RETURNING id`,[user.id,kind,content])
    if(!rows.length)return NextResponse.json({success:false,error:'Appointment no longer active'},{status:403})
    try{
      await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
        SELECT member.agent_id,'food_team_message',$2,$3,sender.name,
          '/weave/lifestyles/work#food-team-communication'
        FROM weave_food_preparation_managers member
        JOIN users recipient ON recipient.id=member.agent_id AND recipient.is_active=true
        JOIN users sender ON sender.id=$1::uuid
        WHERE member.status='approved' AND member.agent_id<>$1::uuid`,
        [user.id,kind==='message'?'Food preparation team message':kind==='plan'?'Food preparation plan':
          kind==='progress'?'Food preparation progress':'Food preparation handoff',content.slice(0,380)])
    }catch(error){console.error('[food team] notification failed',error)}
    return NextResponse.json({success:true,id:rows[0].id},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[food team] post',error)
    return NextResponse.json({success:false,error:'Unable to send food team message'},{status:500})}
}

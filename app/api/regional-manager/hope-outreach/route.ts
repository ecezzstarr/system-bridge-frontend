import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool,sql} from '@/lib/db'
import {getActiveLegionEmployment} from '@/lib/legion-employment'
import {ensureRegionalOperationsSchema,regionalTeam} from '@/lib/regional-manager-operations'
import {ensureWeaveDistributionSchema} from '@/lib/weave-distribution'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Authorization'}
const channels=['tiktok','facebook','instagram','x','youtube','linkedin'] as const
type Channel=typeof channels[number]
type Targets=Record<Channel,number>
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Lagos'})
const emptyTargets=():Targets=>({tiktok:0,facebook:0,instagram:0,x:0,youtube:0,linkedin:0})
const normalizeTargets=(value:unknown):Targets=>{
  const input=value&&typeof value==='object'?value as Record<string,unknown>:{}
  const result=emptyTargets()
  for(const key of channels){
    const amount=Number(input[key]??0)
    if(!Number.isInteger(amount)||amount<0||amount>5)throw new Error('Each social target must be between 0 and 5 posts')
    result[key]=amount
  }
  return result
}
const canonicalHost=(channel:Channel,host:string)=>{
  const roots:Record<Channel,string[]>={tiktok:['tiktok.com'],facebook:['facebook.com','fb.com'],instagram:['instagram.com'],x:['x.com','twitter.com'],youtube:['youtube.com','youtu.be'],linkedin:['linkedin.com']}
  return roots[channel].some(root=>host===root||host.endsWith('.'+root))
}
function validatedPostUrl(channel:Channel,value:unknown){
  if(typeof value!=='string'||value.length>1500)throw new Error('Provide one public post URL')
  try{
    const parsed=new URL(value.trim())
    if(parsed.protocol!=='https:'||parsed.username||parsed.password||!canonicalHost(channel,parsed.hostname.toLowerCase())||
      parsed.pathname.length<3)throw new Error('Invalid public post URL')
    parsed.hash=''
    return parsed.toString()
  }catch{throw new Error('Use a public HTTPS post URL on the selected social platform')}
}

async function ensureSchema(){
  await ensureRegionalOperationsSchema()
  await ensureWeaveDistributionSchema()
  const pool=getPool()
  await pool.query(`CREATE TABLE IF NOT EXISTS weave_regional_bridger_outreach_targets(
    bridger_id uuid NOT NULL REFERENCES users(id),
    work_date date NOT NULL,
    regional_manager_user_id uuid NOT NULL REFERENCES weave_regional_manager_appointments(user_id),
    working_hours smallint NOT NULL CHECK(working_hours BETWEEN 1 AND 12),
    post_targets jsonb NOT NULL DEFAULT '{}'::jsonb,
    assigned_by uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY(bridger_id,work_date)
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_hope_targets_region_day
    ON weave_regional_bridger_outreach_targets(regional_manager_user_id,work_date DESC)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS weave_regional_bridger_target_audit(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bridger_id uuid NOT NULL REFERENCES users(id),
    regional_manager_user_id uuid NOT NULL REFERENCES weave_regional_manager_appointments(user_id),
    actor_user_id uuid NOT NULL REFERENCES users(id),
    work_date date NOT NULL,
    working_hours smallint NOT NULL,
    post_targets jsonb NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT NOW()
  )`)
  await pool.query(`CREATE TABLE IF NOT EXISTS weave_regional_bridger_post_evidence(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bridger_id uuid NOT NULL REFERENCES users(id),
    regional_manager_user_id uuid NOT NULL REFERENCES weave_regional_manager_appointments(user_id),
    work_date date NOT NULL,
    channel_key varchar(32) NOT NULL CHECK(channel_key IN ('tiktok','facebook','instagram','x','youtube','linkedin')),
    post_url text NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    review_note text,
    reviewed_by uuid REFERENCES users(id),
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(bridger_id,channel_key,post_url)
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_hope_post_evidence_region
    ON weave_regional_bridger_post_evidence(regional_manager_user_id,work_date DESC,status)`)
}
type Member={user_id:string;name:string;role:string;position:string;level:string}
async function access(user:{id:string;role:string}){
  if(!['bridger','agent'].includes(user.role))return null
  const legion=await getActiveLegionEmployment(sql,user.id)
  if(legion.active)return null
  const active=await getPool().query(`SELECT 1 FROM weave_regional_manager_appointments
    WHERE user_id=$1::uuid AND status='active'`,[user.id])
  if(active.rowCount){
    const all=await regionalTeam(user.id,null)
    return {kind:'manager' as const,managerId:user.id,
      members:all.filter(m=>m.position==='Bridger'&&m.role==='bridger'&&m.level==='direct') as Member[]}
  }
  if(user.role!=='bridger')return null
  const team=await regionalTeam(null,user.id)
  const member=team.find(m=>m.position==='Bridger'&&m.role==='bridger'&&m.level==='direct')
  return member?{kind:'member' as const,managerId:member.manager_id,
    members:[{user_id:user.id,name:member.name,role:'bridger',position:'Bridger',level:'direct'}] as Member[]}:null
}
async function notify(userId:string,title:string,content:string){
  try{await getPool().query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
    VALUES($1::uuid,'regional_work',$2,$3,'WEAVE · Hope','/weave/lifestyles/regional-manager/hope-outreach')`,
    [userId,title,content.slice(0,500)])}
  catch(error){console.error('[hope outreach notification]',error)}
}
async function tableAvailable(table:string){
  const r=await getPool().query('SELECT to_regclass($1) AS name',['public.'+table])
  return Boolean(r.rows[0]?.name)
}
async function snapshotTargets(managerId:string,ids:string[],day:string){
  if(!ids.length)return
  // Carry a manager's last authorized daily plan forward without rewriting prior days.
  // An employee moved to a new manager does not inherit the old manager's targets.
  await getPool().query(`INSERT INTO weave_regional_bridger_outreach_targets
      (bridger_id,work_date,regional_manager_user_id,working_hours,post_targets,assigned_by)
    SELECT b.id,$2::date,$3::uuid,prior.working_hours,prior.post_targets,prior.assigned_by
    FROM unnest($1::uuid[]) AS b(id)
    JOIN LATERAL (
      SELECT working_hours,post_targets,assigned_by FROM weave_regional_bridger_outreach_targets
      WHERE bridger_id=b.id AND regional_manager_user_id=$3::uuid AND work_date<$2::date
      ORDER BY work_date DESC LIMIT 1
    ) prior ON TRUE
    ON CONFLICT(bridger_id,work_date) DO NOTHING`,[ids,day,managerId])
}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Authentication required'},{status:401,headers})
  try{
    await ensureSchema()
    const ctx=await access(user)
    if(!ctx)return NextResponse.json({error:'An active Hope regional assignment is required'},{status:403,headers})
    const ids=ctx.members.map(m=>m.user_id),day=today(),pool=getPool()
    if(!ids.length)return NextResponse.json({success:true,mode:ctx.kind,day,managerId:ctx.managerId,reports:[],sources:{prospects:true,publishing:true}},{headers})
    await snapshotTargets(ctx.managerId,ids,day)
    const [targets,proofs,prospectsReady,publishingReady]=await Promise.all([
      pool.query(`SELECT bridger_id,working_hours,post_targets,updated_at FROM weave_regional_bridger_outreach_targets
        WHERE bridger_id=ANY($1::uuid[]) AND regional_manager_user_id=$3::uuid AND work_date=$2::date`,[ids,day,ctx.managerId]),
      pool.query(`SELECT id,bridger_id,channel_key,post_url,status,review_note,reviewed_at,created_at
        FROM weave_regional_bridger_post_evidence
        WHERE bridger_id=ANY($1::uuid[]) AND regional_manager_user_id=$3::uuid AND work_date=$2::date
        ORDER BY created_at DESC LIMIT 2000`,[ids,day,ctx.managerId]),
      tableAvailable('market_prospect_outreach'),
      tableAvailable('weave_distribution_deliveries')
    ])
    const [contacts,deliveries]=await Promise.all([
      prospectsReady?pool.query(`SELECT bridger_id,
        COUNT(*) FILTER(WHERE sent_at IS NOT NULL
          AND (sent_at AT TIME ZONE 'Africa/Lagos')::date=$2::date)::int AS send_confirmations,
        COUNT(*) FILTER(WHERE status IN ('responded','converted')
          AND (last_activity_at AT TIME ZONE 'Africa/Lagos')::date=$2::date)::int AS responses_or_conversions
        FROM market_prospect_outreach WHERE bridger_id=ANY($1::uuid[]) GROUP BY bridger_id`,[ids,day]):Promise.resolve({rows:[]}),
      publishingReady?pool.query(`SELECT user_id,channel_key,provider_url,provider_post_id FROM weave_distribution_deliveries
        WHERE user_id=ANY($1::uuid[]) AND status='published'
          AND (provider_url IS NOT NULL OR provider_post_id IS NOT NULL)
          AND (published_at AT TIME ZONE 'Africa/Lagos')::date=$2::date
          AND channel_key=ANY($3::text[])`,[ids,day,[...channels]]):Promise.resolve({rows:[]})
    ])
    const reports=ctx.members.map(member=>{
      const plan=targets.rows.find(r=>String(r.bridger_id)===member.user_id)
      const contact=contacts.rows.find(r=>String(r.bridger_id)===member.user_id)
      const evidence=proofs.rows.filter(r=>String(r.bridger_id)===member.user_id)
      const providerRows=deliveries.rows.filter(r=>String(r.user_id)===member.user_id)
      const posts={} as Record<Channel,{target:number;providerConfirmed:number;managerReviewed:number;pending:number;total:number}>
      const desired=plan?normalizeTargets(plan.post_targets):emptyTargets()
      for(const channel of channels){
        const provider=providerRows.filter(r=>r.channel_key===channel)
        const providerUrls=new Set(provider.map(r=>String(r.provider_url||'')).filter(Boolean))
        const approved=evidence.filter(r=>r.channel_key===channel&&r.status==='approved'&&!providerUrls.has(String(r.post_url)))
        posts[channel]={
          target:desired[channel],providerConfirmed:provider.length,
          managerReviewed:approved.length,
          pending:evidence.filter(r=>r.channel_key===channel&&r.status==='pending').length,
          total:provider.length+approved.length
        }
      }
      return {member,plan:plan?{workingHours:Number(plan.working_hours),contactTarget:Number(plan.working_hours)*2,
        postTargets:desired,updatedAt:plan.updated_at}:null,
        contacts:{sendConfirmations:Number(contact?.send_confirmations||0),responsesOrConversions:Number(contact?.responses_or_conversions||0)},
        posts,evidence}
    })
    return NextResponse.json({success:true,mode:ctx.kind,managerId:ctx.managerId,day,reports,
      sources:{prospects:prospectsReady,publishing:publishingReady},
      note:'WhatsApp sends are Bridger-confirmed, not provider-confirmed. External links count only after manager review; provider receipts count separately.'},{headers})
  }catch(error){console.error('[regional hope outreach GET]',error)
    return NextResponse.json({error:'Hope outreach records unavailable; do not treat missing data as zero activity'},{status:503,headers})}
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Authentication required'},{status:401,headers})
  try{
    await ensureSchema()
    const ctx=await access(user)
    if(!ctx)return NextResponse.json({error:'An active Hope regional assignment is required'},{status:403,headers})
    const body=await request.json().catch(()=>({}))
    const action=String(body.action||''),day=today(),pool=getPool()
    if(action==='save_plan'){
      if(ctx.kind!=='manager')return NextResponse.json({error:'Regional Manager authorization required'},{status:403,headers})
      const bridgerId=String(body.bridgerId||''),hours=Number(body.workingHours)
      if(!ctx.members.some(m=>m.user_id===bridgerId)||!Number.isInteger(hours)||hours<1||hours>12)
        return NextResponse.json({error:'Select an assigned Bridger and 1–12 working hours'},{status:422,headers})
      const desired=normalizeTargets(body.postTargets)
      const db=await pool.connect()
      try{
        await db.query('BEGIN')
        const current=await db.query(`SELECT 1 FROM weave_regional_manager_bridgers b
          JOIN weave_regional_manager_appointments a ON a.user_id=b.regional_manager_user_id AND a.status='active'
          WHERE b.bridger_user_id=$1::uuid AND b.regional_manager_user_id=$2::uuid AND b.status='active'
          FOR UPDATE OF b`,[bridgerId,ctx.managerId])
        if(!current.rowCount){await db.query('ROLLBACK');return NextResponse.json({error:'Bridger assignment has changed'},{status:409,headers})}
        await db.query(`INSERT INTO weave_regional_bridger_outreach_targets
          (bridger_id,work_date,regional_manager_user_id,working_hours,post_targets,assigned_by)
          VALUES($1::uuid,$2::date,$3::uuid,$4,$5::jsonb,$3::uuid)
          ON CONFLICT(bridger_id,work_date) DO UPDATE SET
            regional_manager_user_id=EXCLUDED.regional_manager_user_id,
            working_hours=EXCLUDED.working_hours,post_targets=EXCLUDED.post_targets,
            assigned_by=EXCLUDED.assigned_by,updated_at=NOW()`,
          [bridgerId,day,ctx.managerId,hours,JSON.stringify(desired)])
        await db.query(`INSERT INTO weave_regional_bridger_target_audit
          (bridger_id,regional_manager_user_id,actor_user_id,work_date,working_hours,post_targets)
          VALUES($1::uuid,$2::uuid,$2::uuid,$3::date,$4,$5::jsonb)`,
          [bridgerId,ctx.managerId,day,hours,JSON.stringify(desired)])
        await db.query('COMMIT')
      }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error}
      finally{db.release()}
      await notify(bridgerId,'Hope daily outreach targets','Your Regional Manager set '+(hours*2)+' prospect contacts and social publication targets. Open the Hope outreach board.')
      return NextResponse.json({success:true,day,contactTarget:hours*2,postTargets:desired},{headers})
    }
    if(action==='submit_post'){
      if(ctx.kind!=='member')return NextResponse.json({error:'Only an assigned Bridger can submit their own post'},{status:403,headers})
      const channel=String(body.channel||'') as Channel
      if(!channels.includes(channel))return NextResponse.json({error:'Unsupported social channel'},{status:422,headers})
      const postUrl=validatedPostUrl(channel,body.url)
      const saved=await pool.query(`INSERT INTO weave_regional_bridger_post_evidence
        (bridger_id,regional_manager_user_id,work_date,channel_key,post_url)
        SELECT $1::uuid,$2::uuid,$3::date,$4,$5
        WHERE EXISTS(SELECT 1 FROM weave_regional_manager_bridgers
          WHERE bridger_user_id=$1::uuid AND regional_manager_user_id=$2::uuid AND status='active')
        ON CONFLICT(bridger_id,channel_key,post_url) DO NOTHING RETURNING id`,
        [user.id,ctx.managerId,day,channel,postUrl])
      if(!saved.rowCount)return NextResponse.json({error:'This post was already submitted or your regional assignment changed'},{status:409,headers})
      await notify(ctx.managerId,'Hope publication awaiting review','An assigned Bridger submitted a '+channel+' publication link for review.')
      return NextResponse.json({success:true,status:'pending',id:saved.rows[0].id},{headers})
    }
    if(action==='review_post'){
      if(ctx.kind!=='manager')return NextResponse.json({error:'Only the Regional Manager may review posts'},{status:403,headers})
      const id=String(body.evidenceId||''),status=String(body.status||''),note=String(body.note||'').trim()
      if(!uuid.test(id)||!['approved','rejected'].includes(status)||note.length<8||note.length>500)
        return NextResponse.json({error:'Provide a valid decision with a review reason'},{status:422,headers})
      const eligible=ctx.members.map(m=>m.user_id)
      const updated=await pool.query(`UPDATE weave_regional_bridger_post_evidence
        SET status=$3,review_note=$4,reviewed_by=$5::uuid,reviewed_at=NOW()
        WHERE id=$1::uuid AND regional_manager_user_id=$2::uuid
          AND bridger_id=ANY($6::uuid[]) AND status='pending'
        RETURNING bridger_id,channel_key`,[id,ctx.managerId,status,note,user.id,eligible])
      if(!updated.rowCount)return NextResponse.json({error:'Pending evidence not found in your active region'},{status:404,headers})
      await notify(String(updated.rows[0].bridger_id),'Hope publication '+status,
        'Your '+updated.rows[0].channel_key+' post was '+status+' by the Regional Manager. '+note)
      return NextResponse.json({success:true,status},{headers})
    }
    return NextResponse.json({error:'Unsupported Hope outreach action'},{status:400,headers})
  }catch(error){console.error('[regional hope outreach POST]',error)
    const message=error instanceof Error?error.message:'Invalid outreach request'
    if(/target|URL|platform|social/i.test(message))return NextResponse.json({error:message},{status:422,headers})
    return NextResponse.json({error:'Unable to record authorized Hope outreach movement'},{status:503,headers})}
}

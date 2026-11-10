import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool,logAudit} from '@/lib/db'
import {getWeavePublicOrigin} from '@/lib/weave-origin'
import {ensureSampleCommerceSchema} from '@/lib/weave-image-sample-commerce'
import {findImageSample} from '@/lib/weave-image-sample-art'
import {BRANDING_KITS,createBrandingAd,getBrandingKit} from '@/lib/weave-branding-business'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const roles=new Set(['agent','bridger','client','admin'])
const channels=new Set(['whatsapp_status','tiktok','instagram','facebook','x','company_distribution','in_person','email'])
const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
const clean=(v:unknown,max:number)=>String(v??'').trim().slice(0,max)
const json=(value:object,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store'}})
let ensured:Promise<void>|null=null
export async function ensureBrandingLaunchSchema(){
  if(!ensured)ensured=(async()=>{
    const db=getPool()
    await db.query(["CREATE TABLE IF NOT EXISTS weave_branding_launch_plans(",
      "user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,",
      "role varchar(16) NOT NULL CHECK(role IN ('agent','bridger','client')),",
      "kit_id varchar(32) NOT NULL,business_name varchar(100) NOT NULL,offer_text varchar(260) NOT NULL,audience varchar(150) NOT NULL,",
      "customer_quote_ngn numeric(20,2) CHECK(customer_quote_ngn>=0 AND customer_quote_ngn<=100000000),",
      "daily_outreach_goal integer NOT NULL DEFAULT 2 CHECK(daily_outreach_goal BETWEEN 1 AND 30),",
      "created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())"].join(' '))
    await db.query(["CREATE TABLE IF NOT EXISTS weave_branding_ad_campaigns(",
      "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,",
      "client_key uuid NOT NULL,kit_id varchar(32) NOT NULL,sample_id varchar(80) NOT NULL,",
      "channel varchar(40) NOT NULL,headline varchar(110) NOT NULL,message text NOT NULL,customer_door text,",
      "status varchar(24) NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','reported_shared')),",
      "external_post_url varchar(500),created_at timestamptz NOT NULL DEFAULT now(),reported_shared_at timestamptz,",
      "UNIQUE(user_id,client_key))"].join(' '))
    await db.query("CREATE INDEX IF NOT EXISTS weave_branding_campaigns_user_idx ON weave_branding_ad_campaigns(user_id,created_at DESC)")
    await db.query("CREATE TABLE IF NOT EXISTS weave_branding_template_features(sample_id varchar(80) PRIMARY KEY,featured boolean NOT NULL DEFAULT false,updated_by uuid REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now())")
  })().catch(error=>{ensured=null;throw error})
  return ensured
}
async function readDoor(userId:string){
  const row=(await getPool().query("SELECT public_code,display_name,description,example_price_ngn,active FROM weave_image_sample_providers WHERE user_id=$1::uuid LIMIT 1",[userId])).rows[0]
  if(!row)return null
  return {...row,url:getWeavePublicOrigin()+'/image-service/'+row.public_code}
}
export async function GET(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user)return json({success:false,error:'Sign in to open the business workshop.'},401)
  if(!roles.has(user.role))return json({success:false,error:'Not an eligible department.'},403)
  try{
    await Promise.all([ensureBrandingLaunchSchema(),ensureSampleCommerceSchema()])
    const db=getPool()
    const featured=(await db.query("SELECT sample_id FROM weave_branding_template_features WHERE featured=true ORDER BY updated_at DESC LIMIT 40")).rows.map(r=>r.sample_id)
    if(user.role==='admin'){
      const [roleCounts,campaignTotals,revenue,topKits]=await Promise.all([
        db.query("SELECT role,COUNT(*)::int AS launch_count FROM weave_branding_launch_plans GROUP BY role ORDER BY role"),
        db.query("SELECT COUNT(*)::int AS prepared,COUNT(*) FILTER(WHERE status='reported_shared')::int AS reported_shared,COUNT(*) FILTER(WHERE created_at>=now()-interval '7 days')::int AS last_seven_days FROM weave_branding_ad_campaigns"),
        db.query("SELECT COUNT(*)::int AS licenses,COALESCE(SUM(fee_system_switch),0)::numeric AS company_earned_system_switch FROM weave_image_sample_licenses WHERE fee_system_switch>0"),
        db.query("SELECT p.kit_id,COUNT(*)::int AS starters FROM weave_branding_launch_plans p GROUP BY p.kit_id ORDER BY starters DESC LIMIT 10"),
      ])
      return json({success:true,featured,kits:BRANDING_KITS,
        totals:{roles:roleCounts.rows,campaigns:campaignTotals.rows[0],licenses:revenue.rows[0],topKits:topKits.rows}})
    }
    const [plans,campaigns,orders,licensed,door]=await Promise.all([
      db.query("SELECT role,kit_id,business_name,offer_text,audience,customer_quote_ngn,daily_outreach_goal,created_at,updated_at FROM weave_branding_launch_plans WHERE user_id=$1::uuid",[user.id]),
      db.query("SELECT id,kit_id,sample_id,channel,headline,message,customer_door,status,external_post_url,created_at,reported_shared_at FROM weave_branding_ad_campaigns WHERE user_id=$1::uuid ORDER BY created_at DESC LIMIT 30",[user.id]),
      db.query("SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='completed')::int AS completed FROM weave_image_sample_requests WHERE provider_user_id=$1::uuid",[user.id]),
      db.query("SELECT COUNT(*)::int AS count FROM weave_image_sample_licenses WHERE user_id=$1::uuid",[user.id]),
      readDoor(user.id),
    ])
    return json({success:true,featured,plan:plans.rows[0]||null,campaigns:campaigns.rows,
      door,work:{requests:orders.rows[0]||{total:0,completed:0},licensed:licensed.rows[0]?.count||0},kits:BRANDING_KITS})
  }catch(error){
    console.error('[branding launch] GET failed',error)
    return json({success:false,error:'Company branding records are temporarily unavailable.'},503)
  }
}
export async function POST(req:NextRequest){
  const user=await getAuthUser(req)
  if(!user)return json({success:false,error:'Sign in to use company branding systems.'},401)
  if(!roles.has(user.role))return json({success:false,error:'Not an eligible department.'},403)
  const body=await req.json().catch(()=>({}))
  const action=clean(body.action,32)
  try{
    await Promise.all([ensureBrandingLaunchSchema(),ensureSampleCommerceSchema()])
    const db=getPool()
    if(action==='feature_template'){
      if(user.role!=='admin')return json({success:false,error:'Only Administrations may curate the company catalogue.'},403)
      const sampleId=clean(body.sampleId,80)
      if(!findImageSample(sampleId)||typeof body.featured!=='boolean')return json({success:false,error:'Select a valid original template.'},400)
      await db.query("INSERT INTO weave_branding_template_features(sample_id,featured,updated_by) VALUES($1,$2,$3::uuid) ON CONFLICT(sample_id) DO UPDATE SET featured=EXCLUDED.featured,updated_by=EXCLUDED.updated_by,updated_at=now()",[sampleId,body.featured,user.id])
      await logAudit(user.id,'branding_template.featured',{sampleId,featured:body.featured})
      return json({success:true,sampleId,featured:body.featured})
    }
    if(user.role==='admin')return json({success:false,error:'Administrations curates templates; starter businesses belong to Agents, Bridgers and Clients.'},403)
    if(action==='save_plan'){
      const kitId=clean(body.kitId,32),kit=getBrandingKit(kitId)
      const businessName=clean(body.businessName,100),offer=clean(body.offer,260),audience=clean(body.audience,150)
      const quote=body.quoteNgn===null||body.quoteNgn===''||body.quoteNgn===undefined?null:Number(body.quoteNgn)
      const dailyGoal=Number(body.dailyGoal)
      if(!kit||businessName.length<3||offer.length<8||audience.length<3||quote!==null&&(!Number.isFinite(quote)||quote<0||quote>100000000)
        ||!Number.isInteger(dailyGoal)||dailyGoal<1||dailyGoal>30)
        return json({success:false,error:'Choose a business, a genuine offer, an audience, a valid quote and a daily goal.'},400)
      const row=(await db.query(["INSERT INTO weave_branding_launch_plans",
        "(user_id,role,kit_id,business_name,offer_text,audience,customer_quote_ngn,daily_outreach_goal)",
        "VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8)",
        "ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role,kit_id=EXCLUDED.kit_id,business_name=EXCLUDED.business_name,",
        "offer_text=EXCLUDED.offer_text,audience=EXCLUDED.audience,customer_quote_ngn=EXCLUDED.customer_quote_ngn,",
        "daily_outreach_goal=EXCLUDED.daily_outreach_goal,updated_at=now()",
        "RETURNING role,kit_id,business_name,offer_text,audience,customer_quote_ngn,daily_outreach_goal,updated_at"].join(' '),
        [user.id,user.role,kitId,businessName,offer,audience,quote,dailyGoal])).rows[0]
      return json({success:true,plan:row})
    }
    if(action==='prepare_ad'){
      const plan=(await db.query("SELECT * FROM weave_branding_launch_plans WHERE user_id=$1::uuid",[user.id])).rows[0]
      if(!plan)return json({success:false,error:'Save a business launch plan first.'},409)
      const kit=getBrandingKit(plan.kit_id)
      const sampleId=clean(body.sampleId,80),headline=clean(body.headline,110)
      const channel=clean(body.channel,40),clientKey=clean(body.clientKey,50)
      if(!kit||!kit.sampleIds.some(id=>id===sampleId)||!findImageSample(sampleId)||!channels.has(channel)||!uuid(clientKey)||headline.length<8)
        return json({success:false,error:'Choose a valid kit image, channel, headline and original request.'},400)
      const door=await readDoor(user.id)
      const copy=headline+'\n\n'+createBrandingAd({businessName:plan.business_name,kitId:kit.id,
        audience:plan.audience,offer:plan.offer_text,quoteNgn:plan.customer_quote_ngn===null?null:Number(plan.customer_quote_ngn),
        customerDoor:door?.active?door.url:''})
      const connection=await db.connect()
      try{
        await connection.query('BEGIN')
        await connection.query('SELECT pg_advisory_xact_lock(hashtext($1))',['branding-ad:'+user.id])
        const replay=(await connection.query("SELECT * FROM weave_branding_ad_campaigns WHERE user_id=$1::uuid AND client_key=$2::uuid",[user.id,clientKey])).rows[0]
        if(replay){await connection.query('COMMIT');return json({success:true,ad:replay,existing:true})}
        const count=(await connection.query("SELECT COUNT(*)::int AS count FROM weave_branding_ad_campaigns WHERE user_id=$1::uuid AND created_at>=now()-interval '24 hours'",[user.id])).rows[0].count
        if(Number(count)>=12){await connection.query('ROLLBACK');return json({success:false,error:'You have reached the 12-ad preparation limit for this 24-hour period.'},429)}
        const ad=(await connection.query(["INSERT INTO weave_branding_ad_campaigns(user_id,client_key,kit_id,sample_id,channel,headline,message,customer_door)",
          "VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8) RETURNING *"].join(' '),
          [user.id,clientKey,kit.id,sampleId,channel,headline,copy,door?.active?door.url:null])).rows[0]
        await connection.query('COMMIT')
        return json({success:true,ad},201)
      }catch(error){await connection.query('ROLLBACK').catch(()=>{});throw error}finally{connection.release()}
    }
    if(action==='report_share'){
      const id=clean(body.id,50),external=clean(body.externalPostUrl,500)
      if(!uuid(id))return json({success:false,error:'Choose a valid advertisement.'},400)
      if(external){
        try{const url=new URL(external);if(!['https:','http:'].includes(url.protocol)||!url.hostname.includes('.'))throw Error('invalid')}
        catch{return json({success:false,error:'Provide a valid external post URL or leave it blank.'},400)}
      }
      const row=(await db.query(["UPDATE weave_branding_ad_campaigns",
        "SET status='reported_shared',reported_shared_at=COALESCE(reported_shared_at,now()),external_post_url=COALESCE(NULLIF($3,''),external_post_url)",
        "WHERE id=$1::uuid AND user_id=$2::uuid RETURNING id,status,reported_shared_at,external_post_url"].join(' '),
        [id,user.id,external])).rows[0]
      if(!row)return json({success:false,error:'Advertisement not found for this account.'},404)
      return json({success:true,ad:row,note:'Self-reported sharing is not verified reach or customer payment.'})
    }
    return json({success:false,error:'Unknown company branding action.'},400)
  }catch(error){
    console.error('[branding launch] POST failed',error)
    return json({success:false,error:'The requested business movement could not be recorded.'},503)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getSql } from '@/lib/db'
import { ensureBridgerNumberEngineSchema, normalizeE164 } from '@/lib/bridger-number-engine'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='admin') return NextResponse.json({error:'Forbidden'},{status:403})
  const sql=getSql(); await ensureBridgerNumberEngineSchema(sql)
  const numbers=await sql`
    SELECT n.*,u.name AS assigned_name,u.email AS assigned_email
    FROM bridger_whatsapp_numbers n
    LEFT JOIN users u ON u.id=n.assigned_to
    ORDER BY n.created_at DESC
    LIMIT 500
  `
  return NextResponse.json({success:true,numbers},{headers:{'Cache-Control':'private, no-store'}})
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='admin') return NextResponse.json({error:'Forbidden'},{status:403})
  const body=await request.json()
  const phone=normalizeE164(body.phone)
  const country=String(body.country||'').trim().slice(0,100)
  const provider='Aphone'
  const providerReference=String(body.providerReference||'').trim().slice(0,220)
  const notes=String(body.notes||'').trim().slice(0,2000)
  const acquisitionCost=body.acquisitionCost===''||body.acquisitionCost==null?null:Number(body.acquisitionCost)
  const price=Number(body.priceFlameCoin)
  if(!phone) return NextResponse.json({error:'Enter the provisioned number in E.164 format, for example +2348012345678.'},{status:400})
  if(!country) return NextResponse.json({error:'Country is required'},{status:400})
  if(acquisitionCost!==null&&(!Number.isFinite(acquisitionCost)||acquisitionCost<0)) return NextResponse.json({error:'Valid Aphone acquisition cost is required'},{status:400})
  if(!Number.isFinite(price)||price<0) return NextResponse.json({error:'Valid Flame Coin price is required'},{status:400})
  const sql=getSql(); await ensureBridgerNumberEngineSchema(sql)
  try{
    const [number]=await sql`
      INSERT INTO bridger_whatsapp_numbers
        (phone_e164,country,provider,provider_reference,acquisition_cost,price_flame_coin,status,notes,created_by)
      VALUES
        (${phone},${country},${provider},${providerReference||null},${acquisitionCost},${price},'available',${notes||null},${user.id}::uuid)
      RETURNING *
    `
    return NextResponse.json({success:true,number})
  }catch(error:any){
    if(String(error?.message||'').toLowerCase().includes('unique')) return NextResponse.json({error:'That number is already in the Number Engine.'},{status:409})
    console.error('[Number Engine admin POST]',error)
    return NextResponse.json({error:'Unable to add number'},{status:500})
  }
}

export async function PATCH(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='admin') return NextResponse.json({error:'Forbidden'},{status:403})
  const body=await request.json(); const id=String(body.id||'')
  const status=String(body.status||'')
  if(!['available','reserved','suspended','retired'].includes(status)) return NextResponse.json({error:'Invalid inventory status'},{status:400})
  const sql=getSql(); await ensureBridgerNumberEngineSchema(sql)
  const [number]=await sql`
    UPDATE bridger_whatsapp_numbers SET status=${status},updated_at=NOW()
    WHERE id=${id}::uuid AND assigned_to IS NULL
    RETURNING *
  `
  if(!number) return NextResponse.json({error:'Only unassigned inventory can be changed here'},{status:409})
  return NextResponse.json({success:true,number})
}

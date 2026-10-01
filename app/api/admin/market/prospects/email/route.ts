import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { addEmailProspects, ensureMarketTables } from '@/lib/market'
import { sql } from '@/lib/db'

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='admin')return NextResponse.json({error:'Administration access required'},{status:403})
  try{
    await ensureMarketTables()
    const rows=await sql`
      SELECT status,COUNT(*)::int AS count
      FROM market_prospect_contacts
      WHERE channel='email'
      GROUP BY status
    `
    return NextResponse.json({success:true,counts:Object.fromEntries(rows.map((r:any)=>[r.status,Number(r.count)]))})
  }catch(error){
    console.error('[admin email prospects] stats failed',error)
    return NextResponse.json({error:'Unable to read email Prospect inventory'},{status:500})
  }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='admin')return NextResponse.json({error:'Administration access required'},{status:403})
  try{
    const body=await request.json()
    const emails=Array.isArray(body.emails)
      ? body.emails
      : String(body.emails||'').split(/[\n,;]+/)
    const result=await addEmailProspects(user.id,emails.map(String),String(body.source||'email_engine'))
    return NextResponse.json({success:true,...result})
  }catch(error){
    console.error('[admin email prospects] intake failed',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to add email Prospects'},{status:400})
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { ensureMarketTables } from '@/lib/market'
import { verifyProspectEmailUnsubscribe } from '@/lib/prospect-email-engine'

function validUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function unsubscribe(request:NextRequest){
  const oid=String(request.nextUrl.searchParams.get('oid')||'')
  const sig=String(request.nextUrl.searchParams.get('sig')||'')
  if(!validUuid(oid)||!verifyProspectEmailUnsubscribe(oid,sig)){
    return NextResponse.json({error:'Invalid unsubscribe request'},{status:400})
  }

  await ensureMarketTables()
  const rows=await sql`
    UPDATE market_prospect_outreach
    SET status='unsubscribed',last_activity_at=NOW()
    WHERE id=${oid}::uuid
      AND channel='email'
      AND status<>'converted'
    RETURNING contact_id
  `
  if(rows[0]){
    await sql`
      UPDATE market_prospect_contacts
      SET status='unsubscribed'
      WHERE id=${rows[0].contact_id}::uuid
    `
  }

  return new NextResponse(
    '<!doctype html><html><body style="font-family:Arial,sans-serif;background:#050b12;color:#e8edf4;padding:40px"><main style="max-width:560px;margin:auto"><h1>WEAVE email outreach ended</h1><p>This address will not receive further promotional Prospect email from this movement.</p></main></body></html>',
    {status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}},
  )
}

export async function GET(request:NextRequest){
  return unsubscribe(request)
}

export async function POST(request:NextRequest){
  return unsubscribe(request)
}

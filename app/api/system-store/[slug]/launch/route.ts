import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { ensureWeaveSystemStoreSchema, isSafeStoreDeliveryUrl } from '@/lib/weave-system-store'

export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const sql=getFileFolderDb()
  await ensureWeaveSystemStoreSchema(sql)
  const [row]=await sql`
    SELECT p.id AS publication_id,p.current_version_id,v.entry_url
    FROM weave_system_store_publications p
    JOIN weave_system_store_versions v ON v.id=p.current_version_id
    WHERE p.public_slug=${slug} AND p.status='approved' AND v.review_status='approved'
    LIMIT 1
  `
  if(!row)return NextResponse.json({error:'Published system not found'},{status:404})
  if(!row.entry_url||!isSafeStoreDeliveryUrl(String(row.entry_url)))return NextResponse.json({error:'This system version has no live entry'},{status:409})

  await sql`UPDATE weave_system_store_publications SET open_count=open_count+1,updated_at=NOW() WHERE id=${row.publication_id}::uuid`
  await sql`
    INSERT INTO weave_system_store_events (publication_id,version_id,event_type,visitor_key,metadata)
    VALUES (${row.publication_id}::uuid,${row.current_version_id}::uuid,'open',${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||null},'{}'::jsonb)
  `
  const destination=new URL(String(row.entry_url),request.nextUrl.origin)
  return NextResponse.redirect(destination,302)
}

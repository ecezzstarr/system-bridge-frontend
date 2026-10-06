import { Storage } from '@google-cloud/storage'
import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { ensureWeaveSystemStoreSchema, isSafeStoreDeliveryUrl } from '@/lib/weave-system-store'

export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const sql=getFileFolderDb()
  await ensureWeaveSystemStoreSchema(sql)
  const [row]=await sql`
    SELECT p.id AS publication_id,p.current_version_id,p.price,p.currency,v.package_url,v.storage_object,v.package_name
    FROM weave_system_store_publications p
    JOIN weave_system_store_versions v ON v.id=p.current_version_id
    WHERE p.public_slug=${slug} AND p.status='approved' AND v.review_status='approved'
    LIMIT 1
  `
  if(!row)return NextResponse.json({error:'Published system not found'},{status:404})
  if(Number(row.price||0)>0){
    return NextResponse.json({error:'Purchase entitlement is required before downloading this paid system. Continue through the publisher Customer Door.',price:Number(row.price),currency:row.currency},{status:402})
  }

  let destination:string|null=null
  if(row.storage_object){
    const bucketName=String(process.env.WEAVE_SYSTEM_STORE_BUCKET||'').trim()
    if(!bucketName)return NextResponse.json({error:'WEAVE package delivery is temporarily unavailable'},{status:503})
    const storage=new Storage()
    const [url]=await storage.bucket(bucketName).file(String(row.storage_object)).getSignedUrl({
      version:'v4',action:'read',expires:Date.now()+10*60*1000,
      responseDisposition:`attachment; filename="${String(row.package_name||'weave-system-package').replace(/["\r\n]/g,'-')}"`,
    })
    destination=url
  }else if(row.package_url&&isSafeStoreDeliveryUrl(String(row.package_url))){
    destination=String(row.package_url)
  }
  if(!destination)return NextResponse.json({error:'This system version has no downloadable package'},{status:409})

  await sql`UPDATE weave_system_store_publications SET download_count=download_count+1,updated_at=NOW() WHERE id=${row.publication_id}::uuid`
  await sql`
    INSERT INTO weave_system_store_events (publication_id,version_id,event_type,visitor_key,metadata)
    VALUES (${row.publication_id}::uuid,${row.current_version_id}::uuid,'download',${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||null},'{}'::jsonb)
  `
  return NextResponse.redirect(destination,302)
}

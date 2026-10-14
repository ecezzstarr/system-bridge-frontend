import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'node:stream'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { ensureWeaveSystemStoreSchema, isSafeStoreDeliveryUrl } from '@/lib/weave-system-store'
import { contentTypeForObject, createMediaReadStream, getMediaObjectInfo } from '@/lib/weave-media-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const sql=getFileFolderDb()
  await ensureWeaveSystemStoreSchema(sql)
  const [row]=await sql`
    SELECT p.id AS publication_id,p.current_version_id,p.price,p.currency,v.package_url,v.storage_object,v.package_name,v.content_type
    FROM weave_system_store_publications p
    JOIN weave_system_store_versions v ON v.id=p.current_version_id
    WHERE p.public_slug=${slug} AND p.status='approved' AND v.review_status='approved'
    LIMIT 1
  `
  if(!row)return NextResponse.json({error:'Published system not found'},{status:404})
  if(Number(row.price||0)>0){
    return NextResponse.json({error:'Purchase entitlement is required before downloading this paid system. Continue through the publisher Customer Door.',price:Number(row.price),currency:row.currency},{status:402})
  }

  await sql`UPDATE weave_system_store_publications SET download_count=download_count+1,updated_at=NOW() WHERE id=${row.publication_id}::uuid`
  await sql`
    INSERT INTO weave_system_store_events (publication_id,version_id,event_type,visitor_key,metadata)
    VALUES (${row.publication_id}::uuid,${row.current_version_id}::uuid,'download',${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||null},'{}'::jsonb)
  `

  if(row.storage_object){
    const objectName=String(row.storage_object)
    try{
      const info=await getMediaObjectInfo(objectName)
      const fileName=String(row.package_name||objectName.split('/').pop()||'weave-system-package').replace(/["\r\n]/g,'-')
      return new Response(Readable.toWeb(createMediaReadStream(objectName)) as ReadableStream<Uint8Array>,{
        status:200,
        headers:{
          'Content-Type':String(row.content_type||info.metadata.contentType||contentTypeForObject(objectName)),
          'Content-Length':String(info.size),
          'Content-Disposition':`attachment; filename="${fileName}"`,
          'Cache-Control':'private, no-store',
        },
      })
    }catch(error){
      // Older approved packages may still live in the former Google bucket.
      // Keep a credential-free compatibility path when that bucket/object is public.
      const legacyBucket=String(process.env.WEAVE_SYSTEM_STORE_BUCKET||'').trim()
      if(legacyBucket){
        return NextResponse.redirect(`https://storage.googleapis.com/${encodeURIComponent(legacyBucket)}/${objectName.split('/').map(encodeURIComponent).join('/')}`,302)
      }
      console.error('[System Store] local package unavailable:',error)
      return NextResponse.json({error:'WEAVE package delivery is temporarily unavailable'},{status:503})
    }
  }

  if(row.package_url&&isSafeStoreDeliveryUrl(String(row.package_url))){
    return NextResponse.redirect(String(row.package_url),302)
  }
  return NextResponse.json({error:'This system version has no downloadable package'},{status:409})
}

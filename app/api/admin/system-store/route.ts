import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { ensureWeaveSystemStoreSchema } from '@/lib/weave-system-store'

async function requireAdmin(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return {user:null,error:NextResponse.json({error:'Unauthorized'},{status:401})}
  if(user.role!=='admin')return {user:null,error:NextResponse.json({error:'Administration access required'},{status:403})}
  return {user,error:null}
}

async function queue(sql:any){
  return sql`
    SELECT
      p.id AS publication_id,p.weave_system_id,p.public_slug,p.system_name,p.summary,p.category,p.price,p.currency,
      p.distribution_scope,p.status AS publication_status,p.submitted_at,
      v.id AS version_id,v.version_name,v.version_code,v.package_type,v.package_name,v.entry_url,v.package_url,
      v.storage_object,v.content_type,v.package_size_bytes,v.package_sha256,v.permissions,v.screenshots,
      v.release_notes,v.review_status,v.review_note,v.submitted_at AS version_submitted_at,
      u.id AS client_id,u.name AS client_name,u.business_name,u.file_number,
      s.title AS built_system_title,s.system_type AS built_system_type,s.status AS built_system_status
    FROM weave_system_store_versions v
    JOIN weave_system_store_publications p ON p.id=v.publication_id
    JOIN users u ON u.id=p.client_id
    JOIN client_built_systems s ON s.id=p.system_id
    WHERE v.review_status='submitted'
    ORDER BY v.submitted_at ASC
    LIMIT 200
  `
}

export async function GET(request:NextRequest){
  const auth=await requireAdmin(request)
  if(!auth.user)return auth.error!
  const sql=getFileFolderDb()
  await ensureWeaveSystemStoreSchema(sql)
  const pending=await queue(sql)
  const published=await sql`
    SELECT p.weave_system_id,p.public_slug,p.system_name,p.category,p.status,p.download_count,p.open_count,p.approved_at,
      v.version_name,v.version_code,v.package_type,u.name AS client_name,u.business_name
    FROM weave_system_store_publications p
    LEFT JOIN weave_system_store_versions v ON v.id=p.current_version_id
    JOIN users u ON u.id=p.client_id
    WHERE p.status IN ('approved','withdrawn','rejected')
    ORDER BY p.updated_at DESC LIMIT 120
  `
  return NextResponse.json({pending,published},{headers:{'Cache-Control':'private, no-store'}})
}

export async function PATCH(request:NextRequest){
  const auth=await requireAdmin(request)
  if(!auth.user)return auth.error!
  const sql=getFileFolderDb()
  await ensureWeaveSystemStoreSchema(sql)
  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'').trim()
  const versionId=String(body.version_id||'').trim()
  const reviewNote=String(body.review_note||'').trim().slice(0,4000)||null
  if(!versionId)return NextResponse.json({error:'Version is required'},{status:400})

  const [version]=await sql`
    SELECT v.*,p.id AS publication_id,p.client_id,p.system_id,p.status AS publication_status,s.status AS built_system_status
    FROM weave_system_store_versions v
    JOIN weave_system_store_publications p ON p.id=v.publication_id
    JOIN client_built_systems s ON s.id=p.system_id
    WHERE v.id=${versionId}::uuid
    LIMIT 1
  `
  if(!version)return NextResponse.json({error:'System version not found'},{status:404})
  if(version.review_status!=='submitted')return NextResponse.json({error:'Only submitted versions can be reviewed'},{status:409})

  if(action==='approve'){
    if(version.built_system_status!=='active')return NextResponse.json({error:'Client built system is no longer active'},{status:409})
    await sql`
      UPDATE weave_system_store_versions
      SET review_status='approved',review_note=${reviewNote},reviewed_by=${auth.user.id}::uuid,reviewed_at=NOW(),approved_at=NOW()
      WHERE id=${version.id}::uuid
    `
    const [publication]=await sql`
      UPDATE weave_system_store_publications
      SET status='approved',current_version_id=${version.id}::uuid,approved_at=NOW(),withdrawn_at=NULL,updated_at=NOW()
      WHERE id=${version.publication_id}::uuid
      RETURNING *
    `
    try{
      await sql`
        INSERT INTO notifications (user_id,type,title,content,link)
        VALUES (${version.client_id}::uuid,'system_store','System approved for WEAVE Store',${`Your system version has passed Administration verification and is now published as ${publication.system_name}.`},${`/system-store/${publication.public_slug}`})
      `
    }catch(error){console.error('[system-store] approval notification failed',error)}
    return NextResponse.json({success:true,publication})
  }

  if(action==='reject'){
    await sql`
      UPDATE weave_system_store_versions
      SET review_status='rejected',review_note=${reviewNote},reviewed_by=${auth.user.id}::uuid,reviewed_at=NOW()
      WHERE id=${version.id}::uuid
    `
    await sql`
      UPDATE weave_system_store_publications
      SET status=CASE WHEN current_version_id IS NULL THEN 'rejected' ELSE status END,updated_at=NOW()
      WHERE id=${version.publication_id}::uuid
    `
    try{
      await sql`
        INSERT INTO notifications (user_id,type,title,content,link)
        VALUES (${version.client_id}::uuid,'system_store','System Store review needs changes',${reviewNote||'Administration did not approve this submitted system version.'},'/client/system-store')
      `
    }catch(error){console.error('[system-store] rejection notification failed',error)}
    return NextResponse.json({success:true})
  }

  return NextResponse.json({error:'Review action must be approve or reject'},{status:400})
}

import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql} from '@/lib/db'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Authorization, Cookie'}

/**
 * Administrations-only, read-only File Folder health check.
 * Lists factual owner/Folder/workshop mismatches without allocating purchases,
 * changing private access, charging wallets or manufacturing verification.
 */
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='admin')
    return NextResponse.json({error:'Administrations access required'},{status:403,headers})
  try{
    const [schema]=await sql`
      SELECT to_regclass('public.client_file_folders')::text AS folders,
        to_regclass('public.client_system_workshops')::text AS workshops,
        to_regclass('public.weave_open_world_domains')::text AS domains
    `
    if(!schema?.folders||!schema?.workshops){
      return NextResponse.json({
        success:true,health:'schema_review_required',checkedAt:new Date().toISOString(),
        missingTables:[!schema?.folders?'client_file_folders':null,!schema?.workshops?'client_system_workshops':null].filter(Boolean),
        counts:null,issues:[],
        action:'Restore the original File Folder schema through authorized Administrations database migration. Do not invent Client ownership.',
      },{headers})
    }
    const [counts]=await sql`
      SELECT COUNT(*)::int AS owners,
        COUNT(*) FILTER(WHERE f.id IS NULL)::int AS missing_folders,
        COUNT(*) FILTER(WHERE f.id IS NOT NULL AND f.status<>'active')::int AS inactive_folders,
        COUNT(*) FILTER(WHERE f.id IS NOT NULL AND f.file_number<>u.file_number)::int AS mismatched_folders,
        COUNT(*) FILTER(WHERE w.id IS NULL)::int AS missing_workshops,
        COUNT(*) FILTER(WHERE w.id IS NOT NULL AND w.file_number<>u.file_number)::int AS mismatched_workshops
      FROM users u
      LEFT JOIN client_file_folders f ON f.client_id=u.id
      LEFT JOIN client_system_workshops w ON w.client_id=u.id
      WHERE u.role='client' AND COALESCE(u.is_active,true)=true
        AND u.file_number IS NOT NULL
    `
    const issues=await sql`
      SELECT u.id AS client_id,u.name,u.file_number,
        f.file_number AS folder_number,f.status AS folder_status,
        w.file_number AS workshop_number,
        CASE
          WHEN f.id IS NULL THEN 'missing_owned_folder'
          WHEN f.status<>'active' THEN 'inactive_owned_folder'
          WHEN f.file_number<>u.file_number THEN 'folder_number_mismatch'
          WHEN w.id IS NULL THEN 'missing_workshop'
          WHEN w.file_number<>u.file_number THEN 'workshop_number_mismatch'
          ELSE 'ready'
        END AS issue
      FROM users u
      LEFT JOIN client_file_folders f ON f.client_id=u.id
      LEFT JOIN client_system_workshops w ON w.client_id=u.id
      WHERE u.role='client' AND COALESCE(u.is_active,true)=true
        AND u.file_number IS NOT NULL
        AND (f.id IS NULL OR f.status<>'active' OR f.file_number<>u.file_number
             OR w.id IS NULL OR w.file_number<>u.file_number)
      ORDER BY u.file_number
      LIMIT 40
    `
    let missingDomains:number|null=null
    if(schema.domains){
      const [domainCount]=await sql`
        SELECT COUNT(*)::int AS missing_domains
        FROM users u
        JOIN client_file_folders f ON f.client_id=u.id
          AND f.file_number=u.file_number AND f.status='active'
        LEFT JOIN weave_open_world_domains d ON d.client_id=u.id
          AND d.file_number=u.file_number
        WHERE u.role='client' AND COALESCE(u.is_active,true)=true
          AND u.file_number IS NOT NULL AND d.id IS NULL
      `
      missingDomains=Number(domainCount?.missing_domains||0)
    }
    const unresolved=Number(counts.missing_folders)+Number(counts.inactive_folders)+
      Number(counts.mismatched_folders)+Number(counts.missing_workshops)+Number(counts.mismatched_workshops)
    return NextResponse.json({
      success:true,health:unresolved?'review_required':'owner_records_consistent',
      checkedAt:new Date().toISOString(),
      counts:{...counts,missing_domains:missingDomains},
      issues,
      action:unresolved
        ?'Review each existing Client File Number, confirmed purchase or offer, exact owner and workshop before repairing. Never automatically assign a folder to an unrelated account.'
        :'Active Client File Numbers, private Folder ownership and first workshops are structurally aligned. This does not by itself confirm device rendering or payment settlement.',
    },{headers})
  }catch(error){
    console.error('[admin/file-folder-health]',error)
    return NextResponse.json({error:'File Folder health audit unavailable. Investigate database or schema errors.'},{status:500,headers})
  }
}

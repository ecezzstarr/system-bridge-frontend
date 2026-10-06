import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { ensureWeaveSystemStoreSchema } from '@/lib/weave-system-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const sql = getFileFolderDb()
  await ensureWeaveSystemStoreSchema(sql)
  const q = String(request.nextUrl.searchParams.get('q') || '').trim().toLowerCase().slice(0,120)
  const category = String(request.nextUrl.searchParams.get('category') || '').trim().slice(0,80)
  const packageType = String(request.nextUrl.searchParams.get('type') || '').trim().slice(0,40)

  const systems = await sql`
    SELECT
      p.weave_system_id,p.public_slug,p.system_name,p.summary,p.category,p.icon_url,p.price,p.currency,
      p.distribution_scope,p.download_count,p.open_count,p.approved_at,
      v.id AS version_id,v.version_name,v.version_code,v.package_type,v.package_name,v.entry_url,
      v.package_sha256,v.permissions,v.screenshots,v.release_notes,v.approved_at AS version_approved_at,
      u.name AS publisher_name,u.business_name AS publisher_business,
      bs.public_slug AS customer_door_slug
    FROM weave_system_store_publications p
    JOIN weave_system_store_versions v ON v.id=p.current_version_id
    JOIN users u ON u.id=p.client_id
    LEFT JOIN client_business_stores bs ON bs.client_id=p.client_id AND bs.file_number=p.file_number
    WHERE p.status='approved'
      AND v.review_status='approved'
      AND (${q}='' OR LOWER(p.system_name||' '||COALESCE(p.summary,'')||' '||p.category||' '||COALESCE(v.package_type,'')) LIKE ${`%${q}%`})
      AND (${category}='' OR p.category=${category})
      AND (${packageType}='' OR v.package_type=${packageType})
    ORDER BY p.approved_at DESC NULLS LAST,p.created_at DESC
    LIMIT 240
  `

  return NextResponse.json({ systems }, { headers: { 'Cache-Control':'public, max-age=60, stale-while-revalidate=300' } })
}

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getFileFolderDb, ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import {
  ensureFileFolderWorldSchema,
  getFileFolderWorldSnapshot,
} from '@/lib/client-file-folder-world'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileNumber: string }> },
) {
  try {
    const user = await getAuthUser(request)
    if (!user || !['admin','agent','bridger'].includes(user.role || '')) {
      return NextResponse.json({ error: 'WEAVE support access required' }, { status: 403 })
    }

    const { fileNumber } = await params
    const decoded = decodeURIComponent(fileNumber || '').trim()
    if (!decoded) return NextResponse.json({ error: 'File Number required' }, { status: 400 })

    const sql = getFileFolderDb()
    await ensureClientFileFolderSchema(sql)
    await ensureClientWorkshopSchema(sql)
    await ensureFileFolderWorldSchema(sql)

    const [folder] = await sql`
      SELECT
        cff.id,
        cff.client_id,
        cff.file_number,
        cff.client_name,
        cff.workshop_type,
        cff.status,
        ff.bridger_id,
        c.name AS client_account_name,
        c.business_name,
        b.name AS bridger_name
      FROM client_file_folders cff
      LEFT JOIN file_folders ff ON ff.file_number=cff.file_number
      LEFT JOIN users c ON c.id=cff.client_id
      LEFT JOIN users b ON b.id=ff.bridger_id
      WHERE cff.file_number=${decoded}
      LIMIT 1
    `

    if (!folder?.client_id || folder.status !== 'active') {
      return NextResponse.json({ error: 'Active Client File Folder not found' }, { status: 404 })
    }

    let allowed = user.role === 'admin'

    if (user.role === 'bridger') {
      allowed = String(folder.bridger_id || '') === String(user.id)
    }

    if (user.role === 'agent' && folder.bridger_id) {
      const [relation] = await sql`
        SELECT id
        FROM users
        WHERE id=${folder.bridger_id}::uuid
          AND assigned_agent_id=${user.id}::uuid
          AND role='bridger'
        LIMIT 1
      `
      allowed = Boolean(relation)
    }

    if (!allowed) {
      return NextResponse.json({ error: 'This File Folder is outside your support position' }, { status: 403 })
    }

    const [workshop] = await sql`
      SELECT id,workshop_type,title,description
      FROM client_system_workshops
      WHERE client_id=${folder.client_id}::uuid
        AND file_number=${folder.file_number}
      LIMIT 1
    `

    if (!workshop) {
      return NextResponse.json({
        error: 'The Client has not completed personalized workshop formation yet',
      }, { status: 409 })
    }

    const world = await getFileFolderWorldSnapshot(
      sql,
      String(folder.client_id),
      String(folder.file_number),
    )

    return NextResponse.json({
      success: true,
      client: {
        id: folder.client_id,
        name: folder.client_account_name || folder.client_name || 'Client',
        business_name: folder.business_name || null,
        file_number: folder.file_number,
      },
      folder: {
        id: folder.id,
        status: folder.status,
        workshop_type: folder.workshop_type,
      },
      workshop,
      bridger: folder.bridger_id ? {
        id: folder.bridger_id,
        name: folder.bridger_name || 'Bridger',
      } : null,
      world,
      support: {
        role: user.role,
        read_only_world: true,
        communication: 'WEAVE internal support only',
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[world/file-folder support]', error)
    return NextResponse.json({ error: 'Unable to enter Client File Folder' }, { status: 500 })
  }
}

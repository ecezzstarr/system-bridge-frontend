import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureClientFileFolderSchema(sql)

    let folders = []

    if (user.role === 'admin') {
      folders = await sql`
        SELECT ff.*, cff.client_id, cff.client_name, cff.workshop_type, cff.status AS client_folder_status, u.name as bridger_name, u.email as bridger_email
        FROM file_folders ff
        INNER JOIN client_file_folders cff ON cff.file_number = ff.file_number AND cff.status = 'active' AND cff.client_id IS NOT NULL
        LEFT JOIN users u ON ff.bridger_id = u.id
        ORDER BY cff.updated_at DESC
      `
    } else if (user.role === 'agent') {
      folders = await sql`
        SELECT ff.*, cff.client_id, cff.client_name, cff.workshop_type, cff.status AS client_folder_status, u.name as bridger_name, u.email as bridger_email
        FROM file_folders ff
        INNER JOIN client_file_folders cff ON cff.file_number = ff.file_number AND cff.status = 'active' AND cff.client_id IS NOT NULL
        LEFT JOIN users u ON ff.bridger_id = u.id
        WHERE ff.bridger_id IN (SELECT id FROM users WHERE assigned_agent_id = ${user.id}::uuid AND role = 'bridger')
        ORDER BY cff.updated_at DESC
      `
    } else if (user.role === 'bridger') {
      folders = await sql`
        SELECT ff.*, cff.client_id, cff.client_name, cff.workshop_type, cff.status AS client_folder_status, u.name as bridger_name, u.email as bridger_email
        FROM file_folders ff
        INNER JOIN client_file_folders cff ON cff.file_number = ff.file_number AND cff.status = 'active' AND cff.client_id IS NOT NULL
        LEFT JOIN users u ON ff.bridger_id = u.id
        WHERE ff.bridger_id = ${user.id}::uuid
        ORDER BY cff.updated_at DESC
      `
    } else if (user.role === 'client') {
      folders = await sql`
        SELECT ff.*, cff.client_id, cff.client_name, cff.workshop_type, cff.status AS client_folder_status, u.name as bridger_name, u.email as bridger_email
        FROM file_folders ff
        INNER JOIN client_file_folders cff ON cff.file_number = ff.file_number AND cff.status = 'active' AND cff.client_id = ${user.id}::uuid
        LEFT JOIN users u ON ff.bridger_id = u.id
        WHERE ff.file_number = ${user.file_number}
        ORDER BY cff.updated_at DESC
      `
    }

    return NextResponse.json({
      success: true,
      folders: folders || []
    })
  } catch (error: any) {
    console.error('[API File Folders] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

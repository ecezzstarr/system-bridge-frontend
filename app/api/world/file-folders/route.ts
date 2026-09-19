import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let folders = []

    if (user.role === 'admin') {
      folders = await sql`
        SELECT ff.*, u.name as bridger_name, u.email as bridger_email
        FROM file_folders ff
        LEFT JOIN users u ON ff.bridger_id = u.id
        ORDER BY ff.created_at DESC
      `
    } else if (user.role === 'agent') {
      folders = await sql`
        SELECT ff.*, u.name as bridger_name, u.email as bridger_email
        FROM file_folders ff
        LEFT JOIN users u ON ff.bridger_id = u.id
        WHERE ff.bridger_id IN (SELECT id FROM users WHERE assigned_agent_id = ${user.id}::uuid)
        ORDER BY ff.created_at DESC
      `
    } else if (user.role === 'bridger') {
      folders = await sql`
        SELECT ff.*, u.name as bridger_name, u.email as bridger_email
        FROM file_folders ff
        LEFT JOIN users u ON ff.bridger_id = u.id
        WHERE ff.bridger_id = ${user.id}::uuid
        ORDER BY ff.created_at DESC
      `
    } else if (user.role === 'client') {
      folders = await sql`
        SELECT ff.*, u.name as bridger_name, u.email as bridger_email
        FROM file_folders ff
        LEFT JOIN users u ON ff.bridger_id = u.id
        WHERE ff.file_number = ${user.file_number}
        ORDER BY ff.created_at DESC
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

import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'

export async function POST(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })

  return NextResponse.json({
    error: 'Manual Legion creation is closed. Legions must be subscribed Agents or Bridgers recruited through the Client Legion Quarter or accepted from Lifestyle applications.',
    recruitmentPath: '/client/enterprise/legions',
  }, { status: 409 })
}

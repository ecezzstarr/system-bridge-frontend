import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'
import { recordSystemEvent } from '@/lib/system-events'

function clean(value: unknown, max = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })

  try {
    await ensureEnterpriseDreamSchema(sql)
    const [application] = await sql`
      SELECT id,file_number,requested_position,enterprise_name,status
      FROM enterprise_applications
      WHERE client_id=${clientId}::uuid
      LIMIT 1
    `
    if (!application || application.status !== 'approved') {
      return NextResponse.json({ error: 'Legion access opens only after Administration approves the enterprise.' }, { status: 403 })
    }

    const body = await request.json()
    const name = clean(body.name, 255)
    const contact = clean(body.contact, 255) || null
    const functionTitle = clean(body.functionTitle, 255)
    const livelihoodRole = clean(body.livelihoodRole, 4000) || null
    const profitParticipation = clean(body.profitParticipation, 4000) || null
    if (!name || !functionTitle) return NextResponse.json({ error: 'Legion name and enterprise function are required.' }, { status: 400 })

    const [legion] = await sql`
      INSERT INTO enterprise_legions (
        enterprise_application_id,client_id,file_number,name,contact,function_title,livelihood_role,profit_participation
      )
      VALUES (
        ${application.id}::uuid,${clientId}::uuid,${application.file_number},${name},${contact},
        ${functionTitle},${livelihoodRole},${profitParticipation}
      )
      RETURNING *
    `

    await recordSystemEvent({
      eventType: 'enterprise_legion_added',
      actorId: clientId,
      actorRole: 'client',
      subjectType: 'enterprise_legion',
      subjectId: String(legion.id),
      source: 'enterprise-dream',
      payload: { fileNumber: application.file_number, enterpriseName: application.enterprise_name, legionName: name, functionTitle },
    })

    return NextResponse.json({ success: true, legion }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to add Legion' }, { status: 500 })
  }
}

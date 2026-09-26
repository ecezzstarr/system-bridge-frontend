import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'
import { recordSystemEvent } from '@/lib/system-events'
import { getInstalledCapabilityTotals } from '@/lib/client-growth-world'

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

    const [quarters] = await sql`
      SELECT id
      FROM client_built_systems
      WHERE client_id=${clientId}::uuid
        AND file_number=${application.file_number}
        AND system_type='legion_quarters'
        AND status='active'
      LIMIT 1
    `
    if (!quarters) {
      return NextResponse.json({
        error: 'Legion Quarters must finish construction before new Legions can enter the enterprise.',
        gate: 'legion_quarters',
      }, { status: 409 })
    }

    const capability = await getInstalledCapabilityTotals(sql, clientId)
    const legionCapacity = Math.max(3, 3 + Math.floor(capability.legionCapacityBonus))
    const [legionCount] = await sql`
      SELECT COUNT(*)::int AS count
      FROM enterprise_legions
      WHERE client_id=${clientId}::uuid
        AND active=true
    `
    if (Number(legionCount?.count || 0) >= legionCapacity) {
      return NextResponse.json({
        error: `Legion capacity reached (${legionCapacity}). Install Legion Capacity Modules during enterprise construction to expand it.`,
        gate: 'legion_capacity',
        capacity: legionCapacity,
      }, { status: 409 })
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

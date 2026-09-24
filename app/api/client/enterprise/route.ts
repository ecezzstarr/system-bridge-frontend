import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb, ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureEnterpriseDreamSchema, getEnterpriseDream } from '@/lib/enterprise-dream'
import { recordSystemEvent } from '@/lib/system-events'
import { notifyAdministrators } from '@/lib/deposit-notifications'

function cleanText(value: unknown, max = 10000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function resolveClient(request: NextRequest, sql: any) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  return resolveClientToken(token, sql)
}

export async function GET(request: NextRequest) {
  const sql = getFileFolderDb()
  const clientId = await resolveClient(request, sql)
  if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })

  try {
    await ensureClientFileFolderSchema(sql)
    await ensureClientWorkshopSchema(sql)
    await ensureEnterpriseDreamSchema(sql)

    const [folder] = await sql`
      SELECT file_number,weave_position,enterprise_status,enterprise_name,enterprise_sector,workshop_type
      FROM client_file_folders
      WHERE client_id=${clientId}::uuid
      LIMIT 1
    `
    const enterprise = await getEnterpriseDream(sql, clientId)

    return NextResponse.json({
      success: true,
      position: folder?.weave_position || 'client',
      enterprise_status: folder?.enterprise_status || 'none',
      workshop_type: folder?.workshop_type || 'formation',
      enterprise_name: folder?.enterprise_name || enterprise.application?.enterprise_name || null,
      sector: folder?.enterprise_sector || enterprise.application?.sector || null,
      application: enterprise.application,
      legions: enterprise.legions,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to load Enterprise Dream state' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sql = getFileFolderDb()
  const clientId = await resolveClient(request, sql)
  if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })

  try {
    await ensureClientFileFolderSchema(sql)
    await ensureClientWorkshopSchema(sql)
    await ensureEnterpriseDreamSchema(sql)

    const body = await request.json()
    const requestedPosition = cleanText(body.requestedPosition, 20).toLowerCase()
    const enterpriseName = cleanText(body.enterpriseName, 255)
    const sector = cleanText(body.sector, 255)
    const businessPlan = cleanText(body.businessPlan)
    const profitModel = cleanText(body.profitModel)
    const participantModel = cleanText(body.participantModel)
    const sustainabilityPlan = cleanText(body.sustainabilityPlan)
    const projectedRevenue = body.projectedMonthlyRevenue === '' || body.projectedMonthlyRevenue == null ? null : Number(body.projectedMonthlyRevenue)
    const projectedCosts = body.projectedMonthlyCosts === '' || body.projectedMonthlyCosts == null ? null : Number(body.projectedMonthlyCosts)

    if (!['lord', 'lady'].includes(requestedPosition)) {
      return NextResponse.json({ error: 'Choose Lord or Lady as the requested enterprise position.' }, { status: 400 })
    }
    if (!enterpriseName || !sector || !businessPlan || !profitModel || !participantModel || !sustainabilityPlan) {
      return NextResponse.json({ error: 'Enterprise name, sector, business plan, profit model, participant model and sustainability plan are required.' }, { status: 400 })
    }
    if ((projectedRevenue != null && (!Number.isFinite(projectedRevenue) || projectedRevenue < 0)) ||
        (projectedCosts != null && (!Number.isFinite(projectedCosts) || projectedCosts < 0))) {
      return NextResponse.json({ error: 'Projected revenue and costs must be valid non-negative numbers.' }, { status: 400 })
    }

    const [client] = await sql`SELECT id,name,file_number FROM users WHERE id=${clientId}::uuid AND role='client' LIMIT 1`
    if (!client?.file_number) return NextResponse.json({ error: 'An active Client File Folder is required.' }, { status: 409 })

    const [folder] = await sql`
      SELECT id,status,weave_position
      FROM client_file_folders
      WHERE client_id=${clientId}::uuid AND file_number=${client.file_number}
      LIMIT 1
    `
    if (!folder || folder.status !== 'active') return NextResponse.json({ error: 'Your File Folder must be active before enterprise elevation.' }, { status: 409 })
    if (folder.weave_position === 'lord' || folder.weave_position === 'lady') {
      return NextResponse.json({ error: 'This File Folder is already an approved enterprise.' }, { status: 409 })
    }

    const [application] = await sql`
      INSERT INTO enterprise_applications (
        client_id,file_number,requested_position,enterprise_name,sector,business_plan,
        profit_model,participant_model,sustainability_plan,projected_monthly_revenue,
        projected_monthly_costs,status,submitted_at,updated_at,admin_note,reviewed_at,reviewed_by
      )
      VALUES (
        ${clientId}::uuid,${client.file_number},${requestedPosition},${enterpriseName},${sector},${businessPlan},
        ${profitModel},${participantModel},${sustainabilityPlan},${projectedRevenue},${projectedCosts},
        'submitted',NOW(),NOW(),NULL,NULL,NULL
      )
      ON CONFLICT (client_id) DO UPDATE SET
        file_number=EXCLUDED.file_number,
        requested_position=EXCLUDED.requested_position,
        enterprise_name=EXCLUDED.enterprise_name,
        sector=EXCLUDED.sector,
        business_plan=EXCLUDED.business_plan,
        profit_model=EXCLUDED.profit_model,
        participant_model=EXCLUDED.participant_model,
        sustainability_plan=EXCLUDED.sustainability_plan,
        projected_monthly_revenue=EXCLUDED.projected_monthly_revenue,
        projected_monthly_costs=EXCLUDED.projected_monthly_costs,
        status='submitted',
        submitted_at=NOW(),
        updated_at=NOW(),
        admin_note=NULL,
        reviewed_at=NULL,
        reviewed_by=NULL
      WHERE enterprise_applications.status <> 'approved'
      RETURNING *
    `
    if (!application) return NextResponse.json({ error: 'Approved enterprise applications cannot be replaced.' }, { status: 409 })

    await sql`
      UPDATE client_file_folders
      SET enterprise_status='submitted',enterprise_name=${enterpriseName},enterprise_sector=${sector},updated_at=NOW()
      WHERE client_id=${clientId}::uuid
    `

    await recordSystemEvent({
      eventType: 'enterprise_plan_submitted',
      actorId: clientId,
      actorRole: 'client',
      subjectType: 'client_file_folder',
      subjectId: client.file_number,
      source: 'enterprise-dream',
      payload: { applicationId: application.id, requestedPosition, enterpriseName, sector },
    })

    await notifyAdministrators({
      type: 'enterprise_plan_submitted',
      title: `${requestedPosition === 'lady' ? 'Lady' : 'Lord'} elevation plan submitted`,
      content: `${client.name} submitted ${enterpriseName} for ${requestedPosition} elevation in File Folder ${client.file_number}.`,
      link: '/admin/enterprise-dream',
      fromUserId: clientId,
      fromUserName: client.name,
    })

    return NextResponse.json({ success: true, application }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to submit enterprise plan' }, { status: 500 })
  }
}

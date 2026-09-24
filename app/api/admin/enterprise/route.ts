import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'
import { recordSystemEvent } from '@/lib/system-events'
import { notifyUser } from '@/lib/deposit-notifications'

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response

  try {
    const sql = neon(process.env.DATABASE_URL!)
    await ensureClientFileFolderSchema(sql)
    await ensureClientWorkshopSchema(sql)
    await ensureEnterpriseDreamSchema(sql)

    const applications = await sql`
      SELECT a.*,u.name AS client_name,u.email AS client_email,
        COALESCE((SELECT COUNT(*)::int FROM enterprise_legions l WHERE l.client_id=a.client_id AND l.active=true),0) AS legion_count
      FROM enterprise_applications a
      JOIN users u ON u.id=a.client_id
      ORDER BY
        CASE a.status WHEN 'submitted' THEN 0 WHEN 'under_review' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END,
        a.submitted_at DESC
    `
    return NextResponse.json({ success: true, applications })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to load enterprise applications' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response

  try {
    const body = await request.json()
    const applicationId = typeof body.applicationId === 'string' ? body.applicationId : ''
    const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : ''
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 10000) : null
    if (!applicationId || !action) return NextResponse.json({ error: 'applicationId and approve/reject action are required.' }, { status: 400 })

    const sql = neon(process.env.DATABASE_URL!)
    await ensureClientFileFolderSchema(sql)
    await ensureClientWorkshopSchema(sql)
    await ensureEnterpriseDreamSchema(sql)

    const [application] = await sql`SELECT * FROM enterprise_applications WHERE id=${applicationId}::uuid LIMIT 1`
    if (!application) return NextResponse.json({ error: 'Enterprise application not found.' }, { status: 404 })
    if (application.status === 'approved' && action !== 'approve') {
      return NextResponse.json({ error: 'An approved enterprise cannot be rejected through this review action.' }, { status: 409 })
    }

    if (action === 'reject') {
      const [rejected] = await sql`
        UPDATE enterprise_applications
        SET status='rejected',admin_note=${note},reviewed_at=NOW(),reviewed_by=${auth.session.user.id}::uuid,updated_at=NOW()
        WHERE id=${applicationId}::uuid
        RETURNING *
      `
      await sql`
        UPDATE client_file_folders
        SET enterprise_status='rejected',updated_at=NOW()
        WHERE client_id=${application.client_id}::uuid
      `
      await recordSystemEvent({
        eventType: 'enterprise_plan_rejected',
        actorId: auth.session.user.id,
        actorRole: 'admin',
        subjectType: 'client_file_folder',
        subjectId: application.file_number,
        source: 'enterprise-dream',
        payload: { applicationId, note },
      })
      await notifyUser(application.client_id, {
        type: 'enterprise_plan_rejected',
        title: 'Enterprise Dream plan returned',
        content: `Administration returned your ${application.requested_position} elevation plan for ${application.enterprise_name}.${note ? ` Note: ${note}` : ''}`,
        link: '/client/system-switch',
        fromUserId: auth.session.user.id,
        fromUserName: 'WEAVE Administration',
      })
      return NextResponse.json({ success: true, application: rejected })
    }

    const [approved] = await sql`
      UPDATE enterprise_applications
      SET status='approved',admin_note=${note},reviewed_at=NOW(),reviewed_by=${auth.session.user.id}::uuid,updated_at=NOW()
      WHERE id=${applicationId}::uuid
      RETURNING *
    `

    await sql`
      UPDATE client_file_folders
      SET weave_position=${application.requested_position},
          enterprise_status='approved',
          enterprise_name=${application.enterprise_name},
          enterprise_sector=${application.sector},
          workshop_type='enterprise_dream',
          updated_at=NOW()
      WHERE client_id=${application.client_id}::uuid
        AND file_number=${application.file_number}
    `

    await sql`
      INSERT INTO client_system_workshops (client_id,file_number,workshop_type,title,description)
      VALUES (
        ${application.client_id}::uuid,
        ${application.file_number},
        'enterprise_dream',
        'Enterprise Dream Workshop',
        ${'Carry the approved enterprise as a living File Folder: organize profit, participants, Legions, sector movement, systems and sustainable livelihood.'}
      )
      ON CONFLICT (client_id) DO UPDATE SET
        file_number=EXCLUDED.file_number,
        workshop_type='enterprise_dream',
        title='Enterprise Dream Workshop',
        description=EXCLUDED.description,
        updated_at=NOW()
    `

    await recordSystemEvent({
      eventType: 'enterprise_plan_approved',
      actorId: auth.session.user.id,
      actorRole: 'admin',
      subjectType: 'client_file_folder',
      subjectId: application.file_number,
      source: 'enterprise-dream',
      payload: {
        applicationId,
        position: application.requested_position,
        enterpriseName: application.enterprise_name,
        sector: application.sector,
      },
    })

    await notifyUser(application.client_id, {
      type: 'enterprise_plan_approved',
      title: `${application.requested_position === 'lady' ? 'Lady' : 'Lord'} elevation approved`,
      content: `Administration approved ${application.enterprise_name}. Your File Folder is now an Enterprise Dream Workshop and Legion participation is open.`,
      link: '/client/system-switch',
      fromUserId: auth.session.user.id,
      fromUserName: 'WEAVE Administration',
    })

    return NextResponse.json({ success: true, application: approved })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to review enterprise application' }, { status: 500 })
  }
}

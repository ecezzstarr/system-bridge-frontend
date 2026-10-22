import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'
import { ensureLegionEmploymentSchema } from '@/lib/legion-employment'
import { getInstalledCapabilityTotals } from '@/lib/client-growth-world'

export async function POST(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })

  await ensureEnterpriseDreamSchema(sql)
  await ensureLegionEmploymentSchema(sql)

  const [application] = await sql`
    SELECT id,file_number,status
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
      error: 'Legion Quarters must finish construction before Legion recruitment opens.',
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
      AND employment_status='active'
  `
  if (Number(legionCount?.count || 0) >= legionCapacity) {
    return NextResponse.json({
      error: `Legion capacity reached (${legionCapacity}). Install Legion Capacity Modules during enterprise construction to expand it.`,
      gate: 'legion_capacity',
      capacity: legionCapacity,
    }, { status: 409 })
  }

  return NextResponse.json({
    error: 'Manual Legion creation is closed. Legions must be active Agents or Bridgers who permanently own Agentic-Bridger recruited through the Client Legion Quarter or accepted from Lifestyle applications.',
    recruitmentPath: '/client/enterprise/legions',
  }, { status: 409 })
}

import { NextRequest, NextResponse } from 'next/server'
import { generateFileNumber } from '@/lib/fne'
import { logAudit, sql } from '@/lib/db'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const { bridgerId, name, phone } = await request.json()
    if (!bridgerId || !name || !phone) {
      return NextResponse.json({ error: 'Missing bridgerId, name, or phone' }, { status: 400 })
    }
    const bridger = await sql`
      SELECT id FROM users
      WHERE id=${String(bridgerId)}::uuid AND role='bridger' AND COALESCE(is_active,true)=true
      LIMIT 1
    `
    if (!bridger[0]) return NextResponse.json({ error: 'Active Bridger not found' }, { status: 404 })

    const result = await generateFileNumber(String(bridgerId), {
      name: String(name).trim().slice(0, 255),
      phone: String(phone).trim().slice(0, 80),
    })
    await logAudit(auth.session.user.id, 'GENERATE_FNE_KEY', {
      bridgerId,
      clientName: String(name).trim(),
      fileNumber: result.file_number,
    })
    return NextResponse.json({ success: true, fileFolder: result })
  } catch (error) {
    console.error('FNE generate error:', error)
    return NextResponse.json({ error: 'Failed to generate file number' }, { status: 500 })
  }
}

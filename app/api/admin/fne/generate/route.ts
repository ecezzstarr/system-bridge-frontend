import { NextRequest, NextResponse } from 'next/server'
import { generateFileNumber } from '@/lib/fne'
import { logAudit } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { bridgerId, name, phone, adminId } = await request.json()

    if (!bridgerId || !name || !phone) {
      return NextResponse.json(
        { error: 'Missing bridgerId, name, or phone' },
        { status: 400 }
      )
    }

    const result = await generateFileNumber(bridgerId, { name, phone })

    if (adminId) {
      await logAudit(adminId, 'GENERATE_FNE_KEY', { bridgerId, clientName: name, fileNumber: result.file_number })
    }

    return NextResponse.json({
      success: true,
      fileFolder: result
    })
  } catch (error) {
    console.error('FNE generate error:', error)
    return NextResponse.json(
      { error: 'Failed to generate file number' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { validateFileNumber } from '@/lib/fne'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileNumber = searchParams.get('fileNumber')

    if (!fileNumber) {
      return NextResponse.json({ error: 'File number required' }, { status: 400 })
    }

    const folder = await validateFileNumber(fileNumber)

    if (!folder) {
      return NextResponse.json({ error: 'Invalid or already registered file number' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      identity_data: folder.identity_data
    })
  } catch (error) {
    console.error('FNE validate error:', error)
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }
}

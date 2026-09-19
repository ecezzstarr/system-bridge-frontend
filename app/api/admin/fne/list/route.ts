import { NextRequest, NextResponse } from 'next/server'
import { getFileFolders } from '@/lib/fne'

export async function GET() {
  try {
    const folders = await getFileFolders()

    return NextResponse.json({
      success: true,
      folders
    })
  } catch (error) {
    console.error('FNE list error:', error)
    return NextResponse.json(
      { error: 'Failed to list file folders' },
      { status: 500 }
    )
  }
}

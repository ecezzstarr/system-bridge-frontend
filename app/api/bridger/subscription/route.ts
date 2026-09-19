import { NextRequest, NextResponse } from 'next/server'
import { getBridgerSubscription, autoDeductContinuance } from '@/lib/bridger-subscription'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const continuance = await getBridgerSubscription(userId)
    if (!continuance) {
      return NextResponse.json({ error: 'Bridger record not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, continuance })
  } catch (error: any) {
    console.error('[continuance GET] error:', error)
    return NextResponse.json({ error: 'Failed to load continuance' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json()
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

    if (action === 'auto_deduct') {
      const result = await autoDeductContinuance(userId)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[continuance POST] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

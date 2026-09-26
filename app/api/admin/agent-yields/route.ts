import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getAllAgentSalaries } from '@/lib/agent-salary'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (user.role !== 'admin') return NextResponse.json({ success:false, error:'Administration access required' }, { status:403 })

  try {
    const agents = await getAllAgentSalaries()
    return NextResponse.json({
      success:true,
      agents,
      settlement: {
        state: 'administration_required',
        detail: 'Yield recognition does not by itself credit an external or cross-currency wallet. Settlement remains an Administration-controlled financial step.',
      },
    })
  } catch (error) {
    console.error('[admin agent yields] error:', error)
    return NextResponse.json({ success:false, error:'Unable to load Agent yield state' }, { status:500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getInfrastructureRegistry } from '@/lib/weave-infrastructure'
import { getAuthUser } from '@/lib/auth-api'

export async function GET(request: NextRequest) {
  try {
    const authUser=await getAuthUser(request)
    if (!authUser) return NextResponse.json({ success:false,error:'Unauthorized' },{ status:401 })
    if (authUser.role!=='admin') return NextResponse.json({ success:false,error:'Forbidden' },{ status:403 })

    const systems = await getInfrastructureRegistry()

    return NextResponse.json({
      success: true,
      systems: systems.map((sys) => ({
        id: sys.system_key,
        name: sys.name,
        createdAt: new Date(sys.created_at).getTime(),
        deploymentType: sys.deployment_target,
        domain: sys.public_url,
        wallet: null,
        status: sys.enabled ? 'active' : 'paused',
      })),
      totalSystems: systems.length,
    })
  } catch (error: any) {
    console.error('[v0] Error fetching origin systems:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAllOriginSystems, initializeOriginSystem } from '@/lib/core/originTruthLedger'

export async function GET(request: NextRequest) {
  try {
    // Initialize origin system on first call
    initializeOriginSystem()

    // Get all systems from origin ledger
    const systems = getAllOriginSystems()

    return NextResponse.json({
      success: true,
      systems: systems.map((sys) => ({
        id: sys.id,
        name: sys.name,
        createdAt: sys.createdAt,
        deploymentType: sys.deploymentType,
        domain: sys.domain,
        wallet: sys.wallet,
        status: sys.status,
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

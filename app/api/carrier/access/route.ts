import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getCarrierAccess, requireCarrierAccess } from '@/lib/carrier-access'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const access = await getCarrierAccess(user)
    let ace = null
    if (access.active) {
      const resolved = await requireCarrierAccess(user)
      ace = resolved.ace
    }
    return NextResponse.json({
      success: true,
      access,
      ace: ace ? {
        name: ace.ace_name,
        status: ace.status,
        gamesPlayed: Number(ace.games_played || 0),
        wins: Number(ace.wins || 0),
        losses: Number(ace.losses || 0),
      } : null,
      identityInsideCarrier: access.active ? 'Ace' : null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Carrier entrance could not be resolved' }, { status: error.status || 500 })
  }
}

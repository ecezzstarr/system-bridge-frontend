import { getPool } from '@/lib/db'
import { deactivateBridgerAceForExpiredContinuance, ensureAceAccount, getLifestyleAccess } from '@/lib/weave-lifestyle'

export type CarrierAccessUser = {
  id: string
  role?: string | null
  name?: string | null
  username?: string | null
}

export type CarrierAccess = {
  active: boolean
  role: string
  gate: 'administration' | 'agent_subscription' | 'bridger_continuance' | 'client_subscription' | 'lord_lady' | 'unsupported'
  reason: string
  position: 'Ace' | null
  qualifyingState?: string | null
}

export async function getCarrierAccess(user: CarrierAccessUser): Promise<CarrierAccess> {
  const role = String(user.role || '').toLowerCase()

  if (role === 'admin') {
    return {
      active: true,
      role,
      gate: 'administration',
      reason: 'Administration carries direct Carrier entrance.',
      position: 'Ace',
      qualifyingState: 'administration',
    }
  }

  if (role === 'agent') {
    const subscription = await getLifestyleAccess(user.id)
    return {
      active: subscription.active,
      role,
      gate: 'agent_subscription',
      reason: subscription.active
        ? 'Your active Agent monthly subscription has opened the Agent Lifestyle catalog and Carrier entrance.'
        : 'Renew the Agent monthly subscription to reopen Agent Lifestyle access.',
      position: subscription.active ? 'Ace' : null,
      qualifyingState: subscription.status,
    }
  }

  if (role === 'bridger') {
    const subscription = await getLifestyleAccess(user.id)

    if (!subscription.active) {
      await deactivateBridgerAceForExpiredContinuance(user.id)
    }

    return {
      active: subscription.active,
      role,
      gate: 'bridger_continuance',
      reason: subscription.active
        ? 'Your active Bridger monthly Continuance has opened the Bridger Lifestyle catalog, Carrier and Agentic-Bridger inside Ace.'
        : 'Bridger Continuance is inactive or expired. Renew the Bridger monthly subscription to reopen its Lifestyle access.',
      position: subscription.active ? 'Ace' : null,
      qualifyingState: subscription.status,
    }
  }

  if (role === 'client') {
    const subscription = await getLifestyleAccess(user.id)
    if (!subscription.active) {
      return {
        active: false,
        role,
        gate: 'client_subscription',
        reason: 'Renew the Client monthly subscription to reopen Client Lifestyle access.',
        position: null,
        qualifyingState: subscription.status,
      }
    }

    const pool = getPool()
    const result = await pool.query(
      `SELECT weave_position,status
       FROM client_file_folders
       WHERE client_id=$1::uuid
       ORDER BY updated_at DESC NULLS LAST
       LIMIT 1`,
      [user.id]
    )
    const row = result.rows[0]
    const position = String(row?.weave_position || 'client').toLowerCase()
    const elevated = row?.status === 'active' && (position === 'lord' || position === 'lady')
    return {
      active: elevated,
      role,
      gate: 'lord_lady',
      reason: elevated
        ? `Your active Client monthly subscription covers Lifestyle, and ${position === 'lady' ? 'Lady' : 'Lord'} position opens Carrier.`
        : 'Your Client monthly subscription covers Lifestyle. Carrier is a Lifestyle identity reserved for the Lord or Lady position.',
      position: elevated ? 'Ace' : null,
      qualifyingState: position,
    }
  }

  return {
    active: false,
    role,
    gate: 'unsupported',
    reason: 'This WEAVE position does not have a Carrier entrance.',
    position: null,
    qualifyingState: null,
  }
}

export async function requireCarrierAccess(user: CarrierAccessUser) {
  const access = await getCarrierAccess(user)
  if (!access.active) {
    const error = new Error(access.reason) as Error & { status?: number; carrierAccess?: CarrierAccess }
    error.status = 403
    error.carrierAccess = access
    throw error
  }

  const ace = await ensureAceAccount(user.id, user.name || user.username || 'Ace', user.role)
  return { access, ace }
}

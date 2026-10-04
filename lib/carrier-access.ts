import { getPool } from '@/lib/db'
import { ensureAceAccount, getLifestyleAccess } from '@/lib/weave-lifestyle'

export type CarrierAccessUser = {
  id: string
  role?: string | null
  name?: string | null
  username?: string | null
}

export type CarrierAccess = {
  active: boolean
  role: string
  gate: 'administration' | 'agent_subscription' | 'bridger_continuance' | 'lord_lady' | 'unsupported'
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
        ? 'Your monthly Weave subscription has opened Carrier.'
        : 'Agents enter Carrier after opening the monthly Weave subscription.',
      position: subscription.active ? 'Ace' : null,
      qualifyingState: subscription.status,
    }
  }

  const pool = getPool()

  if (role === 'bridger') {
    const result = await pool.query(
      `SELECT subscription_status,subscription_expiry,is_subscription_exempt
       FROM users
       WHERE id=$1::uuid AND role='bridger'
       LIMIT 1`,
      [user.id]
    )
    const row = result.rows[0]
    const expiry = row?.subscription_expiry ? new Date(row.subscription_expiry).getTime() : null
    const current = !expiry || expiry > Date.now()
    const active = Boolean(row?.is_subscription_exempt) || (row?.subscription_status === 'active' && current)
    return {
      active,
      role,
      gate: 'bridger_continuance',
      reason: active
        ? 'Your active Bridger Continuance has opened Carrier.'
        : 'Bridgers enter Carrier when Continuance is active.',
      position: active ? 'Ace' : null,
      qualifyingState: row?.is_subscription_exempt ? 'exempt' : row?.subscription_status || 'inactive',
    }
  }

  if (role === 'client') {
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
    const active = row?.status === 'active' && (position === 'lord' || position === 'lady')
    return {
      active,
      role,
      gate: 'lord_lady',
      reason: active
        ? `${position === 'lady' ? 'Lady' : 'Lord'} elevation has opened Carrier.`
        : 'Clients enter Carrier after becoming a Lord or Lady.',
      position: active ? 'Ace' : null,
      qualifyingState: position,
    }
  }

  return {
    active: false,
    role,
    gate: 'unsupported',
    reason: 'This Weave position does not have a Carrier entrance.',
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

  const ace = await ensureAceAccount(user.id, user.name || user.username || 'Ace')
  return { access, ace }
}

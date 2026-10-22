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
  gate: 'administration' | 'agent_position' | 'agentic_bridger_one_time' | 'client_subscription' | 'lord_lady' | 'unsupported'
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
      reason: 'Administration may enter Ace directly. Carrier is Ace’s outward distribution instrument.',
      position: 'Ace',
      qualifyingState: 'administration',
    }
  }

  if (role === 'agent') {
    const access = await getLifestyleAccess(user.id)
    return {
      active: access.active,
      role,
      gate: 'agent_position',
      reason: access.active
        ? 'The Agent position opens Lifestyle, Ace and Carrier directly. No monthly subscription is required for Agents.'
        : 'This Agent account is inactive. An active Agent position is required to enter Ace and Carrier.',
      position: access.active ? 'Ace' : null,
      qualifyingState: access.status,
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
      gate: 'agentic_bridger_one_time',
      reason: subscription.active
        ? 'Your permanent Agentic-Bridger purchase opens Lifestyle, Ace and Carrier without any recurring Bridger subscription.'
        : 'Buy Agentic-Bridger once for 20 Flame Coin to open Lifestyle, Ace and Carrier. Normal Bridger work remains free.',
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
        ? `Your active Client monthly subscription covers Lifestyle, and ${position === 'lady' ? 'Lady' : 'Lord'} position opens Ace. Carrier is one of the Ace instruments.`
        : 'Your Client monthly subscription covers Lifestyle. Ace is reserved for an active Lord or Lady Client position; Carrier opens through Ace.',
      position: elevated ? 'Ace' : null,
      qualifyingState: position,
    }
  }

  return {
    active: false,
    role,
    gate: 'unsupported',
    reason: 'This WEAVE position does not currently open Ace or Carrier.',
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

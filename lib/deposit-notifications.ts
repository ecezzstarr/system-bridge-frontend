import { sql } from './db'

type NotificationInput = {
  type: string
  title: string
  content: string
  link?: string
  fromUserId?: string | null
  fromUserName?: string
}

export async function notifyUser(userId: string, input: NotificationInput) {
  if (!userId) return false
  try {
    await sql`
      INSERT INTO notifications (
        user_id, type, title, content, from_user_id, from_user_name, link
      )
      VALUES (
        ${userId}::uuid,
        ${input.type},
        ${input.title},
        ${input.content},
        ${input.fromUserId || null}::uuid,
        ${input.fromUserName || 'WEAVE'},
        ${input.link || '/wallet/deposit-withdraw'}
      )
    `
    return true
  } catch (error) {
    console.error('[deposit notifications] user notification failed:', error)
    return false
  }
}

export async function notifyAdministrators(input: NotificationInput) {
  try {
    await sql`
      INSERT INTO notifications (
        user_id, type, title, content, from_user_id, from_user_name, link
      )
      SELECT
        id,
        ${input.type},
        ${input.title},
        ${input.content},
        ${input.fromUserId || null}::uuid,
        ${input.fromUserName || 'WEAVE'},
        ${input.link || '/admin/dashboard#deposits'}
      FROM users
      WHERE role = 'admin'
        AND COALESCE(is_active, true) = true
    `
    return true
  } catch (error) {
    console.error('[deposit notifications] admin notification failed:', error)
    return false
  }
}

export async function notifyDepositSubmitted(input: {
  depositorId?: string | null
  depositorName: string
  role: string
  depositId: string
  rail: 'OPAY' | 'TRX' | 'BRIDGE_TRX'
  amountLabel: string
  secondaryLabel?: string
  adminLink?: string
}) {
  return notifyAdministrators({
    type: 'deposit_pending',
    title: `${input.role} deposit awaiting verification`,
    content: `${input.depositorName} submitted ${input.amountLabel}${input.secondaryLabel ? ` (${input.secondaryLabel})` : ''} through ${input.rail}. Deposit ${input.depositId} is awaiting Administration.`,
    link: input.adminLink || '/admin/dashboard#deposits',
    fromUserId: input.depositorId || null,
    fromUserName: input.depositorName,
  })
}

export async function notifyDepositDecision(input: {
  userId: string
  approved: boolean
  rail: 'OPAY' | 'TRX'
  depositId: string
  amountLabel: string
  creditedFlameCoin?: number
  adminId?: string | null
}) {
  const credited =
    input.approved && Number.isFinite(input.creditedFlameCoin)
      ? ` ${Number(input.creditedFlameCoin).toLocaleString()} Flame Coin has been credited to your Weave wallet.`
      : ''

  return notifyUser(input.userId, {
    type: input.approved ? 'deposit_approved' : 'deposit_rejected',
    title: input.approved ? 'Deposit approved' : 'Deposit rejected',
    content: input.approved
      ? `Administration approved your ${input.amountLabel} ${input.rail} deposit.${credited}`
      : `Administration rejected your ${input.amountLabel} ${input.rail} deposit. No Flame Coin was credited. Check the payment details before submitting again.`,
    link: '/wallet/deposit-withdraw',
    fromUserId: input.adminId || null,
    fromUserName: 'WEAVE Administration',
  })
}
